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

export async function extractFacts(content: string): Promise<string[]> {
  const messages = [
    {
      role: 'system',
      content:
        'Extract 5 interesting, short, and surprising facts or key takeaways from the provided text. Return them as a JSON object with a "facts" array of strings. Keep each fact under 15 words and in Vietnamese.',
    },
    { role: 'user', content: content.slice(0, 5000) },
  ]

  // 1. Try OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
      console.error('[extractFacts] OpenAI failed:', e)
    }
  }

  // 2. Try Hugging Face
  if (process.env.HUGGINGFACE_API_KEY) {
    try {
      const res = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
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
      console.error('[extractFacts] Hugging Face failed:', e)
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
