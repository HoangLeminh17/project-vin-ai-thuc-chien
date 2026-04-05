export type Lesson = { title: string; key_concept: string; source_text: string }
export type Chapter = { chapter: string; lessons: Lesson[] }
export type Course = { chapters: Chapter[] }
