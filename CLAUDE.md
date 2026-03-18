# CareerLog — Claude Code 가이드

## 프로젝트 개요
업무 활동을 자동 추적하고 AI로 이력서용 경력 기록을 생성하는 Electron 데스크톱 앱.

## 스택
- Electron + Vite + React (electron-forge, Squirrel 인스톨러)
- 스토리지: JSON 파일 (electron-store 사용 금지 — 패키징 오류 발생)
- 로컬 AI 서버: 순수 Node.js `http` 모듈, port 3759 (express 사용 금지 — 패키징 오류 발생)

## 주요 파일
```
electron-app/src/
  main.js          IPC 핸들러, 트레이, 추적 제어, 주간 알림
  tracker.js       active-win 폴링(10초), idle 감지(5분)
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

## 데이터 파일 (userData/data/)
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
- 새 npm 패키지를 main process에서 쓸 때 asar 포함 여부 먼저 확인

### useEffect 내 IPC 이벤트 핸들러
`useEffect(fn, [])` 클로저에서 React state가 초기값(null)에 고정됨.
state가 필요한 경우 반드시 `useRef`로 최신값 유지.
```js
const sessionIdRef = useRef(null)
useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])
```

### tracker.stop() race condition
clearInterval 후 100ms 대기 → flush 순서 지킬 것.

## 빌드 & 배포 순서
```bash
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

## 집/회사 컴퓨터 간 이어받기
```bash
git pull origin master
cd electron-app && npm install
# 코드 수정 후 빌드
```
