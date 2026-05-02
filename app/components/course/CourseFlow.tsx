'use client'

import { useState, useEffect, useCallback } from 'react'
import { T } from '@/app/components/synapsy'
import { SavedCourse } from '@/core/models/saved-course'
import { DiagnosticQuestion } from '@/core/models/learning-model'
import { DiagnosticIntro, DiagnosticQuiz } from '@/app/components/diagnostic'
import { CourseTree } from './CourseTree'
import { LessonView } from './LessonView'
import { FlatCard } from './types'
import type { ProgressEntry } from './LessonView'

type View = 'init' | 'diagnostic-intro' | 'diagnostic-loading' | 'diagnostic-quiz' | 'course-tree' | 'lesson'

interface Props {
  course: SavedCourse
  progressMap: Record<string, ProgressEntry>
  onExit: () => void
}

function flattenCards(course: SavedCourse): FlatCard[] {
  const content = course.courseContent
  if (!content) return []
  const cards: FlatCard[] = []
  course.course.chapters.forEach((ch, ci) => {
    const chContent = content.chapters[ci]
    if (!chContent) return
    chContent.lessons.forEach((lesson, li) => {
      cards.push({
        id: `${ci}-${li}`,
        ci, chapterTitle: ch.title,
        li, lessonTitle: lesson.lesson_title,
        concept: lesson.concept,
      })
    })
  })
  return cards
}

function courseToMarkdown(course: SavedCourse): string {
  const lines: string[] = [`# ${course.title}`]
  const content = course.courseContent
  if (!content) return lines.join('\n')
  course.course.chapters.forEach((ch, ci) => {
    lines.push(`\n## ${ch.title}`)
    const chContent = content.chapters[ci]
    if (!chContent) return
    chContent.lessons.forEach(lesson => {
      lines.push(`\n### ${lesson.lesson_title}`)
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

export function CourseFlow({ course, progressMap, onExit }: Props) {
  const [view, setView] = useState<View>('init')
  const [diagnosticQuestions, setDiagnosticQuestions] = useState<DiagnosticQuestion[]>([])
  const [diagnosticState, setDiagnosticState] = useState<Record<string, number>>({})
  const [selectedLesson, setSelectedLesson] = useState<{ ci: number; li: number } | null>(null)

  const allCards = flattenCards(course)

  useEffect(() => {
    const done = localStorage.getItem(`diagnosticDone_${course.id}`)
    if (done === 'true') {
      const saved = localStorage.getItem(`diagnosticResults_${course.id}`)
      if (saved) {
        try { setDiagnosticState(JSON.parse(saved)) } catch { /* ignore */ }
      }
      setView('course-tree')
    } else {
      setView('diagnostic-intro')
    }
  }, [course.id])

  const handleDiagnosticStart = useCallback(async () => {
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
      // Fallback: skip diagnostic on error
      localStorage.setItem(`diagnosticDone_${course.id}`, 'true')
      setView('course-tree')
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

  const handleLessonClick = useCallback((ci: number, li: number) => {
    setSelectedLesson({ ci, li })
    setView('lesson')
  }, [])

  const handleContinue = useCallback(() => {
    const dueCard = allCards.find(c => progressMap[c.id]?.isDue)
    const target = dueCard ?? allCards[0]
    if (target) {
      setSelectedLesson({ ci: target.ci, li: target.li })
      setView('lesson')
    }
  }, [allCards, progressMap])

  if (view === 'init') return <LoadingOverlay label="Đang tải..." />

  if (view === 'diagnostic-intro') return (
    <DiagnosticIntro course={course} onStart={handleDiagnosticStart} onSkip={handleSkipDiagnostic} />
  )

  if (view === 'diagnostic-loading') return (
    <LoadingOverlay label="Đang tạo bài test chẩn đoán..." />
  )

  if (view === 'diagnostic-quiz') return (
    <DiagnosticQuiz course={course} questions={diagnosticQuestions} onComplete={handleDiagnosticComplete} />
  )

  if (view === 'course-tree') return (
    <CourseTree
      course={course}
      progressMap={progressMap}
      diagnosticState={diagnosticState}
      onLessonClick={handleLessonClick}
      onContinue={handleContinue}
      onExit={onExit}
    />
  )

  if (view === 'lesson' && selectedLesson) {
    const lessonCards = allCards.filter(c => c.ci === selectedLesson.ci && c.li === selectedLesson.li)
    return (
      <LessonView
        course={course}
        chapterIdx={selectedLesson.ci}
        lessonIdx={selectedLesson.li}
        cards={lessonCards}
        progressMap={progressMap}
        onBack={() => setView('course-tree')}
      />
    )
  }

  return null
}
