'use client'

import { useState, useEffect, use, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { useGeneration } from '@/lib/contexts/generation-context'
import { SavedCourse } from '@/core/models/saved-course'
import { ChapterContent } from '@/core/models/learning-model'
import { LocalCourseAdapter } from '@/infrastructure/adapters/local-course.adapter'
import { CourseFlow } from '@/app/components/course'
import type { ProgressEntry } from '@/lib/types'
import { T } from '@/app/components/synapsy'

const isLocal = process.env.NEXT_PUBLIC_COURSE_STORE === 'local'
const localAdapter = isLocal ? new LocalCourseAdapter() : null

type ProgressMap = Record<string, ProgressEntry & { nextReviewDate: string; lastReviewedAt?: string }>

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { savedCourseId: generatingId, status: genStatus, courseContentMap: genContentMap, course: genCourse } = useGeneration()

  const [saved, setSaved] = useState<SavedCourse | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [progressMap, setProgressMap] = useState<ProgressMap>({})

  const isGenerating = generatingId === id && genStatus === 'generating'
  const stableUserId = authLoading ? null : user?.uid ?? null

  const refreshProgressMap = useCallback(async (signal?: AbortSignal) => {
    if (!stableUserId) {
      setProgressMap({})
      return
    }

    try {
      const res = await fetch('/api/progress/map', {
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
      })
      const m: ProgressMap | { error?: string } = res.ok ? await res.json() : {}
      if (!('error' in m)) setProgressMap(m as ProgressMap)
    } catch (error) {
      if (!isAbortError(error)) setProgressMap({})
    }
  }, [stableUserId])

  useEffect(() => {
    if (!stableUserId) {
      setProgressMap({})
      return
    }

    const controller = new AbortController()
    void refreshProgressMap(controller.signal)
    return () => controller.abort()
  }, [stableUserId, refreshProgressMap])

  useEffect(() => {
    if (!stableUserId) {
      setSaved(null)
      setFetchError('')
      return
    }

    const controller = new AbortController()
    setSaved(null)
    setFetchError('')
    async function load() {
      try {
        if (localAdapter) {
          const data = await localAdapter.getById(id, stableUserId!)
          setSaved(data)
        } else {
          const res = await fetch(`/api/courses/${id}`, {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller.signal,
          })
          if (res.status === 404) { router.replace('/'); return }
          const data = await res.json()
          if (!data.success) throw new Error(data.error)
          setSaved(data.course)
        }
      } catch (e) {
        if (!isAbortError(e)) {
          setFetchError(e instanceof Error ? e.message : 'Không thể tải khóa học')
        }
      }
    }
    void load()
    return () => controller.abort()
  }, [id, stableUserId, router])


  // Layout JSON URL — proxied through API to keep Firebase auth server-side
  const layoutStorageUrl = useMemo(() => {
    if (saved?.layoutStorageUrl) return `/api/layout-serve?courseId=${id}`
    return null
  }, [saved?.layoutStorageUrl, id])

  // Merge streaming content with saved content during generation
  const effectiveCourse = useMemo(() => {
    if (!saved) return null
    if (!isGenerating || !genCourse) return saved
    const merged: SavedCourse = {
      ...saved,
      course: genCourse,
      courseContent: (() => {
        const chapters = [...(saved.courseContent?.chapters ?? [])]
        Object.entries(genContentMap).forEach(([idx, ch]) => {
          chapters[parseInt(idx)] = ch as ChapterContent
        })
        return { chapters }
      })(),
    }
    return merged
  }, [isGenerating, saved, genCourse, genContentMap])

  // ── Render ────────────────────────────────────────────────────────────────────

  if (authLoading) return <Shell><Status label="Đang xác thực..." /></Shell>
  if (!user)       return <Shell><Status label="Bạn cần đăng nhập để xem khóa học này." /></Shell>
  if (fetchError)  return <Shell><Status label={fetchError} error /></Shell>
  if (!effectiveCourse || !effectiveCourse.courseContent)
                   return <Shell><Status label="Đang tải khóa học..." /></Shell>

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.bg }}>
      {isGenerating && <GeneratingBanner saved={saved} genContentMap={genContentMap} />}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <CourseFlow
          course={effectiveCourse}
          progressMap={progressMap}
          onProgressChange={() => refreshProgressMap()}
          onExit={() => router.push('/')}
          layoutStorageUrl={layoutStorageUrl}
        />
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      {children}
    </div>
  )
}

function Status({ label, error = false }: { label: string; error?: boolean }) {
  return <p style={{ fontSize: 13, color: error ? T.srsAgain : T.ink40, fontFamily: T.fontSans, margin: 0 }}>{label}</p>
}

function GeneratingBanner({ saved, genContentMap }: { saved: SavedCourse | null; genContentMap: Record<string, unknown> }) {
  const total = saved?.course.chapters.length ?? 0
  const done = Object.keys(genContentMap).length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div style={{ background: T.bgSolid, borderBottom: `1px solid ${T.ink10}`, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      <div style={{ width: 120, height: 3, background: T.ink10, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: T.accent, transition: 'width 0.4s ease' }} />
      </div>
      <span className="sy-mono" style={{ fontSize: 11, color: T.ink60 }}>Đang tạo: chương {done}/{total}</span>
    </div>
  )
}
