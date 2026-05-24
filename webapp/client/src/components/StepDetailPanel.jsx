import { useEffect } from 'react'
import { X, Crown } from 'lucide-react'

const SLIDE_CSS = `
@keyframes sdp-slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
`

function getStepEvents(step, events) {
  if (!events || !step) return []
  return events.filter(e => e.skill === step)
}

function getSubEvents(step, events) {
  if (!events || !step) return []
  return events.filter(e => e.skill === step && e.status === 'sub-event')
}

function getLatestCompleted(step, events) {
  const stepEvents = getStepEvents(step, events)
  const completed = stepEvents.filter(e => e.status === 'completed')
  return completed.length > 0 ? completed[completed.length - 1] : null
}

function getStartEvent(step, events) {
  const stepEvents = getStepEvents(step, events)
  const started = stepEvents.filter(e => e.status === 'started')
  return started.length > 0 ? started[0] : null
}

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

function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return null
  try {
    const diff = Math.round((new Date(endIso) - new Date(startIso)) / 1000)
    if (diff < 60) return `${diff}s`
    const m = Math.floor(diff / 60)
    const s = diff % 60
    return `${m}m ${s}s`
  } catch {
    return null
  }
}

/* ── Shared sub-components ─────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: 'var(--color-foreground)',
      opacity: 0.5,
      marginBottom: 6,
      fontFamily: 'var(--font-heading)',
    }}>
      {children}
    </div>
  )
}

function MetaRow({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'baseline' }}>
      <span style={{ fontSize: 12, opacity: 0.55, flexShrink: 0, minWidth: 80, fontFamily: 'var(--font-body)' }}>
        {label}
      </span>
      <span style={{
        fontSize: 12,
        fontFamily: 'var(--font-heading)',
        color: valueColor ?? 'var(--color-foreground)',
        wordBreak: 'break-all',
      }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function TimingHeader({ step, events }) {
  const startEvt = getStartEvent(step, events)
  const doneEvt  = getLatestCompleted(step, events)
  const duration = formatDuration(startEvt?.timestamp, doneEvt?.timestamp)
  if (!startEvt && !doneEvt) return null
  return (
    <div>
      {startEvt && <MetaRow label="Started"   value={formatTime(startEvt.timestamp)} />}
      <MetaRow label="Completed" value={doneEvt ? formatTime(doneEvt.timestamp) : '進行中…'}
               valueColor={doneEvt ? undefined : '#3B82F6'} />
      {duration && <MetaRow label="Duration" value={duration} />}
    </div>
  )
}

function DecisionsSection({ subs }) {
  const questions = subs.filter(e => e.subType === 'question')
  if (questions.length === 0) return null
  return (
    <div style={{ marginTop: 14 }}>
      <SectionLabel>📋 Decisions ({questions.length})</SectionLabel>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {questions.map((evt, i) => {
          const d = evt.data || {}
          return (
            <li key={i} style={{ fontSize: 11, lineHeight: 1.5, display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <span style={{ color: 'var(--color-foreground)', opacity: 0.55, flexShrink: 0, minWidth: 56 }}>
                {d.question || '?'}
              </span>
              <span style={{ color: '#3B82F6', fontWeight: 600, wordBreak: 'break-word' }}>
                {d.answer || '—'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FileRow({ path, action }) {
  return (
    <li style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontFamily: 'var(--font-heading)', lineHeight: 1.5,
    }}>
      <span style={{ flexShrink: 0, color: 'var(--color-accent)', width: 12, textAlign: 'center' }}>
        {action === 'edit' ? '±' : '+'}
      </span>
      <span style={{ flex: 1, minWidth: 0, opacity: 0.85, wordBreak: 'break-all' }}>{path}</span>
    </li>
  )
}

// Walk sub-events in order: bucket each file under the todo step active when it
// was written, producing an ordered checklist of steps with nested files.
function buildProgress(subs) {
  const steps = []        // { label, files: [{path, action}] }
  const preFiles = []     // files written before any todo step
  let cur = null
  let latest = null
  for (const e of subs) {
    if (e.subType === 'todo') {
      latest = e.data || {}
      const label = (latest.current || '').trim()
      if (label && (!cur || cur.label !== label)) {
        cur = { label, files: [] }
        steps.push(cur)
      }
    } else if (e.subType === 'file' && e.data?.path) {
      const f = { path: e.data.path, action: e.data.action }
      ;(cur ? cur.files : preFiles).push(f)
    }
  }
  return { steps, preFiles, latest }
}

function ProgressSection({ subs }) {
  const todos = subs.filter(e => e.subType === 'todo')
  const files = subs.filter(e => e.subType === 'file')
  if (todos.length === 0 && files.length === 0) return null

  // No todos at all → just a flat file list.
  if (todos.length === 0) {
    const seen = new Map()
    for (const e of files) seen.set(e.data?.path, e.data?.action || 'write')
    return (
      <div style={{ marginTop: 14 }}>
        <SectionLabel>📄 Files ({seen.size})</SectionLabel>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 200, overflowY: 'auto' }}>
          {[...seen.entries()].map(([path, action], i) => <FileRow key={i} path={path} action={action} />)}
        </ul>
      </div>
    )
  }

  const { steps, preFiles, latest } = buildProgress(subs)
  const total = latest?.total || 0
  const done = latest?.done || 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div style={{ marginTop: 14 }}>
      <SectionLabel>✓ Progress ({done}/{total})</SectionLabel>

      {/* progress bar */}
      <div style={{ height: 6, background: 'var(--color-secondary)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-accent)', borderRadius: 3, transition: 'width 0.3s ease' }} />
      </div>

      {/* files written before the first tracked step */}
      {preFiles.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {preFiles.map((f, i) => <FileRow key={i} path={f.path} action={f.action} />)}
        </ul>
      )}

      {/* checklist of steps with nested files */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((s, i) => {
          const isLast = i === steps.length - 1
          const stepDone = !isLast || (total > 0 && done >= total)
          return (
            <li key={i}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 11, lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0, width: 12, textAlign: 'center', color: stepDone ? 'var(--color-accent)' : '#3B82F6' }}>
                  {stepDone ? '✓' : '◐'}
                </span>
                <span style={{ opacity: stepDone ? 0.85 : 1, fontWeight: stepDone ? 400 : 600 }}>{s.label}</span>
              </div>
              {s.files.length > 0 && (
                <ul style={{ listStyle: 'none', padding: '2px 0 0 18px', margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {s.files.map((f, j) => <FileRow key={j} path={f.path} action={f.action} />)}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SubEventTimeline({ step, events }) {
  const subs = getSubEvents(step, events)
  if (subs.length === 0) return null
  return (
    <>
      <DecisionsSection subs={subs} />
      <ProgressSection subs={subs} />
    </>
  )
}

/* ── Step-specific detail renderers ────────────────────────────── */

function BrainstormingDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  if (!data.summary) return null
  return (
    <div style={{ marginTop: 12 }}>
      <SectionLabel>Summary</SectionLabel>
      <p style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.85 }}>{data.summary}</p>
    </div>
  )
}

function WritingPlansDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  const hasSteps = Array.isArray(data.steps) && data.steps.length > 0
  if (!data.plan_summary && !hasSteps) return null
  return (
    <div style={{ marginTop: 12 }}>
      {data.plan_summary && (
        <div style={{ marginBottom: 12 }}>
          <SectionLabel>Plan Summary</SectionLabel>
          <p style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.85 }}>{data.plan_summary}</p>
        </div>
      )}
      {hasSteps && (
        <div>
          <SectionLabel>Steps</SectionLabel>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.steps.map((s, i) => (
              <li key={i} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginBottom: 6,
                fontSize: 12,
                lineHeight: 1.5,
              }}>
                <span style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ opacity: 0.85 }}>{typeof s === 'string' ? s : JSON.stringify(s)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function GapDetectionDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  if (!Array.isArray(data.gaps)) return null
  const gaps    = data.gaps

  return (
    <div style={{ marginTop: 12 }}>
      <MetaRow label="Gaps found" value={String(gaps.length)} valueColor={gaps.length > 0 ? 'var(--color-warning)' : 'var(--color-accent)'} />
      {gaps.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <SectionLabel>Gaps</SectionLabel>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {gaps.map((gap, i) => (
              <li key={i} style={{
                marginBottom: 10,
                padding: '8px 10px',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 6,
              }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3, color: 'var(--color-warning)' }}>
                  {gap.name ?? gap.id ?? `Gap ${i + 1}`}
                </div>
                {gap.description && (
                  <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.5 }}>{gap.description}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function CandidatesGeneratedDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  const files   = Array.isArray(data.files) ? data.files : []

  return (
    <div>
      {data.skill && <MetaRow label="Skill"      value={data.skill} />}
      {data.count  && <MetaRow label="Candidates" value={String(data.count)} />}
      {files.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <SectionLabel>Files</SectionLabel>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {files.map((f, i) => (
              <li key={i} style={{
                fontSize: 11,
                fontFamily: 'var(--font-heading)',
                padding: '3px 6px',
                marginBottom: 3,
                background: 'var(--color-primary)',
                borderRadius: 4,
                border: '1px solid var(--color-border)',
                opacity: 0.85,
                wordBreak: 'break-all',
              }}>
                {typeof f === 'string' ? f : JSON.stringify(f)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function EvaluationResultDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  const scores  = data.scores ?? {}
  const versions = Object.keys(scores)
  const metrics  = ['compliance', 'coverage', 'conciseness', 'total']

  return (
    <div>
      {data.winner && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          padding: '8px 12px',
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 8,
        }}>
          <Crown size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, opacity: 0.55, marginBottom: 2, fontFamily: 'var(--font-heading)' }}>WINNER</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: 'var(--color-accent)' }}>
              {data.winner}
            </div>
          </div>
        </div>
      )}
      {versions.length > 0 && (
        <div>
          <SectionLabel>Scores</SectionLabel>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'var(--font-heading)' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Version</th>
                  {metrics.map(m => (
                    <th key={m} style={thStyle}>{m.charAt(0).toUpperCase() + m.slice(1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {versions.map(ver => (
                  <tr key={ver} style={{ background: data.winner === ver ? 'rgba(34,197,94,0.07)' : 'transparent' }}>
                    <td style={{ ...tdStyle, fontWeight: data.winner === ver ? 700 : 400, color: data.winner === ver ? 'var(--color-accent)' : 'inherit' }}>
                      {data.winner === ver && <Crown size={10} style={{ color: 'var(--color-warning)', marginRight: 4, display: 'inline' }} />}
                      {ver}
                    </td>
                    {metrics.map(m => (
                      <td key={m} style={tdStyle}>
                        {scores[ver]?.[m] != null ? scores[ver][m] : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SkillDeployedDetail({ step, events }) {
  const doneEvt    = getLatestCompleted(step, events)
  const data       = doneEvt?.data ?? {}
  const diffLines  = data.diff_preview ? data.diff_preview.split('\n') : []

  return (
    <div>
      {data.skill   && <MetaRow label="Skill"   value={data.skill} />}
      {data.version && <MetaRow label="Version" value={data.version} />}
      {diffLines.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <SectionLabel>Diff Preview</SectionLabel>
          <pre style={{
            ...preStyle,
            maxHeight: 200,
            overflowY: 'auto',
            fontSize: 10,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {diffLines.map((line, i) => {
              const color = line.startsWith('+') ? '#4ade80'
                          : line.startsWith('-') ? '#f87171'
                          : 'inherit'
              return (
                <span key={i} style={{ color, display: 'block' }}>{line}</span>
              )
            })}
          </pre>
        </div>
      )}
    </div>
  )
}

function SubagentDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  const total     = data.tasks_total     ?? null
  const completed = data.tasks_completed ?? null

  if (completed == null || total == null) return null
  return (
    <div style={{ marginTop: 12 }}>
      <MetaRow label="Tasks" value={`${completed} / ${total}`} />
      <div style={{ marginTop: 10 }}>
        <div style={{ height: 6, background: 'var(--color-secondary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${total > 0 ? Math.round((completed / total) * 100) : 0}%`,
            background: 'var(--color-accent)',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ fontSize: 10, marginTop: 4, opacity: 0.55, fontFamily: 'var(--font-heading)' }}>
          {total > 0 ? Math.round((completed / total) * 100) : 0}% complete
        </div>
      </div>
    </div>
  )
}

function GitWorktreeDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  if (!data.branch && !data.path) return null
  return (
    <div style={{ marginTop: 12 }}>
      {data.branch && <MetaRow label="Branch" value={data.branch} valueColor="var(--color-accent)" />}
      {data.path   && <MetaRow label="Path"   value={data.path} />}
    </div>
  )
}

function TDDDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  const cycles  = Array.isArray(data.cycles) ? data.cycles : []
  if (data.tests_written == null && data.tests_passed == null && cycles.length === 0) return null
  return (
    <div style={{ marginTop: 12 }}>
      {data.tests_written != null && <MetaRow label="Tests written" value={String(data.tests_written)} />}
      {data.tests_passed  != null && <MetaRow label="Tests passed"  value={String(data.tests_passed)} valueColor="var(--color-accent)" />}
      {cycles.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <SectionLabel>Cycles</SectionLabel>
          {cycles.map((c, i) => (
            <div key={i} style={{ fontSize: 11, fontFamily: 'var(--font-heading)', padding: '2px 0', opacity: 0.8 }}>→ {c}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function CodeReviewDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  const verdictColor = data.verdict === 'approved' ? 'var(--color-accent)'
                     : data.verdict === 'rejected'  ? 'var(--color-destructive)'
                     : 'var(--color-warning)'
  return (
    <div>
      {data.verdict          && <MetaRow label="Verdict"   value={data.verdict.toUpperCase()} valueColor={verdictColor} />}
      {data.issues_critical  != null && <MetaRow label="Critical"  value={String(data.issues_critical)}  valueColor={data.issues_critical  > 0 ? 'var(--color-destructive)' : undefined} />}
      {data.issues_important != null && <MetaRow label="Important" value={String(data.issues_important)} valueColor={data.issues_important > 0 ? 'var(--color-warning)'     : undefined} />}
      {data.issues_minor     != null && <MetaRow label="Minor"     value={String(data.issues_minor)} />}
      {data.summary && (
        <div style={{ marginTop: 10 }}>
          <SectionLabel>Summary</SectionLabel>
          <p style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.85 }}>{data.summary}</p>
        </div>
      )}
    </div>
  )
}

function FinishBranchDetail({ step, events }) {
  const doneEvt = getLatestCompleted(step, events)
  const data    = doneEvt?.data ?? {}
  if (!data.action && !data.branch) return null
  return (
    <div style={{ marginTop: 12 }}>
      {data.action && <MetaRow label="Action" value={data.action} valueColor="var(--color-accent)" />}
      {data.branch && <MetaRow label="Branch" value={data.branch} />}
      {data.tests_verified != null && <MetaRow label="Tests" value={data.tests_verified ? 'Verified ✓' : 'Not verified'} valueColor={data.tests_verified ? 'var(--color-accent)' : 'var(--color-destructive)'} />}
    </div>
  )
}

function DefaultDetail() {
  // Timing + grouped sub-events cover the generic case; nothing extra to show.
  return null
}

/* ── Shared table styles ─────────────────────────────────────── */
const thStyle = {
  textAlign: 'left',
  padding: '4px 8px',
  borderBottom: '1px solid var(--color-border)',
  fontWeight: 600,
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  opacity: 0.6,
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '4px 8px',
  borderBottom: '1px solid rgba(71,85,105,0.3)',
  fontSize: 11,
}

const preStyle = {
  background: 'var(--color-background)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  padding: '10px 12px',
  fontSize: 11,
  fontFamily: 'var(--font-heading)',
  lineHeight: 1.6,
  overflowX: 'auto',
  color: 'var(--color-foreground)',
  opacity: 0.85,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
}

/* ── renderDetail dispatcher ─────────────────────────────────── */

function renderDetail(step, events) {
  switch (step) {
    case 'brainstorming':                  return <BrainstormingDetail         step={step} events={events} />
    case 'using-git-worktrees':            return <GitWorktreeDetail           step={step} events={events} />
    case 'writing-plans':                  return <WritingPlansDetail          step={step} events={events} />
    case 'gap-detection':                  return <GapDetectionDetail          step={step} events={events} />
    case 'candidates-generated':           return <CandidatesGeneratedDetail   step={step} events={events} />
    case 'evaluation-result':              return <EvaluationResultDetail      step={step} events={events} />
    case 'skill-deployed':                 return <SkillDeployedDetail         step={step} events={events} />
    case 'subagent-driven-development':    return <SubagentDetail              step={step} events={events} />
    case 'test-driven-development':        return <TDDDetail                   step={step} events={events} />
    case 'requesting-code-review':         return <CodeReviewDetail            step={step} events={events} />
    case 'finishing-a-development-branch': return <FinishBranchDetail          step={step} events={events} />
    default:                               return <DefaultDetail                step={step} events={events} />
  }
}

/* ── Status helpers ──────────────────────────────────────────── */

function getStatus(step, events) {
  const stepEvents = getStepEvents(step, events).filter(e => e.status !== 'sub-event')
  if (stepEvents.length === 0) return null
  const latest = stepEvents[stepEvents.length - 1]
  return latest.status
}

const STATUS_COLOR_MAP = {
  started:   '#3B82F6',
  completed: 'var(--color-accent)',
  error:     'var(--color-destructive)',
}

/* ── Main component ─────────────────────────────────────────── */

export default function StepDetailPanel({ step, events, onClose }) {
  // Inject animation CSS once
  useEffect(() => {
    const id = 'sdp-slide-style'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = SLIDE_CSS
      document.head.appendChild(style)
    }
  }, [])

  const status      = getStatus(step, events)
  const statusColor = STATUS_COLOR_MAP[status] ?? 'var(--color-border)'

  return (
    <div style={{
      background: 'var(--color-primary)',
      borderBottom: '1px solid var(--color-border)',
      animation: 'sdp-slideInRight 300ms ease-out',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-secondary)',
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          marginRight: 8,
        }}>
          {step}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {status && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              fontFamily: 'var(--font-heading)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: statusColor,
              border: `1px solid ${statusColor}`,
              borderRadius: 4,
              padding: '1px 5px',
            }}>
              {status}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-foreground)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 3,
              opacity: 0.7,
              transition: 'opacity 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--color-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'transparent' }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', fontSize: 12 }}>
        <TimingHeader step={step} events={events} />
        {renderDetail(step, events)}
        <SubEventTimeline step={step} events={events} />
      </div>
    </div>
  )
}
