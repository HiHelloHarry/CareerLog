const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')

let _db = null

function getDb() {
  if (_db) return _db

  // 앱 데이터 폴더 — app.getPath는 app.whenReady 이후에만 유효
  const dbPath = path.join(app.getPath('userData'), 'careerlog.db')
  _db = new Database(dbPath)
  _db.pragma('journal_mode = WAL') // 성능 최적화
  initSchema(_db)
  return _db
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      app_name TEXT NOT NULL,
      window_title TEXT,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_sec INTEGER,
      memo TEXT,
      source TEXT DEFAULT 'active-win',
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS career_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      raw_timeline TEXT,
      created_at TEXT NOT NULL,
      source TEXT DEFAULT 'timeline'
    );
  `)
}

const db = {
  startSession() {
    const d = getDb()
    const now = new Date().toISOString()
    const date = now.split('T')[0]
    const result = d.prepare(
      'INSERT INTO sessions (started_at, date) VALUES (?, ?)'
    ).run(now, date)
    return result.lastInsertRowid
  },

  endSession() {
    const d = getDb()
    const now = new Date().toISOString()
    // 마지막 진행 중인 세션 종료
    d.prepare(
      'UPDATE sessions SET ended_at = ? WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1'
    ).run(now)
  },

  getLastSession() {
    const d = getDb()
    return d.prepare(
      'SELECT * FROM sessions ORDER BY id DESC LIMIT 1'
    ).get()
  },

  saveActivity(sessionId, appName, windowTitle, startedAt, endedAt) {
    const d = getDb()
    const start = new Date(startedAt)
    const end = new Date(endedAt)
    const durationSec = Math.round((end - start) / 1000)

    // 5분 미만 활동은 저장하되 나중에 UI에서 병합
    const result = d.prepare(`
      INSERT INTO activities (session_id, app_name, window_title, started_at, ended_at, duration_sec)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(sessionId, appName, windowTitle, startedAt, endedAt, durationSec)

    return result.lastInsertRowid
  },

  getTimeline(sessionId) {
    const d = getDb()

    // 5분 미만(300초) 단독 항목은 인접 항목과 병합 처리
    const activities = d.prepare(`
      SELECT * FROM activities
      WHERE session_id = ?
      ORDER BY started_at ASC
    `).all(sessionId)

    return mergeShortActivities(activities)
  },

  saveMemo(activityId, memo) {
    const d = getDb()
    d.prepare('UPDATE activities SET memo = ? WHERE id = ?').run(memo, activityId)
    return { success: true }
  },

  saveCareerRecord(sessionId, content, rawTimeline) {
    const d = getDb()
    const now = new Date().toISOString()
    const date = now.split('T')[0]
    const result = d.prepare(`
      INSERT INTO career_records (session_id, date, content, raw_timeline, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, date, content, JSON.stringify(rawTimeline), now)
    return result.lastInsertRowid
  },

  getCareerRecords() {
    const d = getDb()
    return d.prepare('SELECT * FROM career_records ORDER BY created_at DESC').all()
  }
}

// 짧은 활동(5분 미만) 병합: 같은 앱의 연속 항목 합치기
function mergeShortActivities(activities) {
  if (!activities.length) return []

  const MERGE_THRESHOLD = 300 // 5분 = 300초

  const result = []
  let current = { ...activities[0], merged_ids: [activities[0].id] }

  for (let i = 1; i < activities.length; i++) {
    const next = activities[i]
    const isSameApp = current.app_name === next.app_name
    const isShort = current.duration_sec < MERGE_THRESHOLD

    if (isSameApp || isShort) {
      // 병합: 종료 시간과 duration 업데이트
      current.ended_at = next.ended_at
      current.duration_sec = Math.round(
        (new Date(current.ended_at) - new Date(current.started_at)) / 1000
      )
      current.merged_ids.push(next.id)
      // 제목은 가장 긴 것 유지
      if ((next.window_title || '').length > (current.window_title || '').length) {
        current.window_title = next.window_title
      }
    } else {
      result.push(current)
      current = { ...next, merged_ids: [next.id] }
    }
  }
  result.push(current)

  return result
}

module.exports = { db }
