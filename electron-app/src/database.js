import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

function getDataDir() {
  const dir = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(file) {
  try {
    const p = path.join(getDataDir(), file);
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(path.join(getDataDir(), file), JSON.stringify(data, null, 2), 'utf8');
}

let _sessionId = 0;
let _activityId = 0;

function nextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

export const db = {
  startSession() {
    const sessions = readJson('sessions.json');
    const id = nextId(sessions);
    const now = new Date().toISOString();
    sessions.push({ id, started_at: now, ended_at: null, date: now.split('T')[0] });
    writeJson('sessions.json', sessions);
    _sessionId = id;
    return id;
  },

  endSession() {
    const sessions = readJson('sessions.json');
    const s = sessions.find(s => s.ended_at === null);
    if (s) s.ended_at = new Date().toISOString();
    writeJson('sessions.json', sessions);
  },

  getLastSession() {
    const sessions = readJson('sessions.json');
    return sessions.length ? sessions[sessions.length - 1] : null;
  },

  saveActivity(sessionId, appName, windowTitle, startedAt, endedAt) {
    const activities = readJson('activities.json');
    const id = nextId(activities);
    const durationSec = Math.round((new Date(endedAt) - new Date(startedAt)) / 1000);
    activities.push({ id, session_id: sessionId, app_name: appName, window_title: windowTitle, started_at: startedAt, ended_at: endedAt, duration_sec: durationSec, memo: null });
    writeJson('activities.json', activities);
    return id;
  },

  getTimeline(sessionId) {
    const activities = readJson('activities.json').filter(a => a.session_id === sessionId);
    activities.sort((a, b) => a.started_at.localeCompare(b.started_at));
    return mergeShortActivities(activities);
  },

  saveMemo(activityId, memo) {
    const activities = readJson('activities.json');
    const a = activities.find(a => a.id === activityId);
    if (a) a.memo = memo;
    writeJson('activities.json', activities);
    return { success: true };
  },

  saveCareerRecord(sessionId, content, rawTimeline) {
    const records = readJson('career_records.json');
    const id = nextId(records);
    const now = new Date().toISOString();
    records.push({ id, session_id: sessionId, date: now.split('T')[0], content, raw_timeline: rawTimeline, created_at: now });
    writeJson('career_records.json', records);
    return id;
  },

  getCareerRecords() {
    return readJson('career_records.json').reverse();
  },
};

function mergeShortActivities(activities) {
  if (!activities.length) return [];
  const THRESHOLD = 300;
  const result = [];
  let cur = { ...activities[0], merged_ids: [activities[0].id] };

  for (let i = 1; i < activities.length; i++) {
    const next = activities[i];
    if (cur.app_name === next.app_name || cur.duration_sec < THRESHOLD) {
      cur.ended_at = next.ended_at;
      cur.duration_sec = Math.round((new Date(cur.ended_at) - new Date(cur.started_at)) / 1000);
      cur.merged_ids.push(next.id);
      if ((next.window_title || '').length > (cur.window_title || '').length) {
        cur.window_title = next.window_title;
      }
    } else {
      result.push(cur);
      cur = { ...next, merged_ids: [next.id] };
    }
  }
  result.push(cur);
  return result;
}
