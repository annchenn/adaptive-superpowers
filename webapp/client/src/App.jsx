import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import ErrorBoundary from './ErrorBoundary'
import SessionTimeline from './components/SessionTimeline'
import PipelineFlow from './components/PipelineFlow'
import StepDetailPanel from './components/StepDetailPanel'
import EvaluationDashboard from './components/EvaluationDashboard'
import SkillLibrary from './components/SkillLibrary'
import ControlPanel from './components/ControlPanel'
import GapDetectionPanel from './components/GapDetectionPanel'

const socket = io('http://localhost:3001')

export default function App() {
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const [selectedStep, setSelectedStep] = useState(null)
  const [evalLog, setEvalLog] = useState(null)
  const [skills, setSkills] = useState([])

  useEffect(() => {
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('init-events', (evts) => setEvents(evts))
    socket.on('new-event', (evt) => setEvents(prev => [...prev, evt]))

    fetch('/api/evaluation-log').then(r => r.json()).then(setEvalLog).catch(() => {})
    fetch('/api/skills').then(r => r.json()).then(setSkills).catch(() => {})

    return () => socket.off()
  }, [])

  const handleStepSelect = useCallback((step) => {
    setSelectedStep(prev => prev === step ? null : step)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        background: 'var(--color-primary)',
        borderBottom: '1px solid var(--color-border)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: 600, letterSpacing: '0.05em' }}>
          🚀 Superpowers Pipeline Monitor
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? 'var(--color-accent)' : 'var(--color-destructive)',
            boxShadow: connected ? '0 0 6px #22C55E' : 'none'
          }} />
          <span style={{ color: 'var(--color-foreground)', opacity: 0.7 }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </header>

      {/* 3-column body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Left: Session Timeline (25%) */}
        <aside style={{
          width: '25%',
          minWidth: 200,
          borderRight: '1px solid var(--color-border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <SessionTimeline events={events} onStepSelect={handleStepSelect} selectedStep={selectedStep} />
        </aside>

        {/* Center: Pipeline Flow + Control Panel (45%) */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <PipelineFlow events={events} selectedStep={selectedStep} onStepSelect={handleStepSelect} />
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', padding: '12px 16px', flexShrink: 0 }}>
            <ControlPanel onClear={() => setEvents([])} />
          </div>
        </main>

        {/* Right: Detail + Dashboard + Library (30%) */}
        <aside style={{
          width: '30%',
          minWidth: 240,
          borderLeft: '1px solid var(--color-border)',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 0
        }}>
          {selectedStep && (
            <ErrorBoundary name="StepDetailPanel">
              <StepDetailPanel
                step={selectedStep}
                events={events}
                onClose={() => setSelectedStep(null)}
              />
            </ErrorBoundary>
          )}
          <ErrorBoundary name="GapDetectionPanel">
            <GapDetectionPanel events={events} />
          </ErrorBoundary>
          {evalLog && (
            <ErrorBoundary name="EvaluationDashboard">
              <EvaluationDashboard evalLog={evalLog} />
            </ErrorBoundary>
          )}
          <ErrorBoundary name="SkillLibrary">
            <SkillLibrary skills={skills} events={events} />
          </ErrorBoundary>
        </aside>
      </div>
    </div>
  )
}
