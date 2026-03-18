import { useState, useEffect } from 'react'
import Timeline from './components/Timeline'
import CareerResult from './components/CareerResult'
import Settings from './components/Settings'

export default function App() {
  const [view, setView] = useState('timeline') // 'timeline' | 'career' | 'settings'
  const [session, setSession] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [careerResult, setCareerResult] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadLastSession()
  }, [])

  async function loadLastSession() {
    try {
      const s = await window.careerlog.getLastSession()
      if (s) {
        setSession(s)
        const t = await window.careerlog.getTimeline(s.id)
        setTimeline(t)
      }
    } catch (err) {
      setError('데이터를 불러오지 못했습니다: ' + err.message)
    }
  }

  async function handleGenerateCareer() {
    if (!session) return
    setIsGenerating(true)
    setError(null)

    try {
      const result = await window.careerlog.generateCareerRecord(session.id)
      if (result.error) {
        setError(result.error)
      } else {
        setCareerResult(result.content)
        setView('career')
      }
    } catch (err) {
      setError('AI 분석 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSaveMemo(activityId, memo) {
    await window.careerlog.saveMemo(activityId, memo)
    // 로컬 상태도 업데이트
    setTimeline(prev =>
      prev.map(a => a.id === activityId ? { ...a, memo } : a)
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">C</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-800">CareerLog</h1>
        </div>

        {/* 날짜 */}
        {session && (
          <span className="text-sm text-slate-500">
            {formatDate(session.started_at)}
          </span>
        )}

        {/* 탭 */}
        <nav className="flex gap-1">
          <TabButton active={view === 'timeline'} onClick={() => setView('timeline')}>
            타임라인
          </TabButton>
          <TabButton active={view === 'career'} onClick={() => setView('career')}>
            경력 기록
          </TabButton>
          <TabButton active={view === 'settings'} onClick={() => setView('settings')}>
            설정
          </TabButton>
        </nav>
      </header>

      {/* 에러 */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {/* 콘텐츠 */}
      <main className="max-w-3xl mx-auto px-6 py-6">
        {view === 'timeline' && (
          <Timeline
            timeline={timeline}
            onSaveMemo={handleSaveMemo}
            onGenerate={handleGenerateCareer}
            isGenerating={isGenerating}
          />
        )}
        {view === 'career' && (
          <CareerResult
            content={careerResult}
            onBack={() => setView('timeline')}
          />
        )}
        {view === 'settings' && (
          <Settings />
        )}
      </main>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-sky-50 text-sky-700'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function formatDate(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
