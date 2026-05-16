'use client'

import { RefObject } from 'react'
import { T, GeoDecoration } from '@/app/components/synapsy'
import { Spinner } from '@/app/components'
import { SRSStats } from '@/lib/hooks/use-srs-stats'

interface HeroSectionProps {
  user: any
  srsStats: SRSStats | null
  srsLoading: boolean
  inputRef: RefObject<HTMLInputElement | null>
}

export function HeroSection({ user, srsStats, srsLoading, inputRef }: HeroSectionProps) {
  if (!user) return null

  return (
    <section
      style={{
        marginBottom: 52,
        position: 'relative',
        textAlign: 'center',
        padding: '48px 0 40px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -52%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <GeoDecoration size={380} color={T.accent} opacity={0.07} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: T.ink60,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 12px',
          }}
        >
          Ôn thi thông minh
        </p>
        {srsLoading ? (
          <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner />
          </div>
        ) : (
          <>
            <h1
              style={{
                fontSize: 52,
                fontWeight: 800,
                letterSpacing: '-0.035em',
                lineHeight: 1.05,
                margin: '0 0 16px',
                color: T.ink,
              }}
            >
              {srsStats?.due ?? 0} thẻ cần ôn
              <br />
              <span style={{ color: T.ink40, fontWeight: 400, fontSize: 38 }}>hôm nay</span>
            </h1>
            <p style={{ fontSize: 15, color: T.ink60, margin: '0 0 28px' }}>
              {srsStats?.new ? `+ ${srsStats.new} thẻ mới · ` : ''}
              {srsStats && srsStats.due > 0
                ? `ước tính ${Math.max(1, Math.round(srsStats.due * 0.4 + (srsStats.new ?? 0) * 0.6))} phút`
                : 'Hôm nay đã xong 🌱'}
            </p>
          </>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <a
            href="/review"
            style={{
              background: T.ink,
              color: T.bgSolid,
              padding: '13px 28px',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Bắt đầu ôn tập →
          </a>
          <button
            onClick={() => inputRef.current?.click()}
            style={{
              background: T.bgSolid,
              color: T.ink60,
              padding: '13px 20px',
              borderRadius: 10,
              fontSize: 14,
              border: `1px solid ${T.ink10}`,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Thêm tài liệu
          </button>
        </div>
      </div>
    </section>
  )
}
