"""
에이전트 02 — 정부과제 조사 에이전트
────────────────────────────────────
역할: CareerLog 사업 프로필에 맞는 현재 신청 가능한 정부 지원사업을
      전수 조사하고 우선순위를 매긴다.

대상 기관:
  - 창업진흥원 (K-Startup)
  - TIPS 운영사
  - 정보통신산업진흥원 (NIPA)
  - 고용노동부 / 한국고용정보원
  - 중소벤처기업부
  - 과학기술정보통신부
  - 서울/경기 지역 지원사업

실행: python agents/02_researcher.py
출력: outputs/정부과제_조사결과_YYYYMMDD.md
"""
import sys
import json
from datetime import datetime
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")
from config import get_client, read_planning_doc, save_output, MODEL, MAX_TOKENS

SYSTEM_PROMPT = """당신은 정부 R&D 지원사업 전문 컨설턴트입니다.
스타트업의 사업 기획서를 분석하여 현재 신청 가능한 정부 지원사업을 조사합니다.

조사 기준:
- 신청 마감이 아직 지나지 않은 사업만 포함
- AI/SaaS/HRTech 관련 사업 우선
- 초기 스타트업(pre-MVP ~ MVP 단계) 신청 가능한 사업
- 지원금 규모, 조건, 의무사항 명시

출력 형식 (각 과제마다):
1. 과제명
2. 주관기관
3. 지원 금액
4. 신청 마감일
5. 핵심 자격 조건
6. CareerLog 적합도 (상/중/하) + 이유
7. 신청 URL 또는 공고 위치
8. 주의사항 (현물부담, 특허 요구 등)

오늘 날짜: {today}

반드시 실제로 존재하는 공고만 기술하고, 불확실한 경우 명시하라.
마지막에 전체 요약표를 마크다운 테이블로 제공하라."""

SEARCH_TOOLS = [
    {
        "name": "web_search",
        "description": "정부 지원사업 공고를 검색합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "검색어"},
                "purpose": {"type": "string", "description": "이 검색의 목적"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "compile_results",
        "description": "조사 결과를 최종 보고서로 정리합니다.",
        "input_schema": {
            "type": "object",
            "properties": {
                "grants": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "agency": {"type": "string"},
                            "amount": {"type": "string"},
                            "deadline": {"type": "string"},
                            "fit_score": {"type": "string"},
                            "fit_reason": {"type": "string"},
                            "url": {"type": "string"},
                            "conditions": {"type": "string"},
                            "cautions": {"type": "string"}
                        }
                    }
                },
                "summary": {"type": "string"}
            },
            "required": ["grants", "summary"]
        }
    }
]

# 조사 대상 정부과제 프리셋 — 매 분기 업데이트 필요
# 에이전트가 실제 검색을 보완하지만, 주요 상시 공고는 여기서 안내
KNOWN_GRANT_SOURCES = [
    {"name": "K-Startup 창업도약패키지", "url": "https://www.k-startup.go.kr", "agency": "창업진흥원"},
    {"name": "TIPS (민간투자주도형 기술창업지원)", "url": "https://www.jointips.or.kr", "agency": "중소벤처기업부"},
    {"name": "NIPA AI 바우처", "url": "https://www.nipa.kr", "agency": "정보통신산업진흥원"},
    {"name": "서울형 강소기업 AI 전환 지원", "url": "https://www.sba.seoul.kr", "agency": "서울산업진흥원"},
    {"name": "창업성장기술개발사업", "url": "https://www.smtech.go.kr", "agency": "중소벤처기업부"},
    {"name": "고용부 취업지원 HRTech 과제", "url": "https://www.moel.go.kr", "agency": "고용노동부"},
    {"name": "중기부 초기창업패키지", "url": "https://www.k-startup.go.kr", "agency": "창업진흥원"},
    {"name": "과기부 정보통신·방송 기술개발사업", "url": "https://www.iitp.kr", "agency": "정보통신기획평가원"},
]

