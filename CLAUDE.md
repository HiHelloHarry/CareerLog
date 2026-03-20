# CareerLog — Claude Code 가이드

## 프로젝트 개요
업무 활동을 자동 추적하고 AI로 이력서용 경력 기록을 생성하는 Electron 데스크톱 앱.

## 스택
- Electron + Vite + React (electron-forge, Squirrel 인스톨러)
- 스토리지: JSON 파일 (electron-store 사용 금지 — 패키징 오류 발생)
- 로컬 AI 서버: 순수 Node.js `http` 모듈, port 3759 (express 사용 금지 — 패키징 오류 발생)
- 활동 감지: PowerShell UIAutomation (active-win 대체 — 아래 참고)

## 주요 파일
```
electron-app/src/
  main.js          IPC 핸들러, 트레이, 추적 제어, 주간 알림, 닫기 동작
  tracker.js       PowerShell 폴링(10초), idle 감지(5분)
  database.js      모든 파일 I/O (sessions/activities/career_records/app_settings)
  ai.js            AI 프롬프트 생성 + 로컬 서버 호출
  local-server.js  로컬 HTTP 서버 (Node.js http 모듈)
  preload.js       IPC bridge (window.careerlog.*)
  App.jsx          라우팅 + 전역 상태
  components/
    Home.jsx / Timeline.jsx / CareerResult.jsx
    Settings.jsx / Onboarding.jsx / Done.jsx
    IdleDialog.jsx / TaggingSession.jsx
backend/
  server.js        Railway 배포용 Express 서버 (현재 미사용)
```

## 데이터 파일 (userData/data/ = C:\Users\<user>\AppData\Roaming\CareerLog\data\)
| 파일 | 내용 |
|------|------|
| sessions.json | 세션 목록 |
| activities.json | 활동 기록 |
| career_records.json | AI 생성 경력 기록 |
| app_settings.json | API 키, blacklist, 프로필, skip_tagging 등 모든 설정 |

### app_settings.json 주요 필드
- `first_launch`, `onboarding_completed`, `onboarding_ai`
- `api_key`, `device_id`
- `blacklist[]`
- `skip_tagging` — 업무 종료 후 태깅 건너뛰기
- `close_action` — X 버튼 동작: `''`(매번 묻기) | `'tray'` | `'quit'`
- `job_role`, `job_level`, `skills` — AI 프롬프트에 주입되는 직군/직급/기술스택

## AI 구조
- `USE_LOCAL_SERVER = true` → `http://localhost:3759/generate`
- Railway 전환 시: `USE_LOCAL_SERVER = false`, `RAILWAY_URL` 실제 주소로 교체
- 무료 크레딧: 20회/월 (device_id 기반 rate limit)
- STAR 출력: `{situation, task, action, result, skills, metrics_detected, bullets}`

## 반드시 지킬 규칙

### 절대 사용 금지
- `electron-store` — ESM-only라 패키징 시 ERR_MODULE_NOT_FOUND
- `express` in main process — external 처리해도 패키징에 포함 안 됨
- `active-win` — 네이티브 모듈이라 asar에 포함 안 됨 → PowerShell로 대체됨
- 새 npm 패키지를 main process에서 쓸 때 **반드시** asar 포함 여부 먼저 확인
  - `npm run make` 후 `npx asar list out/.../app.asar | grep node_modules`로 확인
  - node_modules가 없으면 패키지는 런타임에 로드 불가 (외부 패키지 전략 필요)

### 활동 감지: PowerShell UIAutomation (tracker.js)
`active-win`은 네이티브 모듈이라 패키징된 asar에 포함되지 않아 런타임 실패.
대신 `execFile('powershell', ...)` + `UIAutomationClient` 어셈블리로 포그라운드 창 감지.
- 속도: 폴당 ~400ms (10초 간격이므로 무방)
- `windowsHide: true` 필수 (PowerShell 창 플래시 방지)
- CareerLog 자기 자신(`appName === 'careerlog'`)은 추적 제외

