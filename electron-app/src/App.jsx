import { useState, useEffect } from 'react'
import Home from './components/Home'
import Timeline from './components/Timeline'
import CareerResult from './components/CareerResult'
import Settings from './components/Settings'

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
    // API 키 여부 체크
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
    // window.close()는 Home.jsx에서 확인 화면 후 처리
  }

  async function handleStop() {
    setError(null)
    await window.careerlog.stopTracking()
    setIsTracking(false)
    if (sessionId) {
      await new Promise(r => setTimeout(r, 150)) // DB 쓰기 완료 대기
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
    // API 키 없으면 설정으로 유도
    const hasKey = await window.careerlog.hasApiKey()
    if (!hasKey) {
      setError('API 키가 설정되지 않았습니다. 설정 탭에서 입력해주세요.')
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

  // API 키 저장 후 canGenerate 갱신 (Settings에서 저장 시 호출)
  async function refreshApiKeyState() {
    const has = await window.careerlog.hasApiKey()
    setCanGenerate(has)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {view !== 'home' && (
        <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <button onClick={() => setView('home')} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-sky-200">C</div>
            <span className="font-semibold text-slate-800 text-sm">CareerLog</span>
          </button>
          <nav className="flex gap-1">
            {[['timeline', '타임라인'], ['career', '경력 기록'], ['settings', '설정']].map(([v, label]) => (
              <button
                key={v}
                onClick={() => v === 'career' ? handleNavigateCareer() : setView(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === v ? 'bg-sky-50 text-sky-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>
      )}

      {error && (
        <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-start">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 shrink-0">✕</button>
        </div>
      )}

      <main className="flex-1 overflow-auto">
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
          <div className="max-w-2xl mx-auto px-5 py-5">
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
          <div className="max-w-3xl mx-auto px-5 py-5">
            <CareerResult
              content={careerContent}
              records={careerRecords}
              onBack={() => setView('timeline')}
            />
          </div>
        )}
        {view === 'settings' && (
          <div className="max-w-2xl mx-auto px-5 py-5">
            <Settings onApiKeySaved={refreshApiKeyState} />
          </div>
        )}
      </main>
    </div>
  )
}
