import { useState, useEffect, useCallback } from 'react'
import { Zap, BarChart2, Rocket, Loader2, Trash2 } from 'lucide-react'

const SPIN_CSS = `
@keyframes cp-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.cp-spin {
  animation: cp-spin 0.8s linear infinite;
  display: inline-flex;
}
`

const BUTTONS = [
  {
    id: 'gap-detection',
    label: 'Trigger Gap Detection',
    icon: Zap,
    action: 'gap-detection',
  },
  {
    id: 'evaluation',
    label: 'Run Evaluation',
    icon: BarChart2,
    action: 'evaluation',
  },
  {
    id: 'deploy',
    label: 'Approve Deployment',
    icon: Rocket,
    action: 'deploy',
  },
]

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{
      position: 'fixed',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--color-accent)',
      color: '#0F172A',
      padding: '8px 18px',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'var(--font-heading)',
      zIndex: 9999,
      boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}

export default function ControlPanel({ onClear }) {
  const [loadingId, setLoadingId] = useState(null)
  const [toast, setToast] = useState(null)   // { message }
  const [errorId, setErrorId] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [hovered, setHovered] = useState(null)
  const [clearHovered, setClearHovered] = useState(false)

  useEffect(() => {
    const id = 'cp-spin-style'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = SPIN_CSS
      document.head.appendChild(style)
    }
  }, [])

  const dismissToast = useCallback(() => setToast(null), [])

  async function handleClear() {
    if (loadingId) return
    setLoadingId('clear')
    try {
      await fetch('/api/control/clear', { method: 'POST' })
      setToast({ message: '✓ Events cleared' })
      onClear?.()
    } catch {
      setToast({ message: '✗ Clear failed' })
    } finally {
      setLoadingId(null)
    }
  }

  async function handleClick(btn) {
    if (loadingId) return
    setLoadingId(btn.id)
    setErrorId(null)
    setErrorMsg('')

    try {
      const res = await fetch(`/api/control/${btn.action}`, { method: 'POST' })
      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error')
        throw new Error(text || `HTTP ${res.status}`)
      }
      setToast({ message: `✓ ${btn.label} triggered` })
    } catch (err) {
      setErrorId(btn.id)
      setErrorMsg(err.message ?? 'Request failed')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div>
      {toast && <Toast message={toast.message} onDone={dismissToast} />}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        {/* Clear button */}
        <button
          disabled={!!loadingId}
          onClick={handleClear}
          onMouseEnter={() => setClearHovered(true)}
          onMouseLeave={() => setClearHovered(false)}
          onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
          title="Clear all events"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 6,
            border: `1px solid ${clearHovered ? 'transparent' : 'var(--color-border)'}`,
            background: clearHovered ? 'var(--color-destructive)' : 'var(--color-secondary)',
            color: clearHovered ? '#fff' : 'var(--color-foreground)',
            fontSize: 12,
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            cursor: loadingId ? 'not-allowed' : 'pointer',
            opacity: loadingId && loadingId !== 'clear' ? 0.5 : 1,
            transition: 'background 150ms, color 150ms, border-color 150ms, transform 150ms',
            transform: 'scale(1)',
            whiteSpace: 'nowrap',
          }}
        >
          {loadingId === 'clear' ? <span className="cp-spin"><Loader2 size={13} /></span> : <Trash2 size={13} />}
          Clear
        </button>

        {BUTTONS.map(btn => {
          const isLoading = loadingId === btn.id
          const isDisabled = !!loadingId
          const isHovered = hovered === btn.id && !isDisabled
          const Icon = btn.icon

          return (
            <div key={btn.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <button
                disabled={isDisabled}
                onClick={() => handleClick(btn)}
                onMouseEnter={() => !isDisabled && setHovered(btn.id)}
                onMouseLeave={() => setHovered(null)}
                onMouseDown={e => { if (!isDisabled) e.currentTarget.style.transform = 'scale(0.95)' }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: `1px solid ${isHovered ? 'transparent' : 'var(--color-border)'}`,
                  background: isHovered
                    ? 'var(--color-accent)'
                    : 'var(--color-secondary)',
                  color: isHovered ? '#0F172A' : 'var(--color-foreground)',
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled && !isLoading ? 0.5 : 1,
                  transition: 'background 150ms, color 150ms, border-color 150ms, transform 150ms',
                  transform: 'scale(1)',
                  whiteSpace: 'nowrap',
                }}
              >
                {isLoading ? (
                  <span className="cp-spin">
                    <Loader2 size={13} />
                  </span>
                ) : (
                  <Icon size={13} />
                )}
                {btn.label}
              </button>

              {errorId === btn.id && (
                <span style={{
                  fontSize: 10,
                  color: 'var(--color-destructive)',
                  fontFamily: 'var(--font-heading)',
                  maxWidth: 160,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {errorMsg}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
