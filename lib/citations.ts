export type Segment =
  | { type: 'text'; value: string }
  | { type: 'cite'; chunkId: string; displayNum: number; valid: boolean }

const MARKER_RE = /\[(chunk-\d+-\d+)\]/g

export function parseCitations(
  text: string,
  validChunkIds: Set<string>,
  sharedMap?: Map<string, number>
): Segment[] {
  const segments: Segment[] = []
  const displayMap = sharedMap ?? new Map<string, number>()
  let counter = displayMap.size
  let lastIndex = 0

  MARKER_RE.lastIndex = 0
  let match
  while ((match = MARKER_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    const chunkId = match[1]
    if (!displayMap.has(chunkId)) {
      counter++
      displayMap.set(chunkId, counter)
    }
    segments.push({
      type: 'cite',
      chunkId,
      displayNum: displayMap.get(chunkId)!,
      valid: validChunkIds.has(chunkId),
    })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return segments
}
