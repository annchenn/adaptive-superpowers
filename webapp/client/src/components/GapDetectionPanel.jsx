export default function GapDetectionPanel({ events }) {
  const gapEvents = (events ?? []).filter(e =>
    (e.skill === 'gap-detected' || e.skill === 'gap-detection') &&
    e.status === 'completed' &&
    Array.isArray(e.data?.gaps)
  )

  // Flatten all gaps from all matching events, dedup by name
  const seenNames = new Set()
  const gaps = []
  for (const evt of gapEvents) {
    for (const gap of evt.data.gaps) {
      if (!seenNames.has(gap.name)) {
        seenNames.add(gap.name)
        gaps.push(gap)
      }
    }
  }

  return (
    <section style={{
      borderBottom: '1px solid var(--color-border)',
      padding: '14px 16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-foreground)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Gap Detection
        </span>
        {gaps.length > 0 && (
          <span style={{
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 10,
            padding: '1px 7px',
            fontSize: 10,
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-destructive)',
            fontWeight: 700,
          }}>
            {gaps.length} gap{gaps.length !== 1 ? 's' : ''} detected
          </span>
        )}
      </div>

      {/* Gap list or empty state */}
      {gaps.length === 0 ? (
        <p style={{
          fontSize: 12,
          color: 'var(--color-foreground)',
          opacity: 0.35,
          fontStyle: 'italic',
        }}>
          No gaps detected yet
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {gaps.map((gap, i) => (
            <div
              key={`${gap.name}-${i}`}
              style={{
                borderLeft: '4px solid var(--color-destructive)',
                background: 'rgba(239,68,68,0.06)',
                borderRadius: '0 6px 6px 0',
                padding: '8px 10px',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 3,
              }}>
                <span style={{ fontSize: 13 }}>🔴</span>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-foreground)',
                }}>
                  {gap.name}
                </span>
              </div>
              {gap.description && (
                <p style={{
                  fontSize: 11,
                  color: 'var(--color-foreground)',
                  opacity: 0.6,
                  lineHeight: 1.5,
                  margin: 0,
                  paddingLeft: 19,
                }}>
                  {gap.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
