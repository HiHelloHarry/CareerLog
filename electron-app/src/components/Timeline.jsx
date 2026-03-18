import { useState } from 'react'

export default function Timeline({ timeline, session, canGenerate, onSaveMemo, onGenerate, isGenerating }) {
  if (!timeline.length) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink3)' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>▤</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink2)' }}>기록된 업무가 없습니다</p>
        <p style={{ fontSize: 12.5, marginTop: 6, color: 'var(--ink3)' }}>홈에서 업무를 시작하세요</p>
      </div>
    )
  }

  const totalSec = timeline.reduce((sum, a) => sum + (a.duration_sec || 0), 0)
  const sessionDate = session?.date || timeline[0]?.started_at?.split('T')[0] || ''
  const dateLabel = sessionDate
    ? new Date(sessionDate + 'T12:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    : ''

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
          <p style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22, color: 'var(--ink)', letterSpacing: '-.3px',
          }}>
            {formatDuration(totalSec)} <span style={{ color: 'var(--ink2)', fontSize: 16 }}>기록</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{timeline.length}개 활동</span>
            {session?.project && (
              <span style={{
                fontSize: 11.5, background: 'var(--a-dim)', color: 'var(--a)',
                border: '1px solid rgba(212,168,75,.25)',
                padding: '2px 9px', borderRadius: 20, fontWeight: 600,
              }}>📁 {session.project}</span>
            )}
          </div>
        </div>

        {canGenerate ? (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            style={{
              background: 'var(--a)', color: '#000',
              border: 'none', borderRadius: 12,
              padding: '10px 16px', fontSize: 13, fontWeight: 700,
              cursor: isGenerating ? 'wait' : 'pointer',
              opacity: isGenerating ? 0.6 : 1,
              fontFamily: "'Noto Sans KR', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all .15s',
              flexShrink: 0,
            }}
            onMouseOver={e => { if (!isGenerating) e.currentTarget.style.background = '#e8bc5a' }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--a)' }}
          >
            {isGenerating ? <><Spinner /> 분석 중...</> : <>✦ 경력 기록 생성</>}
          </button>
        ) : (
          <button
            onClick={onGenerate}
            style={{
              background: 'var(--bg3)', color: 'var(--a)',
              border: '1px solid rgba(212,168,75,.3)',
              borderRadius: 12, padding: '10px 14px',
              fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif",
              flexShrink: 0, transition: 'all .15s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--a-dim)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--bg3)' }}
          >🔑 API 키 설정</button>
        )}
      </div>

      {/* 타임라인 리스트 */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 19, top: 6, bottom: 6,
          width: 1, background: 'var(--border)',
        }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {timeline.map((activity, idx) => (
            <ActivityItem key={activity.id || idx} activity={activity} onSaveMemo={onSaveMemo} />
          ))}
        </div>
      </div>
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

  const dotBg = isMerged ? 'var(--a-dim)' : isShort ? 'var(--bg3)' : 'var(--bg2)'
  const dotBorder = isMerged ? '2px solid rgba(212,168,75,.35)' : isShort ? '1px solid var(--border)' : '1.5px solid var(--border2)'
  const cardBorder = hover ? 'var(--border2)' : isMerged ? 'rgba(212,168,75,.2)' : 'var(--border)'

  return (
    <div style={{ display: 'flex', gap: 14, opacity: isShort && !isMerged ? 0.5 : 1 }}>
      {/* 타임라인 점 */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: 40, height: 40, borderRadius: '50%',
        background: dotBg, border: dotBorder,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, flexShrink: 0, marginTop: 2,
      }}>
        {appIcon}
      </div>

      {/* 카드 */}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          flex: 1, background: 'var(--bg2)',
          border: `1px solid ${cardBorder}`,
          borderRadius: 12, padding: '12px 14px',
          transition: 'border-color .15s', marginBottom: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5 }}>{activity.app_name}</span>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                background: isMerged ? 'var(--a-dim)' : 'var(--b-dim)',
                color: isMerged ? 'var(--a)' : 'var(--b)',
                border: `1px solid ${isMerged ? 'rgba(212,168,75,.25)' : 'rgba(95,168,211,.25)'}`,
              }}>{duration}</span>
              {isMerged && (
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 20,
                  background: 'var(--a-dim)', color: 'var(--a)',
                  border: '1px solid rgba(212,168,75,.25)', fontWeight: 600,
                  cursor: 'help',
                }} title="짧은 활동이 통합됨">
                  🔗 {activity.merged_ids.length}개
                </span>
              )}
            </div>
            {activity.window_title && (
              <p style={{
                fontSize: 11.5, color: 'var(--ink3)',
                marginTop: 3, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{activity.window_title}</p>
            )}
          </div>

          <div style={{
            fontSize: 11, color: 'var(--ink3)',
            fontFamily: 'monospace', flexShrink: 0,
            textAlign: 'right', lineHeight: 1.6,
          }}>
            <div>{startTime}</div>
            <div style={{ color: 'var(--border2)', textAlign: 'center' }}>↓</div>
            <div>{endTime}</div>
          </div>
        </div>

        {/* 메모 */}
        <div style={{ marginTop: 10 }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') { setIsEditing(false); setMemo(activity.memo || '') }
                }}
                placeholder="메모 입력 (Enter 저장, Esc 취소)"
                autoFocus
                style={{
                  flex: 1, fontSize: 12.5,
                  background: 'var(--bg3)', border: '1.5px solid var(--a)',
                  borderRadius: 8, padding: '7px 12px',
                  color: 'var(--ink)', outline: 'none',
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              />
              <button onClick={handleSave} style={btnStyle('var(--a)', '#000')}>저장</button>
              <button onClick={() => { setIsEditing(false); setMemo(activity.memo || '') }} style={btnStyle('var(--bg3)', 'var(--ink2)')}>취소</button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, textAlign: 'left', padding: 0,
              }}
            >
              {memo ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'var(--a-dim)', border: '1px solid rgba(212,168,75,.2)',
                  padding: '4px 10px', borderRadius: 8,
                  color: 'var(--ink2)', fontSize: 12,
                }}>
                  📝 {memo}
                  {saved && <span style={{ color: 'var(--g)', marginLeft: 4 }}>✓</span>}
                </span>
              ) : (
                <span style={{ color: 'var(--ink4)', transition: 'color .15s' }}
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

function btnStyle(bg, color) {
  return {
    padding: '7px 12px', borderRadius: 8,
    background: bg, color, border: 'none',
    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Noto Sans KR', sans-serif",
    transition: 'opacity .15s',
    flexShrink: 0,
  }
}

function Spinner() {
  return (
    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>⟳</span>
  )
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
