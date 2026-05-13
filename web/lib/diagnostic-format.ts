import type { ContentChunk } from '@/core/ports/ai.port'

export function formatDiagnosticChunk(chunk: ContentChunk): string {
  const markers = [
    `[[SOURCE_CHUNK_ID: ${chunk.id}]]`,
    chunk.kc_id ? `[[KC_ID: ${chunk.kc_id}]]` : '',
    chunk.kc_name ? `[[KC_NAME: ${chunk.kc_name}]]` : '',
    chunk.module_id ? `[[MODULE_ID: ${chunk.module_id}]]` : '',
    chunk.module_name ? `[[MODULE_NAME: ${chunk.module_name}]]` : '',
  ].filter(Boolean)

  return `${markers.join('\n')}\n${chunk.text}`
}
