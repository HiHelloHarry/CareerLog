import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { db } from './database.js';

// Railway 배포 후 USE_LOCAL_SERVER = false, RAILWAY_URL을 실제 주소로 교체
const USE_LOCAL_SERVER = true;
const RAILWAY_URL      = 'https://careerlog-backend-production.up.railway.app';
const LOCAL_PORT       = 3759;
const BACKEND_URL      = USE_LOCAL_SERVER ? `http://localhost:${LOCAL_PORT}` : RAILWAY_URL;

// ── 수치 감지 ─────────────────────────────────────────────
const METRIC_PATTERNS = [
  /\d+[%％]/g,
  /\d+[만억천백]+/g,
  /\d{1,3}(,\d{3})+/g,
  /\d+\s*[xX배](\s|$)/g,
  /\d+\s*(명|건|회|개|일|주|달|년|배포|버전|페이지|단계|팀|시간)/g,
];
const EXCLUDE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}:\d{2}/,
  /^v\d+\.\d+/,
];

export function detectMetrics(text) {
  if (!text) return [];
  const found = [];
  for (const pattern of METRIC_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) found.push(...matches);
  }
  return [...new Set(found)].filter(m =>
    !EXCLUDE_PATTERNS.some(p => p.test(m.trim()))
  );
}

