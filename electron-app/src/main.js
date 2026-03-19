import { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog, shell, Notification } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

// Railway 배포 후 아래 URL을 실제 주소로 교체하고 USE_LOCAL_SERVER = false
const USE_LOCAL_SERVER = true;
const RAILWAY_URL = 'https://careerlog-backend-production.up.railway.app';
const FREE_LIMIT = 20;
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

  ensureDeviceId();
  scheduleWeeklyReminder();

  if (USE_LOCAL_SERVER) {
    const { startLocalServer } = await import('./local-server.js');
    startLocalServer();
  }
  if (process.platform === 'darwin') app.dock?.hide();
  createTray();
  openMainWindow();
});

app.on('window-all-closed', (e) => e.preventDefault());

// ── 주간 알림 ────────────────────────────────────────────
function scheduleWeeklyReminder() {
  function check() {
    try {
      const now = new Date();
      // 월요일 오전 9~10시에 지난주 기록 없으면 알림
      if (now.getDay() !== 1 || now.getHours() !== 9) return;
      const records = db?.getCareerRecords() ?? [];
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 7);
      const cutoffDate = cutoff.toISOString().split('T')[0];
      const hasRecentRecord = records.some(r => r.date >= cutoffDate);
      if (!hasRecentRecord && Notification.isSupported()) {
        new Notification({
          title: 'CareerLog',
          body: '지난 주 경력 기록이 없습니다. 이번 주 첫 기록을 남겨보세요! 📝',
        }).show();
      }
    } catch {}
  }
  setInterval(check, 60 * 60 * 1000); // 1시간마다 체크
}

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
  tracker.start(
    currentSessionId,
    () => updateTrayMenu(),
    ({ idleMinutes, idleStart }) => {
      mainWindow?.webContents.send('idle-returned', { idleMinutes, idleStart });
      openMainWindow();
    }
  );
  isTracking = true;
  updateTrayMenu();
  mainWindow?.webContents.send('tracking-status', { isTracking: true, sessionId: currentSessionId });
}

async function stopTracking({ openWindow = true } = {}) {
  await tracker.stop();
  db.endSession();
  isTracking = false;
  updateTrayMenu();
  if (openWindow) openMainWindow('timeline');
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
    width: 860,
    height: 640,
    minWidth: 680,
    minHeight: 500,
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

// ── 앱 설정 (electron-store 아닌 settings.json) ─────────
function getSettingsPath() {
  const { default: Store } = { default: null };
  // electron-store는 API 키에만 사용. 앱 설정은 userData/settings.json
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'app_settings.json');
}

function readAppSettings() {
  try {
    const p = getSettingsPath();
    if (!fs.existsSync(p)) return { first_launch: true, onboarding_completed: false, blacklist: [] };
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { first_launch: true, onboarding_completed: false, blacklist: [] };
  }
}

function writeAppSettings(data) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(data, null, 2), 'utf8');
}

function ensureDeviceId() {
  const settings = readAppSettings();
  if (!settings.device_id) {
    settings.device_id = randomUUID();
    writeAppSettings(settings);
  }
  return settings.device_id;
}

// ── IPC ──────────────────────────────────────────────────
ipcMain.handle('get-status', () => ({ isTracking, sessionId: currentSessionId }));
ipcMain.handle('start-tracking', (_, project = '') => { startTracking(project); return { isTracking: true, sessionId: currentSessionId }; });
ipcMain.handle('stop-tracking', async () => { await stopTracking({ openWindow: false }); return { isTracking: false }; });

ipcMain.handle('get-timeline', (_, sessionId) => db?.getTimeline(sessionId) ?? []);
ipcMain.handle('get-last-session', () => db?.getLastSession() ?? null);
ipcMain.handle('get-session', (_, sessionId) => db?.getSession(sessionId) ?? null);
ipcMain.handle('get-sessions', () => db?.getSessions() ?? []);
ipcMain.handle('save-memo', (_, activityId, memo) => db?.saveMemo(activityId, memo));
ipcMain.handle('save-tag',  (_, activityId, tag)  => db?.saveTag(activityId, tag));
ipcMain.handle('get-career-records', () => db?.getCareerRecords() ?? []);

