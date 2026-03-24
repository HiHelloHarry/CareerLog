import { powerMonitor } from 'electron';
import { spawn } from 'node:child_process';
import { db } from './database.js';

const IDLE_THRESHOLD = 15 * 60;  // 15분

// ── 앱별 창 제목 파서 (P1: 기록 정확도 고도화) ───────────────
// 창 제목에서 파일명, 프로젝트명, 채널명 등 구조화된 메타데이터를 추출
const TITLE_PARSERS = {
  // VS Code: "파일명 — 프로젝트명 — Visual Studio Code"
  'code': (title) => {
    // "● 파일명" (수정됨 표시) 처리
    const cleaned = title.replace(/^[●•]\s*/, '');
    const m = cleaned.match(/^(.+?)\s[—–-]\s(.+?)(?:\s[—–-]\sVisual Studio Code)?$/);
    if (m) {
      const file = m[1].trim();
      const rest = m[2].trim();
      // rest가 "프로젝트 — Visual Studio Code" 형태일 수 있음
      const pm = rest.match(/^(.+?)\s[—–-]\sVisual Studio Code$/);
      return { file, project: pm ? pm[1].trim() : rest };
    }
    return {};
  },
  // Chrome: "페이지 제목 - Google Chrome"
  'chrome': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\sGoogle Chrome$/);
    return m ? { pageTitle: m[1].trim() } : {};
  },
  // Edge: "페이지 제목 — Microsoft Edge"  (개인 등 접미사도)
  'msedge': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\sMicrosoft[\u200B\s]?Edge.*$/);
    return m ? { pageTitle: m[1].trim() } : {};
  },
  // Slack: "채널/DM — Slack"
  'slack': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\sSlack$/);
    return m ? { channel: m[1].trim() } : {};
  },
  // Figma: "파일명 — Figma"
  'figma': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\sFigma$/);
    return m ? { designFile: m[1].trim() } : {};
  },
  // Notion: "페이지 제목 — 워크스페이스"  or "페이지 제목"
  'notion': (title) => {
    const m = title.match(/^(.+?)(?:\s[—–-]\s.+)?$/);
    return m ? { page: m[1].trim() } : {};
  },
  // Terminal / PowerShell
  'windowsterminal': (title) => {
    // "관리자:  Windows PowerShell" or "cmd.exe - 명령어"
    return { terminal: title };
  },
  // Excel: "파일명 - Excel"
  'excel': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\s(?:Microsoft\s)?Excel$/);
    return m ? { file: m[1].trim(), tool: 'Excel' } : {};
  },
  // Word: "파일명 - Word"
  'winword': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\s(?:Microsoft\s)?Word$/);
    return m ? { file: m[1].trim(), tool: 'Word' } : {};
  },
  // PowerPoint: "파일명 - PowerPoint"
  'powerpnt': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\s(?:Microsoft\s)?PowerPoint$/);
    return m ? { file: m[1].trim(), tool: 'PowerPoint' } : {};
  },
  // 회의앱 (#5: 회의 시간이 블랙홀이 되지 않도록)
  'zoom': (title) => {
    // "Zoom Meeting" / "회의 제목 - Zoom" / "Zoom"
    const m = title.match(/^(.+?)\s[—–-]\sZoom$/);
    return { meeting: m ? m[1].trim() : title, meetingApp: 'Zoom' };
  },
  'teams': (title) => {
    // "Microsoft Teams" / "회의 제목 | Microsoft Teams"
    const m = title.match(/^(.+?)\s[|—–-]\s.*Teams.*$/);
    return { meeting: m ? m[1].trim() : title, meetingApp: 'Teams' };
  },
  // Google Meet은 Chrome 안에서 돌아가므로 URL 기반으로 감지 (tracker에서 처리)
  // KakaoTalk
  'kakaotalk': (title) => {
    return { chat: title };
  },
  // Postman
  'postman': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\sPostman$/);
    return m ? { request: m[1].trim() } : {};
  },
  // Jira (browser 기반이지만 제목에서 추출)
  // IntelliJ / WebStorm: "파일명 – 프로젝트명"
  'idea64': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\s(.+?)(?:\s[—–-]\s.*)?$/);
    return m ? { file: m[1].trim(), project: m[2].trim() } : {};
  },
  'webstorm64': (title) => {
    const m = title.match(/^(.+?)\s[—–-]\s(.+?)(?:\s[—–-]\s.*)?$/);
    return m ? { file: m[1].trim(), project: m[2].trim() } : {};
  },
};

