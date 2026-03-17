import { useState, useEffect } from 'react'

export default function CareerResult({ content, records, onBack }) {
  const [copied, setCopied] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editSaved, setEditSaved] = useState(false)

  const displayContent = content || selectedRecord?.content || records?.[0]?.content
  const displayRecord = selectedRecord || (content ? null : records?.[0])

  useEffect(() => {
    setEditContent(displayContent || '')
    setIsEditing(false)
  }, [displayContent])

  async function handleCopy() {
    if (!displayContent) return
    await navigator.clipboard.writeText(isEditing ? editContent : displayContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleSaveEdit() {
    if (!displayRecord?.id) {
      // 방금 생성된 콘텐츠는 records에서 첫 번째 찾기
      const latestRecord = records?.[0]
      if (latestRecord) {
        await window.careerlog.updateCareerRecord(latestRecord.id, editContent)
      }
    } else {
      await window.careerlog.updateCareerRecord(displayRecord.id, editContent)
    }
    setIsEditing(false)
    setEditSaved(true)
    setTimeout(() => setEditSaved(false), 2500)
  }

  function formatDate(isoString) {
    if (!isoString) return ''
    return new Date(isoString).toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  if (!displayContent && (!records || records.length === 0)) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="text-5xl mb-4">✨</div>
        <p className="text-lg font-medium text-slate-500">아직 생성된 경력 기록이 없습니다</p>
        <p className="text-sm mt-2">타임라인 탭에서 업무를 기록하고 경력 기록을 생성하세요</p>
        <button onClick={onBack} className="mt-5 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600">
          타임라인으로 이동
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-5">
      {/* 사이드바: 과거 기록 목록 */}
      {records && records.length > 0 && (
        <div className="w-44 shrink-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">기록 목록</p>
          <div className="space-y-1">
            {content && (
              <button
                onClick={() => { setSelectedRecord(null); setIsEditing(false) }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  !selectedRecord ? 'bg-sky-50 text-sky-700 font-medium border border-sky-100' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold">방금 생성됨 ✨</div>
              </button>
            )}
            {records.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelectedRecord(r); setIsEditing(false) }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  selectedRecord?.id === r.id ? 'bg-sky-50 text-sky-700 font-medium border border-sky-100' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium text-slate-600">
                  {new Date(r.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </div>
                <div className="text-slate-400 mt-0.5">
                  {new Date(r.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                {r.updated_at && <div className="text-amber-400 mt-0.5">수정됨</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">경력 기록</h2>
            {displayRecord?.created_at && (
              <p className="text-xs text-slate-400 mt-0.5">{formatDate(displayRecord.created_at)}</p>
            )}
            {content && !selectedRecord && (
              <p className="text-xs text-green-500 mt-0.5 font-medium">✨ 방금 생성됨</p>
            )}
            {editSaved && <p className="text-xs text-sky-500 mt-0.5">저장되었습니다</p>}
          </div>

          <div className="flex gap-2 shrink-0">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  ✏️ 수정
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? '✓ 복사됨' : '📋 복사'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 transition-colors font-medium"
                >
                  저장
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditContent(displayContent || '') }}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {isEditing ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full min-h-[280px] font-sans text-sm leading-7 text-slate-700 focus:outline-none resize-none"
              autoFocus
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">
              {displayContent}
            </pre>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center">
          이 기록은 로컬에 저장되었습니다. 이력서·경력기술서 작성 시 바로 활용하세요.
        </p>
      </div>
    </div>
  )
}
