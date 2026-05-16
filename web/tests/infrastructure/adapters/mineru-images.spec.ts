import { describe, expect, it } from 'vitest'
import {
  attachImageSourcesToContentList,
  buildLayoutImageStoragePath,
  layoutImageUrl,
  mimeTypeForImagePath,
  normalizeMineruAssetPath,
  type UploadedMineruImage,
} from '@/infrastructure/adapters/mineru-images'

describe('mineru image helpers', () => {
  it('normalizes MinerU image paths before lookup', () => {
    const images = new Map<string, UploadedMineruImage>([
      ['images/a.jpg', {
        storagePath: 'course-layout-images/u1/t1/doc/images/a.jpg',
        url: '/api/layout-image?path=encoded',
        mimeType: 'image/jpeg',
      }],
    ])

    const [item] = attachImageSourcesToContentList([
      { type: 'image', img_path: '.\\images\\a.jpg', page_idx: 0 },
    ], images)

    expect(item.img_path).toBe('images/a.jpg')
    expect(item.img_storage_path).toBe('course-layout-images/u1/t1/doc/images/a.jpg')
    expect(item.img_url).toBe('/api/layout-image?path=encoded')
    expect(item.image_mime_type).toBe('image/jpeg')
  })

  it('leaves image items untouched when upload metadata is absent', () => {
    const original = { type: 'image', img_path: 'images/missing.png', page_idx: 2 }
    const [item] = attachImageSourcesToContentList([original], new Map())

    expect(item).toBe(original)
    expect(item.img_storage_path).toBeUndefined()
    expect(item.img_url).toBeUndefined()
  })

  it('builds user-scoped storage paths and route URLs', () => {
    const storagePath = buildLayoutImageStoragePath('user-1', 'task-1', 'source.pdf', '../images/a b.png')

    expect(storagePath).toBe('course-layout-images/user-1/task-1/source/images/a_b.png')
    expect(layoutImageUrl(storagePath)).toBe(`/api/layout-image?path=${encodeURIComponent(storagePath)}`)
  })

  it('detects supported browser image mime types', () => {
    expect(mimeTypeForImagePath('images/a.PNG')).toBe('image/png')
    expect(mimeTypeForImagePath('images/a.webp')).toBe('image/webp')
    expect(mimeTypeForImagePath('images/a.bin')).toBe('application/octet-stream')
  })

  it('removes leading separators from MinerU asset paths', () => {
    expect(normalizeMineruAssetPath('/images/a.jpg')).toBe('images/a.jpg')
    expect(normalizeMineruAssetPath('./images/a.jpg')).toBe('images/a.jpg')
  })
})
