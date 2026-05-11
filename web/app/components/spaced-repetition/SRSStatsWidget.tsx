'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SRSStats {
  new: number
  learning: number
  due: number
}

export function SRSStatsWidget() {
  const [stats, setStats] = useState<SRSStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/progress/stats')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setStats(data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="animate-pulse bg-white rounded-xl border border-gray-100 p-4 h-32 flex items-center justify-center">
      <div className="h-4 bg-gray-100 rounded w-1/2"></div>
    </div>
  )

  if (!stats || (stats.new === 0 && stats.learning === 0 && stats.due === 0)) {
    return null
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Tiến độ ôn tập</h3>
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Spaced Repetition</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.due}</p>
          <p className="text-[10px] text-gray-500 uppercase">Cần ôn</p>
        </div>
        <div className="text-center border-x border-gray-100">
          <p className="text-2xl font-bold text-teal-600">{stats.learning}</p>
          <p className="text-[10px] text-gray-500 uppercase">Đang học</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-400">{stats.new}</p>
          <p className="text-[10px] text-gray-500 uppercase">Thẻ mới</p>
        </div>
      </div>

      <Link 
        href="/review" 
        className={`block w-full text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${
          stats.due > 0 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {stats.due > 0 ? 'Ôn tập ngay' : 'Hôm nay đã xong!'}
      </Link>
    </div>
  )
}
