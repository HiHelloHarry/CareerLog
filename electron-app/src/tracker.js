import { powerMonitor } from 'electron';
import { execFile } from 'node:child_process';
import { db } from './database.js';

const POLL_INTERVAL  = 10 * 1000;  // 10초
const IDLE_THRESHOLD = 5 * 60;     // 5분 (초 단위)

let intervalId = null;
let sessionId  = null;
let current    = null;   // { appName, windowTitle, startedAt }
let lastActivity = null;
let onActivityChangeCb = null;
let onIdleCb  = null;
let isIdle    = false;
let idleStart = null;

// PowerShell UIAutomation으로 포그라운드 창 정보 조회 (~400ms)
const PS_CMD = `$ErrorActionPreference='SilentlyContinue'
Add-Type -AssemblyName UIAutomationClient
$el = [System.Windows.Automation.AutomationElement]::FocusedElement
if ($el) {
  $pid2 = $el.Current.ProcessId
  $p = Get-Process -Id $pid2 -ErrorAction SilentlyContinue
  if ($p) {
    $n = $p.Name -replace '"', '\\"'
    $t = $p.MainWindowTitle -replace '"', '\\"'
    Write-Output ('{"owner":{"name":"' + $n + '"},"title":"' + $t + '"}')
  } else { Write-Output 'null' }
} else { Write-Output 'null' }`;

function queryActiveWindow() {
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', PS_CMD],
      { windowsHide: true, timeout: 8000 },
      (err, stdout) => {
        try { resolve(JSON.parse(stdout.trim())); } catch { resolve(null); }
      }
    );
  });
}

export const tracker = {
  start(sid, onActivityChange, onIdle) {
    sessionId = sid;
    current   = null;
    lastActivity = null;
    isIdle    = false;
    idleStart = null;
    onActivityChangeCb = onActivityChange || null;
    onIdleCb  = onIdle || null;
    poll();
    intervalId = setInterval(poll, POLL_INTERVAL);
  },

  async stop() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
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

async function poll() {
  try {
    // ── Idle 감지 ───────────────────────────────────────
    const idleSec = powerMonitor.getSystemIdleTime();

    if (idleSec >= IDLE_THRESHOLD && !isIdle) {
      isIdle    = true;
      idleStart = new Date(Date.now() - idleSec * 1000).toISOString();
      if (current) flushActivity();
    }

    if (idleSec < IDLE_THRESHOLD && isIdle) {
      isIdle = false;
      const idleMinutes = Math.round((Date.now() - new Date(idleStart).getTime()) / 60000);
      if (onIdleCb && idleMinutes >= 1) {
        onIdleCb({ idleMinutes, idleStart });
      }
      idleStart = null;
    }

    if (isIdle) return;

    // ── 활동 감지 ───────────────────────────────────────
    const win = await queryActiveWindow();
    if (!win) return;

    const appName     = win.owner?.name || 'Unknown';
    const windowTitle = win.title || '';

    // CareerLog 자신은 추적 제외
    if (appName.toLowerCase() === 'careerlog') return;

    const isSame = current &&
      current.appName     === appName &&
      current.windowTitle === windowTitle;

    if (!isSame) {
      if (current) flushActivity();
      current      = { appName, windowTitle, startedAt: new Date().toISOString() };
      lastActivity = { appName, windowTitle, timestamp: new Date().toISOString() };
      if (onActivityChangeCb) onActivityChangeCb(lastActivity);
    }
  } catch (err) {
    console.error('[Tracker]', err.message);
  }
}

function flushActivity() {
  if (!current || !sessionId) return;
  db.saveActivity(
    sessionId,
    current.appName,
    current.windowTitle,
    current.startedAt,
    new Date().toISOString()
  );
  current = null;
}