function readSettings() {
  try {
    const p = path.join(app.getPath('userData'), 'data', 'app_settings.json');
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}

async function callBackend(prompt) {
  const settings = readSettings();
  const headers = { 'Content-Type': 'application/json' };
  if (settings.device_id) headers['x-device-id'] = settings.device_id;
  if (settings.api_key)   headers['x-api-key']   = settings.api_key;

  const resp = await fetch(`${BACKEND_URL}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await resp.json();
  if (!data.ok) throw new Error(data.error || '서버 오류가 발생했습니다.');
  return data.content[0].text.trim();
}

// ── 작업 흐름(Flow) 감지 (P4: 기록 정확도 고도화) ──────────
// 개별 앱 전환을 의미 있는 "작업 단위"로 묶음
// 예: VS Code→Chrome(SO)→VS Code = 하나의 "코딩" 흐름
const SUPPORT_MAX_SEC = 300; // 5분 이하 이탈은 보조 활동으로 포함 (#4: 3분→5분 확대)

// 활동의 프로젝트 맥락 추출 — 프로젝트 > 디자인파일 > 문서 > 앱 순서
// #1 수정: file 단독 기준 제거 → 같은 프로젝트의 다른 파일이 쪼개지지 않음
function getFlowContext(act) {
  const p = act.parsed || {};
  if (p.project)    return `project:${p.project}`;
  if (p.designFile) return `design:${p.designFile}`;
  if (p.page)       return `doc:${p.page}`;
  // IDE/에디터는 앱 자체를 anchor로 (파일이 달라도 같은 코딩 흐름)
  const codeApps = new Set(['code', 'idea64', 'webstorm64', 'sublime_text']);
  if (codeApps.has((act.app_name || '').toLowerCase())) return `coding:${act.app_name}`;
  return `app:${act.app_name}`;
}

function detectFlows(activities) {
  if (!activities.length) return [{ anchor: null, label: '활동', activities, totalSec: 0 }];

  const flows = [];
  let cur = {
    anchor: getFlowContext(activities[0]),
    activities: [activities[0]],
    coreApp: activities[0].app_name,
    totalSec: activities[0].duration_sec || 0,
  };

  for (let i = 1; i < activities.length; i++) {
    const act = activities[i];
    const ctx = getFlowContext(act);
    const dur = act.duration_sec || 0;

    if (ctx === cur.anchor) {
      // 같은 맥락 — flow 계속
      cur.activities.push(act);
      cur.totalSec += dur;
    } else if (dur <= SUPPORT_MAX_SEC) {
      // 짧은 이탈 — 보조 활동으로 flow에 포함
      cur.activities.push({ ...act, _role: 'support' });
      cur.totalSec += dur;
    } else {
      // 맥락 전환 — flow 종료, 단 이전 flow와 같은 anchor면 재합류 (#1)
      const prevSameFlow = flows.findLast(f => f.anchor === ctx);
      if (prevSameFlow) {
        // 이전에 같은 맥락의 flow가 있었음 → 재합류
        prevSameFlow.activities.push(act);
        prevSameFlow.totalSec += dur;
      } else {
        flows.push(cur);
        cur = { anchor: ctx, activities: [act], coreApp: act.app_name, totalSec: dur };
        continue;
      }
      // cur은 유지 (다음 activity를 현재 flow로 계속 판단)
      // 단, 현재 flow의 anchor가 재합류 대상이면 cur도 갱신
      if (cur.anchor !== ctx) {
        flows.push(cur);
        cur = prevSameFlow; // prevSameFlow에 이미 push됨 → cur를 새로 시작
        // 다음 루프에서 새 activity를 받을 수 있도록 빈 cur 생성
        cur = { anchor: ctx, activities: [act], coreApp: act.app_name, totalSec: dur };
      }
    }
  }
  flows.push(cur);

  // 중복 제거 (재합류로 이미 flows에 들어간 것과 마지막 cur이 같을 수 있음)
  const seen = new Set();
  const unique = [];
  for (const f of flows) {
    const key = f.anchor + ':' + f.activities.length + ':' + f.totalSec;
    if (!seen.has(key)) { seen.add(key); unique.push(f); }
  }

  // flow에 라벨 생성 — 가장 오래 머문 활동 기준
  return unique.filter(f => f.activities.length > 0).map((f, i) => {
    // 라벨: 프로젝트명 우선, 없으면 가장 오래 머문 핵심 활동 기준
    const coreActs = f.activities.filter(a => !a._role);
    const longest = coreActs.sort((a, b) => (b.duration_sec || 0) - (a.duration_sec || 0))[0] || f.activities[0];
    const p = longest?.parsed || {};
    const label = p.project || p.designFile || p.page || p.pageTitle || p.file || f.coreApp || '작업';
    return { ...f, label, id: `flow_${i + 1}` };
  });
}

function fmtFlow(flow, fmtAct) {
  const core = flow.activities.filter(a => !a._role);
  const support = flow.activities.filter(a => a._role === 'support');
  let out = `📦 작업 흐름: "${flow.label}" (총 ${durStr(flow.totalSec)})\n`;
  out += core.map(a => `  [핵심]${fmtAct(a)}`).join('\n');
  if (support.length) {
    out += '\n' + support.map(a => `  [보조]${fmtAct(a)}`).join('\n');
  }
  return out;
}

export async function generateCareerRecord(sessionId, template = 'star') {
  const timeline = db.getTimeline(sessionId);
  if (!timeline.length) return { error: '기록된 활동이 없습니다.' };

  const session = db.getSession(sessionId);
  const projectCtx = session?.project ? `프로젝트/클라이언트: ${session.project}` : null;

  const settings = readSettings();
  const profileLines = [
    settings.job_role  && `직군: ${settings.job_role}`,
    settings.job_level && `직급/연차: ${settings.job_level}`,
    settings.skills    && `주요 기술스택: ${settings.skills}`,
  ].filter(Boolean);
  const profileCtx = profileLines.length ? `[사용자 프로필]\n${profileLines.join('\n')}` : null;

  const withMemo    = timeline.filter(a => a.memo);
  const withoutMemo = timeline.filter(a => !a.memo);

  const fmtActivity = (act) => {
    const dur      = durStr(act.duration_sec);
    const memo     = act.memo      ? `[메모: ${act.memo}]`           : '';
    const workType = act.work_type ? `[작업유형: ${act.work_type}]`   : '';
    // parsed 데이터가 있으면 구조화된 정보를, 없으면 기존 창 제목 사용
    const p = act.parsed || {};
    const parsedParts = [];
    if (p.meeting)    parsedParts.push(`회의: ${p.meeting}${p.meetingApp ? ' (' + p.meetingApp + ')' : ''}`);
    if (p.file)       parsedParts.push(`파일: ${p.file}`);
    if (p.project)    parsedParts.push(`프로젝트: ${p.project}`);
    if (p.pageTitle)  parsedParts.push(`페이지: ${p.pageTitle}`);
    if (p.url)        parsedParts.push(`URL: ${p.url}`);
    if (p.channel)    parsedParts.push(`채널: ${p.channel}`);
    if (p.designFile) parsedParts.push(`디자인: ${p.designFile}`);
    if (p.page)       parsedParts.push(`문서: ${p.page}`);
    if (p.chat)       parsedParts.push(`대화: ${p.chat}`);
    if (p.request)    parsedParts.push(`API: ${p.request}`);
    if (p.tool)       parsedParts.push(`도구: ${p.tool}`);
    // P3 + #6: 활동 수준 태그 (키보드+마우스 종합)
    // 디자인/드래그 등 마우스 중심 앱은 "조작 중"으로 표시
    const MOUSE_APPS = new Set(['figma', 'photoshop', 'illustrator', 'xd', 'sketch', 'paint']);
    const isMouseApp = MOUSE_APPS.has((act.app_name || '').toLowerCase());
    const inputTag = p.inputLevel === 'active' ? (isMouseApp ? ' (조작 중)' : ' (타이핑)')
      : p.inputLevel === 'light' ? ' (간헐적 입력)'
      : p.inputLevel === 'passive' ? ' (읽기/대기)' : '';
    const context = parsedParts.length > 0
      ? `[${parsedParts.join(', ')}]`
      : (act.window_title ? `(${act.window_title})` : '');
    return `  - ${act.app_name} ${context} ${dur}${inputTag}${workType ? ' ' + workType : ''}${memo ? ' ' + memo : ''}`;
  };

  // 작업 흐름 감지 → AI에 구조화된 입력 제공
  const flows = detectFlows(timeline);
  let timelineSection = '';

  if (flows.length > 1 || (flows.length === 1 && flows[0].activities.length > 1)) {
    // flow가 의미 있으면 flow 기반 포맷
    const totalSec = timeline.reduce((s, a) => s + (a.duration_sec || 0), 0);
    timelineSection += `[세션 개요] 총 ${durStr(totalSec)}, 작업 흐름 ${flows.length}개\n\n`;
    timelineSection += flows.map(f => fmtFlow(f, fmtActivity)).join('\n\n');
    // 메모가 있는 활동은 별도 강조
    if (withMemo.length) {
      timelineSection += `\n\n★ 사용자 메모:\n${withMemo.map(a => `  - ${a.app_name}: "${a.memo}"`).join('\n')}`;
    }
  } else {
    // 활동이 적으면 기존 flat 포맷 유지
    if (withMemo.length)    timelineSection += `★ 메모가 있는 핵심 활동:\n${withMemo.map(fmtActivity).join('\n')}\n\n`;
    if (withoutMemo.length) timelineSection += `기타 활동:\n${withoutMemo.map(fmtActivity).join('\n')}`;
  }

  const templateInstructions = {
    star:    'STAR 구조 (Situation → Task → Action → Result)',
    numbers: '수치/성과 중심 — 모든 항목에 숫자와 퍼센트를 포함하도록 최우선',
    process: '프로세스 중심 — 사용한 방법론, 단계별 접근, 의사결정 과정 강조',
    outcome: '결과 중심 — 비즈니스 임팩트와 최종 아웃컴에 집중',
  }[template] || 'STAR 구조';

  const prompt = `당신은 커리어 전문 AI입니다. 아래 업무 활동 기록을 분석하여 이력서용 경력 기록을 JSON으로 반환하세요.
${profileCtx ? `\n${profileCtx}` : ''}${projectCtx ? `\n프로젝트/클라이언트: ${session.project}` : ''}

[업무 기록]
${timelineSection}

[출력 형식 — 반드시 순수 JSON만 반환, 마크다운 코드블록 없이]
{
  "situation": "배경/상황 (1~2문장, 구체적)",
  "task": "맡은 역할과 목표 (1~2문장)",
  "action": "실제로 한 구체적 행동 (2~3문장, 앱명과 창 제목에서 추론)",
  "result": "성과/결과 (수치가 있다면 반드시 포함)",
  "skills": ["기술1", "기술2", "..."],
  "metrics_detected": ["감지된 수치1", "감지된 수치2"],
  "bullets": ["• 이력서용 불릿1", "• 불릿2", "• 불릿3"]
}

[작성 규칙]
- 템플릿: ${templateInstructions}
- 절대 금지: "다양한 업무", "효율적으로", "관련 작업" 같은 모호한 표현
- 작업 흐름(📦)이 있으면, 각 흐름을 하나의 업무 단위로 이해하고 [핵심] 활동 중심으로 서술. [보조] 활동은 리서치/소통 맥락으로 활용
- 앱 이름(Figma, VS Code 등)과 파싱된 메타데이터(파일명, 프로젝트명, 채널명 등)에서 실제 작업 내용을 적극 추론
- 수치는 창 제목/메모에서 직접 추출하거나 체류 시간을 수치로 활용
- situation/task/action/result 각 필드를 한국어로 작성
- bullets는 situation+action+result를 압축한 이력서 문장 3~5개${projectCtx ? '\n- 프로젝트/클라이언트명을 자연스럽게 포함' : ''}${profileCtx ? '\n- 사용자 직군과 기술스택에 맞는 전문 용어와 관점으로 작성' : ''}
- metrics_detected는 원문에서 발견한 수치 패턴만 (없으면 빈 배열)`;

  try {
    const raw = await callBackend(prompt);

    let starData = null;
    try {
      const cleaned = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '');
      starData = JSON.parse(cleaned);
    } catch {
      const recId = db.saveCareerRecord(sessionId, raw, timeline, null, template);
      return { success: true, content: raw, star: null, recordId: recId };
    }

    const content = (starData.bullets || []).join('\n') ||
      [starData.situation, starData.action, starData.result].filter(Boolean).join('\n');

    const extraMetrics = detectMetrics(
      [starData.situation, starData.task, starData.action, starData.result].join(' ')
    );
    starData.metrics_detected = [
      ...new Set([...(starData.metrics_detected || []), ...extraMetrics])
    ];

    const recId = db.saveCareerRecord(sessionId, content, timeline, starData, template);
    return { success: true, content, star: starData, recordId: recId };

  } catch (err) {
    return { error: err.message };
  }
}

function durStr(sec) {
  if (!sec) return '0분';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}분`;
}
