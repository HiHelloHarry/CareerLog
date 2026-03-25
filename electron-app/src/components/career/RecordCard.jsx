import { useState } from 'react'

export default function RecordCard({ record, isNew, isSelected, onClick }) {
  const [hover, setHover] = useState(false)

  const date = record.created_at
    ? new Date(record.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })
    : ''

  const summary = record.star?.bullets?.[0]
    || record.star?.situation?.split('.')[0]
    || record.content?.split('\n')[0]
    || ''

  const skills = record.star?.skills || []
  const hasMetrics = (record.star?.metrics_detected || []).length > 0

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: isSelected ? 'var(--a-dim)' : 'var(--bg2)',
        border: isSelected ? '1.5px solid var(--a)' : `1px solid ${hover ? 'var(--a)' : 'var(--border)'}`,
        borderRadius: 12, padding: '14px 16px',
        cursor: 'pointer', transition: 'all .15s',
        position: 'relative', overflow: 'hidden',
        transform: hover && !isSelected ? 'translateY(-1px)' : 'none',
        boxShadow: hover ? '0 4px 16px rgba(0,0,0,.2)' : 'none',
      }}
    >
      {isNew && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--a)' }} />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)' }}>{date}</span>
        {record.project && (
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>· {record.project}</span>
        )}
      </div>
      <p style={{
        fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, marginTop: 8,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>{summary}</p>
      {skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
          {skills.slice(0, 3).map((s, i) => (
            <span key={i} className="chip chip-b" style={{
              fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: 'rgba(95,168,211,.1)', color: 'var(--b)',
              border: '1px solid rgba(95,168,211,.2)',
            }}>{s}</span>
          ))}
          {skills.length > 3 && (
            <span style={{ fontSize: 10.5, color: 'var(--ink4)' }}>+{skills.length - 3}</span>
          )}
        </div>
      )}
      {hasMetrics && <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--g)', marginTop: 6 }}>● 수치 포함</div>}
      {isNew && <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--a)', marginTop: 4 }}>✦ 방금 생성됨</div>}
      {record.updated_at && !isNew && (
        <div style={{ position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: '50%', background: 'var(--a)' }} />
      )}
    </div>
  )
}
