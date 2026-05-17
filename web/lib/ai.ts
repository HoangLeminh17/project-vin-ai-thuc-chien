/**
 * lib/ai.ts
 *
 * Thin utility for one-off AI calls that don't go through the DI system.
 *
 * NOTE: Stage 1 (generateCourse) and Stage 2 (generateChapterContent) both
 * route through the DI ChainAiAdapter — see infrastructure/di.ts.
 * Only extractFacts lives here because it is a lightweight, stateless helper
 * that doesn't need the full adapter/port abstraction.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

// Server-only helper; keep logs structured.
import { logger } from '@/infrastructure/di/logger.di'

export type ExtractFactsConfig = {
  openAiApiKey?: string
  openAiModel: string
  huggingFaceApiKey?: string
  huggingFaceModel: string
}

export async function extractFacts(content: string, config: ExtractFactsConfig): Promise<string[]> {
  const messages = [
    {
      role: 'system',
      content:
        'Extract 5 interesting, short, and surprising facts or key takeaways from the provided text. Return them as a JSON object with a "facts" array of strings. Keep each fact under 15 words and in Vietnamese.',
    },
    { role: 'user', content: content.slice(0, 5000) },
  ]

  // 1. Try OpenAI
  if (config.openAiApiKey) {
    try {
      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openAiApiKey}`,
        },
        body: JSON.stringify({
          model: config.openAiModel,
          temperature: 0.7,
          messages,
          response_format: { type: 'json_object' },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        return JSON.parse(text).facts || []
      }
    } catch (e) {
      logger.error('[extractFacts] OpenAI failed', { err: e })
    }
  }

  // 2. Try Hugging Face
  if (config.huggingFaceApiKey) {
    try {
      const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.huggingFaceApiKey}`,
        },
        body: JSON.stringify({
          model: config.huggingFaceModel,
          temperature: 0.7,
          messages,
          response_format: { type: 'json_object' },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content
        return JSON.parse(text).facts || []
      }
    } catch (e) {
      logger.error('[extractFacts] Hugging Face failed', { err: e })
    }
  }

  // Fallback: static Vietnamese facts
  return [
    'Hệ thống đang chắt lọc những kiến thức tinh túy nhất cho bạn...',
    'Sắp có một hành trình khám phá tri thức thú vị dành riêng cho bạn!',
    'Học tập là hạt giống của sự phát triển, hãy cùng kiên nhẫn nhé.',
    'Mỗi trang sách là một cửa sổ mở ra thế giới mới.',
    'Kiến thức sẽ giúp bạn đi xa hơn những gì bạn tưởng tượng.',
  ]
}
