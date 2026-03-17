# CareerLog 정부과제 에이전트 시스템

## 에이전트 구성

| 파일 | 역할 | 실행 방식 |
|------|------|-----------|
| `01_planner.py` | 기획서 구체화 | 대화형 |
| `02_researcher.py` | 정부과제 전수 조사 | 자동 |
| `03_fitter.py` | 공고별 기획서 피팅 | 자동 / 과제 지정 |
| `04_evaluator.py` | 심사위원 페르소나 검토 | 자동 |
| `05_budget.py` | 예산 계획서 작성 | 과제 + 금액 지정 |
| `orchestrator.py` | 전체 파이프라인 조율 | 대화형 메뉴 |

## 빠른 시작

```powershell
# 환경 설정 (Windows PowerShell 또는 CMD)
py -m pip install -r agents/requirements.txt
set ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx

# 전체 파이프라인 실행 (권장)
py agents/orchestrator.py

# 개별 실행
py agents/01_planner.py                               # 기획서 대화형 구체화
py agents/02_researcher.py                            # 정부과제 조사
py agents/03_fitter.py --grant TIPS                   # TIPS 피팅
py agents/04_evaluator.py --target outputs/피팅_TIPS_20260317.md
py agents/05_budget.py --grant TIPS --total 200000000
```

## 출력 파일

모든 결과물은 `agents/outputs/` 폴더에 저장됩니다.

| 파일 패턴 | 내용 |
|-----------|------|
| `기획서_vYYYYMMDD_HHMM.md` | 구체화된 기획서 버전 |
| `정부과제_조사결과_YYYYMMDD.md` | 신청 가능 과제 전체 목록 |
| `피팅_{과제명}_YYYYMMDD.md` | 공고별 최적화 제안서 |
| `심사평_{과제명}_YYYYMMDD.md` | 3인 심사위원 사전 검토 |
| `예산계획_{과제명}_YYYYMMDD.md` | 예산 계획서 |

## 권장 실행 순서

1. `01_planner.py` — 기획서에 빠진 항목 채우기
2. `02_researcher.py` — 지금 신청 가능한 과제 파악
3. `03_fitter.py` — 유망 과제 3개 피팅
4. `04_evaluator.py` — 심사위원 검토로 약점 파악
5. 약점 보완 후 재피팅
6. `05_budget.py` — 최종 선택 과제 예산 설계
