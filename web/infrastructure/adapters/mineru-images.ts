import path from 'path'

export interface MineruImageContentItem {
  type?: string
  img_path?: string
  img_storage_path?: string
  img_url?: string
  image_mime_type?: string
  [key: string]: unknown
}

export interface UploadedMineruImage {
  storagePath: string
  url: string
  mimeType: string
}

const IMAGE_MIME_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

export function normalizeMineruAssetPath(value: string | undefined): string {
  if (!value) return ''
  return value
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '')
}

export function mimeTypeForImagePath(filePath: string | undefined): string {
  const ext = path.extname(filePath ?? '').toLowerCase()
  return IMAGE_MIME_TYPES[ext] ?? 'application/octet-stream'
}

export function buildLayoutImageStoragePath(
  userId: string,
  taskId: string,
  safeName: string,
  zipPath: string
): string {
  const safeDocName = safeName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.pdf$/i, '')
  const normalizedZipPath = normalizeMineruAssetPath(zipPath)
  const safeZipPath = normalizedZipPath
    .split('/')
    .filter(segment => segment && segment !== '.' && segment !== '..')
    .map(segment => segment.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join('/')

  return `course-layout-images/${userId}/${taskId}/${safeDocName}/${safeZipPath}`
}

export function layoutImageUrl(storagePath: string): string {
  return `/api/layout-image?path=${encodeURIComponent(storagePath)}`
}

export function attachImageSourcesToContentList<T extends MineruImageContentItem>(
  contentList: T[],
  imagesByPath: Map<string, UploadedMineruImage>
): (T & MineruImageContentItem)[] {
  return contentList.map((item): T & MineruImageContentItem => {
    if (item.type !== 'image') return item as T & MineruImageContentItem

    const imagePath = normalizeMineruAssetPath(item.img_path)
    const image = imagesByPath.get(imagePath)
    if (!image) return item as T & MineruImageContentItem

    return {
      ...item,
      img_path: imagePath,
      img_storage_path: image.storagePath,
      img_url: image.url,
      image_mime_type: image.mimeType,
    }
  })
}
