import { useState, useEffect } from 'react'

export default function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [autoStart, setAutoStart] = useState(false)

  useEffect(() => {
    // electron-store에서 설정 로드 (IPC 없이 직접 접근 불가하므로 추후 IPC 추가)
    // TODO: IPC로 설정 로드
  }, [])

  function handleSaveApiKey() {
    // TODO: IPC로 API 키 저장
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800">설정</h2>

      {/* API 키 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-medium text-slate-700 mb-1">Anthropic API 키</h3>
        <p className="text-xs text-slate-400 mb-4">
          경력 기록 AI 분석에 사용됩니다. 키는 이 기기에만 저장됩니다.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <button
            onClick={handleSaveApiKey}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600"
          >
            {saved ? '저장됨 ✓' : '저장'}
          </button>
        </div>
      </div>

      {/* 감지 설정 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-medium text-slate-700 mb-4">감지 설정</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-slate-600">로그인 시 자동 시작</span>
            <input
              type="checkbox"
              checked={autoStart}
              onChange={e => setAutoStart(e.target.checked)}
              className="w-4 h-4 accent-sky-500"
            />
          </label>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">감지 간격</span>
            <span className="text-sm text-slate-400">30초</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">최소 활동 시간 (병합 기준)</span>
            <span className="text-sm text-slate-400">5분</span>
          </div>
        </div>
      </div>

      {/* 데이터 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-medium text-slate-700 mb-2">데이터</h3>
        <p className="text-xs text-slate-400 mb-4">
          모든 데이터는 이 기기에만 저장됩니다. 외부로 전송되지 않습니다.
        </p>
        <button className="text-sm text-red-400 hover:text-red-600">
          모든 기록 삭제
        </button>
      </div>
    </div>
  )
}
