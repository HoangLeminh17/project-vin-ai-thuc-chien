// Stage 1 — Course outline
export type Lesson = {
  title: string
  key_concept: string
  source_heading: string  // the ## heading from the source doc this lesson maps to
}

// Stage 2 input — lesson enriched with extracted source text (populated by our code, not LLM)
export type LessonWithText = Lesson & { source_text: string }
export type ChapterWithText = Omit<Chapter, 'lessons'> & { lessons: LessonWithText[] }

export type Quiz = {
  topic: string  // Stage 1 chỉ cần topic, content gen ở Stage 2
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

// Stage 2 — Slide + quiz content
export type Slide = {
  heading: string
  bullets: string[]
  speaker_notes: string
}

export type QuizQuestion = {
  question: string
  options: string[]   // exactly 4
  answer: number      // index 0-3
  explanation: string
}

export type LessonContent = {
  lesson_title: string
  slides: Slide[]     // 2-4 slides per lesson
}

export type ChapterContent = {
  chapter_title: string
  lessons: LessonContent[]
  quiz: {
    topic: string
    questions: QuizQuestion[]  // 3-5 questions
  }
}

export type CourseContent = {
  chapters: ChapterContent[]
}
