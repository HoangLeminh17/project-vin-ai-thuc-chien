'use client'
 
import { useEffect } from 'react'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])
 
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--sy-bg)', color: 'var(--sy-ink)' }}>
      <h2 className="sy-serif text-2xl mb-4">Đã có lỗi xảy ra</h2>
      <p className="mb-6 opacity-60 max-w-md">{error.message || 'Một lỗi không xác định đã xảy ra trên trình duyệt.'}</p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 rounded-lg text-white font-medium"
        style={{ background: 'var(--sy-warm)' }}
      >
        Thử lại
      </button>
    </div>
  )
}
