"""
에이전트 05 — 예산 설계 에이전트
──────────────────────────────────
역할: 정부과제별 예산 규정에 맞는 예산 계획서를 자동 생성한다.
      인건비/직접비/간접비 비율 규정, 현물부담 요건 등을 자동 적용한다.

정부과제 탈락 원인 1위: 예산 계획 규정 위반
  - 인건비 비율 초과
  - 현물부담률 미충족
  - 간접비 한도 초과
  - 비목 구분 오류

실행: python agents/05_budget.py --grant "TIPS" --total 200000000
출력: outputs/예산계획_{과제명}_{날짜}.md + .xlsx
"""
import sys
import json
import argparse
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")
from datetime import datetime
from config import get_client, read_planning_doc, save_output, MODEL, MAX_TOKENS

# 주요 정부과제별 예산 규정
BUDGET_RULES = {
    "TIPS": {
        "name": "TIPS",
        "total_max": 500_000_000,
        "duration_months": 24,
        "rules": {
            "인건비": {"max_ratio": 0.50, "note": "총사업비의 50% 이내"},
            "직접비": {"note": "장비, 재료비, 여비, 외주 등"},
            "간접비": {"max_ratio": 0.05, "note": "직접비의 5% 이내"},
            "현물부담": {"min_ratio": 0.20, "note": "총사업비의 20% 이상 현물 부담"},
        },
        "cautions": [
            "외주 개발비 상한 있음 (총사업비 40% 이내)",
            "TIPS 운영사 승인 필수",
            "분기별 실적보고 의무"
        ]
    },
    "초기창업패키지": {
        "name": "초기창업패키지",
        "total_max": 100_000_000,
        "duration_months": 12,
        "rules": {
            "인건비": {"max_ratio": 0.40, "note": "총사업비의 40% 이내"},
            "사업화비용": {"max_ratio": 0.70, "note": "마케팅, 지재권, 시제품 등"},
            "간접비": {"max_ratio": 0.05, "note": "정부지원금의 5% 이내"},
            "현물부담": {"min_ratio": 0.20, "note": "현물 20% 이상 or 현금 10% 이상"},
        },
        "cautions": [
            "개인사업자 신청 가능",
            "창업 3년 이내 기업만 해당",
            "사업비 용도외 사용시 환수"
        ]
    },
    "창업도약패키지": {
        "name": "창업도약패키지",
        "total_max": 300_000_000,
        "duration_months": 18,
        "rules": {
            "인건비": {"max_ratio": 0.50, "note": "총사업비의 50% 이내"},
            "사업화비용": {"max_ratio": 0.60, "note": "제품개발, 마케팅 등"},
            "간접비": {"max_ratio": 0.05, "note": "직접비의 5% 이내"},
            "현물부담": {"min_ratio": 0.10, "note": "정부지원금의 10% 이상"},
        },
        "cautions": [
            "매출 발생 기업 우대",
            "창업 3~7년 기업 대상",
            "글로벌 진출 계획 포함시 가점"
        ]
    }
}

SYSTEM_PROMPT = """당신은 정부과제 예산 계획 전문가입니다.
주어진 과제 규정과 사업 내용을 바탕으로 최적화된 예산 계획서를 작성합니다.

원칙:
1. 규정 내 최대한 활용 — 지원금을 최대로 받되 규정을 위반하지 않는다
2. 실현 가능성 — 실제 집행 가능한 금액으로 설계한다
3. 심사 설득력 — 각 항목에 사용 목적과 근거를 명시한다
4. 리스크 방지 — 규정 위반 가능성이 있는 항목은 사전에 표시한다

CareerLog 사업 특성:
- AI SaaS 서비스 (Claude API 기반)
- 1인 창업자 (기획/PM)
- 개발자 채용 또는 외주 필요
- 서버/인프라 비용 있음
- 마케팅 (베타 유저 모집) 필요

한국어로 작성. 실제 제출 가능한 형식으로."""

