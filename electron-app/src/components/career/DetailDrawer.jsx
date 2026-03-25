import { useState, useEffect } from 'react'

const STAR_FIELDS = [
  { key: 'situation', label: 'Situation', cls: 'drawer-star-s' },
  { key: 'task',      label: 'Task',      cls: 'drawer-star-t' },
  { key: 'action',    label: 'Action',    cls: 'drawer-star-a' },
  { key: 'result',    label: 'Result',    cls: 'drawer-star-r' },
]

export default function DetailDrawer({
  record, records, onClose, onNavigate,
  onDelete, onRegenerate, onSave, onCopy, onExport,
}) {
  const [view, setView] = useState('star')
  const [isEditing, setIsEditing] = useState(false)
  const [editStar, setEditStar] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editSaved, setEditSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyMenuOpen, setCopyMenuOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isConfirmDelete, setIsConfirmDelete] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [exportStatus, setExportStatus] = useState(null)

  const isOpen = !!record
  const star = record?.star
  const content = record?.content || ''
  const hasMetrics = (star?.metrics_detected || []).length > 0
  const hasSkills = (star?.skills || []).length > 0

  useEffect(() => {
    if (record) {
      setEditContent(record.content || '')
      setEditStar(record.star ? { ...record.star } : null)
      setIsEditing(false)
      setIsConfirmDelete(false)
    }
  }, [record?.id])

  useEffect(() => {
    function onKey(e) {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') navigate(-1)
      if (e.key === 'ArrowRight') navigate(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, record?.id, records])

  function navigate(dir) {
    if (!records || !record) return
    const idx = records.findIndex(r => r.id === record.id)
    const next = records[idx + dir]
    if (next) onNavigate(next.id)
  }

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'long',
    })
  }

  async function handleCopy(format) {
    let text = ''
    if (format === 'bullets') {
      text = star?.bullets?.join('\n') || content
    } else if (format === 'star') {
      text = star ? [
        `[Situation]\n${star.situation || ''}`,
        `[Task]\n${star.task || ''}`,
        `[Action]\n${star.action || ''}`,
        `[Result]\n${star.result || ''}`,
        star.skills?.length ? `[Skills]\n${star.skills.join(', ')}` : '',
      ].filter(Boolean).join('\n\n') : content
    } else if (format === 'linkedin') {
      text = star ? [
        star.action, star.result,
        star.skills?.length ? `#${star.skills.slice(0, 5).join(' #')}` : '',
      ].filter(Boolean).join('\n\n') : content
    }
    if (text) await navigator.clipboard.writeText(text)
    setCopied(true)
    setCopyMenuOpen(false)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleExport(format) {
    if (!record?.id) return
    setExportStatus('exporting')
    setExportMenuOpen(false)
    const res = await window.careerlog.exportCareerRecord(record.id, format)
    if (res?.success) setExportStatus('done')
    else if (res?.cancelled) setExportStatus(null)
    else setExportStatus('error')
    if (res?.success) setTimeout(() => setExportStatus(null), 3000)
  }

  async function handleSaveEdit() {
    if (record?.id) {
      await window.careerlog.updateCareerRecord(record.id, editContent, editStar)
    }
    setIsEditing(false)
    setEditSaved(true)
    if (onSave) onSave()
    setTimeout(() => setEditSaved(false), 2500)
  }

  async function handleDelete() {
    if (!record?.id) return
    await window.careerlog.deleteCareerRecord(record.id)
    setIsConfirmDelete(false)
    if (onDelete) onDelete(record.id)
  }

  async function handleRegenerate() {
    if (!record?.id) return
    setIsRegenerating(true)
    await window.careerlog.regenerateCareerRecord(record.id, record.template)
    setIsRegenerating(false)
    if (onRegenerate) onRegenerate()
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.25)', zIndex: 100,
          opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity .2s',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, background: 'var(--bg)',
        borderLeft: '1px solid var(--border)', zIndex: 200,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .25s ease-out',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,.3)',
      }}>
        {record && (
          <>
            {/* Header */}
            <div style={{
              padding: '18px 22px 14px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', borderBottom: '1px solid var(--border)', flexShrink: 0,
            }}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--ink)' }}>경력 기록 상세</div>
                <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>{formatDate(record.created_at)}</div>
                {record.project && (
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600,
                    padding: '2px 10px', borderRadius: 20,
                    background: 'var(--a-dim)', color: 'var(--a)', marginTop: 6,
                  }}>{record.project}</span>
                )}
                {editSaved && <div style={{ fontSize: 11, color: 'var(--b)', marginTop: 4 }}>저장됐습니다</div>}
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  <SmallBtn onClick={() => navigate(-1)}>← 이전</SmallBtn>
                  <SmallBtn onClick={() => navigate(1)}>다음 →</SmallBtn>
                </div>
              </div>
              <button onClick={onClose} style={{
                width: 30, height: 30, borderRadius: 8,
                border: '1px solid var(--border2)', background: 'var(--bg2)',
                color: 'var(--ink3)', fontSize: 15, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* View toggle */}
            {star && !isEditing && (
              <div style={{
                display: 'flex', background: 'var(--bg3)', borderRadius: 8,
                padding: 3, gap: 2, margin: '14px 22px 0', flexShrink: 0,
              }}>
                {[['star', 'STAR'], ['bullets', '불릿']].map(([v, label]) => (
                  <button key={v} onClick={() => setView(v)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all .15s',
                    background: view === v ? 'var(--bg2)' : 'transparent',
                    color: view === v ? 'var(--ink)' : 'var(--ink3)',
                    fontFamily: "'Noto Sans KR', sans-serif",
                  }}>{label}</button>
                ))}
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px' }}>
              {/* STAR View */}
              {star && view === 'star' && !isEditing && (
                <>
                  {hasMetrics && (
                    <div style={{
                      background: 'var(--g-dim)', border: '1.5px solid rgba(82,183,136,.25)',
                      borderRadius: 10, padding: '10px 14px', marginBottom: 10,
                      display: 'flex', gap: 10, alignItems: 'center',
                    }}>
                      <span style={{ background: 'var(--g)', color: '#000', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>수치 발견!</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {star.metrics_detected.map((m, i) => (
                          <span key={i} style={{ fontSize: 12, color: 'var(--g)', fontWeight: 600 }}>{m}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {STAR_FIELDS.map(({ key, label, cls }) => {
                    const val = star[key]
                    if (!val) return null
                    const colors = {
                      'drawer-star-s': { bg: 'var(--b-dim)', border: 'rgba(95,168,211,.25)', color: 'var(--b)' },
                      'drawer-star-t': { bg: 'var(--a-dim)', border: 'rgba(212,168,75,.25)', color: 'var(--a)' },
                      'drawer-star-a': { bg: 'var(--g-dim)', border: 'rgba(82,183,136,.25)', color: 'var(--g)' },
                      'drawer-star-r': { bg: 'var(--bg3)', border: 'var(--border2)', color: 'var(--ink)' },
                    }[cls]
                    return (
                      <div key={key} style={{
                        background: 'var(--bg2)', border: `1px solid ${colors.border}`,
                        borderRadius: 10, overflow: 'hidden', marginBottom: 8,
                      }}>
                        <div style={{
                          background: colors.bg, padding: '7px 14px',
                          borderBottom: `1px solid ${colors.border}`,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: colors.color, letterSpacing: '.3px' }}>{label}</span>
                          {key === 'result' && hasMetrics && (
                            <span style={{ fontSize: 10, color: 'var(--g)', fontWeight: 700, background: 'var(--g-dim)', padding: '1px 7px', borderRadius: 20 }}>✓ 수치</span>
                          )}
                        </div>
                        <p style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, margin: 0 }}>{val}</p>
                      </div>
                    )
                  })}
                  {hasSkills && (
                    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', marginBottom: 8, letterSpacing: '.3px' }}>SKILLS</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {star.skills.map((s, i) => (
                          <span key={i} style={{
                            fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                            background: 'rgba(95,168,211,.1)', color: 'var(--b)',
                            border: '1px solid rgba(95,168,211,.2)',
                          }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Bullet View */}
              {(!star || view === 'bullets') && !isEditing && (
                <div style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: '16px 18px',
                }}>
                  <pre style={{
                    whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8,
                    color: 'var(--ink)', fontFamily: "'Noto Sans KR', sans-serif", margin: 0,
                  }}>
                    {star?.bullets?.join('\n') || content}
                  </pre>
                </div>
              )}

              {/* Edit Mode */}
              {isEditing && (
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                  {editStar ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {STAR_FIELDS.map(({ key, label }) => {
                        const colors = { situation: 'var(--b)', task: 'var(--a)', action: 'var(--g)', result: 'var(--ink)' }
                        return (
                          <div key={key}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: colors[key], marginBottom: 4, letterSpacing: '.3px' }}>{label}</p>
                            <textarea
                              value={editStar[key] || ''}
                              onChange={e => setEditStar(prev => ({ ...prev, [key]: e.target.value }))}
                              style={{
                                width: '100%', background: 'var(--bg3)', border: '1.5px solid var(--border2)',
                                borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--ink)',
                                fontFamily: "'Noto Sans KR', sans-serif", resize: 'vertical', minHeight: 55, outline: 'none',
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = 'var(--a)' }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%', minHeight: 200, background: 'transparent',
                        border: 'none', outline: 'none', fontSize: 13, lineHeight: 1.8,
                        color: 'var(--ink)', fontFamily: "'Noto Sans KR', sans-serif", resize: 'none',
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{
              padding: '12px 22px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap',
            }}>
              {isConfirmDelete ? (
                <>
                  <span style={{ fontSize: 12, color: 'var(--r)', fontWeight: 600, padding: '7px 0' }}>삭제할까요?</span>
                  <ActionBtn onClick={handleDelete} danger>확인</ActionBtn>
                  <ActionBtn onClick={() => setIsConfirmDelete(false)}>취소</ActionBtn>
                </>
              ) : isEditing ? (
                <>
                  <ActionBtn onClick={handleSaveEdit} primary>저장</ActionBtn>
                  <ActionBtn onClick={() => {
                    setIsEditing(false)
                    setEditContent(record.content || '')
                    setEditStar(record.star ? { ...record.star } : null)
                  }}>취소</ActionBtn>
                </>
              ) : (
                <>
                  {/* Copy Menu */}
                  <div style={{ position: 'relative' }}>
                    <ActionBtn onClick={() => { setCopyMenuOpen(p => !p); setExportMenuOpen(false) }}>
                      {copied ? '✓ 복사됨' : '⎘ 복사'}
                    </ActionBtn>
                    {copyMenuOpen && (
                      <div style={{
                        position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
                        background: 'var(--bg2)', border: '1px solid var(--border2)',
                        borderRadius: 9, padding: 5, zIndex: 300, boxShadow: '0 4px 24px rgba(0,0,0,.35)',
                        minWidth: 170, display: 'flex', flexDirection: 'column', gap: 2,
                      }}>
                        {[
                          ['bullets', '• 이력서 불릿'],
                          ['star', '★ STAR 전체'],
                          ['linkedin', '🔗 LinkedIn 포스트'],
                        ].map(([fmt, label]) => (
                          <button key={fmt} onClick={() => handleCopy(fmt)} style={{
                            padding: '8px 12px', borderRadius: 6, border: 'none',
                            background: 'transparent', cursor: 'pointer', textAlign: 'left',
                            fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12, color: 'var(--ink2)',
                          }}
                          onMouseOver={e => { e.currentTarget.style.background = 'var(--bg3)' }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
                          >{label}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Export Menu */}
                  {record.id && (
                    <div style={{ position: 'relative' }}>
                      <ActionBtn onClick={() => { setExportMenuOpen(p => !p); setCopyMenuOpen(false) }}>
                        {exportStatus === 'exporting' ? '저장 중...' : exportStatus === 'done' ? '✓ 저장됨' : '↓ 내보내기'}
                      </ActionBtn>
                      {exportMenuOpen && (
                        <div style={{
                          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
                          background: 'var(--bg2)', border: '1px solid var(--border2)',
                          borderRadius: 9, padding: 5, zIndex: 300, boxShadow: '0 4px 24px rgba(0,0,0,.35)',
                          minWidth: 140, display: 'flex', flexDirection: 'column', gap: 2,
                        }}>
                          {[['md', 'Markdown (.md)'], ['html', 'HTML (.html)']].map(([fmt, label]) => (
                            <button key={fmt} onClick={() => handleExport(fmt)} style={{
                              padding: '8px 12px', borderRadius: 6, border: 'none',
                              background: 'transparent', color: 'var(--ink2)', fontSize: 12,
                              cursor: 'pointer', textAlign: 'left',
                              fontFamily: "'Noto Sans KR', sans-serif",
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'var(--bg3)' }}
                            onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
                            >{label}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <ActionBtn onClick={() => setIsEditing(true)}>✏ 수정</ActionBtn>
                  {record.id && (
                    <ActionBtn onClick={handleRegenerate} disabled={isRegenerating}>
                      {isRegenerating ? '생성 중...' : '↺ 재생성'}
                    </ActionBtn>
                  )}
                  {record.id && (
                    <ActionBtn onClick={() => setIsConfirmDelete(true)} danger>삭제</ActionBtn>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function ActionBtn({ children, onClick, primary, danger, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
      border: `1px solid ${primary ? 'transparent' : danger ? 'rgba(224,112,112,.3)' : 'var(--border2)'}`,
      background: primary ? 'var(--a)' : 'var(--bg2)',
      color: primary ? '#000' : danger ? 'var(--r)' : 'var(--ink2)',
      cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
      fontFamily: "'Noto Sans KR', sans-serif", transition: 'all .15s',
    }}>{children}</button>
  )
}

function SmallBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '3px 9px', borderRadius: 6, border: '1px solid var(--border2)',
      background: 'var(--bg2)', color: 'var(--ink3)', fontSize: 11,
      cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif", transition: 'all .15s',
    }}>{children}</button>
  )
}
