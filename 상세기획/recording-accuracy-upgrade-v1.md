# 기록 정확도 고도화 개발계획 v1 ✅ 구현 완료
> 작성일: 2026-03-24 | 구현 완료: 2026-03-24
> 목표: 매일 자동으로 쌓이는 업무 기록의 정확도와 맥락 풍부도를 경쟁제품 수준으로 끌어올리기
>
> ## 구현 현황
> | Phase | 상태 | 비고 |
> |-------|------|------|
> | P1: 창 제목 심층 파싱 (17개 앱) | ✅ 완료 | Zoom/Teams 파서 추가 포함 |
> | P2: 브라우저 URL 추출 | ✅ 완료 | UI Automation + 민감정보 depth 2 제한 |
> | P3: 키보드 활동량 감지 | ✅ 완료 | GetAsyncKeyState 샘플링 |
> | P4: 작업 흐름 감지 | ✅ 완료 | PD 리뷰 반영: 프로젝트 기준 통합, 재합류, 5분 support |
> | P5: 스마트 세션 요약 | ✅ 완료 | flow 기반 구조 + parsed 메타데이터 |
> | PD리뷰 #1: Flow 같은 프로젝트 다른 파일 통합 | ✅ 완료 | file 단독 기준 제거, project 우선 |
> | PD리뷰 #2: URL 민감정보 보호 | ✅ 완료 | pathname depth 2 + 민감 도메인 차단 |
> | PD리뷰 #3: mergeShortActivities 버그 | ✅ 완료 | 앱 불일치 병합 방지 |
> | PD리뷰 #4: SUPPORT_MAX_SEC 확대 | ✅ 완료 | 3분→5분 |
> | PD리뷰 #5: 회의앱 파서 | ✅ 완료 | Zoom/Teams 추가 |
> | PD리뷰 #6: 마우스 활동 감지 | ✅ 완료 | GetCursorPos + VK_LBUTTON, 디자이너 대응 |

---

## 1. 경쟁제품 분석

### MS Recall (Windows 11 Copilot+)
| 항목 | 내용 |
|------|------|
| **핵심 메커니즘** | 5초 간격 스크린샷 + 온디바이스 OCR(AI 모델). 스크린 전체를 캡처하여 텍스트/이미지로 인덱싱 |
| **저장 데이터** | 스크린샷 이미지, OCR 추출 텍스트, 앱 이름, 창 제목, URL, 타임스탬프 |
| **검색** | 자연어 검색 ("지난주 엑셀에서 본 매출 표") → AI가 타임라인에서 해당 스냅샷 반환 |
| **프라이버시** | 완전 로컬 (NPU 활용), BitLocker 암호화, 앱/사이트별 제외 설정 |
| **강점** | 화면 내용 자체를 기록 → "무엇을 봤는지"까지 검색 가능 |
| **약점** | NPU 필수(Copilot+ PC만), 저장 용량 큼(25GB~), 프라이버시 논란, 경력 기록 목적이 아님 |

### Rewind AI (→ Limitless)
| 항목 | 내용 |
|------|------|
| **핵심 메커니즘** | 연속 스크린 레코딩 + 마이크 녹음 → 로컬 AI로 OCR + 음성 전사 |
| **저장 데이터** | 압축 스크린 녹화, OCR 텍스트, 음성 전사, 앱 메타데이터, 미팅 참석자 |
| **검색** | AI 챗봇으로 "오늘 오전에 뭐 했어?" 질문 → 요약 생성 |
| **프라이버시** | 로컬 저장, 자체 압축 (하루 ~3.8GB → 수십 MB), 앱별 제외 |
| **강점** | 화면+음성 결합 → 미팅 맥락까지 기록, 자연어 회고 가능 |
| **약점** | macOS 중심, 리소스 사용량 높음, 월 $24.99, 화면 녹화 심리적 저항감 |

