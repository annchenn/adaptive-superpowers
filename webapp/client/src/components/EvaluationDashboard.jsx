import { useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts'

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
  const header = 'candidate,compliance,coverage,conciseness,total'
  const rows = data.map(d =>
    `${d.name},${d.compliance},${d.coverage},${d.conciseness},${d.total}`
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

  const chartData = evalLog?.candidates?.map(c => ({
    name: c.file.replace(/\.md$/i, ''),
    compliance: c.scores?.compliance ?? 0,
    coverage: c.scores?.coverage ?? 0,
    conciseness: c.scores?.conciseness ?? 0,
    total: c.total ?? 0,
  })) ?? []

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

      {/* Chart or skeleton */}
      {evalLog ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
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
              domain={[0, 100]}
              tick={{ fill: 'var(--color-foreground)', fontSize: 10, opacity: 0.6 }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: 'Fira Code, monospace',
                color: 'var(--color-foreground)',
              }}
              cursor={{ fill: 'rgba(71,85,105,0.15)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, fontFamily: 'Fira Code, monospace', paddingTop: 4 }}
            />
            <Bar dataKey="compliance" name="compliance" fill="#22C55E" radius={[0, 3, 3, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill="#22C55E"
                  style={entry.name === winnerName ? { filter: 'brightness(1.2)' } : {}}
                />
              ))}
            </Bar>
            <Bar dataKey="coverage" name="coverage" fill="#3B82F6" radius={[0, 3, 3, 0]} />
            <Bar dataKey="conciseness" name="conciseness" fill="#F59E0B" radius={[0, 3, 3, 0]} />
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
            Total: {winnerEntry.total}/100
          </span>
        </div>
      )}
    </section>
  )
}
