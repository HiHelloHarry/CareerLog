import { useState, useMemo } from 'react'

const TEMPLATES = [
  { id: 'star',     label: 'STAR 구조',     desc: '이직 이력서 표준' },
  { id: 'numbers',  label: '수치/성과 중심', desc: '마케터·사업개발' },
  { id: 'process',  label: '프로세스 중심',  desc: '기획자·PM' },
  { id: 'outcome',  label: '결과 중심',     desc: '시니어급 지원' },
]

export default function Timeline({ timeline, session, sessions = [], canGenerate, onSaveMemo, onGenerate, isGenerating, onSelectSession }) {
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('star')
  const [viewMode, setViewMode] = useState('group') // 'group' | 'list'
  const [showSessionPicker, setShowSessionPicker] = useState(false)

  const grouped = useMemo(() => {
    const map = new Map()
    for (const a of timeline) {
      const key = a.app_name
      if (!map.has(key)) map.set(key, { app_name: key, activities: [], totalSec: 0 })
      const g = map.get(key)
      g.activities.push(a)
      g.totalSec += (a.duration_sec || 0)
    }
    return [...map.values()].sort((a, b) => b.totalSec - a.totalSec)
  }, [timeline])

  const totalSec = timeline.reduce((sum, a) => sum + (a.duration_sec || 0), 0)
  const sessionDate = session?.date || timeline[0]?.started_at?.split('T')[0] || ''
  const dateLabel = sessionDate
    ? new Date(sessionDate + 'T12:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    : '날짜 미상'

  function handleGenerateClick() {
    if (!canGenerate) { onGenerate('star'); return }
    setShowTemplateModal(true)
  }

  function handleConfirmTemplate() {
    setShowTemplateModal(false)
    onGenerate(selectedTemplate)
  }

  return (
    <div className="fade-up">
      {/* 세션 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(212,168,75,.15), var(--bg2))',
        border: '1px solid rgba(212,168,75,.2)',
        borderRadius: 16, padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginBottom: 4 }}>{dateLabel}</p>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', letterSpacing: '-.3px' }}>
            {formatDuration(totalSec)} <span style={{ color: 'var(--ink2)', fontSize: 16 }}>기록</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{timeline.length}개 활동 · {grouped.length}개 앱</span>
            {session?.project && (
              <span style={{ fontSize: 11.5, background: 'var(--a-dim)', color: 'var(--a)', border: '1px solid rgba(212,168,75,.25)', padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>
                📁 {session.project}
              </span>
            )}
          </div>
        </div>

        {canGenerate ? (
          <button onClick={handleGenerateClick} disabled={isGenerating}
            style={{
              background: 'var(--a)', color: '#000', border: 'none', borderRadius: 12,
              padding: '10px 16px', fontSize: 13, fontWeight: 700,
              cursor: isGenerating ? 'wait' : 'pointer',
              opacity: isGenerating ? 0.6 : 1,
              fontFamily: "'Noto Sans KR', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
              flexShrink: 0, transition: 'all .15s',
            }}
            onMouseOver={e => { if (!isGenerating) e.currentTarget.style.background = '#e8bc5a' }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--a)' }}
          >
            {isGenerating ? <><Spinner /> 분석 중...</> : <>✦ 경력 기록 생성</>}
          </button>
        ) : (
          <button onClick={() => onGenerate('star')}
            style={{
              background: 'var(--bg3)', color: 'var(--a)',
              border: '1px solid rgba(212,168,75,.3)', borderRadius: 12,
              padding: '10px 14px', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', flexShrink: 0, transition: 'all .15s',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--a-dim)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--bg3)' }}
          >🔑 API 키 설정</button>
        )}
      </div>

      {/* 날짜 필터 (세션 스위처) */}
      {sessions.length > 1 && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <button
            onClick={() => setShowSessionPicker(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'var(--bg3)', border: '1px solid var(--border2)',
              color: 'var(--ink2)', cursor: 'pointer', transition: 'all .15s',
            }}
          >
            📅 날짜 선택
            <span style={{ color: 'var(--ink4)', transform: showSessionPicker ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
          </button>
          {showSessionPicker && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              background: 'var(--bg2)', border: '1px solid var(--border2)',
              borderRadius: 10, padding: '6px', zIndex: 100,
              boxShadow: 'var(--shadow)', minWidth: 220,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              {sessions.map(s => {
                const isActive = s.id === session?.id
                const dateStr = s.date
                  ? new Date(s.date + 'T12:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
                  : s.date
                const durationSec = s.ended_at && s.started_at
                  ? Math.round((new Date(s.ended_at) - new Date(s.started_at)) / 1000)
                  : null
                return (
                  <button key={s.id}
                    onClick={() => { onSelectSession(s.id); setShowSessionPicker(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', borderRadius: 7, border: 'none',
                      background: isActive ? 'var(--a-dim)' : 'transparent',
                      color: isActive ? 'var(--a)' : 'var(--ink2)',
                      cursor: 'pointer', fontSize: 12.5, fontWeight: isActive ? 700 : 400,
                      transition: 'background .1s', textAlign: 'left',
                      fontFamily: "'Noto Sans KR', sans-serif",
                    }}
                    onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg3)' }}
                    onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span>{dateStr}{s.project ? ` · ${s.project}` : ''}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {durationSec && <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{formatDuration(durationSec)}</span>}
                      {!s.has_career_record && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--a)', display: 'inline-block' }} title="경력 기록 미생성" />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 활동 없을 때 빈 상태 */}
      {!timeline.length ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink3)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>▤</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink2)' }}>이 날은 기록된 업무가 없습니다</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>다른 날짜를 선택하거나 홈에서 업무를 시작하세요</p>
        </div>
      ) : (
        <>
          {/* 뷰 모드 토글 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[['group', '⊞ 앱별'], ['list', '≡ 시간순']].map(([v, label]) => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: viewMode === v ? 'var(--a-dim)' : 'var(--bg3)',
                color: viewMode === v ? 'var(--a)' : 'var(--ink3)',
                transition: 'all .15s',
              }}>{label}</button>
            ))}
          </div>

          {/* 그룹 뷰 */}
          {viewMode === 'group' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped.map(g => (
                <GroupItem key={g.app_name} group={g} onSaveMemo={onSaveMemo} />
              ))}
            </div>
          )}

          {/* 시간순 뷰 */}
          {viewMode === 'list' && (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 19, top: 6, bottom: 6, width: 1, background: 'var(--border)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {timeline.map((activity, idx) => (
                  <ActivityItem key={activity.id || idx} activity={activity} onSaveMemo={onSaveMemo} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 템플릿 선택 모달 */}
      {showTemplateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowTemplateModal(false)}>
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border2)',
            borderRadius: 16, padding: '22px 24px', width: 340,
            boxShadow: 'var(--shadow)',
          }} onClick={e => e.stopPropagation()} className="fade-up">
            <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', marginBottom: 16, letterSpacing: '-.3px' }}>
              어떤 형식으로 기록할까요?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
              {TEMPLATES.map(t => (
                <button key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  style={{
                    padding: '11px 14px', borderRadius: 10, textAlign: 'left',
                    background: selectedTemplate === t.id ? 'var(--a-dim)' : 'var(--bg3)',
                    border: `1.5px solid ${selectedTemplate === t.id ? 'rgba(212,168,75,.35)' : 'var(--border)'}`,
                    cursor: 'pointer', transition: 'all .15s',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: selectedTemplate === t.id ? 'var(--a)' : 'var(--ink)' }}>
                    {t.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{t.desc}</span>
                </button>
              ))}
            </div>
            <button onClick={handleConfirmTemplate} style={{
              width: '100%', padding: '12px', background: 'var(--a)', color: '#000',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif",
            }}>생성하기</button>
            <button onClick={() => setShowTemplateModal(false)} style={{
              width: '100%', marginTop: 8, padding: '9px', background: 'none',
              border: 'none', fontSize: 12.5, color: 'var(--ink3)', cursor: 'pointer',
            }}>취소</button>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupItem({ group, onSaveMemo }) {
  const [expanded, setExpanded] = useState(false)
  const icon = getAppIcon(group.app_name)
  const hasMemo = group.activities.some(a => a.memo)

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <button onClick={() => setExpanded(e => !e)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', background: 'none', border: 'none',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{group.app_name}</span>
            <span className="chip chip-dim">{formatDuration(group.totalSec)}</span>
            <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{group.activities.length}회 전환</span>
            {hasMemo && <span style={{ fontSize: 11, color: 'var(--a)' }}>📝</span>}
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink3)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </button>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {group.activities.map((a, i) => (
            <div key={a.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12 }}>
              <span style={{ color: 'var(--ink4)', fontFamily: 'monospace', flexShrink: 0, paddingTop: 1 }}>
                {formatTime(a.started_at)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {a.window_title && (
                  <p style={{ color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.window_title}
                  </p>
                )}
                {a.memo && (
                  <p style={{ color: 'var(--a)', marginTop: 2 }}>📝 {a.memo}</p>
                )}
              </div>
              <span className="chip chip-dim" style={{ flexShrink: 0 }}>{formatDuration(a.duration_sec)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityItem({ activity, onSaveMemo }) {
  const [memo, setMemo] = useState(activity.memo || '')
  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hover, setHover] = useState(false)

  const appIcon = getAppIcon(activity.app_name)
  const startTime = formatTime(activity.started_at)
  const endTime = formatTime(activity.ended_at)
  const duration = formatDuration(activity.duration_sec)
  const isShort = (activity.duration_sec || 0) < 300
  const isMerged = activity.merged_ids?.length > 1

  async function handleSave() {
    await onSaveMemo(activity.id, memo)
    setIsEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div style={{ display: 'flex', gap: 14, opacity: isShort && !isMerged ? 0.5 : 1 }}>
      <div style={{
        position: 'relative', zIndex: 10,
        width: 40, height: 40, borderRadius: '50%',
        background: isMerged ? 'var(--a-dim)' : isShort ? 'var(--bg3)' : 'var(--bg2)',
        border: isMerged ? '2px solid rgba(212,168,75,.35)' : isShort ? '1px solid var(--border)' : '1.5px solid var(--border2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, flexShrink: 0, marginTop: 2,
      }}>{appIcon}</div>

      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          flex: 1, background: 'var(--bg2)',
          border: `1px solid ${hover ? 'var(--border2)' : isMerged ? 'rgba(212,168,75,.2)' : 'var(--border)'}`,
          borderRadius: 12, padding: '12px 14px', transition: 'border-color .15s', marginBottom: 2,
        }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5 }}>{activity.app_name}</span>
              <span className={`chip ${isMerged ? 'chip-a' : 'chip-b'}`}>{duration}</span>
              {isMerged && (
                <span className="chip chip-a" title="짧은 활동이 통합됨">🔗 {activity.merged_ids.length}개</span>
              )}
            </div>
            {activity.window_title && (
              <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activity.window_title}
              </p>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'monospace', flexShrink: 0, textAlign: 'right', lineHeight: 1.6 }}>
            <div>{startTime}</div>
            <div style={{ color: 'var(--border2)', textAlign: 'center' }}>↓</div>
            <div>{endTime}</div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={memo}
                onChange={e => setMemo(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') { setIsEditing(false); setMemo(activity.memo || '') }
                }}
                placeholder="메모 입력 (Enter 저장)" autoFocus
                style={{
                  flex: 1, fontSize: 12.5,
                  background: 'var(--bg3)', border: '1.5px solid var(--a)',
                  borderRadius: 8, padding: '7px 12px', color: 'var(--ink)', outline: 'none',
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
              <button onClick={handleSave} style={sBtnStyle('var(--a)', '#000')}>저장</button>
              <button onClick={() => { setIsEditing(false); setMemo(activity.memo || '') }} style={sBtnStyle('var(--bg3)', 'var(--ink2)')}>취소</button>
            </div>
          ) : (
            <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, textAlign: 'left', padding: 0 }}>
              {memo ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--a-dim)', border: '1px solid rgba(212,168,75,.2)', padding: '4px 10px', borderRadius: 8, color: 'var(--ink2)', fontSize: 12 }}>
                  📝 {memo}
                  {saved && <span style={{ color: 'var(--g)', marginLeft: 4 }}>✓</span>}
                </span>
              ) : (
                <span style={{ color: 'var(--ink4)' }}
                  onMouseOver={e => { e.currentTarget.style.color = 'var(--a)' }}
                  onMouseOut={e => { e.currentTarget.style.color = 'var(--ink4)' }}>
                  + 메모 추가
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function sBtnStyle(bg, color) {
  return { padding: '7px 12px', borderRadius: 8, background: bg, color, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif", flexShrink: 0 }
}

function Spinner() {
  return <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>⟳</span>
}

function getAppIcon(appName) {
  const name = (appName || '').toLowerCase()
  if (name.includes('figma')) return '🎨'
  if (name.includes('slack')) return '💬'
  if (name.includes('zoom') || name.includes('teams') || name.includes('meet')) return '📹'
  if (name.includes('chrome') || name.includes('safari') || name.includes('firefox') || name.includes('edge')) return '🌐'
  if (name.includes('code') || name.includes('cursor') || name.includes('idea') || name.includes('xcode') || name.includes('vim')) return '💻'
  if (name.includes('excel') || name.includes('sheets')) return '📊'
  if (name.includes('word') || name.includes('docs')) return '📄'
  if (name.includes('powerpoint') || name.includes('keynote') || name.includes('slides')) return '📽️'
  if (name.includes('notion')) return '📝'
  if (name.includes('terminal') || name.includes('iterm') || name.includes('cmd') || name.includes('powershell') || name.includes('wt')) return '⌨️'
  if (name.includes('mail') || name.includes('outlook')) return '📧'
  if (name.includes('finder') || name.includes('explorer')) return '📁'
  if (name.includes('photoshop') || name.includes('illustrator') || name.includes('xd')) return '🖌️'
  if (name.includes('spotify') || name.includes('music')) return '🎵'
  return '🖥️'
}

function formatTime(isoString) {
  if (!isoString) return '--:--'
  const d = new Date(isoString)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(sec) {
  if (!sec || sec < 60) return `${sec || 0}초`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}
