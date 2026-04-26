'use client'

import { useState, useRef, useCallback, useEffect, useMemo, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { FlashFactGallery, Spinner } from '@/app/components'
import { useCourses } from '@/lib/hooks/use-courses'
import { SavedCourse } from '@/core/models/saved-course'
import { Course, CourseContent, ChapterContent } from '@/core/models/learning-model'

// ── Logo ──────────────────────────────────────────────────────────────────────

function SynapsyLogo({ size = 20, color = 'var(--sy-ink)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M8 7V17M12 7V17M16 7V17M6 12H18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

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

// ── Progress map (per-card SRS state) ────────────────────────────────────────

interface ProgressMapEntry { status: 'NEW' | 'LEARNING' | 'REVIEW'; nextReviewDate: string; lastReviewedAt?: string; isDue: boolean }
type ProgressMap = Record<string, ProgressMapEntry>

// Buckets each card's lastReviewedAt into a 30-day array, oldest → today.
// Because we only keep the most recent review per card, each card can
// contribute at most one day — directionally correct but a lower bound.
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

// Collapses a course's flattened cards against the progress map into the
// three numbers the library card needs to render: total / due / masteryPct.
function courseStats(saved: SavedCourse, map: ProgressMap): { total: number; due: number; masteryPct: number } {
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

function Heatmap({ buckets }: { buckets: number[] }) {
  const total = buckets.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...buckets)
  return (
    <div className="rounded-xl" style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 14 }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>30 ngày gần đây</p>
        <span className="sy-mono" style={{ fontSize: '11px', color: 'var(--sy-ink-40)' }}>{total} thẻ</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 4 }}>
        {buckets.map((count, i) => {
          const opacity = count === 0 ? 0 : Math.min(1, 0.25 + count / max)
          return (
            <div key={i} style={{
              aspectRatio: '1',
              borderRadius: 3,
              background: count === 0 ? 'var(--sy-ink-10)' : `rgba(45, 106, 90, ${opacity})`,
              border: count === 0 ? 'none' : '1px solid rgba(45, 106, 90, 0.1)',
            }} title={count === 0 ? '0 thẻ' : `${count} thẻ`} />
          )
        })}
      </div>
      <div className="sy-mono flex justify-between" style={{ marginTop: 10, fontSize: '10px', color: 'var(--sy-ink-40)' }}>
        <span>4 tuần trước</span>
        <span>Hôm nay</span>
      </div>
    </div>
  )
}

function SRSHero({ stats, loading }: { stats: SRSStats | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-xl h-[120px]" style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)' }} />
    )
  }
  if (!stats || (stats.due === 0 && stats.learning === 0 && stats.new === 0)) {
    return (
      <div className="rounded-xl px-6 py-5 flex items-center gap-4" style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)' }}>
        <span style={{ fontSize: '28px' }}>🌱</span>
        <div>
          <p className="sy-serif" style={{ fontSize: '17px', fontWeight: 500, color: 'var(--sy-ink)', margin: 0 }}>Hôm nay đã xong</p>
          <p style={{ fontSize: '13px', color: 'var(--sy-ink-60)', margin: '2px 0 0' }}>Không có thẻ nào cần ôn. Hẹn gặp lại ngày mai!</p>
        </div>
      </div>
    )
  }
  // Rough session-length estimate: ~24s per due card, ~36s per new card.
  const estMinutes = Math.max(1, Math.round(stats.due * 0.4 + stats.new * 0.6))
  const metaText = [
    stats.learning > 0 && `${stats.learning} đang học`,
    stats.new > 0 && `+ ${stats.new} thẻ mới`,
    `ước tính ${estMinutes} phút`,
  ].filter(Boolean).join(' · ')
  return (
    <div className="rounded-xl px-7 py-6 flex items-start justify-between gap-4" style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)' }}>
      <div>
        <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Hôm nay</p>
        <h2 className="sy-serif" style={{ fontSize: '42px', fontWeight: 500, margin: '4px 0 2px', letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--sy-ink)' }}>
          {stats.due} <span style={{ color: 'var(--sy-ink-60)', fontSize: '20px' }}>thẻ cần ôn</span>
        </h2>
        {metaText && <p style={{ fontSize: '13px', color: 'var(--sy-ink-60)', margin: 0 }}>{metaText}</p>}
      </div>
      <div className="flex gap-2 mt-1 shrink-0">
        <a href="/review" className="no-underline px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'var(--sy-warm)' }}>
          Bắt đầu ôn tập →
        </a>
      </div>
    </div>
  )
}

