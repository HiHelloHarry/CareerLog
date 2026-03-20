import { useState, useEffect } from 'react'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function heatColor(hours) {
  if (hours <= 0)  return 'var(--bg3)'
  if (hours < 1)   return 'rgba(var(--a-rgb, 95,163,117), 0.25)'
  if (hours < 3)   return 'rgba(var(--a-rgb, 95,163,117), 0.55)'
  return 'var(--a)'
}

function fmtHours(h) {
  if (h === 0) return '0h'
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${h}h`
}

function relDate(dateStr) {
  const d = new Date(dateStr)
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  if (diff < 7)  return `${diff}일 전`
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`
  return `${Math.floor(diff / 30)}개월 전`
}

export default function Dashboard({ onGoCareer, onGoTimeline }) {
  const [stats, setStats] = useState(null)
  const [topFilter, setTopFilter] = useState('month')
  const [tooltip, setTooltip] = useState(null) // { date, hours, x, y }

  useEffect(() => {
    window.careerlog.getDashboardStats().then(setStats)
  }, [])

  if (!stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink3)', fontSize: 13 }}>
        불러오는 중...
      </div>
    )
  }

  // 완전 초기 상태
  if (stats.totalWorkDays === 0 && stats.totalRecords === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 32 }}>
        <div style={{ fontSize: 40 }}>📊</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', textAlign: 'center' }}>
          업무를 시작하면<br />여기에 쌓이기 시작해요
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink3)', textAlign: 'center' }}>
          홈에서 업무 기록을 시작해보세요
        </div>
      </div>
    )
  }

  const { totalWorkDays, totalHours, totalRecords, totalUniqueApps,
    weeklyHours, weekTotalHours, topWeekApp, weekDates,
    heatmap, recentRecords, topApps, todayDate } = stats

  const topAppList = topApps[topFilter] || []
  const maxTopHours = topAppList[0]?.hours || 1

  // 이번 주 히어로 문구
  const todayIdx = weekDates.indexOf(todayDate)
  let heroMsg
  if (weekTotalHours > 0) {
    heroMsg = `이번 주에 ${weekTotalHours}시간 일했어요`
  } else if (todayIdx === 0) {
    heroMsg = '이번 주를 시작했어요'
  } else {
    heroMsg = '이번 주 기록을 시작해보세요'
  }

  // 히트맵 12주 × 7일 배열로 재구성
  const heatRows = Array.from({ length: 7 }, (_, dayIdx) =>
    Array.from({ length: 12 }, (_, weekIdx) => heatmap[weekIdx * 7 + dayIdx] || null)
  )
  // 월 레이블 (4주마다)
  const monthLabels = Array.from({ length: 12 }, (_, wi) => {
    const cell = heatmap[wi * 7]
    if (!cell) return ''
    const d = new Date(cell.date)
    if (wi === 0 || d.getDate() <= 7) return `${d.getMonth() + 1}월`
    return ''
  })

  return (
    <div style={{ padding: '20px 24px 32px', maxWidth: 680, margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', letterSpacing: '-.3px' }}>
          내 커리어 현황
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 3 }}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ── Section A: 이번 주 히어로 카드 ── */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontFamily: "'DM Serif Display', serif", color: 'var(--ink)', marginBottom: 16 }}>
          {heroMsg}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {weeklyHours.map(({ date, hours }, i) => {
            const isToday = date === todayDate
            const isFuture = todayIdx >= 0 && i > todayIdx
            const maxH = Math.max(...weeklyHours.map(d => d.hours), 1)
            return (
              <div key={date} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: isFuture ? 0.3 : 1 }}>
                <div style={{ width: 18, fontSize: 11, color: isToday ? 'var(--a)' : 'var(--ink3)', fontWeight: isToday ? 700 : 400, textAlign: 'right', flexShrink: 0 }}>
                  {DAY_LABELS[i]}
                </div>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg3)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${hours > 0 ? Math.max((hours / maxH) * 100, 4) : 0}%`,
                    background: isToday ? 'var(--a)' : 'var(--ink3)',
                    transition: 'width .3s ease',
                  }} />
                </div>
                <div style={{ width: 32, fontSize: 11, color: 'var(--ink3)', textAlign: 'right', flexShrink: 0 }}>
                  {isFuture ? '' : fmtHours(hours)}
                </div>
              </div>
            )
          })}
        </div>
        {topWeekApp && (
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink3)' }}>
            가장 많이 한 일: <span style={{ color: 'var(--ink2)' }}>{topWeekApp.name}</span> ({topWeekApp.hours}h)
          </div>
        )}
      </Card>

      {/* ── Section B: 누적 카드 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { label: '총 업무 일수', value: `${totalWorkDays}일` },
          { label: '경력 기록 수', value: `${totalRecords}개` },
          { label: '총 추적 시간', value: `${totalHours}h` },
          { label: '다룬 앱/도구', value: `${totalUniqueApps}가지` },
        ].map(({ label, value }) => (
          <Card key={label} style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 22, fontFamily: "'DM Serif Display', serif", color: 'var(--ink)' }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* ── Section C: 히트맵 ── */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 10 }}>최근 12주 활동</div>
        {/* 월 레이블 */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 4, paddingLeft: 28 }}>
          {monthLabels.map((label, i) => (
            <div key={i} style={{ width: 18, fontSize: 9.5, color: 'var(--ink3)', textAlign: 'center', overflow: 'hidden' }}>
              {label}
            </div>
          ))}
        </div>
        {/* 요일별 행 */}
        {heatRows.map((row, dayIdx) => (
          <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
            <div style={{ width: 24, fontSize: 9.5, color: 'var(--ink3)', textAlign: 'right', paddingRight: 4, flexShrink: 0 }}>
              {[0, 2, 4].includes(dayIdx) ? DAY_LABELS[dayIdx] : ''}
            </div>
            {row.map((cell, wi) => {
              if (!cell) return <div key={wi} style={{ width: 18, height: 18 }} />
              const isFut = cell.date > todayDate
              return (
                <div
                  key={wi}
                  style={{
                    width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                    background: isFut ? 'transparent' : heatColor(cell.hours),
                    border: cell.date === todayDate ? '1.5px solid var(--a)' : '1.5px solid transparent',
                    cursor: cell.hours > 0 ? 'pointer' : 'default',
                    boxSizing: 'border-box',
                    transition: 'opacity .15s',
                  }}
                  onMouseEnter={e => {
                    if (isFut) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    setTooltip({ date: cell.date, hours: cell.hours, x: rect.left + rect.width / 2, y: rect.top })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => {
                    if (cell.hours > 0 && onGoTimeline) onGoTimeline(cell.date)
                  }}
                />
              )
            })}
          </div>
        ))}
        {/* 범례 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10, color: 'var(--ink3)' }}>적음</span>
          {[0, 0.5, 1.5, 4].map((h, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: heatColor(h) }} />
          ))}
          <span style={{ fontSize: 10, color: 'var(--ink3)' }}>많음</span>
        </div>
      </Card>

      {/* ── Section D: 최근 경력기록 ── */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 12 }}>최근 경력 기록</div>
        {recentRecords.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink3)', textAlign: 'center', padding: '12px 0' }}>
            경력 기록이 쌓이면 여기에 보여요
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentRecords.map(r => (
              <div key={r.id} style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg3)', cursor: 'pointer',
              }} onClick={onGoCareer}>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 4 }}>
                  {relDate(r.created_at)}{r.project ? ` · ${r.project}` : ''}
                </div>
                <div style={{
                  fontSize: 13, color: 'var(--ink2)', lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {r.firstBullet.replace(/^[•\-]\s*/, '')}
                </div>
              </div>
            ))}
          </div>
        )}
        {recentRecords.length > 0 && (
          <div
            onClick={onGoCareer}
            style={{ marginTop: 12, fontSize: 12, color: 'var(--a)', cursor: 'pointer', textAlign: 'right' }}
          >
            전체 경력 기록 보기 →
          </div>
        )}
      </Card>

      {/* ── Section G: 많이 쓴 앱 TOP 3 ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--ink3)' }}>많이 사용한 도구</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['week','이번 주'], ['month','이번 달'], ['all','전체']].map(([key, label]) => (
              <button key={key} onClick={() => setTopFilter(key)} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                background: topFilter === key ? 'var(--a-dim)' : 'transparent',
                color: topFilter === key ? 'var(--a)' : 'var(--ink3)',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {topAppList.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink3)', textAlign: 'center', padding: '12px 0' }}>
            기록이 쌓이면 나타나요
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topAppList.map(({ name, hours }) => (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink2)', marginBottom: 4 }}>
                  <span>{name}</span>
                  <span style={{ color: 'var(--ink3)' }}>{hours}h</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, background: 'var(--a)',
                    width: `${Math.max((hours / maxTopHours) * 100, 4)}%`,
                    transition: 'width .3s ease',
                    opacity: 0.7,
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 히트맵 툴팁 */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x, top: tooltip.y - 36,
          transform: 'translateX(-50%)',
          background: 'var(--ink)', color: 'var(--bg)',
          fontSize: 11, padding: '4px 9px', borderRadius: 6,
          pointerEvents: 'none', zIndex: 9999, whiteSpace: 'nowrap',
        }}>
          {tooltip.date} · {tooltip.hours > 0 ? `${tooltip.hours}h` : '기록 없음'}
        </div>
      )}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 18px',
      ...style,
    }}>
      {children}
    </div>
  )
}