function parseWindowTitle(appName, windowTitle) {
  if (!windowTitle) return {};
  const key = appName.toLowerCase();
  const parser = TITLE_PARSERS[key];
  return parser ? parser(windowTitle) : {};
}

// PS를 한 번만 띄워서 계속 실행 — Add-Type 컴파일 비용 1회로 줄임
// execFile 매번 스폰 방식은 Add-Type(C# 컴파일)이 10초마다 반복돼
// 8초 타임아웃을 초과하면 activities가 기록되지 않는 문제 발생
const PS_LOOP = `
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$OutputEncoding=[System.Text.Encoding]::UTF8
$ErrorActionPreference='SilentlyContinue'
Add-Type @"
using System;using System.Runtime.InteropServices;using System.Text;
public struct POINT{public int X;public int Y;}
public class CL32{
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
}
"@ -ErrorAction SilentlyContinue
Add-Type -AssemblyName UIAutomationClient -ErrorAction SilentlyContinue
Add-Type -AssemblyName UIAutomationTypes -ErrorAction SilentlyContinue
$BROWSER_NAMES='chrome','msedge','firefox','brave','opera','vivaldi'
function Get-BrowserUrl($h){
  try{
    $root=[System.Windows.Automation.AutomationElement]::FromHandle($h)
    $cond=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Edit)
    $edit=$root.FindFirst([System.Windows.Automation.TreeScope]::Descendants,$cond)
    if($edit){
      $vp=$edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
      if($vp){return $vp.Current.Value}
    }
  }catch{}
  return $null
}
function Get-KeyActivity{
  $c=0
  # A-Z(0x41-0x5A), 0-9(0x30-0x39), Space(0x20), Enter(0x0D), Backspace(0x08)
  @(0x08,0x0D,0x20)+@(0x30..0x39)+@(0x41..0x5A)|ForEach-Object{
    if(([CL32]::GetAsyncKeyState($_) -band 0x8000) -ne 0){$c++}
  }
  return $c
}
$prevX=-1;$prevY=-1
function Get-MouseActivity{
  # #6: 마우스 클릭(좌/우) + 커서 이동량 감지 — 디자이너 등 마우스 중심 작업자 대응
  $click=0
  # VK_LBUTTON=0x01, VK_RBUTTON=0x02
  if(([CL32]::GetAsyncKeyState(0x01) -band 0x8000) -ne 0){$click++}
  if(([CL32]::GetAsyncKeyState(0x02) -band 0x8000) -ne 0){$click++}
  $pt=New-Object POINT
  [CL32]::GetCursorPos([ref]$pt)|Out-Null
  $moved=0
  if($script:prevX -ge 0){
    $dx=[Math]::Abs($pt.X-$script:prevX);$dy=[Math]::Abs($pt.Y-$script:prevY)
    $moved=[Math]::Sqrt($dx*$dx+$dy*$dy)
  }
  $script:prevX=$pt.X;$script:prevY=$pt.Y
  return @{c=$click;m=[int]$moved}
}
while($true){
  try{
    $hwnd=[CL32]::GetForegroundWindow()
    if($hwnd -ne [IntPtr]::Zero){
      $sb=New-Object System.Text.StringBuilder 512
      [CL32]::GetWindowText($hwnd,$sb,512)|Out-Null
      $pid2=0;[CL32]::GetWindowThreadProcessId($hwnd,[ref]$pid2)|Out-Null
      $p=Get-Process -Id $pid2 -ErrorAction SilentlyContinue
      if($p){
        $o=@{n=$p.Name;t=$sb.ToString()}
        $nl=$p.Name.ToLower()
        if($BROWSER_NAMES -contains $nl){
          $u=Get-BrowserUrl $hwnd
          if($u){$o.u=$u}
        }
        $k=Get-KeyActivity
        $o.k=$k
        $ms=Get-MouseActivity
        $o.mc=$ms.c
        $o.mm=$ms.m
        $o|ConvertTo-Json -Compress
      }
      else{Write-Output 'null'}
    }else{Write-Output 'null'}
  }catch{Write-Output 'null'}
  [Console]::Out.Flush()
  Start-Sleep -Seconds 10
}`.trim();

