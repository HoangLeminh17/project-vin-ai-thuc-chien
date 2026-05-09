'use client'

import { useState, useMemo } from 'react'
import { SynapsyLogo, SynapsyRing, T } from '@/app/components/synapsy'
import { SavedCourse } from '@/core/models/saved-course'
import type { ProgressEntry } from '@/lib/types'
import { FlatCard } from './types'
import { StudyMode } from './StudyMode'
import { EditMode } from './EditMode'

// ── Color helpers ─────────────────────────────────────────────────────────────

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

// ── SRS state chip ────────────────────────────────────────────────────────────

type SrsState = 'due' | 'learning' | 'mature' | 'new'

function cardSrsState(cardId: string, progressMap: Record<string, ProgressEntry>): SrsState {
  const e = progressMap[cardId]
  if (!e) return 'new'
  if (e.isDue) return 'due'
  if (e.status === 'REVIEW') return 'mature'
  return 'learning'
}

const SRS_CHIP: Record<SrsState, { label: string; bg: string; color: string; border: string }> = {
  due:      { label: 'ÔN',     bg: '#fff1f1', color: '#c0392b', border: '#fecdcd' },
  learning: { label: 'HỌC',   bg: '#fffbf0', color: '#92580a', border: '#f5d78a' },
  new:      { label: 'MỚI',   bg: '#f0f4ff', color: '#2c4fb3', border: '#c7d4f8' },
  mature:   { label: 'ĐÃ NHỚ', bg: '#f0faf5', color: '#0f5132', border: '#b7e6cc' },
}

