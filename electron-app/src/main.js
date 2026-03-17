import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

process.on('uncaughtException', (err) => {
  console.error('[CRASH]', err.stack);
  try { dialog.showErrorBox('CareerLog 오류', err.stack || err.message); } catch {}
});

if (started) app.quit();

let tray = null;
let mainWindow = null;   // 메인 GUI 창 (홈 / 타임라인)
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
  openMainWindow(); // 앱 시작 시 메인 창 바로 표시
});

// 창 모두 닫혀도 트레이 앱 계속 실행
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
  const menu = Menu.buildFromTemplate([
    {
      label: isTracking ? '⏹  업무 종료' : '▶  업무 시작',
      click: () => (isTracking ? stopTracking() : startTrackingFromTray()),
    },
    { type: 'separator' },
    { label: '창 열기', click: () => openMainWindow() },
    { type: 'separator' },
    {
      label: '종료',
      click: () => { if (isTracking) stopTracking(); app.exit(0); },
    },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(isTracking ? 'CareerLog — 기록 중...' : 'CareerLog');
}

// ── 추적 제어 ────────────────────────────────────────────
function startTracking() {
  currentSessionId = db.startSession();
  tracker.start(currentSessionId);
  isTracking = true;
  updateTrayMenu();
  // 창에도 상태 알림
  mainWindow?.webContents.send('tracking-status', { isTracking: true, sessionId: currentSessionId });
}

function stopTracking() {
  tracker.stop();
  db.endSession();
  isTracking = false;
  updateTrayMenu();
  // 타임라인 뷰로 전환
  openMainWindow('timeline');
}

function startTrackingFromTray() {
  startTracking();
  // 트레이에서 시작하면 창은 안 열림 (백그라운드)
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

  // 닫기 버튼 → 트레이로 숨김 (종료 아님)
  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── IPC ──────────────────────────────────────────────────
ipcMain.handle('get-status', () => ({ isTracking, sessionId: currentSessionId }));
ipcMain.handle('start-tracking', () => { startTracking(); return { isTracking: true, sessionId: currentSessionId }; });
ipcMain.handle('stop-tracking', () => { stopTracking(); return { isTracking: false }; });

ipcMain.handle('get-timeline', (_, sessionId) => db?.getTimeline(sessionId) ?? []);
ipcMain.handle('get-last-session', () => db?.getLastSession() ?? null);
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

ipcMain.handle('save-api-key', async (_, apiKey) => {
  const { default: Store } = await import('electron-store');
  new Store().set('apiKey', apiKey);
  return { success: true };
});

ipcMain.handle('has-api-key', async () => {
  const { default: Store } = await import('electron-store');
  return !!new Store().get('apiKey', '');
});
