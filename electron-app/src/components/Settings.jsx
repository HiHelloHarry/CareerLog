import { useState, useEffect } from 'react'

export default function Settings({ onApiKeySaved }) {
  const [apiKey, setApiKey] = useState('')
  const [maskedKey, setMaskedKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [blacklist, setBlacklist] = useState([])
  const [newApp, setNewApp] = useState('')
  const [exportStatus, setExportStatus] = useState(null)
  const [importStatus, setImportStatus] = useState(null)
  const [credits, setCredits] = useState(null)
  const [skipTagging, setSkipTagging] = useState(false)
  const [profile, setProfile] = useState({ job_role: '', job_level: '', skills: '' })
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    window.careerlog.getApiKeyMasked().then(masked => setMaskedKey(masked))
    window.careerlog.getBlacklist().then(setBlacklist)
    window.careerlog.getCredits().then(data => setCredits(data?.remaining ?? null))
    window.careerlog.getAppSettings().then(s => {
      setSkipTagging(!!s.skip_tagging)
      setProfile({
        job_role:  s.job_role  || '',
        job_level: s.job_level || '',
        skills:    s.skills    || '',
      })
    })
  }, [])

  async function handleSaveProfile() {
    await window.careerlog.saveAppSettings({
      job_role:  profile.job_role.trim(),
      job_level: profile.job_level.trim(),
      skills:    profile.skills.trim(),
    })
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2500)
  }

  async function handleToggleSkipTagging() {
    const next = !skipTagging
    setSkipTagging(next)
    await window.careerlog.saveAppSettings({ skip_tagging: next })
  }

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

  async function handleAddBlacklist() {
    const app = newApp.trim()
    if (!app) return
    await window.careerlog.addToBlacklist(app)
    setBlacklist(prev => [...prev, app])
    setNewApp('')
  }

  async function handleRemoveBlacklist(app) {
    await window.careerlog.removeFromBlacklist(app)
    setBlacklist(prev => prev.filter(a => a !== app))
  }

  async function handleExport() {
    setExportStatus('exporting')
    const res = await window.careerlog.exportData()
    if (res?.success) setExportStatus('done')
    else setExportStatus('error')
    setTimeout(() => setExportStatus(null), 3000)
  }

  async function handleImport() {
    setImportStatus('importing')
    const res = await window.careerlog.importData()
    if (res?.success) setImportStatus('done')
    else if (res?.cancelled) setImportStatus(null)
    else setImportStatus('error')
    if (res?.success) setTimeout(() => setImportStatus(null), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade-up">
      <h2 style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 22, color: 'var(--ink)', letterSpacing: '-.3px',
        marginBottom: 2,
      }}>설정</h2>

      {/* 직군/직급 프로필 */}
      <SettingsCard icon="👤" title="내 프로필">
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', marginBottom: 14, lineHeight: 1.6 }}>
          직군·직급·기술스택을 입력하면 AI가 더 정확한 경력 기록을 생성합니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11.5, color: 'var(--ink3)', marginBottom: 4, display: 'block' }}>직군</label>
              <input
                value={profile.job_role}
                onChange={e => setProfile(p => ({ ...p, job_role: e.target.value }))}
                placeholder="예: 프론트엔드 개발자, 기획자, 마케터..."
                style={profileInputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--a)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11.5, color: 'var(--ink3)', marginBottom: 4, display: 'block' }}>직급/연차</label>
              <input
                value={profile.job_level}
                onChange={e => setProfile(p => ({ ...p, job_level: e.target.value }))}
                placeholder="예: 시니어, 주임, 3년차..."
                style={profileInputStyle}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--a)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11.5, color: 'var(--ink3)', marginBottom: 4, display: 'block' }}>주요 기술스택</label>
            <input
              value={profile.skills}
              onChange={e => setProfile(p => ({ ...p, skills: e.target.value }))}
              placeholder="예: React, TypeScript, Figma, SQL..."
              style={profileInputStyle}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--a)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
            />
          </div>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={!profile.job_role && !profile.job_level && !profile.skills}
          style={{
            marginTop: 12, padding: '9px 18px', borderRadius: 9,
            background: (profile.job_role || profile.job_level || profile.skills) ? 'var(--a)' : 'var(--bg3)',
            color: (profile.job_role || profile.job_level || profile.skills) ? '#000' : 'var(--ink3)',
            border: 'none', fontSize: 13, fontWeight: 700,
            cursor: (profile.job_role || profile.job_level || profile.skills) ? 'pointer' : 'not-allowed',
            fontFamily: "'Noto Sans KR', sans-serif",
            transition: 'all .15s',
          }}
        >저장</button>
        {profileSaved && <StatusMsg type="success">✓ 프로필이 저장되었습니다.</StatusMsg>}
      </SettingsCard>

      {/* 무료 크레딧 현황 */}
      {!maskedKey && (
        <SettingsCard icon="✦" title="이번 달 무료 크레딧">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink3)' }}>사용 가능</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: credits > 5 ? 'var(--g)' : credits > 0 ? 'var(--a)' : 'var(--r)' }}>
                  {credits === null ? '...' : `${credits} / 20회`}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width .4s',
                  background: credits > 5 ? 'var(--g)' : credits > 0 ? 'var(--a)' : 'var(--r)',
                  width: credits === null ? '0%' : `${(credits / 20) * 100}%`,
                }} />
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 10, lineHeight: 1.6 }}>
            매월 1일 초기화됩니다. 무제한으로 사용하려면 아래에서 API 키를 등록하세요.
          </p>
        </SettingsCard>
      )}

      {/* API 키 */}
      <SettingsCard icon="🔑" title="내 API 키 사용 (무제한)" badge={maskedKey}>
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '12px 14px',
          fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.7,
          marginBottom: 14,
        }}>
          <p style={{ fontWeight: 600, color: 'var(--ink2)', marginBottom: 4 }}>Anthropic API 키를 직접 사용하면?</p>
          <p>월 20회 무료 제한 없이 <strong style={{ color: 'var(--ink)' }}>무제한</strong>으로 경력 기록을 생성할 수 있습니다. API 사용 비용은 Anthropic에 직접 지불됩니다.</p>
          <p style={{ marginTop: 4, color: 'var(--ink4)' }}>기록 데이터는 생성 요청 시에만 전송됩니다.</p>
        </div>

        <a
          href="#"
          onClick={e => { e.preventDefault(); window.careerlog.openExternal('https://console.anthropic.com/settings/keys') }}
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

        {saved && <StatusMsg type="success">✓ API 키가 저장되었습니다. 이제 무제한으로 사용할 수 있습니다.</StatusMsg>}
        {saveError && <StatusMsg type="error">⚠ {saveError}</StatusMsg>}
        {maskedKey && !saved && (
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--g)', display: 'flex', alignItems: 'center', gap: 5 }}>
            ✓ 자체 API 키 사용 중 — 무제한 생성 가능
          </p>
        )}
      </SettingsCard>

      {/* 앱 제외 목록 */}
      <SettingsCard icon="🚫" title="앱 제외 목록">
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', marginBottom: 12, lineHeight: 1.6 }}>
          타임라인에서 숨길 앱 이름을 등록하세요. 부분 일치 문자열로 필터링됩니다.
        </p>

        {blacklist.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {blacklist.map(app => (
              <span key={app} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                borderRadius: 20, padding: '3px 10px', fontSize: 12, color: 'var(--ink2)',
              }}>
                {app}
                <button onClick={() => handleRemoveBlacklist(app)} style={{
                  background: 'none', border: 'none', color: 'var(--ink3)',
                  cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0,
                  display: 'flex', alignItems: 'center',
                }}>✕</button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newApp}
            onChange={e => setNewApp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddBlacklist()}
            placeholder="예: Spotify, System Preferences..."
            style={{
              flex: 1, padding: '9px 13px',
              background: 'var(--bg3)', border: '1.5px solid var(--border2)',
              borderRadius: 9, fontSize: 13, color: 'var(--ink)',
              fontFamily: "'Noto Sans KR', sans-serif", outline: 'none',
              transition: 'border-color .15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--a)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
          />
          <button onClick={handleAddBlacklist} disabled={!newApp.trim()} style={{
            padding: '9px 14px', borderRadius: 9,
            background: newApp.trim() ? 'var(--a)' : 'var(--bg3)',
            color: newApp.trim() ? '#000' : 'var(--ink3)',
            border: 'none', fontSize: 13, fontWeight: 700,
            cursor: newApp.trim() ? 'pointer' : 'not-allowed',
            fontFamily: "'Noto Sans KR', sans-serif",
            transition: 'all .15s', flexShrink: 0,
          }}>추가</button>
        </div>
      </SettingsCard>

      {/* 데이터 내보내기/가져오기 */}
      <SettingsCard icon="💾" title="데이터 백업">
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', marginBottom: 14, lineHeight: 1.6 }}>
          모든 세션·활동·경력 기록을 JSON으로 내보내거나 가져올 수 있습니다. 가져오기는 기존 데이터에 병합됩니다.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} style={dataBtn('var(--b-dim)', 'var(--b)', 'rgba(95,168,211,.25)')}>
            {exportStatus === 'exporting' ? '내보내는 중...' : exportStatus === 'done' ? '✓ 완료' : exportStatus === 'error' ? '⚠ 오류' : '⬆ 내보내기'}
          </button>
          <button onClick={handleImport} style={dataBtn('var(--a-dim)', 'var(--a)', 'rgba(212,168,75,.25)')}>
            {importStatus === 'importing' ? '가져오는 중...' : importStatus === 'done' ? '✓ 병합 완료' : importStatus === 'error' ? '⚠ 오류' : '⬇ 가져오기'}
          </button>
        </div>
      </SettingsCard>

      {/* 업무 흐름 설정 */}
      <SettingsCard icon="⚡" title="업무 흐름">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>업무 종료 후 태깅 건너뛰기</p>
            <p style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5 }}>종료 즉시 타임라인으로 이동합니다.<br />숙련 사용자에게 권장합니다.</p>
          </div>
          <button onClick={handleToggleSkipTagging} style={{
            width: 44, height: 24, borderRadius: 12, border: 'none',
            background: skipTagging ? 'var(--a)' : 'var(--bg4)',
            cursor: 'pointer', position: 'relative', flexShrink: 0,
            transition: 'background .2s',
          }}>
            <span style={{
              position: 'absolute', top: 3,
              left: skipTagging ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left .2s',
            }} />
          </button>
        </div>
      </SettingsCard>

      {/* 감지 설정 */}
      <SettingsCard icon="⚙" title="감지 설정">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['감지 간격', '30초'],
            ['활동 병합 기준', '5분 미만'],
            ['버전', 'v0.2.0'],
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

      {/* 데이터 삭제 */}
      <SettingsCard icon="🗑" title="데이터 초기화">
        <p style={{ fontSize: 12.5, color: 'var(--ink3)', marginBottom: 16, lineHeight: 1.6 }}>
          모든 세션, 활동 기록, 경력 기록이 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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

const profileInputStyle = {
  width: '100%', padding: '9px 13px',
  background: 'var(--bg3)', border: '1.5px solid var(--border2)',
  borderRadius: 9, fontSize: 13, color: 'var(--ink)',
  fontFamily: "'Noto Sans KR', sans-serif", outline: 'none',
  transition: 'border-color .15s', boxSizing: 'border-box',
}

function dataBtn(bg, color, border) {
  return {
    flex: 1, padding: '10px 0',
    background: bg, color,
    border: `1px solid ${border}`,
    borderRadius: 9, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Noto Sans KR', sans-serif",
    transition: 'all .15s',
  }
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
