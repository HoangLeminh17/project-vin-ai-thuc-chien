'use client'

import { useState, useRef, useCallback, useEffect, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/contexts/auth-context'
import { SRSStatsWidget, Spinner, FlashFactGallery } from '@/app/components'
import { useCourses } from '@/lib/hooks/use-courses'

import { Course, Chapter, Lesson, CourseContent, ChapterContent, LessonContent, ConceptCard, QuizQuestion } from '@/core/models/learning-model'

// ── Sub-components ─────────────────────────────────────────────────────────────

// Component Spinner đã được chuyển ra tệp riêng


function ConceptCardView({ concept, index, total }: { concept: ConceptCard; index: number; total: number }) {
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      {/* Progress pips + label */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`inline-block h-1.5 w-4 rounded-full ${i === index ? 'bg-teal-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 font-mono">Concept {index + 1} / {total}</span>
      </div>

      {/* Question */}
      <p className="text-[17px] font-medium text-gray-900 leading-snug">{concept.question}</p>

      {/* Answer input */}
      <textarea
        disabled={revealed}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Thử trả lời trước khi reveal..."
        rows={3}
        className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors
          ${revealed
            ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
            : 'border-gray-300 bg-white text-gray-800 focus:border-teal-400'
          }`}
      />

      {!revealed && (
        <button
          onClick={() => setRevealed(true)}
          className="w-full py-2 rounded-lg bg-teal-500 text-white text-sm font-medium hover:bg-teal-600 transition-colors"
        >
          Reveal
        </button>
      )}

      {revealed && (
        <>
          <hr className="border-gray-100" />

          {/* TL;DR */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">TL;DR</p>
            <p className="text-sm text-gray-800 leading-relaxed">{concept.answer}</p>
          </div>

          {concept.detail && (
            <p className="text-sm text-gray-600 leading-relaxed">{concept.detail}</p>
          )}

          {/* Follow-ups */}
          {concept.followUps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Follow-up</p>
              <div className="flex flex-wrap gap-2">
                {concept.followUps.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => console.log('[follow-up]', q)}
                    className="px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Anki mock buttons */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {(['Again', 'Hard', 'Good', 'Easy'] as const).map((label, i) => {
              const sub = ['không nhớ', 'lờ mờ', 'nhớ rồi', 'quá dễ'][i]
              const colors = [
                'border-red-200 text-red-600 hover:bg-red-50',
                'border-orange-200 text-orange-600 hover:bg-orange-50',
                'border-green-200 text-green-700 hover:bg-green-50',
                'border-blue-200 text-blue-600 hover:bg-blue-50',
              ][i]
              return (
                <button
                  key={label}
                  onClick={async () => {
                    console.log('[anki]', label)
                    const cardId = `${concept.question.substring(0, 20)}-${index}` // Simple stable ID for demo
                    await fetch('/api/progress/review', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        cardId,
                        rating: i as 0 | 1 | 2 | 3,
                        question: concept.question,
                        answer: concept.answer
                      })
                    })
                    alert(`Đã thêm vào lộ trình ôn tập: ${label}`)
                  }}
                  className={`flex flex-col items-center py-2 rounded-lg border text-xs font-medium transition-colors ${colors}`}
                >
                  {label}
                  <span className="text-[10px] font-normal opacity-70 mt-0.5">{sub}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function QuizView({ quiz }: { quiz: ChapterContent['quiz'] }) {
  const [selected, setSelected] = useState<(number | null)[]>(() => quiz.questions.map(() => null))

  if (quiz.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64 text-gray-400">
        <p className="text-sm">Quiz không có câu hỏi (chapter generation failed)</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Quiz: {quiz.topic}</h2>
      {quiz.questions.map((q, qi) => {
        const answered = selected[qi] !== null
        return (
          <div key={qi} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <p className="font-medium text-gray-800 text-sm leading-relaxed">
              {qi + 1}. {q.question}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isSelected = selected[qi] === oi
                const isCorrect = oi === q.answer
                let cls = 'w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors '
                if (!answered) {
                  cls += 'border-gray-200 hover:bg-gray-50 cursor-pointer'
                } else if (isCorrect) {
                  cls += 'border-green-400 bg-green-50 text-green-800 font-medium'
                } else if (isSelected) {
                  cls += 'border-red-300 bg-red-50 text-red-700'
                } else {
                  cls += 'border-gray-100 text-gray-400'
                }
                return (
                  <button
                    key={oi}
                    disabled={answered}
                    onClick={() => setSelected(prev => prev.map((v, i) => i === qi ? oi : v))}
                    className={cls}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                )
              })}
            </div>
            {answered && (
              <p className={`text-xs p-3 rounded-lg leading-relaxed ${selected[qi] === q.answer ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {selected[qi] === q.answer ? 'Correct. ' : `Incorrect — answer is ${String.fromCharCode(65 + q.answer)}. `}
                {q.explanation}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'generating' | 'done'>('idle')
  const [course, setCourse] = useState<Course | null>(null)
  const [courseContentMap, setCourseContentMap] = useState<Record<number, ChapterContent>>({})
  const [stage2Loading, setStage2Loading] = useState<Record<number, boolean>>({})
  const [stage2Error, setStage2Error] = useState('')
  const [error, setError] = useState('')
  const [openChapter, setOpenChapter] = useState<number | null>(null)
  const [openLesson, setOpenLesson] = useState<{ ci: number; li: number } | null>(null)
  const [quizChapter, setQuizChapter] = useState<number | null>(null)
  const [currentHash, setCurrentHash] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [rawMarkdown, setRawMarkdown] = useState('')
  const [contentList, setContentList] = useState<unknown[] | null>(null)
  const [rawCourseJson, setRawCourseJson] = useState('')
  const [tokens, setTokens] = useState<{ promptTokens: number; completionTokens: number; totalTokens: number } | null>(null)
  const [debugOpen, setDebugOpen] = useState<'md' | 'json' | null>(null)
  const [savedCourseId, setSavedCourseId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { user, loading, login, logout } = useAuth()
  const { saveCourse } = useCourses(user?.uid ?? null)

  const reset = useCallback(() => {
    setFile(null)
    setStatus('idle')
    setCourse(null)
    setCourseContentMap({})
    setStage2Loading({})
    setStage2Error('')
    setError('')
    setOpenChapter(null)
    setOpenLesson(null)
    setQuizChapter(null)
    setRawMarkdown('')
    setContentList(null)
    setRawCourseJson('')
    setTokens(null)
    setDebugOpen(null)
    setSavedCourseId(null)
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
    setCourseContentMap({})

    // Step 1: Parse PDF
    setStatus('parsing')
    const form = new FormData()
    form.append('file', file)

    let parsedContentList: unknown[] | null = null
    let markdown = ''
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

    // Step 2 (Stage 1): Generate course outline
    setStatus('generating')
    let resolvedCourse: Course | null = null
    let hash = ''
    try {
      const body = { markdown }
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
      resolvedCourse = data.course
      hash = data.hash
      setCurrentHash(hash || '')
      setCourse(data.course)
      setOpenChapter(0)
      setRawCourseJson(JSON.stringify(data.course, null, 2))
      if (data.tokens) setTokens(data.tokens)
      setStatus('done')

      // If content is already in response (from cache) and complete, load it instantly
      if (resolvedCourse && data.courseContent && data.fromCache && data.courseContent.chapters.length === resolvedCourse.chapters.length) {
        const contentMap: Record<number, ChapterContent> = {}
        data.courseContent.chapters.forEach((ch: ChapterContent, i: number) => {
          contentMap[i] = ch
        })
        setCourseContentMap(contentMap)
        if (!openLesson) setOpenLesson({ ci: 0, li: 0 })

        // Save to user courses in background
        if (user && resolvedCourse) {
          saveCourse(resolvedCourse.title, resolvedCourse, data.courseContent).then(saved => {
            if (saved) setSavedCourseId(saved.id)
          })
        }
        return 
      }

      // Step 3 (Stage 2): Generate chapters
      if (!resolvedCourse) return

      const fromCache = data.fromCache
      const chapters = resolvedCourse.chapters.map((_, i) => i)

      const fetchChapter = async (i: number): Promise<ChapterContent | null> => {
        setStage2Loading(prev => ({ ...prev, [i]: true }))
        try {
          const res = await fetch('/api/generate-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ course: resolvedCourse, chapterIndex: i, hash: hash || currentHash }),
          })
          if (res.ok) {
            const d = await res.json()
            if (d.success) {
              setCourseContentMap(prev => ({ ...prev, [i]: d.chapter }))
              if (i === 0 && !openLesson) {
                setOpenLesson({ ci: 0, li: 0 })
              }
              return d.chapter
            }
          }
        } catch (e) {
          console.error(`Fetch chapter ${i} failed`, e)
        } finally {
          setStage2Loading(prev => ({ ...prev, [i]: false }))
        }
        return null
      }

      let allChapterContents: (ChapterContent | null)[] = []
      if (fromCache) {
        allChapterContents = await Promise.all(chapters.map(i => fetchChapter(i)))
      } else {
        for (const i of chapters) {
          const ch = await fetchChapter(i)
          allChapterContents.push(ch)
        }
      }

      // Step 4: Save course to DB
      if (user && resolvedCourse) {
        const content: CourseContent = { 
          chapters: allChapterContents.filter(Boolean) as ChapterContent[] 
        }
        const saved = await saveCourse(resolvedCourse.title, resolvedCourse, content)
        if (saved) setSavedCourseId(saved.id)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setStatus('idle')
      return
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
              {rawMarkdown ? `${rawMarkdown.length.toLocaleString()} chars` : 'pending...'}
            </span>
          </button>
          {debugOpen === 'md' && (
            <pre className="px-4 py-3 bg-yellow-50/50 text-xs text-gray-700 overflow-auto max-h-96 whitespace-pre-wrap border-t border-yellow-200">
              {rawMarkdown || '(empty)'}
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
            <span className="font-mono text-sm font-semibold text-green-800">AI Token Usage (Stage 1)</span>
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

  // ── idle ──────────────────────────────────────────────────────────────────────
  if (status === 'idle') {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="w-full max-w-lg mx-auto space-y-6 pt-20">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">PDF Course Builder</h1>
            {user ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => router.push('/dashboard')} 
                  className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-full transition-colors font-medium border border-blue-100"
                >
                  My Courses
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Online</span>
                  {user.photoURL && <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border shadow-sm" />}
                </div>
              </div>
            ) : (
              <button 
                onClick={login} 
                className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all"
              >
                Đăng nhập
              </button>
            )}
          </div>

          {user && <SRSStatsWidget />}

          <div
            onClick={() => user ? inputRef.current?.click() : login()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
              }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              disabled={!user}
            />
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M4 20h16" />
              </svg>
            </div>
            {!user ? (
              <p className="text-gray-500">Bạn cần đăng nhập để sử dụng tính năng này</p>
            ) : file ? (
              <p className="text-gray-700 font-medium">{file.name}</p>
            ) : (
              <p className="text-gray-500">Kéo thả file PDF vào đây hoặc click để chọn</p>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={user ? handleStart : login}
            disabled={!!(user && !file)}
            className={`w-full py-3 text-white font-medium rounded-lg transition-colors ${!user ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-40'
              }`}
          >
            {!user ? 'Đăng nhập để bắt đầu' : 'Tạo course'}
          </button>
        </div>

        {hasDebugData && <div className="max-w-4xl mx-auto">{debugPanel}</div>}
      </main>
    )
  }

  // ── loading ───────────────────────────────────────────────────────────────────
  if (status === 'parsing' || status === 'generating') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-12">
          <div className="flex flex-col items-center justify-center gap-6">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
              <Spinner />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-semibold text-gray-900">
                {status === 'parsing' ? 'Đang đọc và phân tích tài liệu PDF...' : 'Đang thiết kế lộ trình khóa học...'}
              </p>
              <p className="text-sm text-gray-400">Quá trình này có thể mất tới 1 phút, vui lòng đợi nhé.</p>
            </div>
          </div>

          <FlashFactGallery markdown={rawMarkdown} />
        </div>
      </main>
    )
  }

  // ── done: sidebar + right panel ───────────────────────────────────────────────
  const selectedLesson = openLesson ? course?.chapters[openLesson.ci]?.lessons[openLesson.li] : null
  const lessonContent = openLesson
    ? courseContentMap[openLesson.ci]?.lessons[openLesson.li]
    : null
  const chapterLessonCount = openLesson ? (course?.chapters[openLesson.ci]?.lessons.length ?? 1) : 1
  const quizContent = quizChapter !== null
    ? courseContentMap[quizChapter]?.quiz
    : null
  const isLessonView = openLesson !== null && quizChapter === null

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Top bar */}
      <div className="shrink-0 bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">{course?.title || 'Course Structure'}</h1>
          {Object.values(stage2Loading).some(Boolean) && (
            <span className="flex items-center gap-1.5 text-xs text-blue-500 shrink-0">
              <Spinner />
              Đang soạn thảo nội dung...
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user.displayName || user.email}</p>
                <button
                  onClick={logout}
                  className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="h-8 w-8 rounded-full border border-gray-200"
                />
              )}
            </div>
          ) : (
            <button
              onClick={login}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Đăng nhập
            </button>
          )}

          <button
            onClick={() => router.push('/dashboard')}
            className="shrink-0 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            My Courses
          </button>
          {savedCourseId && (
            <button
              onClick={() => router.push(`/course/${savedCourseId}`)}
              className="shrink-0 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              View saved ↗
            </button>
          )}
          <button
            onClick={reset}
            className="shrink-0 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Upload file khác
          </button>
        </div>
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
                    <div className="flex items-center min-w-0 pr-2">
                      <span className="text-blue-500 mr-2 shrink-0 font-mono text-xs">{ci + 1}.</span>
                      <span className={`text-sm font-semibold truncate ${courseContentMap[ci] ? 'text-gray-700' : 'text-gray-400'}`}>
                        {ch.title}
                      </span>
                      {stage2Loading[ci] && <div className="ml-2 mt-0.5"><Spinner /></div>}
                    </div>
                    <svg
                      className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${openChapter === ci ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {openChapter === ci && (
                    <div>
                      {ch.lessons?.map((lesson, li) => {
                        const active = openLesson?.ci === ci && openLesson?.li === li
                        return (
                          <button
                            key={li}
                            onClick={() => { setOpenLesson({ ci, li }); setQuizChapter(null) }}
                            className={`w-full text-left px-5 py-2 text-sm transition-colors border-r-2 ${active
                              ? 'bg-blue-50 text-blue-700 border-blue-500'
                              : 'text-gray-600 hover:bg-gray-50 border-transparent'
                              }`}
                          >
                            {lesson.title}
                          </button>
                        )
                      })}
                      {/* Quiz entry */}
                      <button
                        onClick={() => { setQuizChapter(ci); setOpenLesson(null) }}
                        className={`w-full text-left px-5 py-2 text-sm font-medium transition-colors border-r-2 ${quizChapter === ci
                          ? 'bg-orange-50 text-orange-700 border-orange-400'
                          : 'text-gray-400 hover:bg-gray-50 border-transparent hover:text-gray-600'
                          }`}
                      >
                        Quiz
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          )}
        </aside>

        {/* Content panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">

            {/* Lesson view */}
            {isLessonView && selectedLesson && (
              <div className="px-8 py-6 space-y-5">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{course?.chapters[openLesson!.ci]?.title}</p>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedLesson.title}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedLesson.key_concept}</p>
                </div>

                {/* Concept card */}
                {stage2Loading[openLesson!.ci] ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                    <Spinner />
                    <span>Generating concept...</span>
                  </div>
                ) : lessonContent?.concept ? (
                  <ConceptCardView
                    key={`${openLesson!.ci}-${openLesson!.li}`}
                    concept={lessonContent.concept}
                    index={openLesson!.li}
                    total={chapterLessonCount}
                  />
                ) : null}

                <hr className="border-gray-100" />

                {/* Outline */}
                <ul className="space-y-2">
                  {selectedLesson.outline?.map((point, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                      <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quiz view */}
            {quizChapter !== null && (
              stage2Loading[quizChapter] ? (
                <div className="flex items-center justify-center min-h-64 gap-3 text-gray-500">
                  <Spinner />
                  <span className="text-sm">Generating quiz...</span>
                </div>
              ) : quizContent ? (
                <QuizView key={quizChapter} quiz={quizContent} />
              ) : (
                <div className="flex items-center justify-center min-h-64 text-gray-400">
                  <p className="text-sm">Quiz không có sẵn</p>
                </div>
              )
            )}

            {/* Empty state */}
            {openLesson === null && quizChapter === null && (
              <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
                <p className="text-sm">Chọn một bài học để xem nội dung</p>
              </div>
            )}

            {debugPanel}
          </div>

        </div>
      </div>
    </main>
  )
}
