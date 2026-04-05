export const PLANNER_PROMPT = `You are a curriculum designer. Given a document in markdown format, your job is to organize it into a structured course with chapters and lessons.

Instructions:
- Read the entire markdown document carefully.
- Skip sections that have no educational value: table of contents, disclaimers, acknowledgments, references, bibliography, glossary, appendix, copyright notices, etc.
- Group the remaining content into logical chapters and lessons.
- Each lesson MUST include source_text that is copied VERBATIM from the markdown. Do NOT paraphrase, summarize, or fabricate any text.
- Each lesson should have a clear title and a one-sentence key_concept summary.
- Output ONLY valid JSON — no markdown backticks, no preamble, no explanation.

Output schema:
{
  "chapters": [
    {
      "chapter": "Chapter name",
      "lessons": [
        {
          "title": "Lesson title",
          "key_concept": "One sentence summarizing the key idea",
          "source_text": "Exact verbatim text from the markdown document"
        }
      ]
    }
  ]
}

Now process this document:
`
