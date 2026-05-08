'use client'

import { useEffect, useState } from 'react'

interface FlashFactGalleryProps {
  markdown: string
}

export function FlashFactGallery({ markdown }: FlashFactGalleryProps) {
  const [facts, setFacts] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!markdown) { setLoading(false); return }
    fetch('/api/extract-facts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFacts(data.facts)
        }
      })
      .finally(() => setLoading(false))
  }, [markdown])

  useEffect(() => {
    if (facts.length === 0) return
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % facts.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [facts])

  if (loading) return (
    <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100 animate-pulse">
      <div className="h-4 bg-blue-200 rounded w-1/4 mb-4"></div>
      <div className="h-3 bg-blue-100 rounded w-full mb-2"></div>
      <div className="h-3 bg-blue-100 rounded w-5/6"></div>
    </div>
  )

  if (facts.length === 0) return null

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45zM11 16h2v2h-2v-2zm0-7h2v5h-2V9z"/>
        </svg>
      </div>
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
          <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Flash Knowledge</h3>
        </div>
        
        <div className="min-h-[80px] flex items-center">
          <p className="text-xl font-medium text-blue-900 leading-relaxed transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
            &quot;{facts[currentIndex]}&quot;
          </p>
        </div>
        
        <div className="flex gap-1.5 pt-2">
          {facts.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-8 bg-blue-500' : 'w-2 bg-blue-200'}`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  )
}
