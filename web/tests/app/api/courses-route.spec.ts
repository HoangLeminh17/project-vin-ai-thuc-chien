import { describe, expect, it } from 'vitest'

import { isOwnedStoragePath } from '@/lib/storage-paths'

describe('isOwnedStoragePath', () => {
  it('accepts owned PDF and layout storage paths', () => {
    expect(isOwnedStoragePath('course-pdfs/user_123/file.pdf', 'user_123', 'course-pdfs')).toBe(true)
    expect(isOwnedStoragePath('course-layouts/user_123/layout.json', 'user_123', 'course-layouts')).toBe(true)
  })

  it('rejects paths outside the authenticated user prefix', () => {
    expect(isOwnedStoragePath('course-pdfs/other/file.pdf', 'user_123', 'course-pdfs')).toBe(false)
    expect(isOwnedStoragePath('course-layouts/other/layout.json', 'user_123', 'course-layouts')).toBe(false)
    expect(isOwnedStoragePath('course-layouts/user_123/layout.json', 'user_123', 'course-pdfs')).toBe(false)
  })

  it('rejects malformed paths and traversal-like segments', () => {
    expect(isOwnedStoragePath(undefined, 'user_123', 'course-pdfs')).toBe(false)
    expect(isOwnedStoragePath('course-pdfs/user_123/', 'user_123', 'course-pdfs')).toBe(false)
    expect(isOwnedStoragePath('course-pdfs/user_123/../other.pdf', 'user_123', 'course-pdfs')).toBe(false)
    expect(isOwnedStoragePath('course-pdfs/user_123//file.pdf', 'user_123', 'course-pdfs')).toBe(false)
  })
})
