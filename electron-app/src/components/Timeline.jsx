import { useState } from 'react'

export default function Timeline({ timeline, onSaveMemo, onGenerate, isGenerating }) {
  if (!timeline.length) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-lg font-medium">기록된 업무가 없습니다</p>
        <p className="text-sm mt-2">트레이 메뉴에서 [업무 시작]을 클릭하세요</p>
      </div>
    )
  }

  const totalSec = timeline.reduce((sum, a) => sum + (a.duration_sec || 0), 0)

  return (
    <div>
      {/* 요약 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">오늘의 업무 타임라인</h2>
          <p className="text-sm text-slate-500 mt-1">
            총 {timeline.length}개 활동 · {formatDuration(totalSec)}
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin">⟳</span>
              AI 분석 중...
            </>
          ) : (
            <>
              ✨ 경력 기록 생성
            </>
          )}
        </button>
      </div>

      {/* 타임라인 아이템 목록 */}
      <div className="space-y-2">
        {timeline.map((activity, index) => (
          <ActivityItem
            key={activity.id || index}
            activity={activity}
            onSaveMemo={onSaveMemo}
          />
        ))}
      </div>
    </div>
  )
}

function ActivityItem({ activity, onSaveMemo }) {
  const [memo, setMemo] = useState(activity.memo || '')
  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const appIcon = getAppIcon(activity.app_name)
  const startTime = formatTime(activity.started_at)
  const duration = formatDuration(activity.duration_sec)
  const isShort = (activity.duration_sec || 0) < 300 // 5분 미만

  async function handleSave() {
    await onSaveMemo(activity.id, memo)
    setIsEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={`bg-white rounded-xl border ${isShort ? 'border-slate-100 opacity-70' : 'border-slate-200'} p-4 hover:border-slate-300 transition-colors`}>
      <div className="flex items-start gap-4">
        {/* 시간 */}
        <div className="text-xs text-slate-400 font-mono w-10 pt-0.5 shrink-0">{startTime}</div>

        {/* 앱 아이콘 + 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{appIcon}</span>
            <span className="font-medium text-slate-700 text-sm">{activity.app_name}</span>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">{duration}</span>
          </div>
          {activity.window_title && (
            <p className="text-sm text-slate-500 truncate">{activity.window_title}</p>
          )}

          {/* 메모 영역 */}
          <div className="mt-3">
            {isEditing ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="이 활동에 대한 메모..."
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600"
                >
                  저장
                </button>
                <button
                  onClick={() => { setIsEditing(false); setMemo(activity.memo || '') }}
                  className="px-3 py-1.5 text-slate-500 rounded-lg text-sm hover:bg-slate-100"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-slate-400 hover:text-sky-500 flex items-center gap-1 transition-colors"
              >
                {memo ? (
                  <span className="text-slate-600">📝 {memo}</span>
                ) : (
                  <span>+ 메모 추가</span>
                )}
                {saved && <span className="text-green-500 ml-1">저장됨</span>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 앱 이름으로 이모지 아이콘 매핑
function getAppIcon(appName) {
  const name = (appName || '').toLowerCase()
  if (name.includes('figma')) return '🎨'
  if (name.includes('slack')) return '💬'
  if (name.includes('zoom') || name.includes('teams') || name.includes('meet')) return '📹'
  if (name.includes('chrome') || name.includes('safari') || name.includes('firefox') || name.includes('edge')) return '🌐'
  if (name.includes('code') || name.includes('cursor') || name.includes('idea') || name.includes('xcode')) return '💻'
  if (name.includes('excel') || name.includes('sheets')) return '📊'
  if (name.includes('word') || name.includes('docs')) return '📄'
  if (name.includes('powerpoint') || name.includes('keynote') || name.includes('slides')) return '📊'
  if (name.includes('notion')) return '📝'
  if (name.includes('terminal') || name.includes('iterm') || name.includes('cmd') || name.includes('powershell')) return '⌨️'
  if (name.includes('mail') || name.includes('outlook')) return '📧'
  if (name.includes('finder') || name.includes('explorer')) return '📁'
  return '🖥️'
}

function formatTime(isoString) {
  if (!isoString) return '--:--'
  const d = new Date(isoString)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(sec) {
  if (!sec) return '0분'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}분`
}
