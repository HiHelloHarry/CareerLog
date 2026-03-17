import { db } from './database.js';

const POLL_INTERVAL = 30 * 1000;

let intervalId = null;
let sessionId = null;
let current = null; // { appName, windowTitle, startedAt }
let lastActivity = null; // 트레이 표시용
let onActivityChangeCb = null; // 활동 변경 콜백 (트레이 업데이트)

export const tracker = {
  start(sid, onActivityChange) {
    sessionId = sid;
    current = null;
    lastActivity = null;
    onActivityChangeCb = onActivityChange || null;
    poll();
    intervalId = setInterval(poll, POLL_INTERVAL);
  },

  async stop() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (current) flushActivity();
    sessionId = null;
    current = null;
    onActivityChangeCb = null;
    // 동기 DB 쓰기 완료 보장 (미세 딜레이)
    await new Promise(r => setTimeout(r, 50));
  },

  getLastActivity() {
    return lastActivity;
  },
};

async function poll() {
  try {
    const { activeWindow } = await import('active-win');
    const win = await activeWindow();
    if (!win) return;

    const appName = win.owner?.name || 'Unknown';
    const windowTitle = win.title || '';

    const isSame = current &&
      current.appName === appName &&
      current.windowTitle === windowTitle;

    if (!isSame) {
      if (current) flushActivity();
      current = { appName, windowTitle, startedAt: new Date().toISOString() };
      lastActivity = { appName, windowTitle, timestamp: new Date().toISOString() };
      if (onActivityChangeCb) onActivityChangeCb(lastActivity);
    }
  } catch (err) {
    console.error('[Tracker]', err.message);
  }
}

function flushActivity() {
  if (!current || !sessionId) return;
  db.saveActivity(sessionId, current.appName, current.windowTitle, current.startedAt, new Date().toISOString());
  current = null;
}
