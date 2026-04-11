export type Lesson = {
  title: string
  key_concept: string
  source_text: string  // verbatim từ tài liệu gốc
}

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
