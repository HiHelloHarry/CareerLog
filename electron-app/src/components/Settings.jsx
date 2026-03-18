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
      setSaveError('저장 중 오류: ' + (e?.message || '알 수 없는 오류'))
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade-up">
      <h2 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 22, color: 'var(--ink)', letterSpacing: '-.3px',
        marginBottom: 2,
      }}>설정</h2>

      {/* API 키 */}
      <SettingsCard icon="🔑" title="Anthropic API 키" badge={maskedKey}>
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 14px',
          fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.7,
          marginBottom: 14,
        }}>
          <p style={{ fontWeight: 600, color: 'var(--ink2)', marginBottom: 4 }}>왜 API 키가 필요한가요?</p>
          <p>업무 기록은 이 기기에서만 동작합니다. <strong style={{ color: 'var(--ink)' }}>「경력 기록 생성」</strong>은 Claude AI에게 기록을 보내 이력서 문구로 변환하는 과정이 필요합니다.</p>
          <p style={{ marginTop: 4, color: 'var(--ink4)' }}>기록 데이터는 생성 요청 시에만 전송됩니다.</p>
        </div>

        <a
          href="#"
          onClick={e => { e.preventDefault(); window.open('https://console.anthropic.com/settings/keys') }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--a)',
            background: 'var(--a-dim)', border: '1px solid rgba(212,168,75,.2)',
            padding: '7px 12px', borderRadius: 8,
            marginBottom: 14, textDecoration: 'none',
            transition: 'background .15s',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'var(--a-mid)' }}
          onMouseOut={e => { e.currentTarget.style.background = 'var(--a-dim)' }}
        >
          🔗 Anthropic Console에서 API 키 발급받기 →
        </a>

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setSaveError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
            placeholder={maskedKey ? '새 키로 교체하려면 입력...' : 'sk-ant-...'}
            style={{
              flex: 1, padding: '10px 14px',
              background: 'var(--bg3)', border: '1.5px solid var(--border2)',
              borderRadius: 10, fontSize: 13.5, color: 'var(--ink)',
              fontFamily: "'Noto Sans KR', sans-serif", outline: 'none',
              transition: 'border-color .15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--a)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
          />
          <button
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim()}
            style={{
              padding: '10px 18px',
              background: apiKey.trim() ? 'var(--a)' : 'var(--bg3)',
              color: apiKey.trim() ? '#000' : 'var(--ink3)',
              border: 'none', borderRadius: 10,
              fontSize: 13.5, fontWeight: 700, cursor: apiKey.trim() ? 'pointer' : 'not-allowed',
              fontFamily: "'Noto Sans KR', sans-serif",
              transition: 'all .15s', flexShrink: 0,
            }}
          >저장</button>
        </div>

        {saved && (
          <StatusMsg type="success">✓ API 키가 저장되었습니다</StatusMsg>
        )}
        {saveError && (
          <StatusMsg type="error">⚠ {saveError}</StatusMsg>
        )}
        {!maskedKey && !saved && (
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--a)', display: 'flex', alignItems: 'center', gap: 5 }}>
            ⚠ API 키가 없으면 경력 기록 생성 기능을 사용할 수 없습니다
          </p>
        )}
      </SettingsCard>

      {/* 감지 설정 */}
      <SettingsCard icon="⚙" title="감지 설정">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['감지 간격', '30초'],
            ['활동 병합 기준', '5분 미만'],
            ['버전', 'v0.1.0'],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '11px 0',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 13, color: 'var(--ink2)' }}>{label}</span>
              <span style={{
                fontSize: 12.5, fontWeight: 600, color: 'var(--ink)',
                background: 'var(--bg3)', padding: '3px 11px', borderRadius: 8,
              }}>{value}</span>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* 데이터 */}
      <SettingsCard icon="🗄" title="데이터">
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', marginBottom: 16, lineHeight: 1.6 }}>
          모든 세션, 활동 기록, 경력 기록이 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        <button
          onClick={handleDeleteAll}
          disabled={deleting}
          style={{
            padding: '9px 16px', borderRadius: 9,
            background: deleteConfirm ? 'var(--r)' : 'transparent',
            color: deleteConfirm ? '#fff' : 'var(--r)',
            border: `1px solid ${deleteConfirm ? 'var(--r)' : 'rgba(224,112,112,.3)'}`,
            fontSize: 13, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer',
            fontFamily: "'Noto Sans KR', sans-serif",
            transition: 'all .15s',
          }}
        >
          {deleting ? '삭제 중...' : deleteConfirm ? '⚠ 정말 삭제하시겠습니까? (다시 클릭)' : '모든 기록 삭제'}
        </button>
      </SettingsCard>
    </div>
  )
}

function SettingsCard({ icon, title, badge, children }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>{title}</h3>
        {badge && (
          <span style={{
            fontSize: 11, color: 'var(--g)', background: 'var(--g-dim)',
            border: '1px solid rgba(82,183,136,.25)',
            padding: '2px 9px', borderRadius: 20,
            fontFamily: 'monospace', fontWeight: 600,
          }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function StatusMsg({ type, children }) {
  const isSuccess = type === 'success'
  return (
    <div style={{
      marginTop: 10, padding: '9px 13px',
      background: isSuccess ? 'var(--g-dim)' : 'var(--r-dim)',
      border: `1px solid ${isSuccess ? 'rgba(82,183,136,.25)' : 'rgba(224,112,112,.25)'}`,
      borderRadius: 8, fontSize: 13,
      color: isSuccess ? 'var(--g)' : 'var(--r)',
      display: 'flex', alignItems: 'center', gap: 7,
    }}>
      {children}
    </div>
  )
}
