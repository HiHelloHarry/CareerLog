import { useState } from 'react'

export default function Timeline({ timeline, session, canGenerate, onSaveMemo, onGenerate, isGenerating }) {
  if (!timeline.length) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-lg font-medium text-slate-500">기록된 업무가 없습니다</p>
        <p className="text-sm mt-2">트레이 메뉴 또는 홈에서 업무를 시작하세요</p>
      </div>
    )
  }

  const totalSec = timeline.reduce((sum, a) => sum + (a.duration_sec || 0), 0)
  const sessionDate = session?.date || timeline[0]?.started_at?.split('T')[0] || ''
  const dateLabel = sessionDate
    ? new Date(sessionDate + 'T12:00:00').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
    : ''

  return (
    <div>
      {/* 세션 헤더 카드 */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-400 rounded-2xl p-5 mb-6 text-white shadow-md shadow-sky-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sky-100 text-sm mb-1">{dateLabel}</p>
            <p className="text-xl font-bold">{formatDuration(totalSec)} 기록</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sky-100 text-sm">{timeline.length}개 활동</p>
              {session?.project && (
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
                  📁 {session.project}
                </span>
              )}
            </div>
          </div>
          {canGenerate ? (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="bg-white text-sky-600 hover:bg-sky-50 disabled:opacity-60 disabled:cursor-wait px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              {isGenerating ? (
                <><span className="animate-spin inline-block">⟳</span> 분석 중...</>
              ) : (
                <>✨ 경력 기록 생성</>
              )}
            </button>
          ) : (
            <button
              onClick={onGenerate}
              className="bg-white text-amber-600 hover:bg-amber-50 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
            >
              🔑 API 키 설정하기
            </button>
          )}
        </div>
      </div>

      {/* 타임라인 */}
      <div className="relative">
        <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-slate-100" />
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
    </div>
  )
}

function ActivityItem({ activity, onSaveMemo }) {
  const [memo, setMemo] = useState(activity.memo || '')
  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const appIcon = getAppIcon(activity.app_name)
  const startTime = formatTime(activity.started_at)
  const endTime = formatTime(activity.ended_at)
  const duration = formatDuration(activity.duration_sec)
  const isShort = (activity.duration_sec || 0) < 300
  const isMerged = activity.merged_ids?.length > 1

  async function handleSave() {
    await onSaveMemo(activity.id, memo)
    setIsEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className={`relative flex gap-4 ${isShort && !isMerged ? 'opacity-55' : ''}`}>
      {/* 타임라인 점 */}
      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 mt-0.5 ${
        isMerged
          ? 'bg-amber-50 border-2 border-amber-200'
          : isShort
          ? 'bg-slate-100'
          : 'bg-white border-2 border-sky-100 shadow-sm'
      }`}>
        {appIcon}
      </div>

      {/* 카드 */}
      <div className={`flex-1 bg-white rounded-xl border ${
        isMerged ? 'border-amber-100' : isShort ? 'border-slate-100' : 'border-slate-200'
      } p-4 hover:border-slate-300 transition-colors mb-1`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-700 text-sm">{activity.app_name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isMerged ? 'text-amber-700 bg-amber-50' : 'text-sky-600 bg-sky-50'
              }`}>{duration}</span>
              {isMerged && (
                <span
                  className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full cursor-help"
                  title="짧은 활동 여러 개가 하나로 통합되었습니다"
                >
                  🔗 {activity.merged_ids.length}개 통합
                </span>
              )}
            </div>
            {activity.window_title && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{activity.window_title}</p>
            )}
          </div>
          <div className="text-xs text-slate-400 font-mono shrink-0 text-right leading-tight">
            <div>{startTime}</div>
            <div className="text-slate-200 text-center">↓</div>
            <div>{endTime}</div>
          </div>
        </div>

        {/* 메모 */}
        <div className="mt-3">
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') { setIsEditing(false); setMemo(activity.memo || '') }
                }}
                placeholder="이 활동 메모 (Enter 저장, Esc 취소)"
                className="flex-1 text-sm border border-sky-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300"
                autoFocus
              />
              <button onClick={handleSave} className="px-3 py-1.5 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600">저장</button>
              <button onClick={() => { setIsEditing(false); setMemo(activity.memo || '') }} className="px-3 py-1.5 text-slate-400 rounded-lg text-sm hover:bg-slate-100">취소</button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs flex items-center gap-1.5 transition-colors group"
            >
              {memo ? (
                <span className="text-slate-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg">
                  📝 {memo}
                  {saved && <span className="text-green-500 ml-2">✓</span>}
                </span>
              ) : (
                <span className="text-slate-300 group-hover:text-sky-400 transition-colors">+ 메모 추가</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function getAppIcon(appName) {
  const name = (appName || '').toLowerCase()
  if (name.includes('figma')) return '🎨'
  if (name.includes('slack')) return '💬'
  if (name.includes('zoom') || name.includes('teams') || name.includes('meet')) return '📹'
  if (name.includes('chrome') || name.includes('safari') || name.includes('firefox') || name.includes('edge')) return '🌐'
  if (name.includes('code') || name.includes('cursor') || name.includes('idea') || name.includes('xcode') || name.includes('vim')) return '💻'
  if (name.includes('excel') || name.includes('sheets')) return '📊'
  if (name.includes('word') || name.includes('docs')) return '📄'
  if (name.includes('powerpoint') || name.includes('keynote') || name.includes('slides')) return '📽️'
  if (name.includes('notion')) return '📝'
  if (name.includes('terminal') || name.includes('iterm') || name.includes('cmd') || name.includes('powershell') || name.includes('wt')) return '⌨️'
  if (name.includes('mail') || name.includes('outlook')) return '📧'
  if (name.includes('finder') || name.includes('explorer')) return '📁'
  if (name.includes('photoshop') || name.includes('illustrator') || name.includes('xd')) return '🖌️'
  if (name.includes('spotify') || name.includes('music')) return '🎵'
  return '🖥️'
}

function formatTime(isoString) {
  if (!isoString) return '--:--'
  const d = new Date(isoString)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(sec) {
  if (!sec || sec < 60) return `${sec || 0}초`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}
