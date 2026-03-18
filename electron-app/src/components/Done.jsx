import { useState, useEffect } from 'react'

export default function Done({ star, content, onViewRecord, onHome, onAddMore }) {
  const [confetti, setConfetti] = useState([])
  const [streak, setStreak] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.careerlog.getStreak().then(setStreak)
    const timer = setTimeout(() => {
      setConfetti(generateConfetti(20))
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  async function handleCopy() {
    const text = star?.bullets?.join('\n') || content || ''
    if (text) await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const metrics = star?.metrics_detected?.filter(Boolean) || []
  const skills = star?.skills?.filter(Boolean) || []

  return (
    <div style={{ position: 'relative', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      {/* 컨페티 */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
        {confetti.map((p, i) => (
          <ConfettiParticle key={i} {...p} />
        ))}
      </div>

      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }} className="fade-up">
        {/* 체크 아이콘 */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--g-dim)', border: '2px solid rgba(82,183,136,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 32,
          animation: 'popIn .5s cubic-bezier(.175,.885,.32,1.275) both',
        }}>✓</div>

        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 28, letterSpacing: '-.4px', marginBottom: 8, color: 'var(--ink)',
        }}>
          경력이 <em style={{ color: 'var(--g)', fontStyle: 'italic' }}>쌓였습니다!</em>
        </h2>

        <p style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 20 }}>
          오늘의 업무가 경력 기록으로 저장됐습니다.
        </p>

        {/* 핵심 성과 요약 */}
        {(metrics.length > 0 || skills.length > 0 || star?.result) && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 18px', textAlign: 'left',
            marginBottom: 16,
          }}>
            {star?.result && (
              <div style={{ display: 'flex', gap: 10, marginBottom: metrics.length || skills.length ? 10 : 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--g)', flexShrink: 0, marginTop: 5 }} />
                <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{star.result}</p>
              </div>
            )}
            {metrics.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: skills.length ? 8 : 0 }}>
                {metrics.slice(0, 4).map((m, i) => (
                  <span key={i} className="chip chip-a">{m}</span>
                ))}
              </div>
            )}
            {skills.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {skills.slice(0, 5).map((s, i) => (
                  <span key={i} className="chip chip-b">{s}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 스트릭 */}
        {streak && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '10px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {streak.dates.map((d, i) => (
                <div key={i} style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: d.done ? (i === 6 ? 'var(--g)' : 'var(--a)') : 'var(--bg4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9.5, fontWeight: 700,
                  color: d.done ? '#000' : 'var(--ink3)',
                  boxShadow: (d.done && i === 6) ? '0 0 0 3px rgba(82,183,136,.2)' : 'none',
                }}>
                  {['월', '화', '수', '목', '금', '토', '일'][new Date(d.date).getDay() === 0 ? 6 : new Date(d.date).getDay() - 1]}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              {streak.current > 0 ? (
                <>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{streak.current}일 연속! 🔥</p>
                  <p style={{ fontSize: 11, color: 'var(--ink3)' }}>계속 이어가세요</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)' }}>오늘 첫 기록!</p>
                  <p style={{ fontSize: 11, color: 'var(--ink3)' }}>내일도 기록하면 연속이 시작됩니다</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={onViewRecord} style={btnStyle('var(--ink)', 'var(--bg)', true)}>
            <span>✦</span> 경력 기록 보기
          </button>
          <button onClick={handleCopy} style={btnStyle('var(--bg2)', 'var(--ink2)', false, '1px solid var(--border2)')}>
            {copied ? '✓ 복사됨' : '⎘ 클립보드에 복사'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onAddMore} style={{ ...btnStyle('var(--bg2)', 'var(--ink2)', false, '1px solid var(--border2)'), flex: 1, fontSize: 12.5 }}>
              + 추가 기록
            </button>
            <button onClick={onHome} style={{ ...btnStyle('var(--bg2)', 'var(--ink3)', false, '1px solid var(--border)'), flex: 1, fontSize: 12.5 }}>
              홈으로
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function btnStyle(bg, color, primary, border = 'none') {
  return {
    width: '100%', padding: primary ? '14px' : '11px',
    background: bg, color,
    border, borderRadius: 12,
    fontSize: 14, fontWeight: primary ? 700 : 600,
    cursor: 'pointer',
    fontFamily: "'Noto Sans KR', sans-serif",
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    transition: 'all .15s',
  }
}

function generateConfetti(count) {
  const colors = ['#d4a84b', '#52b788', '#5fa8d3', '#e07070', '#f2efe9']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.8,
    duration: 1.2 + Math.random() * 0.8,
    size: 5 + Math.random() * 5,
  }))
}

function ConfettiParticle({ x, color, delay, duration, size }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`,
      top: -10,
      width: size,
      height: size,
      borderRadius: 2,
      background: color,
      animation: `cpFall ${duration}s ${delay}s linear forwards`,
    }} />
  )
}