let psProcess  = null;
let psBuffer   = '';
let sessionId  = null;
let current    = null;
let lastActivity  = null;
let onActivityChangeCb = null;
let isIdle     = false;
let idleStart  = null;
let idleIntervalId = null;
let stopping   = false;

function startPsProcess() {
  if (psProcess || stopping) return;
  try {
    psProcess = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', PS_LOOP], {
      windowsHide: true,
    });
    psBuffer = '';

    psProcess.stdout.setEncoding('utf8');
    psProcess.stdout.on('data', (chunk) => {
      psBuffer += chunk;
      const lines = psBuffer.split('\n');
      psBuffer = lines.pop();
      for (const line of lines) handlePsLine(line.trim());
    });

    psProcess.on('exit', () => {
      psProcess = null;
      // 추적 중이면 자동 재시작
      if (!stopping && sessionId) setTimeout(startPsProcess, 3000);
    });

    psProcess.on('error', (err) => {
      console.error('[Tracker] PS process error:', err.message);
      psProcess = null;
    });
  } catch (err) {
    console.error('[Tracker] Failed to start PS process:', err.message);
  }
}

function stopPsProcess() {
  if (psProcess) {
    try { psProcess.kill(); } catch {}
    psProcess = null;
  }
  psBuffer = '';
}

function handlePsLine(line) {
  if (!line || line === 'null' || isIdle) return;
  try {
    const data = JSON.parse(line);
    if (!data || !data.n) return;
    const appName     = data.n;
    const windowTitle = data.t || '';
    const browserUrl  = data.u || null;  // P2: 브라우저 URL
    const keyCount    = data.k || 0;     // P3: 키보드 활동량
    const mouseClick  = data.mc || 0;    // #6: 마우스 클릭
    const mouseMove   = data.mm || 0;    // #6: 마우스 이동량 (px)

    const SYSTEM_APPS = new Set([
      'careerlog', 'explorer', 'svchost', 'dwm', 'taskhost', 'searchui', 'cortana',
      'applicationframehost', 'shellexperiencehost', 'startmenuexperiencehost',
      'searchhost', 'lockapp', 'textinputhost', 'winlogon', 'runtimebroker',
      'taskmgr', 'systemsettings', 'snippingtool', 'screensketch', 'lockscreenhost',
      'fontdrvhost', 'ctfmon', 'sihost', 'taskhostw', 'dllhost',
    ]);
    if (SYSTEM_APPS.has(appName.toLowerCase())) return;

    const isSame = current &&
      current.appName     === appName &&
      current.windowTitle === windowTitle;

    if (!isSame) {
      if (current) flushActivity();
      const parsed = parseWindowTitle(appName, windowTitle);
      // P2: URL이 있으면 parsed에 추가
      // #2 민감정보 보호: pathname depth 2까지만 저장 + 민감 도메인 제외
      if (browserUrl) {
        try {
          const urlObj = new URL(browserUrl.startsWith('http') ? browserUrl : 'https://' + browserUrl);
          const host = urlObj.hostname;
          // 민감 도메인은 도메인만 저장 (메일, 금융, 의료 등)
          const SENSITIVE_DOMAINS = ['mail.google.com', 'outlook.live.com', 'outlook.office.com',
            'banking', 'bank', 'myaccount', 'account.google.com', 'accounts.google.com'];
          const isSensitive = SENSITIVE_DOMAINS.some(d => host.includes(d));
          parsed.domain = host;
          if (!isSensitive) {
            // pathname을 depth 2까지만 (예: /company/repo 까지, /pull/128/files 제거)
            const segments = urlObj.pathname.split('/').filter(Boolean).slice(0, 2);
            parsed.url = host + (segments.length ? '/' + segments.join('/') : '');
          } else {
            parsed.url = host; // 민감 도메인은 호스트만
          }
        } catch { /* URL 파싱 실패 무시 */ }
      }
      current      = { appName, windowTitle, parsed, keySamples: [], mouseSamples: [], startedAt: new Date().toISOString() };
      lastActivity = { appName, windowTitle, parsed, timestamp: new Date().toISOString() };
      if (onActivityChangeCb) onActivityChangeCb(lastActivity);
    }

    // P3 + #6: 키보드/마우스 활동량 샘플 누적 (같은 activity 동안 10초마다 쌓임)
    if (current) {
      current.keySamples.push(keyCount);
      current.mouseSamples.push({ click: mouseClick, move: mouseMove });
    }
  } catch { /* JSON 파싱 오류 무시 */ }
}

