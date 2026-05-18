export default function SessionTimeline({ events, onStepSelect, selectedStep }) {
  return (
    <div style={{ padding: 16, color: 'var(--color-foreground)', opacity: 0.5 }}>
      SessionTimeline (coming soon) — {events?.length ?? 0} events
    </div>
  )
}
