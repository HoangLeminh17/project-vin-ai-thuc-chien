export const PLANNER_PROMPT = `You are a curriculum designer. Given a document's content, your job is to organize it into a structured course with chapters and lessons.

Instructions:
- Read the entire content carefully.
- Output MUST match source document language. Never translate.
- The document text uses ## and ### markers to indicate section headings.
  - "---" marks an absolute chapter boundary — always start a new chapter entry when you see "---".
  - ## marks a chapter boundary — each ## is a separate chapter, never merge multiple ## sections into one chapter.
  - ### marks a lesson boundary within the current chapter — each ### is a separate lesson, never merge two ### sections.
  - Each heading that has body text below it is a separate lesson — even if the body is short (1–3 paragraphs). Short content does NOT justify merging.
- Skip sections with no educational value: table of contents, disclaimers, acknowledgments, references, bibliography, glossary, appendix, copyright notices, assessment questions, practical assignments. When in doubt, include it rather than skip it.
- Group the remaining content into logical chapters and lessons.
- Include ALL topics found in the document as separate lessons. Do NOT merge multiple topics into one lesson. Do NOT skip any topic even if it seems minor.
- Each lesson should have a clear title and a one-sentence key_concept summary.
- Each chapter MUST have a quiz with a topic string — a short description of what should be tested at the end of the chapter.
- outline: Extract 4–8 specific, factual bullet points for this lesson from the document content. Each bullet must be a concrete statement — include specific examples, named technologies, numbers, mechanisms, or outcomes that appear in the source. These bullets will be handed to a second model to generate slides, so they must be informative enough to stand alone.
- Table expansion rule: if table rows are distinct entities (e.g. drug names, drug groups) → expand into N separate lessons, one per row. If table rows are comparison attributes of a single entity → collapse into one lesson.
- Each lesson MUST include \`source_chunk_start\` and \`source_chunk_end\` to mark its exact span in the source document:
  - \`source_chunk_start\`: the \`<a id="chunk-X-Y">\` anchor ID immediately before the first paragraph of this lesson's content.
  - \`source_chunk_end\`: the \`<a id="chunk-X-Y">\` anchor ID of the last paragraph that belongs to this lesson, just before the next lesson or section starts.
  - Both values are strings in the form "chunk-{page}-{index}" (e.g., "chunk-2-15").
  - If a lesson is only one paragraph, start and end will be the same chunk.
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
          "source_chunk_start": "chunk-1-5",
          "source_chunk_end": "chunk-1-9",
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

Each lesson in the input has:
- \`outline\`: distilled key points extracted by the planner
- \`raw_context\`: verbatim text from the original source document for that lesson (the ground truth)

Use \`raw_context\` as the primary source for accuracy. Use \`outline\` as a guide for what to focus on.

Generate:
1. A concept card for each lesson
2. A chapter quiz with 3–5 multiple-choice questions

Rules for concept cards:
- question: active recall question about the lesson's core idea
  - Use forms like "X hoạt động như thế nào?", "Tại sao ...?", "X là gì và khi nào dùng?"
  - Do NOT use "Giải thích X" form
- answer: TL;DR 2-3 dense sentences, no bullets, answer the question directly — grounded in raw_context
- detail: 3-5 sentences expanding the answer with specific details, mechanisms, or examples from raw_context
- followUps: exactly 2 genuine follow-up questions that dig deeper, not just topic labels

Rules for quiz questions:
- 3–5 questions testing understanding of the chapter content
- Each question has exactly 4 options
- answer is the 0-based index (0–3) of the correct option
- explanation: 1–2 sentences explaining why the answer is correct
- Base questions on the raw_context, not generic knowledge

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
        "detail": "3-5 câu mở rộng, có analogy hoặc ví dụ cụ thể.",
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

export const DIAGNOSTIC_QUIZ_PROMPT = `You are an expert diagnostician and educator. Your goal is to create a diagnostic quiz to assess a student's prior knowledge of the provided material.

Instructions:
- Analyze the provided document content.
- Generate 10-15 multiple-choice questions covering a diverse range of key topics found in the material.
- Each question must assess a different core concept (topic).
- Provide 4 options for each question, with exactly one correct answer.
- "answer" is the 0-based index of the correct option.
- Provide a brief "explanation" of why the answer is correct.
- For "topic", extract a short 2-4 word identifier for the Knowledge Component being tested. This will be used by an AI tracing system (UKT) to track mastery.
- For "source_chunk_id", copy the value from the [[SOURCE_CHUNK_ID: ...]] marker immediately preceding the content used for the question.
- Output ONLY valid JSON — no markdown backticks, no preamble, no explanation.

Output schema:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Brief explanation",
      "topic": "Core Concept Name",
      "source_chunk_id": "0-2"
    }
  ]
}

Now generate the diagnostic quiz for this content:
`
