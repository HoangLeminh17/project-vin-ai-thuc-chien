'use client'

import { useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Spinner } from '@/app/components'
import { RATING_META, type SRSRatingIndex } from '@/app/components/course/types'
import { T } from '@/app/components/synapsy'
import { useAuth } from '@/lib/contexts/auth-context'

interface DueCard {
  cardId: string
  question?: string
  answer?: string
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function CenterState({ children }: { children: ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: T.fontSans, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        {children}
      </div>
    </main>
  )
}

export default function ReviewPage() {
  const { user, loading: authLoading, login } = useAuth()
  const [cards, setCards] = useState<DueCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ label: string; interval: string; color: string } | null>(null)
  const [cardVisible, setCardVisible] = useState(true)

  const userId = authLoading ? null : user?.uid ?? null

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      setCards([])
      setCurrentIndex(0)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')
    setFinished(false)
    setRevealed(false)

    fetch('/api/progress/due', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.ok) throw new Error('Không thể tải thẻ ôn tập')
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setCards(data)
          setCurrentIndex(0)
        }
      })
      .catch(fetchError => {
        if (!isAbortError(fetchError)) setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải thẻ ôn tập')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [authLoading, userId])

  const handleReview = useCallback(async (rating: SRSRatingIndex) => {
    const card = cards[currentIndex]
    if (!card || submitting) return

    const meta = RATING_META[rating]
    setSubmitting(true)
    setError('')
    setToast({ label: meta.label, interval: meta.interval, color: meta.color })

    try {
      const res = await fetch('/api/progress/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'same-origin',
        body: JSON.stringify({ cardId: card.cardId, rating }),
      })
      if (!res.ok) throw new Error('Không lưu được đánh giá')

      // Fade out current card, then advance
      setCardVisible(false)
      await new Promise(r => setTimeout(r, 220))
      setToast(null)

      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
        setRevealed(false)
      } else {
        setFinished(true)
      }
      setCardVisible(true)
    } catch (reviewError) {
      setToast(null)
      setError(reviewError instanceof Error ? reviewError.message : 'Không lưu được đánh giá')
    } finally {
      setSubmitting(false)
    }
  }, [cards, currentIndex, submitting])

  // Keyboard shortcuts: space = reveal, 1-4 = rate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
      }
      if (revealed && !submitting) {
        if (e.key === '1') void handleReview(0)
        if (e.key === '2') void handleReview(1)
        if (e.key === '3') void handleReview(2)
        if (e.key === '4') void handleReview(3)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, submitting, handleReview])

  if (authLoading || loading) {
    return (
      <CenterState>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Spinner />
          <p style={{ margin: 0, fontSize: 13, color: T.ink60 }}>{authLoading ? 'Đang xác thực...' : 'Đang tải thẻ ôn tập...'}</p>
        </div>
      </CenterState>
    )
  }

  if (!user) {
    return (
      <CenterState>
        <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: 28 }}>
          <h1 className="sy-serif" style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Cần đăng nhập</h1>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: T.ink60, lineHeight: 1.6 }}>Đăng nhập để Synapsy tải đúng hàng đợi ôn tập của bạn.</p>
          <button onClick={() => void login()} style={{ background: T.ink, color: T.bgSolid, border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Đăng nhập
          </button>
        </div>
      </CenterState>
    )
  }

  if (finished) {
    return (
      <CenterState>
        <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: 30 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: T.accentSoft, color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 800 }}>✓</div>
          <h1 className="sy-serif" style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700 }}>Hoàn thành</h1>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: T.ink60, lineHeight: 1.6 }}>Bạn đã ôn xong các thẻ đến hạn hôm nay.</p>
          <Link href="/" style={{ display: 'block', background: T.ink, color: T.bgSolid, borderRadius: 10, padding: '12px 18px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Quay lại thư viện
          </Link>
        </div>
      </CenterState>
    )
  }

  if (cards.length === 0) {
    return (
      <CenterState>
        <div style={{ background: T.bgSolid, border: `1px solid ${T.ink10}`, borderRadius: 12, padding: 28 }}>
          <p className="sy-serif" style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700 }}>Hôm nay đã xong</p>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: T.ink60 }}>Không có thẻ nào cần ôn.</p>
          <Link href="/" style={{ color: T.accent, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Về trang chủ</Link>
        </div>
      </CenterState>
    )
  }

  const currentCard = cards[currentIndex]
  const pct = ((currentIndex + 1) / cards.length) * 100
  const remaining = cards.length - currentIndex - 1

  return (
    <main style={{ minHeight: '100vh', background: T.bg, color: T.ink, fontFamily: T.fontSans, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: `1px solid ${T.ink10}`, background: T.bgSolid, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/" style={{ color: T.ink60, fontSize: 13, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>← Thoát</Link>
        <div style={{ flex: 1, height: 4, background: T.ink10, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: T.ink, transition: 'width 0.25s ease' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span className="sy-mono" style={{ color: T.ink60, fontSize: 11 }}>{currentIndex + 1} / {cards.length}</span>
          {remaining > 0 && (
            <span className="sy-mono" style={{ fontSize: 10, color: T.ink40, background: T.bgSunken, padding: '2px 7px', borderRadius: 6 }}>
              còn {remaining}
            </span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section
          style={{
            width: '100%', maxWidth: 620,
            background: T.bgSolid, border: `1px solid ${T.ink10}`,
            borderRadius: 16, padding: '34px 38px',
            position: 'relative',
            opacity: cardVisible ? 1 : 0,
            transform: cardVisible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
          }}
        >
          {/* Toast overlay */}
          {toast && (
            <div style={{
              position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)',
              background: toast.color, color: '#fff',
              padding: '8px 18px', borderRadius: 24,
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}>
              {toast.label}
              <span style={{ opacity: 0.75, fontWeight: 400, fontSize: 12 }}>· {toast.interval}</span>
            </div>
          )}

          {/* Label row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <p className="sy-mono" style={{ margin: 0, color: T.ink40, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Ôn tập đến hạn
            </p>
            <span className="sy-mono" style={{ fontSize: 10, color: T.ink40 }}>
              Space · xem đáp án &nbsp;|&nbsp; 1–4 · đánh giá
            </span>
          </div>

          <h1 className="sy-serif" style={{ margin: '0 0 26px', fontSize: 25, lineHeight: 1.35, fontWeight: 600, letterSpacing: '-0.015em' }}>
            {currentCard.question || 'Thẻ này chưa có nội dung câu hỏi.'}
          </h1>

          {revealed ? (
            <>
              <div style={{ padding: '16px 18px', background: T.accentSoft, borderLeft: `3px solid ${T.accent}`, borderRadius: 10, marginBottom: 16 }}>
                <p style={{ margin: '0 0 6px', color: T.accent, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Câu trả lời</p>
                <p className="sy-serif" style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: T.ink }}>{currentCard.answer || 'Chưa có đáp án được lưu.'}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                {RATING_META.map((rating, index) => (
                  <button
                    key={rating.label}
                    onClick={() => void handleReview(index as SRSRatingIndex)}
                    disabled={submitting}
                    style={{
                      padding: '12px 8px', borderRadius: 10,
                      border: `1.5px solid ${rating.color}33`,
                      background: `${rating.color}0d`,
                      color: rating.color,
                      opacity: submitting ? 0.45 : 1,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'opacity 0.1s',
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800 }}>
                      {rating.label}
                      <span className="sy-mono" style={{ fontSize: 9, opacity: 0.5, marginLeft: 4, fontWeight: 400 }}>{index + 1}</span>
                    </span>
                    <span className="sy-mono" style={{ fontSize: 10, opacity: 0.7 }}>{rating.interval}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ height: 80, borderRadius: 10, marginBottom: 18, background: T.bgSunken, color: T.ink40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontFamily: T.fontMono }}>
                [ tự trả lời trước khi xem đáp án ]
              </div>
              <button
                onClick={() => setRevealed(true)}
                style={{ width: '100%', background: T.ink, color: T.bgSolid, border: 'none', borderRadius: 10, padding: 13, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                Xem đáp án
                <span className="sy-mono" style={{ fontSize: 11, opacity: 0.45, fontWeight: 400 }}>Space</span>
              </button>
            </>
          )}

          {error && (
            <p style={{ margin: '16px 0 0', color: T.srsAgain, fontSize: 13 }}>{error}</p>
          )}
        </section>
      </div>
    </main>
  )
}
