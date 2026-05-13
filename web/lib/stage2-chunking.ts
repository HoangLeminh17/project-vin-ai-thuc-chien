import type { Chapter, ChapterContent, OutlinePoint, QuizQuestion } from './types'
import type { KnowledgeComponentRef } from '@/core/models/knowledge'

export type Stage2LessonInput = {
  title: string
  key_concept: string
  knowledge?: KnowledgeComponentRef
  outline: OutlinePoint[]
  raw_context?: string
}

export type Stage2ChapterInput = {
  chapter_title: string
  quiz_topic: string
  lessons: Stage2LessonInput[]
}

export const DEFAULT_STAGE2_MAX_INPUT_CHARS = 60000

export function buildStage2ChapterInput(chapter: Chapter, rawContexts?: string[]): Stage2ChapterInput {
  return {
    chapter_title: chapter.title,
    quiz_topic: chapter.quiz.topic,
    lessons: chapter.lessons.map((lesson, index) => ({
      title: lesson.title,
      key_concept: lesson.key_concept,
      knowledge: lesson.knowledge,
      outline: lesson.outline,
      ...(rawContexts?.[index] ? { raw_context: rawContexts[index] } : {}),
    })),
  }
}

export function splitStage2ChapterInput(
  input: Stage2ChapterInput,
  maxInputChars: number = DEFAULT_STAGE2_MAX_INPUT_CHARS,
): Stage2ChapterInput[] {
  if (JSON.stringify(input).length <= maxInputChars || input.lessons.length <= 1) {
    return [input]
  }

  const batches: Stage2ChapterInput[] =
    []
  let currentLessons: Stage2LessonInput[] = []

  for (const lesson of input.lessons) {
    const candidateLessons = [...currentLessons, lesson]
    const candidate: Stage2ChapterInput = {
      ...input,
      lessons: candidateLessons,
    }

    if (currentLessons.length > 0 && JSON.stringify(candidate).length > maxInputChars) {
      batches.push({
        ...input,
        lessons: currentLessons,
      })
      currentLessons = [lesson]
      continue
    }

    currentLessons = candidateLessons
  }

  if (currentLessons.length > 0) {
    batches.push({
      ...input,
      lessons: currentLessons,
    })
  }

  return batches.length > 0 ? batches : [input]
}

export function mergeStage2ChapterOutputs(
  chapterTitle: string,
  quizTopic: string,
  segments: ChapterContent[],
): ChapterContent {
  const lessons = segments.flatMap(segment => segment.lessons || [])
  const seenQuestions = new Set<string>()
  const questions: QuizQuestion[] = []

  for (const segment of segments) {
    for (const question of segment.quiz?.questions || []) {
      const key = question.question.trim()
      if (key && seenQuestions.has(key)) continue
      if (key) seenQuestions.add(key)
      questions.push(question)
    }
  }

  return {
    chapter_title: chapterTitle,
    lessons,
    quiz: {
      topic: quizTopic,
      questions: questions.slice(0, 5),
    },
  }
}
