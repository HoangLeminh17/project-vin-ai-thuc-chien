'use client'

import { useState, useEffect, useCallback, Fragment, useRef } from 'react'
import { T } from '@/app/components/synapsy'
import { FlatCard, RATING_META, submitRating } from './types'
import { parseCitations } from '@/lib/citations'
import { trackEvent } from '@/lib/metrics-client'

interface Props {
  cards: FlatCard[]
  initialCardId?: string
  onExit: () => void
  onCardChange?: (cardId: string) => void
  onRated?: () => void
}

type EvaluationLabel = 'correct' | 'partial' | 'incorrect'
type EvaluationState = 'idle' | 'loading' | 'done'
type EvaluationResult = { label: EvaluationLabel; score: number }

function getAnswerComplexity(answer: string) {
  const cleaned = answer.replace(/\[chunk-\d+-\d+\]/gi, ' ').replace(/\s+/g, ' ').trim()
  const wordCount = cleaned ? cleaned.split(' ').length : 0
  const shouldEvaluate = wordCount > 30 || cleaned.length > 100
  return { cleaned, shouldEvaluate }
}

export function StudyMode({ cards, initialCardId, onExit, onCardChange, onRated }: Props) {
  const [idx, setIdx] = useState(() => {
    if (!initialCardId) return 0
    const i = cards.findIndex(c => c.id === initialCardId)
    return i >= 0 ? i : 0
  })
  const [revealed, setRevealed] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [slideDir, setSlideDir] = useState<'out' | 'in' | null>(null)
  const [draftAnswer, setDraftAnswer] = useState('')
  const [evaluationState, setEvaluationState] = useState<EvaluationState>('idle')
  const [evaluationLabel, setEvaluationLabel] = useState<EvaluationLabel>('incorrect')
  const answerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const evaluationRequestId = useRef(0)
  const lastEvaluatedKey = useRef<string | null>(null)
  const evaluationCacheRef = useRef(new Map<string, EvaluationResult>())

  const card = cards[idx]
  const total = cards.length
  const answerComplexity = getAnswerComplexity(card.concept.answer)
  const hasDraftAnswer = draftAnswer.trim().length > 0
  const canSubmitForEvaluation = answerComplexity.shouldEvaluate && hasDraftAnswer

  const resetEvaluation = useCallback(() => {
    evaluationRequestId.current += 1
    lastEvaluatedKey.current = null
    setEvaluationState('idle')
    setEvaluationLabel('incorrect')
  }, [])

  const advance = useCallback((ratingIndex: number) => {
    if (!card) return
    submitRating(card, ratingIndex)
      .then(() => onRated?.())
      .catch(() => setToast('Không lưu được đánh giá'))
    const { label, interval } = RATING_META[ratingIndex]
    setToast(`${label} · ${interval}`)
    setSlideDir('out')
    const nextIdx = idx + 1
    setTimeout(() => {
      setToast(null)
      setRevealed(false)
      setDraftAnswer('')
      resetEvaluation()
      if (nextIdx >= total) {
        trackEvent('course_complete', { totalCards: total });
        onExit()
        return
      }
      setSlideDir('in')
      setIdx(nextIdx)
      setTimeout(() => setSlideDir(null), 200)
    }, 280)
  }, [card, idx, total, onExit, resetEvaluation])

  const evaluateAnswer = useCallback(async () => {
    const trimmedAnswer = draftAnswer.trim()
    const evaluationKey = `${card.id}::${trimmedAnswer}`

    if (lastEvaluatedKey.current === evaluationKey && evaluationState === 'done') {
      return
    }

    const cachedResult = evaluationCacheRef.current.get(evaluationKey)
    if (cachedResult) {
      lastEvaluatedKey.current = evaluationKey
      setEvaluationLabel(cachedResult.label)
      setEvaluationState('done')
      return
    }

    if (!trimmedAnswer) {
      const result: EvaluationResult = { label: 'incorrect', score: 0 }
      lastEvaluatedKey.current = evaluationKey
      evaluationCacheRef.current.set(evaluationKey, result)
      setEvaluationLabel(result.label)
      setEvaluationState('done')
      return
    }

    const requestId = ++evaluationRequestId.current
    setEvaluationState('loading')

    try {
      const response = await fetch('/api/answer-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: card.concept.question,
          canonicalAnswer: card.concept.answer,
          userAnswer: trimmedAnswer,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (requestId !== evaluationRequestId.current) return

      const label = payload?.label
      const score = typeof payload?.score === 'number' ? Math.max(0, Math.min(1, payload.score)) : null
      if (!response.ok || !payload?.success || (label !== 'correct' && label !== 'partial' && label !== 'incorrect') || score == null) {
        throw new Error(payload?.error || `HTTP ${response.status}`)
      }

      const result: EvaluationResult = { label, score }
      lastEvaluatedKey.current = evaluationKey
      evaluationCacheRef.current.set(evaluationKey, result)
      setEvaluationLabel(result.label)
      setEvaluationState('done')
    } catch {
      if (requestId !== evaluationRequestId.current) return
      const result: EvaluationResult = { label: 'partial', score: 0.5 }
      lastEvaluatedKey.current = evaluationKey
      evaluationCacheRef.current.set(evaluationKey, result)
      setEvaluationLabel(result.label)
      setEvaluationState('done')
    }
  }, [card.id, card.concept.answer, card.concept.question, draftAnswer, evaluationState])

  const revealAnswer = useCallback(() => {
    answerInputRef.current?.blur()
    setRevealed(true)
    if (canSubmitForEvaluation) {
      void evaluateAnswer()
    } else {
      resetEvaluation()
    }
  }, [canSubmitForEvaluation, evaluateAnswer, resetEvaluation])

  const showAnswerOnly = useCallback(() => {
    answerInputRef.current?.blur()
    setRevealed(true)
    resetEvaluation()
  }, [resetEvaluation])

  const hideAnswer = useCallback(() => {
    setRevealed(false)
  }, [])

  const lastInitialCardId = useRef(initialCardId)
  useEffect(() => {
    if (initialCardId && initialCardId !== lastInitialCardId.current) {
      lastInitialCardId.current = initialCardId
      const newIdx = cards.findIndex(c => c.id === initialCardId)
      if (newIdx >= 0 && newIdx !== idx) {
        setSlideDir(newIdx > idx ? 'in' : 'out')
        setTimeout(() => {
          setRevealed(false)
          setDraftAnswer('')
          resetEvaluation()
          setSlideDir(newIdx > idx ? 'out' : 'in')
          setIdx(newIdx)
          setTimeout(() => setSlideDir(null), 200)
        }, 150)
      }
    }
  }, [initialCardId, cards, idx, resetEvaluation])

  useEffect(() => {
    const currentCard = cards[idx]
    if (currentCard) onCardChange?.(currentCard.id)
  }, [idx, cards, onCardChange])

  useEffect(() => {
    if (!revealed) {
      lastEvaluatedKey.current = null
      setEvaluationState('idle')
    }
  }, [draftAnswer, revealed])

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA' ||
      (document.activeElement as HTMLElement)?.isContentEditable
    ) {
      return
    }

    if (e.key === ' ' && !e.shiftKey) {
      e.preventDefault()
      if (revealed) {
        hideAnswer()
      } else {
        showAnswerOnly()
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      revealAnswer()
    }

    if (revealed) {
      if (e.key === '1') advance(0)
      if (e.key === '2') advance(1)
      if (e.key === '3') advance(2)
      if (e.key === '4') advance(3)
    }
  }, [revealed, advance, hideAnswer, showAnswerOnly, revealAnswer])

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

  if (total === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: T.ink40, fontFamily: T.fontSans }}>
        <span style={{ fontSize: 32 }}>📭</span>
        <p style={{ fontSize: 14, margin: 0 }}>Chưa có thẻ nào trong bài này</p>
        <button onClick={onExit} style={{ fontSize: 13, color: T.accent, background: 'none', border: 'none', cursor: 'pointer' }}>← Quay lại</button>
      </div>
    )
  }

  const pct = ((idx + 1) / total) * 100
  const slideTransform = slideDir === 'out' ? 'translateX(-36px)' : slideDir === 'in' ? 'translateX(36px)' : 'translateX(0)'
  const slideOpacity = slideDir ? 0 : 1
  const chapterIndexLabel = card.ci + 1
  const lessonIndexLabel = `${card.ci + 1}.${card.li + 1}`
  const chapterTitle = card.chapterTitle.replace(/^\d+\s+/, '').trim()
  const primaryActionLabel = canSubmitForEvaluation ? 'Nộp & xem đáp án' : 'Xem đáp án'
  const evaluationMeta = !answerComplexity.shouldEvaluate || evaluationState === 'idle'
    ? null
    : evaluationState === 'loading'
      ? { label: 'Đang so đáp án...', tone: T.ink60, bg: T.bgSunken, border: T.ink10 }
      : evaluationLabel === 'correct'
        ? { label: 'Chính xác', tone: T.srsGood, bg: `${T.srsGood}14`, border: `${T.srsGood}33` }
      : evaluationLabel === 'partial'
          ? { label: 'Không chính xác hoàn toàn', tone: T.ink60, bg: T.bgSunken, border: `${T.ink10}` }
          : { label: 'Không chính xác', tone: T.ink60, bg: T.bgSoft, border: `${T.ink10}` }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, position: 'relative', fontFamily: T.fontSans }}>
      <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid }}>
        <button onClick={onExit} style={{ fontSize: 12, color: T.ink60, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>← Thoát</button>
        <div style={{ flex: 1, height: 4, background: T.ink10, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: T.ink, borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
        <span className="sy-mono" style={{ fontSize: 11, color: T.ink60, fontWeight: 500 }}>{idx + 1} / {total}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 24px', overflow: 'auto' }}>
        <div
          style={{
            maxWidth: 600,
            width: '100%',
            background: T.bgSolid,
            border: `1px solid ${T.ink10}`,
            borderRadius: 16,
            padding: '36px 40px',
            transform: slideTransform,
            opacity: slideOpacity,
            transition: 'transform 0.2s ease, opacity 0.2s ease',
            position: 'relative',
          }}
        >
          {toast && (
            <div style={{ position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)', background: T.ink, color: T.bgSolid, padding: '8px 18px', borderRadius: 24, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }} className="sy-mono">
              {toast}
            </div>
          )}

          <div style={{ marginBottom: 22, fontSize: 11 }}>
            <span className="sy-mono" style={{ color: T.ink40, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lessonIndexLabel} {chapterTitle || `Chương ${chapterIndexLabel}`} · {card.lessonTitle}
            </span>
          </div>

          <h2 className="sy-serif" style={{ fontSize: 24, fontWeight: 500, lineHeight: 1.35, margin: '0 0 26px', letterSpacing: '-0.015em', color: T.ink }}>
            {card.concept.question}
          </h2>

          {!revealed ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <textarea
                  ref={answerInputRef}
                  value={draftAnswer}
                  onChange={e => setDraftAnswer(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      e.currentTarget.blur()
                      return
                    }
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      revealAnswer()
                    }
                  }}
                  placeholder="Viết câu trả lời ngắn của bạn trước khi xem đáp án..."
                  style={{
                    width: '100%',
                    minHeight: 108,
                    resize: 'vertical',
                    borderRadius: 10,
                    border: `1px solid ${T.ink10}`,
                    background: T.bgSunken,
                    padding: '16px 18px',
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: T.ink,
                    outline: 'none',
                  }}
                />
                <div className="sy-mono" style={{ marginTop: 8, fontSize: 10, color: T.ink40, display: 'flex', justifyContent: 'flex-end' }}>
                  <span>{draftAnswer.trim().length} ký tự</span>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <button onClick={revealAnswer} style={{ width: '100%', background: T.ink, color: T.bgSolid, padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, letterSpacing: '-0.01em', cursor: 'pointer', border: 'none' }}>
                  {primaryActionLabel}
                  <span className="sy-mono" style={{ fontSize: 11, opacity: 0.5, fontWeight: 400 }}>Enter</span>
                </button>
                {canSubmitForEvaluation && (
                  <button
                    onClick={showAnswerOnly}
                    style={{
                      width: '100%',
                      background: T.bgSolid,
                      color: T.ink60,
                      padding: '11px 13px',
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      letterSpacing: '-0.01em',
                      cursor: 'pointer',
                      border: `1px solid ${T.ink10}`,
                    }}
                  >
                    Chỉ xem đáp án
                    <span className="sy-mono" style={{ fontSize: 11, opacity: 0.55, fontWeight: 400 }}>Space</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {evaluationMeta && (
                <div style={{ padding: '14px 16px', background: evaluationMeta.bg, borderRadius: 10, marginBottom: 14, border: `1px solid ${evaluationMeta.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: evaluationMeta.tone, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {evaluationMeta.label}
                    </span>
                  </div>
                </div>
              )}

              {draftAnswer.trim() && (
                <div style={{ padding: '16px 18px', background: T.bgSunken, borderRadius: 10, marginBottom: 14, border: `1px solid ${T.ink10}` }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.ink60, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 5px' }}>Câu trả lời của bạn</p>
                  <p style={{ fontSize: 15, margin: 0, lineHeight: 1.6, color: T.ink }}>
                    {draftAnswer}
                  </p>
                </div>
              )}

              <div style={{ padding: '16px 18px', background: T.accentSoft, borderRadius: 10, marginBottom: 14, borderLeft: `3px solid ${T.accent}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 5px' }}>Câu trả lời chính xác</p>
                <p className="sy-serif" style={{ fontSize: 16, fontWeight: 500, margin: 0, lineHeight: 1.45, color: T.ink }}>
                  <CitedText text={card.concept.answer} />
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {RATING_META.map((rating, i) => (
                  <button
                    key={rating.label}
                    onClick={() => advance(i)}
                    style={{
                      padding: '11px 8px',
                      borderRadius: 10,
                      border: `1.5px solid ${rating.color}25`,
                      background: `${rating.color}09`,
                      color: rating.color,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {rating.label}
                      <span className="sy-mono" style={{ marginLeft: 5, fontSize: 9, opacity: 0.6 }}>{i + 1}</span>
                    </span>
                    <span className="sy-mono" style={{ fontSize: 10, opacity: 0.7 }}>{rating.interval}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: '10px 24px', borderTop: `1px solid ${T.ink10}`, background: T.bgSoft, fontSize: 11, color: T.ink40, display: 'flex', gap: 18, justifyContent: 'center' }}>
        {[['← →', 'chuyển thẻ'], ['Enter', 'nút chính'], ['Esc', 'thoát ô nhập'], ['Space', 'xem nhanh đáp án'], ['1-4', 'đánh giá']].map(([keyLabel, valueLabel]) => (
          <span key={keyLabel}><kbd style={{ fontSize: 10, padding: '2px 5px', background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 3, fontFamily: T.fontMono }}>{keyLabel}</kbd> {valueLabel}</span>
        ))}
      </div>
    </div>
  )
}

function CitedText({ text }: { text: string }) {
  const segments = parseCitations(text, new Set())
  return (
    <>
      {segments.map((segment, i) =>
        segment.type === 'text'
          ? <Fragment key={i}>{segment.value}</Fragment>
          : <sup key={i} style={{ color: T.ink40, fontSize: 10, fontWeight: 700, marginLeft: 1 }}>[{segment.displayNum}]</sup>
      )}
    </>
  )
}
