import Anthropic from '@anthropic-ai/sdk';
import Store from 'electron-store';
import { db } from './database.js';

function getClient() {
  const store = new Store();
  const apiKey = store.get('apiKey') || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('API 키가 설정되지 않았습니다. 설정 탭에서 입력해주세요.');
  return new Anthropic({ apiKey });
}

export async function generateCareerRecord(sessionId) {
  const timeline = db.getTimeline(sessionId);
  if (!timeline.length) return { error: '기록된 활동이 없습니다.' };

  const session = db.getSession(sessionId);
  const projectCtx = session?.project ? `프로젝트/클라이언트: ${session.project}` : null;

  // 메모가 있는 활동과 없는 활동을 구분
  const withMemo = timeline.filter(a => a.memo);
  const withoutMemo = timeline.filter(a => !a.memo);

  const fmtActivity = (act) => {
    const dur = durStr(act.duration_sec);
    const memo = act.memo ? `[메모: ${act.memo}]` : '';
    const title = act.window_title ? `(${act.window_title})` : '';
    return `  - ${act.app_name} ${title} ${dur}${memo ? ' ' + memo : ''}`;
  };

  let timelineSection = '';
  if (withMemo.length) {
    timelineSection += `★ 메모가 있는 핵심 활동 (이것을 우선 활용하세요):\n${withMemo.map(fmtActivity).join('\n')}\n\n`;
  }
  if (withoutMemo.length) {
    timelineSection += `기타 활동 (보조 컨텍스트):\n${withoutMemo.map(fmtActivity).join('\n')}`;
  }

  const prompt = `당신은 커리어 코치입니다. 아래 업무 활동 기록을 분석해서 이력서/경력기술서에 바로 쓸 수 있는 **구체적인** 경력 기록으로 변환해주세요.
${projectCtx ? `\n${projectCtx}\n` : ''}
[오늘의 업무 기록]
${timelineSection}

**엄격한 작성 규칙:**
1. ★메모가 있는 활동은 반드시 기록에 포함 — 메모 내용이 핵심 업무입니다
2. 앱 이름(Figma, VS Code 등)과 창 제목에서 실제 작업 내용을 유추하세요
3. 절대 금지: "다양한 업무 수행", "효율적으로 처리", "관련 작업" 같은 모호한 표현
4. 수치는 타임라인에서 직접 추출 (활동 시간, 창 수, 파일 수 등)
5. 각 항목은 "동사 + 구체적 대상 + 결과/산출물" 구조로
${projectCtx ? '6. 프로젝트/클라이언트명을 자연스럽게 포함' : ''}

출력: 불렛 포인트 3~5개, 한국어, 접두어(•) 사용, 다른 설명 없이 기록만 출력

나쁜 예: • 개발 관련 업무 수행
좋은 예: • VS Code에서 로그인 API 인증 로직 구현 (약 2시간, 토큰 갱신 처리 포함)`;

  try {
    const client = getClient();
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0].text;
    db.saveCareerRecord(sessionId, content, timeline);
    return { success: true, content };
  } catch (err) {
    return { error: err.message };
  }
}

function fmt(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function durStr(sec) {
  if (!sec) return '0분';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}분`;
}
