import { useState } from 'react'

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0) // 0=welcome, 1=ai-setup, 2=api-key-input, 3=first-record
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyError, setApiKeyError] = useState('')
  const [validating, setValidating] = useState(false)

  async function handleSkipAI() {
    await window.careerlog.saveAppSettings({ onboarding_ai: 'skipped' })
    setStep(3)
  }

  async function handleFreeStart() {
    await window.careerlog.saveAppSettings({ onboarding_ai: 'free' })
    setStep(3)
  }

  async function handleApiKeySubmit() {
    if (!apiKeyInput.trim()) return
    setValidating(true)
    setApiKeyError('')
    const res = await window.careerlog.validateApiKey(apiKeyInput.trim())
    setValidating(false)
    if (res.valid) {
      await window.careerlog.saveApiKey(apiKeyInput.trim())
      await window.careerlog.saveAppSettings({ onboarding_ai: 'api_key' })
      setStep(3)
    } else {
      setApiKeyError('API 키가 유효하지 않습니다. 다시 확인해주세요.')
    }
  }

  async function handleFinish() {
    await window.careerlog.completeOnboarding()
    onComplete()
  }

  async function handleStartTracking() {
    await window.careerlog.completeOnboarding()
    onComplete('start')
  }

  async function handleSampleData() {
    const { sessionId } = await window.careerlog.insertSampleData()
    await window.careerlog.completeOnboarding()
    onComplete('sample', sessionId)
  }

  const totalSteps = 3
  const currentStep = step === 0 ? 0 : step <= 2 ? 1 : 2

  return (
    <div style={{
      minHeight: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '28px 32px',
    }}>
      {/* 스텝 인디케이터 */}
      {step > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: i <= currentStep - 1 ? 24 : 8, height: 8, borderRadius: 4,
              background: i < currentStep ? 'var(--a)' : i === currentStep ? 'var(--a)' : 'var(--bg4)',
              transition: 'all .3s',
            }} />
          ))}
        </div>
      )}

      {/* ── Step 0: 환영 ── */}
      {step === 0 && (
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }} className="fade-up">
          <div style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 38, color: 'var(--a)', marginBottom: 8, letterSpacing: '-.5px',
          }}>
            Career<em style={{ fontStyle: 'italic', color: 'var(--ink2)' }}>Log</em>
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 32 }}>
            일하는 순간마다<br />경력이 자동으로 쌓입니다
          </p>

          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 20px', textAlign: 'left', marginBottom: 28,
          }}>
            {[
              ['⊙', '오늘 어떤 앱을 사용했는지 자동으로 기록됩니다'],
              ['✦', 'AI가 이력서용 경력 기록으로 변환합니다'],
              ['▤', '매일 쌓이면 이직할 때 꺼내 쓰면 됩니다'],
            ].map(([icon, text], i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                marginBottom: i < 2 ? 14 : 0,
              }}>
                <span style={{ color: 'var(--a)', fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                <span style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          <button onClick={() => setStep(1)} style={primaryBtn}>
            시작하기 →
          </button>
          <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 10 }}>예상 소요 시간: 2분</p>
          <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 6, lineHeight: 1.6 }}>
            🔒 모든 기록은 이 PC에만 저장됩니다. 외부 서버로 전송되지 않습니다.
          </p>
        </div>
      )}

      {/* ── Step 1: AI 설정 ── */}
      {step === 1 && (
        <div style={{ maxWidth: 380, width: '100%' }} className="fade-up">
          <h2 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22, color: 'var(--ink)', marginBottom: 6, letterSpacing: '-.3px',
          }}>AI 경력 기록 설정</h2>
          <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 22, lineHeight: 1.6 }}>
            AI 기능을 어떻게 사용하시겠어요?
          </p>

          {/* 무료 시작 카드 */}
          <div style={{
            background: 'var(--bg2)', border: '1.5px solid rgba(212,168,75,.35)',
            borderRadius: 14, padding: '16px 18px', marginBottom: 10, cursor: 'pointer',
            transition: 'all .2s',
          }}
            onClick={handleFreeStart}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--a-dim)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--bg2)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>무료로 시작하기</span>
              <span style={{
                marginLeft: 'auto', fontSize: 11, background: 'var(--a)', color: '#000',
                padding: '2px 8px', borderRadius: 20, fontWeight: 700,
              }}>추천</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.5, paddingLeft: 30 }}>
              월 5회 무료 AI 생성 제공<br />별도 가입 없이 즉시 사용
            </p>
            <button style={{
              ...primaryBtn, marginTop: 12, fontSize: 13,
              padding: '10px 0', pointerEvents: 'none',
            }}>무료로 시작하기</button>
          </div>

          {/* API 키 입력 카드 */}
          <div style={{
            background: 'var(--bg2)', border: '1.5px solid var(--border2)',
            borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
            transition: 'all .2s', marginBottom: 14,
          }}
            onClick={() => setStep(2)}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--ink3)' }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>🔑</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>내 API 키 사용하기</span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.5, paddingLeft: 30 }}>
              Anthropic API 키를 직접 입력<br />무제한 사용 (비용 직접 부담)
            </p>
          </div>

          <button onClick={handleSkipAI} style={{
            background: 'none', border: 'none', fontSize: 12.5, color: 'var(--ink3)',
            cursor: 'pointer', width: '100%', textAlign: 'center',
          }}>
            나중에 설정하기 (AI 기능 제한)
          </button>
        </div>
      )}

      {/* ── Step 2: API 키 직접 입력 ── */}
      {step === 2 && (
        <div style={{ maxWidth: 380, width: '100%' }} className="fade-up">
          <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--ink3)', cursor: 'pointer', fontSize: 13, marginBottom: 20 }}>← 뒤로</button>

          <h2 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22, color: 'var(--ink)', marginBottom: 20, letterSpacing: '-.3px',
          }}>API 키 입력</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            {['1. Anthropic Console에 접속하세요', '2. "API Keys" 메뉴에서 키를 생성하세요', '3. 복사한 키를 아래에 붙여넣으세요'].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--a-dim)', border: '1px solid rgba(212,168,75,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--a)', flexShrink: 0,
                }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6 }}>
                  {i === 0 ? (
                    <>Anthropic Console에 접속하세요{' '}
                      <button onClick={() => window.careerlog.openExternal('https://console.anthropic.com/settings/keys')}
                        style={{ background: 'none', border: 'none', color: 'var(--a)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        (열기 →)
                      </button>
                    </>
                  ) : s.replace(/^\d+\. /, '')}
                </span>
              </div>
            ))}
          </div>

          <input
            type="password"
            value={apiKeyInput}
            onChange={e => { setApiKeyInput(e.target.value); setApiKeyError('') }}
            onKeyDown={e => e.key === 'Enter' && handleApiKeySubmit()}
            placeholder="sk-ant-..."
            style={{
              width: '100%', padding: '11px 14px',
              background: 'var(--bg3)', border: `1.5px solid ${apiKeyError ? 'var(--r)' : 'var(--border2)'}`,
              borderRadius: 10, fontSize: 13.5, color: 'var(--ink)',
              fontFamily: "'Noto Sans KR', sans-serif", outline: 'none', marginBottom: 8,
            }}
          />
          {apiKeyError && <p style={{ fontSize: 12, color: 'var(--r)', marginBottom: 10 }}>{apiKeyError}</p>}

          <button onClick={handleApiKeySubmit} disabled={!apiKeyInput.trim() || validating} style={{
            ...primaryBtn, opacity: (!apiKeyInput.trim() || validating) ? 0.6 : 1,
          }}>
            {validating ? '확인 중...' : '확인 및 다음 →'}
          </button>

          <p style={{ fontSize: 11.5, color: 'var(--ink3)', textAlign: 'center', marginTop: 10 }}>
            🔒 API 키는 이 기기에만 저장됩니다
          </p>
        </div>
      )}

      {/* ── Step 3: 첫 기록 시작 ── */}
      {step === 3 && (
        <div style={{ maxWidth: 380, width: '100%', textAlign: 'center' }} className="fade-up">
          <h2 style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 22, color: 'var(--ink)', marginBottom: 8, letterSpacing: '-.3px',
          }}>
            준비 완료! <em style={{ color: 'var(--a)', fontStyle: 'italic' }}>첫 기록을 시작하세요</em>
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: 24 }}>
            지금 업무를 시작하거나, 샘플 데이터로 먼저 체험해볼 수 있습니다.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleStartTracking} style={primaryBtn}>
              ▶ 지금 업무 시작하기
            </button>
            <button onClick={handleSampleData} style={{
              ...primaryBtn, background: 'var(--bg2)', color: 'var(--a)',
              border: '1.5px solid rgba(212,168,75,.35)', fontWeight: 700,
            }}>
              ✦ 샘플 데이터로 먼저 체험하기
            </button>
            <button onClick={handleFinish} style={{
              background: 'none', border: 'none', fontSize: 12.5,
              color: 'var(--ink3)', cursor: 'pointer', padding: '6px 0',
            }}>
              나중에 시작하기
            </button>
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 12, lineHeight: 1.6 }}>
            업무가 끝나면 CareerLog를 열어 기록을 완료하세요.<br />
            시스템 트레이에서도 언제든지 시작/종료할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  )
}

const primaryBtn = {
  width: '100%', padding: '13px 0',
  background: 'var(--a)', color: '#000',
  border: 'none', borderRadius: 12,
  fontSize: 14, fontWeight: 700, cursor: 'pointer',
  fontFamily: "'Noto Sans KR', sans-serif",
  transition: 'all .15s',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
}
