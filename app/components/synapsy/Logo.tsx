import { T } from './tokens'

interface Props { size?: number; color?: string }

export function SynapsyLogo({ size = 20, color }: Props) {
  const c = color ?? T.ink
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="2.5" fill={c} />
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
      <line x1="12" y1="3"    x2="12" y2="9.5"  stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="14.5" x2="12" y2="21"   stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3"  y1="12"   x2="9.5"  y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="12" x2="21"   y2="12" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.6"  y1="5.6"  x2="9.8"  y2="9.8"  stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="14.2" y1="14.2" x2="18.4" y2="18.4" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="18.4" y1="5.6"  x2="14.2" y2="9.8"  stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="5.6"  y1="18.4" x2="9.8"  y2="14.2" stroke={c} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}
