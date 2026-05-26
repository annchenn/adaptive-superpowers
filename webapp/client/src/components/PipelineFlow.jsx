import { useEffect } from 'react'
import {
  Lightbulb, FileText, Search, GitBranch, BarChart2, Package, Zap,
  CheckCircle2, AlertCircle, Clock, ChevronDown,
  GitFork, FlaskConical, MessageSquareCode, GitMerge
} from 'lucide-react'

// Full Superpowers Basic Workflow + adaptive-superpowers extensions (G1/G2)
const PIPELINE_STEPS = [
  { id: 'brainstorming',               label: 'Brainstorming',        icon: 'Lightbulb',        group: 'core' },
  { id: 'using-git-worktrees',         label: 'Git Worktree',         icon: 'GitFork',          group: 'core' },
  { id: 'writing-plans',               label: 'Writing Plans',        icon: 'FileText',         group: 'core' },
  { id: 'skill-gap-detection',          label: 'Gap Detection',        icon: 'Search',           group: 'g1'   },
  { id: 'candidates-generated',        label: 'Candidate Generation', icon: 'GitBranch',        group: 'g1'   },
  { id: 'evaluation-result',           label: 'Evaluation',           icon: 'BarChart2',        group: 'g2'   },
  { id: 'skill-deployed',              label: 'Skill Deployed',       icon: 'Package',          group: 'g2'   },
  { id: 'subagent-driven-development', label: 'Execution',            icon: 'Zap',              group: 'core' },
  { id: 'test-driven-development',     label: 'TDD',                  icon: 'FlaskConical',     group: 'core' },
  { id: 'requesting-code-review',      label: 'Code Review',          icon: 'MessageSquareCode', group: 'core' },
  { id: 'finishing-a-development-branch', label: 'Finish Branch',     icon: 'GitMerge',         group: 'core' },
]

const GROUP_LABELS = {
  core: null,
  g1:   { text: 'G1 · Adaptive', color: '#3B82F6' },
  g2:   { text: 'G2 · Adaptive', color: '#8B5CF6' },
}

const ICONS = { Lightbulb, FileText, Search, GitBranch, BarChart2, Package, Zap, GitFork, FlaskConical, MessageSquareCode, GitMerge }

// Step 5 (candidates-generated) is logged by generate-candidates.py with
// e.skill = "skill-gap-detection" and e.status = "candidates-generating" / "candidates-generated"
// Steps 6-7 are normalized by App.jsx (G2_STATUS_MAP) so they behave like normal skill events.
function matchesStep(e, stepId) {
  if (stepId === 'candidates-generated') {
    return e.status === 'candidates-generated' || e.status === 'candidates-generating'
  }
  return e.skill === stepId
}

function getStepStatus(stepId, stepIndex, events) {
  if (!events || events.length === 0) return { status: 'waiting', event: null }

  const stepEvents = events.filter(e => matchesStep(e, stepId) && e.status !== 'sub-event')
  if (stepEvents.length === 0) {
    const laterStepIds = PIPELINE_STEPS.slice(stepIndex + 1).map(s => s.id)
    const laterTouched = events.some(e =>
      laterStepIds.some(id => matchesStep(e, id)) && e.status !== 'sub-event'
    )
    return { status: laterTouched ? 'skipped' : 'waiting', event: null }
  }

  const latest = stepEvents[stepEvents.length - 1]

  if (stepId === 'candidates-generated') {
    if (latest.status === 'candidates-generating') return { status: 'active',    event: latest }
    return { status: 'completed', event: latest }
  }

  if (latest.status === 'started')   return { status: 'active',    event: latest }
  if (latest.status === 'error')     return { status: 'error',     event: latest }
  if (latest.status === 'completed') {
    if (stepId === 'skill-gap-detection' && latest.data?.gaps?.length > 0) {
      return { status: 'warning', event: latest }
    }
    return { status: 'completed', event: latest }
  }

  return { status: 'waiting', event: null }
}

function formatTime(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  } catch {
    return ''
  }
}

const STATUS_STYLES = {
  waiting: {
    border: '1px solid var(--color-border)',
    boxShadow: 'none',
    opacity: 0.4,
    iconColor: 'var(--color-foreground)',
  },
  active: {
    border: '1px solid #3B82F6',
    boxShadow: '0 0 10px rgba(59,130,246,0.35)',
    opacity: 1,
    iconColor: '#3B82F6',
  },
  completed: {
    border: '1px solid var(--color-accent)',
    boxShadow: 'none',
    opacity: 1,
    iconColor: 'var(--color-accent)',
  },
  error: {
    border: '1px solid var(--color-destructive)',
    boxShadow: 'none',
    opacity: 1,
    iconColor: 'var(--color-destructive)',
  },
  skipped: {
    border: '1px dashed var(--color-border)',
    boxShadow: 'none',
    opacity: 0.45,
    iconColor: 'var(--color-foreground)',
  },
  warning: {
    border: '1px solid var(--color-warning)',
    boxShadow: 'none',
    opacity: 1,
    iconColor: 'var(--color-warning)',
  },
}

