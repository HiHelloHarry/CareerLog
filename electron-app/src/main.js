import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

process.on('uncaughtException', (err) => {
  console.error('[CRASH]', err.stack);
  try { dialog.showErrorBox('CareerLog 오류', err.stack || err.message); } catch {}
});

if (started) app.quit();

let tray = null;
let mainWindow = null;
let isTracking = false;
let currentSessionId = null;
let db, tracker;

app.setAppUserModelId('com.careerlog.app');

app.whenReady().then(async () => {
  try {
    ({ db } = await import('./database.js'));
    ({ tracker } = await import('./tracker.js'));
  } catch (err) {
    dialog.showErrorBox('모듈 로딩 오류', err.stack || err.message);
    return;
  }

  if (process.platform === 'darwin') app.dock?.hide();
  createTray();
  openMainWindow();
});

app.on('window-all-closed', (e) => e.preventDefault());

// ── 트레이 ──────────────────────────────────────────────
function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAPUlEQVR4nGNgoDb4TwBQpBmvIcRqxmoIqZoxDMEmybf0JUGM0wBiNA93AygORGIB9RISVZIysYbg1UwOAAA6yV11Ygg9ngAAAABJRU5ErkJggg=='
  );
  tray = new Tray(icon);
  updateTrayMenu();
  tray.on('double-click', () => openMainWindow());
}

function updateTrayMenu() {
  const lastActivity = isTracking ? tracker?.getLastActivity() : null;
  const activityLabel = lastActivity
    ? `📍 ${lastActivity.appName}`
    : isTracking ? '감지 중...' : null;

  const template = [
    {
      label: isTracking ? '⏹  업무 종료' : '▶  업무 시작',
      click: () => (isTracking ? stopTracking() : startTrackingFromTray()),
    },
  ];

  if (isTracking && activityLabel) {
    template.push({ type: 'separator' });
    template.push({ label: activityLabel, enabled: false });
  }

  template.push({ type: 'separator' });
  template.push({ label: '창 열기', click: () => openMainWindow() });
  template.push({ type: 'separator' });
  template.push({
    label: '종료',
    click: () => { if (isTracking) stopTracking(); app.exit(0); },
  });

  tray.setContextMenu(Menu.buildFromTemplate(template));
  tray.setToolTip(isTracking ? `CareerLog — 기록 중` : 'CareerLog');
}

// ── 추적 제어 ────────────────────────────────────────────
function startTracking(project = '') {
  currentSessionId = db.startSession(project);
  tracker.start(currentSessionId, () => updateTrayMenu());
  isTracking = true;
  updateTrayMenu();
  mainWindow?.webContents.send('tracking-status', { isTracking: true, sessionId: currentSessionId });
}

async function stopTracking() {
  await tracker.stop(); // 마지막 활동 플러시 완료 대기
  db.endSession();
  isTracking = false;
  updateTrayMenu();
  openMainWindow('timeline');
}

function startTrackingFromTray() {
  startTracking();
}

// ── 창 관리 ──────────────────────────────────────────────
function openMainWindow(view = 'home') {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('navigate', view);
    return;
  }

  mainWindow = new BrowserWindow({
    width: 820,
    height: 620,
    minWidth: 640,
    minHeight: 480,
    title: 'CareerLog',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (view !== 'home') mainWindow.webContents.send('navigate', view);
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC ──────────────────────────────────────────────────
ipcMain.handle('get-status', () => ({ isTracking, sessionId: currentSessionId }));
ipcMain.handle('start-tracking', (_, project = '') => { startTracking(project); return { isTracking: true, sessionId: currentSessionId }; });
ipcMain.handle('stop-tracking', async () => { await stopTracking(); return { isTracking: false }; });

ipcMain.handle('get-timeline', (_, sessionId) => db?.getTimeline(sessionId) ?? []);
ipcMain.handle('get-last-session', () => db?.getLastSession() ?? null);
ipcMain.handle('get-session', (_, sessionId) => db?.getSession(sessionId) ?? null);
ipcMain.handle('save-memo', (_, activityId, memo) => db?.saveMemo(activityId, memo));
ipcMain.handle('get-career-records', () => db?.getCareerRecords() ?? []);

ipcMain.handle('generate-career-record', async (_, sessionId) => {
  try {
    const { generateCareerRecord } = await import('./ai.js');
    return await generateCareerRecord(sessionId);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('update-career-record', (_, recordId, newContent) => {
  db?.updateCareerRecord(recordId, newContent);
  return { success: true };
});

ipcMain.handle('save-api-key', async (_, apiKey) => {
  const { default: Store } = await import('electron-store');
  new Store().set('apiKey', apiKey);
  return { success: true };
});

ipcMain.handle('has-api-key', async () => {
  const { default: Store } = await import('electron-store');
  return !!new Store().get('apiKey', '');
});

ipcMain.handle('get-api-key-masked', async () => {
  const { default: Store } = await import('electron-store');
  const key = new Store().get('apiKey', '');
  if (!key) return '';
  return key.slice(0, 12) + '...' + key.slice(-4);
});

ipcMain.handle('validate-api-key', async (_, apiKey) => {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    });
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err.message };
  }
});

ipcMain.handle('delete-all-data', () => {
  db?.deleteAllData();
  if (isTracking) {
    tracker?.stop();
    isTracking = false;
    currentSessionId = null;
    updateTrayMenu();
    mainWindow?.webContents.send('tracking-status', { isTracking: false, sessionId: null });
  }
  return { success: true };
});
