"""
에이전트 03 — 기획서 피팅 서브 에이전트
────────────────────────────────────────
역할: 특정 정부과제 공고에 맞게 기획서를 재구성한다.
      공고의 평가 기준, 필수 항목, 지원 기관의 관심사를 분석하여
      같은 사업 내용을 최적의 언어로 재포장한다.

사용법:
  단독 실행:     python agents/03_fitter.py
  공고 지정:     python agents/03_fitter.py --grant "TIPS"
  파일 지정:     python agents/03_fitter.py --grant-file "outputs/공고.txt"
  오케스트레이터 경유: orchestrator.py가 자동으로 호출

출력: outputs/피팅_{과제명}_{날짜}.md
"""
import sys
import json
import argparse
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")
from datetime import datetime
from pathlib import Path
from config import get_client, read_planning_doc, save_output, MODEL, MAX_TOKENS

SYSTEM_PROMPT = """당신은 정부 R&D 과제 제안서 전문 작성가입니다.
사업 기획서와 특정 정부과제 공고를 받아 최적화된 제안서를 작성합니다.

작업 원칙:
1. 사실 왜곡 금지 — 없는 기능이나 역량을 만들어내지 않는다
2. 언어 최적화 — 같은 내용을 심사위원이 원하는 언어로 재표현한다
3. 기준 역추적 — 공고의 평가 기준표를 역으로 분석해 배점 높은 항목을 강조한다
4. 갭 분석 — 공고 요구 vs 현재 역량 간 갭을 솔직하게 표시하고 보완 방법을 제안한다

출력 구성:
- [ ] 공고 핵심 요구사항 분석
- [ ] 평가 기준별 우리의 강점 매핑
- [ ] 최적화된 사업 개요 (공고 언어 반영)
- [ ] 핵심 기술 차별성 (해당 공고 관점)
- [ ] 시장 및 사업화 계획 (공고 우선순위 반영)
- [ ] 팀 역량 서술 (공고 요구 기준 맞춤)
- [ ] 갭 및 보완 전략
- [ ] 제출 체크리스트

한국어로 작성. 실제 제출 가능한 수준으로 작성한다."""

# 주요 정부과제 공고 템플릿 (실제 공고 없을 때 가이드용)
GRANT_TEMPLATES = {
    "TIPS": {
        "name": "TIPS (민간투자주도형 기술창업지원프로그램)",
        "agency": "중소벤처기업부",
        "focus": "기술 혁신성, 글로벌 확장성, 시장 규모",
        "key_criteria": [
            "핵심 기술의 혁신성 및 독창성",
            "글로벌 시장 진출 가능성",
            "창업팀 역량 (기술 + 사업화)",
            "추천 액셀러레이터 투자 여부"
        ],
        "amount": "최대 5억원",
        "required_docs": ["사업계획서", "기술개발계획서", "팀 이력서"]
    },
    "K-스타트업_창업도약패키지": {
        "name": "창업도약패키지",
        "agency": "창업진흥원",
        "focus": "성장 가능성, 사업화 실현력",
        "key_criteria": [
            "아이템 혁신성 및 차별성",
            "시장 진입 전략",
            "팀 구성 및 사업화 역량",
            "성장 지표 및 KPI 달성 계획"
        ],
        "amount": "최대 1억원",
        "required_docs": ["사업계획서", "재무계획서"]
    },
    "NIPA_AI바우처": {
        "name": "AI 바우처 지원사업",
        "agency": "정보통신산업진흥원(NIPA)",
        "focus": "AI 기술 활용, 수요기업 생산성 향상",
        "key_criteria": [
            "AI 기술 적용 범위 및 효과",
            "수요기업 문제 해결 적합성",
            "확산 가능성 및 레퍼런스",
            "공급기업 기술 역량"
        ],
        "amount": "최대 3억원 (공급기업 기준)",
        "required_docs": ["사업계획서", "AI 기술 명세서", "수요기업 확인서"]
    },
    "초기창업패키지": {
        "name": "초기창업패키지",
        "agency": "창업진흥원",
        "focus": "초기 사업화, 창업 3년 이내",
        "key_criteria": [
            "창업 아이템 혁신성",
            "시장 조사 충실성",
            "창업자 역량 및 의지",
            "초기 사업화 계획의 현실성"
        ],
        "amount": "최대 1억원",
        "required_docs": ["사업계획서", "창업자 이력서", "시장조사 결과"]
    }
}

