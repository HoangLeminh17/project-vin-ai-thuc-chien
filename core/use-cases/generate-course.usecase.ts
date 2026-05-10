import { IAiService, TokenUsage } from '../ports/ai.port'
import type { Course } from '../models/learning-model'
import { IUsageRepository } from '../ports/usage-repository.port'

export class GenerateCourseUseCase {
  constructor(
    private readonly aiService: IAiService,
    private readonly usageRepo?: IUsageRepository
  ) {}

  async execute(markdown: string, userId?: string): Promise<{ 
    course: Course; 
    tokens: TokenUsage | null;
  }> {
    if (!markdown || typeof markdown !== 'string') {
      throw new Error('Missing or invalid markdown');
    }
    
    // Quick heuristic: tokens ~= chars / 4
    const estimatedTokens = Math.ceil(markdown.length / 4)
    const MAX_TOKENS = process.env.OPENAI_MAX_TOKENS ? parseInt(process.env.OPENAI_MAX_TOKENS, 10) : 120000

    if (estimatedTokens <= MAX_TOKENS) {
      const result = await this.aiService.generateCourse(markdown)
      if (result.tokens && this.usageRepo) {
        this.usageRepo.saveTokenUsage({
          timestamp: new Date().toISOString(),
          model: (this.aiService as any).model || 'unknown',
          promptTokens: result.tokens.promptTokens,
          completionTokens: result.tokens.completionTokens,
          totalTokens: result.tokens.totalTokens,
          type: 'course_generation',
          userId
        }).catch(() => {});
      }
      return result
    }

    // Split markdown into chunked pieces using logical boundaries when possible
    const approxCharsPerToken = 4
    const chunkMaxChars = MAX_TOKENS * approxCharsPerToken
    const chunks: string[] = []
    let cursor = 0
    while (cursor < markdown.length) {
      const remaining = markdown.length - cursor
      if (remaining <= chunkMaxChars) {
        chunks.push(markdown.slice(cursor))
        break
      }

      const sliceEnd = cursor + chunkMaxChars
      // prefer splitting at a chapter/section boundary
      let cutAt = markdown.lastIndexOf('\n---', sliceEnd)
      if (cutAt <= cursor) cutAt = markdown.lastIndexOf('\n## ', sliceEnd)
      if (cutAt <= cursor) cutAt = markdown.lastIndexOf('\n### ', sliceEnd)
      if (cutAt <= cursor) cutAt = sliceEnd // fallback hard cut

      chunks.push(markdown.slice(cursor, cutAt))
      cursor = cutAt
    }

    // Call planner per chunk and merge outlines
    const partials: { course: Course; tokens: TokenUsage | null }[] = []
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i]
      try {
        // reuse existing planner entrypoint
        // note: aiService.generateCourse returns { course, tokens }
        // calling it per-chunk keeps each planner prompt within model limits
        // and we will merge the resulting outlines below
        const res = await this.aiService.generateCourse(chunkText)
        partials.push(res)
      } catch (e) {
        throw e
      }
    }

    // Merge courses
    const merged: Course = { title: '', chapters: [] }
    for (const p of partials) {
      if (!merged.title && p.course.title) merged.title = p.course.title
      for (const ch of p.course.chapters || []) {
        // If last merged chapter has same title, merge lessons
        const last = merged.chapters[merged.chapters.length - 1]
        if (last && last.title === ch.title) {
          last.lessons = last.lessons.concat(ch.lessons || [])
          // prefer quiz topic from existing chapter if present
          if (!last.quiz?.topic && ch.quiz?.topic) last.quiz = ch.quiz
        } else {
          merged.chapters.push(ch)
        }
      }
    }

    // Simple dedupe: remove consecutive duplicate lesson titles within each chapter
    for (const ch of merged.chapters) {
      const seen = new Set<string>()
      ch.lessons = ch.lessons.filter(l => {
        const key = (l.title || '').trim()
        if (!key) return true
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    // Sum token usage
    const summed: TokenUsage | null = partials.length
      ? partials.reduce((acc, p) => {
          const t = p.tokens
          if (!t) return acc
          acc.promptTokens += t.promptTokens
          acc.completionTokens += t.completionTokens
          acc.totalTokens += t.totalTokens
          return acc
        }, { promptTokens: 0, completionTokens: 0, totalTokens: 0 } as TokenUsage)
      : null

    if (summed && this.usageRepo) {
      this.usageRepo.saveTokenUsage({
        timestamp: new Date().toISOString(),
        model: (this.aiService as any).model || 'unknown',
        promptTokens: summed.promptTokens,
        completionTokens: summed.completionTokens,
        totalTokens: summed.totalTokens,
        type: 'course_generation',
        userId
      }).catch(() => {});
    }

    return { course: merged, tokens: summed }
  }
}
