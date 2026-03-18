import { powerMonitor } from 'electron';
import { db } from './database.js';

const POLL_INTERVAL  = 10 * 1000;  // 10초 (기존 30초 → 정밀도 향상)
const IDLE_THRESHOLD = 5 * 60;     // 5분 (초 단위)

let intervalId = null;
let sessionId  = null;
let current    = null;   // { appName, windowTitle, startedAt }
let lastActivity = null;
let onActivityChangeCb = null;
let onIdleCb  = null;    // idle 감지 콜백 → main.js로 전달
let isIdle    = false;
let idleStart = null;    // idle 시작 시각

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
    // poll()이 비동기로 실행 중일 수 있으므로 충분히 기다린 후 flush
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
      // idle 시작
      isIdle    = true;
      idleStart = new Date(Date.now() - idleSec * 1000).toISOString();
      if (current) flushActivity(); // idle 전까지의 활동 저장
    }

    if (idleSec < IDLE_THRESHOLD && isIdle) {
      // idle 복귀 — 얼마나 비웠는지 알림
      isIdle = false;
      const idleMinutes = Math.round((Date.now() - new Date(idleStart).getTime()) / 60000);
      if (onIdleCb && idleMinutes >= 1) {
        onIdleCb({ idleMinutes, idleStart });
      }
      idleStart = null;
    }

    if (isIdle) return; // idle 중엔 활동 기록 안 함

    // ── 활동 감지 ───────────────────────────────────────
    const { activeWindow } = await import('active-win');
    const win = await activeWindow();
    if (!win) return;

    const appName     = win.owner?.name || 'Unknown';
    const windowTitle = win.title || '';

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
