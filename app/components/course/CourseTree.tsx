'use client'

import { useState } from 'react'
import { SynapsyLogo, SynapsyRing, T } from '@/app/components/synapsy'
import { SavedCourse } from '@/core/models/saved-course'

// ── Semantic color from mastery pct ──────────────────────────────────────────

interface NodeColors { bg: string; border: string; text: string; dot: string; label: string }

function nodeColor(pct: number | null | undefined): NodeColors {
  if (pct === null || pct === undefined)
    return { bg: '#f5f6f8', border: '#c4c8d0', text: '#4a5060', dot: '#8a909e', label: 'Chưa test' }
  if (pct >= 80)
    return { bg: '#f0faf5', border: '#b7e6cc', text: '#0f5132', dot: '#1a7a4a', label: 'Nắm vững' }
  if (pct >= 40)
    return { bg: '#fffbf0', border: '#f5d78a', text: '#7a4800', dot: '#c47a2a', label: 'Cần ôn' }
  return { bg: '#fff5f5', border: '#fecdcd', text: '#7a0000', dot: '#dc3545', label: 'Yếu' }
}

function chapterColor(lessonIds: string[], diagnosticState: Record<string, number>): NodeColors {
  const tested = lessonIds.filter(id => diagnosticState[id] !== undefined)
  if (tested.length === 0) return nodeColor(null)
  const avg = tested.reduce((sum, id) => sum + diagnosticState[id], 0) / tested.length
  return nodeColor(avg)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProgressEntry { status: string; isDue: boolean; lastReviewedAt?: string }

interface Props {
  course: SavedCourse
  progressMap: Record<string, ProgressEntry>
  diagnosticState: Record<string, number>
  onLessonClick: (chapterIdx: number, lessonIdx: number) => void
  onContinue: () => void
  onExit: () => void
}

// ── CourseTree ────────────────────────────────────────────────────────────────

export function CourseTree({ course, progressMap, diagnosticState, onLessonClick, onContinue, onExit }: Props) {
  const chapters = course.course.chapters
  const content = course.courseContent

  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(
    chapters.reduce((acc, _, i) => ({ ...acc, [i]: true }), {})
  )

  const toggleChapter = (i: number) =>
    setExpandedChapters(prev => ({ ...prev, [i]: !prev[i] }))

  // Total card counts from courseContent
  const totalCards = content?.chapters.reduce((sum, ch) => sum + ch.lessons.length, 0) ?? 0
  const dueCards = Object.values(progressMap).filter(e => e.isDue).length
  const matureCards = Object.values(progressMap).filter(e => e.status === 'REVIEW' && !e.isDue).length
  const overallPct = totalCards === 0 ? 0 : Math.round((matureCards / totalCards) * 100)

  // Build lesson ID for diagnostic lookup: we use chapter index + lesson index as key
  // since DiagnosticQuestion.source_chunk_id or topic maps to topics
  // For tree coloring we use the lesson's mastery from progressMap or diagnostic
  function lessonMastery(ci: number, li: number): number | null {
    const entry = progressMap[`${ci}-${li}`]
    if (entry?.lastReviewedAt && new Date(entry.lastReviewedAt) >= new Date(course.createdAt)) {
      return entry.status === 'REVIEW' && !entry.isDue ? 100 : entry.isDue ? 10 : 30
    }
    if (diagnosticState[`${ci}-${li}`] !== undefined) return diagnosticState[`${ci}-${li}`]
    return null
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden', fontFamily: T.fontSans, color: T.ink }}>

      {/* Header */}
      <div style={{ padding: '13px 24px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onExit} style={{ color: T.ink60, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>← Thư viện</button>
        <span style={{ color: T.ink20 }}>|</span>
        <SynapsyLogo size={18} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="sy-serif" style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course.title}</p>
          <p className="sy-mono" style={{ fontSize: 10, color: T.ink40, margin: 0 }}>{course.courseContent?.chapters.length ?? 0} chương</p>
        </div>
        <button onClick={onContinue} style={{ background: T.ink, color: T.bgSolid, padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em', flexShrink: 0, border: 'none' }}>
          Tiếp tục →
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 60px' }}>

          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 32 }}>
            {[
              { label: 'Thẻ cần ôn', value: dueCards, unit: 'thẻ', accent: dueCards > 0 },
              { label: 'Tổng thẻ', value: totalCards, unit: 'thẻ', accent: false },
              { label: 'Nắm vững', value: `${overallPct}%`, unit: '', accent: false },
            ].map(stat => (
              <div key={stat.label} style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 10, padding: '14px 18px' }}>
                <p style={{ fontSize: 10, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, margin: '0 0 5px' }}>{stat.label}</p>
                <p style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.04em', color: stat.accent ? T.srsAgain : T.ink }}>
                  {stat.value}<span style={{ fontSize: 12, fontWeight: 500, color: T.ink60, marginLeft: 3 }}>{stat.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Chapter + lesson tree */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {chapters.map((ch, ci) => {
              const expanded = expandedChapters[ci]
              const lessonIds = ch.lessons.map((_, li) => `${ci}-${li}`)
              const chDiagState: Record<string, number> = {}
              lessonIds.forEach((id, li) => {
                const m = lessonMastery(ci, li)
                if (m !== null) chDiagState[id] = m
              })
              const chCol = chapterColor(lessonIds, chDiagState)

              const lessonPcts = ch.lessons.map((_, li) => lessonMastery(ci, li) ?? 0)
              const chPct = lessonPcts.length > 0 ? Math.round(lessonPcts.reduce((a, b) => a + b, 0) / lessonPcts.length) : 0
              const chDue = lessonIds.filter(id => progressMap[id]?.isDue).length

              return (
                <div key={ci}>
                  {/* Chapter node */}
                  <button
                    onClick={() => toggleChapter(ci)}
                    style={{ width: '100%', textAlign: 'left', background: chCol.bg, border: `1.5px solid ${chCol.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,0.07)')}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: chCol.dot, flexShrink: 0, boxShadow: `0 0 0 3px ${chCol.border}` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="sy-mono" style={{ fontSize: 10, color: chCol.text, opacity: 0.7 }}>Chương {String(ci + 1).padStart(2, '0')}</span>
                        {chDue > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: T.ink, color: T.bgSolid, padding: '1px 7px', borderRadius: 10 }}>{chDue} cần ôn</span>}
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 700, margin: '2px 0 0', color: chCol.text, letterSpacing: '-0.01em' }}>{ch.title}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <SynapsyRing pct={chPct} size={28} strokeWidth={3} color={chCol.dot} />
                      <span className="sy-mono" style={{ fontSize: 12, color: chCol.text, fontWeight: 600, minWidth: 36 }}>{chPct}%</span>
                      <span style={{ fontSize: 14, color: chCol.text, opacity: 0.6, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>›</span>
                    </div>
                  </button>

                  {/* Lesson nodes */}
                  {expanded && (
                    <div style={{ marginTop: 4, marginLeft: 28, display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -16, top: 4, bottom: 4, width: 1.5, background: chCol.border, borderRadius: 1 }} />

                      {ch.lessons.map((lesson, li) => {
                        const m = lessonMastery(ci, li)
                        const lCol = nodeColor(m)
                        const lDue = progressMap[`${ci}-${li}`]?.isDue ? 1 : 0
                        const lCards = content?.chapters[ci]?.lessons.length ?? 0

                        return (
                          <div key={li} style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: -16, top: '50%', width: 16, height: 1.5, background: chCol.border }} />
                            <button
                              onClick={() => onLessonClick(ci, li)}
                              style={{ width: '100%', textAlign: 'left', background: lCol.bg, border: `1px solid ${lCol.border}`, borderRadius: 9, padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                            >
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: lCol.dot, flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: lCol.text, letterSpacing: '-0.005em' }}>{lesson.title}</p>
                                <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center' }}>
                                  <span style={{ fontSize: 10, color: lCol.dot, fontWeight: 600, background: lCol.border + '60', padding: '1px 7px', borderRadius: 10 }}>{lCol.label}</span>
                                  {lDue > 0 && <span className="sy-mono" style={{ fontSize: 10, color: T.srsAgain, fontWeight: 700 }}>{lDue} cần ôn</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <SynapsyRing pct={m ?? 0} size={22} strokeWidth={2.5} color={lCol.dot} />
                                <span className="sy-mono" style={{ fontSize: 11, color: lCol.text, fontWeight: 600, minWidth: 30 }}>{m ?? 0}%</span>
                                <span style={{ fontSize: 12, color: lCol.text, opacity: 0.5 }}>›</span>
                              </div>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: legend */}
        <div style={{ width: 220, flexShrink: 0, borderLeft: `1px solid ${T.ink10}`, background: T.bgSolid, padding: '24px 18px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Chú giải</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {([
              { dot: '#1a7a4a', bg: '#f0faf5', border: '#b7e6cc', label: 'Nắm vững', sub: '≥ 80%' },
              { dot: '#c47a2a', bg: '#fffbf0', border: '#f5d78a', label: 'Cần ôn',   sub: '40–79%' },
              { dot: '#dc3545', bg: '#fff5f5', border: '#fecdcd', label: 'Yếu',       sub: '< 40%' },
              { dot: '#8a909e', bg: '#f5f6f8', border: '#c4c8d0', label: 'Chưa test', sub: 'Không có dữ liệu' },
            ] as const).map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: item.bg, border: `1px solid ${item.border}`, borderRadius: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: item.dot }}>{item.label}</p>
                  <p className="sy-mono" style={{ fontSize: 10, margin: 0, color: item.dot, opacity: 0.7 }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 10, fontWeight: 700, color: T.ink40, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Kiểm tra đầu vào</p>
          <div style={{ background: T.bgSunken, borderRadius: 8, padding: '10px 12px', fontSize: 12, color: T.ink60, lineHeight: 1.55 }}>
            Màu sắc phản ánh kết quả bài test. Học theo thứ tự ưu tiên từ đỏ → vàng → xanh.
          </div>
        </div>
      </div>
    </div>
  )
}
