'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { T } from '@/app/components/synapsy'
import { SavedCourse } from '@/core/models/saved-course'
import { DiagnosticQuestion } from '@/core/models/learning-model'
import { DiagnosticIntro, DiagnosticQuiz } from '@/app/components/diagnostic'
import { CourseTree } from './CourseTree'
import type { ProgressEntry } from '@/lib/types'

type View = 'init' | 'diagnostic-intro' | 'diagnostic-loading' | 'diagnostic-quiz' | 'diagnostic-error' | 'course-tree'

interface Props {
  course: SavedCourse
  progressMap: Record<string, ProgressEntry>
  onExit: () => void
  layoutStorageUrl?: string | null
}

function courseToMarkdown(course: SavedCourse): string {
  const lines: string[] = [`# ${course.title}`]
  const content = course.courseContent
  if (!content) return lines.join('\n')
  course.course.chapters.forEach((ch, ci) => {
    lines.push(`\n## ${ch.title}`)
    const chContent = content.chapters[ci]
    if (!chContent) return
    chContent.lessons.forEach((lesson, li) => {
      lines.push(`\n### [${ci}-${li}] ${lesson.lesson_title}`)
      const c = lesson.concept
      lines.push(`Q: ${c.question}`)
      lines.push(`A: ${c.answer}`)
      if (c.detail) lines.push(c.detail)
    })
  })
  return lines.join('\n')
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, background: T.bg, fontFamily: T.fontSans }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${T.ink10}`, borderTopColor: T.ink, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: T.ink60, margin: 0 }}>{label}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export function CourseFlow({ course, progressMap, onExit, layoutStorageUrl }: Props) {
  const [view, setView] = useState<View>('init')
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<DiagnosticQuestion[]>([])
  const [diagnosticState, setDiagnosticState] = useState<Record<string, number>>({})
  // Guard against React Strict Mode double-mount consuming the justGenerated flag twice
  const diagInitialized = useRef(false)

  useEffect(() => {
    if (diagInitialized.current) return
    diagInitialized.current = true

    if (localStorage.getItem(`justGenerated_${course.id}`) === 'true') {
      localStorage.removeItem(`justGenerated_${course.id}`)
      Promise.resolve().then(() => setView('diagnostic-intro'))
      return
    }
    const done = localStorage.getItem(`diagnosticDone_${course.id}`)
    if (done === 'true') {
      const saved = localStorage.getItem(`diagnosticResults_${course.id}`)
      if (saved) {
        try { 
          const parsed = JSON.parse(saved)
          Promise.resolve().then(() => setDiagnosticState(parsed))
        } catch { /* ignore */ }
      }
      Promise.resolve().then(() => setView('course-tree'))
    } else {
      Promise.resolve().then(() => setView('diagnostic-intro'))
    }
  }, [course.id])

  const handleDiagnosticStart = useCallback(async () => {
    const cached = localStorage.getItem(`diagnosticQuestions_${course.id}`)
    if (cached) {
      try {
        const questions = JSON.parse(cached)
        if (questions?.length) {
          localStorage.removeItem(`diagnosticQuestions_${course.id}`)
          setDiagnosticQuestions(questions)
          setView('diagnostic-quiz')
          return
        }
      } catch { /* ignore */ }
    }
    setView('diagnostic-loading')
    try {
      const res = await fetch('/api/diagnostic-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown: courseToMarkdown(course) }),
      })
      if (!res.ok) throw new Error('Quiz generation failed')
      const quiz = await res.json()
      setDiagnosticQuestions(quiz.questions ?? [])
      setView('diagnostic-quiz')
    } catch {
      setView('diagnostic-error')
    }
  }, [course])

  const handleDiagnosticComplete = useCallback((results: Record<string, number>) => {
    setDiagnosticState(results)
    localStorage.setItem(`diagnosticDone_${course.id}`, 'true')
    localStorage.setItem(`diagnosticResults_${course.id}`, JSON.stringify(results))
    setView('course-tree')
  }, [course.id])

  const handleSkipDiagnostic = useCallback(() => {
    localStorage.setItem(`diagnosticDone_${course.id}`, 'true')
    setView('course-tree')
  }, [course.id])

  if (view === 'init') return <LoadingOverlay label="Đang tải..." />

  if (view === 'diagnostic-intro') return (
    <DiagnosticIntro course={course} onStart={handleDiagnosticStart} onSkip={handleSkipDiagnostic} />
  )

  if (view === 'diagnostic-loading') return (
    <LoadingOverlay label="Đang tạo bài test trình độ..." />
  )

  if (view === 'diagnostic-error') return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: T.bg, fontFamily: T.fontSans, padding: 40, textAlign: 'center' }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: T.ink, margin: 0 }}>Không thể tạo bài test trình độ</p>
      <p style={{ fontSize: 13, color: T.ink60, margin: 0, maxWidth: 340, lineHeight: 1.55 }}>Có lỗi khi kết nối máy chủ. Bạn có thể thử lại hoặc bỏ qua để vào khóa học.</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={handleDiagnosticStart} style={{ background: T.ink, color: T.bgSolid, padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
          Thử lại
        </button>
        <button onClick={handleSkipDiagnostic} style={{ background: T.bgSolid, color: T.ink60, padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', border: `1px solid ${T.ink10}` }}>
          Bỏ qua →
        </button>
      </div>
    </div>
  )

  if (view === 'diagnostic-quiz') return (
    <DiagnosticQuiz course={course} questions={diagnosticQuestions} onComplete={handleDiagnosticComplete} />
  )

  return (
    <CourseTree
      course={course}
      progressMap={progressMap}
      diagnosticState={diagnosticState}
      onExit={onExit}
      layoutStorageUrl={layoutStorageUrl}
    />
  )
}
