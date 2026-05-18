export default function GapDetectionPanel({ events }) {
  return (
    <div style={{ padding: 16, color: 'var(--color-foreground)', opacity: 0.5 }}>
      GapDetectionPanel (coming soon) — {events?.length ?? 0} events
    </div>
  )
}