def build_research_prompt(planning_doc: str, today: str) -> str:
    # 기획서가 너무 길면 앞 3000자만 사용 (rate limit 방지)
    doc_excerpt = planning_doc[:3000] + "\n...(이하 생략)" if len(planning_doc) > 3000 else planning_doc

    return f"""다음 사업 기획서를 기반으로 현재 신청 가능한 정부 지원사업을 조사해주세요.

[사업 기획서 요약]
{doc_excerpt}

[사업 프로필 요약]
- 서비스: AI 기반 경력 자동 기록 및 이력서 생성 SaaS (CareerLog)
- 단계: Pre-MVP (CLI 프로토타입 완성, 웹 개발 예정)
- 기술: Claude API, Python, Next.js (예정)
- 타겟: B2C (직장인 이직 준비자) + B2B (HR 담당자)
- 창업자: 1인 (기획/PM), 개발자 미확보
- 오늘 날짜: {today}

[조사 우선 기관]
{chr(10).join(f"  - {g['name']} ({g['agency']}): {g['url']}" for g in KNOWN_GRANT_SOURCES)}

위 기관 외에도 관련 있는 모든 지원사업을 포함해주세요.
각 과제의 신청 자격, 마감일, 지원금액, CareerLog 적합도를 상세히 분석해주세요.
적합도 '상'인 과제는 신청 전략까지 제안해주세요."""

def run_researcher():
    client = get_client()
    planning_doc = read_planning_doc()
    today = datetime.now().strftime("%Y년 %m월 %d일")

    print("=" * 60)
    print("정부과제 조사 에이전트 시작")
    print(f"기준일: {today}")
    print("=" * 60)
    print("\n조사 중... (1~2분 소요)\n")

    research_prompt = build_research_prompt(planning_doc, today)
    system = SYSTEM_PROMPT.format(today=today)

    # 1단계: 초기 조사 (web_search 툴 활용)
    messages = [{"role": "user", "content": research_prompt}]

    collected_searches = []
    final_report = ""

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system,
        tools=SEARCH_TOOLS,
        messages=messages
    )

    while response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                if block.name == "web_search":
                    query = block.input.get("query", "")
                    print(f"  [검색] {query}")
                    collected_searches.append(query)
                    # 실제 웹 검색 결과 대신 검색 의도를 기록
                    result = {
                        "searched": query,
                        "note": "실제 검색 결과는 에이전트가 지식 기반으로 보완합니다. 최신 공고는 각 기관 홈페이지에서 직접 확인 권장."
                    }
                elif block.name == "compile_results":
                    grants = block.input.get("grants", [])
                    summary = block.input.get("summary", "")
                    result = {"status": "compiled", "count": len(grants)}
                    print(f"  [정리] {len(grants)}개 과제 수집 완료")
                else:
                    result = {"error": "unknown tool"}

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, ensure_ascii=False)
                })

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=system,
            tools=SEARCH_TOOLS,
            messages=messages
        )

    # 최종 텍스트 응답
    for block in response.content:
        if hasattr(block, "text"):
            final_report += block.text

    # 헤더 추가
    timestamp = datetime.now().strftime("%Y년 %m월 %d일 %H:%M")
    full_report = f"""# CareerLog 정부 지원사업 조사 보고서

> 작성일: {timestamp}
> 대상 사업: CareerLog (AI 기반 경력 자동 축적 SaaS)
> 작성: 정부과제 조사 에이전트 v1.0

---

{final_report}

---

*이 보고서는 AI 에이전트가 생성했습니다. 각 공고의 최신 내용은 해당 기관 홈페이지에서 반드시 확인하세요.*
"""

    filename = f"정부과제_조사결과_{datetime.now().strftime('%Y%m%d_%H%M')}.md"
    save_output(filename, full_report)

    print("\n" + "=" * 60)
    print("조사 완료!")
    print("=" * 60)
    print(full_report[:2000] + ("...\n[이하 생략 - 파일 확인]" if len(full_report) > 2000 else ""))

    return full_report

if __name__ == "__main__":
    run_researcher()
