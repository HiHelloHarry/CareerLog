const { db } = require('./database')

const POLL_INTERVAL = 30 * 1000 // 30초

let intervalId = null
let currentSessionId = null
let currentActivity = null // { appName, windowTitle, startedAt }

const tracker = {
  start(sessionId) {
    currentSessionId = sessionId
    currentActivity = null

    // 즉시 첫 감지
    poll()

    intervalId = setInterval(poll, POLL_INTERVAL)
    console.log('[Tracker] 시작 — 30초 간격 감지')
  },

  stop() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    // 마지막 활동 저장
    if (currentActivity) {
      flushActivity()
    }

    currentSessionId = null
    currentActivity = null
    console.log('[Tracker] 중지')
  }
}

async function poll() {
  try {
    // active-win은 ESM 모듈 — dynamic import 필요
    const { activeWindow } = await import('active-win')
    const win = await activeWindow()

    if (!win) return

    const appName = win.owner?.name || 'Unknown'
    const windowTitle = win.title || ''

    const isSame = currentActivity &&
      currentActivity.appName === appName &&
      currentActivity.windowTitle === windowTitle

    if (!isSame) {
      // 이전 활동 저장
      if (currentActivity) {
        flushActivity()
      }

      // 새 활동 시작
      currentActivity = {
        appName,
        windowTitle,
        startedAt: new Date().toISOString()
      }

      console.log(`[Tracker] ${appName} | ${windowTitle.slice(0, 50)}`)
    }
  } catch (err) {
    console.error('[Tracker] 감지 오류:', err.message)
  }
}

function flushActivity() {
  if (!currentActivity || !currentSessionId) return

  const endedAt = new Date().toISOString()
  db.saveActivity(
    currentSessionId,
    currentActivity.appName,
    currentActivity.windowTitle,
    currentActivity.startedAt,
    endedAt
  )

  currentActivity = null
}

module.exports = { tracker }
