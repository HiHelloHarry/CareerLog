import { useState, useEffect } from 'react'
import Home from './components/Home'
import Timeline from './components/Timeline'
import CareerResult from './components/CareerResult'
import Settings from './components/Settings'

const NAV = [
  { id: 'home',     icon: '⊙', tip: '홈' },
  { id: 'timeline', icon: '▤',  tip: '타임라인' },
  { id: 'career',   icon: '✦',  tip: '경력 기록' },
  { id: 'settings', icon: '⚙',  tip: '설정' },
]

export default function App() {
  const [view, setView] = useState('home')
  const [isTracking, setIsTracking] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [session, setSession] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [careerContent, setCareerContent] = useState(null)
  const [careerRecords, setCareerRecords] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [canGenerate, setCanGenerate] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    window.careerlog.hasApiKey().then(has => setCanGenerate(has))

    window.careerlog.getStatus().then(async ({ isTracking, sessionId }) => {
      setIsTracking(isTracking)
      setSessionId(sessionId)
      if (sessionId) {
        const lastSession = await window.careerlog.getLastSession()
        setSession(lastSession)
        if (!isTracking) {
          await loadTimeline(sessionId)
          setView('timeline')
        }
      }
    })

    window.careerlog.onNavigate((v) => {
      setView(v)
      if (v === 'timeline' && sessionId) loadTimeline(sessionId)
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
  }

  async function loadCareerRecords() {
    const records = await window.careerlog.getCareerRecords()
    setCareerRecords(records)
  }

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
    if (sessionId) {
      await new Promise(r => setTimeout(r, 150))
      await loadTimeline(sessionId)
    }
    setView('timeline')
  }

  async function handleSaveMemo(activityId, memo) {
    await window.careerlog.saveMemo(activityId, memo)
    setTimeline(prev => prev.map(a => a.id === activityId ? { ...a, memo } : a))
  }

  async function handleGenerate() {
    if (!sessionId) return
    const hasKey = await window.careerlog.hasApiKey()
    if (!hasKey) {
      setError('API 키가 설정되지 않았습니다.')
      setView('settings')
      return
    }
    setIsGenerating(true)
    setError(null)
    const result = await window.careerlog.generateCareerRecord(sessionId)
    setIsGenerating(false)
    if (result.error) { setError(result.error); return }
    setCareerContent(result.content)
    await loadCareerRecords()
    setView('career')
  }

  async function handleNavigateCareer() {
    await loadCareerRecords()
    setView('career')
  }

  async function refreshApiKeyState() {
    const has = await window.careerlog.hasApiKey()
    setCanGenerate(has)
  }

  function handleNavClick(id) {
    setError(null)
    if (id === 'career') { handleNavigateCareer(); return }
    setView(id)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Left Rail ── */}
      <aside style={{
        width: 58, minWidth: 58, background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '14px 0 16px', zIndex: 50,
      }}>
        {/* Logo */}
        <div
          onClick={() => setView('home')}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--a)', color: '#000',
            fontFamily: "'DM Serif Display', serif", fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24, cursor: 'pointer', flexShrink: 0,
          }}
        >C</div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, width: '100%', padding: '0 7px' }}>
          {NAV.map(({ id, icon, tip }) => {
            const active = view === id
            return (
              <RailItem key={id} icon={icon} tip={tip} active={active} onClick={() => handleNavClick(id)} />
            )
          })}
        </nav>

        {/* tracking indicator dot */}
        {isTracking && (
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--g)', marginBottom: 4,
            boxShadow: '0 0 0 3px rgba(82,183,136,.2)',
          }} />
        )}
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        {error && (
          <div style={{
            margin: '10px 16px 0',
            padding: '10px 14px',
            background: 'var(--r-dim)',
            border: '1px solid rgba(224,112,112,.25)',
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
          {view === 'timeline' && (
            <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 24px' }}>
              <Timeline
                timeline={timeline}
                session={session}
                canGenerate={canGenerate}
                onSaveMemo={handleSaveMemo}
                onGenerate={handleGenerate}
                isGenerating={isGenerating}
              />
            </div>
          )}
          {view === 'career' && (
            <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 20px 24px' }}>
              <CareerResult
                content={careerContent}
                records={careerRecords}
                onBack={() => setView('timeline')}
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

function RailItem({ icon, tip, active, onClick }) {
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
        fontSize: 18, cursor: 'pointer',
        border: 'none',
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
