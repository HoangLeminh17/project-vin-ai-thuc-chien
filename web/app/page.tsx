'use client'

import { useState, useRef, useCallback, useEffect, useMemo, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { FlashFactGallery, Spinner } from '@/app/components'
import { useCourses } from '@/lib/hooks/use-courses'
import { SavedCourse } from '@/core/models/saved-course'
import { Course, ChapterContent } from '@/core/models/learning-model'
import { useGeneration, type DiagnosticStatus } from '@/lib/contexts/generation-context'
import { SynapsyLogo, SynapsyRing, GeoDecoration, T } from '@/app/components/synapsy'
import { KnowledgeSpiderChart } from '@/app/components/knowledge/KnowledgeSpiderChart'
import { aggregateModuleMastery, type ModuleMasteryPoint } from '@/lib/ukt-module-mastery'
import { getLessonCards } from '@/lib/course-cards'
import { NavRail, type NavTab } from '@/app/components/shell'

// ── SRS stats ─────────────────────────────────────────────────────────────────

interface SRSStats { new: number; learning: number; due: number; streak: number }

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function useSRSStats(userId: string | null) {
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
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setStats(d) })
      .catch(error => { if (!isAbortError(error)) setStats(null) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })

    return () => controller.abort()
  }, [userId])
  return { stats, loading }
}

// ── Progress map ──────────────────────────────────────────────────────────────

interface ProgressMapEntry { status: 'NEW' | 'LEARNING' | 'REVIEW'; nextReviewDate: string; lastReviewedAt?: string; isDue: boolean }
type ProgressMap = Record<string, ProgressMapEntry>
const EMPTY_MODULE_MASTERY = aggregateModuleMastery({})

function buildHeatmap(map: ProgressMap, days = 30): number[] {
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

function useProgressMap(userId: string | null) {
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
      .then(r => r.ok ? r.json() : {})
      .then((m: ProgressMap | { error?: string }) => { if (!('error' in m)) setMap(m as ProgressMap) })
      .catch(error => { if (!isAbortError(error)) setMap({}) })

    return () => controller.abort()
  }, [userId])
  return map
}

