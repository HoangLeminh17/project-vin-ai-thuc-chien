import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { withApiLogging } from '@/lib/middlewares/with-api-logging'
import { withApiMetrics } from '@/lib/middlewares/with-api-metrics'
import { resolveAiProvider, type AiProvider } from '@/lib/ai-provider'
import { evaluateAnswerSimilarity } from '@/lib/answer-similarity'

type EvaluationLabel = 'correct' | 'partial' | 'incorrect'
type EvaluationResult = { label: EvaluationLabel; score: number }
type CachedEvaluation = EvaluationResult & { expiresAt: number }

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
const EVALUATION_CACHE_TTL_MS = 1000 * 60 * 30
const evaluationCache = new Map<string, CachedEvaluation>()

function normalizeChatCompletionUrl(url: string): string {
  const normalized = url.trim().replace(/\/$/, '')
  if (normalized.endsWith('/chat/completions')) return normalized
  return `${normalized}/chat/completions`
}

function normalizeScore(label: EvaluationLabel, score?: number): number {
  if (typeof score === 'number' && Number.isFinite(score)) {
    return Math.max(0, Math.min(1, score))
  }
  if (label === 'correct') return 0.9
  if (label === 'partial') return 0.55
  return 0.15
}

function extractJsonEvaluation(text: string): EvaluationResult {
  const cleaned = text.trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  const candidate = match ? match[0] : cleaned
  const parsed = JSON.parse(candidate) as { label?: string; score?: number }
  if (parsed.label === 'correct' || parsed.label === 'partial' || parsed.label === 'incorrect') {
    return { label: parsed.label, score: normalizeScore(parsed.label, parsed.score) }
  }
  throw new Error(`Invalid evaluation label: ${cleaned.slice(0, 200)}`)
}

function buildCacheKey(question: string, canonicalAnswer: string, userAnswer: string): string {
  return JSON.stringify({
    question: question.trim().replace(/\s+/g, ' '),
    canonicalAnswer: canonicalAnswer.trim().replace(/\s+/g, ' '),
    userAnswer: userAnswer.trim().replace(/\s+/g, ' '),
  })
}

function getCachedEvaluation(key: string): EvaluationResult | null {
  const cached = evaluationCache.get(key)
  if (!cached) return null
  if (cached.expiresAt < Date.now()) {
    evaluationCache.delete(key)
    return null
  }
  return { label: cached.label, score: cached.score }
}

function setCachedEvaluation(key: string, result: EvaluationResult) {
  evaluationCache.set(key, {
    ...result,
    expiresAt: Date.now() + EVALUATION_CACHE_TTL_MS,
  })
}

function buildUserPrompt(question: string, canonicalAnswer: string, userAnswer: string): string {
  return [
    `Question: ${question}`,
    `Reference answer: ${canonicalAnswer}`,
    `Student answer: ${userAnswer}`,
  ].join('\n\n')
}

async function callOpenAiCompatible(options: {
  apiKey: string
  baseUrl: string
  model: string
  userPrompt: string
  timeoutMs?: number
}): Promise<EvaluationResult> {
  const response = await fetch(options.baseUrl, {
    method: 'POST',
    signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EVALUATION_PROMPT },
        { role: 'user', content: options.userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`AI provider returned ${response.status}: ${body.slice(0, 300)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI provider returned no evaluation content')
  }
  return extractJsonEvaluation(content)
}

async function callGemini(options: {
  apiKey: string
  model: string
  userPrompt: string
  timeoutMs?: number
}): Promise<EvaluationResult> {
  const response = await fetch(`${GEMINI_BASE_URL}/models/${options.model}:generateContent?key=${options.apiKey}`, {
    method: 'POST',
    signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: `${EVALUATION_PROMPT}\n\n${options.userPrompt}` }],
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
  if (!content) {
    throw new Error('Gemini returned no evaluation content')
  }
  return extractJsonEvaluation(content)
}

function getEvaluationModel(provider: AiProvider): string {
  if (provider === 'gemini') {
    return process.env.GEMINI_EVALUATION_MODEL || process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  }
  if (provider === 'deepseek') {
    return process.env.DEEPSEEK_EVALUATION_MODEL || process.env.DEEPSEEK_PLANNER_MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro'
  }
  if (provider === 'huggingface') {
    return process.env.HUGGINGFACE_EVALUATION_MODEL || process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct'
  }
  return process.env.OPENAI_EVALUATION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
}

async function evaluateWithProvider(provider: AiProvider, question: string, canonicalAnswer: string, userAnswer: string): Promise<EvaluationResult> {
  const userPrompt = buildUserPrompt(question, canonicalAnswer, userAnswer)
  const model = getEvaluationModel(provider)
  const timeoutMs = process.env.ANSWER_EVALUATION_TIMEOUT_MS ? Number(process.env.ANSWER_EVALUATION_TIMEOUT_MS) : 5000

  if (provider === 'gemini') {
    if (!process.env.GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY')
    return callGemini({
      apiKey: process.env.GEMINI_API_KEY,
      model,
      userPrompt,
      timeoutMs,
    })
  }

  if (provider === 'deepseek') {
    if (!process.env.DEEPSEEK_API_KEY) throw new Error('Missing DEEPSEEK_API_KEY')
    return callOpenAiCompatible({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: normalizeChatCompletionUrl(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'),
      model,
      userPrompt,
      timeoutMs,
    })
  }

  if (provider === 'huggingface') {
    if (!process.env.HUGGINGFACE_API_KEY) throw new Error('Missing HUGGINGFACE_API_KEY')
    return callOpenAiCompatible({
      apiKey: process.env.HUGGINGFACE_API_KEY,
      baseUrl: 'https://router.huggingface.co/v1/chat/completions',
      model,
      userPrompt,
      timeoutMs,
    })
  }

  if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY')
  return callOpenAiCompatible({
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model,
    userPrompt,
    timeoutMs,
  })
}

const handler = async (req: NextRequest) => {
  const { verifySessionUseCase } = await import('@/infrastructure/di')

  const session = req.cookies.get('session')?.value
  const user = await verifySessionUseCase.execute(session)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { question, canonicalAnswer, userAnswer } = body as {
    question?: unknown
    canonicalAnswer?: unknown
    userAnswer?: unknown
  }

  if (typeof question !== 'string' || typeof canonicalAnswer !== 'string' || typeof userAnswer !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing or invalid evaluation payload' }, { status: 400 })
  }

  if (!userAnswer.trim()) {
    return NextResponse.json({ success: true, label: 'incorrect', score: 0, source: 'empty' })
  }

  const cacheKey = buildCacheKey(question, canonicalAnswer, userAnswer)
  const cachedLabel = getCachedEvaluation(cacheKey)
  if (cachedLabel) {
    return NextResponse.json({ success: true, ...cachedLabel, source: 'cache' })
  }

  try {
    const provider = resolveAiProvider(process.env.AI_PROVIDER)
    const result = await evaluateWithProvider(provider, question, canonicalAnswer, userAnswer)
    setCachedEvaluation(cacheKey, result)
    return NextResponse.json({ success: true, ...result, source: provider })
  } catch {
    const fallback = evaluateAnswerSimilarity(userAnswer, canonicalAnswer)
    const result = { label: fallback.label, score: fallback.score }
    setCachedEvaluation(cacheKey, result)
    return NextResponse.json({ success: true, ...result, source: 'fallback' })
  }
}

export const POST = withApiLogging('/api/answer-evaluation', withApiMetrics('/api/answer-evaluation', handler))