ipcMain.handle('generate-career-record', async (_, sessionId, template = 'star') => {
  try {
    const { generateCareerRecord } = await import('./ai.js');
    return await generateCareerRecord(sessionId, template);
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('update-career-record', (_, recordId, newContent, starData) => {
  db?.updateCareerRecord(recordId, newContent, starData);
  return { success: true };
});

// ── API 키 ───────────────────────────────────────────────
ipcMain.handle('save-api-key', (_, apiKey) => {
  const settings = readAppSettings();
  settings.api_key = apiKey;
  writeAppSettings(settings);
  return { success: true };
});

ipcMain.handle('has-api-key', () => {
  // 백엔드가 무료 크레딧 제공하므로 항상 생성 가능
  return true;
});

ipcMain.handle('get-credits', async () => {
  const deviceId = readAppSettings().device_id;
  if (!deviceId) return { remaining: FREE_LIMIT, limit: FREE_LIMIT };
  const base = USE_LOCAL_SERVER ? `http://localhost:${(await import('./local-server.js')).LOCAL_PORT}` : RAILWAY_URL;
  try {
    const resp = await fetch(`${base}/credits`, { headers: { 'x-device-id': deviceId } });
    return await resp.json();
  } catch {
    return { remaining: null, limit: FREE_LIMIT };
  }
});

ipcMain.handle('get-api-key-masked', () => {
  const key = readAppSettings().api_key || '';
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

// ── 앱 설정 IPC ──────────────────────────────────────────
ipcMain.handle('get-app-settings', () => readAppSettings());

ipcMain.handle('save-app-settings', (_, patch) => {
  const settings = readAppSettings();
  writeAppSettings({ ...settings, ...patch });
  return { success: true };
});

ipcMain.handle('complete-onboarding', () => {
  const settings = readAppSettings();
  settings.first_launch = false;
  settings.onboarding_completed = true;
  writeAppSettings(settings);
  return { success: true };
});

// ── Blacklist IPC ─────────────────────────────────────────
ipcMain.handle('get-blacklist', () => {
  const settings = readAppSettings();
  return settings.blacklist || [];
});

ipcMain.handle('add-to-blacklist', (_, appName) => {
  const settings = readAppSettings();
  if (!settings.blacklist) settings.blacklist = [];
  if (!settings.blacklist.includes(appName)) {
    settings.blacklist.push(appName);
    writeAppSettings(settings);
  }
  return settings.blacklist;
});

ipcMain.handle('remove-from-blacklist', (_, appName) => {
  const settings = readAppSettings();
  settings.blacklist = (settings.blacklist || []).filter(a => a !== appName);
  writeAppSettings(settings);
  return settings.blacklist;
});

// ── Export / Import IPC ───────────────────────────────────
ipcMain.handle('export-data', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `CareerLog_backup_${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled) return { canceled: true };

    const exportData = db?.exportAll() ?? {};
    const payload = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      app_version: '0.2.0',
      data: exportData,
    };
    fs.writeFileSync(result.filePath, JSON.stringify(payload, null, 2), 'utf8');
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('import-data', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };

    const raw = fs.readFileSync(result.filePaths[0], 'utf8');
    const payload = JSON.parse(raw);
    if (!payload.export_version || !payload.data) {
      return { error: '올바른 CareerLog 백업 파일이 아닙니다.' };
    }
    db?.importAll(payload.data);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('get-streak', () => db?.getStreak() ?? { current: 0, dates: [] });

// idle 시간 복원 (사용자가 "업무 중이었음" 선택 시)
ipcMain.handle('restore-idle-time', (_, idleStart) => {
  if (!currentSessionId || !idleStart) return;
  const sessionActivities = db.getTimeline(currentSessionId);
  const lastAct = sessionActivities[sessionActivities.length - 1];
  // 마지막 활동의 ended_at을 idle 시작 시각으로 되돌리고 duration 재계산
  if (lastAct) db.extendActivity(lastAct.id, idleStart);
});

// ── 데이터 삭제 ───────────────────────────────────────────
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

ipcMain.handle('insert-sample-data', () => {
  return db?.insertSampleData() ?? { sessionId: null };
});

// ── 경력 기록 내보내기 ────────────────────────────────────
ipcMain.handle('export-career-record', async (_, recordId, format) => {
  try {
    const records = db?.getCareerRecords() ?? [];
    const record  = records.find(r => r.id === recordId);
    if (!record) return { error: '기록을 찾을 수 없습니다.' };

    const { star, content, created_at, project } = record;
    const dateStr = new Date(created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    const projectStr = project ? ` — ${project}` : '';

    let fileContent, ext, filters;
    if (format === 'md') {
      const lines = [`# 경력 기록${projectStr}`, `> ${dateStr}`, ''];
      if (star) {
        lines.push('## Situation', star.situation || '', '');
        lines.push('## Task', star.task || '', '');
        lines.push('## Action', star.action || '', '');
        lines.push('## Result', star.result || '', '');
        if ((star.skills || []).length) lines.push('## Skills', (star.skills).map(s => `- ${s}`).join('\n'), '');
        if ((star.bullets || []).length) lines.push('## 이력서용 불릿', star.bullets.join('\n'), '');
      } else {
        lines.push(content || '');
      }
      fileContent = lines.join('\n');
      ext = 'md'; filters = [{ name: 'Markdown', extensions: ['md'] }];
    } else {
      const bullets = star?.bullets?.map(b => `<li>${b.replace(/^•\s*/, '')}</li>`).join('\n') || '';
      const starHtml = star ? `
        <div class="star"><div class="field situation"><h3>Situation</h3><p>${star.situation || ''}</p></div>
        <div class="field task"><h3>Task</h3><p>${star.task || ''}</p></div>
        <div class="field action"><h3>Action</h3><p>${star.action || ''}</p></div>
        <div class="field result"><h3>Result</h3><p>${star.result || ''}</p></div></div>
        ${bullets ? `<div class="bullets"><h3>이력서 불릿</h3><ul>${bullets}</ul></div>` : ''}
        ${(star.skills || []).length ? `<div class="skills"><h3>Skills</h3>${star.skills.map(s => `<span class="chip">${s}</span>`).join(' ')}</div>` : ''}
      ` : `<pre>${content || ''}</pre>`;
      fileContent = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>경력 기록</title>
        <style>body{font-family:'Noto Sans KR',sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1a1a2e;background:#fff}
        h1{font-size:24px;margin-bottom:4px}p.date{color:#666;font-size:14px;margin-bottom:32px}
        .field{background:#f9f9f9;border-radius:10px;padding:16px 20px;margin-bottom:12px}
        .field h3{font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#888;margin-bottom:8px}
        .field p{font-size:15px;line-height:1.7;margin:0}.bullets ul{line-height:1.9;font-size:15px}
        .chips{margin-top:8px}.chip{display:inline-block;background:#e8f4fd;color:#2678b5;padding:3px 10px;border-radius:20px;font-size:12px;margin:3px 3px 0 0}
        </style></head><body>
        <h1>경력 기록${projectStr}</h1><p class="date">${dateStr}</p>${starHtml}</body></html>`;
      ext = 'html'; filters = [{ name: 'HTML', extensions: ['html'] }];
    }

    const defaultName = `career-record-${new Date(created_at).toISOString().split('T')[0]}.${ext}`;
    const { filePath, canceled } = await dialog.showSaveDialog({ defaultPath: defaultName, filters });
    if (canceled || !filePath) return { cancelled: true };
    fs.writeFileSync(filePath, fileContent, 'utf8');
    return { success: true, filePath };
  } catch (err) {
    return { error: err.message };
  }
});

// ── 외부 링크 ─────────────────────────────────────────────
ipcMain.handle('open-external', (_, url) => {
  shell.openExternal(url);
  return { success: true };
});
