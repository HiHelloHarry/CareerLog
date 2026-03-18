export default function IdleDialog({ idleMinutes, idleStart, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
      zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 18, padding: '28px 28px 22px',
        width: 340, boxShadow: 'var(--shadow)',
      }} className="fade-up">

        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--a-dim)', border: '1.5px solid rgba(212,168,75,.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, margin: '0 auto 16px',
        }}>☕</div>

        <h3 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 19, color: 'var(--ink)', textAlign: 'center',
          letterSpacing: '-.3px', marginBottom: 8,
        }}>
          {idleMinutes}분간 자리를 비우셨나요?
        </h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', textAlign: 'center', lineHeight: 1.6, marginBottom: 22 }}>
          이 시간을 어떻게 처리할까요?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <OptionBtn
            label="자리 비움으로 처리"
            desc="이 시간은 기록에서 제외됩니다"
            icon="🚶"
            primary
            onClick={() => onDismiss('away')}
          />
          <OptionBtn
            label="업무 중이었음"
            desc="이 시간도 업무로 포함됩니다"
            icon="💼"
            onClick={() => onDismiss('working', idleStart)}
          />
        </div>

        <button onClick={() => onDismiss('away')} style={{
          width: '100%', marginTop: 12,
          background: 'none', border: 'none',
          fontSize: 12, color: 'var(--ink4)', cursor: 'pointer',
        }}>나중에 결정하기</button>
      </div>
    </div>
  )
}

function OptionBtn({ label, desc, icon, primary, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 10, textAlign: 'left',
      background: primary ? 'var(--a-dim)' : 'var(--bg3)',
      border: `1px solid ${primary ? 'rgba(212,168,75,.3)' : 'var(--border)'}`,
      cursor: 'pointer', transition: 'all .15s', width: '100%',
    }}
      onMouseOver={e => { e.currentTarget.style.borderColor = primary ? 'rgba(212,168,75,.5)' : 'var(--border2)' }}
      onMouseOut={e => { e.currentTarget.style.borderColor = primary ? 'rgba(212,168,75,.3)' : 'var(--border)' }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: primary ? 'var(--a)' : 'var(--ink)', marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 11.5, color: 'var(--ink3)' }}>{desc}</p>
      </div>
    </button>
  )
}
