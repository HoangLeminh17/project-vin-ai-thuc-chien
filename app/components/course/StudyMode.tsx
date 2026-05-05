'use client'

import { useState, useEffect, useCallback } from 'react'
import { T } from '@/app/components/synapsy'
import { FlatCard, RATING_META, submitRating } from './types'

interface Props {
  cards: FlatCard[]
  onExit: () => void
}

export function StudyMode({ cards, onExit }: Props) {
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [slideDir, setSlideDir] = useState<'out' | 'in' | null>(null)

  const card = cards[idx]
  const total = cards.length

  const advance = useCallback((ratingIndex: number) => {
    if (!card) return
    submitRating(card, ratingIndex)
    const { label, interval } = RATING_META[ratingIndex]
    setToast(`${label} · ${interval}`)
    setSlideDir('out')
    const nextIdx = idx + 1
    setTimeout(() => {
      setToast(null)
      setRevealed(false)
      if (nextIdx >= total) {
        onExit()
        return
      }
      setSlideDir('in')
      setIdx(nextIdx)
      setTimeout(() => setSlideDir(null), 200)
    }, 280)
  }, [card, idx, total, onExit])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setRevealed(r => !r) }
      if (revealed) {
        if (e.key === '1') advance(0)
        if (e.key === '2') advance(1)
        if (e.key === '3') advance(2)
        if (e.key === '4') advance(3)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [revealed, advance])

  if (total === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: T.ink40, fontFamily: T.fontSans }}>
      <span style={{ fontSize: 32 }}>📭</span>
      <p style={{ fontSize: 14, margin: 0 }}>Chưa có thẻ nào trong bài này</p>
      <button onClick={onExit} style={{ fontSize: 13, color: T.accent, background: 'none', border: 'none', cursor: 'pointer' }}>← Quay lại</button>
    </div>
  )

  const pct = ((idx + 1) / total) * 100
  const slideTransform = slideDir === 'out' ? 'translateX(-36px)' : slideDir === 'in' ? 'translateX(36px)' : 'translateX(0)'
  const slideOpacity = slideDir ? 0 : 1

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, position: 'relative', fontFamily: T.fontSans }}>

      {/* Progress bar */}
      <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid }}>
        <button onClick={onExit} style={{ fontSize: 12, color: T.ink60, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>← Thoát</button>
        <div style={{ flex: 1, height: 4, background: T.ink10, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: T.ink, borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
        <span className="sy-mono" style={{ fontSize: 11, color: T.ink60, fontWeight: 500 }}>{idx + 1} / {total}</span>
      </div>

      {/* Card area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 24px', overflow: 'auto' }}>
        <div style={{
          maxWidth: 600, width: '100%',
          background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 16,
          padding: '36px 40px',
          transform: slideTransform, opacity: slideOpacity,
          transition: 'transform 0.2s ease, opacity 0.2s ease',
          position: 'relative',
        }}>
          {/* Toast */}
          {toast && (
            <div style={{ position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)', background: T.ink, color: T.bgSolid, padding: '8px 18px', borderRadius: 24, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }} className="sy-mono">
              {toast}
            </div>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, fontSize: 11 }}>
            <span className="sy-mono" style={{ color: T.ink40, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {card.chapterTitle} · {card.lessonTitle}
            </span>
            <span className="sy-mono" style={{ fontSize: 11, color: T.ink60, padding: '3px 9px', borderRadius: 6, background: T.bgSunken, border: `1px solid ${T.ink10}`, flexShrink: 0 }}>
              📄 {card.concept.source_chunk_id ?? card.id}
            </span>
          </div>

          {/* Question */}
          <h2 className="sy-serif" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.35, margin: '0 0 26px', letterSpacing: '-0.015em', color: T.ink }}>
            {card.concept.question}
          </h2>

          {!revealed ? (
            <>
              <div style={{ height: 90, borderRadius: 10, marginBottom: 20, background: T.bgSunken, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: T.ink40, fontFamily: T.fontMono }}>
                [ viết thử trước khi xem đáp án ]
              </div>
              <button onClick={() => setRevealed(true)} style={{ width: '100%', background: T.ink, color: T.bgSolid, padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, letterSpacing: '-0.01em', cursor: 'pointer', border: 'none' }}>
                Xem đáp án
                <span className="sy-mono" style={{ fontSize: 11, opacity: 0.5, fontWeight: 400 }}>Space</span>
              </button>
            </>
          ) : (
            <>
              {/* TL;DR */}
              <div style={{ padding: '16px 18px', background: T.accentSoft, borderRadius: 10, marginBottom: 14, borderLeft: `3px solid ${T.accent}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 5px' }}>TL;DR</p>
                <p className="sy-serif" style={{ fontSize: 16, fontWeight: 500, margin: 0, lineHeight: 1.45, color: T.ink }}>{card.concept.answer}</p>
              </div>

              {/* Detail */}
              {card.concept.detail && (
                <p className="sy-serif" style={{ fontSize: 14, lineHeight: 1.65, color: T.ink80, margin: '0 0 16px' }}>{card.concept.detail}</p>
              )}

              {/* Follow-ups */}
              {card.concept.followUps.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {card.concept.followUps.map((q, i) => (
                    <span key={i} style={{ padding: '4px 10px', fontSize: 11, color: T.ink60, background: T.bgSunken, borderRadius: 12 }}>{q}</span>
                  ))}
                </div>
              )}

              {/* SRS Ratings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {RATING_META.map((b, i) => (
                  <button key={b.label} onClick={() => advance(i)} style={{
                    padding: '11px 8px', borderRadius: 10,
                    border: `1.5px solid ${b.color}25`,
                    background: `${b.color}09`, color: b.color,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    cursor: 'pointer',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {b.label}
                      <span className="sy-mono" style={{ marginLeft: 5, fontSize: 9, opacity: 0.6 }}>{i + 1}</span>
                    </span>
                    <span className="sy-mono" style={{ fontSize: 10, opacity: 0.7 }}>{b.interval}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Keyboard hints */}
      <div style={{ padding: '10px 24px', borderTop: `1px solid ${T.ink10}`, background: T.bgSoft, fontSize: 11, color: T.ink40, display: 'flex', gap: 18, justifyContent: 'center' }}>
        {[['Space', 'xem đáp án'], ['1–4', 'đánh giá']].map(([k, v]) => (
          <span key={k}><kbd style={{ fontSize: 10, padding: '2px 5px', background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 3, fontFamily: T.fontMono }}>{k}</kbd> {v}</span>
        ))}
      </div>
    </div>
  )
}