### CareerLog 현재 (v0.6)
| 항목 | 내용 |
|------|------|
| **핵심 메커니즘** | Win32 GetForegroundWindow() → 10초 간격 폴링. 앱 이름 + 창 제목만 수집 |
| **저장 데이터** | app_name, window_title, started_at, ended_at, duration_sec, memo(수동) |
| **검색** | 세션별 타임라인 뷰 (날짜 필터) |
| **프라이버시** | 완전 로컬 JSON, 스크린 캡처 없음, 최소 데이터 수집 |
| **강점** | 극도로 가벼움, 프라이버시 안전, 패키징 단순 |
| **약점** | **창 제목만으로는 맥락 부족** — AI가 추론할 재료가 빈약 |

---

## 2. 핵심 문제 진단: "기록의 정확도"가 낮은 이유

```
현재 데이터:  app_name="Chrome"  window_title="GitHub PR #42 — CareerLog"
→ AI가 추론할 수 있는 것: "GitHub에서 PR 관련 작업을 했다"
→ AI가 추론할 수 없는 것: PR을 리뷰한 건지, 작성한 건지, 머지한 건지
```

**근본 원인: 앱 이름 + 창 제목 = 맥락의 10%만 캡처**

| 누락 정보 | 예시 | AI 추론 영향 |
|-----------|------|-------------|
| 브라우저 URL | `github.com/pulls/42/files` vs `github.com/pulls/42` | 리뷰 vs 열람 구분 불가 |
| 탭 전환 패턴 | Chrome 탭 5개 중 어떤 탭이 활성? | 실제 작업 vs 백그라운드 구분 불가 |
| 파일 경로 | VS Code에서 `auth.ts` 편집 중 | 프로젝트·모듈 맥락 누락 |
| 클립보드 방향 | 복사→붙여넣기 흐름 | 리서치→코딩 맥락 연결 불가 |
| 키보드 활동량 | 타이핑 vs 읽기 | 능동적 작업 vs 수동적 소비 구분 불가 |

---

## 3. 고도화 로드맵 — 기록 정확도 향상

### Phase 1: 창 제목 심층 파싱 (난이도: ★☆☆ | 영향: ★★★)
> 코드 변경만으로 즉시 가능. 외부 의존성 없음.

**현재**: `window_title`을 그대로 저장
**개선**: 앱별 파서를 통해 구조화된 메타데이터 추출

```js
// tracker.js에 추가할 파서
const TITLE_PARSERS = {
  // VS Code: "파일명 — 프로젝트명"
  'code': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\s(.+?)(?:\s[—–-]\sVisual Studio Code)?$/);
    return m ? { file: m[1].trim(), project: m[2].trim() } : {};
  },
  // Chrome/Edge: "페이지 제목 — 사이트"  +  URL 추출은 Phase 2
  'chrome': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\s(Google Chrome|Microsoft Edge)$/);
    return m ? { pageTitle: m[1].trim() } : {};
  },
  'msedge': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\s(Google Chrome|Microsoft Edge)$/);
    return m ? { pageTitle: m[1].trim() } : {};
  },
  // Slack: "#채널명" 또는 "DM 상대"
  'slack': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\sSlack$/);
    return m ? { channel: m[1].trim() } : {};
  },
  // Figma: "파일명 — Figma"
  'figma': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\sFigma$/);
    return m ? { designFile: m[1].trim() } : {};
  },
  // Notion: "페이지 제목"
  'notion': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\sNotion$/);
    return m ? { page: m[1].trim() } : {};
  },
  // Terminal: 명령어 추출
  'windowsterminal': (title) => ({ command: title }),
  'cmd': (title) => ({ command: title }),
};

function parseWindowTitle(appName, windowTitle) {
  const key = appName.toLowerCase();
  const parser = TITLE_PARSERS[key];
  return parser ? parser(windowTitle) : {};
}
```

**activity 데이터 변경:**
```json
{
  "app_name": "code",
  "window_title": "auth.ts — CareerLog — Visual Studio Code",
  "parsed": { "file": "auth.ts", "project": "CareerLog" },
  "started_at": "...", "ended_at": "...", "duration_sec": 120
}
```

**AI 프롬프트 개선 효과:**
- Before: `VS Code (auth.ts — CareerLog) 2h`
- After: `VS Code [파일: auth.ts, 프로젝트: CareerLog] 2h` → AI가 "CareerLog 프로젝트의 인증 모듈 개발"로 정확히 추론

