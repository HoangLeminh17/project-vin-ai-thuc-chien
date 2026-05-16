const CITATION_MARKER = /\[chunk-\d+-\d+\]/gi
const NON_ALNUM = /[^\p{L}\p{N}\s]/gu
const MULTISPACE = /\s+/g

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'in', 'into', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'their', 'this', 'to', 'what', 'which', 'with',
  'bi', 'boi', 'cac', 'can', 'cho', 'co', 'cua', 'da', 'dang', 'de', 'den', 'duoc', 'gi', 'khi', 'khong', 'la', 'lam', 'mot', 'neu', 'nhung', 'nhu', 'noi', 'o', 'se', 'su', 'tai', 'thi', 'tren', 'trong', 'tu', 'va', 'vao', 've', 'voi', 'vi',
])

export type AnswerSimilarity = {
  score: number
  label: 'correct' | 'partial' | 'incorrect'
}

const PHRASE_ALIASES: Array<[RegExp, string]> = [
  [/\bhoc co giam sat\b/g, 'supervised_learning'],
  [/\bhoc giam sat\b/g, 'supervised_learning'],
  [/\bsupervised learning\b/g, 'supervised_learning'],
  [/\bhoc khong giam sat\b/g, 'unsupervised_learning'],
  [/\bunsupervised learning\b/g, 'unsupervised_learning'],
  [/\bhoc ban giam sat\b/g, 'semi_supervised_learning'],
  [/\bsemi supervised learning\b/g, 'semi_supervised_learning'],
  [/\bhoc tang cuong\b/g, 'reinforcement_learning'],
  [/\breinforcement learning\b/g, 'reinforcement_learning'],
  [/\bmachine learning\b/g, 'machine_learning'],
]

function stripCitations(text: string): string {
  return text.replace(CITATION_MARKER, ' ')
}

function normalizeText(text: string): string {
  const normalized = stripCitations(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const aliased = PHRASE_ALIASES.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, ` ${replacement} `),
    normalized,
  )
  return aliased
    .replace(NON_ALNUM, ' ')
    .replace(MULTISPACE, ' ')
    .trim()
}

function stemToken(token: string): string {
  if (token.length <= 4) return token
  const englishSuffixes = ['ingly', 'edly', 'ation', 'ments', 'ment', 'ness', 'less', 'tion', 'ings', 'ing', 'ers', 'ies', 'ied', 'est', 'ous', 'ed', 'es', 'er', 'ly', 's']
  for (const suffix of englishSuffixes) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 3) {
      return token.slice(0, -suffix.length)
    }
  }
  return token
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .map(stemToken)
    .filter(token => token.length >= 3 && !STOPWORDS.has(token))
}

function charTrigrams(text: string): Set<string> {
  const normalized = normalizeText(text).replace(/\s/g, '')
  if (normalized.length <= 3) return new Set(normalized ? [normalized] : [])
  const grams = new Set<string>()
  for (let i = 0; i < normalized.length - 2; i += 1) {
    grams.add(normalized.slice(i, i + 3))
  }
  return grams
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let count = 0
  for (const item of a) {
    if (b.has(item)) count += 1
  }
  return count
}

function diceCoefficient(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  return (2 * overlapCount(a, b)) / (a.size + b.size)
}

function buildTermFrequency(tokens: string[]): Map<string, number> {
  const frequencies = new Map<string, number>()
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1)
  }
  return frequencies
}

function bm25Score(queryTokens: string[], documentTokens: string[]): number {
  if (queryTokens.length === 0 || documentTokens.length === 0) return 0

  const k1 = 1.2
  const b = 0.75
  const tf = buildTermFrequency(documentTokens)
  const documentLength = documentTokens.length
  const averageDocumentLength = Math.max(documentLength, 1)
  const queryTerms = [...new Set(queryTokens)]

  let score = 0
  for (const term of queryTerms) {
    const frequency = tf.get(term) ?? 0
    if (frequency === 0) continue

    const documentFrequency = 1
    const totalDocuments = 2
    const inverseDocumentFrequency = Math.log(1 + ((totalDocuments - documentFrequency + 0.5) / (documentFrequency + 0.5)))
    const numerator = frequency * (k1 + 1)
    const denominator = frequency + k1 * (1 - b + b * (documentLength / averageDocumentLength))
    score += inverseDocumentFrequency * (numerator / denominator)
  }

  const maxTermScore = Math.log(2) * (k1 + 1)
  const normalized = queryTerms.length > 0 ? score / (queryTerms.length * maxTermScore) : 0
  return Math.max(0, Math.min(1, normalized))
}

