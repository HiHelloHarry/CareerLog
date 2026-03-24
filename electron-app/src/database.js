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

function nextId(arr) {
  return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1;
}

export const db = {
  startSession(project = '') {
    const sessions = readJson('sessions.json');
    const id = nextId(sessions);
    const now = new Date().toISOString();
    sessions.push({ id, started_at: now, ended_at: null, date: now.split('T')[0], project: project.trim() });
    writeJson('sessions.json', sessions);
    return id;
  },

  getSession(sessionId) {
    return readJson('sessions.json').find(s => s.id === sessionId) || null;
  },

  endSession(sessionId) {
    const sessions = readJson('sessions.json');
    // sessionId 명시 시 해당 세션 종료, 아니면 첫 번째 미종료 세션 (fallback)
    const s = sessionId
      ? sessions.find(s => s.id === sessionId && s.ended_at === null)
      : sessions.find(s => s.ended_at === null);
    if (s) s.ended_at = new Date().toISOString();
    writeJson('sessions.json', sessions);
  },

  getLastSession() {
    const sessions = readJson('sessions.json');
    return sessions.length ? sessions[sessions.length - 1] : null;
  },

  // 완료된 세션 목록 (최신순, 최대 30개)
  getSessions() {
    const sessions = readJson('sessions.json');
    const records  = readJson('career_records.json');
    const recordedSessionIds = new Set(records.map(r => r.session_id));
    return sessions
      .filter(s => s.ended_at)
      .reverse()
      .slice(0, 30)
      .map(s => ({ ...s, has_career_record: recordedSessionIds.has(s.id) }));
  },

  saveActivity(sessionId, appName, windowTitle, startedAt, endedAt, parsed = null) {
    const activities = readJson('activities.json');
    const id = nextId(activities);
    const durationSec = Math.round((new Date(endedAt) - new Date(startedAt)) / 1000);
    const entry = { id, session_id: sessionId, app_name: appName, window_title: windowTitle, started_at: startedAt, ended_at: endedAt, duration_sec: durationSec, memo: null };
    if (parsed && Object.keys(parsed).length > 0) entry.parsed = parsed;
    activities.push(entry);
    writeJson('activities.json', activities);
    return id;
  },

  getTimeline(sessionId) {
    // blacklist 필터링
    const settings = readAppSettings();
    const blacklist = (settings.blacklist || []).map(a => a.toLowerCase());
    const activities = readJson('activities.json')
      .filter(a => a.session_id === sessionId)
      .filter(a => !blacklist.includes((a.app_name || '').toLowerCase()))
      .filter(a => (a.app_name || '').toLowerCase() !== 'careerlog');
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

  // 태그(업무 설명) 저장 — memo 필드 활용
  saveTag(activityId, tag) {
    const activities = readJson('activities.json');
    const a = activities.find(a => a.id === activityId);
    if (a) a.memo = tag;
    writeJson('activities.json', activities);
    return { success: true };
  },

  // 활동 기록 삭제
  deleteActivity(activityId) {
    const activities = readJson('activities.json');
    writeJson('activities.json', activities.filter(a => a.id !== activityId));
    return { success: true };
  },

  // 작업 유형 저장 — work_type 필드
  saveWorkType(activityId, workType) {
    const activities = readJson('activities.json');
    const a = activities.find(a => a.id === activityId);
    if (a) a.work_type = workType;
    writeJson('activities.json', activities);
    return { success: true };
  },

  // idle 복원: 마지막 활동의 ended_at을 idle 시작 직전으로 조정
  extendActivity(activityId, newEndedAt) {
    const activities = readJson('activities.json');
    const a = activities.find(a => a.id === activityId);
    if (a) {
      a.ended_at     = newEndedAt;
      a.duration_sec = Math.round((new Date(newEndedAt) - new Date(a.started_at)) / 1000);
    }
    writeJson('activities.json', activities);
  },

  saveCareerRecord(sessionId, content, rawTimeline, starData = null, template = 'star') {
    const records = readJson('career_records.json');
    const id = nextId(records);
    const now = new Date().toISOString();
    records.push({
      id,
      session_id: sessionId,
      date: now.split('T')[0],
      content,
      star: starData,
      template,
      raw_timeline: rawTimeline,
      created_at: now,
    });
    writeJson('career_records.json', records);
    return id;
  },

  getCareerRecords() {
    const records  = readJson('career_records.json').reverse();
    const sessions = readJson('sessions.json');
    const sessionMap = new Map(sessions.map(s => [s.id, s]));
    return records.map(r => ({
      ...r,
      project: sessionMap.get(r.session_id)?.project || '',
    }));
  },

  deleteCareerRecord(recordId) {
    const records = readJson('career_records.json');
    writeJson('career_records.json', records.filter(r => r.id !== recordId));
    return { success: true };
  },

  updateCareerRecord(recordId, newContent, starData) {
    const records = readJson('career_records.json');
    const r = records.find(r => r.id === recordId);
    if (r) {
      r.content = newContent;
      if (starData !== undefined) r.star = starData;
      r.updated_at = new Date().toISOString();
    }
    writeJson('career_records.json', records);
    return { success: true };
  },

  deleteAllData() {
    writeJson('sessions.json', []);
    writeJson('activities.json', []);
    writeJson('career_records.json', []);
  },

  // 샘플 데이터 삽입 (온보딩 체험용)
  insertSampleData() {
    const sessions   = readJson('sessions.json');
    const activities = readJson('activities.json');
    const records    = readJson('career_records.json');

    // 어제 날짜 기준
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const base = (h, m = 0) => {
      const d = new Date(yesterday);
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };

    const sessionId = nextId(sessions);
    sessions.push({
      id: sessionId,
      started_at: base(9),
      ended_at:   base(17, 30),
      date:       yesterday.toISOString().split('T')[0],
      project:    '샘플 프로젝트',
      is_sample:  true,
    });

    const rawActs = [
      { app: 'Visual Studio Code', title: 'auth.ts — CareerLog',         h: 9,  m: 0,  dur: 65 },
      { app: 'Chrome',             title: 'OAuth 2.0 flow - MDN Web Docs', h: 10, m: 5,  dur: 20, memo: '소셜 로그인 플로우 리서치' },
      { app: 'Slack',              title: '# dev-team',                   h: 10, m: 25, dur: 15, memo: '로그인 이슈 팀 공유' },
      { app: 'Visual Studio Code', title: 'LoginButton.tsx — CareerLog',  h: 10, m: 40, dur: 50 },
      { app: 'Figma',              title: '로그인 화면 v3 — CareerLog',    h: 11, m: 30, dur: 40, memo: '로그인 UI 디자인 확인' },
      { app: 'Visual Studio Code', title: 'auth.test.ts — CareerLog',     h: 12, m: 10, dur: 30 },
      { app: 'Terminal',           title: 'npm test',                     h: 12, m: 40, dur: 20 },
      { app: 'Slack',              title: '# product',                    h: 13, m: 0,  dur: 10 },
      { app: 'Notion',             title: '로그인 기능 스펙 문서',          h: 13, m: 10, dur: 25, memo: '스펙 문서 업데이트' },
      { app: 'Visual Studio Code', title: 'userStore.ts — CareerLog',     h: 13, m: 35, dur: 55 },
      { app: 'Chrome',             title: 'Google Sign-In for Web — docs', h: 14, m: 30, dur: 15 },
      { app: 'Visual Studio Code', title: 'App.tsx — CareerLog',          h: 14, m: 45, dur: 60 },
      { app: 'Terminal',           title: 'git commit -m "feat: auth"',   h: 15, m: 45, dur: 5  },
      { app: 'Chrome',             title: 'GitHub PR #42 — CareerLog',    h: 15, m: 50, dur: 20, memo: 'PR 리뷰 요청' },
      { app: 'Slack',              title: '# code-review',               h: 16, m: 10, dur: 15 },
      { app: 'Visual Studio Code', title: 'auth.ts — 리뷰 반영',          h: 16, m: 25, dur: 45 },
      { app: 'Terminal',           title: 'git push origin feature/auth', h: 17, m: 10, dur: 5  },
      { app: 'Notion',             title: '작업 완료 체크리스트',           h: 17, m: 15, dur: 15, memo: '오늘 작업 정리 완료' },
    ];

    let actId = nextId(activities);
    const newActs = rawActs.map(r => {
      const startedAt = base(r.h, r.m);
      const endedAt   = new Date(new Date(startedAt).getTime() + r.dur * 60000).toISOString();
      return {
        id:           actId++,
        session_id:   sessionId,
        app_name:     r.app,
        window_title: r.title,
        started_at:   startedAt,
        ended_at:     endedAt,
        duration_sec: r.dur * 60,
        memo:         r.memo || null,
        is_sample:    true,
      };
    });
    activities.push(...newActs);

    const recId = nextId(records);
    records.push({
      id:          recId,
      session_id:  sessionId,
      date:        yesterday.toISOString().split('T')[0],
      content:     '• Google/카카오 소셜 로그인 기능 신규 개발 (React + TypeScript)\n• OAuth 2.0 플로우 설계 및 auth 모듈 구현, 단위 테스트 작성\n• 로그인 UI 컴포넌트 개발 및 Figma 디자인 반영\n• PR 코드 리뷰 반영 후 feature 브랜치 병합 완료',
      star: {
        situation: '사용자 인증 기능이 없어 이탈률이 높은 상황에서 소셜 로그인 도입을 담당하게 됨',
        task:      'Google/카카오 OAuth 2.0 기반 소셜 로그인 기능을 1일 내 완성 및 PR 제출',
        action:    'MDN 문서와 Google Sign-In SDK를 참고해 auth.ts 모듈 설계 후 React 컴포넌트와 연동. 단위 테스트 작성 후 Figma 디자인을 LoginButton.tsx에 구현하고 Notion 스펙 문서 업데이트',
        result:    'PR #42 코드 리뷰 1회 반영 후 feature/auth 브랜치 병합 완료. 소셜 로그인 전환율 +23% 기대',
        skills:    ['React', 'TypeScript', 'OAuth 2.0', 'Google Sign-In', 'Jest'],
        metrics_detected: ['+23%'],
        bullets: [
          '• Google/카카오 OAuth 2.0 소셜 로그인 기능 신규 개발 (React + TypeScript)',
          '• auth.ts 모듈 설계 및 단위 테스트 작성, PR 코드 리뷰 1회 반영 후 병합',
          '• Figma 디자인 기반 LoginButton 컴포넌트 구현 및 Notion 스펙 문서 업데이트',
          '• 소셜 로그인 전환율 +23% 개선 기대 효과',
        ],
      },
      template:    'star',
      raw_timeline: newActs,
      created_at:  new Date().toISOString(),
      is_sample:   true,
    });

    writeJson('sessions.json',       sessions);
    writeJson('activities.json',     activities);
    writeJson('career_records.json', records);
    return { sessionId, recordId: recId };
  },

  // ── Dashboard Stats ─────────────────────────────────────
  getDashboardStats() {
    const sessions   = readJson('sessions.json');
    const activities = readJson('activities.json');
    const records    = readJson('career_records.json');
    const settings   = readAppSettings();
    const blacklist  = (settings.blacklist || []).map(a => a.toLowerCase());
    const SYSTEM     = [
      'careerlog', 'explorer', 'svchost', 'dwm', 'taskhost', 'searchui', 'cortana',
      'applicationframehost', 'shellexperiencehost', 'startmenuexperiencehost',
      'searchhost', 'lockapp', 'textinputhost', 'winlogon', 'runtimebroker',
      'taskmgr', 'systemsettings', 'snippingtool', 'screensketch', 'lockscreenhost',
      'fontdrvhost', 'ctfmon', 'sihost', 'taskhostw', 'dllhost',
    ];

    const isSystemApp = (name) => {
      const n = (name || '').toLowerCase();
      return !n || SYSTEM.includes(n) || blacklist.includes(n);
    };

    // 총 업무 일수 (활동 기록 있는 고유 날짜)
    const workDaySet = new Set(activities.map(a => a.started_at?.split('T')[0]).filter(Boolean));
    const totalWorkDays = workDaySet.size;

    // 총 추적 시간
    const totalSeconds = sessions.filter(s => s.ended_at).reduce((acc, s) => {
      const dur = new Date(s.ended_at) - new Date(s.started_at);
      return acc + (dur > 0 ? dur / 1000 : 0);
    }, 0);
    const totalHours = Math.round(totalSeconds / 3600 * 10) / 10;

    // 다룬 앱 수
    const uniqueApps = new Set(activities.map(a => a.app_name).filter(a => !isSystemApp(a)));
    const totalUniqueApps = uniqueApps.size;

    // 총 경력 기록 수
    const totalRecords = records.length;

    // 이번 주 날짜 배열 (월~일, 한국 주 기준)
    const now = new Date();
    const dow = now.getDay(); // 0=일
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });

    // 요일별 시간 (이번 주)
    const weeklyHours = weekDates.map(date => {
      const secs = activities
        .filter(a => a.started_at?.startsWith(date))
        .reduce((acc, a) => acc + (a.duration_sec || 0), 0);
      return { date, hours: Math.round(secs / 3600 * 10) / 10 };
    });
    const weekTotalHours = Math.round(weeklyHours.reduce((acc, d) => acc + d.hours, 0) * 10) / 10;

    // 이번 주 가장 많이 쓴 앱
    const weekAppTime = {};
    activities.filter(a => weekDates.includes(a.started_at?.split('T')[0]) && !isSystemApp(a.app_name))
      .forEach(a => { weekAppTime[a.app_name] = (weekAppTime[a.app_name] || 0) + (a.duration_sec || 0); });
    const topWeekEntry = Object.entries(weekAppTime).sort((a, b) => b[1] - a[1])[0];
    const topWeekApp = topWeekEntry ? { name: topWeekEntry[0], hours: Math.round(topWeekEntry[1] / 3600 * 10) / 10 } : null;

    // ── 스트릭 (활동 기록 기준 연속 일수) ──────────────────
    const activityDateSet = new Set(activities.map(a => a.started_at?.split('T')[0]).filter(Boolean));
    let streak = 0;
    {
      const checkDate = new Date(now);
      // 오늘 기록 없으면 어제부터 체크 (출근 직후 streak 안 깨지도록)
      if (!activityDateSet.has(todayDate)) checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const d = checkDate.toISOString().split('T')[0];
        if (!activityDateSet.has(d)) break;
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // ── 지난주 시간 (비교용) ───────────────────────────────
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);
    const lastWeekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lastMonday);
      d.setDate(lastMonday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
    const lastWeekHours = Math.round(
      activities.filter(a => lastWeekDates.includes(a.started_at?.split('T')[0]))
        .reduce((acc, a) => acc + (a.duration_sec || 0), 0) / 3600 * 10
    ) / 10;

    // ── 오늘의 인사이트 ────────────────────────────────────
    let insight = null;
    const todayActs = activities.filter(a => a.started_at?.startsWith(todayDate));
    const todayHours = Math.round(todayActs.reduce((s, a) => s + (a.duration_sec || 0), 0) / 3600 * 10) / 10;

    if (todayActs.length > 0) {
      // 오늘 피크 시간대
      const hourMap = {};
      todayActs.forEach(a => {
        const h = new Date(a.started_at).getHours();
        hourMap[h] = (hourMap[h] || 0) + (a.duration_sec || 0);
      });
      const peakEntry = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0];
      if (peakEntry) {
        const h = parseInt(peakEntry[0]);
        const ampm = h < 12 ? '오전' : '오후';
        const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
        insight = {
          icon: '⚡',
          text: `${ampm} ${display}시가 오늘 최고 집중 시간이에요`,
          sub: `오늘 ${todayHours}시간 기록 중`,
        };
      }
    } else if (weekTotalHours > 0) {
      if (lastWeekHours > 0) {
        const diff = Math.round((weekTotalHours - lastWeekHours) * 10) / 10;
        if (diff > 0.1) {
          insight = { icon: '📈', text: `지난주보다 ${diff}시간 더 일하고 있어요`, sub: `이번 주 ${weekTotalHours}h · 지난주 ${lastWeekHours}h` };
        } else if (diff < -0.1) {
          insight = { icon: '😌', text: `이번 주 조금 여유롭게 일하고 있어요`, sub: `이번 주 ${weekTotalHours}h · 지난주 ${lastWeekHours}h` };
        } else {
          insight = { icon: '💪', text: `지난주와 비슷한 페이스로 일하고 있어요`, sub: `이번 주 ${weekTotalHours}h` };
        }
      } else {
        insight = { icon: '💪', text: `이번 주 ${weekTotalHours}시간 기록 중이에요`, sub: '기록이 쌓일수록 더 많이 보여요' };
      }
    }

    // 히트맵: 최근 84일
    const heatmap = Array.from({ length: 84 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (83 - i));
      const date = d.toISOString().split('T')[0];
      const secs = activities.filter(a => a.started_at?.startsWith(date)).reduce((acc, a) => acc + (a.duration_sec || 0), 0);
      return { date, hours: Math.round(secs / 3600 * 10) / 10 };
    });

    // 최근 경력기록 2개
    const recentRecords = [...records].reverse().slice(0, 2).map(r => {
      const s = sessions.find(s => s.id === r.session_id);
      return {
        id: r.id,
        created_at: r.created_at,
        date: r.date,
        project: s?.project || '',
        firstBullet: r.star?.bullets?.[0] || r.content?.split('\n')[0] || '',
      };
    });

    // 앱 TOP 3 (이번 주 / 이번 달 / 전체)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const appBuckets = { week: {}, month: {}, all: {} };
    activities.filter(a => !isSystemApp(a.app_name)).forEach(a => {
      const date = a.started_at?.split('T')[0] || '';
      const dur = a.duration_sec || 0;
      appBuckets.all[a.app_name]   = (appBuckets.all[a.app_name]   || 0) + dur;
      if (date >= monthStart)   appBuckets.month[a.app_name] = (appBuckets.month[a.app_name] || 0) + dur;
      if (weekDates.includes(date)) appBuckets.week[a.app_name]  = (appBuckets.week[a.app_name]  || 0) + dur;
    });
    const toTop3 = obj => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([name, secs]) => ({ name, hours: Math.round(secs / 3600 * 10) / 10 }));

    return {
      totalWorkDays, totalHours, totalRecords, totalUniqueApps,
      weeklyHours, weekTotalHours, topWeekApp, weekDates,
      heatmap, recentRecords,
      topApps: { week: toTop3(appBuckets.week), month: toTop3(appBuckets.month), all: toTop3(appBuckets.all) },
      todayDate: now.toISOString().split('T')[0], streak, insight,
    };
  },

  // ── Streak ──────────────────────────────────────────────
  getStreak() {
    const records = readJson('career_records.json');
    const sessions = readJson('sessions.json');

    // 기록이 있는 날짜들
    const activeDates = new Set([
      ...records.map(r => r.date),
      ...sessions.filter(s => s.ended_at).map(s => s.date),
    ]);

    const sortedDates = [...activeDates].sort().reverse();
    if (!sortedDates.length) return { current: 0, longest: 0, dates: [] };

    // 최근 7일 dots용
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last7.push({ date: dateStr, done: activeDates.has(dateStr) });
    }

    // 현재 연속 streak 계산
    let current = 0;
    const today = new Date().toISOString().split('T')[0];
    let check = today;
    while (activeDates.has(check)) {
      current++;
      const d = new Date(check);
      d.setDate(d.getDate() - 1);
      check = d.toISOString().split('T')[0];
    }
    // 어제부터 시작하는 streak도 현재 streak으로 인정
    if (current === 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      check = yesterday.toISOString().split('T')[0];
      while (activeDates.has(check)) {
        current++;
        const d = new Date(check);
        d.setDate(d.getDate() - 1);
        check = d.toISOString().split('T')[0];
      }
    }

    return { current, dates: last7 };
  },

  // ── Export / Import ────────────────────────────────────
  exportAll() {
    return {
      sessions: readJson('sessions.json'),
      activities: readJson('activities.json'),
      career_records: readJson('career_records.json'),
    };
  },

  importAll(data) {
    if (data.sessions) {
      const existing = readJson('sessions.json');
      const merged = mergById(existing, data.sessions);
      writeJson('sessions.json', merged);
    }
    if (data.activities) {
      const existing = readJson('activities.json');
      const merged = mergById(existing, data.activities);
      writeJson('activities.json', merged);
    }
    if (data.career_records) {
      const existing = readJson('career_records.json');
      const merged = mergById(existing, data.career_records);
      writeJson('career_records.json', merged);
    }
  },
};

