import { useState } from 'react'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

function fmtHours(h) {
  if (h === 0) return '0h'
  if (h < 1) return `${Math.round(h * 60)}m`
  return `${h}h`
}

export default function ProfileHero({ settings, stats }) {
  const [topFilter, setTopFilter] = useState('month')

  if (!stats) return null

  const { totalWorkDays, totalHours, totalRecords,
    weekTotalHours, weeklyHours, topWeekApp, weekDates, todayDate,
    streak, insight, topApps } = stats

  const name = settings?.user_name || 'User'
  const role = [settings?.job_role, settings?.job_level].filter(Boolean).join(' · ') || '직군/직급 미설정'
  const skills = settings?.skills || []

  const topAppList = topApps?.[topFilter] || []
  const maxTopH = topAppList[0]?.hours || 1

  // 이번 주 vs 지난주 비교 (간단)
  const todayIdx = weekDates?.indexOf(todayDate) ?? -1

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
      {/* Profile Card */}
      <div style={{
        width: 200, flexShrink: 0, background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--a), var(--g))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: '#000',
        }}>{name.charAt(0).toUpperCase()}</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 10, color: 'var(--ink)' }}>{name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 2 }}>{role}</div>
        {skills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10, justifyContent: 'center' }}>
            {skills.slice(0, 5).map((s, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                background: 'var(--bg3)', color: 'var(--ink3)', border: '1px solid var(--border2)',
              }}>{s}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border)', width: '100%', textAlign: 'center' }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: streak >= 7 ? 'var(--a)' : 'var(--ink)' }}>
            {streak || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
            {streak >= 1 ? `일 연속 기록 ${streak >= 7 ? '🔥' : ''}` : '연속 기록 시작하기'}
          </div>
        </div>
      </div>

      {/* Dashboard Stats Grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {/* 이번 주 */}
        <StatCard label="이번 주" value={`${weekTotalHours || 0}h`} highlight>
          {insight && (
            <div style={{ fontSize: 10.5, color: 'var(--a)', marginTop: 6, fontWeight: 600 }}>
              {insight.icon} {insight.text}
            </div>
          )}
        </StatCard>

        {/* 총 업무일 */}
        <StatCard label="총 업무 일수" value={`${totalWorkDays || 0}일`} />

        {/* 경력 기록 */}
        <StatCard label="경력 기록" value={`${totalRecords || 0}개`} />

        {/* 이번 주 바 차트 — 2열 */}
        <div style={{
          gridColumn: 'span 2', background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 8 }}>이번 주 일별</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {(weeklyHours || []).map(({ date, hours }, i) => {
              const isToday = date === todayDate
              const isFuture = todayIdx >= 0 && i > todayIdx
              const maxH = Math.max(...(weeklyHours || []).map(d => d.hours), 1)
              return (
                <div key={date} style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: isFuture ? 0.3 : 1 }}>
                  <div style={{ width: 16, fontSize: 10.5, color: isToday ? 'var(--a)' : 'var(--ink3)', fontWeight: isToday ? 700 : 400, textAlign: 'right', flexShrink: 0 }}>
                    {DAY_LABELS[i]}
                  </div>
                  <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--bg3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${hours > 0 ? Math.max((hours / maxH) * 100, 4) : 0}%`,
                      background: isToday ? 'var(--a)' : 'var(--ink3)',
                      transition: 'width .3s ease',
                    }} />
                  </div>
                  <div style={{ width: 28, fontSize: 10.5, color: 'var(--ink3)', textAlign: 'right', flexShrink: 0 }}>
                    {isFuture ? '' : fmtHours(hours)}
                  </div>
                </div>
              )
            })}
          </div>
          {topWeekApp && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink3)' }}>
              가장 많이: <span style={{ color: 'var(--ink2)' }}>{topWeekApp.name}</span> ({topWeekApp.hours}h)
            </div>
          )}
        </div>

        {/* Top 도구 */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--ink3)' }}>TOP 도구</div>
            <div style={{ display: 'flex', gap: 2 }}>
              {[['week', '주'], ['month', '월'], ['all', '전']].map(([k, l]) => (
                <button key={k} onClick={() => setTopFilter(k)} style={{
                  fontSize: 9.5, padding: '1px 6px', borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: topFilter === k ? 'var(--a-dim)' : 'transparent',
                  color: topFilter === k ? 'var(--a)' : 'var(--ink4)',
                }}>{l}</button>
              ))}
            </div>
          </div>
          {topAppList.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'center', padding: '8px 0' }}>기록이 쌓이면 나타나요</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topAppList.slice(0, 5).map(({ name, hours }) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ width: 50, color: 'var(--ink2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: 'var(--b)', width: `${Math.max((hours / maxTopH) * 100, 4)}%`, opacity: 0.7 }} />
                  </div>
                  <span style={{ width: 26, textAlign: 'right', color: 'var(--ink3)', fontSize: 10 }}>{hours}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight, children }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${highlight ? 'rgba(212,168,75,.3)' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', flexDirection: 'column',
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink3)', letterSpacing: '.3px' }}>{label}</span>
      <span style={{
        fontFamily: "'DM Serif Display', serif", fontSize: 24,
        color: highlight ? 'var(--a)' : 'var(--ink)', marginTop: 4,
      }}>{value}</span>
      {children}
    </div>
  )
}