function buildKeywordList(answer: string): string[] {
  const counts = new Map<string, number>()
  for (const token of tokenize(answer)) {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1]
      if (right[0].length !== left[0].length) return right[0].length - left[0].length
      return left[0].localeCompare(right[0])
    })
    .map(([token]) => token)
    .slice(0, 8)
}

function splitIntoListItems(text: string): string[] {
  return normalizeText(text)
    .split(/\s*(?:,|;|\/|\bva\b|\bhoac\b|\band\b|\bor\b)\s*/g)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

function isEnumerationAnswer(text: string): boolean {
  const normalized = normalizeText(text)
  const items = splitIntoListItems(text)
  return items.length >= 3 || /,|;|\bva\b|\bhoac\b|\band\b|\bor\b/.test(normalized)
}

function tokenSetSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a))
  const tokensB = new Set(tokenize(b))
  if (tokensA.size === 0 || tokensB.size === 0) return 0

  const overlap = overlapCount(tokensA, tokensB)
  const precision = overlap / tokensA.size
  const recall = overlap / tokensB.size
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  const trigram = diceCoefficient(charTrigrams(a), charTrigrams(b))
  return f1 * 0.7 + trigram * 0.3
}

function enumerationCoverageScore(userAnswer: string, canonicalAnswer: string): number | null {
  if (!isEnumerationAnswer(userAnswer) && !isEnumerationAnswer(canonicalAnswer)) {
    return null
  }

  const expectedItems = splitIntoListItems(canonicalAnswer)
  const userItems = splitIntoListItems(userAnswer)
  if (expectedItems.length === 0 || userItems.length === 0) {
    return 0
  }

  const matchedExpected = expectedItems.filter(expectedItem =>
    userItems.some(userItem => tokenSetSimilarity(userItem, expectedItem) >= 0.72)
  )
  const coverage = matchedExpected.length / expectedItems.length
  const precision = matchedExpected.length / userItems.length
  const balance = precision + coverage > 0 ? (2 * precision * coverage) / (precision + coverage) : 0
  return Math.max(0, Math.min(1, coverage * 0.75 + balance * 0.25))
}

export function evaluateAnswerSimilarity(userAnswer: string, canonicalAnswer: string): AnswerSimilarity {
  const normalizedUser = normalizeText(userAnswer)
  if (!normalizedUser) {
    return { score: 0, label: 'incorrect' }
  }

  const expectedTokens = tokenize(canonicalAnswer)
  const userTokens = tokenize(userAnswer)
  const expectedKeywords = buildKeywordList(canonicalAnswer)
  const expectedSet = new Set(expectedKeywords)
  const userSet = new Set(userTokens)
  const matchedKeywords = expectedKeywords.filter(keyword => userSet.has(keyword))

  const keywordRecall = expectedSet.size > 0 ? matchedKeywords.length / expectedSet.size : 0
  const keywordPrecision = userSet.size > 0 ? matchedKeywords.length / userSet.size : 0
  const keywordF1 = keywordRecall + keywordPrecision > 0
    ? (2 * keywordRecall * keywordPrecision) / (keywordRecall + keywordPrecision)
    : 0

  const forwardBm25 = bm25Score(userTokens, expectedTokens)
  const reverseBm25 = bm25Score(expectedTokens, userTokens)
  const bm25 = (forwardBm25 + reverseBm25) / 2
  const trigramScore = diceCoefficient(charTrigrams(userAnswer), charTrigrams(canonicalAnswer))
  const lexicalScore = Math.max(
    0,
    Math.min(
      1,
      keywordF1 * 0.35 + bm25 * 0.5 + trigramScore * 0.15
    )
  )
  const enumerationScore = enumerationCoverageScore(userAnswer, canonicalAnswer)
  const score = enumerationScore == null
    ? lexicalScore
    : Math.max(lexicalScore * 0.45 + enumerationScore * 0.55, enumerationScore)

  let label: AnswerSimilarity['label'] = 'incorrect'
  if (score >= 0.68) label = 'correct'
  else if (score >= 0.4) label = 'partial'

  return { score, label }
}
