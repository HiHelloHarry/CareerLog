import { useState, useEffect } from 'react'
import Home from './components/Home'
import Timeline from './components/Timeline'
import CareerResult from './components/CareerResult'
import Settings from './components/Settings'

export default function App() {
  const [view, setView] = useState('home')
  const [isTracking, setIsTracking] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [careerContent, setCareerContent] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    window.careerlog.getStatus().then(({ isTracking, sessionId }) => {
      setIsTracking(isTracking)
      setSessionId(sessionId)
      if (!isTracking && sessionId) {
        loadTimeline(sessionId)
        setView('timeline')
      }
    })
    window.careerlog.onNavigate((v) => {
      setView(v)
      if (v === 'timeline' && sessionId) loadTimeline(sessionId)
    })
    window.careerlog.onTrackingStatus(({ isTracking, sessionId }) => {
      setIsTracking(isTracking)
      setSessionId(sessionId)
    })
  }, [])

  async function loadTimeline(sid) {
    const t = await window.careerlog.getTimeline(sid)
    setTimeline(t)
  }

  async function handleStart() {
    const res = await window.careerlog.startTracking()
    setSessionId(res.sessionId)
    setIsTracking(true)
    window.close()
  }

  async function handleStop() {
    await window.careerlog.stopTracking()
    setIsTracking(false)
    if (sessionId) await loadTimeline(sessionId)
    setView('timeline')
  }

  async function handleSaveMemo(activityId, memo) {
    await window.careerlog.saveMemo(activityId, memo)
    setTimeline(prev => prev.map(a => a.id === activityId ? { ...a, memo } : a))
  }

  async function handleGenerate() {
    if (!sessionId) return
    setIsGenerating(true)
    setError(null)
    const result = await window.careerlog.generateCareerRecord(sessionId)
    setIsGenerating(false)
    if (result.error) { setError(result.error); return }
    setCareerContent(result.content)
    setView('career')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {view !== 'home' && (
        <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <button onClick={() => setView('home')} className="flex items-center gap-2 hover:opacity-70">
            <div className="w-7 h-7 bg-sky-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">C</div>
            <span className="font-semibold text-slate-800">CareerLog</span>
          </button>
          <nav className="flex gap-1">
            {[['timeline','타임라인'], ['career','경력 기록'], ['settings','설정']].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                className={"px-3 py-1.5 rounded-md text-sm font-medium transition-colors " + (
                  view === v ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                )}>
                {label}
              </button>
            ))}
          </nav>
        </header>
      )}

      {error && (
        <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600">X</button>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        {view === 'home' && (
          <Home isTracking={isTracking} onStart={handleStart} onStop={handleStop} onOpenTimeline={() => setView('timeline')} />
        )}
        {view === 'timeline' && (
          <div className="max-w-2xl mx-auto px-5 py-5">
            <Timeline timeline={timeline} onSaveMemo={handleSaveMemo} onGenerate={handleGenerate} isGenerating={isGenerating} />
          </div>
        )}
        {view === 'career' && (
          <div className="max-w-2xl mx-auto px-5 py-5">
            <CareerResult content={careerContent} onBack={() => setView('timeline')} />
          </div>
        )}
        {view === 'settings' && (
          <div className="max-w-2xl mx-auto px-5 py-5">
            <Settings />
          </div>
        )}
      </main>
    </div>
  )
}
