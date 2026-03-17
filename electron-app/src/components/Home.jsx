export default function Home({ isTracking, onStart, onStop, onOpenTimeline }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
      {/* 로고 */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">C</div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CareerLog</h1>
          <p className="text-sm text-slate-400">일하는 순간마다 경력이 쌓인다</p>
        </div>
      </div>

      {/* 메인 버튼 */}
      {!isTracking ? (
        <button
          onClick={onStart}
          className="w-64 py-5 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-sky-200 transition-all hover:scale-105 flex items-center justify-center gap-3"
        >
          <span className="text-2xl">▶</span>
          업무 시작
        </button>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sky-600 font-medium mb-2">
            <span className="w-2 h-2 bg-sky-500 rounded-full animate-pulse"></span>
            기록 중...
          </div>
          <button
            onClick={onStop}
            className="w-64 py-5 bg-slate-800 hover:bg-slate-900 text-white text-lg font-semibold rounded-2xl shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-3"
          >
            <span className="text-2xl">⏹</span>
            업무 종료
          </button>
        </div>
      )}

      {/* 하단 링크 */}
      <div className="mt-8 flex gap-4 text-sm text-slate-400">
        <button onClick={onOpenTimeline} className="hover:text-sky-500 transition-colors">
          기록 보기
        </button>
      </div>

      <p className="mt-12 text-xs text-slate-300">
        업무 시작 후 창을 닫으면 트레이에서 계속 기록됩니다
      </p>
    </div>
  )
}
