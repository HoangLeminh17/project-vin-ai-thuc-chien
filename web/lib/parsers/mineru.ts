import JSZip from 'jszip'
import { getBucket } from '@/lib/firebase-admin'
import type { ParsePDF, ParsePDFResult } from './index'
import fs from 'fs/promises'
import path from 'path'
import { contentListToMarkdown } from '@/infrastructure/adapters/content-list-converter'
import { logger } from '@/infrastructure/di/logger.di'

const BASE_URL = process.env.PDF_MINERU_BASE_URL!
const API_KEY = process.env.PDF_MINERU_API_KEY!

// ── helpers ──

async function mineruFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`MinerU ${path} failed (${res.status}): ${body}`)
  }
  return res
}

// ── Step 1: Upload to Firebase Storage → public URL ──

async function uploadToFirebase(file: Buffer, safeName: string): Promise<{ publicUrl: string; filePath: string }> {
  const filePath = `uploads/${Date.now()}_${safeName}`
  const bucket = getBucket()
  const fileRef = bucket.file(filePath)

  await fileRef.save(file, {
    metadata: { contentType: 'application/pdf' },
  })

  await fileRef.makePublic()

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`
  return { publicUrl, filePath }
}

// ── Step 2: Submit extract task ──

async function submitExtractTask(fileUrl: string): Promise<string> {
  const res = await mineruFetch('/extract/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: fileUrl,
      enable_formula: true,
      enable_table: true,
      language: 'vi',
      // content_list_v2 returns structured content blocks alongside markdown.
      // NOTE: if MinerU API doesn't support this param, it should be silently ignored.
      // Check MinerU docs to confirm support.
      make_mode: 'content_list_v2',
    }),
  })
  const data = await res.json()
  const taskId = data.data?.task_id
  if (!taskId) throw new Error(`MinerU: no task_id returned: ${JSON.stringify(data)}`)
  return taskId
}

// ── Step 3: Poll until done → download zip → save to .mineru-output/ ──

const OUTPUT_DIR = path.join(process.cwd(), '.mineru-output')

async function pollAndExtract(taskId: string, safeName: string, timeoutMs = 300_000, intervalMs = 3_000): Promise<ParsePDFResult> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const res = await mineruFetch(`/extract/task/${taskId}`, { method: 'GET' })
    const data = await res.json()
    const state = data.data?.state

    if (state === 'done') {
      const zipUrl = data.data?.full_zip_url
      if (!zipUrl) throw new Error('MinerU: task done but no full_zip_url')
      return downloadAndSave(zipUrl, safeName)
    }

    if (state === 'failed') {
      throw new Error(`MinerU task failed: ${data.data?.err_msg || JSON.stringify(data.data)}`)
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error(`MinerU task ${taskId} timed out after ${timeoutMs / 1000}s`)
}

async function downloadAndSave(zipUrl: string, safeName: string): Promise<ParsePDFResult> {
  const res = await fetch(zipUrl)
  if (!res.ok) throw new Error(`Failed to download zip (${res.status})`)

  const buf = await res.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)

  const outDir = path.join(OUTPUT_DIR, safeName.replace(/\.pdf$/i, ''))
  await fs.mkdir(outDir, { recursive: true })

  let markdown = ''
  let contentList: any[] | undefined

  for (const [zipPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue
    const dest = path.join(outDir, zipPath)
    await fs.mkdir(path.dirname(dest), { recursive: true })

    const data = zipPath.endsWith('.md') || zipPath.endsWith('.json')
      ? await entry.async('string')
      : await entry.async('nodebuffer')

    await fs.writeFile(dest, data, typeof data === 'string' ? 'utf-8' : undefined)

    if (zipPath.endsWith('content_list.json') || zipPath.endsWith('_content_list_v2.json')) {
      try {
        contentList = JSON.parse(data as string)
        markdown = contentListToMarkdown(contentList ?? [])
      } catch {
        logger.warn('[parse-pdf] Failed to parse content_list JSON', { zipPath })
      }
    }
  }

  if (!markdown) throw new Error('content_list.json not found or empty in zip archive')
  logger.info('[parse-pdf] Saved output', { outDir })
  return { markdown, contentList }
}

// ── Step 4: Cleanup Firebase file ──

async function deleteFromFirebase(filePath: string): Promise<void> {
  try {
    await getBucket().file(filePath).delete()
  } catch {
    // non-critical, ignore
  }
}

// ── Main export ──

export const parsePDF: ParsePDF = async (file, filename) => {
  if (!BASE_URL || !API_KEY) {
    throw new Error('Missing PDF_MINERU_BASE_URL or PDF_MINERU_API_KEY in env')
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const { publicUrl, filePath } = await uploadToFirebase(file, safeName)
  logger.info('[parse-pdf] Firebase URL', { publicUrl })

  try {
    const taskId = await submitExtractTask(publicUrl)
    return await pollAndExtract(taskId, safeName)
  } finally {
    await deleteFromFirebase(filePath)
  }
}
