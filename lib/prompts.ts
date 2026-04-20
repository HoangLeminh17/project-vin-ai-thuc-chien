export const PLANNER_PROMPT = `You are a curriculum designer. Given a document's content, your job is to organize it into a structured course with chapters and lessons.

Instructions:
- Read the entire content carefully.
- The document text uses # markers to indicate section headings. Each # heading that has body text below it is a separate lesson — even if the body is short (1–3 paragraphs). Never merge two # sections into one lesson. Short content does NOT justify merging.
- Skip sections with no educational value: table of contents, disclaimers, acknowledgments, references, bibliography, glossary, appendix, copyright notices, assessment questions, practical assignments. When in doubt, include it rather than skip it.
- Group the remaining content into logical chapters and lessons.
- Include ALL topics found in the document as separate lessons. Do NOT merge multiple topics into one lesson. Do NOT skip any topic even if it seems minor.
- Each lesson should have a clear title and a one-sentence key_concept summary.
- Each chapter MUST have a quiz with a topic string — a short description of what should be tested at the end of the chapter.
- outline: Extract 4–8 specific, factual bullet points for this lesson from the document content. Each bullet must be a concrete statement — include specific examples, named technologies, numbers, mechanisms, or outcomes that appear in the source. These bullets will be handed to a second model to generate slides, so they must be informative enough to stand alone.
- Output ONLY valid JSON — no markdown backticks, no preamble, no explanation.

Output schema:
{
  "title": "Course title",
  "chapters": [
    {
      "title": "Chapter name",
      "lessons": [
        {
          "title": "Lesson title",
          "key_concept": "One sentence summarizing the key idea",
          "outline": [
            "Specific factual point from the source",
            "Another concrete detail, example, or mechanism"
          ]
        }
      ],
      "quiz": {
        "topic": "Short description of what to test for this chapter"
      }
    }
  ]
}

Now process this document:
`

export const STAGE2_CHAPTER_PROMPT = `You are an instructional designer creating concept cards and quiz questions for a course chapter.

Given a chapter with its lessons and outline points, generate:
1. A concept card for each lesson
2. A chapter quiz with 3–5 multiple-choice questions

Rules for concept cards:
- question: active recall question about the lesson's core idea
  - Use forms like "X hoạt động như thế nào?", "Tại sao ...?", "X là gì và khi nào dùng?"
  - Do NOT use "Giải thích X" form
- answer: TL;DR 2-3 dense sentences, no bullets, answer the question directly
- detail: 3-5 sentences expanding the answer; include analogy or concrete example if the concept is abstract
- followUps: exactly 2 genuine follow-up questions that dig deeper, not just topic labels

Rules for quiz questions:
- 3–5 questions testing understanding of the chapter content
- Each question has exactly 4 options
- answer is the 0-based index (0–3) of the correct option
- explanation: 1–2 sentences explaining why the answer is correct
- Base questions on the outline points, not generic knowledge

Output ONLY valid JSON — no markdown backticks, no preamble, no explanation.

Output schema:
{
  "chapter_title": "...",
  "lessons": [
    {
      "lesson_title": "...",
      "concept": {
        "question": "X hoạt động như thế nào?",
        "answer": "TL;DR 2-3 câu trả lời thẳng vào câu hỏi.",
        "detail": "3-5 câu mở rộng, có analogy hoặc ví dụ.",
        "followUps": ["Câu hỏi đào sâu 1?", "Câu hỏi đào sâu 2?"]
      }
    }
  ],
  "quiz": {
    "topic": "...",
    "questions": [
      {
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "answer": 0,
        "explanation": "Option A is correct because..."
      }
    ]
  }
}
`
