'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Spinner } from '@/app/components'
export default function ReviewPage() {
  const [cards, setCards] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [revealed, setRevealed] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    fetch('/api/progress/due')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCards(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleReview = async (rating: number) => {
    const card = cards[currentIndex]
    
    // Optimistic UI or just wait? Let's just wait for now
    await fetch('/api/progress/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId: card.cardId, rating })
    })

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setRevealed(false)
    } else {
      setFinished(true)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-2">
        <Spinner />
        <p className="text-sm text-gray-500">Đang tải thẻ ôn tập...</p>
      </div>
    </div>
  )

  if (finished) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center space-y-4 max-w-sm w-full shadow-xl">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
        <h2 className="text-xl font-bold text-gray-900">Hoàn thành!</h2>
        <p className="text-gray-500 text-sm">Bạn đã ôn tập xong các thẻ của ngày hôm nay. Hãy quay lại vào ngày mai nhé!</p>
        <Link href="/" className="block w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Quay lại Dashboard
        </Link>
      </div>
    </div>
  )

  if (cards.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center space-y-4">
        <p className="text-gray-400">Không có thẻ nào cần ôn hôm nay.</p>
        <Link href="/" className="text-blue-600 hover:underline">Về trang chủ</Link>
      </div>
    </div>
  )

  const currentCard = cards[currentIndex]

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            ← Thoát
          </Link>
          <span className="text-xs font-mono text-gray-400">
            Thẻ {currentIndex + 1} / {cards.length}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm min-h-[300px] flex flex-col justify-between">
          <div className="space-y-6">
            <p className="text-xl font-medium text-gray-900 leading-snug">
              {/* Note: I might need to fetch the actual card content here if only IDs are returned by due route */}
              {/* For now assuming the due route returns card metadata or I should modify GetDueCards to include content */}
              {currentCard.question || "Đang tải câu hỏi..."}
            </p>

            {revealed && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <hr className="my-6 border-gray-100" />
                <p className="text-gray-800 leading-relaxed">
                  {currentCard.answer}
                </p>
              </div>
            )}
          </div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all mt-8"
            >
              Reveal Answer
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2 pt-8">
              {[
                { label: 'Again', sub: 'Quên', rating: 0, color: 'text-red-600 border-red-100 hover:bg-red-50' },
                { label: 'Hard', sub: 'Khó', rating: 1, color: 'text-orange-600 border-orange-100 hover:bg-orange-50' },
                { label: 'Good', sub: 'Được', rating: 2, color: 'text-green-700 border-green-100 hover:bg-green-50' },
                { label: 'Easy', sub: 'Dễ', rating: 3, color: 'text-blue-600 border-blue-100 hover:bg-blue-50' },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={() => handleReview(b.rating as 0|1|2|3)}
                  className={`flex flex-col items-center py-3 rounded-xl border text-sm font-bold transition-all hover:scale-105 ${b.color}`}
                >
                  {b.label}
                  <span className="text-[10px] font-normal opacity-70 mt-1">{b.sub}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
