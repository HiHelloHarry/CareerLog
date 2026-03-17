"""
에이전트 01b — 기획서 자동 보완 에이전트
──────────────────────────────────────────
역할: 01_planner가 분석한 부족 항목들을 대화 없이 자동으로 채워넣는다.
      CareerLog에 대해 알고 있는 정보 + 합리적 추론으로 빈 섹션을 생성하고
      기획서.md를 직접 업데이트한다.

흐름:
  01_planner (분석·질문) → 01b_refiner (자동 보완) → 02_researcher (과제 조사)

실행: py agents/01b_refiner.py
출력: 기획서.md 직접 업데이트 + outputs/기획서_보완_YYYYMMDD.md 백업
"""
import sys
import json
from datetime import datetime
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")
from config import get_client, read_planning_doc, write_planning_doc, save_output, MODEL, MAX_TOKENS

SYSTEM_PROMPT = """당신은 스타트업 사업 기획 전문가입니다.
주어진 기획서를 분석하고, 정부과제 심사에 필요하지만 빠진 섹션들을 자동으로 작성합니다.

작성 원칙:
1. 기획서에 이미 있는 내용과 일관성을 유지한다
2. 없는 사실을 지어내지 않는다 — 합리적 추론 가능한 범위에서만 작성한다
3. 불확실한 수치는 "추정" 또는 "목표"로 명시한다
4. 정부과제 심사위원이 원하는 언어와 구조로 작성한다
5. 각 섹션은 마크다운 형식으로 작성한다

CareerLog 배경 정보 (기획서에서 파악한 것):
- 서비스: AI 기반 경력 자동 축적 SaaS
- 핵심 기술: Claude API, 에이전트 파이프라인
- 창업자: 변지현 (기획/PM, 게임기획 경력)
- 현재 단계: Pre-MVP (CLI 프로토타입 작동 중)
- 타겟: 직장인 3~7년차 이직 준비자
- 수익 모델: B2C 구독 (월 9,900~19,900원) + B2B

한국어로 작성. 각 섹션은 완성도 높은 초안 수준으로."""

MISSING_SECTION_PROMPTS = {
    "창업자/팀 소개 및 역량": """
기획서의 내용을 바탕으로 '창업자/팀 소개 및 역량' 섹션을 작성해주세요.

포함할 내용:
- 창업자 변지현의 역할과 경력 (기획서에 나온 페르소나 '변지현, 32, 게임기획' 기반)
- 게임기획/QA/PM 멀티롤 경험이 CareerLog 창업에 연결되는 스토리
- 현재 팀 구성 및 향후 채용 계획
- 기술 파트너 확보 계획

형식: 마크다운, 표 포함
""",
    "시장 규모 (TAM/SAM/SOM)": """
기획서의 타겟 유저 정보를 바탕으로 '시장 규모' 섹션을 작성해주세요.

포함할 내용:
- TAM: 국내 직장인 전체 (경력 관리 잠재 수요)
- SAM: 연간 이직 경험자 + 취업준비생 (AI 툴 사용 의향 있는 층)
- SOM: 초기 3년 내 도달 가능한 유료 구독자 수
- 국내 HR Tech 시장 규모 (출처 포함 또는 "추정" 명시)
- 연평균 성장률 (CAGR) 추정

형식: 마크다운, TAM/SAM/SOM 표 포함. 수치는 "추정" 명시.
""",
    "기술 개발 상세 계획": """
기획서의 기술 스택과 로드맵을 바탕으로 '기술 개발 상세 계획' 섹션을 작성해주세요.

포함할 내용:
- 핵심 기술 요소 (Claude API 연동, 에이전트 파이프라인, Vector DB)
- 개발 단계별 계획 (Pre-MVP → MVP → Beta → v1.0)
- 기술 차별성 (기존 이력서 툴 대비)
- 개발 방법론 및 품질 관리
- 외주/채용 계획

형식: 마크다운, 단계별 표 포함
""",
    "재무 계획 (3년 추정)": """
기획서의 수익 모델을 바탕으로 '재무 계획' 섹션을 작성해주세요.

포함할 내용:
- 연도별 매출 추정 (1~3년차)
- 유료 전환율 가정 (Free → Pro → Premium)
- B2C 구독 매출 + B2B 파일럿 매출
- 주요 비용 항목 (서버, 인건비, 마케팅, API 비용)
- 손익분기점 (BEP) 시점 추정
- 정부지원금 활용 계획

형식: 마크다운, 연도별 매출/비용/손익 표 포함. 모든 수치에 "추정" 명시.
""",
    "사업화 전략 및 채널": """
기획서의 타겟 유저와 수익 모델을 바탕으로 '사업화 전략' 섹션을 작성해주세요.

포함할 내용:
- 초기 고객 획득 전략 (베타 유저 10명 → 유료 전환)
- 유통 채널 (앱스토어, 직접 판매, 기업 채널)
- 마케팅 채널 (커뮤니티, SNS, 콘텐츠 마케팅)
- 고객 획득 비용 (CAC) 및 생애 가치 (LTV) 추정
- B2B 파트너십 전략 (헤드헌팅사, HR 솔루션사)
- 해외 진출 가능성

형식: 마크다운
""",
    "사회적 가치 및 고용 효과": """
CareerLog 사업의 '사회적 가치 및 고용 효과' 섹션을 작성해주세요.

포함할 내용:
- 해결하는 사회 문제 (경력 기록 부재 → 직업 이동성 저하)
- 고용 창출 계획 (3년 내 채용 인원)
- 취약계층 지원 가능성 (경력단절 여성, 청년 구직자)
- 노동 시장 효율성 기여 (미스매치 해소)
- 데이터 윤리 및 개인정보 보호 방침

형식: 마크다운
""",
    "지식재산권/기술 차별성 근거": """
CareerLog의 '지식재산권 및 기술 차별성' 섹션을 작성해주세요.

포함할 내용:
- 특허 출원 계획 (핵심 알고리즘: 업무 기록 자동 구조화 방법론)
- 기존 솔루션 대비 기술 차별점 (경쟁사 분석 표 확장)
- 모방 장벽 (데이터 누적 효과, 사용자 행동 학습)
- 오픈소스 vs 독점 기술 구분
- 향후 IP 전략

형식: 마크다운
""",
}

