import { useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const DIMS = [
  { key: 'required_behavior_completed', label: 'Required behavior',  color: '#22C55E' },
  { key: 'forbidden_behavior_avoided',  label: 'Forbidden avoided',  color: '#3B82F6' },
  { key: 'correct_order_workflow',      label: 'Correct order',      color: '#F59E0B' },
  { key: 'evidence_from_logs',          label: 'Evidence',           color: '#A855F7' },
  { key: 'normal_case_coverage',        label: 'Normal coverage',    color: '#06B6D4' },
  { key: 'failure_handling',            label: 'Failure handling',   color: '#EF4444' },
  { key: 'clarity_and_actionability',   label: 'Clarity',            color: '#EC4899' },
  { key: 'no_contradiction',            label: 'No contradiction',   color: '#94A3B8' },
]

const MAX_TOTAL = 80

const SHIMMER_CSS = `
@keyframes ed-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.ed-shimmer {
  background: linear-gradient(
    90deg,
    var(--color-secondary) 25%,
    var(--color-border) 50%,
    var(--color-secondary) 75%
  );
  background-size: 800px 100%;
  animation: ed-shimmer 1.5s infinite;
  border-radius: 4px;
}
`

function SkeletonBars() {
  return (
    <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[80, 60, 45].map((w, i) => (
        <div
          key={i}
          className="ed-shimmer"
          style={{ height: 20, width: `${w}%`, borderRadius: 4 }}
        />
      ))}
    </div>
  )
}

function downloadCSV(data) {
  const dimKeys = DIMS.map(d => d.key)
  const header = ['candidate', ...dimKeys, 'total'].join(',')
  const rows = data.map(d =>
    [d.name, ...dimKeys.map(k => d[k] ?? 0), d.total].join(',')
  )
  const csv = [header, ...rows].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'evaluation.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function EvaluationDashboard({ evalLog }) {
  useEffect(() => {
    const id = 'ed-shimmer-style'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = SHIMMER_CSS
      document.head.appendChild(style)
    }
  }, [])

  const chartData = evalLog?.candidates?.map(c => {
    const entry = { name: c.file.replace(/\.md$/i, ''), total: c.total ?? 0 }
    DIMS.forEach(d => { entry[d.key] = c.scores?.[d.key] ?? 0 })
    return entry
  }) ?? []

  const winnerName = evalLog?.winner?.replace(/\.md$/i, '')
  const winnerEntry = chartData.find(d => d.name === winnerName) ?? chartData[chartData.length - 1]

  return (
    <section style={{
      borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-primary)',
      padding: '14px 16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-foreground)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Evaluation Dashboard
          </span>
          {evalLog?.skill && (
            <span style={{
              background: 'var(--color-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: 10,
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-accent)',
            }}>
              {evalLog.skill}
            </span>
          )}
        </div>
        {evalLog && (
          <button
            onClick={() => downloadCSV(chartData)}
            title="Export CSV"
            style={{
              background: 'var(--color-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '3px 8px',
              fontSize: 10,
              color: 'var(--color-foreground)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              opacity: 0.8,
            }}
          >
            CSV ↓
          </button>
        )}
      </div>

      {/* Total score bar chart or skeleton */}
      {evalLog ? (
        <ResponsiveContainer width="100%" height={Math.max(80, chartData.length * 36)}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(71,85,105,0.2)"
              horizontal={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: 'var(--color-foreground)', fontSize: 11, fontFamily: 'Fira Code, monospace' }}
              width={40}
            />
            <XAxis
              type="number"
              domain={[0, MAX_TOTAL]}
              tick={{ fill: 'var(--color-foreground)', fontSize: 10, opacity: 0.6 }}
            />
            <Tooltip
              formatter={(value, name, props) => {
                const scores = evalLog.candidates.find(
                  c => c.file.replace(/\.md$/i, '') === props.payload.name
                )?.scores ?? {}
                return [
                  <span key="tip">
                    {`Total: ${value}/${MAX_TOTAL}`}
                    {DIMS.map(d => (
                      <div key={d.key} style={{ color: d.color }}>
                        {`${d.label}: ${scores[d.key] ?? 0}/10`}
                      </div>
                    ))}
                  </span>,
                  '',
                ]
              }}
              contentStyle={{
                background: 'var(--color-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'Fira Code, monospace',
                color: 'var(--color-foreground)',
              }}
              cursor={{ fill: 'rgba(71,85,105,0.15)' }}
            />
            <Bar dataKey="total" name="total" radius={[0, 3, 3, 0]} maxBarSize={22}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.name === winnerName ? '#22C55E' : '#3B82F6'}
                  style={entry.name === winnerName ? { filter: 'brightness(1.1)' } : {}}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div>
          <SkeletonBars />
          <p style={{ fontSize: 11, color: 'var(--color-foreground)', opacity: 0.4, marginTop: 4, textAlign: 'center' }}>
            等待 G2 評估結果...
          </p>
        </div>
      )}

      {/* Dimension breakdown table */}
      {evalLog && chartData.length > 0 && (
        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 10,
            fontFamily: 'Fira Code, monospace',
            color: 'var(--color-foreground)',
          }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '3px 6px', opacity: 0.5, fontWeight: 400 }}>dimension</th>
                {chartData.map(c => (
                  <th key={c.name} style={{
                    textAlign: 'center',
                    padding: '3px 6px',
                    color: c.name === winnerName ? '#22C55E' : 'var(--color-foreground)',
                    fontWeight: c.name === winnerName ? 700 : 400,
                  }}>
                    {c.name}{c.name === winnerName ? ' ♛' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DIMS.map(d => (
                <tr key={d.key} style={{ borderTop: '1px solid rgba(71,85,105,0.15)' }}>
                  <td style={{ padding: '3px 6px', color: d.color, opacity: 0.9 }}>{d.label}</td>
                  {chartData.map(c => (
                    <td key={c.name} style={{ textAlign: 'center', padding: '3px 6px' }}>
                      {c[d.key] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid rgba(71,85,105,0.4)' }}>
                <td style={{ padding: '3px 6px', opacity: 0.5 }}>total</td>
                {chartData.map(c => (
                  <td key={c.name} style={{
                    textAlign: 'center',
                    padding: '3px 6px',
                    fontWeight: 700,
                    color: c.name === winnerName ? '#22C55E' : 'var(--color-foreground)',
                  }}>
                    {c.total}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Winner display */}
      {evalLog && winnerEntry && (
        <div style={{
          marginTop: 10,
          padding: '6px 10px',
          background: 'rgba(34,197,94,0.07)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'var(--font-heading)',
          fontSize: 12,
          color: 'var(--color-accent)',
        }}>
          <span>Winner:</span>
          <strong>{winnerEntry.name}</strong>
          <span style={{ fontSize: 14 }}>♛</span>
          <span style={{ marginLeft: 'auto', opacity: 0.8 }}>
            Total: {winnerEntry.total}/{MAX_TOTAL}
          </span>
        </div>
      )}
    </section>
  )
}
