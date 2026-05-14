import { T } from '@/app/components/synapsy'
import type { ModuleMasteryPoint } from '@/lib/ukt-module-mastery'

type Props = {
  points: ModuleMasteryPoint[]
}

const SIZE = 300
const CENTER = SIZE / 2
const RADIUS = 96
const GRID_LEVELS = [0.25, 0.5, 0.75, 1]
const UNCERTAINTY_FALLBACK = 0.15

function polarPoint(index: number, total: number, ratio: number) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2
  return {
    x: CENTER + Math.cos(angle) * RADIUS * ratio,
    y: CENTER + Math.sin(angle) * RADIUS * ratio,
    angle,
  }
}

function polygonFor(points: ModuleMasteryPoint[], ratioFor: (point: ModuleMasteryPoint) => number) {
  return points
    .map((point, index) => {
      const { x, y } = polarPoint(index, points.length, ratioFor(point))
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function uncertaintyBandPath(points: ModuleMasteryPoint[]) {
  const outer = points.map((point, index) => {
    const uncertainty = point.uncertainty ?? UNCERTAINTY_FALLBACK
    return polarPoint(index, points.length, Math.min(1, (point.score ?? 0) + uncertainty))
  })
  const inner = points.map((point, index) => {
    const uncertainty = point.uncertainty ?? UNCERTAINTY_FALLBACK
    return polarPoint(index, points.length, Math.max(0, (point.score ?? 0) - uncertainty))
  }).reverse()

  return [...outer, ...inner]
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ') + ' Z'
}

function labelAnchor(angle: number) {
  const cos = Math.cos(angle)
  if (cos > 0.35) return 'start'
  if (cos < -0.35) return 'end'
  return 'middle'
}

export function KnowledgeSpiderChart({ points }: Props) {
  const dataPolygon = polygonFor(points, point => point.score ?? 0)
  const hasEvidence = points.some(point => point.evidenceCount > 0)
  const bandPath = uncertaintyBandPath(points)

  return (
    <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '18px 20px', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 800, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>
            UKT mastery
          </p>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: T.ink, letterSpacing: '-0.03em', margin: 0 }}>
            Medical module spider chart
          </h3>
        </div>
        <span className="sy-mono" style={{ fontSize: 11, color: T.ink60, whiteSpace: 'nowrap' }}>
          p_correct + sigma
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, alignItems: 'center' }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="UKT mastery by medical module" style={{ width: '100%', maxWidth: 340, margin: '0 auto', display: 'block' }}>
          {GRID_LEVELS.map(level => (
            <polygon
              key={level}
              points={polygonFor(points, () => level)}
              fill="none"
              stroke={T.ink10}
              strokeWidth="1"
            />
          ))}

          {points.map((point, index) => {
            const outer = polarPoint(index, points.length, 1)
            const label = polarPoint(index, points.length, 1.22)
            return (
              <g key={point.module_id}>
                <line x1={CENTER} y1={CENTER} x2={outer.x} y2={outer.y} stroke={T.ink10} strokeWidth="1" />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={labelAnchor(label.angle)}
                  dominantBaseline="middle"
                  style={{ fontSize: 10, fontWeight: 700, fill: point.evidenceCount > 0 ? T.ink : T.ink40 }}
                >
                  {point.module_name}
                </text>
              </g>
            )
          })}

          {hasEvidence && (
            <path
              d={bandPath}
              fill={`${T.accent}16`}
              stroke={`${T.accent}33`}
              strokeWidth="1"
            />
          )}
          <polygon points={dataPolygon} fill={hasEvidence ? `${T.accent}26` : 'transparent'} stroke={hasEvidence ? T.accent : T.ink20} strokeWidth="2.5" />
          {points.map((point, index) => {
            const marker = polarPoint(index, points.length, point.score ?? 0)
            const uncertainty = point.uncertainty ?? UNCERTAINTY_FALLBACK
            const inner = polarPoint(index, points.length, Math.max(0, (point.score ?? 0) - uncertainty))
            const outer = polarPoint(index, points.length, Math.min(1, (point.score ?? 0) + uncertainty))
            return (
              <g key={point.module_id}>
                {point.evidenceCount > 0 && (
                  <line
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={T.accent}
                    strokeOpacity="0.35"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r={point.evidenceCount > 0 ? 3.5 : 2}
                  fill={point.evidenceCount > 0 ? T.accent : T.ink20}
                  stroke={T.bgSolid}
                  strokeWidth={point.evidenceCount > 0 ? 1.5 : 0}
                />
              </g>
            )
          })}
        </svg>

        <div style={{ display: 'grid', gap: 8 }}>
          <div className="sy-mono" style={{ display: 'grid', gridTemplateColumns: '1fr 46px', gap: 10, fontSize: 9, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <span>Mastery</span>
            <span style={{ textAlign: 'right' }}>Sure</span>
          </div>
          {points.map(point => (
            <div key={point.module_id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{point.module_name}</span>
                  <span className="sy-mono" style={{ fontSize: 11, fontWeight: 700, color: point.percent === null ? T.ink40 : T.ink }}>
                    {point.percent === null ? '--' : `${point.percent}%`}
                  </span>
                </div>
                <div style={{ height: 5, background: T.ink10, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${point.percent ?? 0}%`, height: '100%', background: point.evidenceCount > 0 ? T.accent : T.ink20, borderRadius: 4 }} />
                </div>
              </div>
              <span className="sy-mono" style={{ fontSize: 10, color: T.ink40, width: 46, textAlign: 'right' }} title={`n=${point.evidenceCount}`}>
                {point.certaintyPercent === null ? 'n=0' : `${point.certaintyPercent}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
