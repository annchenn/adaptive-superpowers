export default function PipelineFlow({ events, selectedStep, onStepSelect }) {
  return (
    <div style={{ padding: 16, color: 'var(--color-foreground)', opacity: 0.5 }}>
      PipelineFlow (coming soon) — {events?.length ?? 0} events
    </div>
  )
}