function mergById(existing, incoming) {
  const map = new Map(existing.map(x => [x.id, x]));
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()].sort((a, b) => a.id - b.id);
}

// app_settings.json 읽기 (DB 레이어에서도 blacklist 참조 필요)
function readAppSettings() {
  try {
    const p = path.join(getDataDir(), 'app_settings.json');
    if (!fs.existsSync(p)) return { blacklist: [] };
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { blacklist: [] };
  }
}

function mergeShortActivities(activities) {
  if (!activities.length) return [];
  const THRESHOLD = 300; // 5분 미만 활동 병합
  const result = [];
  let cur = { ...activities[0], merged_ids: [activities[0].id] };

  for (let i = 1; i < activities.length; i++) {
    const next = activities[i];
    // #3 수정: 같은 앱일 때만 병합. 앱이 다르면 짧아도 병합하지 않음 (가비지 방지)
    // 같은 앱의 연속 사용: 항상 병합 (탭 전환 등)
    // 같은 앱 + 짧은 현재 활동: 병합 (잠깐 스쳐간 것)
    const sameApp = cur.app_name === next.app_name;
    if (sameApp) {
      cur.ended_at = next.ended_at;
      cur.duration_sec = Math.round((new Date(cur.ended_at) - new Date(cur.started_at)) / 1000);
      cur.merged_ids.push(next.id);
      if ((next.window_title || '').length > (cur.window_title || '').length) {
        cur.window_title = next.window_title;
      }
      // parsed 병합: 더 풍부한 쪽 유지
      if (next.parsed && (!cur.parsed || Object.keys(next.parsed).length > Object.keys(cur.parsed || {}).length)) {
        cur.parsed = next.parsed;
      }
    } else if (cur.duration_sec < THRESHOLD && next.app_name === (result[result.length - 1]?.app_name)) {
      // 짧은 현재 활동이 이전과 다음 사이에 끼인 경우 → 이전 것에 흡수
      // (예: VS Code 30분 → Chrome 10초 → VS Code → Chrome은 이전 VS Code에 흡수)
      result[result.length - 1].ended_at = cur.ended_at;
      result[result.length - 1].duration_sec = Math.round(
        (new Date(cur.ended_at) - new Date(result[result.length - 1].started_at)) / 1000
      );
      result[result.length - 1].merged_ids.push(...cur.merged_ids);
      cur = { ...next, merged_ids: [next.id] };
    } else {
      result.push(cur);
      cur = { ...next, merged_ids: [next.id] };
    }
  }
  result.push(cur);
  return result;
}
