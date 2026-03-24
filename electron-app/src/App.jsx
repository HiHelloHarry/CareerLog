import { useState, useEffect, useRef } from 'react'
import Home from './components/Home'
import Timeline from './components/Timeline'
import CareerResult from './components/CareerResult'
import Settings from './components/Settings'
import Done from './components/Done'
import Onboarding from './components/Onboarding'
import TaggingSession from './components/TaggingSession'
import Dashboard from './components/Dashboard'

const NAV = [
  { id: 'home',      icon: '⊙', tip: '홈' },
  { id: 'timeline',  icon: '▤',  tip: '타임라인' },
  { id: 'dashboard', icon: '◈',  tip: '대시보드' },
  { id: 'career',    icon: '✦',  tip: '경력 기록' },
  { id: 'settings',  icon: '⚙',  tip: '설정' },
]

export default function App() {
  const [view, setView] = useState('loading')
  const [isTracking, setIsTracking] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [session, setSession] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [careerContent, setCareerContent] = useState(null)
  const [careerStar, setCareerStar] = useState(null)
  const [careerRecords, setCareerRecords] = useState([])
  const [sessions, setSessions] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [canGenerate, setCanGenerate] = useState(false)
  const [error, setError] = useState(null)
  const [showTagging, setShowTagging] = useState(false)

  // useRef로 sessionId 최신값 항상 유지 (onNavigate 등 클로저에서 사용)
  const sessionIdRef = useRef(null)
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  useEffect(() => {
    async function init() {
      try {
        const [settings, hasKey, status, lastSession] = await Promise.all([
          window.careerlog.getAppSettings(),
          window.careerlog.hasApiKey(),
          window.careerlog.getStatus(),
          window.careerlog.getLastSession(),
        ])
        setCanGenerate(true) // 백엔드 무료 크레딧 제공으로 항상 생성 가능
        void hasKey // 자체 API 키 여부는 Settings에서만 표시

        // 온보딩 체크
        if (settings.first_launch && !settings.onboarding_completed) {
          setView('onboarding')
          return
        }

        const { isTracking, sessionId } = status
        // session을 isTracking과 동시에 세팅 → Home이 sessionStartedAt 없이 렌더링되는 일 방지
        setIsTracking(isTracking)
        setSessionId(sessionId)
        if (lastSession) setSession(lastSession)
        if (sessionId && !isTracking) {
          await loadTimeline(sessionId)
          setView('timeline')
          return
        }
        setView('home')
      } catch (err) {
        console.error('[init error]', err)
        setView('home')
      }
    }
    init()

    window.careerlog.onNavigate(async (v) => {
      setView(v)
      // 트레이에서 홈으로 복귀 시 세션 갱신 (타이머 started_at 보장)
      if (v === 'home') {
        const [s, status] = await Promise.all([
          window.careerlog.getLastSession(),
          window.careerlog.getStatus(),
        ])
        if (s) setSession(s)
        // 트레이 복귀 시 isTracking / sessionId 재동기화 (타이머 리셋 방지)
        setIsTracking(status.isTracking)
        if (status.sessionId) setSessionId(status.sessionId)
      }
      if (v === 'timeline') {
        // sessionIdRef가 아직 null일 경우 main process에서 직접 조회
        let sid = sessionIdRef.current
        if (!sid) {
          const status = await window.careerlog.getStatus()
          sid = status.sessionId
          if (sid) setSessionId(sid)
        }
        if (sid) {
          await loadTimeline(sid)
          const settings = await window.careerlog.getAppSettings()
          setShowTagging(!settings.skip_tagging)
        }
      }
      if (v === 'career') loadCareerRecords()
    })

    window.careerlog.onTrackingStatus(async ({ isTracking, sessionId }) => {
      setIsTracking(isTracking)
      setSessionId(sessionId)
      if (sessionId) {
        const s = await window.careerlog.getLastSession()
        setSession(s)
      }
    })
  }, [])

  async function loadTimeline(sid) {
    const t = await window.careerlog.getTimeline(sid)
    setTimeline(t)
    const allSessions = await window.careerlog.getSessions()
    setSessions(allSessions)
  }

  async function loadCareerRecords() {
    const records = await window.careerlog.getCareerRecords()
    setCareerRecords(records)
  }

  // 경력 기록이 없는 완료 세션 수 (타임라인 nav 배지용)
  const unrecordedCount = sessions.filter(s => !s.has_career_record).length

  async function handleStart(project = '') {
    const res = await window.careerlog.startTracking(project)
    setSessionId(res.sessionId)
    setIsTracking(true)
    const s = await window.careerlog.getLastSession()
    setSession(s)
  }

  async function handleStop() {
    setError(null)
    await window.careerlog.stopTracking()
    setIsTracking(false)
    await new Promise(r => setTimeout(r, 200))
    // React state 대신 DB에서 직접 마지막 세션 조회 (state 불일치 방지)
    const lastSession = await window.careerlog.getLastSession()
    const sid = lastSession?.id
    if (sid) {
      setSessionId(sid)
      setSession(lastSession)
      await loadTimeline(sid)
      const settings = await window.careerlog.getAppSettings()
      setShowTagging(!settings.skip_tagging)
    }
    setView('timeline')
  }

  async function handleSaveMemo(activityId, memo) {
    await window.careerlog.saveMemo(activityId, memo)
    setTimeline(prev => prev.map(a => a.id === activityId ? { ...a, memo } : a))
  }

  async function handleGenerate(template = 'star') {
    if (!sessionId) return
    setIsGenerating(true)
    setError(null)
    const result = await window.careerlog.generateCareerRecord(sessionId, template)
    setIsGenerating(false)
    if (result.error) { setError(result.error); return }
    setCareerContent(result.content)
    setCareerStar(result.star || null)
    await loadCareerRecords()
    setView('done')
  }

  async function handleNavigateCareer() {
    await loadCareerRecords()
    setView('career')
  }

  function handleTaggingComplete() {
    setShowTagging(false)
  }

  async function refreshApiKeyState() {
    const has = await window.careerlog.hasApiKey()
    setCanGenerate(has)
  }

  function handleNavClick(id) {
    setError(null)
    if (id === 'career') { handleNavigateCareer(); return }
    if (id === 'timeline') { handleNavigateTimeline(); return }
    setView(id)
  }

  async function handleNavigateTimeline(targetDate) {
    setView('timeline')
    const allSessions = await window.careerlog.getSessions() // 최신순
    let sid = sessionId
    // 날짜가 지정된 경우 해당 날짜의 세션으로 이동
    if (targetDate) {
      const matched = allSessions.find(s => s.date === targetDate)
      if (matched) {
        sid = matched.id
        setSessionId(sid)
        const s = await window.careerlog.getSession(sid)
        setSession(s)
      }
    } else if (!sid) {
      if (allSessions.length > 0) {
        sid = allSessions[0].id
        setSessionId(sid)
        const s = await window.careerlog.getSession(sid)
        setSession(s)
      }
    }
    if (sid) await loadTimeline(sid)
  }

  // 온보딩 완료 처리
  async function handleOnboardingComplete(action, sampleSessionId) {
    if (action === 'sample' && sampleSessionId) {
      setSessionId(sampleSessionId)
      const s = await window.careerlog.getLastSession()
      setSession(s)
      await loadTimeline(sampleSessionId)
      await loadCareerRecords()
      setView('career')
      return
    }
    setView('home')
  }

  const showNav = !['loading', 'onboarding', 'done'].includes(view)

  if (view === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--ink3)', fontSize: 13 }}>로딩 중...</div>
      </div>
    )
  }

  if (view === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  if (view === 'done') {
    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
        <Done
          star={careerStar}
          content={careerContent}
          onViewRecord={() => { handleNavigateCareer() }}
          onHome={() => setView('home')}
          onAddMore={() => setView('timeline')}
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* ── Left Rail ── */}
      {showNav && (
        <aside style={{
          width: 58, minWidth: 58, background: 'var(--bg2)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '14px 0 16px', zIndex: 50,
        }}>
          <div
            onClick={() => setView('home')}
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'var(--a)', color: '#000',
              fontFamily: "'DM Serif Display', serif", fontSize: 16, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24, cursor: 'pointer',
            }}
          >C</div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, width: '100%', padding: '0 7px' }}>
            {NAV.map(({ id, icon, tip }) => (
              <RailItem key={id} icon={icon} tip={tip} active={view === id} onClick={() => handleNavClick(id)} badge={id === 'timeline' && unrecordedCount > 0 ? unrecordedCount : 0} />
            ))}
          </nav>

          {isTracking && (
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--g)', marginBottom: 4,
              boxShadow: '0 0 0 3px rgba(82,183,136,.2)',
            }} />
          )}
        </aside>
      )}

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {error && (
          <div style={{
            margin: '10px 16px 0', padding: '10px 14px',
            background: 'var(--r-dim)', border: '1px solid rgba(224,112,112,.25)',
            borderRadius: 10, color: 'var(--r)',
            fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--r)', cursor: 'pointer', fontSize: 14, marginLeft: 10 }}>✕</button>
          </div>
        )}

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {view === 'home' && (
            <Home
              isTracking={isTracking}
              canGenerate={canGenerate}
              sessionStartedAt={session?.started_at}
              onStart={handleStart}
              onStop={handleStop}
              onOpenTimeline={() => setView('timeline')}
              onOpenSettings={() => setView('settings')}
            />
          )}
          {view === 'timeline' && showTagging && timeline.length > 0 && (
            <TaggingSession
              timeline={timeline}
              onComplete={handleTaggingComplete}
            />
          )}
          {view === 'timeline' && !(showTagging && timeline.length > 0) && (
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 24px' }}>
              <Timeline
                timeline={timeline}
                session={session}
                sessions={sessions}
                canGenerate={canGenerate}
                onSaveMemo={handleSaveMemo}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
                onSelectSession={async (sid) => {
                  setSessionId(sid)
                  const s = await window.careerlog.getSession(sid)
                  setSession(s)
                  await loadTimeline(sid)
                }}
              />
            </div>
          )}
          {view === 'dashboard' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <Dashboard
                onGoCareer={handleNavigateCareer}
                onGoTimeline={(date) => handleNavigateTimeline(date)}
              />
            </div>
          )}
          {view === 'career' && (
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 20px 24px' }}>
              <CareerResult
                content={careerContent}
                star={careerStar}
                records={careerRecords}
                onBack={() => setView('timeline')}
                onRecordDeleted={(id) => {
                  setCareerRecords(prev => prev.filter(r => r.id !== id))
                }}
                onRecordRegenerated={() => loadCareerRecords()}
              />
            </div>
          )}
          {view === 'settings' && (
            <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 20px 24px' }}>
              <Settings onApiKeySaved={refreshApiKeyState} />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function RailItem({ icon, tip, active, onClick, badge = 0 }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={tip}
      style={{
        position: 'relative',
        width: 44, height: 44, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, cursor: 'pointer', border: 'none',
        background: active ? 'var(--a-dim)' : hover ? 'var(--bg3)' : 'transparent',
        color: active ? 'var(--a)' : hover ? 'var(--ink)' : 'var(--ink3)',
        transition: 'all .15s',
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: -7, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 22, background: 'var(--a)', borderRadius: '0 3px 3px 0',
        }} />
      )}
      {icon}
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          minWidth: 14, height: 14, borderRadius: 7, padding: '0 3px',
          background: 'var(--a)', color: '#000',
          fontSize: 9, fontWeight: 800, lineHeight: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{badge > 9 ? '9+' : badge}</span>
      )}
      {hover && (
        <span style={{
          position: 'absolute', left: 'calc(100% + 10px)', top: '50%', transform: 'translateY(-50%)',
          background: 'var(--ink)', color: 'var(--bg)',
          fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 7,
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 200,
          fontFamily: "'Noto Sans KR', sans-serif",
        }}>{tip}</span>
      )}
    </button>
  )
}
