"""
오케스트레이터 — 전체 정부과제 파이프라인 조율
────────────────────────────────────────────────
전체 파이프라인:
  1. 기획서 구체화 (01_planner)       ← 대화형, 선택적
  2. 정부과제 조사 (02_researcher)    ← 자동
  3. 과제별 기획서 피팅 (03_fitter)   ← 조사된 과제마다 자동
  4. 심사위원 검토 (04_evaluator)     ← 피팅된 문서마다 선택적
  5. 예산 계획 (05_budget)            ← 최종 선택 과제에 대해

실행: python agents/orchestrator.py
"""
import sys
import os
import subprocess
from pathlib import Path
from datetime import datetime

# Windows 터미널 UTF-8 강제
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

AGENTS_DIR = Path(__file__).parent
OUTPUTS_DIR = AGENTS_DIR / "outputs"

# .env 로드
_env_file = AGENTS_DIR.parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

def check_api_key():
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        print("""
[오류] ANTHROPIC_API_KEY가 설정되지 않았습니다.

터미널에서 다음을 먼저 실행하세요:

  Windows CMD:        set ANTHROPIC_API_KEY=sk-ant-xxxxx
  Windows PowerShell: $env:ANTHROPIC_API_KEY="sk-ant-xxxxx"

API 키는 https://console.anthropic.com 에서 발급받을 수 있습니다.
""")
        sys.exit(1)
    print(f"[API 키 확인] OK (sk-ant-...{key[-4:]})")

def print_header(title: str):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def ask_yes_no(question: str, default: bool = True) -> bool:
    default_str = "[Y/n]" if default else "[y/N]"
    answer = input(f"{question} {default_str}: ").strip().lower()
    if not answer:
        return default
    return answer in ("y", "yes", "네", "ㅇ")

def run_agent(script_name: str, *args) -> int:
    cmd = [sys.executable, str(AGENTS_DIR / script_name)] + list(args)
    result = subprocess.run(cmd, cwd=str(AGENTS_DIR))
    return result.returncode

