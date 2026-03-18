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
  const [showConfirmation, setShowConfirmation] = useState(false)
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

  async function handleStart() {
    await onStart(project.trim())
    setShowConfirmation(true)
  }

  // ── 시작 확인 오버레이 ──
  if (showConfirmation) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 20, padding: '32px 28px', textAlign: 'center', maxWidth: 340,
          boxShadow: 'var(--shadow)',
        }} className="fade-up">
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--g-dim)', border: '2px solid rgba(82,183,136,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px', fontSize: 24,
            animation: 'popIn .5s cubic-bezier(.175,.885,.32,1.275)',
          }}>✓</div>

          <h3 style={{
            fontFamily: "'DM Serif Display', serif", fontSize: 22,
            color: 'var(--ink)', marginBottom: 8,
          }}>기록이 <em style={{ color: 'var(--g)', fontStyle: 'italic' }}>시작</em>됩니다</h3>

          <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 16 }}>
            백그라운드에서 30초마다 활동을 자동 기록합니다
          </p>

          <div style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6, textAlign: 'left', marginBottom: 20,
          }}>
            💡 종료하려면 <strong style={{ color: 'var(--ink2)' }}>시스템 트레이</strong>의 CareerLog 아이콘을<br />
            우클릭 → <strong style={{ color: 'var(--ink2)' }}>「업무 종료」</strong> 또는 이 창을 다시 열어 종료하세요
          </div>

          <button
            onClick={() => window.close()}
            style={{
              width: '100%', padding: '12px 0',
              background: 'var(--a)', color: '#000',
              border: 'none', borderRadius: 12,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif",
              transition: 'all .15s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#e8bc5a' }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--a)' }}
          >
            확인, 창 닫기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={S.wrap}>
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
            onClick={onStop}
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
