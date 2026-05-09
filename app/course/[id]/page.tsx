'use client'

import { useState, useEffect, use, useMemo } from 'react'
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

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { savedCourseId: generatingId, status: genStatus, courseContentMap: genContentMap, course: genCourse, pdfLocalPath } = useGeneration()

  const [saved, setSaved] = useState<SavedCourse | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [progressMap, setProgressMap] = useState<ProgressMap>({})

  const isGenerating = generatingId === id && genStatus === 'generating'

  useEffect(() => {
    if (authLoading || !user) return
    fetch('/api/progress/map')
      .then(r => r.ok ? r.json() : {})
      .then((m: ProgressMap | { error?: string }) => { if (!('error' in m)) setProgressMap(m as ProgressMap) })
      .catch(() => {})
  }, [user, authLoading])

  useEffect(() => {
    if (authLoading || !user) return
    async function load() {
      try {
        if (localAdapter) {
          const data = await localAdapter.getById(id, user!.uid)
          setSaved(data)
        } else {
          const res = await fetch(`/api/courses/${id}`)
          if (res.status === 404) { router.replace('/'); return }
          const data = await res.json()
          if (!data.success) throw new Error(data.error)
          setSaved(data.course)
        }
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : 'Không thể tải khóa học')
      }
    }
    load()
  }, [id, user, authLoading, router])

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
          onExit={() => router.push('/')}
          pdfLocalPath={pdfLocalPath}
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