// ── Course card ───────────────────────────────────────────────────────────────

function MasteryRing({ pct, size = 28 }: { pct: number; size?: number }) {
  const strokeWidth = 2.5
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100)
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--sy-ink-10)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--sy-accent)" strokeWidth={strokeWidth}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition: 'stroke-dashoffset .4s ease' }} />
    </svg>
  )
}

function CourseCard({ course, stats, onOpen, onDelete }: { course: SavedCourse; stats: { total: number; due: number; masteryPct: number }; onOpen: () => void; onDelete: () => void }) {
  const chapterCount = course.course.chapters.length
  const lessonCount = course.course.chapters.reduce((n, ch) => n + (ch.lessons?.length ?? 0), 0)
  const date = new Date(course.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return (
    <div
      className="flex flex-col gap-2.5 p-4 rounded-xl cursor-pointer transition-shadow hover:shadow-sm"
      style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)' }}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <MasteryRing pct={stats.masteryPct} />
        <div className="flex items-start gap-2 shrink-0">
          {stats.due > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, background: 'var(--sy-warm-soft)', color: 'var(--sy-warm)', padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap' }}>
              {stats.due} cần ôn
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded transition-colors hover:text-red-500"
            style={{ color: 'var(--sy-ink-20)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <h3 className="sy-serif line-clamp-2" style={{ fontSize: '14px', fontWeight: 500, margin: 0, lineHeight: 1.35, color: 'var(--sy-ink)' }}>{course.title}</h3>
      <div className="sy-mono flex gap-1.5 items-center" style={{ fontSize: '11px', color: 'var(--sy-ink-40)' }}>
        <span>{chapterCount} chương</span><span>·</span><span>{lessonCount} bài</span>
      </div>
      <div style={{ fontSize: '11px', color: 'var(--sy-ink-60)', marginTop: 'auto', paddingTop: '8px', borderTop: '1px dashed var(--sy-ink-10)' }}>
        {date}
      </div>
    </div>
  )
}

// ── Upload zone (inline tile) ─────────────────────────────────────────────────

function UploadTile({
  dragOver, onDrop, onDragOver, onDragLeave, onClick,
}: {
  dragOver: boolean
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className="flex flex-col items-center justify-center gap-2 rounded-xl min-h-[140px] cursor-pointer transition-colors"
      style={{
        background: dragOver ? 'var(--sy-accent-soft)' : 'transparent',
        border: `1.5px dashed ${dragOver ? 'var(--sy-accent)' : 'var(--sy-ink-20)'}`,
        color: 'var(--sy-ink-60)',
      }}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full text-lg" style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)', color: 'var(--sy-ink-40)' }}>+</div>
      <p style={{ fontSize: '12px', margin: 0 }}>Thả PDF vào đây</p>
      <p className="sy-mono" style={{ fontSize: '10px', margin: 0, color: 'var(--sy-ink-40)' }}>hoặc click để chọn</p>
    </div>
  )
}

// ── Pipeline tracker ──────────────────────────────────────────────────────────

function PipelineTracker({ parsed, outlined, chaptersDone, chaptersTotal, allDone }: {
  parsed: boolean
  outlined: boolean
  chaptersDone: number
  chaptersTotal: number
  allDone: boolean
}) {
  const chaptersTotalSafe = chaptersTotal || 0
  const allChaptersDone = chaptersTotalSafe > 0 && chaptersDone === chaptersTotalSafe
  const stages: { label: string; state: 'done' | 'active' | 'pending' }[] = [
    { label: 'Đọc PDF',             state: parsed  ? 'done' : 'active' },
    { label: 'Phân tích cấu trúc',  state: parsed ? (outlined ? 'done' : 'active') : 'pending' },
    { label: `Tạo concept cards · ${chaptersDone}/${chaptersTotal}`, state: !outlined ? 'pending' : (allDone ? 'done' : 'active') },
  ]
  return (
    <div style={{ padding: '14px 16px', background: 'var(--sy-bg-sunken)', borderRadius: 8, fontSize: 11, color: 'var(--sy-ink-60)', lineHeight: 1.55 }}>
      <p className="sy-mono" style={{ margin: 0, fontWeight: 600, color: 'var(--sy-ink-80)', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10, marginBottom: 8 }}>Pipeline</p>
      <div className="sy-mono" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {stages.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {s.state === 'done'    && <span style={{ color: 'var(--sy-accent)' }}>✓</span>}
            {s.state === 'active'  && <span className="sy-animate-pulse" style={{ color: 'var(--sy-warm)' }}>◉</span>}
            {s.state === 'pending' && <span style={{ color: 'var(--sy-ink-20)' }}>○</span>}
            <span style={{ color: s.state === 'pending' ? 'var(--sy-ink-40)' : 'var(--sy-ink-60)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Progressive generation screen ─────────────────────────────────────────────

function GenerationScreen({
  course, stage2Loading, courseContentMap, rawMarkdown, savedCourseId,
  stage2Errors, onRetryChapter,
}: {
  course: Course
  stage2Loading: Record<number, boolean>
  courseContentMap: Record<number, ChapterContent>
  rawMarkdown: string
  savedCourseId: string | null
  stage2Errors: Record<number, string>
  onRetryChapter: (i: number) => void
}) {
  const router = useRouter()
  const doneCount = courseContentMap ? Object.keys(courseContentMap).length : 0
  const allDone = course?.chapters?.every((_, i) => courseContentMap?.[i] !== undefined) ?? false

  useEffect(() => {
    if (allDone && savedCourseId) {
      const t = setTimeout(() => router.push(`/course/${savedCourseId}`), 900)
      return () => clearTimeout(t)
    }
  }, [allDone, savedCourseId, router])

  return (
    <main className="min-h-screen" style={{ background: 'var(--sy-bg)', fontFamily: 'var(--sy-font-sans)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: '1px solid var(--sy-ink-10)', background: 'var(--sy-bg-solid)' }}>
        <div className="flex items-center gap-2.5">
          <SynapsyLogo size={18} />
          <span className="sy-serif" style={{ fontSize: '15px', fontWeight: 500, color: 'var(--sy-ink)' }}>Synapsy</span>
        </div>
        <div className="flex items-center gap-2 sy-mono" style={{ fontSize: '12px', color: 'var(--sy-ink-60)' }}>
          {allDone ? '✓ Hoàn thành!' : (savedCourseId ? '⚠ Hoàn thành một phần' : `Đang soạn thảo · ${doneCount}/${course.chapters.length} chương`)}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--sy-ink-10)' }}>
        <div style={{ width: `${(doneCount / Math.max(course.chapters.length, 1)) * 100}%`, height: '100%', background: 'var(--sy-warm)', transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', minHeight: 'calc(100vh - 55px)' }}>
        {/* Left: outline */}
        <div style={{ padding: '28px 32px', borderRight: '1px solid var(--sy-ink-10)' }}>
          <p className="sy-mono" style={{ fontSize: '11px', color: 'var(--sy-ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: '0 0 6px' }}>
            Đang biên soạn
          </p>
          <h1 className="sy-serif" style={{ fontSize: '24px', fontWeight: 500, margin: '0 0 4px', letterSpacing: '-0.01em', color: 'var(--sy-ink)' }}>{course.title}</h1>
          <p className="sy-mono" style={{ fontSize: '12px', color: 'var(--sy-ink-60)', margin: '0 0 24px' }}>
            {course.chapters.length} chương
          </p>

          <div className="flex flex-col gap-3">
            {course.chapters.map((ch, ci) => {
              const isDone = courseContentMap[ci] !== undefined
              const isLoading = stage2Loading[ci]
              return (
                <div key={ci} style={{
                  background: 'var(--sy-bg-solid)',
                  border: `1px solid ${isLoading ? 'rgba(201,100,66,0.35)' : 'var(--sy-ink-10)'}`,
                  borderRadius: '10px',
                  padding: '14px 18px',
                  opacity: (!isDone && !isLoading) ? 0.55 : 1,
                  transition: 'opacity 0.3s, border-color 0.3s',
                }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="sy-mono" style={{ fontSize: '11px', color: 'var(--sy-ink-40)', flexShrink: 0 }}>0{ci + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="sy-serif" style={{ fontSize: '15px', fontWeight: 500, margin: 0, color: 'var(--sy-ink)', letterSpacing: '-0.005em' }}>{ch.title}</p>
                        <p className="sy-mono" style={{ fontSize: '11px', color: 'var(--sy-ink-60)', margin: '3px 0 0' }}>
                          {isDone
                            ? `${ch.lessons?.length ?? 0} bài · sẵn sàng đọc`
                            : stage2Errors[ci] ? `Lỗi: ${stage2Errors[ci]}`
                            : isLoading ? 'Đang tạo nội dung...'
                            : 'Đang chờ...'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {stage2Errors[ci] && (
                        <button
                          onClick={() => onRetryChapter(ci)}
                          style={{ fontSize: '11px', color: 'var(--sy-accent)', background: 'var(--sy-bg-sunken)', padding: '4px 8px', borderRadius: 6 }}
                        >
                          Thử lại
                        </button>
                      )}
                      {isDone && savedCourseId && (
                        <button
                          onClick={() => router.push(`/course/${savedCourseId}`)}
                          style={{ fontSize: '12px', fontWeight: 500, color: 'var(--sy-warm)', padding: '5px 11px', borderRadius: '6px', border: '1px solid rgba(201,100,66,0.25)' }}
                        >
                          Đọc ngay →
                        </button>
                      )}
                      {isLoading && (
                        <div className="sy-animate-spin" style={{ width: 16, height: 16, border: '2px solid var(--sy-ink-10)', borderTopColor: 'var(--sy-warm)', borderRadius: '50%' }} />
                      )}
                      {!isDone && !isLoading && (
                        <span className="sy-mono" style={{ fontSize: '10px', color: 'var(--sy-ink-40)' }}>···</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {savedCourseId && (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => router.push(`/course/${savedCourseId}`)}
                className="px-5 py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--sy-warm)' }}
              >
                {allDone ? 'Xem khóa học →' : 'Học các chương đã xong →'}
              </button>
              {allDone ? (
                <span className="sy-mono" style={{ fontSize: '11px', color: 'var(--sy-ink-40)' }}>Đang chuyển trang...</span>
              ) : (
                <span className="sy-mono" style={{ fontSize: '11px', color: 'var(--sy-again)' }}>Một số chương bị lỗi, bạn vẫn có thể bắt đầu học.</span>
              )}
            </div>
          )}
        </div>

        {/* Right: Flash Facts + pipeline tracker */}
        <div style={{ padding: '28px', background: 'var(--sy-bg-soft)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <p className="sy-mono" style={{ fontSize: '10px', color: 'var(--sy-accent)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, margin: '0 0 14px' }}>
              💡 Flash Facts
            </p>
            <FlashFactGallery markdown={rawMarkdown} />
          </div>

          <PipelineTracker
            parsed={Boolean(rawMarkdown)}
            outlined={true}
            chaptersDone={doneCount}
            chaptersTotal={course.chapters.length}
            allDone={allDone}
          />
        </div>
      </div>
    </main>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'generating' | 'done'>('idle')
  const [course, setCourse] = useState<Course | null>(null)
  const [courseContentMap, setCourseContentMap] = useState<Record<number, ChapterContent>>({})
  const [stage2Loading, setStage2Loading] = useState<Record<number, boolean>>({})
  const [stage2Errors, setStage2Errors] = useState<Record<number, string>>({})
  const [error, setError] = useState('')
  const [currentHash, setCurrentHash] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [rawMarkdown, setRawMarkdown] = useState('')
  const [savedCourseId, setSavedCourseId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user, loading: authLoading, login, logout } = useAuth()
  const { courses, loading: coursesLoading, saveCourse, deleteCourse } = useCourses(user?.uid ?? null)

  const uniqueCourses = useMemo(() => {
    if (!Array.isArray(courses)) return [];
    const seenHashes = new Set<string>();
    const seenTitles = new Set<string>();
    return courses.filter(c => {
      if (!c) return false;
      // If we have a hash, it's our primary unique identifier
      if (c.contentHash) {
        if (seenHashes.has(c.contentHash)) return false;
        seenHashes.add(c.contentHash);
        // We also "claim" this title so older versions without hashes are hidden
        seenTitles.add(c.title);
        return true;
      }
      // If no hash, we fall back to title (common for older courses)
      if (seenTitles.has(c.title)) return false;
      seenTitles.add(c.title);
      return true;
    });
  }, [courses]);
  const { stats: srsStats, loading: srsLoading } = useSRSStats()
  const progressMap = useProgressMap(user?.uid ?? null)

  const reset = useCallback(() => {
    setFile(null)
    setStatus('idle')
    setCourse(null)
    setCourseContentMap({})
    setStage2Loading({})
    setStage2Errors({})
    setError('')
    setRawMarkdown('')
    setSavedCourseId(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  function handleFile(f: File | null) {
    if (f && f.type === 'application/pdf') { setFile(f); setError('') }
  }
  function handleDrop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0] ?? null) }
  
  const fetchChapter = useCallback(async (i: number, overrideCourse?: Course, overrideHash?: string): Promise<ChapterContent | null> => {
    const activeCourse = overrideCourse || course
    const activeHash = overrideHash || currentHash
    if (!activeCourse) return null
    
    setStage2Loading(prev => ({ ...prev, [i]: true }))
    setStage2Errors(prev => { const n = { ...prev }; delete n[i]; return n })
    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: activeCourse, chapterIndex: i, hash: activeHash }),
      })
      const d = await res.json()
      if (res.ok && d.success) {
        setCourseContentMap(prev => ({ ...prev, [i]: d.chapter }));
        return d.chapter;
      } else {
        throw new Error(d.error || `HTTP ${res.status}`);
      }
    } catch (e) {
      console.error(`Chapter ${i} failed`, e);
      setStage2Errors(prev => ({ ...prev, [i]: e instanceof Error ? e.message : 'Unknown error' }));
    }
    finally { setStage2Loading(prev => ({ ...prev, [i]: false })) }
    return null
  }, [course, currentHash])

  async function handleStart() {
    if (!file) return
    setError('')
    setCourse(null)
    setCourseContentMap({})

    setStatus('parsing')
    const form = new FormData()
    form.append('file', file)

    let markdown = ''
    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Parse failed'); setStatus('idle'); return }
      markdown = data.markdown ?? ''
      setRawMarkdown(markdown)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error'); setStatus('idle'); return
    }

    setStatus('generating')
    let resolvedCourse: Course | null = null
    let hash = ''
    try {
      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Generation failed'); setStatus('idle'); return }
      resolvedCourse = data.course
      hash = data.hash ?? ''
      setCurrentHash(hash)
      
      const currentCourse = resolvedCourse;
      if (!currentCourse) return;

      // Check if this course is already in the user's library
      const existing = (courses || []).find(c => 
        c && (c.contentHash === hash || (!c.contentHash && c.title === currentCourse.title))
      );
      if (existing) {
        setSavedCourseId(existing.id);
        setStatus('done');
        return;
      }

      setCourse(data.course)
      setStatus('done')

      if (resolvedCourse && data.courseContent && data.fromCache && data.courseContent.chapters.length === resolvedCourse.chapters.length) {
        const contentMap: Record<number, ChapterContent> = {}
        data.courseContent.chapters.forEach((ch: ChapterContent, i: number) => { contentMap[i] = ch })
        setCourseContentMap(contentMap)
        if (user && resolvedCourse) {
          saveCourse(resolvedCourse.title, resolvedCourse, data.courseContent, hash).then(saved => { if (saved) setSavedCourseId(saved.id) })
        }
        return
      }

      if (!resolvedCourse) return

      const fromCache = data.fromCache
      const chapters = resolvedCourse.chapters.map((_, i) => i)


      let allChapterContents: (ChapterContent | null)[] = []
      if (fromCache) {
        allChapterContents = await Promise.all(chapters.map(i => fetchChapter(i, resolvedCourse || undefined, hash)))
      } else {
        for (const i of chapters) allChapterContents.push(await fetchChapter(i, resolvedCourse || undefined, hash))
      }

      if (user && resolvedCourse) {
        const content: CourseContent = { chapters: allChapterContents.filter(Boolean) as ChapterContent[] }
        const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content, hash || currentHash)
        if (saved) setSavedCourseId(saved.id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error'); setStatus('idle')
    }
  }

  // ── Loading screen (parsing / generating before outline) ───────────────────
  if (status === 'parsing' || (status === 'generating' && !course)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--sy-bg)', fontFamily: 'var(--sy-font-sans)' }}>
        <div className="w-full max-w-xl space-y-10">
          <div className="flex flex-col items-center gap-5">
            <div className="p-4 rounded-2xl shadow-sm" style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)' }}>
              <Spinner />
            </div>
            <div className="text-center space-y-1.5">
              <p className="sy-serif font-medium" style={{ fontSize: '20px', color: 'var(--sy-ink)' }}>
                {status === 'parsing' ? 'Đang đọc tài liệu PDF...' : 'Đang thiết kế lộ trình khóa học...'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--sy-ink-60)' }}>Quá trình này có thể mất tới 1 phút, vui lòng đợi nhé.</p>
            </div>
          </div>
          <FlashFactGallery markdown={rawMarkdown} />
        </div>
      </main>
    )
  }

  // ── Progressive gen (outline ready, chapters building) + done ──────────────
  if (course && (status === 'generating' || status === 'done')) {
    return (
      <GenerationScreen
        course={course!}
        stage2Loading={stage2Loading}
        courseContentMap={courseContentMap}
        rawMarkdown={rawMarkdown}
        savedCourseId={savedCourseId}
        stage2Errors={stage2Errors}
        onRetryChapter={async (i) => {
          if (!course) return
          const ch = await fetchChapter(i)
          if (ch && user && savedCourseId) {
            // Update the existing saved course if possible, or just rely on the next full save
            // For now, let's just trigger a full save at the end or wait for allDone
          }
        }}
      />
    )
  }

  // ── Idle: unified home ──────────────────────────────────────────────────────
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--sy-bg)' }}><Spinner /></div>
  }

  return (
    <main className="min-h-screen" style={{ background: 'var(--sy-bg)', fontFamily: 'var(--sy-font-sans)', color: 'var(--sy-ink)' }}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />

      {/* ── Top nav ────────────────────────────────────────────────────────── */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderBottom: '1px solid var(--sy-ink-10)', background: 'var(--sy-bg-solid)' }}>
        <div className="flex items-center gap-2.5">
          <SynapsyLogo size={22} />
          <span className="sy-serif" style={{ fontSize: '19px', fontWeight: 600, letterSpacing: '-0.01em' }}>Synapsy</span>
          <span className="sy-mono" style={{ fontSize: '10px', marginLeft: 4, padding: '2px 6px', background: 'var(--sy-bg-sunken)', borderRadius: 4, color: 'var(--sy-ink-40)' }}>beta</span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {srsStats && srsStats.streak > 0 && (
                <span style={{ fontSize: '13px', color: 'var(--sy-ink-60)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  🔥 <span style={{ fontWeight: 500, color: 'var(--sy-ink)' }}>{srsStats.streak}</span> ngày liên tiếp
                </span>
              )}
              <span style={{ fontSize: '13px', color: 'var(--sy-ink-60)' }}>{user.displayName || user.email}</span>
              {user.photoURL && <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" style={{ border: '1px solid var(--sy-ink-10)' }} />}
              <button onClick={logout} style={{ fontSize: '12px', color: 'var(--sy-ink-40)' }}>Đăng xuất</button>
            </>
          ) : (
            <button
              onClick={login}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
              style={{ background: 'var(--sy-warm)' }}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 28px 80px' }}>

        {/* ── SRS Hero + 30-day heatmap ──────────────────────────────────────── */}
        {user && (
          <section style={{ marginBottom: 40 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'stretch' }}>
              <SRSHero stats={srsStats} loading={srsLoading} />
              <Heatmap buckets={buildHeatmap(progressMap)} />
            </div>
          </section>
        )}

        {!user && (
          <section style={{ marginBottom: 40 }}>
            <div className="rounded-xl px-7 py-8 text-center" style={{ background: 'var(--sy-bg-solid)', border: '1px solid var(--sy-ink-10)' }}>
              <h2 className="sy-serif" style={{ fontSize: '26px', fontWeight: 500, margin: '0 0 8px', color: 'var(--sy-ink)' }}>Biến tài liệu thành flashcard thông minh</h2>
              <p style={{ fontSize: '14px', color: 'var(--sy-ink-60)', margin: '0 0 20px' }}>Upload PDF giáo trình, AI sẽ tạo khóa học có cấu trúc với spaced repetition tích hợp.</p>
              <button
                onClick={login}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--sy-warm)' }}
              >
                Đăng nhập để bắt đầu
              </button>
            </div>
          </section>
        )}

        {/* ── Library ────────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div className="flex items-baseline justify-between" style={{ marginBottom: 16 }}>
            <h2 className="sy-serif" style={{ fontSize: '22px', fontWeight: 500, margin: 0, letterSpacing: '-0.01em', color: 'var(--sy-ink)' }}>Thư viện</h2>
            {coursesLoading && <span className="sy-mono" style={{ fontSize: '11px', color: 'var(--sy-ink-40)' }}>Đang tải...</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
            {uniqueCourses.map(c => (
              c && c.id && (
                <CourseCard
                  key={c.id}
                  course={c}
                  stats={courseStats(c, progressMap)}
                  onOpen={() => router.push(`/course/${c.id}`)}
                  onDelete={() => { if (confirm('Xóa khóa học này?')) deleteCourse(c.id) }}
                />
              )
            ))}
            <UploadTile
              dragOver={dragOver}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => user ? inputRef.current?.click() : login()}
            />
          </div>

          {!user && courses.length === 0 && !coursesLoading && (
            <p className="sy-mono" style={{ fontSize: '12px', color: 'var(--sy-ink-40)', marginTop: 8 }}>Đăng nhập để xem và tạo khóa học.</p>
          )}
        </section>

        {/* ── Compact upload bar ─────────────────────────────────────────────── */}
        {user && (
          <section>
            <div
              className="rounded-xl flex items-center justify-between gap-4 px-5 py-4"
              style={{ background: 'var(--sy-bg-sunken)', border: '1px solid var(--sy-ink-10)' }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '13px', fontWeight: 500, margin: 0, color: 'var(--sy-ink)' }}>
                  {file ? `📄 ${file.name}` : 'Thêm tài liệu mới'}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--sy-ink-60)', margin: '2px 0 0' }}>
                  {file ? 'Sẵn sàng tạo khóa học' : 'PDF giáo trình · slide · ghi chú'}
                </p>
              </div>
              {error && <p style={{ fontSize: '12px', color: 'var(--sy-again)', margin: 0 }}>{error}</p>}
              {file ? (
                <div className="flex gap-2 shrink-0 items-center">
                  <button
                    onClick={reset}
                    style={{ fontSize: '12px', color: 'var(--sy-ink-60)', padding: '8px 14px', borderRadius: 7, border: '1px solid var(--sy-ink-10)' }}
                  >
                    Đổi file
                  </button>
                  <button
                    onClick={handleStart}
                    className="text-sm font-medium text-white px-4 py-2 rounded-lg"
                    style={{ background: 'var(--sy-warm)' }}
                  >
                    Tạo khóa học →
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="text-sm font-medium shrink-0 px-4 py-2 rounded-lg"
                  style={{ background: 'var(--sy-ink)', color: 'var(--sy-bg)' }}
                >
                  Chọn file PDF
                </button>
              )}
            </div>
          </section>
        )}

      </div>
    </main>
  )
}