const STATUS_LABELS = {
  waiting:   { label: 'Waiting',   color: 'var(--color-border)'      },
  skipped:   { label: 'Skipped',   color: 'var(--color-border)'      },
  active:    { label: 'Active',    color: '#3B82F6'                  },
  completed: { label: 'Done',      color: 'var(--color-accent)'      },
  error:     { label: 'Error',     color: 'var(--color-destructive)' },
  warning:   { label: 'Gaps',      color: 'var(--color-warning)'     },
}

const PULSE_CSS = `
@keyframes pf-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
.pf-pulse {
  animation: pf-pulse 1.4s ease-in-out infinite;
}
`

export default function PipelineFlow({ events, selectedStep, onStepSelect }) {
  // Inject keyframe CSS once
  useEffect(() => {
    const id = 'pf-pulse-style'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = PULSE_CSS
      document.head.appendChild(style)
    }
    return () => { /* intentionally leave the style tag */ }
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: '16px 12px',
        gap: 0,
        fontFamily: 'var(--font-body, "Fira Sans", sans-serif)',
        color: 'var(--color-foreground)',
      }}
    >
      {PIPELINE_STEPS.map((step, idx) => {
        const { status, event } = getStepStatus(step.id, idx, events)
        const styles = STATUS_STYLES[status]
        const statusMeta = STATUS_LABELS[status]
        const IconComp = ICONS[step.icon]
        const isSelected = selectedStep === step.id
        const timeStr = (status === 'active' || status === 'completed' || status === 'error' || status === 'warning')
          ? formatTime(event?.timestamp)
          : ''

        return (
          <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            {/* Step card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onStepSelect && onStepSelect(step.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { onStepSelect && onStepSelect(step.id) } }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 8,
                background: 'var(--color-primary, #1E293B)',
                border: styles.border,
                boxShadow: isSelected
                  ? `${styles.boxShadow || 'none'}, 0 0 0 2px var(--color-accent)`
                  : styles.boxShadow,
                outline: 'none',
                opacity: styles.opacity,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, border-color 0.2s, opacity 0.2s',
                userSelect: 'none',
              }}
            >
              {/* Step number */}
              <div
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: status === 'waiting' ? 'transparent' : styles.iconColor,
                  border: `1px solid ${styles.iconColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: status === 'waiting' ? styles.iconColor : 'var(--color-background, #0F172A)',
                  flexShrink: 0,
                  fontFamily: 'var(--font-heading, "Fira Code", monospace)',
                }}
              >
                {idx + 1}
              </div>

              {/* Icon */}
              <div
                className={status === 'active' ? 'pf-pulse' : ''}
                style={{ color: styles.iconColor, flexShrink: 0, display: 'flex', alignItems: 'center' }}
              >
                {IconComp && <IconComp size={18} />}
              </div>

              {/* Label + group badge + timestamp */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading, "Fira Code", monospace)',
                      fontSize: 13,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {step.label}
                  </div>
                  {GROUP_LABELS[step.group] && (
                    <span style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-heading, "Fira Code", monospace)',
                      fontWeight: 700,
                      color: GROUP_LABELS[step.group].color,
                      border: `1px solid ${GROUP_LABELS[step.group].color}`,
                      borderRadius: 3,
                      padding: '0 4px',
                      opacity: 0.85,
                      flexShrink: 0,
                    }}>
                      {GROUP_LABELS[step.group].text}
                    </span>
                  )}
                </div>
                {timeStr && (
                  <div
                    style={{
                      fontSize: 11,
                      color: styles.iconColor,
                      marginTop: 2,
                      fontFamily: 'var(--font-heading, "Fira Code", monospace)',
                      opacity: 0.8,
                    }}
                  >
                    {timeStr}
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                {status === 'active' && (
                  <Clock size={14} style={{ color: styles.iconColor }} />
                )}
                {status === 'completed' && (
                  <CheckCircle2 size={14} style={{ color: styles.iconColor }} />
                )}
                {status === 'error' && (
                  <AlertCircle size={14} style={{ color: styles.iconColor }} />
                )}
                {status === 'warning' && (
                  <AlertCircle size={14} style={{ color: styles.iconColor }} />
                )}
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: statusMeta.color,
                    fontFamily: 'var(--font-heading, "Fira Code", monospace)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {statusMeta.label}
                </span>
              </div>
            </div>

            {/* Connector arrow between steps */}
            {idx < PIPELINE_STEPS.length - 1 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '2px 0',
                }}
              >
                <div
                  style={{
                    width: 1,
                    height: 10,
                    background: 'var(--color-border)',
                    opacity: 0.5,
                  }}
                />
                <ChevronDown
                  size={12}
                  style={{ color: 'var(--color-border)', opacity: 0.5, marginTop: -2 }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