---

### Phase 2: 브라우저 URL 추출 (난이도: ★★☆ | 영향: ★★★)
> 가장 큰 정확도 향상 기대. Chrome/Edge Accessibility API 활용.

**방법: UI Automation으로 주소창 텍스트 읽기**

```powershell
# PowerShell — UI Automation으로 Chrome 주소창 URL 추출
Add-Type -AssemblyName UIAutomationClient
$auto = [System.Windows.Automation.AutomationElement]
$root = $auto::FromHandle($hwnd)
# Chrome 주소창: ControlType=Edit, Name="주소 및 검색창"
$cond = New-Object System.Windows.Automation.PropertyCondition(
  [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
  [System.Windows.Automation.ControlType]::Edit
)
$edit = $root.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $cond)
if ($edit) { $edit.GetCurrentPropertyValue([System.Windows.Automation.ValuePattern]::ValueProperty) }
```

**저장 데이터:**
```json
{
  "app_name": "chrome",
  "window_title": "Pull Request #42 — GitHub",
  "parsed": { "pageTitle": "Pull Request #42", "url": "github.com/HiHelloHarry/CareerLog/pull/42/files" },
  "url_domain": "github.com",
  "url_path": "/HiHelloHarry/CareerLog/pull/42/files"
}
```

**AI 추론 개선:**
- Before: "GitHub에서 뭔가 했다"
- After: "CareerLog 리포의 PR #42 파일 변경사항을 리뷰했다" → **행동의 종류까지 특정 가능**

**주의사항:**
- UI Automation은 Add-Type 시 별도 어셈블리 로드 필요 → PS_LOOP의 기존 Add-Type과 병합
- Chrome이 포커스된 경우에만 URL 추출 시도 (다른 앱에선 스킵)
- URL에서 민감 정보(쿼리 파라미터의 토큰 등) 자동 제거 필요
- `url_domain`만 저장하는 "최소 모드" 옵션도 제공 (프라이버시 우려 사용자용)

---

### Phase 3: 키보드/마우스 활동량 감지 (난이도: ★★☆ | 영향: ★★☆)
> "읽기 vs 쓰기" 구분. 스크린 캡처 없이 맥락을 크게 보강.

**방법: 글로벌 키보드 훅이 아닌 GetAsyncKeyState 샘플링**

```csharp
// C# Add-Type에 추가
[DllImport("user32.dll")]
public static extern short GetAsyncKeyState(int vKey);

public static int CountActiveKeys() {
  int count = 0;
  // 주요 키만 샘플링 (A-Z, 0-9, Space, Enter, arrows)
  for (int k = 0x20; k <= 0x5A; k++) {
    if ((GetAsyncKeyState(k) & 0x8000) != 0) count++;
  }
  return count;
}
```

**10초마다 수집하는 데이터:**
```json
{
  "app_name": "code",
  "window_title": "...",
  "input_level": "active",    // active(타이핑) | passive(읽기) | idle
  "keypress_samples": 8       // 10초간 키 입력 감지 횟수
}
```

**AI 프롬프트 반영:**
```
VS Code [파일: auth.ts, 프로젝트: CareerLog] 2h (활발한 코딩 — 키 입력 높음)
Chrome [GitHub PR #42 리뷰] 30m (읽기 위주 — 키 입력 낮음)
```

→ AI가 "코드 작성 2시간 + PR 코드 리뷰 30분"으로 구분 가능

---

### Phase 4: 작업 흐름(Flow) 감지 (난이도: ★★☆ | 영향: ★★★)
> 앱 전환 패턴에서 "업무 단위"를 자동 추론

**현재 문제:**
```
09:00  VS Code (auth.ts)    → 10분
09:10  Chrome (Stack Overflow) → 3분
09:13  VS Code (auth.ts)    → 15분
09:28  Slack (#dev-team)     → 2분
09:30  VS Code (auth.ts)    → 20분
```
현재: 5개의 독립 activity로 기록됨
이상적: **"auth.ts 인증 모듈 개발 (47분)" — 중간에 리서치+소통 포함**

