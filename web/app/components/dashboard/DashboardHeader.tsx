'use client'

import Image from 'next/image'
import { SynapsyLogo, T } from '@/app/components/synapsy'

interface DashboardHeaderProps {
  user: any
  streak: number
  logout: () => void
  login: () => void
}

export function DashboardHeader({ user, streak, logout, login }: DashboardHeaderProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 32px',
        borderBottom: `1px solid ${T.ink10}`,
        background: T.bgSolid,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <SynapsyLogo size={20} />
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: T.ink,
          }}
        >
          Synapsy
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13 }}>
        {user ? (
          <>
            {streak > 0 && (
              <span style={{ fontSize: 13, color: T.ink60 }}>
                🔥 <span style={{ fontWeight: 600, color: T.ink }}>{streak}</span>
              </span>
            )}
            <a
              href="/review"
              style={{ color: T.ink60, fontWeight: 500, textDecoration: 'none' }}
            >
              Ôn tập
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt=""
                  width={30}
                  height={30}
                  unoptimized
                  style={{ borderRadius: '50%', border: `1px solid ${T.ink10}` }}
                />
              ) : (
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: T.ink,
                    color: T.bgSolid,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 11,
                  }}
                >
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <button onClick={logout} style={{ fontSize: 12, color: T.ink40 }}>
                Đăng xuất
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={login}
            style={{
              background: T.ink,
              color: T.bgSolid,
              padding: '8px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Đăng nhập
          </button>
        )}
      </div>
    </nav>
  )
}
