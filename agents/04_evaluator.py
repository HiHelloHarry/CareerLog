"""
에이전트 04 — 심사위원 페르소나 에이전트
──────────────────────────────────────────
역할: 실제 정부과제 심사위원의 관점에서 제출 전 사전 검토를 수행한다.
      점수표 기반으로 항목별 점수를 예측하고 치명적 약점을 찾아낸다.

심사위원 페르소나:
  - 기술 심사위원: ETRI/KAIST 출신 AI 전문가
  - 사업화 심사위원: 투자심사역 출신 창업 전문가
  - 정책 심사위원: 중소벤처기업부 공무원

실행: python agents/04_evaluator.py --target "outputs/피팅_TIPS_20260317.md"
출력: outputs/심사평_{과제명}_{날짜}.md
"""
import sys
import argparse
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")
from pathlib import Path
from datetime import datetime
from config import get_client, read_planning_doc, save_output, MODEL, MAX_TOKENS

# 심사위원 페르소나 정의
PERSONAS = {
    "tech": {
        "name": "기술 심사위원",
        "profile": "ETRI 출신 AI/ML 전문가, 15년 경력. 기술의 혁신성과 실현 가능성을 최우선으로 본다. '이미 있는 기술 아닌가?'가 첫 번째 질문. 특허, 논문 인용, 기술 스펙이 없으면 낮은 점수를 준다.",
        "weight": "기술 혁신성 40%, 기술 실현 가능성 35%, 기술 차별성 25%",
        "red_flags": ["기술 스펙 불명확", "기존 솔루션과 차별점 불명확", "개발 일정 비현실적", "핵심 기술 역량 불명확"]
    },
    "biz": {
        "name": "사업화 심사위원",
        "profile": "초기 스타트업 전문 투자심사역 출신. 시장 규모와 수익화 경로를 핵심으로 본다. 숫자 없는 주장은 0점 처리. BEP(손익분기점) 분석이 없으면 사업화 의지 의심.",
        "weight": "시장 규모 및 수익성 40%, 사업화 전략 구체성 35%, 팀 역량 25%",
        "red_flags": ["시장 규모 근거 없음", "BEP 분석 없음", "경쟁사 분석 피상적", "고객 획득 비용(CAC) 미언급", "초기 고객 확보 계획 불명확"]
    },
    "policy": {
        "name": "정책 심사위원",
        "profile": "중소벤처기업부 출신 정책 전문가. 고용 창출, 수출 기여, 사회적 가치를 체크한다. 정부 지원의 명분이 있는지 본다. '세금으로 지원할 가치가 있는가?'",
        "weight": "고용 창출 계획 30%, 사회적 가치 30%, 정책 부합성 40%",
        "red_flags": ["고용 계획 없음", "사회적 가치 기술 부족", "지역 경제 기여 미언급", "정책 방향과 불일치"]
    }
}

SYSTEM_PROMPT = """당신은 정부 지원사업 심사위원입니다.
주어진 페르소나 관점에서 제안서를 엄격하게 검토합니다.

검토 방식:
1. 항목별 100점 만점 점수 부여
2. 치명적 약점 (탈락 가능 요소) 명시
3. 개선 방향 제안
4. 예상 심사 질문 5개 생성

중요: 칭찬보다 문제점을 찾는 것이 목표. 실제 심사처럼 냉정하게 평가한다.
한국어로 작성."""

def evaluate_document(doc_content: str, grant_name: str = "일반") -> str:
    client = get_client()
    all_reviews = []

    for persona_key, persona in PERSONAS.items():
        print(f"  [{persona['name']}] 검토 중...")

        prompt = f"""다음 제안서를 {persona['name']} 관점에서 검토해주세요.

[페르소나]
{persona['profile']}

[평가 가중치]
{persona['weight']}

[주요 체크 포인트]
{chr(10).join(f"  - {rf}" for rf in persona['red_flags'])}

[검토할 제안서]
{doc_content[:6000]}  ← 전체 문서 일부 (토큰 제한)

다음 형식으로 작성하세요:
## {persona['name']} 심사 의견

### 항목별 점수
| 항목 | 배점 | 득점 | 근거 |
|------|------|------|------|
(항목별로 채워주세요)

**총점: XX/100**

### 치명적 약점 (탈락 위험)
(있다면 나열, 없으면 "없음")

### 보완 필요 사항 (상/중/하)
(우선순위별로)

### 예상 심사 질문 5개
(실제 심사장에서 나올 질문)

### 심사위원 총평
(3~5문장, 냉정하게)"""

        response = client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}]
        )

        review = response.content[0].text
        all_reviews.append(review)

    # 종합 의견 생성
    print("  [종합 분석] 생성 중...")
    synthesis_prompt = f"""다음 3명의 심사위원 의견을 종합하여 최종 심사 의견을 작성하세요.

{chr(10).join(all_reviews)}

종합 형식:
## 종합 심사 의견

### 예상 합격 가능성: X% (근거 포함)

### 즉시 수정 필요 항목 Top 5
(우선순위순, 구체적 수정 방향 포함)

### 제출 전 보완 체크리스트
- [ ] ...

### 강점 요약
(3가지 이내)

### 최종 권고
(제출 / 보완 후 제출 / 다음 공고 준비 중 선택 + 이유)"""

    synthesis_response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system="정부과제 심사 전문가로서 종합 의견을 작성합니다. 한국어로 작성.",
        messages=[{"role": "user", "content": synthesis_prompt}]
    )

    synthesis = synthesis_response.content[0].text

    # 전체 리포트 구성
    timestamp = datetime.now().strftime("%Y년 %m월 %d일 %H:%M")
    full_report = f"""# {grant_name} — CareerLog 사전 심사 보고서

> 심사일: {timestamp}
> 검토 주체: 심사위원 페르소나 에이전트 v1.0
> 페르소나: 기술 심사위원 / 사업화 심사위원 / 정책 심사위원

---

{chr(10+ 10).join(all_reviews)}

---

{synthesis}

---

*이 보고서는 AI 시뮬레이션입니다. 실제 심사 결과와 다를 수 있습니다.*
"""

    return full_report

def run_evaluator():
    parser = argparse.ArgumentParser(description="심사위원 페르소나 에이전트")
    parser.add_argument("--target", type=str, help="검토할 제안서 파일 경로")
    parser.add_argument("--grant", type=str, default="정부과제", help="과제명")
    args = parser.parse_args()

    print("=" * 60)
    print("심사위원 페르소나 에이전트")
    print("=" * 60)

    if args.target and Path(args.target).exists():
        with open(args.target, encoding="utf-8") as f:
            doc_content = f.read()
        grant_name = args.grant
        print(f"[검토 대상] {args.target}")
    else:
        print("[검토 대상] 기획서.md (원본)")
        doc_content = read_planning_doc()
        grant_name = args.grant

    print(f"\n3명의 심사위원이 검토합니다...\n")
    report = evaluate_document(doc_content, grant_name)

    safe_name = grant_name.replace("/", "_").replace(" ", "_")
    filename = f"심사평_{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M')}.md"
    save_output(filename, report)

    print("\n" + "=" * 60)
    print(report[:2000] + ("\n...[이하 파일 확인]" if len(report) > 2000 else ""))

if __name__ == "__main__":
    run_evaluator()