def analyze_and_find_missing(document: str) -> list[str]:
    """빠진 섹션 탐지"""
    missing = []
    for section_key in MISSING_SECTION_PROMPTS:
        keywords = {
            "창업자/팀 소개 및 역량": ["창업자", "팀 소개", "팀 역량", "창업팀"],
            "시장 규모 (TAM/SAM/SOM)": ["TAM", "SAM", "SOM", "시장 규모"],
            "기술 개발 상세 계획": ["기술 개발 계획", "개발 방법론", "기술 스펙"],
            "재무 계획 (3년 추정)": ["재무 계획", "매출 추정", "BEP", "손익분기"],
            "사업화 전략 및 채널": ["사업화 전략", "고객 획득", "CAC", "유통 채널"],
            "사회적 가치 및 고용 효과": ["사회적 가치", "고용 창출", "고용 효과"],
            "지식재산권/기술 차별성 근거": ["특허", "지식재산권", "IP 전략"],
        }
        kws = keywords.get(section_key, [section_key])
        if not any(kw in document for kw in kws):
            missing.append(section_key)
    return missing

def generate_section(client, section_name: str, planning_doc: str) -> str:
    """특정 섹션 자동 생성"""
    section_prompt = MISSING_SECTION_PROMPTS.get(section_name, "")
    prompt = f"""[현재 기획서]
{planning_doc}

[작성 요청]
{section_prompt}

위 기획서의 내용과 일관성을 유지하면서 해당 섹션을 작성해주세요.
섹션 제목(##)은 포함하지 말고 내용만 작성하세요."""

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text.strip()

def append_section_to_doc(document: str, section_name: str, content: str) -> str:
    """기획서 끝에 새 섹션 추가"""
    timestamp = datetime.now().strftime("%Y.%m.%d")
    section = f"\n\n---\n\n## {section_name}\n\n> 자동 생성: {timestamp} (01b_refiner)\n\n{content}"
    # 마지막 서명 줄 앞에 삽입
    signature = "\n*CareerLog — 일하는 순간마다 경력이 쌓인다.*"
    if signature in document:
        return document.replace(signature, section + "\n" + signature)
    return document + section

def run_refiner(dry_run: bool = False):
    client = get_client()
    planning_doc = read_planning_doc()

    print("=" * 60)
    print("기획서 자동 보완 에이전트 (01b_refiner)")
    print("=" * 60)

    # 빠진 섹션 탐지
    missing = analyze_and_find_missing(planning_doc)

    if not missing:
        print("\n보완할 항목이 없습니다. 기획서가 완성되어 있습니다.")
        return

    print(f"\n보완 대상 {len(missing)}개 섹션:")
    for i, s in enumerate(missing, 1):
        print(f"  {i}. {s}")
    print()

    updated_doc = planning_doc
    results = []

    for i, section_name in enumerate(missing, 1):
        print(f"[{i}/{len(missing)}] {section_name} 생성 중...", end=" ", flush=True)
        content = generate_section(client, section_name, updated_doc)
        updated_doc = append_section_to_doc(updated_doc, section_name, content)
        results.append(section_name)
        print("완료")

    # 백업 저장
    filename = f"기획서_보완_{datetime.now().strftime('%Y%m%d_%H%M')}.md"
    save_output(filename, updated_doc)

    if not dry_run:
        write_planning_doc(updated_doc)
        print(f"\n기획서.md 업데이트 완료")

    print(f"백업: agents/outputs/{filename}")
    print(f"\n추가된 섹션 ({len(results)}개):")
    for s in results:
        print(f"  ✓ {s}")

    return updated_doc

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="기획서.md 수정 없이 출력만 확인")
    args = parser.parse_args()
    run_refiner(dry_run=args.dry_run)
