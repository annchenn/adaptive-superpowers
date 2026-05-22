import { useRef, useEffect, useState } from 'react'

const STATUS_COLORS = {
  started:   '#3B82F6',
  completed: 'var(--color-accent)',
  error:     'var(--color-destructive)',
}

const STATUS_LABELS = {
  started:   'START',
  completed: 'DONE',
  error:     'ERROR',
}

const SUB_GLYPH = { file: '✎', question: '?', todo: '☑' }

function formatSubEvent(evt) {
  const d = evt.data || {}
  if (evt.subType === 'file')     return d.path || 'file'
  if (evt.subType === 'question') return d.answer ? `${d.question} → ${d.answer}` : (d.question || 'question')
  if (evt.subType === 'todo')     return d.current ? `${d.done}/${d.total} · ${d.current}` : `${d.done}/${d.total}`
  return evt.subType || 'event'
}

const SLIDE_IN_CSS = `
@keyframes st-slideIn {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes st-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
.st-row-enter {
  animation: st-slideIn 250ms ease-out both;
}
.st-dot-pulse {
  animation: st-pulse 1.4s ease-in-out infinite;
}
`

function formatTime(iso) {
  if (!iso) return '--:--:--'
  try {
    const d = new Date(iso)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  } catch {
    return '--:--:--'
  }
}

export default function SessionTimeline({ events, onStepSelect, selectedStep }) {
  const bottomRef = useRef(null)
  const [showDetails, setShowDetails] = useState(true)

  // Inject CSS once
  useEffect(() => {
    const id = 'st-keyframes-style'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = SLIDE_IN_CSS
      document.head.appendChild(style)
    }
  }, [])

  // Auto-scroll to bottom when events change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  const eventList = (events ?? []).filter(e => showDetails || e.status !== 'sub-event')
  const parentCount = (events ?? []).filter(e => e.status !== 'sub-event').length

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: 'var(--font-body)',
      color: 'var(--color-foreground)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'var(--color-primary)',
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.04em',
        }}>
          Session Timeline
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowDetails(v => !v)}
            title="Toggle sub-event details"
            style={{
              background: showDetails ? 'var(--color-accent)' : 'var(--color-secondary)',
              color: showDetails ? '#0F172A' : 'var(--color-foreground)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '1px 7px',
              fontSize: 9,
              fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Details
          </button>
          <span style={{
            background: 'var(--color-secondary)',
            color: 'var(--color-foreground)',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-heading)',
            borderRadius: 10,
            padding: '1px 8px',
            minWidth: 24,
            textAlign: 'center',
            border: '1px solid var(--color-border)',
          }}>
            {parentCount}
          </span>
        </div>
      </div>

      {/* Scrollable event list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 0',
      }}>
        {eventList.length === 0 ? (
          /* Empty state */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            gap: 10,
            opacity: 0.6,
          }}>
            <div
              className="st-dot-pulse"
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--color-accent)',
              }}
            />
            <span style={{ fontSize: 12, textAlign: 'center', fontFamily: 'var(--font-body)' }}>
              Waiting for pipeline events...
            </span>
          </div>
        ) : (
          eventList.map((event, idx) => {
            // Sub-event: indented, compact, de-emphasized row
            if (event.status === 'sub-event') {
              return (
                <div
                  key={idx}
                  className="st-row-enter"
                  role="button"
                  tabIndex={0}
                  onClick={() => onStepSelect && onStepSelect(event.skill)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onStepSelect && onStepSelect(event.skill) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 12px 3px 28px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: 10,
                    color: 'var(--color-foreground)',
                    opacity: 0.6,
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.6' }}
                >
                  <span style={{ flexShrink: 0, width: 12, textAlign: 'center', color: 'var(--color-accent)' }}>
                    {SUB_GLYPH[event.subType] ?? '·'}
                  </span>
                  <span style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {formatSubEvent(event)}
                  </span>
                </div>
              )
            }

            const isSelected = selectedStep === event.skill
            const badgeColor = STATUS_COLORS[event.status] ?? 'var(--color-border)'
            const badgeLabel = STATUS_LABELS[event.status] ?? (event.status ?? '?').toUpperCase()

            return (
              <div
                key={idx}
                className="st-row-enter"
                role="button"
                tabIndex={0}
                onClick={() => onStepSelect && onStepSelect(event.skill)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onStepSelect && onStepSelect(event.skill)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  background: isSelected ? 'var(--color-secondary)' : 'transparent',
                  borderLeft: isSelected
                    ? '2px solid var(--color-accent)'
                    : '2px solid transparent',
                  transition: 'background 0.15s, border-color 0.15s',
                  userSelect: 'none',
                }}
                onMouseEnter={e => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(51,65,85,0.5)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Timestamp */}
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 10,
                  color: 'var(--color-foreground)',
                  opacity: 0.5,
                  flexShrink: 0,
                  minWidth: 52,
                  letterSpacing: '0.02em',
                }}>
                  {formatTime(event.timestamp)}
                </span>

                {/* Skill name */}
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 11,
                  fontWeight: 500,
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'var(--color-foreground)',
                }}>
                  {event.skill ?? 'unknown'}
                </span>

                {/* Status badge */}
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: badgeColor,
                  border: `1px solid ${badgeColor}`,
                  borderRadius: 4,
                  padding: '1px 5px',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                }}>
                  {badgeLabel}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
