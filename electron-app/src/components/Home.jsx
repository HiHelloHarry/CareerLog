import { useState, useEffect } from 'react'

const S = {
  wrap: {
    minHeight: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '28px 28px 24px',
  },
  dateLabel: {
    fontSize: 11.5, color: 'var(--ink3)', marginBottom: 4,
    letterSpacing: '.3px',
  },
  greeting: {
    fontFamily: "'DM Serif Display', serif", fontSize: 26,
    color: 'var(--ink)', lineHeight: 1.2, letterSpacing: '-.4px',
    textAlign: 'center', marginBottom: 24,
  },
  greetingEm: { color: 'var(--a)', fontStyle: 'italic' },
}

export default function Home({ isTracking, canGenerate, sessionStartedAt, onStart, onStop, onOpenTimeline, onOpenSettings }) {
  const [elapsed, setElapsed] = useState(0)
  const [toast, setToast] = useState(null)   // { lines: string[], key: number }
  const [project, setProject] = useState('')

  useEffect(() => {
    if (!isTracking) { setElapsed(0); return }
    const base = sessionStartedAt ? Date.now() - new Date(sessionStartedAt).getTime() : 0
    setElapsed(Math.floor(base / 1000))
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [isTracking, sessionStartedAt])

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  function formatElapsed(sec) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  function showToast(lines) {
    setToast({ lines, key: Date.now() })
    setTimeout(() => setToast(null), 3200)
  }

  async function handleStart() {
    await onStart(project.trim())
    showToast(['기록이 시작되었습니다.', '오늘 하루도 잘 부탁드립니다.'])
  }

  async function handleStop() {
    showToast(['오늘도 고생하셨습니다.'])
    await new Promise(r => setTimeout(r, 1500))
    onStop()
  }

  return (
    <div style={{ ...S.wrap, position: 'relative' }}>
      {/* API 키 없을 때 배너 */}
      {!canGenerate && !isTracking && (
        <button
          onClick={onOpenSettings}
          style={{
            marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(212,168,75,.08)', border: '1px solid rgba(212,168,75,.25)',
            borderRadius: 10, padding: '9px 14px',
            fontSize: 12.5, color: 'var(--a)', cursor: 'pointer',
            transition: 'all .15s',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(212,168,75,.15)' }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(212,168,75,.08)' }}
        >
          <span>⚠</span>
          <span style={{ color: 'var(--ink2)' }}>API 키를 설정해야 경력 기록을 생성할 수 있습니다</span>
          <span style={{ fontWeight: 700 }}>설정하기 →</span>
        </button>
      )}

      {/* 날짜 + 인사 */}
      <p style={S.dateLabel}>{today}</p>
      <h1 style={S.greeting}>
        오늘도 <em style={S.greetingEm}>기록</em>할 준비됐나요?
      </h1>

      {!isTracking ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%', maxWidth: 280 }}>
          <input
            type="text"
            value={project}
            onChange={e => setProject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="프로젝트 / 클라이언트 (선택)"
            style={{
              width: '100%', padding: '11px 16px',
              background: 'var(--bg3)', border: '1.5px solid var(--border2)',
              borderRadius: 12, fontSize: 13.5, color: 'var(--ink)',
              fontFamily: "'Noto Sans KR', sans-serif",
              outline: 'none', textAlign: 'center',
              transition: 'border-color .15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--a)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
          />
          <button
            onClick={handleStart}
            style={{
              width: '100%', padding: '16px 0',
              background: 'var(--a)', color: '#000',
              border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 6px 20px rgba(212,168,75,.25)',
              transition: 'all .2s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#e8bc5a'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--a)'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <span style={{ fontSize: 16 }}>▶</span>
            업무 시작
          </button>
          <p style={{ fontSize: 11.5, color: 'var(--ink3)' }}>시작하면 백그라운드에서 자동 기록됩니다</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {/* 타이머 카드 */}
          <div style={{
            background: 'var(--bg2)', border: '1px solid rgba(212,168,75,.2)',
            borderRadius: 18, padding: '24px 40px', textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{
              fontFamily: 'monospace', fontSize: 46, fontWeight: 700,
              color: 'var(--a)', letterSpacing: 4,
            }}>
              {formatElapsed(elapsed)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
              <RecordingDot />
              <span style={{ fontSize: 13, color: 'var(--g)', fontWeight: 500 }}>기록 중</span>
            </div>
          </div>

          <button
            onClick={handleStop}
            style={{
              width: 240, padding: '14px 0',
              background: 'var(--bg3)', color: 'var(--ink)',
              border: '1.5px solid var(--border2)', borderRadius: 14,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all .15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--r)'; e.currentTarget.style.color = 'var(--r)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--ink)' }}
          >
            <span>⏹</span>
            업무 종료
          </button>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div key={toast.key} style={{
          position: 'fixed', bottom: 28, left: '50%',
          background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 14, padding: '14px 24px',
          textAlign: 'center', boxShadow: 'var(--shadow)',
          animation: 'toastLifecycle 3s ease forwards',
          pointerEvents: 'none', zIndex: 999,
          minWidth: 220,
        }}>
          {toast.lines.map((line, i) => (
            <p key={i} style={{
              margin: 0,
              fontSize: i === 0 ? 14 : 12.5,
              fontWeight: i === 0 ? 700 : 400,
              color: i === 0 ? 'var(--ink)' : 'var(--ink3)',
              marginTop: i > 0 ? 4 : 0,
            }}>{line}</p>
          ))}
        </div>
      )}

      {/* 기록 보기 링크 */}
      <button
        onClick={onOpenTimeline}
        style={{
          marginTop: 28, background: 'none', border: 'none',
          fontSize: 12.5, color: 'var(--ink3)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'color .15s',
        }}
        onMouseOver={e => { e.currentTarget.style.color = 'var(--a)' }}
        onMouseOut={e => { e.currentTarget.style.color = 'var(--ink3)' }}
      >
        기록 보기 <span style={{ fontSize: 11 }}>→</span>
      </button>
    </div>
  )
}

function RecordingDot() {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: 'var(--g)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}