function useUktMastery(userId: string | null) {
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
      .then(r => r.ok ? r.json() : null)
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

function courseStats(saved: SavedCourse, map: ProgressMap) {
  const chapters = saved.courseContent?.chapters ?? []
  let total = 0, due = 0, mature = 0
  chapters.forEach((ch, ci) => {
    ch.lessons.forEach((lesson, li) => {
      const cards = getLessonCards(lesson)
      const hasGeneratedCards = Array.isArray(lesson.cards) && lesson.cards.length > 0
      cards.forEach((_, cardIndex) => {
        total++
        const cardId = hasGeneratedCards ? `${ci}-${li}-${cardIndex}` : `${ci}-${li}`
        const legacyCardId = `${ci}-${li}`
        const e = map[cardId] ?? (cardIndex === 0 ? map[legacyCardId] : undefined)
        if (!e) return
        if (e.isDue) due++
        else if (e.status === 'REVIEW') mature++
      })
    })
  })
  return { total, due, masteryPct: total === 0 ? 0 : Math.round((mature / total) * 100) }
}

// ── Pipeline tracker ──────────────────────────────────────────────────────────

function PipelineTracker({ parsed, outlined, chaptersDone, chaptersTotal, allDone, diagnosticStatus }: {
  parsed: boolean; outlined: boolean; chaptersDone: number; chaptersTotal: number; allDone: boolean; diagnosticStatus: DiagnosticStatus
}) {
  const diagState = diagnosticStatus === 'done' ? 'done' : diagnosticStatus === 'loading' ? 'active' : diagnosticStatus === 'error' ? 'error' : 'pending'
  const stages: { label: string; state: 'done' | 'active' | 'pending' | 'error' }[] = [
    { label: 'Đọc PDF',            state: parsed ? 'done' : 'active' },
    { label: 'Phân tích cấu trúc', state: parsed ? (outlined ? 'done' : 'active') : 'pending' },
    { label: `Tạo concept cards · ${chaptersDone}/${chaptersTotal}`, state: !outlined ? 'pending' : (allDone ? 'done' : 'active') },
    { label: 'Tạo bài test trình độ', state: diagState },
  ]
  return (
    <div style={{ padding: '14px 16px', background: T.bgSunken, borderRadius: 8, fontSize: 11, color: T.ink60, lineHeight: 1.55 }}>
      <p className="sy-mono" style={{ margin: 0, fontWeight: 600, color: T.ink80, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10, marginBottom: 8 }}>Pipeline</p>
      <div className="sy-mono" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {stages.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {s.state === 'done'    && <span style={{ color: T.srsGood }}>✓</span>}
            {s.state === 'active'  && <span className="sy-animate-pulse" style={{ color: T.accent }}>◉</span>}
            {s.state === 'pending' && <span style={{ color: T.ink20 }}>○</span>}
            {s.state === 'error'   && <span style={{ color: T.srsAgain }}>✕</span>}
            <span style={{ color: s.state === 'pending' ? T.ink40 : s.state === 'error' ? T.srsAgain : T.ink60 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Generation screen ─────────────────────────────────────────────────────────

function GenerationScreen({ course, stage2Loading, courseContentMap, rawMarkdown, savedCourseId, stage2Errors, diagnosticStatus, onRetryChapter, onReset }: {
  course: Course; stage2Loading: Record<number, boolean>; courseContentMap: Record<number, ChapterContent>
  rawMarkdown: string; savedCourseId: string | null; stage2Errors: Record<number, string>
  diagnosticStatus: DiagnosticStatus; onRetryChapter: (i: number) => void; onReset: () => void
}) {
  const router = useRouter()
  const doneCount = Object.keys(courseContentMap).length
  const allDone = course?.chapters?.every((_, i) => courseContentMap[i] !== undefined) ?? false

  const handleGoBack = () => {
    if (savedCourseId) localStorage.removeItem(`justGenerated_${savedCourseId}`)
    onReset()
  }

  const handleStudyNow = () => {
    if (!savedCourseId) return
    router.push(`/course/${savedCourseId}`)
    onReset()
  }

  const handleSkipDiagnosticAndStudy = () => {
    if (!savedCourseId) return
    localStorage.removeItem(`justGenerated_${savedCourseId}`)
    localStorage.setItem(`diagnosticDone_${savedCourseId}`, 'true')
    router.push(`/course/${savedCourseId}?tab=study`)
    onReset()
  }

  return (
    <main className="min-h-screen" style={{ background: T.bg, fontFamily: T.fontSans }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SynapsyLogo size={18} />
          <span className="sy-serif" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em' }}>Synapsy</span>
          <div style={{ height: 16, width: 1, background: T.ink10 }} />
          <button onClick={handleGoBack} style={{ fontSize: 13, color: T.ink60, fontWeight: 500 }}>← Quay về Thư viện</button>
        </div>
        <span className="sy-mono" style={{ fontSize: 12, color: T.ink60 }}>
          {allDone ? '✓ Hoàn thành!' : `Đang biên soạn · ${doneCount}/${course.chapters.length} chương`}
        </span>
      </div>

      <div style={{ height: 3, background: T.ink10 }}>
        <div style={{ width: `${(doneCount / Math.max(course.chapters.length, 1)) * 100}%`, height: '100%', background: T.accent, transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', minHeight: 'calc(100vh - 55px)' }}>
        <div style={{ padding: '28px 32px', borderRight: `1px solid ${T.ink10}` }}>
          <p className="sy-mono" style={{ fontSize: 11, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: '0 0 6px' }}>Đang biên soạn</p>
          <h1 className="sy-serif" style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em', color: T.ink }}>{course.title}</h1>
          <p className="sy-mono" style={{ fontSize: 12, color: T.ink60, margin: '0 0 24px' }}>{course.chapters.length} chương</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {course.chapters.map((ch, ci) => {
              const isDone = courseContentMap[ci] !== undefined
              const isLoading = stage2Loading[ci]
              return (
                <div key={ci} style={{ background: T.bgSolid, border: `1px solid ${isLoading ? T.accent + '66' : isDone ? T.srsGood + '44' : T.ink10}`, borderRadius: 10, padding: '14px 18px', opacity: (!isDone && !isLoading) ? 0.6 : 1, transition: 'opacity 0.3s, border-color 0.3s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <span className="sy-mono" style={{ fontSize: 11, color: T.ink40, flexShrink: 0 }}>0{ci + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="sy-serif" style={{ fontSize: 15, fontWeight: 600, margin: 0, color: T.ink, letterSpacing: '-0.005em' }}>{ch.title}</p>
                        <p className="sy-mono" style={{ fontSize: 11, color: T.ink60, margin: '3px 0 0' }}>
                          {isDone ? `${ch.lessons?.length ?? 0} bài · sẵn sàng đọc` : stage2Errors[ci] ? `Lỗi: ${stage2Errors[ci]}` : isLoading ? 'Đang tạo nội dung...' : 'Đang chờ...'}
                        </p>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {stage2Errors[ci] && <button onClick={() => onRetryChapter(ci)} style={{ fontSize: 11, color: T.accent, background: T.bgSunken, padding: '4px 8px', borderRadius: 6 }}>Thử lại</button>}
                      {isLoading && <div className="sy-animate-spin" style={{ width: 16, height: 16, border: `2px solid ${T.ink10}`, borderTopColor: T.accent, borderRadius: '50%' }} />}
                      {isDone && <span style={{ fontSize: 13, color: T.srsGood }}>✓</span>}
                    </div>
                  </div>
                  {ch.lessons?.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.ink10}`, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {ch.lessons.map((lesson, li) => (
                        <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="sy-mono" style={{ fontSize: 10, color: isDone ? T.srsGood : isLoading ? T.accent : T.ink20, flexShrink: 0, width: 10 }}>
                            {isDone ? '✓' : isLoading ? '◉' : '○'}
                          </span>
                          <span className="sy-mono" style={{ fontSize: 11, color: isDone ? T.ink60 : T.ink40, lineHeight: 1.4 }}>{lesson.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ padding: '28px', background: T.bgSoft, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <p className="sy-mono" style={{ fontSize: 10, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, margin: '0 0 14px' }}>💡 Flash Facts</p>
            <FlashFactGallery markdown={rawMarkdown} />
          </div>
          <PipelineTracker parsed={Boolean(rawMarkdown)} outlined={true} chaptersDone={doneCount} chaptersTotal={course.chapters.length} allDone={allDone} diagnosticStatus={diagnosticStatus} />
          {allDone && savedCourseId && (diagnosticStatus === 'done' || diagnosticStatus === 'error') && (
            <div style={{ padding: '18px 18px 20px', background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: T.ink, margin: '0 0 4px' }}>{'Khóa học đã sẵn sàng!'}</p>
              <p style={{ fontSize: 12, color: T.ink60, margin: '0 0 16px', lineHeight: 1.55 }}>
                {diagnosticStatus === 'done'
                  ? 'Bài test chẩn đoán đã được chuẩn bị sẵn. Bạn có thể vào test ngay hoặc vào học luôn.'
                  : 'Không tạo được bài test, nhưng bạn vẫn có thể vào học ngay bây giờ.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {diagnosticStatus === 'done' && (
                  <button onClick={handleStudyNow} style={{ background: T.ink, color: T.bgSolid, padding: '11px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: '1px solid transparent', textAlign: 'left' }}>
                    {'Vào bài test trình độ'}
                  </button>
                )}
                <button onClick={handleSkipDiagnosticAndStudy} style={{ background: T.bgSolid, color: T.ink, padding: '11px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: `1px solid ${T.ink}`, textAlign: 'left' }}>
                  {'Vào học luôn'}
                </button>
                <button onClick={handleGoBack} style={{ background: T.bgSolid, color: T.ink60, padding: '11px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: `1px solid ${T.ink10}`, textAlign: 'left' }}>
                  {'Về thư viện'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// ── Dashboard panel (Tab 1: KHO) ──────────────────────────────────────────────

interface DashboardPanelProps {
  user: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null
  srsStats: SRSStats | null
  srsLoading: boolean
  moduleMastery: ModuleMasteryPoint[]
  uktMasteryLoading: boolean
  progressMap: ProgressMap
  streak: number
  totalCards: number
  onLogin: () => void
  onLogout: () => void
}

function DashboardPanel({ user, srsStats, srsLoading, moduleMastery, uktMasteryLoading, progressMap, streak, totalCards, onLogin }: DashboardPanelProps) {
  const router = useRouter()
  const heatmap = buildHeatmap(progressMap)
  const dueCount = srsStats?.due ?? 0
  const newCount = srsStats?.new ?? 0

  if (!user) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: T.bg, gap: 20, padding: 40 }}>
        <div style={{ position: 'relative' }}>
          <GeoDecoration size={320} color={T.accent} opacity={0.07} />
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: T.ink, margin: 0, textAlign: 'center', lineHeight: 1.1 }}>
          Ôn thi thông minh<br />
          <span style={{ color: T.ink40, fontWeight: 400, fontSize: 26 }}>cùng Synapsy</span>
        </h1>
        <p style={{ fontSize: 14, color: T.ink60, margin: 0, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
          Upload PDF — AI tạo flashcard — ôn theo SRS mỗi ngày.
        </p>
        <button onClick={onLogin} style={{ background: T.ink, color: T.bgSolid, padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
          Đăng nhập để bắt đầu →
        </button>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, overflowY: 'auto', padding: '24px 28px', gap: 18 }}>

      {/* Dark hero banner */}
      <div style={{
        background: '#0d1420', borderRadius: 16,
        padding: '18px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', marginBottom: 7, fontFamily: T.fontSans }}>
            {streak > 0 ? `🔥 ${streak} NGÀY LIÊN TIẾP` : 'HÔM NAY'}
          </div>
          {srsLoading ? (
            <div style={{ height: 44, display: 'flex', alignItems: 'center' }}><Spinner /></div>
          ) : (
            <>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#f9fafb', marginBottom: 5, fontFamily: T.fontSans, lineHeight: 1.35 }}>
                {dueCount} thẻ cần ôn hôm nay
                {newCount > 0 && <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 400 }}> · + {newCount} thẻ mới</span>}
              </div>
              <div style={{ fontSize: 12.5, color: '#6b7280', fontFamily: T.fontSans }}>
                {dueCount > 0
                  ? `Ước tính ~${Math.max(1, Math.round(dueCount * 0.4 + newCount * 0.6))} phút`
                  : 'Hôm nay đã xong 🌱'}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => router.push('/review')}
          style={{
            background: T.accent, color: '#fff', border: 'none', borderRadius: 11,
            padding: '11px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            whiteSpace: 'nowrap', fontFamily: T.fontSans, flexShrink: 0,
          }}
        >Bắt đầu →</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14 }}>
        {[
          { label: 'CHUỖI NGÀY', value: String(streak), sub: 'ngày liên tiếp', accent: T.accent },
          { label: '30 NGÀY QUA', value: String(totalCards), sub: 'thẻ đã ôn', accent: undefined },
          { label: 'ĐÃ ÔN HÔM NAY', value: String(dueCount > 0 ? 0 : (srsStats?.learning ?? 0)), sub: dueCount > 0 ? `còn ${dueCount} thẻ` : 'hoàn thành!', accent: undefined },
        ].map(stat => (
          <div key={stat.label} style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 14, padding: '18px 22px', flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink40, letterSpacing: '0.1em', marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: stat.accent ?? T.ink, lineHeight: 1, fontFamily: T.fontMono }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: T.ink40, marginTop: 5 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Competency radar */}
      <div style={{ opacity: uktMasteryLoading ? 0.82 : 1, transition: 'opacity 0.15s ease' }}>
        <KnowledgeSpiderChart points={moduleMastery} />
      </div>

      {/* Activity heatmap */}
      <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 16, padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.ink40, letterSpacing: '0.1em' }}>HOẠT ĐỘNG 30 NGÀY</span>
          <span className="sy-mono" style={{ fontSize: 12, color: T.ink40 }}>{totalCards} thẻ đã ôn</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 4 }}>
          {heatmap.map((count, i) => {
            const opacity = count === 0 ? 1 : Math.min(1, 0.18 + count / 26)
            return (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 4, background: count === 0 ? T.ink10 : T.accent, opacity: count === 0 ? 1 : opacity }} title={`${count} thẻ`} />
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span className="sy-mono" style={{ fontSize: 10.5, color: T.ink40 }}>30 ngày trước</span>
          <span className="sy-mono" style={{ fontSize: 10.5, color: T.ink40 }}>Hôm nay</span>
        </div>
      </div>

      <div style={{ height: 8 }} />
    </div>
  )
}

// ── Courses panel (Tab 2: KHÓA) ───────────────────────────────────────────────

interface CoursesPanelProps {
  courses: SavedCourse[]
  coursesLoading: boolean
  progressMap: ProgressMap
  deleteError: string | null
  file: File | null
  dragOver: boolean
  onUploadClick: () => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onFileStart: () => void
  onFileClear: () => void
  onDeleteCourse: (id: string) => void
  onCourseClick: (id: string) => void
  error: string | null
}

function CoursesPanel({
  courses, coursesLoading, progressMap, deleteError,
  file, dragOver, onUploadClick, onDrop, onDragOver, onDragLeave,
  onFileStart, onFileClear, onDeleteCourse, onCourseClick, error,
}: CoursesPanelProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: T.bg, padding: '24px 28px' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.03em', color: T.ink }}>Thư viện</h2>
        <button
          onClick={onUploadClick}
          style={{ background: T.ink, color: T.bgSolid, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' }}
        >+ Thêm PDF</button>
      </div>

      {deleteError && (
        <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fff5f5', border: '1px solid #fecdcd', borderRadius: 8, fontSize: 13, color: '#7a0000' }}>
          {deleteError}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff5f5', border: '1px solid #fecdcd', borderRadius: 10, fontSize: 13, color: '#7a0000' }}>
          {error}
        </div>
      )}

      {/* File selected — upload prompt */}
      {file && (
        <div style={{ marginBottom: 16, padding: '14px 18px', background: T.accentSoft, border: `1.5px solid ${T.accent}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, margin: 0 }}>{file.name}</p>
            <p className="sy-mono" style={{ fontSize: 11, color: T.ink60, margin: '2px 0 0' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onFileStart} style={{ background: T.ink, color: T.bgSolid, padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
              Tạo khóa học →
            </button>
            <button onClick={onFileClear} style={{ background: T.bgSolid, color: T.ink60, padding: '9px 14px', borderRadius: 9, fontSize: 13, border: `1px solid ${T.ink10}`, cursor: 'pointer' }}>
              Bỏ
            </button>
          </div>
        </div>
      )}

      {/* Course grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
        {coursesLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="sy-animate-pulse" style={{ height: 148, borderRadius: 12, background: T.ink10 }} />
          ))
        ) : (
          courses.map(c => {
            const s = courseStats(c, progressMap)
            const chapterCount = c.course.chapters.length
            return (
              <div key={c.id}
                onClick={() => onCourseClick(c.id)}
                style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = T.accent }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = T.ink10 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <SynapsyRing pct={s.masteryPct} size={34} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s.due > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: T.ink, color: T.bgSolid, padding: '2px 8px', borderRadius: 20 }}>{s.due}</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteCourse(c.id) }}
                      style={{ fontSize: 12, color: T.ink40, padding: 4, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                      title="Xóa"
                    >✕</button>
                  </div>
                </div>
                <h3 className="sy-serif" style={{ fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: '-0.005em', lineHeight: 1.3, color: T.ink }}>{c.title}</h3>
                <div className="sy-mono" style={{ fontSize: 11, color: T.ink40, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>{chapterCount} chương</span><span>·</span><span>{s.total} thẻ</span>
                </div>
                <div style={{ fontSize: 11, color: T.ink60, marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${T.ink10}` }}>
                  {new Date(c.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </div>
              </div>
            )
          })
        )}

        {/* Upload tile */}
        <div
          onClick={onUploadClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          style={{
            border: `1.5px dashed ${dragOver ? T.accent : T.ink20}`,
            background: dragOver ? T.accentSoft : 'transparent',
            borderRadius: 14, padding: '16px 18px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 148, gap: 8, color: T.ink60, cursor: 'pointer',
            transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: T.bgSolid, border: `1px solid ${T.ink10}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: T.ink40 }}>+</div>
          <p style={{ fontSize: 12, margin: 0, fontWeight: 500 }}>Thả PDF vào đây</p>
          <p className="sy-mono" style={{ fontSize: 10, margin: 0, color: T.ink40 }}>hoặc click để chọn</p>
        </div>
      </div>

      {/* CTA footer */}
      <div style={{ marginTop: 32 }}>
        <div style={{ background: T.ink, borderRadius: 12, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: T.bgSolid, letterSpacing: '-0.01em' }}>Thêm tài liệu mới</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '3px 0 0' }}>PDF · slide · ghi chú — Synapsy trích xuất concept và tạo flashcard tự động</p>
          </div>
          <button onClick={onUploadClick} style={{ background: T.bgSolid, color: T.ink, padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, border: 'none' }}>
            Chọn file PDF
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SRS launcher panel (Tab 3: SRS) ──────────────────────────────────────────

interface SRSPanelProps {
  srsStats: SRSStats | null
  srsLoading: boolean
  courses: SavedCourse[]
  progressMap: ProgressMap
}

function SRSPanel({ srsStats, srsLoading, courses, progressMap }: SRSPanelProps) {
  const router = useRouter()
  const total = srsStats?.due ?? 0
  const newCount = srsStats?.new ?? 0

  const courseDueList = useMemo(() =>
    courses
      .map(c => ({ name: c.title, due: courseStats(c, progressMap).due }))
      .filter(c => c.due > 0)
      .sort((a, b) => b.due - a.due),
    [courses, progressMap]
  )
  const maxDue = Math.max(...courseDueList.map(c => c.due), 1)

  return (
    <div style={{ flex: 1, background: T.bg, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 540, padding: '52px 24px' }}>

        {/* Hero number */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 96, fontWeight: 800, color: T.ink, lineHeight: 1, fontFamily: T.fontMono }}>
            {srsLoading ? '…' : total}
          </div>
          <div style={{ fontSize: 17, color: T.ink60, marginTop: 10, fontFamily: T.fontSans }}>thẻ cần ôn hôm nay</div>
          {newCount > 0 && <div style={{ fontSize: 13, color: T.ink40, marginTop: 6 }}>+ {newCount} thẻ mới</div>}
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/review')}
          style={{
            width: '100%', background: T.ink, color: T.bgSolid, border: 'none',
            borderRadius: 15, padding: '17px 0', fontSize: 15.5, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, fontFamily: T.fontSans, marginBottom: 36,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="white"><polygon points="2,1 13,7 2,13"/></svg>
          Bắt đầu ôn tập
        </button>

        {/* Stats breakdown */}
        <div style={{ height: 1, background: T.ink10, marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 12, marginBottom: 30 }}>
          {[
            { n: srsStats?.learning ?? 0, label: 'Đang học (Learning)', color: T.srsHard },
            { n: total,                   label: 'Cần ôn (Due)',         color: T.srsAgain },
            { n: newCount,                label: 'Thẻ mới (New)',        color: T.accent },
          ].map(({ n, label, color }) => (
            <div key={label} style={{ flex: 1, background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 13, padding: '16px 18px' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1, fontFamily: T.fontMono }}>{srsLoading ? '…' : n}</div>
              <div style={{ fontSize: 12, color: T.ink40, marginTop: 5, fontFamily: T.fontSans }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Per-course breakdown */}
        {courseDueList.length > 0 && (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink40, letterSpacing: '0.09em', marginBottom: 14 }}>THEO KHÓA HỌC</div>
            {courseDueList.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.ink10}` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13.5, color: T.ink, fontFamily: T.fontSans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <div style={{ width: 110, height: 3, background: T.ink10, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${(c.due / maxDue) * 100}%`, height: '100%', background: T.accent, borderRadius: 99, transition: 'width 0.6s ease' }} />
                </div>
                <span className="sy-mono" style={{ width: 48, textAlign: 'right', fontSize: 12.5, fontWeight: 500, color: T.ink }}>{c.due} thẻ</span>
              </div>
            ))}
          </div>
        )}

        {total === 0 && !srsLoading && (
          <div style={{ textAlign: 'center', paddingTop: 12 }}>
            <p style={{ fontSize: 14, color: T.ink60, margin: 0, lineHeight: 1.6 }}>
              Hôm nay đã hoàn thành! 🌱<br />
              <span style={{ fontSize: 13, color: T.ink40 }}>Quay lại vào ngày mai để ôn tiếp.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main home ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { status, course, courseContentMap, stage2Loading, stage2Errors, error, rawMarkdown, savedCourseId, diagnosticStatus, parseProgress, startGeneration, resetGeneration, fetchChapter } = useGeneration()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user, loading: authLoading, login, logout } = useAuth()
  const stableUserId = authLoading ? null : user?.uid ?? null
  const { courses, loading: coursesLoading, deleteCourse, refresh: refreshCourses, error: deleteError } = useCourses(stableUserId)
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')

  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current !== 'idle' && status === 'idle') refreshCourses()
    prevStatus.current = status
  }, [status, refreshCourses])

  const uniqueCourses = useMemo(() => {
    if (!Array.isArray(courses)) return []
    const seenHashes = new Set<string>()
    const seenTitles = new Set<string>()
    return courses.filter(c => {
      if (!c) return false
      if (c.contentHash) {
        if (seenHashes.has(c.contentHash)) return false
        seenHashes.add(c.contentHash)
        seenTitles.add(c.title)
        return true
      }
      if (seenTitles.has(c.title)) return false
      seenTitles.add(c.title)
      return true
    })
  }, [courses])

  const { stats: srsStats, loading: srsLoading } = useSRSStats(stableUserId)
  const progressMap = useProgressMap(stableUserId)
  const { points: moduleMastery, loading: uktMasteryLoading } = useUktMastery(stableUserId)

  const reset = useCallback(() => {
    setFile(null)
    resetGeneration()
    if (inputRef.current) inputRef.current.value = ''
  }, [resetGeneration])

  function handleFile(f: File | null) { if (f && f.type === 'application/pdf') setFile(f) }
  function handleDrop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0] ?? null) }
  function handleStart() { if (file) startGeneration(file) }

  const heatmap = buildHeatmap(progressMap)
  const totalCards = heatmap.reduce((a, b) => a + b, 0)
  const streak = srsStats?.streak ?? 0

  const userInitials = user ? (user.displayName || user.email || 'U')[0].toUpperCase() : undefined

  // ── Full-page states (no NavRail) ──────────────────────────────────────────

  if (status === 'parsing' || (status === 'generating' && !course)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: T.bg, fontFamily: T.fontSans }}>
        <div className="w-full max-w-xl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ padding: 16, borderRadius: 16, background: T.bgSolid, border: `1px solid ${T.ink10}` }}>
              <Spinner />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p className="sy-serif" style={{ fontSize: 20, fontWeight: 600, color: T.ink, margin: '0 0 4px' }}>
                {status === 'parsing' ? 'Đang đọc tài liệu PDF...' : 'Đang thiết kế lộ trình khóa học...'}
              </p>
              {status === 'parsing' && (
                <p style={{ fontSize: 13, color: T.ink60, margin: '0 0 8px' }}>
                  Tài liệu đang được xử lý, vui lòng đợi chút nhé.
                </p>
              )}
              {parseProgress && status === 'parsing' && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ width: '100%', height: 8, borderRadius: 999, background: T.ink10, overflow: 'hidden' }}>
                    <div style={{ width: `${parseProgress.percentComplete}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${T.accent}, ${T.srsGood})`, transition: 'width 0.35s ease' }} />
                  </div>
                  <p style={{ fontSize: 13, color: T.ink60, margin: 0 }}>
                    Chunk {parseProgress.currentChunk}/{parseProgress.totalChunks} ({parseProgress.percentComplete}%)
                  </p>
                </div>
              )}
              <p style={{ fontSize: 13, color: T.ink60, margin: parseProgress && status === 'parsing' ? '4px 0 0' : 0 }}>Quá trình này mất 3 - 5 phút.</p>
            </div>
          </div>
          <FlashFactGallery markdown={rawMarkdown} />
        </div>
      </main>
    )
  }

  if (course && (status === 'generating' || status === 'done')) {
    return (
      <GenerationScreen
        course={course!} stage2Loading={stage2Loading} courseContentMap={courseContentMap}
        rawMarkdown={rawMarkdown} savedCourseId={savedCourseId} stage2Errors={stage2Errors}
        diagnosticStatus={diagnosticStatus}
        onReset={reset}
        onRetryChapter={async (i) => {
          if (!course) return
          await fetchChapter(i)
        }}
      />
    )
  }

  if (error && !course) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: T.bg, fontFamily: T.fontSans }}>
        <div className="w-full max-w-2xl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ padding: 16, borderRadius: 16, background: '#fff5f5', border: '1px solid #fecdcd' }}>
            <div className="sy-serif" style={{ fontSize: 20, fontWeight: 600, color: '#7a0000', marginBottom: 6 }}>
              Có lỗi khi tạo khóa học
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#7a0000' }}>{error}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => file && startGeneration(file)} disabled={!file}
              style={{ background: T.ink, color: T.bgSolid, padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: file ? 'pointer' : 'not-allowed', opacity: file ? 1 : 0.5, border: 'none' }}>
              Thử lại
            </button>
            <button onClick={reset}
              style={{ background: T.bgSolid, color: T.ink60, padding: '11px 20px', borderRadius: 10, fontSize: 14, border: `1px solid ${T.ink10}`, cursor: 'pointer' }}>
              Quay về thư viện
            </button>
          </div>
          <div style={{ width: '100%', maxWidth: 640 }}>
            <FlashFactGallery markdown={rawMarkdown} />
          </div>
        </div>
      </main>
    )
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}><Spinner /></div>
  }

  // ── NavRail shell ──────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100vh', display: 'flex', overflow: 'hidden', background: T.bg, fontFamily: T.fontSans, color: T.ink }}>
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] ?? null)} />

      <NavRail
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userInitials={userInitials}
        onLogout={logout}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div key={activeTab} className="sy-animate-tab-enter" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {activeTab === 'dashboard' && (
            <DashboardPanel
              user={user}
              srsStats={srsStats}
              srsLoading={srsLoading}
              moduleMastery={moduleMastery}
              uktMasteryLoading={uktMasteryLoading}
              progressMap={progressMap}
              streak={streak}
              totalCards={totalCards}
              onLogin={login}
              onLogout={logout}
            />
          )}
          {activeTab === 'courses' && (
            <CoursesPanel
              courses={uniqueCourses}
              coursesLoading={coursesLoading}
              progressMap={progressMap}
              deleteError={deleteError}
              file={file}
              dragOver={dragOver}
              onUploadClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onFileStart={handleStart}
              onFileClear={() => setFile(null)}
              onDeleteCourse={deleteCourse}
              onCourseClick={id => router.push(`/course/${id}`)}
              error={error}
            />
          )}
          {activeTab === 'srs' && (
            <SRSPanel
              srsStats={srsStats}
              srsLoading={srsLoading}
              courses={uniqueCourses}
              progressMap={progressMap}
            />
          )}
        </div>
      </div>
    </div>
  )
}
