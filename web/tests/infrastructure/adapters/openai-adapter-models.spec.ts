import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OpenAiAdapter } from '@/infrastructure/adapters/openai.adapter'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function responseFor(content: unknown): Response {
  return jsonResponse({
    choices: [
      {
        message: {
          content: JSON.stringify(content),
        },
      },
    ],
  })
}

function requestBody() {
  const [, init] = vi.mocked(fetch).mock.calls[0]
  return JSON.parse(String(init?.body))
}

describe('OpenAiAdapter model routing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('uses plannerModel for course planning', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseFor({ title: 'Course', chapters: [] }))

    const adapter = new OpenAiAdapter({
      apiKey: 'test-key',
      model: 'default-model',
      plannerModel: 'planner-model',
      generatorModel: 'generator-model',
    })

    await adapter.generateCourse('source markdown')

    expect(requestBody().model).toBe('planner-model')
  })

  it('uses generatorModel for chapter content generation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseFor({
      chapter_title: 'Chapter',
      lessons: [],
      quiz: { topic: 'Topic', questions: [] },
    }))

    const adapter = new OpenAiAdapter({
      apiKey: 'test-key',
      model: 'default-model',
      plannerModel: 'planner-model',
      generatorModel: 'generator-model',
    })

    await adapter.generateChapterContent('chapter input')

    expect(requestBody().model).toBe('generator-model')
  })

  it('uses diagnosticModel for diagnostic quiz generation', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(responseFor({
      questions: [
        {
          question: 'Cau hoi?',
          options: ['A', 'B', 'C', 'D'],
          answer: 0,
          explanation: 'A dung.',
          source_chunk_id: '0-1',
        },
      ],
    }))

    const adapter = new OpenAiAdapter({
      apiKey: 'test-key',
      model: 'default-model',
      generatorModel: 'generator-model',
      diagnosticModel: 'diagnostic-model',
    })

    await adapter.generateDiagnosticQuiz([{ id: '0-1', text: 'source text' }])

    expect(requestBody().model).toBe('diagnostic-model')
  })
})
