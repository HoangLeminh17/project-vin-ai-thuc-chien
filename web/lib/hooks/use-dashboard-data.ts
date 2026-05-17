'use client'

import { useState, useEffect, useCallback } from 'react'
import { SavedCourse } from '@/core/models/saved-course'
import { LocalCourseAdapter } from '@/infrastructure/adapters/local-course.adapter'
import { aggregateModuleMastery, type ModuleMasteryPoint } from '@/lib/ukt-module-mastery'
import { isLocalCourseStore } from '@/lib/config/client'
import type { ProgressMap } from './use-progress-map'
import type { SRSStats } from './use-srs-stats'

const localAdapter = isLocalCourseStore ? new LocalCourseAdapter() : null
const EMPTY_MODULE_MASTERY = aggregateModuleMastery({})

type DashboardPayload = {
  success?: boolean
  error?: string
  courses?: SavedCourse[]
  srsStats?: SRSStats
  progressMap?: ProgressMap
  ukt?: { module_mastery?: ModuleMasteryPoint[] }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useDashboardData(userId: string | null) {
  const [courses, setCourses] = useState<SavedCourse[]>([])
  const [srsStats, setSrsStats] = useState<SRSStats | null>(null)
  const [progressMap, setProgressMap] = useState<ProgressMap>({})
  const [moduleMastery, setModuleMastery] = useState<ModuleMasteryPoint[]>(EMPTY_MODULE_MASTERY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!userId) {
      setCourses([])
      setSrsStats(null)
      setProgressMap({})
      setModuleMastery(EMPTY_MODULE_MASTERY)
      setLoading(false)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dashboard', {
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
      })
      const data = await res.json() as DashboardPayload
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load dashboard')

      setCourses(data.courses || [])
      setSrsStats(data.srsStats || null)
      setProgressMap(data.progressMap || {})
      setModuleMastery(Array.isArray(data.ukt?.module_mastery) ? data.ukt.module_mastery : EMPTY_MODULE_MASTERY)

      if (localAdapter) {
        setCourses(await localAdapter.listByUser(userId))
      }
    } catch (e) {
      if (isAbortError(e)) return
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      setCourses([])
      setSrsStats(null)
      setProgressMap({})
      setModuleMastery(EMPTY_MODULE_MASTERY)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setCourses([])
      setSrsStats(null)
      setProgressMap({})
      setModuleMastery(EMPTY_MODULE_MASTERY)
      setError('')
      setLoading(false)
      return
    }

    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh, userId])

  const deleteCourse = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false
    let snapshot: SavedCourse[] = []
    setCourses(prev => { snapshot = prev; return prev.filter(c => c.id !== id) })
    try {
      if (localAdapter) {
        await localAdapter.delete(id, userId)
      } else {
        const res = await fetch(`/api/courses/${id}`, {
          method: 'DELETE',
          cache: 'no-store',
          credentials: 'same-origin',
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
      }
      return true
    } catch {
      setCourses(snapshot)
      setError('Xóa thất bại, vui lòng thử lại.')
      return false
    }
  }, [userId])

  return {
    courses,
    srsStats,
    progressMap,
    moduleMastery,
    loading,
    error,
    refresh,
    deleteCourse,
  }
}
