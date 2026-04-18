/**
 * Domain models for Learning content.
 * Located in Core to prevent leakage of Infrastructure/External schemas.
 */

export type Lesson = {
  title: string
  key_concept: string
  outline: string[]
}

export type Quiz = {
  topic: string
}

export type Chapter = {
  title: string
  lessons: Lesson[]
  quiz: Quiz
}

export type Course = {
  title: string
  chapters: Chapter[]
}

export type ConceptCard = {
  question: string
  answer: string
  detail?: string
  followUps: string[]
}

export type QuizQuestion = {
  question: string
  options: string[]
  answer: number
  explanation: string
}

export type LessonContent = {
  lesson_title: string
  concept: ConceptCard
}

export type ChapterContent = {
  chapter_title: string
  lessons: LessonContent[]
  quiz: {
    topic: string
    questions: QuizQuestion[]
  }
}

export type CourseContent = {
  chapters: ChapterContent[]
}
