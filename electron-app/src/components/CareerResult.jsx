import { useState, useEffect } from 'react'

export default function CareerResult({ content, records, onBack }) {
  const [copied, setCopied] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editSaved, setEditSaved] = useState(false)

  const displayContent = content || selectedRecord?.content || records?.[0]?.content
  const displayRecord = selectedRecord || (content ? null : records?.[0])

  useEffect(() => {
    setEditContent(displayContent || '')
    setIsEditing(false)
  }, [displayContent])

  async function handleCopy() {
    if (!displayContent) return
    await navigator.clipboard.writeText(isEditing ? editContent : displayContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleSaveEdit() {
    const latestRecord = displayRecord?.id ? displayRecord : records?.[0]
    if (latestRecord) {
      await window.careerlog.updateCareerRecord(latestRecord.id, editContent)
    }
    setIsEditing(false)
    setEditSaved(true)
    setTimeout(() => setEditSaved(false), 2500)
  }

  function formatDate(isoString) {
    if (!isoString) return ''
    return new Date(isoString).toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (!displayContent && (!records || records.length === 0)) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>✦</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink2)' }}>아직 생성된 경력 기록이 없습니다</p>
        <p style={{ fontSize: 12.5, marginTop: 6, color: 'var(--ink3)' }}>타임라인에서 업무를 기록하고 경력 기록을 생성하세요</p>
        <button
          onClick={onBack}
          style={{
            marginTop: 20, padding: '10px 20px',
            background: 'var(--a)', color: '#000',
            border: 'none', borderRadius: 10,
            fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >타임라인으로 이동</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 18 }} className="fade-up">

      {/* 사이드바: 기록 목록 */}
      {records && records.length > 0 && (
        <div style={{ width: 140, flexShrink: 0 }}>
          <p style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: '.8px',
            textTransform: 'uppercase', color: 'var(--ink3)',
            marginBottom: 10, paddingLeft: 4,
          }}>기록 목록</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {content && (
              <SidebarItem
                active={!selectedRecord}
                onClick={() => { setSelectedRecord(null); setIsEditing(false) }}
                label="방금 생성됨 ✦"
                sub=""
              />
            )}
            {records.map(r => (
              <SidebarItem
                key={r.id}
                active={selectedRecord?.id === r.id}
                onClick={() => { setSelectedRecord(r); setIsEditing(false) }}
                label={new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                sub={new Date(r.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                updated={!!r.updated_at}
              />
            ))}
          </div>
        </div>
      )}

      {/* 메인 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
          <div>
            <h2 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 22, color: 'var(--ink)', letterSpacing: '-.3px',
            }}>경력 기록</h2>
            {displayRecord?.created_at && (
              <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>
                {formatDate(displayRecord.created_at)}
              </p>
            )}
            {content && !selectedRecord && (
              <p style={{ fontSize: 11.5, color: 'var(--g)', marginTop: 3, fontWeight: 600 }}>✦ 방금 생성됨</p>
            )}
            {editSaved && (
              <p style={{ fontSize: 11.5, color: 'var(--b)', marginTop: 3 }}>저장되었습니다</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {!isEditing ? (
              <>
                <ActionBtn onClick={() => setIsEditing(true)} label="✏ 수정" />
                <ActionBtn onClick={handleCopy} label={copied ? '✓ 복사됨' : '⎘ 복사'} gold={copied} />
              </>
            ) : (
              <>
                <ActionBtn onClick={handleSaveEdit} label="저장" primary />
                <ActionBtn onClick={() => { setIsEditing(false); setEditContent(displayContent || '') }} label="취소" />
                <ActionBtn onClick={handleCopy} label={copied ? '✓' : '⎘'} />
              </>
            )}
          </div>
        </div>

        {/* 콘텐츠 카드 */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '20px 22px',
        }}>
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              autoFocus
              style={{
                width: '100%', minHeight: 280,
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 13.5, lineHeight: 1.9, color: 'var(--ink)',
                fontFamily: "'Noto Sans KR', sans-serif",
                resize: 'none',
              }}
            />
          ) : (
            <pre style={{
              whiteSpace: 'pre-wrap',
              fontSize: 13.5, lineHeight: 1.9,
              color: 'var(--ink)',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>
              {displayContent}
            </pre>
          )}
        </div>

        <p style={{
          fontSize: 11.5, color: 'var(--ink3)',
          textAlign: 'center', marginTop: 14,
        }}>
          이 기록은 로컬에 저장됩니다 · 이력서·경력기술서에 바로 활용하세요
        </p>
      </div>
    </div>
  )
}

function SidebarItem({ active, onClick, label, sub, updated }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', textAlign: 'left',
        padding: '9px 11px', borderRadius: 8,
        background: active ? 'var(--a-dim)' : hover ? 'var(--bg3)' : 'transparent',
        border: active ? '1px solid rgba(212,168,75,.25)' : '1px solid transparent',
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? 'var(--a)' : 'var(--ink2)' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{sub}</div>
      )}
      {updated && (
        <div style={{ fontSize: 10.5, color: 'var(--a)', marginTop: 2 }}>수정됨</div>
      )}
    </button>
  )
}

function ActionBtn({ onClick, label, primary, gold }) {
  const [hover, setHover] = useState(false)
  const bg = primary
    ? hover ? '#e8bc5a' : 'var(--a)'
    : hover ? 'var(--bg3)' : 'var(--bg2)'
  const color = primary ? '#000' : gold ? 'var(--g)' : 'var(--ink2)'
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 13px', borderRadius: 8,
        background: bg, color,
        border: `1px solid ${primary ? 'transparent' : 'var(--border2)'}`,
        fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        fontFamily: "'Noto Sans KR', sans-serif",
        transition: 'all .15s',
      }}
    >{label}</button>
  )
}
