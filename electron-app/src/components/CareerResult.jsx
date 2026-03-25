import { useState, useEffect, useMemo } from 'react'
import ProfileHero from './career/ProfileHero'
import CalendarView from './career/CalendarView'
import RecordCard from './career/RecordCard'
import DetailDrawer from './career/DetailDrawer'

export default function CareerResult({ content, star, records, onBack, onRecordDeleted, onRecordRegenerated }) {
  const [stats, setStats] = useState(null)
  const [settings, setSettings] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [projectFilter, setProjectFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // 데이터 로드
  useEffect(() => {
    window.careerlog.getDashboardStats().then(setStats)
    window.careerlog.getAppSettings().then(setSettings)
  }, [])

  // 방금 생성된 기록이 있으면 드로어 자동 열기
  useEffect(() => {
    if (content && records?.length > 0 && !selectedId) {
      setSelectedId(records[0].id)
    }
  }, [content])

  // 프로젝트 목록
  const projects = useMemo(() =>
    [...new Set((records || []).map(r => r.project).filter(Boolean))],
    [records]
  )

  // 필터링
  const filteredRecords = useMemo(() => {
    let list = records || []
    if (selectedDate) {
      list = list.filter(r => r.created_at?.startsWith(selectedDate))
    }
    if (projectFilter) {
      list = list.filter(r => r.project === projectFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(r => {
        const text = [
          r.content, r.project,
          r.star?.situation, r.star?.task, r.star?.action, r.star?.result,
          ...(r.star?.skills || []), ...(r.star?.bullets || []),
        ].filter(Boolean).join(' ').toLowerCase()
        return text.includes(q)
      })
    }
    return list
  }, [records, selectedDate, projectFilter, searchQuery])

  // 월별 그룹핑
  const groupedByMonth = useMemo(() => {
    const groups = new Map()
    filteredRecords.forEach(r => {
      const d = r.created_at ? new Date(r.created_at) : null
      if (!d) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${d.getMonth() + 1}월`
      if (!groups.has(key)) groups.set(key, { label, records: [] })
      groups.get(key).records.push(r)
    })
    return groups
  }, [filteredRecords])

  const selectedRecord = selectedId
    ? (records || []).find(r => r.id === selectedId) || null
    : null

  function handleSelectDate(dateStr) {
    if (selectedDate === dateStr) {
      setSelectedDate(null) // 토글
    } else {
      setSelectedDate(dateStr)
    }
    setSelectedId(null)
  }

  function handleClearFilters() {
    setSelectedDate(null)
    setProjectFilter('')
    setSearchQuery('')
  }

  // 빈 상태
  if (!records || records.length === 0) {
    if (!content) {
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
  }

  const isNewRecord = (r) => content && records?.[0]?.id === r.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-up">
      {/* ── Section 1: Profile + Dashboard ── */}
      <ProfileHero settings={settings} stats={stats} />

      {/* ── Section 2: Calendar ── */}
      <CalendarView
        records={records}
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
      />

      {/* ── Section 3: Record Cards ── */}
      <div>
        {/* Header + Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>경력 기록</span>
            <span style={{ fontSize: 12, color: 'var(--ink3)' }}>{filteredRecords.length}건</span>
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--a)',
                background: 'var(--a-dim)', color: 'var(--a)', cursor: 'pointer',
                fontFamily: "'Noto Sans KR', sans-serif",
              }}>
                {selectedDate.slice(5)} ✕
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {projects.length > 0 && (
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                style={{
                  padding: '6px 10px', background: 'var(--bg2)',
                  border: '1px solid var(--border2)', borderRadius: 7,
                  fontSize: 11.5, color: 'var(--ink2)', cursor: 'pointer', outline: 'none',
                  fontFamily: "'Noto Sans KR', sans-serif",
                }}
              >
                <option value="">전체 프로젝트</option>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="검색..."
              style={{
                padding: '6px 10px', background: 'var(--bg2)',
                border: '1px solid var(--border2)', borderRadius: 7,
                fontSize: 11.5, color: 'var(--ink)', width: 140, outline: 'none',
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            />
          </div>
        </div>

        {/* Filtered results empty */}
        {filteredRecords.length === 0 && (records || []).length > 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--ink3)' }}>
              {searchQuery ? `'${searchQuery}'에 해당하는 기록이 없습니다` : '해당 조건의 기록이 없습니다'}
            </p>
            <button onClick={handleClearFilters} style={{
              marginTop: 12, padding: '6px 16px', borderRadius: 8,
              border: '1px solid var(--border2)', background: 'var(--bg2)',
              color: 'var(--ink2)', fontSize: 12, cursor: 'pointer',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>필터 초기화</button>
          </div>
        )}

        {/* Monthly groups */}
        {[...groupedByMonth.entries()].map(([key, { label, records: monthRecords }]) => (
          <div key={key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 10px' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>{label}</span>
              <span style={{ fontSize: 11, color: 'var(--ink4)' }}>{monthRecords.length}건</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {monthRecords.map(r => (
                <RecordCard
                  key={r.id}
                  record={r}
                  isNew={isNewRecord(r)}
                  isSelected={selectedId === r.id}
                  onClick={() => setSelectedId(r.id)}
                />
              ))}
            </div>
          </div>
        ))}

        <p style={{ fontSize: 11.5, color: 'var(--ink3)', textAlign: 'center', marginTop: 20 }}>
          이 기록은 로컬에 저장됩니다 · 이력서·경력기술서에 바로 활용하세요
        </p>
      </div>

      {/* ── Detail Drawer ── */}
      <DetailDrawer
        record={selectedRecord}
        records={filteredRecords}
        onClose={() => setSelectedId(null)}
        onNavigate={(id) => setSelectedId(id)}
        onDelete={(id) => {
          setSelectedId(null)
          if (onRecordDeleted) onRecordDeleted(id)
        }}
        onRegenerate={() => {
          if (onRecordRegenerated) onRecordRegenerated()
        }}
        onSave={() => {
          if (onRecordRegenerated) onRecordRegenerated()
        }}
      />
    </div>
  )
}
