import { T } from './tokens'

type SRSState = 'new' | 'learning' | 'due' | 'mature'

const MAP: Record<SRSState, { label: string; bg: string; fg: string }> = {
  new:      { label: 'Mới',      bg: T.bgSunken,   fg: T.ink60 },
  learning: { label: 'Đang học', bg: '#fff8ed',     fg: '#a05a00' },
  due:      { label: 'Cần ôn',   bg: T.ink,         fg: T.bgSolid },
  mature:   { label: 'Đã thuộc', bg: T.accentSoft,  fg: T.accent  },
}

interface Props { state: string }

export function StateChip({ state }: Props) {
  const m = MAP[state as SRSState] ?? MAP.new
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: m.fg, background: m.bg,
      padding: '2px 8px', borderRadius: 20, letterSpacing: '0.01em',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {m.label}
    </span>
  )
}
