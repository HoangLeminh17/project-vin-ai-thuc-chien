export type AiProvider = 'openai' | 'gemini' | 'huggingface' | 'deepseek'

export type AiProviderAvailability = {
  gemini?: boolean
  openai?: boolean
  huggingface?: boolean
  deepseek?: boolean
  fallbackProvider?: string | null
}

export function normalizeAiProvider(value?: string | null): AiProvider {
  const v = value?.toLowerCase()
  if (v === 'gemini') return 'gemini'
  if (v === 'huggingface' || v === 'hf') return 'huggingface'
  if (v === 'deepseek') return 'deepseek'
  return 'openai'
}

export function resolveAiProvider(value?: string | null, availability: AiProviderAvailability = {}): AiProvider {
  // Priority:
  // 1) Explicit request (value)
  // 2) Auto-pick based on which key exists (prefer Gemini)
  // 3) AI_PROVIDER env fallback
  const requested = value ? normalizeAiProvider(value) : null
  const hasGemini = !!availability.gemini
  const hasOpenAi = !!availability.openai
  const hasHF = !!availability.huggingface
  const hasDeepSeek = !!availability.deepseek

  const auto: AiProvider =
    hasDeepSeek ? 'deepseek'
    : hasGemini ? 'gemini'
    : hasOpenAi ? 'openai'
    : hasHF ? 'huggingface'
    : normalizeAiProvider(availability.fallbackProvider)

  const preferred: AiProvider = requested ?? auto

  // Fallback if the preferred provider is missing its key but the other exists.
  if (preferred === 'deepseek' && !hasDeepSeek) {
    if (hasGemini) return 'gemini'
    if (hasOpenAi) return 'openai'
  }
  if (preferred === 'gemini' && !hasGemini && hasOpenAi) return 'openai'
  if (preferred === 'openai' && !hasOpenAi && hasGemini) return 'gemini'
  if (preferred === 'huggingface' && !hasHF) {
    if (hasDeepSeek) return 'deepseek'
    if (hasGemini) return 'gemini'
    if (hasOpenAi) return 'openai'
  }
  return preferred
}
