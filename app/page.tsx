'use client'

import { useState, useRef, useCallback, useEffect, useMemo, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { FlashFactGallery, Spinner } from '@/app/components'
import { useCourses } from '@/lib/hooks/use-courses'
import { SavedCourse } from '@/core/models/saved-course'
import { Course, CourseContent, ChapterContent } from '@/core/models/learning-model'
import { useGeneration, type DiagnosticStatus } from '@/lib/contexts/generation-context'
import { SynapsyLogo, SynapsyRing, GeoDecoration, T } from '@/app/components/synapsy'

// ── SRS stats ─────────────────────────────────────────────────────────────────

interface SRSStats { new: number; learning: number; due: number; streak: number }

function useSRSStats() {
  const [stats, setStats] = useState<SRSStats | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/progress/stats')
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d) })
      .finally(() => setLoading(false))
  }, [])
  return { stats, loading }
}

// ── Progress map ──────────────────────────────────────────────────────────────

interface ProgressMapEntry { status: 'NEW' | 'LEARNING' | 'REVIEW'; nextReviewDate: string; lastReviewedAt?: string; isDue: boolean }
type ProgressMap = Record<string, ProgressMapEntry>

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
    if (!userId) return
    fetch('/api/progress/map')
      .then(r => r.ok ? r.json() : {})
      .then((m: ProgressMap | { error?: string }) => { if (!('error' in m)) setMap(m as ProgressMap) })
      .catch(() => {})
  }, [userId])
  return map
}

function courseStats(saved: SavedCourse, map: ProgressMap) {
  const chapters = saved.courseContent?.chapters ?? []
  let total = 0, due = 0, mature = 0
  chapters.forEach((ch, ci) => {
    ch.lessons.forEach((_, li) => {
      total++
      const e = map[`${ci}-${li}`]
      if (!e) return
      if (e.isDue) due++
      else if (e.status === 'REVIEW') mature++
    })
  })
  return { total, due, masteryPct: total === 0 ? 0 : Math.round((mature / total) * 100) }
}

// ── Pipeline tracker ──────────────────────────────────────────────────────────

