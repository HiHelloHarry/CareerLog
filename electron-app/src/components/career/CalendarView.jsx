import { useState, useMemo } from 'react'

const DOW = ['월', '화', '수', '목', '금', '토', '일']

const TAG_COLORS = {
  dev:  { bg: 'rgba(95,168,211,.15)',  color: 'var(--b)' },
  plan: { bg: 'rgba(212,168,75,.15)',  color: 'var(--a)' },
  data: { bg: 'rgba(82,183,136,.15)',  color: 'var(--g)' },
  api:  { bg: 'rgba(224,112,112,.15)', color: 'var(--r)' },
  etc:  { bg: 'var(--bg3)',            color: 'var(--ink3)' },
}

function projectToTag(project) {
  if (!project) return 'etc'
  const p = project.toLowerCase()
  if (p.includes('개발') || p.includes('dev') || p.includes('코딩')) return 'dev'
  if (p.includes('기획') || p.includes('디자인') || p.includes('plan') || p.includes('ux')) return 'plan'
  if (p.includes('데이터') || p.includes('분석') || p.includes('data')) return 'data'
  if (p.includes('api') || p.includes('서버') || p.includes('백엔드')) return 'api'
  return 'etc'
}

export default function CalendarView({ records, selectedDate, onSelectDate }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed

  // records를 날짜별로 그룹핑
  const recordsByDate = useMemo(() => {
    const map = {}
    ;(records || []).forEach(r => {
      const d = r.created_at ? r.created_at.slice(0, 10) : null
      if (!d) return
      if (!map[d]) map[d] = []
      map[d].push(r)
    })
    return map
  }, [records])

  const firstDay = new Date(year, month, 1)
  // 월요일 시작: 0=월 ~ 6=일
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (isCurrentMonth) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  const cells = []
  // 빈 칸
  for (let i = 0; i < startDow; i++) cells.push(null)
  // 날짜
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthLabel = `${year}년 ${month + 1}월`
  const prevLabel = month === 0 ? '12월' : `${month}월`
  const nextLabel = month === 11 ? '1월' : `${month + 2}월`

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 18px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{monthLabel}</div>
        <div style={{ display: 'flex', gap: 5 }}>
          <NavBtn onClick={prevMonth}>← {prevLabel}</NavBtn>
          <NavBtn onClick={goToday} highlight={!isCurrentMonth}>오늘</NavBtn>
          <NavBtn onClick={nextMonth} disabled={isCurrentMonth}>{nextLabel} →</NavBtn>
        </div>
      </div>

      {/* DOW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 10.5, fontWeight: 600, padding: '4px 0',
            color: i === 5 ? 'var(--b)' : i === 6 ? 'var(--r)' : 'var(--ink4)',
          }}>{d}</div>
        ))}

        {/* Cells */}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} />

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayRecords = recordsByDate[dateStr] || []
          const hasRecord = dayRecords.length > 0
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate

          return (
            <div
              key={day}
              onClick={() => hasRecord && onSelectDate?.(dateStr)}
              style={{
                aspectRatio: '1',
                borderRadius: 8,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'flex-start',
                padding: '4px 2px', minHeight: 46,
                cursor: hasRecord ? 'pointer' : 'default',
                transition: 'all .12s',
                background: isSelected ? 'var(--a-dim)' : hasRecord ? 'rgba(82,183,136,.06)' : 'transparent',
                border: isSelected ? '1.5px solid var(--a)' : isToday ? '1px solid rgba(212,168,75,.25)' : '1px solid transparent',
              }}
              onMouseOver={e => {
                if (hasRecord && !isSelected) e.currentTarget.style.background = 'rgba(82,183,136,.12)'
              }}
              onMouseOut={e => {
                if (!isSelected) e.currentTarget.style.background = hasRecord ? 'rgba(82,183,136,.06)' : 'transparent'
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: isToday ? 700 : 600,
                color: isToday ? 'var(--a)' : 'var(--ink3)',
              }}>{day}</span>
              {/* Tags */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2, width: '100%', overflow: 'hidden', maxHeight: 26 }}>
                {dayRecords.slice(0, 2).map((r, j) => {
                  const tag = projectToTag(r.project)
                  const tc = TAG_COLORS[tag]
                  const label = r.project ? r.project.replace(/개발|기획|분석|설계/g, '').trim().slice(0, 6) || r.project.slice(0, 4) : ''
                  return (
                    <div key={j} style={{
                      fontSize: 7.5, fontWeight: 600, padding: '1px 3px', borderRadius: 3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      textAlign: 'center', lineHeight: 1.4,
                      background: tc.bg, color: tc.color,
                    }}>{label || '기록'}</div>
                  )
                })}
                {dayRecords.length > 2 && (
                  <div style={{ fontSize: 7, color: 'var(--ink4)', textAlign: 'center' }}>+{dayRecords.length - 2}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function NavBtn({ children, onClick, disabled, highlight }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px', borderRadius: 6,
        border: `1px solid ${highlight ? 'var(--a)' : 'var(--border2)'}`,
        background: 'var(--bg3)', fontSize: 11.5,
        color: disabled ? 'var(--ink4)' : highlight ? 'var(--a)' : 'var(--ink3)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: "'Noto Sans KR', sans-serif",
        transition: 'all .15s',
      }}
    >{children}</button>
  )
}