**구현 방법: 앱 전환 그래프 분석**

```js
// flow-detector.js (새 모듈)
const FLOW_TIMEOUT = 300; // 5분 이상 다른 맥락이면 flow 끊김

function detectFlows(activities) {
  const flows = [];
  let currentFlow = { anchor: null, activities: [], start: null, end: null };

  for (const act of activities) {
    const context = getContext(act); // { project, file, domain } 등

    if (!currentFlow.anchor) {
      // 새 flow 시작
      currentFlow = { anchor: context, activities: [act], start: act.started_at, end: act.ended_at };
    } else if (isSameFlow(currentFlow.anchor, context)) {
      // 같은 맥락 — flow 계속
      currentFlow.activities.push(act);
      currentFlow.end = act.ended_at;
    } else if (act.duration_sec < FLOW_TIMEOUT) {
      // 짧은 이탈 (리서치, 소통) — flow에 포함하되 보조 활동으로 표시
      currentFlow.activities.push({ ...act, role: 'support' });
      currentFlow.end = act.ended_at;
    } else {
      // 맥락 전환 — flow 종료, 새 flow 시작
      flows.push(currentFlow);
      currentFlow = { anchor: context, activities: [act], start: act.started_at, end: act.ended_at };
    }
  }
  if (currentFlow.activities.length) flows.push(currentFlow);
  return flows;
}
```

**AI에 전달되는 데이터 변화:**
```
Before (5개 개별 활동):
  - VS Code (auth.ts) 10m
  - Chrome (Stack Overflow) 3m
  - VS Code (auth.ts) 15m
  - Slack (#dev-team) 2m
  - VS Code (auth.ts) 20m

After (1개 작업 흐름):
  📦 작업 흐름: "auth.ts 개발" (총 47분)
    - 핵심: VS Code [auth.ts, CareerLog] 45분 (활발한 코딩)
    - 보조: Chrome [Stack Overflow] 3분 (리서치)
    - 보조: Slack [#dev-team] 2분 (팀 소통)
```

→ 자동 기록의 맥락 정확도가 극적으로 향상되고, 이를 기반으로 STAR 생성 품질도 높아짐

---

### Phase 5: 스마트 세션 요약 (난이도: ★☆☆ | 영향: ★★☆)
> AI 프롬프트 구조 개선으로 같은 데이터에서 더 나은 결과 추출

**현재 ai.js 프롬프트 문제:**
- 모든 활동을 flat list로 나열 → AI가 맥락 없이 나열식 요약
- 메모 있는 활동/없는 활동 2분류뿐

**개선 구조:**
```
[세션 개요]
날짜: 2026-03-24, 총 업무시간: 7h 30m
주요 프로젝트: CareerLog (VS Code 3h 45m), 기획서 작업 (Notion 1h 20m)

[작업 흐름 #1] "인증 모듈 개발" (09:00~10:47, 1h 47m)
  핵심: VS Code [auth.ts → auth.test.ts → LoginButton.tsx] 1h 30m (활발한 코딩)
  보조: Chrome [OAuth 2.0 MDN 문서, Google Sign-In docs] 12m (기술 리서치)
  보조: Slack [#dev-team] 5m (팀 소통)
  사용자 메모: "소셜 로그인 플로우 리서치"

[작업 흐름 #2] "PR 리뷰 및 병합" (15:50~17:10, 1h 20m)
  핵심: Chrome [github.com/pull/42/files] 20m (코드 리뷰)
  핵심: VS Code [auth.ts — 리뷰 반영] 45m (코드 수정)
  보조: Slack [#code-review] 15m
```

---

## 4. 구현 우선순위 및 일정

