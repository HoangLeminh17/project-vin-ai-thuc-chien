'use client'

import { useState, useRef, useCallback, type DragEvent } from 'react'

type Lesson = { title: string; key_concept: string; source_text: string }
type Chapter = { chapter: string; lessons: Lesson[] }
type Course = { chapters: Chapter[] }

function Spinner() {
  return (
    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'generating' | 'done'>('idle')
  const [course, setCourse] = useState<Course | null>(null)
  const [error, setError] = useState('')
  const [openChapter, setOpenChapter] = useState<number | null>(null)
  const [openLesson, setOpenLesson] = useState<{ ci: number; li: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setStatus('idle')
    setCourse(null)
    setError('')
    setOpenChapter(null)
    setOpenLesson(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  function handleFile(f: File | null) {
    if (f && f.type === 'application/pdf') {
      setFile(f)
      setError('')
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0] ?? null)
  }

  async function handleStart() {
    if (!file) return
    setError('')
    setCourse(null)

    // Step 1: Parse PDF
    setStatus('parsing')
    const form = new FormData()
    form.append('file', file)

    let markdown: string
    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Parse failed')
        setStatus('idle')
        return
      }
      markdown = data.markdown
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setStatus('idle')
      return
    }

    // Step 2: Generate course
    setStatus('generating')
    try {
      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Generation failed')
        setStatus('idle')
        return
      }
      setCourse(data.course)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setStatus('idle')
    }
  }

  // ── idle ──
  if (status === 'idle') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center">PDF Course Builder</h1>

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16" />
              </svg>
            </div>
            {file ? (
              <p className="text-gray-700 font-medium">{file.name}</p>
            ) : (
              <p className="text-gray-500">Kéo thả file PDF vào đây hoặc click để chọn</p>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={handleStart}
            disabled={!file}
            className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            Tạo course
          </button>
        </div>
      </main>
    )
  }

  // ── loading (parsing / generating) ──
  if (status === 'parsing' || status === 'generating') {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <Spinner />
        <p className="text-gray-600">
          {status === 'parsing' ? 'Đang phân tích tài liệu PDF...' : 'Đang tạo cấu trúc course...'}
        </p>
      </main>
    )
  }

  // ── done ──
  const selectedLesson = openLesson
    ? course?.chapters[openLesson.ci]?.lessons[openLesson.li]
    : null

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Course Structure</h1>
          <button
            onClick={reset}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Upload file khác
          </button>
        </div>

        {!course || course.chapters.length === 0 ? (
          <p className="text-gray-500">Không tạo được course từ tài liệu này.</p>
        ) : (
          <div className="space-y-3">
            {course.chapters.map((ch, ci) => (
              <div key={ci} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenChapter(openChapter === ci ? null : ci)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">
                    <span className="text-blue-600 mr-2">Ch {ci + 1}.</span>
                    {ch.chapter}
                  </span>
                  <span className="text-gray-400 text-sm flex items-center gap-2">
                    {ch.lessons.length} lessons
                    <svg
                      className={`h-4 w-4 transition-transform ${openChapter === ci ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {openChapter === ci && (
                  <div className="border-t border-gray-100">
                    {ch.lessons.map((lesson, li) => (
                      <button
                        key={li}
                        onClick={() => setOpenLesson({ ci, li })}
                        className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-gray-800">{lesson.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{lesson.key_concept}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lesson modal */}
      {selectedLesson && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setOpenLesson(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">{selectedLesson.title}</h2>
                <button
                  onClick={() => setOpenLesson(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4"
                >
                  &times;
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">{selectedLesson.key_concept}</p>
            </div>
            <div className="px-6 py-4 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {selectedLesson.source_text}
              </pre>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
