import { powerMonitor } from 'electron';
import { spawn } from 'node:child_process';
import { db } from './database.js';

const IDLE_THRESHOLD = 15 * 60;  // 15분

// PS를 한 번만 띄워서 계속 실행 — Add-Type 컴파일 비용 1회로 줄임
// execFile 매번 스폰 방식은 Add-Type(C# 컴파일)이 10초마다 반복돼
// 8초 타임아웃을 초과하면 activities가 기록되지 않는 문제 발생
const PS_LOOP = `
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$OutputEncoding=[System.Text.Encoding]::UTF8
$ErrorActionPreference='SilentlyContinue'
Add-Type @"
using System;using System.Runtime.InteropServices;using System.Text;
public class CL32{
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
}
"@ -ErrorAction SilentlyContinue
while($true){
  try{
    $hwnd=[CL32]::GetForegroundWindow()
    if($hwnd -ne [IntPtr]::Zero){
      $sb=New-Object System.Text.StringBuilder 512
      [CL32]::GetWindowText($hwnd,$sb,512)|Out-Null
      $pid2=0;[CL32]::GetWindowThreadProcessId($hwnd,[ref]$pid2)|Out-Null
      $p=Get-Process -Id $pid2 -ErrorAction SilentlyContinue
      if($p){@{n=$p.Name;t=$sb.ToString()}|ConvertTo-Json -Compress}
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
      current      = { appName, windowTitle, startedAt: new Date().toISOString() };
      lastActivity = { appName, windowTitle, timestamp: new Date().toISOString() };
      if (onActivityChangeCb) onActivityChangeCb(lastActivity);
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
  db.saveActivity(
    sessionId,
    current.appName,
    current.windowTitle,
    current.startedAt,
    overrideEndedAt || new Date().toISOString()
  );
  current = null;
}
