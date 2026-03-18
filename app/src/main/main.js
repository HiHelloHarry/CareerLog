const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron')
const path = require('path')
const { tracker } = require('./tracker')
const { db } = require('./database')

// 개발 모드 감지
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let tray = null
let timelineWindow = null
let isTracking = false

// 앱 단일 인스턴스 보장
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.whenReady().then(() => {
  createTray()
  app.dock?.hide() // Mac: Dock에서 숨김
})

app.on('window-all-closed', (e) => {
  // 창이 모두 닫혀도 트레이 앱은 계속 실행
  e.preventDefault()
})

function createTray() {
  // 트레이 아이콘 (16x16 PNG)
  const iconPath = path.join(__dirname, '../../assets/tray-icon.png')
  let icon
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    // 아이콘 없으면 빈 이미지 사용 (개발 중)
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('CareerLog')
  updateTrayMenu()
}

function updateTrayMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: isTracking ? '⏹ 업무 종료' : '▶ 업무 시작',
      click: () => {
        if (isTracking) {
          stopTracking()
        } else {
          startTracking()
        }
      }
    },
    { type: 'separator' },
    {
      label: '기록 보기',
      click: () => openHistory()
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        if (isTracking) stopTracking()
        app.exit(0)
      }
    }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip(isTracking ? 'CareerLog — 업무 기록 중...' : 'CareerLog')
}

function startTracking() {
  isTracking = true
  const sessionId = db.startSession()
  tracker.start(sessionId)
  updateTrayMenu()
  console.log('[CareerLog] 업무 추적 시작')
}

function stopTracking() {
  isTracking = false
  tracker.stop()
  db.endSession()
  updateTrayMenu()
  openTimeline()
}

function openTimeline() {
  if (timelineWindow) {
    timelineWindow.focus()
    return
  }

  timelineWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 640,
    minHeight: 400,
    title: 'CareerLog — 오늘의 업무',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    timelineWindow.loadURL('http://localhost:3000')
    timelineWindow.webContents.openDevTools()
  } else {
    timelineWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  timelineWindow.on('closed', () => {
    timelineWindow = null
  })
}

function openHistory() {
  // Phase 2에서 구현 (전체 기록 히스토리)
  openTimeline()
}

// IPC 핸들러
ipcMain.handle('get-timeline', async (event, sessionId) => {
  return db.getTimeline(sessionId)
})

ipcMain.handle('get-last-session', async () => {
  return db.getLastSession()
})

ipcMain.handle('save-memo', async (event, activityId, memo) => {
  return db.saveMemo(activityId, memo)
})

ipcMain.handle('generate-career-record', async (event, sessionId) => {
  const { generateCareerRecord } = require('./ai')
  return await generateCareerRecord(sessionId)
})

ipcMain.handle('get-career-records', async () => {
  return db.getCareerRecords()
})
