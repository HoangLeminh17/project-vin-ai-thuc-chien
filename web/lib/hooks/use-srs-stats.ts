'use client'

import { useState, useEffect } from 'react'

export interface SRSStats {
  new: number
  learning: number
  due: number
  streak: number
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useSRSStats(userId: string | null) {
  const [stats, setStats] = useState<SRSStats | null>(null)
  const [loading, setLoading] = useState(false)

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
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d && !d.error) setStats(d)
      })
      .catch(error => {
        if (!isAbortError(error)) setStats(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [userId])

  return { stats, loading }
}