### useEffect 내 IPC 이벤트 핸들러
`useEffect(fn, [])` 클로저에서 React state가 초기값(null)에 고정됨.
state가 필요한 경우 반드시 `useRef`로 최신값 유지.
```js
const sessionIdRef = useRef(null)
useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
```

### tracker.stop() race condition
clearInterval 후 100ms 대기 → flush 순서 지킬 것.

### stopTracking IPC vs 트레이 분리
`stopTracking({ openWindow: false })` — IPC 호출 시 (renderer가 navigation 담당)
`stopTracking({ openWindow: true })` — 트레이 메뉴에서 종료 시 (창 열고 timeline 이동)

### Timeline 렌더링 조건 (App.jsx)
```jsx
// showTagging=true && timeline이 있으면 TaggingSession, 아니면 항상 Timeline
{view === 'timeline' && showTagging && timeline.length > 0 && <TaggingSession />}
{view === 'timeline' && !(showTagging && timeline.length > 0) && <Timeline />}
```
Timeline에서 sessions.length > 1일 때만 날짜 피커 표시 (1개면 전환할 대상 없음).
timeline이 비어있어도 헤더+날짜 피커는 항상 렌더링 (빈 상태 메시지는 콘텐츠 영역에만).

### handleNavClick timeline 처리
`handleNavClick('timeline')` → `handleNavigateTimeline()` 호출.
sessionId 없으면 `getSessions()[0]`(최신)으로 자동 로드. 직접 setView만 하면 히스토리 안 보임.

## 구현된 기능 목록 (v0.2)
- R1: 샘플 데이터 온보딩 체험 (Onboarding.jsx)
- R2: 타임라인 앱별 그룹 뷰 + 시간순 토글 (Timeline.jsx)
- R3: 직군/직급/기술스택 프로필 설정 + AI 프롬프트 주입 (Settings.jsx, ai.js)
- R5: 주간 알림 + 타임라인 날짜 필터 + 홈 배지 (main.js, Timeline.jsx)
- R6: 프로젝트별 경력 기록 필터 (CareerResult.jsx)
- R7: Markdown/HTML 내보내기 (CareerResult.jsx, main.js)
- R8: 태깅 건너뛰기 토글 (Settings.jsx)
- R9: 클립보드 복사 (resume bullets / STAR / LinkedIn 형식) (CareerResult.jsx)
- X 버튼 닫기 동작 선택 (트레이/완전종료/매번묻기) + Settings 연동

## 빌드 & 배포 순서
```bash
# 실행 중인 CareerLog 프로세스 먼저 종료 (파일 잠금 방지)
powershell -Command "Get-Process | Where-Object { \$_.Path -like '*CareerLog*' } | Stop-Process -Force"

cd electron-app
npm run make
# Setup.exe를 루트에 복사
cp "out/make/squirrel.windows/x64/CareerLog Setup.exe" "../CareerLog Setup.exe"
# 깃 커밋 & 푸시
cd ..
git add "CareerLog Setup.exe"
git commit -m "..."
git push
```
- `.exe`는 Git LFS로 관리 중 (`.gitattributes` 설정됨)
- 빌드 전 CareerLog 프로세스 종료 필수 (EPERM: operation not permitted 오류 방지)

## 집/회사 컴퓨터 간 이어받기
```bash
git pull origin master
cd electron-app && npm install
# 코드 수정 후 빌드
```

## 알려진 데이터 현황
- sessions 1~7: activities.json 없이 생성된 구 버그 세션 (활동 기록 없음)
  - active-win 미탑재 버그로 인해 발생
  - 날짜 피커에서 선택 시 "이 날은 기록된 업무가 없습니다" 표시됨 (정상 처리)
- activities.json이 없으면 readJson()은 빈 배열 반환 (정상 동작)
