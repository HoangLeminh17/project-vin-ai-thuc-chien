import { T } from './tokens'

interface Props { size?: number; color?: string; opacity?: number }

export function GeoDecoration({ size = 280, color, opacity = 0.08 }: Props) {
  const c = color ?? T.accent
  const cx = size / 2, cy = size / 2, r = size * 0.42
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number]
  })
  const hexPath = hex.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z'
  const innerR = r * 0.55
  const innerHex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return [cx + innerR * Math.cos(a), cy + innerR * Math.sin(a)] as [number, number]
  })
  const innerPath = innerHex.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + 'Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={{ display: 'block', opacity, pointerEvents: 'none' }}>
      <path d={hexPath} stroke={c} strokeWidth="1" />
      <path d={innerPath} stroke={c} strokeWidth="0.8" />
      {hex.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p[0].toFixed(1)} y2={p[1].toFixed(1)} stroke={c} strokeWidth="0.6" />
      ))}
      {hex.map((p, i) => {
        const next = hex[(i + 1) % 6]
        const mid = [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2]
        return <line key={`c${i}`} x1={mid[0]} y1={mid[1]} x2={cx} y2={cy} stroke={c} strokeWidth="0.4" strokeDasharray="2 3" />
      })}
    </svg>
  )
}