def load_grant_info(grant_name: str, grant_file: str = None) -> dict:
    """공고 정보 로드"""
    if grant_file and Path(grant_file).exists():
        with open(grant_file, encoding="utf-8") as f:
            return {"name": grant_name, "raw_content": f.read(), "template": False}

    # 템플릿 매칭
    for key, template in GRANT_TEMPLATES.items():
        if grant_name.lower() in key.lower() or key.lower() in grant_name.lower():
            return {**template, "template": True}

    # 이름만 있는 경우
    return {
        "name": grant_name,
        "agency": "미상",
        "focus": "별도 분석 필요",
        "key_criteria": [],
        "template": False
    }

def build_fitting_prompt(planning_doc: str, grant_info: dict) -> str:
    if grant_info.get("raw_content"):
        grant_desc = f"[공고 전문]\n{grant_info['raw_content']}"
    else:
        grant_desc = f"""[과제 정보]
과제명: {grant_info.get('name', '미상')}
주관기관: {grant_info.get('agency', '미상')}
핵심 포커스: {grant_info.get('focus', '미상')}
지원 금액: {grant_info.get('amount', '미상')}
평가 기준:
{chr(10).join(f"  - {c}" for c in grant_info.get('key_criteria', []))}"""

    return f"""다음 사업 기획서를 아래 정부과제 공고에 맞게 최적화된 제안서로 작성해주세요.

[사업 기획서]
{planning_doc}

{grant_desc}

다음 순서로 작성하세요:
1. 공고 핵심 요구사항 분석 (무엇을 원하는가)
2. 강점 매핑 (우리가 이 공고에서 어필할 수 있는 것)
3. 갭 분석 (부족한 부분과 보완 방안)
4. 최적화된 사업 개요 (공고 언어로 재표현)
5. 기술 차별성 서술 (이 공고 심사위원 관점)
6. 시장 및 사업화 전략 (공고 우선순위 반영)
7. 팀 역량 서술
8. 제출 전 체크리스트

실제 제출 가능한 수준의 완성도로 작성하세요."""

def fit_to_grant(grant_name: str, grant_file: str = None) -> str:
    client = get_client()
    planning_doc = read_planning_doc()
    grant_info = load_grant_info(grant_name, grant_file)

    print(f"\n[피팅 대상] {grant_info.get('name', grant_name)}")
    print(f"[주관기관] {grant_info.get('agency', '미상')}")
    if grant_info.get("template"):
        print("[모드] 템플릿 기반 (실제 공고 파일 없음)")
    print("작성 중...\n")

    prompt = build_fitting_prompt(planning_doc, grant_info)

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )

    fitted_doc = response.content[0].text

    # 최종 문서 구성
    grant_display_name = grant_info.get("name", grant_name)
    timestamp = datetime.now().strftime("%Y년 %m월 %d일")

    full_output = f"""# {grant_display_name} — CareerLog 제안서

> 기반 기획서: 기획서.md (v0.1)
> 대상 공고: {grant_display_name}
> 주관기관: {grant_info.get('agency', '미상')}
> 작성일: {timestamp}
> 작성: 기획서 피팅 에이전트 v1.0

---

{fitted_doc}

---

*이 문서는 기획서 피팅 에이전트가 생성한 초안입니다. 제출 전 반드시 검토하세요.*
"""

    safe_name = grant_name.replace("/", "_").replace(" ", "_")
    filename = f"피팅_{safe_name}_{datetime.now().strftime('%Y%m%d')}.md"
    save_output(filename, full_output)

    return full_output

def run_interactive():
    """공고 정보를 대화로 입력받아 피팅"""
    print("=" * 60)
    print("기획서 피팅 에이전트")
    print("=" * 60)
    print("\n사용 가능한 과제 템플릿:")
    for key, t in GRANT_TEMPLATES.items():
        print(f"  [{key}] {t['name']} — {t['amount']}")

    print("\n과제명을 입력하세요 (위 키 또는 직접 입력):")
    grant_name = input("> ").strip()
    if not grant_name:
        print("과제명이 없습니다. 종료합니다.")
        return

    grant_file = None
    print("\n공고 파일 경로가 있으면 입력하세요 (없으면 엔터):")
    file_input = input("> ").strip()
    if file_input:
        grant_file = file_input

    result = fit_to_grant(grant_name, grant_file)
    print("\n[피팅 완료]")
    print(result[:1500] + ("\n...[이하 파일 확인]" if len(result) > 1500 else ""))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="기획서 피팅 에이전트")
    parser.add_argument("--grant", type=str, help="과제명")
    parser.add_argument("--grant-file", type=str, help="공고 파일 경로")
    args = parser.parse_args()

    if args.grant:
        fit_to_grant(args.grant, args.grant_file)
    else:
        run_interactive()
