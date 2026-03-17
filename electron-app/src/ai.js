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

  const timelineText = timeline.map(act => {
    const start = fmt(act.started_at);
    const dur = durStr(act.duration_sec);
    const memo = act.memo ? ` — ${act.memo}` : '';
    return `${start}  ${act.app_name} | ${act.window_title || '(제목 없음)'}  (${dur})${memo}`;
  }).join('\n');

  const prompt = `다음은 오늘 업무 타임라인입니다. 각 활동과 메모를 분석해서 경력 기록으로 변환해주세요.

[타임라인]
${timelineText}

출력 형식:
- 불렛 포인트 2~5개 핵심 업무 기록
- 각 항목: "무엇을 했는지 + 결과/산출물" (STAR 구조 지향)
- 수치 포함 (예: "3개 화면 디자인", "15명 참석 미팅")
- 이력서/경력기술서에 바로 쓸 수 있는 수준
- 한국어로 작성

예시:
• Figma로 온보딩 UX 3개 화면 신규 디자인 및 팀 리뷰 반영
• 주간 팀 미팅(15명) — 2분기 기획 방향 합의 및 액션 아이템 5건 도출`;

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