export const tracker = {
  start(sid, onActivityChange) {
    stopping = false;
    sessionId = sid;
    current   = null;
    lastActivity = null;
    isIdle    = false;
    idleStart = null;
    onActivityChangeCb = onActivityChange || null;

    startPsProcess();

    // Idle 감지는 별도 interval로 분리 (PS 폴링과 독립)
    idleIntervalId = setInterval(() => {
      try {
        const idleSec = powerMonitor.getSystemIdleTime();

        if (idleSec >= IDLE_THRESHOLD && !isIdle) {
          isIdle    = true;
          idleStart = new Date(Date.now() - idleSec * 1000).toISOString();
          // idle 시작 시점을 ended_at으로 사용 (idle 시간이 activity에 포함되지 않도록)
          if (current) flushActivity(idleStart);
        }

        if (idleSec < IDLE_THRESHOLD && isIdle) {
          isIdle = false;
          idleStart = null;
        }
      } catch (err) {
        console.error('[Tracker idle]', err.message);
      }
    }, 10000);
  },

  async stop() {
    stopping = true;
    if (idleIntervalId) { clearInterval(idleIntervalId); idleIntervalId = null; }
    stopPsProcess();
    await new Promise(r => setTimeout(r, 100));
    if (current && !isIdle) flushActivity();
    sessionId = null;
    current   = null;
    isIdle    = false;
    idleStart = null;
    onActivityChangeCb = null;
    onIdleCb  = null;
  },

  getLastActivity() { return lastActivity; },
  isCurrentlyIdle()  { return isIdle; },
};

function flushActivity(overrideEndedAt = null) {
  if (!current || !sessionId) return;
  const parsed = current.parsed || {};
  // P3 + #6: 키보드+마우스 종합으로 inputLevel 결정
  const keySamples = current.keySamples || [];
  const mouseSamples = current.mouseSamples || [];
  if (keySamples.length > 0 || mouseSamples.length > 0) {
    const keyAvg = keySamples.length > 0
      ? keySamples.reduce((a, b) => a + b, 0) / keySamples.length : 0;
    const clickAvg = mouseSamples.length > 0
      ? mouseSamples.reduce((a, s) => a + s.click, 0) / mouseSamples.length : 0;
    const moveAvg = mouseSamples.length > 0
      ? mouseSamples.reduce((a, s) => a + s.move, 0) / mouseSamples.length : 0;
    // 키보드 활발 → active(타이핑)
    // 키보드 없지만 마우스 활발(클릭 or 이동 > 100px) → active(마우스 조작)
    // 키보드 간헐적 or 마우스 간헐적 → light
    // 둘 다 없음 → passive
    if (keyAvg >= 2) {
      parsed.inputLevel = 'active';
    } else if (clickAvg > 0 || moveAvg > 100) {
      parsed.inputLevel = 'active';  // 디자이너 등 마우스 중심 작업
    } else if (keyAvg > 0 || moveAvg > 30) {
      parsed.inputLevel = 'light';
    } else {
      parsed.inputLevel = 'passive';
    }
  }
  db.saveActivity(
    sessionId,
    current.appName,
    current.windowTitle,
    current.startedAt,
    overrideEndedAt || new Date().toISOString(),
    Object.keys(parsed).length > 0 ? parsed : null
  );
  current = null;
}