function PipelineTracker({ parsed, outlined, chaptersDone, chaptersTotal, allDone, diagnosticStatus }: {
  parsed: boolean; outlined: boolean; chaptersDone: number; chaptersTotal: number; allDone: boolean; diagnosticStatus: DiagnosticStatus
}) {
  const diagState = !allDone ? 'pending' : diagnosticStatus === 'done' ? 'done' : diagnosticStatus === 'loading' ? 'active' : diagnosticStatus === 'error' ? 'error' : 'pending'
  const stages: { label: string; state: 'done' | 'active' | 'pending' | 'error' }[] = [
    { label: 'Đọc PDF',            state: parsed ? 'done' : 'active' },
    { label: 'Phân tích cấu trúc', state: parsed ? (outlined ? 'done' : 'active') : 'pending' },
    { label: `Tạo concept cards · ${chaptersDone}/${chaptersTotal}`, state: !outlined ? 'pending' : (allDone ? 'done' : 'active') },
    { label: 'Tạo bài test chẩn đoán', state: diagState },
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
                <div key={ci} style={{ background: T.bgSolid, border: `1px solid ${isLoading ? T.accent + '66' : T.ink10}`, borderRadius: 10, padding: '14px 18px', opacity: (!isDone && !isLoading) ? 0.55 : 1, transition: 'opacity 0.3s, border-color 0.3s' }}>
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
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {allDone && savedCourseId ? (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.ink10}` }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: T.ink, margin: '0 0 4px' }}>🎉 Khóa học đã sẵn sàng!</p>
              <p style={{ fontSize: 12, color: T.ink60, margin: '0 0 16px' }}>
                {diagnosticStatus === 'done' ? 'Bài test chẩn đoán đã sẵn sàng!' : diagnosticStatus === 'error' ? 'Không tạo được bài test — bạn có thể làm sau.' : 'Bài test chẩn đoán đang được tạo...'}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleStudyNow} style={{ background: T.ink, color: T.bgSolid, padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Học luôn →
                </button>
                <button onClick={handleGoBack} style={{ background: T.bgSolid, color: T.ink60, padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: `1px solid ${T.ink10}` }}>
                  ← Quay về thư viện
                </button>
              </div>
            </div>
          ) : savedCourseId ? (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.ink10}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: T.ink, margin: 0 }}>Đang biên soạn...</p>
                  <p style={{ fontSize: 12, color: T.ink60, margin: '2px 0 0' }}>Bạn có thể học các chương đã hoàn thành ngay bây giờ.</p>
                </div>
                <button onClick={handleStudyNow} style={{ background: T.ink, color: T.bgSolid, padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  Học ngay →
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div style={{ padding: '28px', background: T.bgSoft, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <p className="sy-mono" style={{ fontSize: 10, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, margin: '0 0 14px' }}>💡 Flash Facts</p>
            <FlashFactGallery markdown={rawMarkdown} />
          </div>
          <PipelineTracker parsed={Boolean(rawMarkdown)} outlined={true} chaptersDone={doneCount} chaptersTotal={course.chapters.length} allDone={allDone} diagnosticStatus={diagnosticStatus} />
        </div>
      </div>
    </main>
  )
}

// ── Main home ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { status, course, courseContentMap, stage2Loading, stage2Errors, error, rawMarkdown, savedCourseId, isFromCache, diagnosticStatus, startGeneration, resetGeneration, fetchChapter } = useGeneration()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user, loading: authLoading, login, logout } = useAuth()
  const { courses, loading: coursesLoading, deleteCourse, refresh: refreshCourses } = useCourses(user?.uid ?? null)

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

  const { stats: srsStats, loading: srsLoading } = useSRSStats()
  const progressMap = useProgressMap(user?.uid ?? null)

  const reset = useCallback(() => {
    setFile(null)
    resetGeneration()
    if (inputRef.current) inputRef.current.value = ''
  }, [resetGeneration])

  function handleFile(f: File | null) { if (f && f.type === 'application/pdf') setFile(f) }
  function handleDrop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0] ?? null) }
  function handleStart() { if (file) startGeneration(file) }

  // Loading screen
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
              <p style={{ fontSize: 13, color: T.ink60, margin: 0 }}>Quá trình này có thể mất tới 1 phút, vui lòng đợi nhé.</p>
            </div>
          </div>
          <FlashFactGallery markdown={rawMarkdown} />
        </div>
      </main>
    )
  }

  // Generation screen
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

  if (authLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}><Spinner /></div>

  const heatmap = buildHeatmap(progressMap)
  const totalCards = heatmap.reduce((a, b) => a + b, 0)
  const totalLibraryCards = uniqueCourses.reduce((sum, c) => sum + courseStats(c, progressMap).total, 0)
  const streak = srsStats?.streak ?? 0

  return (
    <main style={{ minHeight: '100vh', background: T.bg, fontFamily: T.fontSans, color: T.ink }}>
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] ?? null)} />

      {/* ── Top nav ── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <SynapsyLogo size={20} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em', color: T.ink }}>Synapsy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 13 }}>
          {user ? (
            <>
              {streak > 0 && <span style={{ fontSize: 13, color: T.ink60 }}>🔥 <span style={{ fontWeight: 600, color: T.ink }}>{streak}</span></span>}
              <a href="/review" style={{ color: T.ink60, fontWeight: 500, textDecoration: 'none' }}>Ôn tập</a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${T.ink10}` }} />
                  : <div style={{ width: 30, height: 30, borderRadius: '50%', background: T.ink, color: T.bgSolid, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </div>
                }
                <button onClick={logout} style={{ fontSize: 12, color: T.ink40 }}>Đăng xuất</button>
              </div>
            </>
          ) : (
            <button onClick={login} style={{ background: T.ink, color: T.bgSolid, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Đăng nhập
            </button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 32px 80px' }}>

        {/* ── Hero ── */}
        {user && (
          <section style={{ marginBottom: 52, position: 'relative', textAlign: 'center', padding: '48px 0 40px' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -52%)', pointerEvents: 'none', zIndex: 0 }}>
              <GeoDecoration size={380} color={T.accent} opacity={0.07} />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.ink60, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>Ôn thi thông minh</p>
              {srsLoading ? (
                <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
              ) : (
                <>
                  <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 16px', color: T.ink }}>
                    {srsStats?.due ?? 0} thẻ cần ôn<br />
                    <span style={{ color: T.ink40, fontWeight: 400, fontSize: 38 }}>hôm nay</span>
                  </h1>
                  <p style={{ fontSize: 15, color: T.ink60, margin: '0 0 28px' }}>
                    {srsStats?.new ? `+ ${srsStats.new} thẻ mới · ` : ''}{srsStats && srsStats.due > 0 ? `ước tính ${Math.max(1, Math.round(srsStats.due * 0.4 + (srsStats.new ?? 0) * 0.6))} phút` : 'Hôm nay đã xong 🌱'}
                  </p>
                </>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <a href="/review" style={{ background: T.ink, color: T.bgSolid, padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' }}>
                  Bắt đầu ôn tập →
                </a>
                <button onClick={() => inputRef.current?.click()} style={{ background: T.bgSolid, color: T.ink60, padding: '13px 20px', borderRadius: 10, fontSize: 14, border: `1px solid ${T.ink10}`, cursor: 'pointer', fontWeight: 500 }}>
                  Thêm tài liệu
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Stats row ── */}
        {user && (
          <section style={{ marginBottom: 44 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Chuỗi ngày', value: String(streak), unit: 'ngày', note: 'liên tiếp' },
                { label: '30 ngày qua', value: String(totalCards), unit: 'thẻ', note: 'đã ôn' },
                { label: 'Tổng thẻ', value: String(totalLibraryCards), unit: 'thẻ', note: 'trong thư viện' },
              ].map(stat => (
                <div key={stat.label} style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '20px 24px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>{stat.label}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', color: T.ink }}>{stat.value}</span>
                    <span style={{ fontSize: 13, color: T.ink60, fontWeight: 500 }}>{stat.unit}</span>
                  </div>
                  <p style={{ fontSize: 12, color: T.ink40, margin: '4px 0 0' }}>{stat.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Heatmap ── */}
        {user && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Hoạt động 30 ngày</p>
                <span className="sy-mono" style={{ fontSize: 11, color: T.ink40 }}>{totalCards} thẻ đã ôn</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 4 }}>
                {heatmap.map((count, i) => {
                  const opacity = count === 0 ? 1 : Math.min(1, 0.18 + count / 26)
                  return (
                    <div key={i} style={{ aspectRatio: '1', borderRadius: 3, background: count === 0 ? T.ink10 : T.accent, opacity: count === 0 ? 1 : opacity }} title={`${count} thẻ`} />
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: T.ink40 }} className="sy-mono">
                <span>30 ngày trước</span><span>Hôm nay</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Library ── */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>Thư viện</h2>
            {!user && (
              <button onClick={login} style={{ background: T.ink, color: T.bgSolid, padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Đăng nhập để xem
              </button>
            )}
          </div>

          {/* File selected: show start button */}
          {file && (
            <div style={{ marginBottom: 16, padding: '14px 18px', background: T.accentSoft, border: `1.5px solid ${T.accent}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, margin: 0 }}>{file.name}</p>
                <p className="sy-mono" style={{ fontSize: 11, color: T.ink60, margin: '2px 0 0' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleStart} style={{ background: T.ink, color: T.bgSolid, padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Tạo khóa học →
                </button>
                <button onClick={() => setFile(null)} style={{ background: T.bgSolid, color: T.ink60, padding: '9px 14px', borderRadius: 9, fontSize: 13, border: `1px solid ${T.ink10}`, cursor: 'pointer' }}>
                  Bỏ
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff5f5', border: '1px solid #fecdcd', borderRadius: 10, fontSize: 13, color: '#7a0000' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
            {coursesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="sy-animate-pulse" style={{ height: 148, borderRadius: 12, background: T.ink10 }} />
              ))
            ) : (
              uniqueCourses.map(c => {
                const s = courseStats(c, progressMap)
                const chapterCount = c.course.chapters.length
                return (
                  <div key={c.id}
                    onClick={() => router.push(`/course/${c.id}`)}
                    style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <SynapsyRing pct={s.masteryPct} size={28} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {s.due > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: T.ink, color: T.bgSolid, padding: '2px 8px', borderRadius: 20 }}>{s.due}</span>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); deleteCourse(c.id) }}
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
              onClick={() => inputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `1.5px dashed ${dragOver ? T.accent : T.ink20}`,
                background: dragOver ? T.accentSoft : 'transparent',
                borderRadius: 12, padding: '16px 18px',
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
        </section>

        {/* ── Upload CTA footer ── */}
        <section style={{ marginTop: 48 }}>
          <div style={{ background: T.ink, borderRadius: 12, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: T.bgSolid, letterSpacing: '-0.01em' }}>Thêm tài liệu mới</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '3px 0 0' }}>PDF · slide · ghi chú — Synapsy trích xuất concept và tạo flashcard tự động</p>
            </div>
            <button onClick={() => inputRef.current?.click()} style={{ background: T.bgSolid, color: T.ink, padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Chọn file PDF
            </button>
          </div>
        </section>

      </div>
    </main>
  )
}
