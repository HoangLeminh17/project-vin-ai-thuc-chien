'use client'

import { SynapsyLogo, T } from '@/app/components/synapsy'

export type NavTab = 'dashboard' | 'courses' | 'srs'

interface Props {
  activeTab: NavTab
  onTabChange: (tab: NavTab) => void
}

const TABS: { id: NavTab; label: string; Icon: (props: { c: string }) => React.ReactElement }[] = [
  {
    id: 'dashboard',
    label: 'KHO',
    Icon: ({ c }) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    id: 'courses',
    label: 'KHÓA',
    Icon: ({ c }) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        <path d="M9 7h6M9 11h4"/>
      </svg>
    ),
  },
  {
    id: 'srs',
    label: 'SRS',
    Icon: ({ c }) => (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="15" height="10" rx="2"/>
        <path d="M7 4h13a2 2 0 012 2v10"/>
        <path d="M20 17l2.5 2.5L20 22"/>
      </svg>
    ),
  },
]

export function NavRail({ activeTab, onTabChange }: Props) {
  return (
    <div style={{
      width: 60, flexShrink: 0, height: '100%',
      background: T.bgSolid, borderRight: `1px solid ${T.ink10}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 14, paddingBottom: 14,
    }}>
      {/* Logo mark */}
      <div style={{ marginBottom: 26 }}>
        <div style={{
          width: 34, height: 34, background: T.accent, borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SynapsyLogo size={17} color="#ffffff" />
        </div>
      </div>

      {/* Tab buttons */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {TABS.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = T.bgSunken }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              style={{
                width: 44, height: 50,
                background: active ? T.accent : 'transparent',
                border: 'none', borderRadius: 12, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, transition: 'background 0.15s',
              }}
            >
              <Icon c={active ? '#ffffff' : T.ink40} />
              <span style={{
                fontSize: 7.5, fontWeight: 700, letterSpacing: '0.05em',
                color: active ? '#ffffff' : T.ink40,
                fontFamily: T.fontSans,
              }}>{label}</span>
            </button>
          )
        })}
      </div>

    </div>
  )
}
