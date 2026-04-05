import JSZip from 'jszip'
import { getBucket } from '@/lib/firebase-admin'
import type { ParsePDF } from './index'

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

async function uploadToFirebase(file: Buffer, filename: string): Promise<{ publicUrl: string; filePath: string }> {
  const filePath = `uploads/${Date.now()}_${filename}`
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
    }),
  })
  const data = await res.json()
  const taskId = data.data?.task_id
  if (!taskId) throw new Error(`MinerU: no task_id returned: ${JSON.stringify(data)}`)
  return taskId
}

// ── Step 3: Poll until done → download zip → extract full.md ──

async function pollAndExtract(taskId: string, timeoutMs = 300_000, intervalMs = 3_000): Promise<string> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const res = await mineruFetch(`/extract/task/${taskId}`, { method: 'GET' })
    const data = await res.json()
    const state = data.data?.state

    if (state === 'done') {
      const zipUrl = data.data?.full_zip_url
      if (!zipUrl) throw new Error('MinerU: task done but no full_zip_url')
      return downloadAndExtractMd(zipUrl)
    }

    if (state === 'failed') {
      throw new Error(`MinerU task failed: ${data.data?.err_msg || JSON.stringify(data.data)}`)
    }

    await new Promise((r) => setTimeout(r, intervalMs))
  }

  throw new Error(`MinerU task ${taskId} timed out after ${timeoutMs / 1000}s`)
}

async function downloadAndExtractMd(zipUrl: string): Promise<string> {
  const res = await fetch(zipUrl)
  if (!res.ok) throw new Error(`Failed to download zip (${res.status})`)

  const buf = await res.arrayBuffer()
  const zip = await JSZip.loadAsync(buf)

  // find full.md in the zip (may be nested in a folder)
  let mdFile: JSZip.JSZipObject | null = null
  zip.forEach((path, entry) => {
    if (path.endsWith('full.md') && !mdFile) {
      mdFile = entry
    }
  })

  if (!mdFile) throw new Error('full.md not found in zip archive')
  return (mdFile as JSZip.JSZipObject).async('string')
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

  const { publicUrl, filePath } = await uploadToFirebase(file, filename)

  try {
    const taskId = await submitExtractTask(publicUrl)
    return await pollAndExtract(taskId)
  } finally {
    await deleteFromFirebase(filePath)
  }
}
