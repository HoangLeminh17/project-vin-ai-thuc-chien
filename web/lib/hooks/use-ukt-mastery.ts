'use client'

import { useState, useEffect } from 'react'
import { aggregateModuleMastery, type ModuleMasteryPoint } from '@/lib/ukt-module-mastery'

const EMPTY_MODULE_MASTERY = aggregateModuleMastery({})

export function useUktMastery(userId: string | null) {
  const [points, setPoints] = useState<ModuleMasteryPoint[]>(EMPTY_MODULE_MASTERY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setPoints(EMPTY_MODULE_MASTERY)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const controller = new AbortController()
    fetch('/api/ukt/mastery', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return
        if (Array.isArray(data?.module_mastery)) {
          setPoints(data.module_mastery)
        } else {
          setPoints(EMPTY_MODULE_MASTERY)
        }
      })
      .catch(() => {
        if (!cancelled) setPoints(EMPTY_MODULE_MASTERY)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [userId])

  return { points, loading }
}
