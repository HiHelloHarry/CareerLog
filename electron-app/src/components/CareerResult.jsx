import { useState, useEffect } from 'react'

const STAR_FIELDS = [
  { key: 'situation', label: 'Situation', color: 'var(--b)', dimColor: 'var(--b-dim)', borderColor: 'rgba(95,168,211,.25)' },
  { key: 'task',      label: 'Task',      color: 'var(--a)', dimColor: 'var(--a-dim)', borderColor: 'rgba(212,168,75,.25)' },
  { key: 'action',    label: 'Action',    color: 'var(--g)', dimColor: 'var(--g-dim)', borderColor: 'rgba(82,183,136,.25)' },
  { key: 'result',    label: 'Result',    color: 'var(--ink)', dimColor: 'var(--bg3)', borderColor: 'var(--border2)' },
]

export default function CareerResult({ content, star, records, onBack }) {
  const [copied, setCopied] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editStar, setEditStar] = useState(null)
  const [editSaved, setEditSaved] = useState(false)
  const [view, setView] = useState('star') // 'star' | 'bullets'
  const [projectFilter, setProjectFilter] = useState('') // '' = 전체
  const [exportStatus, setExportStatus] = useState(null) // null | 'exporting' | 'done' | 'error'

  // 프로젝트 목록 추출 (빈 문자열 제외)
  const projects = [...new Set((records || []).map(r => r.project).filter(Boolean))]

  const filteredRecords = projectFilter
    ? (records || []).filter(r => r.project === projectFilter)
    : records

  const displayContent = content || selectedRecord?.content || filteredRecords?.[0]?.content
  const displayStar = star || selectedRecord?.star || filteredRecords?.[0]?.star
  const displayRecord = selectedRecord || (content ? null : filteredRecords?.[0])

  useEffect(() => {
    setEditContent(displayContent || '')
    setEditStar(displayStar ? { ...displayStar } : null)
    setIsEditing(false)
  }, [displayContent, displayStar])

  async function handleCopy(format = 'bullets') {
    let text = ''
    if (format === 'bullets') {
      text = displayStar?.bullets?.join('\n') || displayContent || ''
    } else if (format === 'star') {
      const s = displayStar
      if (s) {
        text = [
          `[Situation]\n${s.situation || ''}`,
          `[Task]\n${s.task || ''}`,
          `[Action]\n${s.action || ''}`,
          `[Result]\n${s.result || ''}`,
          s.skills?.length ? `[Skills]\n${s.skills.join(', ')}` : '',
        ].filter(Boolean).join('\n\n')
      } else {
        text = displayContent || ''
      }
    } else if (format === 'linkedin') {
      const s = displayStar
      text = s ? [
        s.action, s.result,
        s.skills?.length ? `#${s.skills.slice(0, 5).join(' #')}` : '',
      ].filter(Boolean).join('\n\n') : (displayContent || '')
    }
    if (text) await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleExport(format) {
    const target = displayRecord?.id
    if (!target) return
    setExportStatus('exporting')
    const res = await window.careerlog.exportCareerRecord(target, format)
    if (res?.success) setExportStatus('done')
    else if (res?.cancelled) setExportStatus(null)
    else setExportStatus('error')
    if (res?.success) setTimeout(() => setExportStatus(null), 3000)
  }

  async function handleSaveEdit() {
    const target = displayRecord?.id ? displayRecord : records?.[0]
    if (target) {
      await window.careerlog.updateCareerRecord(target.id, editContent, editStar)
    }
    setIsEditing(false)
    setEditSaved(true)
    setTimeout(() => setEditSaved(false), 2500)
  }

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (!displayContent && (!records || records.length === 0)) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>✦</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink2)' }}>아직 생성된 경력 기록이 없습니다</p>
        <p style={{ fontSize: 12.5, marginTop: 6, color: 'var(--ink3)' }}>타임라인에서 경력 기록을 생성하세요</p>
        <button onClick={onBack} style={{
          marginTop: 20, padding: '10px 20px',
          background: 'var(--a)', color: '#000',
          border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'Noto Sans KR', sans-serif",
        }}>타임라인으로 이동</button>
      </div>
    )
  }

  const hasMetrics = (displayStar?.metrics_detected || []).length > 0
  const hasSkills = (displayStar?.skills || []).length > 0

  return (
    <div style={{ display: 'flex', gap: 18 }} className="fade-up">
      {/* 사이드바 */}
      {records && records.length > 0 && (
        <div style={{ width: 148, flexShrink: 0 }}>
          <p style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 8, paddingLeft: 4 }}>기록 목록</p>

          {/* 프로젝트 필터 */}
          {projects.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <select
                value={projectFilter}
                onChange={e => { setProjectFilter(e.target.value); setSelectedRecord(null) }}
                style={{
                  width: '100%', padding: '5px 8px',
                  background: 'var(--bg3)', border: '1px solid var(--border2)',
                  borderRadius: 7, fontSize: 11.5, color: 'var(--ink2)',
                  cursor: 'pointer', outline: 'none',
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              >
                <option value="">📁 전체</option>
                {projects.map(p => (
                  <option key={p} value={p}>📁 {p}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {content && !projectFilter && (
              <SidebarItem active={!selectedRecord} onClick={() => { setSelectedRecord(null); setIsEditing(false) }} label="방금 생성됨 ✦" />
            )}
            {(filteredRecords || []).map(r => (
              <SidebarItem key={r.id}
                active={selectedRecord?.id === r.id}
                onClick={() => { setSelectedRecord(r); setIsEditing(false) }}
                label={new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                sub={r.project || new Date(r.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                updated={!!r.updated_at}
                template={r.template}
              />
            ))}
          </div>
        </div>
      )}

      {/* 메인 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', letterSpacing: '-.3px' }}>경력 기록</h2>
            {displayRecord?.created_at && (
              <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>{formatDate(displayRecord.created_at)}</p>
            )}
            {content && !selectedRecord && (
              <p style={{ fontSize: 11.5, color: 'var(--g)', marginTop: 3, fontWeight: 600 }}>✦ 방금 생성됨</p>
            )}
            {editSaved && <p style={{ fontSize: 11.5, color: 'var(--b)', marginTop: 3 }}>저장됐습니다</p>}
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            {/* STAR / 불릿 토글 */}
            {displayStar && (
              <div style={{
                display: 'flex', background: 'var(--bg3)', borderRadius: 8, padding: 2, gap: 2,
              }}>
                {[['star', 'STAR'], ['bullets', '불릿']].map(([v, label]) => (
                  <button key={v} onClick={() => setView(v)} style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: view === v ? 'var(--bg2)' : 'transparent',
                    color: view === v ? 'var(--ink)' : 'var(--ink3)',
                    transition: 'all .15s',
                  }}>{label}</button>
                ))}
              </div>
            )}
            {!isEditing ? (
              <>
                <ActionBtn onClick={() => setIsEditing(true)} label="✏ 수정" />
                <CopyMenu onCopy={handleCopy} copied={copied} />
                {displayRecord?.id && (
                  <ExportMenu
                    onExport={handleExport}
                    status={exportStatus}
                  />
                )}
              </>
            ) : (
              <>
                <ActionBtn onClick={handleSaveEdit} label="저장" primary />
                <ActionBtn onClick={() => { setIsEditing(false); setEditContent(displayContent || ''); setEditStar(displayStar ? { ...displayStar } : null) }} label="취소" />
              </>
            )}
          </div>
        </div>

        {/* 수치 발견 배너 */}
        {hasMetrics && (
          <div style={{
            background: 'var(--g-dim)', border: '1.5px solid rgba(82,183,136,.25)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 12,
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <span style={{ background: 'var(--g)', color: '#000', fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>수치 발견!</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(displayStar?.metrics_detected || []).map((m, i) => (
                <span key={i} style={{ fontSize: 12.5, color: 'var(--g)', fontWeight: 600 }}>{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* STAR 카드 뷰 */}
        {displayStar && view === 'star' && !isEditing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {STAR_FIELDS.map(({ key, label, color, dimColor, borderColor }) => {
              const val = displayStar[key]
              if (!val) return null
              return (
                <div key={key} style={{
                  background: 'var(--bg2)', border: `1px solid ${borderColor}`,
                  borderRadius: 12, overflow: 'hidden',
                }}>
                  <div style={{
                    background: dimColor, padding: '8px 14px',
                    borderBottom: `1px solid ${borderColor}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color, letterSpacing: '.3px' }}>{label}</span>
                    {key === 'result' && hasMetrics && (
                      <span style={{ fontSize: 10.5, color: 'var(--g)', fontWeight: 700, background: 'var(--g-dim)', padding: '1px 7px', borderRadius: 20 }}>✓ 수치 포함</span>
                    )}
                  </div>
                  <p style={{ padding: '11px 14px', fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.7, margin: 0 }}>{val}</p>
                </div>
              )
            })}

            {/* Skills */}
            {hasSkills && (
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px',
              }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink3)', marginBottom: 8, letterSpacing: '.3px' }}>SKILLS</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {displayStar.skills.map((s, i) => (
                    <span key={i} className="chip chip-b">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 불릿 뷰 또는 STAR 없을 때 */}
        {(!displayStar || view === 'bullets') && !isEditing && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 20px', marginBottom: 12,
          }}>
            <pre style={{
              whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.9,
              color: 'var(--ink)', fontFamily: "'Noto Sans KR', sans-serif", margin: 0,
            }}>
              {displayStar?.bullets?.join('\n') || displayContent}
            </pre>
          </div>
        )}

        {/* 편집 모드 */}
        {isEditing && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 20px', marginBottom: 12,
          }}>
            {editStar ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {STAR_FIELDS.map(({ key, label, color }) => (
                  <div key={key}>
                    <p style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4, letterSpacing: '.3px' }}>{label}</p>
                    <textarea
                      value={editStar[key] || ''}
                      onChange={e => setEditStar(prev => ({ ...prev, [key]: e.target.value }))}
                      style={{
                        width: '100%', background: 'var(--bg3)',
                        border: '1.5px solid var(--border2)', borderRadius: 8,
                        padding: '8px 12px', fontSize: 13, color: 'var(--ink)',
                        fontFamily: "'Noto Sans KR', sans-serif",
                        resize: 'vertical', minHeight: 60, outline: 'none',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--a)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                autoFocus
                style={{
                  width: '100%', minHeight: 260, background: 'transparent',
                  border: 'none', outline: 'none',
                  fontSize: 13.5, lineHeight: 1.9, color: 'var(--ink)',
                  fontFamily: "'Noto Sans KR', sans-serif", resize: 'none',
                }}
              />
            )}
          </div>
        )}

        <p style={{ fontSize: 11.5, color: 'var(--ink3)', textAlign: 'center', marginTop: 6 }}>
          이 기록은 로컬에 저장됩니다 · 이력서·경력기술서에 바로 활용하세요
        </p>
      </div>
    </div>
  )
}

function SidebarItem({ active, onClick, label, sub, updated, template }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', textAlign: 'left', padding: '9px 11px', borderRadius: 8,
        background: active ? 'var(--a-dim)' : hover ? 'var(--bg3)' : 'transparent',
        border: active ? '1px solid rgba(212,168,75,.25)' : '1px solid transparent',
        cursor: 'pointer', transition: 'all .15s',
      }}>
      <div style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? 'var(--a)' : 'var(--ink2)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{sub}</div>}
      {template && template !== 'star' && <div style={{ fontSize: 10.5, color: 'var(--ink3)', marginTop: 1 }}>{template}</div>}
      {updated && <div style={{ fontSize: 10.5, color: 'var(--a)', marginTop: 2 }}>수정됨</div>}
    </button>
  )
}

function CopyMenu({ onCopy, copied }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          padding: '7px 13px', borderRadius: 8,
          background: 'var(--bg2)', color: copied ? 'var(--g)' : 'var(--ink2)',
          border: '1px solid var(--border2)',
          fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          fontFamily: "'Noto Sans KR', sans-serif", transition: 'all .15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg3)' }}
        onMouseOut={e => { e.currentTarget.style.background = 'var(--bg2)' }}
      >
        {copied ? '✓ 복사됨' : '⎘ 복사'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 9, padding: 6, zIndex: 200,
          boxShadow: 'var(--shadow)', minWidth: 170,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {[
            ['bullets', '• 이력서 불릿 복사', '이력서·경력기술서용'],
            ['star', '★ STAR 전체 복사', 'Situation/Task/Action/Result'],
            ['linkedin', '🔗 LinkedIn 포스트용', 'Action + Result + 해시태그'],
          ].map(([fmt, label, desc]) => (
            <button key={fmt}
              onClick={() => { onCopy(fmt); setOpen(false) }}
              style={{
                padding: '9px 12px', borderRadius: 6, border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontFamily: "'Noto Sans KR', sans-serif",
                transition: 'background .1s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--bg3)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink2)' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ExportMenu({ onExport, status }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          padding: '7px 13px', borderRadius: 8,
          background: 'var(--bg2)', color: status === 'done' ? 'var(--g)' : 'var(--ink2)',
          border: '1px solid var(--border2)',
          fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          fontFamily: "'Noto Sans KR', sans-serif", transition: 'all .15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'var(--bg3)' }}
        onMouseOut={e => { e.currentTarget.style.background = 'var(--bg2)' }}
      >
        {status === 'exporting' ? '저장 중...' : status === 'done' ? '✓ 저장됨' : status === 'error' ? '⚠ 오류' : '↓ 내보내기'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 9, padding: 6, zIndex: 200,
          boxShadow: 'var(--shadow)', minWidth: 140,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {[['md', '📝 Markdown (.md)'], ['html', '🌐 HTML (.html)']].map(([fmt, label]) => (
            <button key={fmt}
              onClick={() => { onExport(fmt); setOpen(false) }}
              style={{
                padding: '8px 12px', borderRadius: 6, border: 'none',
                background: 'transparent', color: 'var(--ink2)',
                fontSize: 12.5, cursor: 'pointer', textAlign: 'left',
                fontFamily: "'Noto Sans KR', sans-serif",
                transition: 'background .1s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--bg3)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
            >{label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function ActionBtn({ onClick, label, primary, gold }) {
  const [hover, setHover] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 13px', borderRadius: 8,
        background: primary ? (hover ? '#e8bc5a' : 'var(--a)') : hover ? 'var(--bg3)' : 'var(--bg2)',
        color: primary ? '#000' : gold ? 'var(--g)' : 'var(--ink2)',
        border: `1px solid ${primary ? 'transparent' : 'var(--border2)'}`,
        fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        fontFamily: "'Noto Sans KR', sans-serif", transition: 'all .15s',
      }}>{label}</button>
  )
}
