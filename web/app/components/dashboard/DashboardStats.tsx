'use client'

import { T } from '@/app/components/synapsy'

interface DashboardStatsProps {
  streak: number
  totalCardsReviewed: number
  totalLibraryCards: number
}

export function DashboardStats({
  streak,
  totalCardsReviewed,
  totalLibraryCards,
}: DashboardStatsProps) {
  const stats = [
    { label: 'Chuỗi ngày', value: String(streak), unit: 'ngày', note: 'liên tiếp' },
    { label: '30 ngày qua', value: String(totalCardsReviewed), unit: 'thẻ', note: 'đã ôn' },
    { label: 'Tổng thẻ', value: String(totalLibraryCards), unit: 'thẻ', note: 'trong thư viện' },
  ]

  return (
    <section style={{ marginBottom: 44 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {stats.map(stat => (
          <div
            key={stat.label}
            style={{
              background: T.bgSolid,
              border: `1px solid ${T.ink10}`,
              borderRadius: 12,
              padding: '20px 24px',
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: T.ink40,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 8px',
              }}
            >
              {stat.label}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span
                style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', color: T.ink }}
              >
                {stat.value}
              </span>
              <span style={{ fontSize: 13, color: T.ink60, fontWeight: 500 }}>{stat.unit}</span>
            </div>
            <p style={{ fontSize: 12, color: T.ink40, margin: '4px 0 0' }}>{stat.note}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
