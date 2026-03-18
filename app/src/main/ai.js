const Anthropic = require('@anthropic-ai/sdk')
const { db } = require('./database')
const Store = require('electron-store')

const store = new Store()

function getClient() {
  const apiKey = store.get('apiKey') || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.')
  return new Anthropic({ apiKey })
}

async function generateCareerRecord(sessionId) {
  const timeline = db.getTimeline(sessionId)

  if (!timeline.length) {
    return { error: '기록된 활동이 없습니다.' }
  }

  // 타임라인 텍스트 생성
  const timelineText = timeline.map(act => {
    const start = formatTime(act.started_at)
    const duration = formatDuration(act.duration_sec)
    const memo = act.memo ? ` — ${act.memo}` : ''
    return `${start}  ${act.app_name} | ${act.window_title || '(제목 없음)'}  (${duration})${memo}`
  }).join('\n')

  const prompt = `다음은 오늘 업무 타임라인입니다. 각 활동과 사용자가 남긴 메모를 분석해서 경력 기록으로 변환해주세요.

[타임라인]
${timelineText}

출력 형식:
- 불렛 포인트로 2~5개 핵심 업무 기록
- 각 항목: "무엇을 했는지 + 어떤 결과/산출물이 있었는지" (STAR 구조 지향)
- 수치가 있으면 반드시 포함 (예: "3개 화면 디자인 완료", "15명 참석 미팅 진행")
- 이력서/경력기술서에 바로 쓸 수 있는 수준으로 작성
- 한국어로 작성

예시:
• Figma를 활용해 온보딩 UX 3개 화면 신규 디자인 및 팀 리뷰 반영
• 주간 팀 미팅(15명) 진행 — 2분기 기획 방향 합의 및 액션 아이템 5건 도출`

  try {
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0].text

    // DB에 저장
    const recordId = db.saveCareerRecord(sessionId, content, timeline)

    return { success: true, content, recordId }
  } catch (err) {
    console.error('[AI] 경력 기록 생성 오류:', err.message)
    return { error: err.message }
  }
}

function formatTime(isoString) {
  const d = new Date(isoString)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatDuration(sec) {
  if (!sec) return '0분'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}분`
}

module.exports = { generateCareerRecord }
