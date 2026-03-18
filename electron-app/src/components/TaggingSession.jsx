import { useState, useMemo } from 'react'

export default function TaggingSession({ timeline, onComplete }) {
  // 앱별로 그룹핑
  const groups = useMemo(() => groupByApp(timeline), [timeline])
  const [tags, setTags] = useState(() => {
    const init = {}
    groups.forEach(g => { init[g.appName] = g.existingMemo })
    return init
  })
  const [saving, setSaving] = useState(false)

  async function handleComplete() {
    setSaving(true)
    // 각 그룹의 태그를 대표 활동(가장 긴 것)에 저장
    for (const g of groups) {
      const tag = tags[g.appName]?.trim()
      if (tag) await window.careerlog.saveTag(g.representativeId, tag)
    }
    setSaving(false)
    onComplete()
  }

  const filledCount = groups.filter(g => tags[g.appName]?.trim()).length

  return (
    <div style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      maxWidth: 560, margin: '0 auto', padding: '28px 24px',
    }} className="fade-up">

      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 24, color: 'var(--ink)', letterSpacing: '-.3px', marginBottom: 6,
        }}>
          오늘 업무를 정리해볼까요?
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink3)', lineHeight: 1.6 }}>
          각 앱에서 어떤 업무를 했는지 간단히 적어주세요.<br />
          AI가 더 정확한 경력 기록을 만들 수 있습니다.
        </p>
      </div>

      {/* 진행률 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>태깅 완료</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--a)' }}>
            {filledCount} / {groups.length}
          </span>
        </div>
        <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2 }}>
          <div style={{
            height: '100%', borderRadius: 2, background: 'var(--a)',
            width: `${groups.length ? (filledCount / groups.length) * 100 : 0}%`,
            transition: 'width .3s',
          }} />
        </div>
      </div>

      {/* 앱 그룹 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {groups.map(g => (
          <AppTagCard
            key={g.appName}
            group={g}
            value={tags[g.appName] || ''}
            onChange={val => setTags(prev => ({ ...prev, [g.appName]: val }))}
          />
        ))}
      </div>

      {/* 하단 버튼 */}
      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <button onClick={handleComplete} disabled={saving} style={{
          flex: 1, padding: '13px 0',
          background: 'var(--a)', color: '#000',
          border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
          fontFamily: "'Noto Sans KR', sans-serif",
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? '저장 중...' : filledCount > 0 ? `저장하고 타임라인 보기 (${filledCount}개 태깅됨)` : '건너뛰고 타임라인 보기'}
        </button>
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--ink4)', textAlign: 'center', marginTop: 10 }}>
        나중에 타임라인에서도 수정할 수 있습니다
      </p>
    </div>
  )
}

function AppTagCard({ group, value, onChange }) {
  const [focused, setFocused] = useState(false)

  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${focused ? 'var(--a)' : value ? 'rgba(212,168,75,.2)' : 'var(--border)'}`,
      borderRadius: 12, padding: '14px 16px',
      transition: 'border-color .15s',
    }}>
      {/* 앱 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{
          width: 36, height: 36, borderRadius: '50%',
          background: value ? 'var(--a-dim)' : 'var(--bg3)',
          border: `1.5px solid ${value ? 'rgba(212,168,75,.3)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0, transition: 'all .15s',
        }}>{group.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{group.appName}</span>
            <span style={{
              fontSize: 11.5, background: 'var(--bg3)', color: 'var(--ink3)',
              border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 20,
            }}>{formatDur(group.totalSec)}</span>
          </div>
          {group.topTitle && (
            <p style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.topTitle}
            </p>
          )}
        </div>
        {value && <span style={{ fontSize: 14, color: 'var(--g)', flexShrink: 0 }}>✓</span>}
      </div>

      {/* 태그 입력 */}
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={getPlaceholder(group.appName)}
        style={{
          width: '100%', padding: '9px 12px',
          background: 'var(--bg3)',
          border: `1.5px solid ${focused ? 'var(--a)' : 'var(--border)'}`,
          borderRadius: 8, fontSize: 13, color: 'var(--ink)',
          fontFamily: "'Noto Sans KR', sans-serif",
          outline: 'none', transition: 'border-color .15s',
        }}
      />
    </div>
  )
}

// ── 유틸 ──────────────────────────────────────────────────

function groupByApp(activities) {
  const map = new Map()
  for (const a of activities) {
    const key = a.app_name
    if (!map.has(key)) {
      map.set(key, {
        appName: key,
        icon: getAppIcon(key),
        totalSec: 0,
        activities: [],
        topTitle: '',
        representativeId: a.id,
        existingMemo: a.memo || '',
      })
    }
    const g = map.get(key)
    g.totalSec += (a.duration_sec || 0)
    g.activities.push(a)
    if ((a.window_title || '').length > g.topTitle.length) g.topTitle = a.window_title || ''
    if ((a.duration_sec || 0) > (activities.find(x => x.id === g.representativeId)?.duration_sec || 0)) {
      g.representativeId = a.id
    }
    if (a.memo && !g.existingMemo) g.existingMemo = a.memo
  }
  // 총 시간 기준 내림차순
  return [...map.values()].sort((a, b) => b.totalSec - a.totalSec)
}

function formatDur(sec) {
  if (!sec || sec < 60) return `${sec || 0}초`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

function getPlaceholder(appName) {
  const n = (appName || '').toLowerCase()
  if (n.includes('figma'))   return '예: 메인 화면 UI 기획, 컴포넌트 정리...'
  if (n.includes('code') || n.includes('cursor')) return '예: 로그인 기능 개발, 버그 수정...'
  if (n.includes('chrome') || n.includes('edge') || n.includes('firefox')) return '예: 경쟁사 리서치, 기술 문서 학습...'
  if (n.includes('slack'))   return '예: 팀 미팅, 이슈 논의...'
  if (n.includes('notion'))  return '예: 기획서 작성, 회의록 정리...'
  if (n.includes('zoom') || n.includes('teams') || n.includes('meet')) return '예: 주간 팀 미팅, 클라이언트 미팅...'
  if (n.includes('excel') || n.includes('sheets')) return '예: 데이터 분석, 예산 정리...'
  return '예: 이 시간에 어떤 업무를 했나요?'
}

function getAppIcon(appName) {
  const name = (appName || '').toLowerCase()
  if (name.includes('figma')) return '🎨'
  if (name.includes('slack')) return '💬'
  if (name.includes('zoom') || name.includes('teams') || name.includes('meet')) return '📹'
  if (name.includes('chrome') || name.includes('safari') || name.includes('firefox') || name.includes('edge')) return '🌐'
  if (name.includes('code') || name.includes('cursor') || name.includes('idea') || name.includes('vim')) return '💻'
  if (name.includes('excel') || name.includes('sheets')) return '📊'
  if (name.includes('word') || name.includes('docs')) return '📄'
  if (name.includes('notion')) return '📝'
  if (name.includes('terminal') || name.includes('cmd') || name.includes('powershell')) return '⌨️'
  if (name.includes('mail') || name.includes('outlook')) return '📧'
  return '🖥️'
}
