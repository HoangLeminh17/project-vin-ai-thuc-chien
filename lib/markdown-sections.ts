/**
 * Extracts the body text of a ## section from a markdown string.
 * Matches the given heading (case-insensitive, trimmed) and returns all content
 * until the next ## heading. Returns empty string if the heading is not found.
 */
export function extractSection(markdown: string, heading: string): string {
  const target = heading.trim().toLowerCase()
  const lines = markdown.split('\n')
  let inSection = false
  const sectionLines: string[] = []

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/)
    if (h2Match) {
      if (inSection) break
      if (h2Match[1].trim().toLowerCase() === target) {
        inSection = true
      }
    } else if (inSection) {
      sectionLines.push(line)
    }
  }

  return sectionLines.join('\n').trim()
}
