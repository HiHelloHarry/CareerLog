import { useState } from 'react'

export default function CareerResult({ content, onBack }) {
  const [copied, setCopied] = useState(false)

  if (!content) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="text-5xl mb-4">✨</div>
        <p className="text-lg font-medium">아직 생성된 경력 기록이 없습니다</p>
        <p className="text-sm mt-2">타임라인 탭에서 메모를 추가하고 경력 기록을 생성하세요</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600"
        >
          타임라인으로 돌아가기
        </button>
      </div>
    )
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800">경력 기록</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
          >
            {copied ? '✓ 복사됨' : '📋 복사'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="prose prose-slate max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
            {content}
          </pre>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        이 기록은 로컬에 저장되었습니다. 이력서·경력기술서 작성 시 바로 활용할 수 있습니다.
      </p>
    </div>
  )
}
