export type AiProvider = 'openai' | 'gemini' | 'huggingface'

export function normalizeAiProvider(value?: string | null): AiProvider {
  const v = value?.toLowerCase()
  if (v === 'gemini') return 'gemini'
  if (v === 'huggingface' || v === 'hf') return 'huggingface'
  return 'openai'
}

export function resolveAiProvider(value?: string | null): AiProvider {
  // Priority:
  // 1) Explicit request (value)
  // 2) Auto-pick based on which key exists (prefer Gemini)
  // 3) AI_PROVIDER env fallback
  const requested = value ? normalizeAiProvider(value) : null
  const hasGemini = !!process.env.GEMINI_API_KEY
  const hasOpenAi = !!process.env.OPENAI_API_KEY
  const hasHF = !!process.env.HUGGINGFACE_API_KEY

  const auto: AiProvider =
    hasGemini ? 'gemini'
    : hasOpenAi ? 'openai'
    : hasHF ? 'huggingface'
    : normalizeAiProvider(process.env.AI_PROVIDER)

  const preferred: AiProvider = requested ?? auto

  // Fallback if the preferred provider is missing its key but the other exists.
  if (preferred === 'gemini' && !hasGemini && hasOpenAi) return 'openai'
  if (preferred === 'openai' && !hasOpenAi && hasGemini) return 'gemini'
  if (preferred === 'huggingface' && !hasHF) {
    if (hasGemini) return 'gemini'
    if (hasOpenAi) return 'openai'
  }
  return preferred
}
