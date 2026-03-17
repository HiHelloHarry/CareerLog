import { useState, useEffect } from 'react'

export default function Settings({ onApiKeySaved }) {
  const [apiKey, setApiKey] = useState('')
  const [maskedKey, setMaskedKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    window.careerlog.getApiKeyMasked().then(masked => setMaskedKey(masked))
  }, [])

  async function handleSaveApiKey() {
    if (!apiKey.trim()) return
    setSaveError('')
    try {
      await window.careerlog.saveApiKey(apiKey.trim())
      const masked = await window.careerlog.getApiKeyMasked()
      setMaskedKey(masked)
      setApiKey('')
      setSaved(true)
      if (onApiKeySaved) onApiKeySaved()
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setSaveError('저장 중 오류가 발생했습니다: ' + (e?.message || '알 수 없는 오류'))
    }
  }

  async function handleDeleteAll() {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 4000)
      return
    }
    setDeleting(true)
    await window.careerlog.deleteAllData()
    setDeleting(false)
    setDeleteConfirm(false)
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold text-slate-800">설정</h2>

      {/* API 키 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🔑</span>
          <h3 className="font-medium text-slate-700">Anthropic API 키</h3>
          {maskedKey && (
            <span className="ml-auto text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-mono">
              {maskedKey}
            </span>
          )}
        </div>

        {/* API 키가 왜 필요한지 설명 */}
        <div className="bg-slate-50 rounded-lg p-3 mb-4 text-xs text-slate-500 leading-relaxed">
          <p className="font-medium text-slate-600 mb-1">왜 API 키가 필요한가요?</p>
          <p>업무 기록 자체는 이 기기에서만 동작합니다. 하지만 <strong>「경력 기록 생성」</strong> 기능은 Claude AI(Anthropic)에게 기록을 보내 이력서 문구로 변환하는 과정이 필요합니다. 이를 위해 API 키가 필요합니다.</p>
          <p className="mt-1 text-slate-400">기록된 활동 데이터는 생성 요청 시에만 전송되며, 다른 용도로 사용되지 않습니다.</p>
        </div>

        <p className="text-xs text-slate-400 mb-3">
          API 키가 없다면 아래 링크에서 무료로 발급받을 수 있습니다.
        </p>
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-lg mb-4 transition-colors"
          onClick={e => { e.preventDefault(); window.open('https://console.anthropic.com/settings/keys') }}
        >
          🔗 Anthropic Console에서 API 키 발급받기 →
        </a>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setSaveError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
            placeholder={maskedKey ? '새 키로 교체하려면 입력...' : 'sk-ant-...'}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
          <button
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim()}
            className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            저장
          </button>
        </div>
        {saved && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <span className="text-base">✓</span>
            <span>API 키가 저장되었습니다</span>
          </div>
        )}
        {saveError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <span>⚠</span>
            <span>{saveError}</span>
          </div>
        )}
        {!maskedKey && !saved && (
          <p className="mt-3 text-xs text-amber-500 flex items-center gap-1">
            ⚠ API 키가 없으면 경력 기록 생성 기능을 사용할 수 없습니다
          </p>
        )}
      </div>

      {/* 감지 설정 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">⚙️</span>
          <h3 className="font-medium text-slate-700">감지 설정</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <span className="text-sm text-slate-600">감지 간격</span>
            <span className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-1 rounded-lg">30초</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-50">
            <span className="text-sm text-slate-600">활동 병합 기준</span>
            <span className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-1 rounded-lg">5분 미만</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-600">버전</span>
            <span className="text-sm text-slate-400">v0.1.0</span>
          </div>
        </div>
      </div>

      {/* 데이터 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🗄️</span>
          <h3 className="font-medium text-slate-700">데이터</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          모든 세션, 활동 기록, 경력 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button
          onClick={handleDeleteAll}
          disabled={deleting}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            deleteConfirm
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'border border-red-200 text-red-400 hover:bg-red-50'
          }`}
        >
          {deleting ? '삭제 중...' : deleteConfirm ? '⚠ 정말 삭제하시겠습니까? (다시 클릭)' : '모든 기록 삭제'}
        </button>
      </div>
    </div>
  )
}