| Phase | 이름 | 예상 공수 | 정확도 향상 | 우선순위 |
|-------|------|----------|-----------|---------|
| **P1** | 창 제목 심층 파싱 | 1일 | ★★★ 앱별 파일/프로젝트 추출 | 🔴 즉시 |
| **P4** | 작업 흐름 감지 | 2일 | ★★★ 개별→묶음으로 AI 입력 혁신 | 🔴 즉시 |
| **P5** | 스마트 세션 요약 | 1일 | ★★☆ 같은 데이터로 더 나은 AI 출력 | 🔴 즉시 |
| **P2** | 브라우저 URL 추출 | 2~3일 | ★★★ 행동 종류 특정 가능 | 🟡 다음 |
| **P3** | 키보드 활동량 감지 | 1~2일 | ★★☆ 읽기/쓰기 구분 | 🟡 다음 |

### 즉시 착수 (P1+P4+P5): 총 4일
- 외부 의존성 없음, tracker.js + ai.js 수정만으로 완료
- `parsed` 필드 추가는 기존 데이터와 하위호환 (없으면 무시)

### 다음 스프린트 (P2+P3): 총 4~5일
- P2는 UI Automation 어셈블리 로드 테스트 필요
- P3는 GetAsyncKeyState 의 폴링 주기 최적화 필요

---

## 5. 하지 않을 것 (의도적 제외)

| MS Recall/Rewind 기능 | 제외 이유 |
|----------------------|----------|
| 스크린 캡처/OCR | 저장 용량 폭증, 프라이버시 리스크, Electron에서 NPU 활용 불가 |
| 마이크 녹음/전사 | 사무실 환경에서 동의 없는 녹음은 법적 리스크 |
| 자연어 검색 | 현재 목적은 "매일 쌓이는 자동 기록"이지 "과거 검색"이 아님 |
| 전체 화면 녹화 | Rewind 방식은 리소스 과다 + 심리적 저항감 |

**CareerLog의 차별화 전략:**
> Recall/Rewind = "모든 것을 기록하고 나중에 찾기"
> CareerLog = "버튼 두 개로 매일 커리어가 자동으로 쌓이고, 필요할 때 STAR로 꺼내 쓰기"

스크린을 찍지 않으면서도, **창 제목 파싱 + URL + 활동량 + 흐름 감지**로
매일 자동으로 쌓이는 기록의 정확도를 확보하는 것이 목표. 정확한 자동 기록이 쌓여야, 필요할 때 꺼내 쓰는 STAR의 품질도 높아진다.

---

## 6. 데이터 스키마 변경 (activities.json)

```json
// v0.6 (현재)
{
  "id": 1,
  "session_id": 8,
  "app_name": "chrome",
  "window_title": "Pull Request #42 — GitHub",
  "started_at": "2026-03-24T09:00:00.000Z",
  "ended_at": "2026-03-24T09:10:00.000Z",
  "duration_sec": 600,
  "memo": null
}

// v0.7 (고도화 후)
{
  "id": 1,
  "session_id": 8,
  "app_name": "chrome",
  "window_title": "Pull Request #42 — GitHub",
  "parsed": {
    "pageTitle": "Pull Request #42",
    "url": "github.com/HiHelloHarry/CareerLog/pull/42/files",
    "domain": "github.com"
  },
  "input_level": "passive",
  "flow_id": "flow_1",
  "started_at": "2026-03-24T09:00:00.000Z",
  "ended_at": "2026-03-24T09:10:00.000Z",
  "duration_sec": 600,
  "memo": null
}
```

하위호환: `parsed`, `input_level`, `flow_id`가 없는 기존 데이터는 그대로 동작.

---

## 7. 성공 지표

| 지표 | 현재 (v0.6) | 목표 (v0.7) | 측정 방법 |
|------|------------|------------|----------|
| AI가 프로젝트명 추출 성공률 | ~30% (제목에 포함된 경우만) | 90%+ | parsed.project 필드 존재 비율 |
| AI STAR에서 구체적 행동 서술 | "GitHub 작업" 수준 | "PR #42 코드 리뷰 및 반영" 수준 | 생성 결과 수동 평가 |
| 1세션당 AI 인식 작업 흐름 수 | 15~20개 (개별 앱 전환) | 3~5개 (의미 단위 묶음) | flow_id 기준 그룹 수 |
| 사용자 메모 없이도 정확한 기록 | 낮음 | 높음 | 메모 없는 세션의 AI 출력 품질 |
