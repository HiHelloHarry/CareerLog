/**
 * CareerLog 로컬 내장 서버 — Node.js 내장 http 모듈만 사용 (외부 의존성 없음)
 */
import http from 'node:http';
import { app as electronApp } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export const LOCAL_PORT = 3759;
export const LOCAL_URL  = `http://localhost:${LOCAL_PORT}`;

const FREE_LIMIT = 20;
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

function readApiKey() {
  try {
    const p = path.join(electronApp.getPath('userData'), 'data', 'app_settings.json');
    if (!fs.existsSync(p)) return '';
    return JSON.parse(fs.readFileSync(p, 'utf8')).api_key || '';
  } catch { return ''; }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
  });
  res.end(json);
}

async function handleGenerate(req, res) {
  const userApiKey = req.headers['x-api-key'];
  const deviceId   = req.headers['x-device-id'];

  let body;
  try { body = await readBody(req); }
  catch { return send(res, 400, { ok: false, error: 'Invalid request body' }); }

  const { messages, model = 'claude-opus-4-6', max_tokens = 1500 } = body;
  if (!messages?.length) return send(res, 400, { ok: false, error: 'messages is required' });

  const apiKey = userApiKey || readApiKey();
  if (!apiKey) {
    return send(res, 401, {
      ok: false,
      error: 'API 키가 없습니다. 설정에서 Anthropic API 키를 등록해주세요.',
    });
  }

  // rate limit (자체 키 사용 시 생략)
  let rec = null;
  if (!userApiKey && deviceId) {
    rec = getUsage(deviceId);
    if (rec.count >= FREE_LIMIT) {
      return send(res, 429, {
        ok: false,
        error: `이번 달 무료 사용량(${FREE_LIMIT}회)을 모두 사용했습니다.`,
        remaining: 0,
      });
    }
    rec.count++;
    usageStore.set(deviceId, rec);
  }

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({ model, max_tokens, messages });
    const remaining = rec ? Math.max(0, FREE_LIMIT - rec.count) : null;
    return send(res, 200, { ok: true, content: response.content, remaining });
  } catch (err) {
    if (rec) { rec.count--; usageStore.set(deviceId, rec); }
    return send(res, 500, { ok: false, error: err.message });
  }
}

export function startLocalServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET' && req.url === '/health') {
      return send(res, 200, { ok: true });
    }

    if (req.method === 'GET' && req.url === '/credits') {
      const deviceId = req.headers['x-device-id'];
      if (!deviceId) return send(res, 400, { ok: false, error: 'Missing x-device-id' });
      const rec = getUsage(deviceId);
      return send(res, 200, {
        ok: true,
        remaining: Math.max(0, FREE_LIMIT - rec.count),
        limit: FREE_LIMIT,
      });
    }

    if (req.method === 'POST' && req.url === '/generate') {
      return handleGenerate(req, res);
    }

    send(res, 404, { ok: false, error: 'Not found' });
  });

  server.listen(LOCAL_PORT, '127.0.0.1', () => {
    console.log(`[CareerLog] Local server listening on ${LOCAL_URL}`);
  });

  server.on('error', (err) => {
    console.error('[CareerLog] Local server error:', err.message);
  });
}