def get_latest_output(prefix: str) -> Path | None:
    files = sorted(OUTPUTS_DIR.glob(f"{prefix}*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None

def run_pipeline():
    check_api_key()
    print_header("CareerLog 정부과제 파이프라인 시작")
    print(f"실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("""
[파이프라인 단계]
  Step 1. 기획서 구체화 (선택)
  Step 2. 정부과제 조사
  Step 3. 과제별 기획서 피팅
  Step 4. 심사위원 검토 (선택)
  Step 5. 예산 계획 (선택)
""")

    # Step 1: 기획서 구체화
    print_header("Step 1 — 기획서 구체화")
    if ask_yes_no("기획서 구체화 에이전트를 실행하시겠습니까?"):
        run_agent("01_planner.py")
    else:
        print("  [Skip] 현재 기획서.md 사용")

    # Step 1b: 자동 보완
    print_header("Step 1b — 기획서 자동 보완")
    if ask_yes_no("분석 결과를 바탕으로 기획서를 자동 보완하시겠습니까?", default=True):
        run_agent("01b_refiner.py")
    else:
        print("  [Skip] 기획서 보완 생략")

    # Step 2: 정부과제 조사
    print_header("Step 2 — 정부과제 조사")
    print("  현재 신청 가능한 모든 정부 지원사업을 조사합니다...")
    run_agent("02_researcher.py")

    # 조사 결과 확인
    research_output = get_latest_output("정부과제_조사결과")
    if research_output:
        print(f"\n  [조사 결과] {research_output.name}")

    # Step 3: 과제별 피팅
    print_header("Step 3 — 과제별 기획서 피팅")

    # 기본 대상 과제 목록 (조사 결과에서 추출 또는 수동 지정)
    default_grants = ["TIPS", "초기창업패키지", "창업도약패키지", "NIPA_AI바우처"]

    print("  피팅할 과제를 선택하세요.")
    print("  기본 대상:")
    for i, g in enumerate(default_grants, 1):
        print(f"    {i}. {g}")
    print("  a. 전체 피팅")
    print("  직접 입력 가능 (쉼표로 구분)")

    choice = input("\n  선택 [a]: ").strip().lower()

    if not choice or choice == "a":
        selected_grants = default_grants
    elif choice.isdigit() and 1 <= int(choice) <= len(default_grants):
        selected_grants = [default_grants[int(choice) - 1]]
    else:
        selected_grants = [g.strip() for g in choice.split(",") if g.strip()]

    print(f"\n  피팅 대상: {', '.join(selected_grants)}")

    fitted_files = []
    for grant in selected_grants:
        print(f"\n  [{grant}] 피팅 중...")
        run_agent("03_fitter.py", "--grant", grant)

        fitted = get_latest_output(f"피팅_{grant.replace('/', '_')}")
        if fitted:
            fitted_files.append((grant, fitted))
            print(f"  [완료] {fitted.name}")

    # Step 4: 심사위원 검토
    print_header("Step 4 — 심사위원 페르소나 검토")
    if fitted_files and ask_yes_no("피팅된 문서를 심사위원 페르소나로 검토하시겠습니까?"):
        for grant, fitted_file in fitted_files:
            print(f"\n  [{grant}] 심사위원 검토 중...")
            run_agent("04_evaluator.py", "--target", str(fitted_file), "--grant", grant)

    # Step 5: 예산 계획
    print_header("Step 5 — 예산 계획")
    if ask_yes_no("최종 선택 과제의 예산 계획서를 작성하시겠습니까?"):
        if selected_grants:
            print(f"\n  선택 과제 목록:")
            for i, g in enumerate(selected_grants, 1):
                print(f"    {i}. {g}")
            choice = input("  예산 계획 대상 번호: ").strip()
            if choice.isdigit() and 1 <= int(choice) <= len(selected_grants):
                target_grant = selected_grants[int(choice) - 1]
                print(f"\n  총 사업비 입력 (예: 100000000):")
                try:
                    total = int(input("  > ").strip().replace(",", ""))
                except ValueError:
                    total = 100_000_000
                run_agent("05_budget.py", "--grant", target_grant, "--total", str(total))

    # 완료
    print_header("파이프라인 완료")
    print(f"\n생성된 파일 목록 ({OUTPUTS_DIR}):")
    for f in sorted(OUTPUTS_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)[:10]:
        size_kb = f.stat().st_size // 1024
        print(f"  - {f.name} ({size_kb}KB)")

    print("\n다음 단계:")
    print("  1. outputs/ 폴더의 피팅 문서 검토")
    print("  2. 심사평 기반으로 약점 보완")
    print("  3. 각 기관 홈페이지에서 실제 공고 마감일 확인")
    print("  4. 실제 제출 시스템에 업로드")

def run_auto(grants: list = None, evaluate: bool = True):
    """비대화형 자동 실행 모드 (--auto 플래그)"""
    check_api_key()
    print_header("CareerLog 파이프라인 — 자동 모드")
    print(f"실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    # Step 1: 기획서 구체화 Skip (대화형이라 자동 모드에서 제외)
    print("\n  [Step 1] 기획서 구체화 — Skip (대화형 전용)")

    # Step 1b: 기획서 자동 보완
    print_header("Step 1b — 기획서 자동 보완")
    run_agent("01b_refiner.py")

    # Step 2: 정부과제 조사
    print_header("Step 2 — 정부과제 조사")
    run_agent("02_researcher.py")

    # Step 3: 피팅
    selected_grants = grants or ["TIPS", "초기창업패키지", "창업도약패키지", "NIPA_AI바우처"]
    print_header(f"Step 3 — 기획서 피팅 ({len(selected_grants)}개 과제)")

    fitted_files = []
    for grant in selected_grants:
        print(f"\n  [{grant}] 피팅 중...")
        run_agent("03_fitter.py", "--grant", grant)
        fitted = get_latest_output(f"피팅_{grant.replace('/', '_')}")
        if fitted:
            fitted_files.append((grant, fitted))
            print(f"  [완료] {fitted.name}")

    # Step 4: 심사위원 검토
    if evaluate and fitted_files:
        print_header("Step 4 — 심사위원 페르소나 검토")
        for grant, fitted_file in fitted_files:
            print(f"\n  [{grant}] 심사위원 검토 중...")
            run_agent("04_evaluator.py", "--target", str(fitted_file), "--grant", grant)

    # Step 5: 예산 — 금액 입력 필요해서 자동 모드에서 제외
    print("\n  [Step 5] 예산 계획 — Skip (금액 지정 필요: py agents/05_budget.py --grant TIPS --total 100000000)")

    # 완료
    print_header("완료")
    print(f"\n생성된 파일 ({OUTPUTS_DIR}):")
    for f in sorted(OUTPUTS_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)[:10]:
        size_kb = f.stat().st_size // 1024
        print(f"  - {f.name} ({size_kb}KB)")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--auto", action="store_true", help="비대화형 자동 실행")
    parser.add_argument("--grants", nargs="+", help="피팅할 과제 목록 (예: TIPS 초기창업패키지)")
    parser.add_argument("--no-eval", action="store_true", help="심사위원 검토 생략")
    args = parser.parse_args()

    if args.auto:
        run_auto(grants=args.grants, evaluate=not args.no_eval)
    else:
        run_pipeline()