function MiniChip({ state }: { state: SrsState }) {
  const s = SRS_CHIP[state]
  return (
    <span style={{
      fontSize: 8, fontWeight: 800, letterSpacing: '0.06em',
      padding: '1px 6px', borderRadius: 10,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

// ── Flatten course content into FlatCard[] ────────────────────────────────────

function flattenCards(course: SavedCourse): FlatCard[] {
  const content = course.courseContent
  if (!content) return []
  const cards: FlatCard[] = []
  course.course.chapters.forEach((ch, ci) => {
    const chContent = content.chapters[ci]
    if (!chContent) return
    chContent.lessons.forEach((lesson, li) => {
      cards.push({
        id: `${ci}-${li}`,
        ci, chapterTitle: ch.title,
        li, lessonTitle: lesson.lesson_title,
        concept: lesson.concept,
      })
    })
  })
  return cards
}

// ── Empty detail state ────────────────────────────────────────────────────────

function EmptyDetail() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: T.ink40, fontFamily: T.fontSans }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="8" y="6" width="24" height="28" rx="3" stroke={T.ink20} strokeWidth="1.5" />
        <rect x="12" y="10" width="10" height="1.5" rx="0.75" fill={T.ink20} />
        <rect x="12" y="14" width="16" height="1.5" rx="0.75" fill={T.ink20} />
        <rect x="12" y="18" width="13" height="1.5" rx="0.75" fill={T.ink20} />
        <rect x="12" y="22" width="8"  height="1.5" rx="0.75" fill={T.ink20} />
      </svg>
      <p style={{ fontSize: 13, margin: 0, fontWeight: 500 }}>Chọn một thẻ để xem</p>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface Props {
  course: SavedCourse
  progressMap: Record<string, ProgressEntry>
  diagnosticState: Record<string, number>
  onExit: () => void
  pdfUrl?: string | null
  layoutStorageUrl?: string | null
}

// ── CourseTree ─────────────────────────────────────────────────────────────────

export function CourseTree({ course, progressMap, diagnosticState, onExit, pdfUrl, layoutStorageUrl }: Props) {
  const chapters = course.course.chapters
  const allCards = useMemo(() => flattenCards(course), [course])

  const [expandedChapters, setExpandedChapters] = useState<Record<number, boolean>>(
    () => chapters.reduce((acc: Record<number, boolean>, _, i) => ({ ...acc, [i]: true }), {})
  )
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({})
  const [activeCard, setActiveCard] = useState<FlatCard | null>(null)
  const [detailTab, setDetailTab] = useState<'edit' | 'study'>('edit')
  const [studyOverlay, setStudyOverlay] = useState(false)

  const toggleChapter = (i: number) =>
    setExpandedChapters(p => ({ ...p, [i]: !p[i] }))

  const toggleLesson = (key: string) =>
    setExpandedLessons(p => {
      const wasExpanded = p[key] !== false
      return { ...p, [key]: !wasExpanded }
    })

  const dueCards    = allCards.filter(c => progressMap[c.id]?.isDue)
  const totalDue    = dueCards.length
  const totalCards  = allCards.length
  const matureCards = allCards.filter(c => progressMap[c.id]?.status === 'REVIEW' && !progressMap[c.id]?.isDue).length
  const overallPct  = totalCards === 0 ? 0 : Math.round((matureCards / totalCards) * 100)

  function lessonMastery(ci: number, li: number): number | null {
    const key = `${ci}-${li}`
    const entry = progressMap[key]
    if (entry?.lastReviewedAt && new Date(entry.lastReviewedAt) >= new Date(course.createdAt)) {
      return entry.status === 'REVIEW' && !entry.isDue ? 100 : entry.isDue ? 10 : 30
    }
    if (diagnosticState[key] !== undefined) return diagnosticState[key]
    return null
  }

  // ── Study overlay (Ôn all due) ────────────────────────────────────────────

  if (studyOverlay) {
    const deck = dueCards.length > 0 ? dueCards : allCards
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: T.bg, fontFamily: T.fontSans }}>
        <div style={{ padding: '12px 22px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setStudyOverlay(false)} style={{ color: T.ink60, fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            ← Sơ đồ
          </button>
          <span style={{ color: T.ink20 }}>|</span>
          <SynapsyLogo size={16} />
          <div style={{ flex: 1 }}>
            <p className="sy-serif" style={{ fontSize: 14, fontWeight: 600, margin: 0, color: T.ink }}>Ôn tập hôm nay</p>
            <p className="sy-mono" style={{ fontSize: 10, color: T.ink40, margin: 0 }}>{deck.length} thẻ · {course.title}</p>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          <StudyMode cards={deck} onExit={() => setStudyOverlay(false)} />
        </div>
      </div>
    )
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden', fontFamily: T.fontSans, color: T.ink }}>

      {/* ── Header ── */}
      <div style={{ padding: '0 20px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'stretch', flexShrink: 0, height: 52 }}>

        <button
          onClick={onExit}
          style={{ color: T.ink60, fontSize: 13, background: 'none', border: 'none', borderRight: `1px solid ${T.ink10}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, paddingRight: 16, flexShrink: 0 }}
        >
          ← Thư viện
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, padding: '0 16px', minWidth: 0 }}>
          <SynapsyLogo size={16} />
          <p className="sy-serif" style={{ fontSize: 14, fontWeight: 700, margin: 0, letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {course.title}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', borderLeft: `1px solid ${T.ink10}` }}>
          {([
            { v: totalDue,         label: 'cần ôn', red: totalDue > 0 },
            { v: totalCards,       label: 'thẻ',    red: false },
            { v: `${overallPct}%`, label: 'vững',   red: false },
          ] as const).map((s, i) => (
            <div key={i} style={{ padding: '0 14px', borderRight: `1px solid ${T.ink10}`, textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.04em', color: s.red ? T.srsAgain : T.ink, lineHeight: 1.1 }}>{s.v}</p>
              <p className="sy-mono" style={{ fontSize: 9, color: T.ink40, margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Ôn button */}
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 16 }}>
          <button
            onClick={() => totalDue > 0 && setStudyOverlay(true)}
            disabled={totalDue === 0}
            style={{
              background: totalDue > 0 ? T.ink : T.bgSunken,
              color: totalDue > 0 ? T.bgSolid : T.ink40,
              padding: '8px 18px', borderRadius: 8, border: 'none',
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: totalDue > 0 ? 'pointer' : 'default',
              opacity: totalDue > 0 ? 1 : 0.5,
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'opacity 0.15s', flexShrink: 0,
            }}
            onMouseEnter={e => { if (totalDue > 0) (e.currentTarget as HTMLButtonElement).style.opacity = '0.82' }}
            onMouseLeave={e => { if (totalDue > 0) (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          >
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
              <polygon points="0,0 10,6 0,12" fill="currentColor" />
            </svg>
            Ôn {totalDue > 0 ? `${totalDue} thẻ` : ''}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: tree nav */}
        <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Legend strip */}
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${T.ink10}`, display: 'flex', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            {([
              { dot: '#1a7a4a', label: '≥80%' },
              { dot: '#c47a2a', label: '40–79%' },
              { dot: '#dc3545', label: '<40%' },
              { dot: '#8a909e', label: 'Chưa test' },
            ] as const).map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: T.ink60 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.dot, flexShrink: 0 }} />
                {l.label}
              </span>
            ))}
          </div>

          {/* Tree */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40 }}>
            {chapters.map((ch, ci) => {
              const lessonIds    = ch.lessons.map((_, li) => `${ci}-${li}`)
              const testedPcts   = lessonIds.map((_, li) => lessonMastery(ci, li)).filter((p): p is number => p !== null)
              const chAvg        = testedPcts.length > 0 ? Math.round(testedPcts.reduce((a, b) => a + b, 0) / testedPcts.length) : null
              const chCol        = nodeColor(chAvg)
              const chDue        = lessonIds.filter(id => progressMap[id]?.isDue).length
              const chExpanded   = expandedChapters[ci]

              return (
                <div key={ci}>

                  {/* Chapter row */}
                  <button
                    onClick={() => toggleChapter(ci)}
                    style={{ width: '100%', textAlign: 'left', padding: '9px 20px 9px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: `1px solid ${T.ink10}`, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.bgSunken)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ width: 3, height: 28, borderRadius: 2, background: chCol.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                        <span className="sy-mono" style={{ fontSize: 9, color: T.ink40, letterSpacing: '0.08em', fontWeight: 600 }}>
                          CH.{String(ci + 1).padStart(2, '0')}
                        </span>
                        {chDue > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 800, background: '#fff1f1', color: '#c0392b', border: '1px solid #fecdcd', padding: '0 5px', borderRadius: 8 }}>
                            {chDue} ôn
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0, color: T.ink, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ch.title}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <SynapsyRing pct={chAvg ?? 0} size={20} strokeWidth={2.5} color={chCol.dot} />
                      <span style={{ fontSize: 10, color: T.ink40, transform: chExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s', display: 'inline-block' }}>›</span>
                    </div>
                  </button>

                  {/* Lessons */}
                  {chExpanded && ch.lessons.map((lesson, li) => {
                    const lessonKey  = `${ci}-${li}`
                    const m          = lessonMastery(ci, li)
                    const lCol       = nodeColor(m)
                    const lCards     = allCards.filter(c => c.ci === ci && c.li === li)
                    const lDue       = lCards.filter(c => progressMap[c.id]?.isDue).length
                    const lExpanded  = expandedLessons[lessonKey] !== false

                    return (
                      <div key={li}>

                        {/* Lesson row */}
                        <button
                          onClick={() => toggleLesson(lessonKey)}
                          style={{ width: '100%', textAlign: 'left', padding: '7px 20px 7px 32px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: `1px solid ${T.ink10}`, transition: 'background 0.1s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = T.bgSunken)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: lCol.dot, flexShrink: 0, boxShadow: `0 0 0 2px ${lCol.border}` }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, margin: 0, color: T.ink80, letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lesson.title}
                            </p>
                            <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                              <span style={{ fontSize: 9, color: lCol.dot, fontWeight: 700 }}>{lCol.label}</span>
                              <span className="sy-mono" style={{ fontSize: 9, color: T.ink40 }}>{lCards.length} thẻ</span>
                              {lDue > 0 && <span className="sy-mono" style={{ fontSize: 9, color: '#dc3545', fontWeight: 700 }}>{lDue} ôn</span>}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, color: T.ink40, transform: lExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.18s', display: 'inline-block', flexShrink: 0 }}>›</span>
                        </button>

                        {/* Cards inline */}
                        {lExpanded && lCards.map((card, cardIdx) => {
                          const srsState = cardSrsState(card.id, progressMap)
                          const isActive = card.id === activeCard?.id
                          return (
                            <button
                              key={card.id}
                              onClick={() => { setActiveCard(card); setDetailTab('edit') }}
                              style={{
                                width: '100%', textAlign: 'left',
                                padding: '8px 20px 8px 46px',
                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                cursor: 'pointer',
                                background: isActive ? T.ink : 'transparent',
                                border: 'none',
                                borderBottom: `1px solid ${T.ink10}`,
                                borderLeft: isActive ? `3px solid ${T.ink}` : '3px solid transparent',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = T.bgSunken }}
                              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                            >
                              <span className="sy-mono" style={{ fontSize: 9, color: isActive ? 'rgba(255,255,255,0.5)' : T.ink40, marginTop: 2, flexShrink: 0, minWidth: 14 }}>
                                {cardIdx + 1}
                              </span>
                              <p className="sy-serif" style={{
                                fontSize: 12, margin: 0, lineHeight: 1.4,
                                color: isActive ? '#fff' : T.ink80,
                                fontWeight: isActive ? 600 : 400,
                                flex: 1, minWidth: 0,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                              }}>
                                {card.concept.question}
                              </p>
                              <MiniChip state={srsState} />
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: detail pane */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeCard ? (
            <EmptyDetail />
          ) : detailTab === 'study' ? (
            <StudyMode
              cards={allCards.filter(c => c.ci === activeCard.ci && c.li === activeCard.li)}
              onExit={() => setDetailTab('edit')}
            />
          ) : (
            <>
              {/* Tab bar */}
              <div style={{ padding: '10px 22px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 2, background: T.bgSunken, borderRadius: 8, padding: 3, flexShrink: 0 }}>
                  {(['edit', 'study'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      style={{
                        padding: '6px 16px', borderRadius: 6, fontSize: 12,
                        fontWeight: detailTab === tab ? 700 : 500,
                        color: detailTab === tab ? T.ink : T.ink60,
                        background: detailTab === tab ? T.bgSolid : 'transparent',
                        border: 'none', cursor: 'pointer',
                        boxShadow: detailTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      {tab === 'edit' ? 'Sửa' : 'Học'}
                    </button>
                  ))}
                </div>
                <span className="sy-mono" style={{ fontSize: 10, color: T.ink40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeCard.chapterTitle} › {activeCard.lessonTitle}
                </span>
              </div>

              {/* EditMode without card list */}
              <EditMode
                cards={allCards.filter(c => c.ci === activeCard.ci && c.li === activeCard.li)}
                controlledCardId={activeCard.id}
                hideList
                pdfUrl={pdfUrl}
                layoutStorageUrl={layoutStorageUrl}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
