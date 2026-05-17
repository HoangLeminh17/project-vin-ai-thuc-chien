'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { T } from '@/app/components/synapsy'
import { useAuth } from '@/lib/contexts/auth-context'

interface SRSStats {
  new: number
  learning: number
  due: number
  totalCards?: number
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function SRSStatsWidget() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<SRSStats | null>(null)
  const [loading, setLoading] = useState(false)

  const userId = authLoading ? null : user?.uid ?? null

  useEffect(() => {
    if (!userId) {
      setStats(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)

    fetch('/api/progress/stats', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && !data.error) setStats(data)
      })
      .catch(error => {
        if (!isAbortError(error)) setStats(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [userId])

  if (!userId) return null

  if (loading) {
    return (
      <div className="sy-animate-pulse" style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: 18, height: 128 }} />
    )
  }

  if (!stats || (stats.new === 0 && stats.learning === 0 && stats.due === 0 && (stats.totalCards ?? 0) === 0)) {
    return null
  }

  return (
    <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}>
        <h3 className="sy-serif" style={{ fontSize: 18, fontWeight: 700, color: T.ink, margin: 0 }}>Tiến độ ôn tập</h3>
        <span className="sy-mono" style={{ fontSize: 10, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.08em' }}>SRS</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Mới', value: stats.new, color: T.ink40 },
          { label: 'Đang học', value: stats.learning, color: '#c47a2a' },
          { label: 'Đến hạn', value: stats.due, color: stats.due > 0 ? T.accent : T.ink40 },
        ].map((item, index) => (
          <div key={item.label} style={{ textAlign: 'center', borderLeft: index === 0 ? 'none' : `1px solid ${T.ink10}` }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: item.color, margin: 0, letterSpacing: '-0.03em' }}>{item.value}</p>
            <p className="sy-mono" style={{ fontSize: 10, color: T.ink40, margin: '4px 0 0', textTransform: 'uppercase' }}>{item.label}</p>
          </div>
        ))}
      </div>

      <Link
        href="/review"
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          padding: '11px 14px',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: 'none',
          background: stats.due > 0 ? T.ink : T.bgSunken,
          color: stats.due > 0 ? T.bgSolid : T.ink40,
        }}
      >
        {stats.due > 0 ? 'Ôn tập ngay' : 'Hôm nay đã xong'}
      </Link>
    </div>
  )
}
