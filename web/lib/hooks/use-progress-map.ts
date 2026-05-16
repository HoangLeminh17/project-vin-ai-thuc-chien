'use client'

import { useState, useEffect } from 'react'

export interface ProgressMapEntry {
  status: 'NEW' | 'LEARNING' | 'REVIEW'
  nextReviewDate: string
  lastReviewedAt?: string
  isDue: boolean
}
export type ProgressMap = Record<string, ProgressMapEntry>

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useProgressMap(userId: string | null) {
  const [map, setMap] = useState<ProgressMap>({})

  useEffect(() => {
    if (!userId) {
      setMap({})
      return
    }

    const controller = new AbortController()
    fetch('/api/progress/map', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(r => (r.ok ? r.json() : {}))
      .then((m: ProgressMap | { error?: string }) => {
        if (!('error' in m)) setMap(m as ProgressMap)
      })
      .catch(error => {
        if (!isAbortError(error)) setMap({})
      })

    return () => controller.abort()
  }, [userId])

  return map
}

export function buildHeatmap(map: ProgressMap, days = 30): number[] {
  const buckets = Array<number>(days).fill(0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const entry of Object.values(map)) {
    if (!entry.lastReviewedAt) continue
    const d = new Date(entry.lastReviewedAt)
    d.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
    if (diffDays < 0 || diffDays >= days) continue
    buckets[days - 1 - diffDays]++
  }
  return buckets
}
