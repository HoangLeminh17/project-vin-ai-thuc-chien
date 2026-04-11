'use client'

import { useState, useRef, useCallback, type DragEvent } from 'react'

type Lesson = { title: string; key_concept: string; source_text: string }
type Quiz = { topic: string }
type Chapter = { title: string; lessons: Lesson[]; quiz: Quiz }
type Course = { title: string; chapters: Chapter[] }

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
  const [rawMarkdown, setRawMarkdown] = useState('')
  const [contentList, setContentList] = useState<unknown[] | null>(null)
  const [rawCourseJson, setRawCourseJson] = useState('')
  const [tokens, setTokens] = useState<{ promptTokens: number; completionTokens: number; totalTokens: number } | null>(null)
  const [debugOpen, setDebugOpen] = useState<'md' | 'json' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setStatus('idle')
    setCourse(null)
    setError('')
    setOpenChapter(null)
    setOpenLesson(null)
    setRawMarkdown('')
    setContentList(null)
    setRawCourseJson('')
    setTokens(null)
    setDebugOpen(null)
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

    let parsedContentList: unknown[] | null = null
    let markdown: string = ''
    try {
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Parse failed')
        setStatus('idle')
        return
      }
      markdown = data.markdown ?? ''
      parsedContentList = data.contentList ?? null
      setRawMarkdown(markdown)
      setContentList(parsedContentList)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setStatus('idle')
      return
    }

    // Step 2: Generate course
    setStatus('generating')
    try {
      const body = parsedContentList ? { contentList: parsedContentList } : { contentList: [] }
      const res = await fetch('/api/generate-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || 'Generation failed')
        setStatus('idle')
        return
      }
      setCourse(data.course)
      setOpenChapter(0)
      setRawCourseJson(JSON.stringify(data.course, null, 2))
      if (data.tokens) setTokens(data.tokens)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setStatus('idle')
    }
  }

  const hasDebugData = rawMarkdown.length > 0 || rawCourseJson.length > 0 || contentList !== null

  function contentListStats(list: unknown[] | null): string {
    if (!list) return 'Using markdown'
    type Item = { type?: string }
    const items = list as Item[]
    const text = items.filter(i => i.type === 'text' || i.type === 'title').length
    const tables = items.filter(i => i.type === 'table').length
    const images = items.filter(i => i.type === 'image').length
    const discarded = items.filter(i => i.type === 'discarded').length
    return [
      text > 0 && `${text} text blocks`,
      tables > 0 && `${tables} tables`,
      images > 0 && `${images} image${images > 1 ? 's' : ''}`,
      discarded > 0 && `${discarded} discarded`,
    ].filter(Boolean).join(' · ') || '0 items'
  }

  // ── Debug panel ──
  const debugPanel = hasDebugData && (
    <div className="mt-10 px-8 pb-8">
      <h2 className="text-lg font-bold text-gray-500 mb-3">Debug Pipeline</h2>
      <div className="space-y-2">
        <div className="border border-yellow-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setDebugOpen(debugOpen === 'md' ? null : 'md')}
            className="w-full flex items-center justify-between px-4 py-3 bg-yellow-50 hover:bg-yellow-100 transition-colors text-left"
          >
            <span className="font-mono text-sm font-semibold text-yellow-800">
              Step 1: PDF &rarr; Structured JSON (MinerU)
            </span>
            <span className="text-yellow-600 text-xs">
              {contentList !== null ? contentListStats(contentList) : (rawMarkdown ? `${rawMarkdown.length.toLocaleString()} chars` : 'pending...')}
            </span>
          </button>
          {debugOpen === 'md' && (
            <pre className="px-4 py-3 bg-yellow-50/50 text-xs text-gray-700 overflow-auto max-h-96 whitespace-pre-wrap border-t border-yellow-200">
              {contentList !== null ? JSON.stringify(contentList, null, 2) : (rawMarkdown || '(empty)')}
            </pre>
          )}
        </div>

        <div className="border border-purple-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setDebugOpen(debugOpen === 'json' ? null : 'json')}
            className="w-full flex items-center justify-between px-4 py-3 bg-purple-50 hover:bg-purple-100 transition-colors text-left"
          >
            <span className="font-mono text-sm font-semibold text-purple-800">
              Step 2: Structured JSON &rarr; Course Outline (AI Planner)
            </span>
            <span className="text-purple-600 text-xs">
              {rawCourseJson ? `${rawCourseJson.length.toLocaleString()} chars` : 'pending...'}
            </span>
          </button>
          {debugOpen === 'json' && (
            <pre className="px-4 py-3 bg-purple-50/50 text-xs text-gray-700 overflow-auto max-h-96 whitespace-pre-wrap border-t border-purple-200">
              {rawCourseJson || '(empty)'}
            </pre>
          )}
        </div>

        {tokens && (
          <div className="border border-green-300 rounded-lg px-4 py-3 bg-green-50">
            <span className="font-mono text-sm font-semibold text-green-800">AI Token Usage</span>
            <div className="flex gap-6 mt-1 text-xs text-green-700 font-mono">
              <span>Prompt: {tokens.promptTokens.toLocaleString()}</span>
              <span>Completion: {tokens.completionTokens.toLocaleString()}</span>
              <span>Total: {tokens.totalTokens.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ── idle ──
  if (status === 'idle') {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="w-full max-w-lg mx-auto space-y-6 pt-20">
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

        {hasDebugData && <div className="max-w-4xl mx-auto">{debugPanel}</div>}
      </main>
    )
  }

  // ── loading: parsing / generating ──
  if (status === 'parsing' || status === 'generating') {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="flex flex-col items-center justify-center gap-4 pt-20">
          <Spinner />
          <p className="text-gray-600">
            {status === 'parsing' ? 'Đang phân tích tài liệu PDF...' : 'Đang tạo cấu trúc course...'}
          </p>
        </div>
      </main>
    )
  }

  // ── done: sidebar layout ──
  const selectedLesson = openLesson
    ? course?.chapters[openLesson.ci]?.lessons[openLesson.li]
    : null

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Top bar */}
      <div className="shrink-0 bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-gray-900 truncate">
          {course?.title || 'Course Structure'}
        </h1>
        <button
          onClick={reset}
          className="ml-4 shrink-0 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Upload file khác
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 bg-white border-r overflow-y-auto">
          {!course || course.chapters.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400">Không tạo được course.</p>
          ) : (
            <nav className="py-2">
              {course.chapters.map((ch, ci) => (
                <div key={ci}>
                  <button
                    onClick={() => setOpenChapter(openChapter === ci ? null : ci)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-700 leading-snug pr-2">
                      <span className="text-blue-500 mr-1">Ch {ci + 1}.</span>
                      {ch.title}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${openChapter === ci ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {openChapter === ci && (
                    <div>
                      {ch.lessons.map((lesson, li) => {
                        const active = openLesson?.ci === ci && openLesson?.li === li
                        return (
                          <button
                            key={li}
                            onClick={() => setOpenLesson({ ci, li })}
                            className={`w-full text-left px-5 py-2 text-sm transition-colors border-r-2 ${
                              active
                                ? 'bg-blue-50 text-blue-700 border-blue-500'
                                : 'text-gray-600 hover:bg-gray-50 border-transparent'
                            }`}
                          >
                            {lesson.title}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          )}
        </aside>

        {/* Content panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedLesson ? (
            <div className="p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">{selectedLesson.title}</h2>
              <p className="text-sm text-gray-500 mb-6">{selectedLesson.key_concept}</p>
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {selectedLesson.source_text}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-sm">Chọn một bài học để xem nội dung</p>
            </div>
          )}

          {debugPanel}
        </div>
      </div>
    </main>
  )
}
