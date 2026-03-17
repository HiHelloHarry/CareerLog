import { db } from './database.js';

const POLL_INTERVAL = 30 * 1000;

let intervalId = null;
let sessionId = null;
let current = null; // { appName, windowTitle, startedAt }

export const tracker = {
  start(sid) {
    sessionId = sid;
    current = null;
    poll();
    intervalId = setInterval(poll, POLL_INTERVAL);
  },

  stop() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (current) flushActivity();
    sessionId = null;
    current = null;
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
