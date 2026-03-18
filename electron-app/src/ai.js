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
    const dur   = durStr(act.duration_sec);
    const memo  = act.memo ? `[메모: ${act.memo}]` : '';
    const title = act.window_title ? `(${act.window_title})` : '';
    return `  - ${act.app_name} ${title} ${dur}${memo ? ' ' + memo : ''}`;
  };

  let timelineSection = '';
  if (withMemo.length)    timelineSection += `★ 메모가 있는 핵심 활동:\n${withMemo.map(fmtActivity).join('\n')}\n\n`;
  if (withoutMemo.length) timelineSection += `기타 활동:\n${withoutMemo.map(fmtActivity).join('\n')}`;

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
- 앱 이름(Figma, VS Code 등)과 창 제목에서 실제 작업 내용을 적극 추론
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
