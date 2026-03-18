import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json({ limit: '100kb' }));

const FREE_LIMIT = 20;
// Map<deviceId, { count: number, month: string }>
const usageStore = new Map();

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getUsage(deviceId) {
  const month = currentMonth();
  const rec = usageStore.get(deviceId) || { count: 0, month };
  if (rec.month !== month) { rec.count = 0; rec.month = month; }
  return rec;
}

// ── GET /health ──────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true }));

// ── GET /credits ─────────────────────────────────────────
app.get('/credits', (req, res) => {
  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return res.status(400).json({ ok: false, error: 'Missing x-device-id' });
  const rec = getUsage(deviceId);
  const remaining = Math.max(0, FREE_LIMIT - rec.count);
  res.json({ ok: true, remaining, limit: FREE_LIMIT, used: rec.count });
});

// ── POST /generate ────────────────────────────────────────
app.post('/generate', async (req, res) => {
  const userApiKey = req.headers['x-api-key'];
  const deviceId   = req.headers['x-device-id'];
  const { messages, model = 'claude-opus-4-6', max_tokens = 1500 } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ ok: false, error: 'messages is required' });
  }

  // ── 자체 API 키 경로 (무제한) ──────────────────────────
  if (userApiKey) {
    try {
      const client = new Anthropic({ apiKey: userApiKey });
      const response = await client.messages.create({ model, max_tokens, messages });
      return res.json({ ok: true, content: response.content, remaining: null });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  }

  // ── 무료 크레딧 경로 ───────────────────────────────────
  if (!deviceId) {
    return res.status(400).json({ ok: false, error: 'x-device-id 헤더가 필요합니다.' });
  }

  const rec = getUsage(deviceId);
  if (rec.count >= FREE_LIMIT) {
    return res.status(429).json({
      ok: false,
      error: `이번 달 무료 사용량(${FREE_LIMIT}회)을 모두 사용했습니다. 설정에서 API 키를 등록하면 무제한으로 사용할 수 있습니다.`,
      remaining: 0,
    });
  }

  // 호출 전 카운트 증가 (중복 요청 방지)
  rec.count++;
  usageStore.set(deviceId, rec);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    rec.count--;
    return res.status(500).json({ ok: false, error: '서버 설정 오류: API 키가 없습니다.' });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({ model, max_tokens, messages });
    const remaining = Math.max(0, FREE_LIMIT - rec.count);
    return res.json({ ok: true, content: response.content, remaining });
  } catch (err) {
    // API 실패 시 카운트 롤백
    rec.count--;
    usageStore.set(deviceId, rec);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CareerLog API server running on port ${PORT}`));
