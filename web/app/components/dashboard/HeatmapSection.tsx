'use client'

import { T } from '@/app/components/synapsy'

interface HeatmapSectionProps {
  heatmap: number[]
  totalCardsReviewed: number
}

export function HeatmapSection({ heatmap, totalCardsReviewed }: HeatmapSectionProps) {
  return (
    <section style={{ marginBottom: 48 }}>
      <div
        style={{
          background: T.bgSolid,
          border: `1px solid ${T.ink10}`,
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.ink40,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: 0,
            }}
          >
            Hoạt động 30 ngày
          </p>
          <span className="sy-mono" style={{ fontSize: 11, color: T.ink40 }}>
            {totalCardsReviewed} thẻ đã ôn
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 4 }}>
          {heatmap.map((count, i) => {
            const opacity = count === 0 ? 1 : Math.min(1, 0.18 + count / 26)
            return (
              <div
                key={i}
                style={{
                  aspectRatio: '1',
                  borderRadius: 3,
                  background: count === 0 ? T.ink10 : T.accent,
                  opacity: count === 0 ? 1 : opacity,
                }}
                title={`${count} thẻ`}
              />
            )
          })}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            fontSize: 10,
            color: T.ink40,
          }}
          className="sy-mono"
        >
          <span>30 ngày trước</span>
          <span>Hôm nay</span>
        </div>
      </div>
    </section>
  )
}
