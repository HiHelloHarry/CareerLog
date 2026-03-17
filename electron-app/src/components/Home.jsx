import { useState, useEffect } from 'react'

export default function Home({ isTracking, canGenerate, sessionStartedAt, onStart, onStop, onOpenTimeline, onOpenSettings }) {
  const [elapsed, setElapsed] = useState(0)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [project, setProject] = useState('')

  // 확인 화면은 사용자가 버튼 누를 때까지 유지

  // 경과 시간 타이머
  useEffect(() => {
    if (!isTracking) { setElapsed(0); return }
    const base = sessionStartedAt ? Date.now() - new Date(sessionStartedAt).getTime() : 0
    setElapsed(Math.floor(base / 1000))
    const interval = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(interval)
  }, [isTracking, sessionStartedAt])

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  function formatElapsed(sec) {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  async function handleStart() {
    await onStart(project.trim())
    setShowConfirmation(true)
  }

  // 업무 시작 확인 오버레이
  if (showConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-xl border border-slate-100">
          <div className="w-14 h-14 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">업무 기록이 시작되었습니다</h3>
          <p className="text-sm text-slate-500 mb-5">
            백그라운드에서 30초마다 활동이 자동 기록됩니다
          </p>
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-sky-700 text-left leading-relaxed mb-5">
            💡 종료하려면 <strong>시스템 트레이(작업 표시줄 오른쪽 끝)</strong>의<br />
            CareerLog 아이콘을 <strong>우클릭 → 「업무 종료」</strong>를 선택하거나,<br />
            이 창을 다시 열어서 종료하세요
          </div>
          <button
            onClick={() => window.close()}
            className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            확인, 창 닫기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 select-none">

      {/* API 키 없을 때 배너 */}
      {!canGenerate && !isTracking && (
        <button
          onClick={onOpenSettings}
          className="mb-8 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-sm hover:bg-amber-100 transition-colors"
        >
          <span>⚠️</span>
          <span>API 키를 설정해야 경력 기록을 생성할 수 있습니다</span>
          <span className="text-amber-500 font-semibold">설정하기 →</span>
        </button>
      )}

      {/* 로고 */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-sky-200">C</div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CareerLog</h1>
          <p className="text-xs text-slate-400">일하는 순간마다 경력이 쌓인다</p>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-12">{today}</p>

      {!isTracking ? (
        <div className="flex flex-col items-center gap-3">
          <input
            type="text"
            value={project}
            onChange={e => setProject(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
            placeholder="프로젝트 / 클라이언트 (선택)"
            className="w-56 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 text-center placeholder-slate-300"
          />
          <button
            onClick={handleStart}
            className="w-56 py-5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-sky-200 transition-all hover:scale-105 flex items-center justify-center gap-3"
          >
            <span className="text-xl">▶</span>
            업무 시작
          </button>
          <p className="text-xs text-slate-400">시작하면 백그라운드에서 자동 기록됩니다</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          {/* 타이머 */}
          <div className="text-center bg-white border border-sky-100 rounded-2xl px-10 py-6 shadow-sm">
            <div className="text-5xl font-mono font-bold text-sky-600 tracking-widest tabular-nums">
              {formatElapsed(elapsed)}
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 text-sky-400 text-sm font-medium">
              <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></span>
              기록 중
            </div>
          </div>

          <button
            onClick={onStop}
            className="w-56 py-4 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-base font-semibold rounded-2xl shadow-md transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>⏹</span>
            업무 종료
          </button>
        </div>
      )}

      <div className="mt-10">
        <button
          onClick={onOpenTimeline}
          className="text-sm text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-1"
        >
          기록 보기 <span className="text-xs">→</span>
        </button>
      </div>
    </div>
  )
}
