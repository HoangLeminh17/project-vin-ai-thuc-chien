import type {
  AnswerEvaluationInput,
  AnswerEvaluationLabel,
  AnswerEvaluationResult,
  IAnswerEvaluationPort,
} from '@/core/ports/answer-evaluation.port'
import { evaluateAnswerSimilarity } from '@/lib/answer-similarity'
import type { AiProvider } from '@/lib/ai-provider'

type ProviderConfig = {
  apiKey?: string
  model: string
  baseUrl?: string
}

type AnswerEvaluationAdapterConfig = {
  provider: AiProvider
  providers: Record<AiProvider, ProviderConfig>
  timeoutMs?: number
  cacheTtlMs?: number
  maxCacheEntries?: number
}

type CachedEvaluation = Omit<AnswerEvaluationResult, 'source'> & { source: string; expiresAt: number }

const EVALUATION_PROMPT = [
  'You grade a student short answer against a reference answer for a learning flashcard.',
  'Compare meaning, not wording.',
  'Treat paraphrases, reordered lists, and equivalent terminology as correct when they preserve the same core ideas.',
  'Use "partial" only when the student is meaningfully on track but misses essential ideas or gives an incomplete answer.',
  'Use "incorrect" when the answer is wrong, off-topic, or too incomplete to count as substantially correct.',
  'Ignore citation markers such as [chunk-1-2].',
  'Return JSON only in the form {"label":"correct"|"partial"|"incorrect","score":0.0}.',
  'score must be a number from 0 to 1.',
].join(' ')

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 30
const DEFAULT_MAX_CACHE_ENTRIES = 500

function normalizeChatCompletionUrl(url: string): string {
  const normalized = url.trim().replace(/\/$/, '')
  if (normalized.endsWith('/chat/completions')) return normalized
  return `${normalized}/chat/completions`
}

function normalizeScore(label: AnswerEvaluationLabel, score?: number): number {
  if (typeof score === 'number' && Number.isFinite(score)) {
    return Math.max(0, Math.min(1, score))
  }
  if (label === 'correct') return 0.9
  if (label === 'partial') return 0.55
  return 0.15
}

function extractJsonEvaluation(text: string): Omit<AnswerEvaluationResult, 'source'> {
  const cleaned = text.trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  const candidate = match ? match[0] : cleaned
  const parsed = JSON.parse(candidate) as { label?: string; score?: number }
  if (parsed.label === 'correct' || parsed.label === 'partial' || parsed.label === 'incorrect') {
    return { label: parsed.label, score: normalizeScore(parsed.label, parsed.score) }
  }
  throw new Error(`Invalid evaluation label: ${cleaned.slice(0, 200)}`)
}

function buildUserPrompt(input: AnswerEvaluationInput): string {
  return [
    `Question: ${input.question}`,
    `Reference answer: ${input.canonicalAnswer}`,
    `Student answer: ${input.userAnswer}`,
  ].join('\n\n')
}

function normalizedCachePayload(input: AnswerEvaluationInput): string {
  return JSON.stringify({
    question: input.question.trim().replace(/\s+/g, ' '),
    canonicalAnswer: input.canonicalAnswer.trim().replace(/\s+/g, ' '),
    userAnswer: input.userAnswer.trim().replace(/\s+/g, ' '),
  })
}

async function buildCacheKey(input: AnswerEvaluationInput): Promise<string> {
  const bytes = new TextEncoder().encode(normalizedCachePayload(input))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export class AnswerEvaluationAdapter implements IAnswerEvaluationPort {
  private readonly cache = new Map<string, CachedEvaluation>()
  private readonly timeoutMs: number
  private readonly cacheTtlMs: number
  private readonly maxCacheEntries: number

  constructor(private readonly config: AnswerEvaluationAdapterConfig) {
    this.timeoutMs = config.timeoutMs ?? 5000
    this.cacheTtlMs = config.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
    this.maxCacheEntries = Math.max(1, config.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES)
  }

  async evaluate(input: AnswerEvaluationInput): Promise<AnswerEvaluationResult> {
    const cacheKey = await buildCacheKey(input)
    const cached = this.getCachedEvaluation(cacheKey)
    if (cached) return { ...cached, source: 'cache' }

    try {
      const result = await this.evaluateWithProvider(input)
      this.setCachedEvaluation(cacheKey, result)
      return result
    } catch {
      const fallback = evaluateAnswerSimilarity(input.userAnswer, input.canonicalAnswer)
      const result: AnswerEvaluationResult = { label: fallback.label, score: fallback.score, source: 'fallback' }
      this.setCachedEvaluation(cacheKey, result)
      return result
    }
  }

  private getCachedEvaluation(key: string): CachedEvaluation | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(key)
      return null
    }
    this.cache.delete(key)
    this.cache.set(key, cached)
    return cached
  }

  private setCachedEvaluation(key: string, result: AnswerEvaluationResult) {
    this.cache.delete(key)
    this.cache.set(key, {
      label: result.label,
      score: result.score,
      source: result.source,
      expiresAt: Date.now() + this.cacheTtlMs,
    })
    this.pruneCache()
  }

  private pruneCache() {
    const now = Date.now()
    for (const [key, value] of this.cache) {
      if (value.expiresAt < now) this.cache.delete(key)
    }
    while (this.cache.size > this.maxCacheEntries) {
      const oldestKey = this.cache.keys().next().value
      if (!oldestKey) return
      this.cache.delete(oldestKey)
    }
  }

  private async evaluateWithProvider(input: AnswerEvaluationInput): Promise<AnswerEvaluationResult> {
    const provider = this.config.provider
    const providerConfig = this.config.providers[provider]
    if (!providerConfig.apiKey) throw new Error(`Missing API key for ${provider}`)

    const result = provider === 'gemini'
      ? await this.callGemini(providerConfig, input)
      : await this.callOpenAiCompatible(providerConfig, input)

    return { ...result, source: provider }
  }

  private async callOpenAiCompatible(
    providerConfig: ProviderConfig,
    input: AnswerEvaluationInput,
  ): Promise<Omit<AnswerEvaluationResult, 'source'>> {
    const response = await fetch(normalizeChatCompletionUrl(providerConfig.baseUrl || 'https://api.openai.com/v1'), {
      method: 'POST',
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: providerConfig.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: EVALUATION_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`AI provider returned ${response.status}: ${body.slice(0, 300)}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw new Error('AI provider returned no evaluation content')
    return extractJsonEvaluation(content)
  }

  private async callGemini(
    providerConfig: ProviderConfig,
    input: AnswerEvaluationInput,
  ): Promise<Omit<AnswerEvaluationResult, 'source'>> {
    const response = await fetch(`${GEMINI_BASE_URL}/models/${providerConfig.model}:generateContent?key=${providerConfig.apiKey}`, {
      method: 'POST',
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `${EVALUATION_PROMPT}\n\n${buildUserPrompt(input)}` }],
          },
        ],
      }),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Gemini returned ${response.status}: ${body.slice(0, 300)}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('\n')
    if (!content) throw new Error('Gemini returned no evaluation content')
    return extractJsonEvaluation(content)
  }
}
