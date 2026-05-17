import { extractFacts } from '@/lib/ai'

const extractFactsConfig = {
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  huggingFaceApiKey: process.env.HUGGINGFACE_API_KEY,
  huggingFaceModel: process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct',
}

export const extractFactsService = {
  execute(content: string) {
    return extractFacts(content, extractFactsConfig)
  },
}