def calculate_budget(grant_name: str, total_amount: int) -> str:
    client = get_client()
    planning_doc = read_planning_doc()

    # 규정 찾기
    rules = None
    for key, rule_data in BUDGET_RULES.items():
        if grant_name.lower() in key.lower() or key.lower() in grant_name.lower():
            rules = rule_data
            break

    if not rules:
        rules = {
            "name": grant_name,
            "total_max": total_amount,
            "duration_months": 12,
            "rules": {
                "인건비": {"max_ratio": 0.50, "note": "일반적 기준"},
                "직접비": {"note": "개발비, 서버비 등"},
                "간접비": {"max_ratio": 0.05, "note": "직접비의 5%"},
                "현물부담": {"min_ratio": 0.20, "note": "총사업비의 20%"},
            },
            "cautions": ["해당 공고의 세부 규정을 반드시 확인하세요"]
        }

    duration = rules.get("duration_months", 12)
    rule_text = "\n".join([
        f"  - {k}: {v.get('note', '')} (최대 {int(v.get('max_ratio',0)*100)}%)" if 'max_ratio' in v
        else f"  - {k}: {v.get('note', '')} (최소 {int(v.get('min_ratio',0)*100)}%)" if 'min_ratio' in v
        else f"  - {k}: {v.get('note', '')}"
        for k, v in rules.get("rules", {}).items()
    ])

    prompt = f"""다음 사업 기획서와 정부과제 예산 규정을 바탕으로 예산 계획서를 작성해주세요.

[사업 기획서 요약]
서비스명: CareerLog (AI 경력 자동 축적 SaaS)
기술: Claude API, Python, React/Next.js
창업자: 1인 (기획/PM)
개발 필요: 프론트엔드 개발자 1명 (외주 or 채용), 백엔드 개발자 1명 (외주 or 채용)

[예산 규정]
과제명: {rules['name']}
총 사업비: {total_amount:,}원
지원 기간: {duration}개월
{rule_text}

주의사항:
{chr(10).join(f"  - {c}" for c in rules.get('cautions', []))}

[요청 사항]
1. 비목별 예산 배분 (금액, 비율, 근거)
2. 월별/분기별 집행 계획
3. 인건비 명세 (직급, 인원, 단가, 기간)
4. 외주 개발비 명세 (항목, 금액, 업체 선정 기준)
5. 서버/인프라 비용 명세
6. 마케팅비 명세
7. 현물부담 계획
8. 규정 위반 리스크 체크리스트
9. 집행 가이드라인 (어떤 지출이 인정되고 안 되는지)

마크다운 테이블 형식으로 명확하게 작성해주세요."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )

    budget_plan = response.content[0].text

    timestamp = datetime.now().strftime("%Y년 %m월 %d일")
    full_output = f"""# {rules['name']} — CareerLog 예산 계획서

> 총 사업비: {total_amount:,}원
> 지원 기간: {duration}개월
> 작성일: {timestamp}
> 작성: 예산 설계 에이전트 v1.0

---

{budget_plan}

---

## 규정 출처
- {rules['name']} 사업 운영요령 및 관리지침 (최신 공고 기준 확인 필수)
- 각 비목의 증빙서류 요건은 해당 기관 문의

*이 예산안은 AI 초안입니다. 제출 전 반드시 담당 기관에 확인하세요.*
"""

    return full_output

def run_budget():
    parser = argparse.ArgumentParser(description="예산 설계 에이전트")
    parser.add_argument("--grant", type=str, help="과제명")
    parser.add_argument("--total", type=int, help="총 사업비 (원)")
    args = parser.parse_args()

    print("=" * 60)
    print("예산 설계 에이전트")
    print("=" * 60)

    print("\n사용 가능한 과제 규정:")
    for key, rule in BUDGET_RULES.items():
        print(f"  [{key}] 최대 {rule['total_max']:,}원 / {rule['duration_months']}개월")

    grant_name = args.grant
    if not grant_name:
        print("\n과제명을 입력하세요:")
        grant_name = input("> ").strip()

    total_amount = args.total
    if not total_amount:
        print(f"\n신청할 사업비를 입력하세요 (원, 예: 100000000):")
        try:
            total_amount = int(input("> ").strip().replace(",", ""))
        except ValueError:
            total_amount = 100_000_000
            print(f"입력 오류. 기본값 {total_amount:,}원 사용")

    print(f"\n[예산 설계 시작] {grant_name} / {total_amount:,}원\n")

    result = calculate_budget(grant_name, total_amount)

    safe_name = grant_name.replace("/", "_").replace(" ", "_")
    filename = f"예산계획_{safe_name}_{datetime.now().strftime('%Y%m%d')}.md"
    save_output(filename, result)

    print("\n" + "=" * 60)
    print(result[:2000] + ("\n...[이하 파일 확인]" if len(result) > 2000 else ""))

if __name__ == "__main__":
    run_budget()
