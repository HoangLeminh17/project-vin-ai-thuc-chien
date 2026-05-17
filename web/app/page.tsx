'use client'

import { useState, useRef, useCallback, useEffect, useMemo, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { Spinner } from '@/app/components'
import { useCourses } from '@/lib/hooks/use-courses'
import { useDashboardData } from '@/lib/hooks/use-dashboard-data'
import { SavedCourse } from '@/core/models/saved-course'
import { Course, ChapterContent } from '@/core/models/learning-model'
import { useGeneration, type DiagnosticStatus } from '@/lib/contexts/generation-context'
import { SynapsyLogo, SynapsyRing, GeoDecoration, T } from '@/app/components/synapsy'
import { KnowledgeSpiderChart } from '@/app/components/knowledge/KnowledgeSpiderChart'
import { aggregateModuleMastery, type ModuleMasteryPoint } from '@/lib/ukt-module-mastery'
import { getLessonCards } from '@/lib/course-cards'
import { NavRail, DocDrawer, type NavTab, type CourseRow } from '@/app/components/shell'

import { FlashFactGallery } from '@/app/components'
import { type SRSStats } from '@/lib/hooks/use-srs-stats'
import { ErrorScreen } from './components/dashboard/ErrorScreen'

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function useSRSStats(userId: string | null) {
  const [stats, setStats] = useState<SRSStats | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!userId) { setStats(null); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    fetch('/api/progress/stats', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
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
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (const entry of Object.values(map)) {
    if (!entry.lastReviewedAt) continue
    const d = new Date(entry.lastReviewedAt); d.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((today.getTime() - d.getTime()) / 86_400_000)
    if (diffDays < 0 || diffDays >= days) continue
    buckets[days - 1 - diffDays]++
  }
  return buckets
}

function useProgressMap(userId: string | null) {
  const [map, setMap] = useState<ProgressMap>({})
  useEffect(() => {
    if (!userId) { setMap({}); return }
    const controller = new AbortController()
    fetch('/api/progress/map', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
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
    if (!userId) { setPoints(EMPTY_MODULE_MASTERY); setLoading(false); return }
    let cancelled = false; setLoading(true)
    const controller = new AbortController()
    fetch('/api/ukt/mastery', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return
        setPoints(Array.isArray(data?.module_mastery) ? data.module_mastery : EMPTY_MODULE_MASTERY)
      })
      .catch(() => { if (!cancelled) setPoints(EMPTY_MODULE_MASTERY) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; controller.abort() }
  }, [userId])
  return { points, loading }
}

// ── Course stats helpers ──────────────────────────────────────────────────────

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

// ── Generation screen (full-page, no NavRail) ─────────────────────────────────

function GenerationScreen({ course, stage2Loading, courseContentMap, rawMarkdown, savedCourseId, stage2Errors, diagnosticStatus, onRetryChapter, onReset }: {
  course: Course; stage2Loading: Record<number, boolean>; courseContentMap: Record<number, ChapterContent>
  rawMarkdown: string; savedCourseId: string | null; stage2Errors: Record<number, string>
  diagnosticStatus: DiagnosticStatus; onRetryChapter: (i: number) => void; onReset: () => void
}) {
  const router = useRouter()
  const doneCount = Object.keys(courseContentMap).length
  const allDone = course?.chapters?.every((_, i) => courseContentMap[i] !== undefined) ?? false

  const handleGoBack = () => { if (savedCourseId) localStorage.removeItem(`justGenerated_${savedCourseId}`); onReset() }
  const handleStudyNow = () => { if (!savedCourseId) return; router.push(`/course/${savedCourseId}`); onReset() }
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
          <button onClick={handleGoBack} style={{ fontSize: 13, color: T.ink60, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>← Quay về Thư viện</button>
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
              <p style={{ fontSize: 16, fontWeight: 700, color: T.ink, margin: '0 0 4px' }}>Khóa học đã sẵn sàng!</p>
              <p style={{ fontSize: 12, color: T.ink60, margin: '0 0 16px', lineHeight: 1.55 }}>
                {diagnosticStatus === 'done' ? 'Bài test chẩn đoán đã được chuẩn bị sẵn. Bạn có thể vào test ngay hoặc vào học luôn.' : 'Không tạo được bài test, nhưng bạn vẫn có thể vào học ngay bây giờ.'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {diagnosticStatus === 'done' && (
                  <button onClick={handleStudyNow} style={{ background: T.ink, color: T.bgSolid, padding: '11px 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', textAlign: 'left' }}>Vào bài test trình độ</button>
                )}
                <button onClick={handleSkipDiagnosticAndStudy} style={{ background: T.bgSolid, color: T.ink, padding: '11px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: `1px solid ${T.ink}`, textAlign: 'left' }}>Vào học luôn</button>
                <button onClick={handleGoBack} style={{ background: T.bgSolid, color: T.ink60, padding: '11px 16px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: `1px solid ${T.ink10}`, textAlign: 'left' }}>Về thư viện</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

// ── Dashboard panel (Column 3 when Tab = KHO) ─────────────────────────────────

interface DashboardPanelProps {
  srsStats: SRSStats | null
  srsLoading: boolean
  moduleMastery: ModuleMasteryPoint[]
  uktMasteryLoading: boolean
  progressMap: ProgressMap
  streak: number
  totalCards: number
}

function DashboardPanel({ srsStats, srsLoading, moduleMastery, uktMasteryLoading, progressMap, streak, totalCards }: DashboardPanelProps) {
  const router = useRouter()
  const heatmap = buildHeatmap(progressMap)
  const dueCount = srsStats?.due ?? 0
  const newCount = srsStats?.new ?? 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, overflowY: 'auto', padding: '24px 24px', gap: 16 }}>

      {/* Dark hero banner */}
      <div style={{ background: '#0d1420', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', marginBottom: 6 }}>
            {streak > 0 ? `🔥 ${streak} NGÀY LIÊN TIẾP` : 'HÔM NAY'}
          </div>
          {srsLoading ? (
            <div style={{ height: 38, display: 'flex', alignItems: 'center' }}><Spinner /></div>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f9fafb', marginBottom: 3, lineHeight: 1.35 }}>
                {dueCount > 0 ? `${dueCount} thẻ cần ôn hôm nay` : 'Hôm nay đã xong 🌱'}
                {newCount > 0 && <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 6 }}>+ {newCount} thẻ mới</span>}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {dueCount > 0 ? `Ước tính ~${Math.max(1, Math.round(dueCount * 0.4 + newCount * 0.6))} phút` : 'Quay lại vào ngày mai'}
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => router.push('/review')}
          style={{ background: T.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        >Bắt đầu →</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
        {[
          { label: 'CHUỖI NGÀY', value: String(streak), sub: 'ngày liên tiếp', accentVal: T.accent },
          { label: '30 NGÀY QUA', value: String(totalCards), sub: 'thẻ đã ôn' },
          { label: 'CẦN ÔN', value: String(dueCount), sub: dueCount > 0 ? 'thẻ hôm nay' : 'tất cả xong!' },
        ].map(stat => (
          <div key={stat.label} style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '16px 18px', flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink40, letterSpacing: '0.1em', marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.accentVal ?? T.ink, lineHeight: 1, fontFamily: T.fontMono }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: T.ink40, marginTop: 4 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Competency radar */}
      <div style={{ opacity: uktMasteryLoading ? 0.82 : 1, transition: 'opacity 0.15s ease' }}>
        <KnowledgeSpiderChart points={moduleMastery} />
      </div>

      {/* Heatmap */}
      <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 14, padding: '16px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.ink40, letterSpacing: '0.1em' }}>HOẠT ĐỘNG 30 NGÀY</span>
          <span className="sy-mono" style={{ fontSize: 11, color: T.ink40 }}>{totalCards} thẻ đã ôn</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 3 }}>
          {heatmap.map((count, i) => (
            <div key={i} style={{ aspectRatio: '1', borderRadius: 3, background: count === 0 ? T.ink10 : T.accent, opacity: count === 0 ? 1 : Math.min(1, 0.2 + count / 24) }} title={`${count} thẻ`} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span className="sy-mono" style={{ fontSize: 10, color: T.ink40 }}>30 ngày trước</span>
          <span className="sy-mono" style={{ fontSize: 10, color: T.ink40 }}>Hôm nay</span>
        </div>
      </div>

      <div style={{ height: 8 }} />
    </div>
  )
}

// ── Courses panel (Column 3 when Tab = KHÓA) ─────────────────────────────────

interface CoursesPanelProps {
  dragOver: boolean
  error: string | null
  onUploadClick: () => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
}

function CoursesPanel({ dragOver, error, onUploadClick, onDrop, onDragOver, onDragLeave }: CoursesPanelProps) {
  return (
    <div
      style={{ flex: 1, overflowY: 'auto', background: T.bg, display: 'flex', flexDirection: 'column' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {error && (
        <div style={{ margin: '12px 20px 0', padding: '10px 14px', background: '#fff5f5', border: '1px solid #fecdcd', borderRadius: 8, fontSize: 13, color: '#7a0000' }}>
          {error}
        </div>
      )}

      {/* Upload zone */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
        <div
          onClick={onUploadClick}
          style={{
            border: `1.5px dashed ${dragOver ? T.accent : T.ink20}`,
            background: dragOver ? T.accentSoft : T.bgSolid,
            borderRadius: 16, padding: '40px 32px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
            maxWidth: 320, width: '100%',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.bgSunken, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: T.ink40 }}>+</div>
          <p style={{ fontSize: 13, margin: 0, fontWeight: 600, color: T.ink60, textAlign: 'center' }}>Thả PDF vào đây hoặc click để tải lên</p>
          <p className="sy-mono" style={{ fontSize: 10, margin: 0, color: T.ink40, textAlign: 'center' }}>Synapsy sẽ trích xuất concept và tạo flashcard tự động</p>
        </div>
        <p style={{ fontSize: 12, color: T.ink40, margin: 0, textAlign: 'center' }}>
          Chọn tài liệu bên trái để mở khóa học
        </p>
      </div>
    </div>
  )
}

// ── SRS panel (Column 3 when Tab = SRS) ──────────────────────────────────────

interface SRSPanelProps {
  srsStats: SRSStats | null
  srsLoading: boolean
}

function SRSPanel({ srsStats, srsLoading }: SRSPanelProps) {
  const router = useRouter()
  const total = srsStats?.due ?? 0
  const newCount = srsStats?.new ?? 0

  return (
    <div style={{ flex: 1, background: T.bg, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '48px 24px' }}>

        {/* Hero number */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 88, fontWeight: 800, color: T.ink, lineHeight: 1, fontFamily: T.fontMono }}>
            {srsLoading ? '…' : total}
          </div>
          <div style={{ fontSize: 16, color: T.ink60, marginTop: 8 }}>thẻ cần ôn hôm nay</div>
          {newCount > 0 && <div style={{ fontSize: 12, color: T.ink40, marginTop: 4 }}>+ {newCount} thẻ mới</div>}
        </div>

        <button
          onClick={() => router.push('/review')}
          style={{ width: '100%', background: T.ink, color: T.bgSolid, border: 'none', borderRadius: 13, padding: '16px 0', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 32 }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="white"><polygon points="2,1 13,7 2,13"/></svg>
          Ôn tất cả
        </button>

        <div style={{ height: 1, background: T.ink10, marginBottom: 20 }} />

        <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          {[
            { n: srsStats?.learning ?? 0, label: 'Đang học', color: T.srsHard },
            { n: total,                    label: 'Cần ôn',   color: T.srsAgain },
            { n: newCount,                 label: 'Thẻ mới',  color: T.accent },
          ].map(({ n, label, color }) => (
            <div key={label} style={{ flex: 1, background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, fontFamily: T.fontMono }}>{srsLoading ? '…' : n}</div>
              <div style={{ fontSize: 11, color: T.ink40, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 13, color: T.ink60, textAlign: 'center', lineHeight: 1.7, margin: 0 }}>
          Chọn khóa học từ bảng bên trái<br />
          <span style={{ fontSize: 12, color: T.ink40 }}>để bắt đầu học theo từng môn cụ thể</span>
        </p>
      </div>
    </div>
  )
}

// ── Global top bar (44px, full width) ────────────────────────────────────────

function TopBar({ activeTab, displayName, initials, onLogout }: {
  activeTab: NavTab
  displayName: string
  initials: string
  onLogout?: () => void
}) {
  const SECTION_LABEL: Record<NavTab, string> = {
    dashboard: 'Tổng quan',
    courses: 'Khoá học',
    srs: 'Ôn tập SRS',
  }
  return (
    <div style={{
      height: 44, flexShrink: 0,
      background: '#ffffff', borderBottom: '1px solid #eaecf2',
      display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12, zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 26, height: 26, background: T.accent, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SynapsyLogo size={14} color="#ffffff" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#111827', letterSpacing: '-0.01em', fontFamily: T.fontSans }}>Synapsy</span>
      </div>
      <div style={{ width: 1, height: 16, background: '#e5e7eb', flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#9ca3af', fontFamily: T.fontSans }}>{SECTION_LABEL[activeTab]}</span>
      <div style={{ flex: 1 }} />
      {displayName && <span style={{ fontSize: 13, color: '#6b7280', fontFamily: T.fontSans }}>{displayName}</span>}
      <button
        onClick={onLogout}
        style={{
          width: 30, height: 30, borderRadius: '50%', background: T.accent,
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', flexShrink: 0, fontFamily: T.fontSans,
        }}
      >{initials}</button>
    </div>
  )
}

// ── Main home ─────────────────────────────────────────────────────────────────

export default function Home() {
  const {
    status, course, courseContentMap, stage2Loading, stage2Errors,
    error, rawMarkdown, savedCourseId, diagnosticStatus,
    parseProgress, startGeneration, resetGeneration, fetchChapter,
  } = useGeneration()

  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user, loading: authLoading, login, logout } = useAuth()
  const stableUserId = authLoading ? null : user?.uid ?? null
  const { courses, loading: coursesLoading, deleteCourse, refresh: refreshCourses, error: deleteError } = useCourses(stableUserId)
  const { srsStats, progressMap, moduleMastery, loading: dashboardLoading, refresh: refreshDashboard } = useDashboardData(stableUserId)
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard')
  const [drawerCollapsed, setDrawerCollapsed] = useState(false)
  const srsLoading = dashboardLoading
  const uktMasteryLoading = dashboardLoading

  const prevStatus = useRef(status)
  useEffect(() => {
    if (prevStatus.current !== 'idle' && status === 'idle') refreshDashboard()
    prevStatus.current = status
  }, [status, refreshDashboard])

  const uniqueCourses = useMemo(() => {
    if (!Array.isArray(courses)) return []
    const seenHashes = new Set<string>()
    const seenTitles = new Set<string>()
    return courses.filter(c => {
      if (!c) return false
      if (c.contentHash) {
        if (seenHashes.has(c.contentHash)) return false
        seenHashes.add(c.contentHash); seenTitles.add(c.title); return true
      }
      if (seenTitles.has(c.title)) return false
      seenTitles.add(c.title); return true
    })
  }, [courses])

  const totalCards = useMemo(() => buildHeatmap(progressMap).reduce((a, b) => a + b, 0), [progressMap])
  const streak = srsStats?.streak ?? 0

  const reset = useCallback(() => {
    setFile(null); resetGeneration()
    if (inputRef.current) inputRef.current.value = ''
  }, [resetGeneration])

  function handleFile(f: File | null) {
    if (f && f.type === 'application/pdf') {
      setFile(f)
      startGeneration(f)
    }
  }
  function handleDrop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0] ?? null) }

  const heatmap = buildHeatmap(progressMap)
  const userInitials = user ? (user.displayName || user.email || 'U')[0].toUpperCase() : undefined

  const courseRows = useMemo<CourseRow[]>(() =>
    uniqueCourses.map(c => {
      const s = courseStats(c, progressMap)
      return { id: c.id, title: c.title, masteryPct: s.masteryPct, due: s.due }
    }),
    [uniqueCourses, progressMap]
  )

  function handleCourseAction(id: string) {
    if (activeTab === 'srs') {
      router.push(`/course/${id}?tab=study`)
    } else {
      router.push(`/course/${id}?tab=edit`)
    }
  }

  // ── Full-page states (no NavRail) ──────────────────────────────────────────

  if (status === 'parsing' || (status === 'generating' && !course)) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: T.bg, fontFamily: T.fontSans }}>
        <div className="w-full max-w-xl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ padding: 16, borderRadius: 16, background: T.bgSolid, border: `1px solid ${T.ink10}` }}><Spinner /></div>
            <div style={{ textAlign: 'center' }}>
              <p className="sy-serif" style={{ fontSize: 20, fontWeight: 600, color: T.ink, margin: '0 0 4px' }}>
                {status === 'parsing' ? 'Đang đọc tài liệu PDF...' : 'Đang thiết kế lộ trình khóa học...'}
              </p>
              {status === 'parsing' && <p style={{ fontSize: 13, color: T.ink60, margin: '0 0 8px' }}>Tài liệu đang được xử lý, vui lòng đợi chút nhé.</p>}
              {parseProgress && status === 'parsing' && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ width: '100%', height: 8, borderRadius: 999, background: T.ink10, overflow: 'hidden' }}>
                    <div style={{ width: `${parseProgress.percentComplete}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${T.accent}, ${T.srsGood})`, transition: 'width 0.35s ease' }} />
                  </div>
                  <p style={{ fontSize: 13, color: T.ink60, margin: 0 }}>Chunk {parseProgress.currentChunk}/{parseProgress.totalChunks} ({parseProgress.percentComplete}%)</p>
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
        diagnosticStatus={diagnosticStatus} onReset={reset}
        onRetryChapter={async (i) => { if (!course) return; await fetchChapter(i) }}
      />
    )
  }

  // 3. Error screen
  if (error && !course) {
    return <ErrorScreen file={file} onReset={reset} />
  }

  // 4. Default: Dashboard screen
  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: T.bg, fontFamily: T.fontSans }}>
        <div className="w-full max-w-2xl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ padding: 16, borderRadius: 16, background: '#fff5f5', border: '1px solid #fecdcd' }}>
            <div className="sy-serif" style={{ fontSize: 20, fontWeight: 600, color: '#7a0000', marginBottom: 6 }}>Có lỗi khi tạo khóa học</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#7a0000' }}>{error}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => file && startGeneration(file)} disabled={!file} style={{ background: T.ink, color: T.bgSolid, padding: '11px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: file ? 'pointer' : 'not-allowed', opacity: file ? 1 : 0.5, border: 'none' }}>Thử lại</button>
            <button onClick={reset} style={{ background: T.bgSolid, color: T.ink60, padding: '11px 20px', borderRadius: 10, fontSize: 14, border: `1px solid ${T.ink10}`, cursor: 'pointer' }}>Quay về thư viện</button>
          </div>
          <div style={{ width: '100%', maxWidth: 640 }}><FlashFactGallery markdown={rawMarkdown} /></div>
        </div>
      </main>
    )
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg }}><Spinner /></div>
  }

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: T.bg, fontFamily: T.fontSans }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: 40, textAlign: 'center' }}>
          <div style={{ position: 'relative', marginBottom: -60 }}>
            <GeoDecoration size={300} color={T.accent} opacity={0.07} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <SynapsyLogo size={40} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: T.ink, margin: 0 }}>Synapsy</h1>
          <p style={{ fontSize: 14, color: T.ink60, margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
            Upload PDF — AI tạo flashcard — ôn theo SRS mỗi ngày.
          </p>
          <button onClick={login} style={{ background: T.ink, color: T.bgSolid, padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
            Đăng nhập để bắt đầu →
          </button>
        </div>
      </main>
    )
  }

  // ── Shell: TopBar + body (NavRail | DocDrawer | main) ─────────────────────

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: T.fontSans, color: T.ink }}>
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] ?? null)} />

      {/* Global top bar */}
      <TopBar
        activeTab={activeTab}
        displayName={user.displayName || user.email || ''}
        initials={userInitials ?? 'U'}
        onLogout={logout}
      />

      {/* Body row */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Panel 1 — NavRail */}
        <NavRail activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Panel 2 — DocDrawer */}
        <DocDrawer
          activeTab={activeTab}
          courses={courseRows}
          coursesLoading={coursesLoading}
          collapsed={drawerCollapsed}
          onCourseAction={handleCourseAction}
          onDeleteCourse={deleteCourse}
          onUploadClick={() => inputRef.current?.click()}
        />

        {/* Drawer collapse toggle — floats on the drawer's right edge */}
        <div style={{ position: 'relative', width: 0, flexShrink: 0, zIndex: 30 }}>
          <button
            onClick={() => setDrawerCollapsed(c => !c)}
            style={{
              position: 'absolute', left: -11, top: '50%', transform: 'translateY(-50%)',
              width: 22, height: 22, borderRadius: '50%', background: '#fff',
              border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d={drawerCollapsed ? 'M2 1l4 3-4 3' : 'M6 1L2 4l4 3'} stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Panel 3 — Main content (tab-switched) */}
        <div key={activeTab} className="sy-animate-tab-enter" style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
        {activeTab === 'dashboard' && (
          <DashboardPanel
            srsStats={srsStats}
            srsLoading={srsLoading}
            moduleMastery={moduleMastery}
            uktMasteryLoading={uktMasteryLoading}
            progressMap={progressMap}
            streak={streak}
            totalCards={totalCards}
          />
        )}
        {activeTab === 'courses' && (
          <CoursesPanel
            dragOver={dragOver}
            error={error}
            onUploadClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
          />
        )}
        {activeTab === 'srs' && (
          <SRSPanel
            srsStats={srsStats}
            srsLoading={srsLoading}
          />
        )}
        </div>
      </div>
    </div>
  )
}
