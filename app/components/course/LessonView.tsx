'use client'

import { useState } from 'react'
import { T } from '@/app/components/synapsy'
import { SavedCourse } from '@/core/models/saved-course'
import { FlatCard } from './types'
import { StudyMode } from './StudyMode'
import { EditMode } from './EditMode'

type Tab = 'browse' | 'study' | 'edit'

export interface ProgressEntry { status: string; isDue: boolean }

interface Props {
  course: SavedCourse
  chapterIdx: number
  lessonIdx: number
  cards: FlatCard[]
  progressMap: Record<string, ProgressEntry>
  onBack: () => void
}

function BrowseTab({ cards, progressMap, onStudy }: { cards: FlatCard[]; progressMap: Record<string, ProgressEntry>; onStudy: () => void }) {
  if (cards.length === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: T.ink40, fontFamily: T.fontSans }}>
      <span style={{ fontSize: 28 }}>📭</span>
      <p style={{ fontSize: 13, margin: 0 }}>Bài học này chưa có thẻ nào</p>
    </div>
  )

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 60px' }}>
      <div style={{ maxWidth: 660, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button onClick={onStudy} style={{ background: T.ink, color: T.bgSolid, padding: '9px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', letterSpacing: '-0.01em' }}>
            Học ngay →
          </button>
        </div>

        {cards.map(card => {
          const entry = progressMap[card.id]
          const stateLabel = !entry ? 'Mới' : entry.status === 'REVIEW' && !entry.isDue ? 'Đã thuộc' : entry.isDue ? 'Cần ôn' : 'Đang học'
          const stateColor = !entry ? T.ink40 : entry.status === 'REVIEW' && !entry.isDue ? T.srsGood : entry.isDue ? T.srsAgain : T.srsHard

          return (
            <div key={card.id} style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                <p className="sy-serif" style={{ fontSize: 15, fontWeight: 500, margin: 0, lineHeight: 1.4, color: T.ink, flex: 1 }}>
                  {card.concept.question}
                </p>
                <span style={{ fontSize: 10, fontWeight: 700, color: stateColor, background: stateColor + '18', padding: '3px 9px', borderRadius: 10, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {stateLabel}
                </span>
              </div>
              <p className="sy-serif" style={{ fontSize: 13, color: T.ink60, margin: 0, lineHeight: 1.5 }}>
                {card.concept.answer}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LessonView({ course, chapterIdx, lessonIdx, cards, progressMap, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('browse')

  const chapter = course.course.chapters[chapterIdx]
  const lesson = chapter?.lessons[lessonIdx]
  const lessonTitle = lesson?.title ?? 'Bài học'
  const chapterTitle = chapter?.title ?? ''

  const dueCount = cards.filter(c => progressMap[c.id]?.isDue).length

  const tabs: { key: Tab; label: string }[] = [
    { key: 'browse', label: 'Thẻ' },
    { key: 'study',  label: 'Học' },
    { key: 'edit',   label: 'Sửa' },
  ]

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden', fontFamily: T.fontSans }}>

      {/* Header */}
      <div style={{ padding: '12px 24px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <button onClick={onBack} style={{ color: T.ink60, fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          ← Sơ đồ
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="sy-mono" style={{ fontSize: 10, color: T.ink40, margin: '0 0 1px' }}>{chapterTitle}</p>
          <p className="sy-serif" style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: T.ink }}>
            {lessonTitle}
          </p>
        </div>

        {dueCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: T.srsAgain, background: T.srsAgain + '18', padding: '4px 10px', borderRadius: 10, flexShrink: 0 }}>
            {dueCount} cần ôn
          </span>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 2, background: T.bgSunken, borderRadius: 8, padding: 3, flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? T.ink : T.ink60,
              background: tab === t.key ? T.bgSolid : 'transparent',
              border: 'none', cursor: 'pointer',
              boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'browse' && (
          <BrowseTab cards={cards} progressMap={progressMap} onStudy={() => setTab('study')} />
        )}
        {tab === 'study' && (
          <StudyMode cards={cards} onExit={() => setTab('browse')} />
        )}
        {tab === 'edit' && (
          <EditMode cards={cards} />
        )}
      </div>
    </div>
  )
}
