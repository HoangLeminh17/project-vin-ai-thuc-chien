import { IDocumentParser, ParseResult } from '@/core/ports/parser.port';
import { IProgressStore } from '@/core/ports/progress.port';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import { InfrastructureError } from '@/core/errors/domain-error'
import { logger } from '@/infrastructure/di/logger.di'
import { contentListToMarkdown } from './content-list-converter'
import { getBucket } from '@/lib/firebase-admin'
import { PDFDocument } from 'pdf-lib'
import { buildPdfPageRanges, mergeMineruChunkResults, splitPdfBufferByRanges, type MineruChunkResult } from './mineru-chunking'
import {
  attachImageSourcesToContentList,
  buildLayoutImageStoragePath,
  layoutImageUrl,
  mimeTypeForImagePath,
  normalizeMineruAssetPath,
  type UploadedMineruImage,
} from './mineru-images'

type MarkdownCandidate = {
  path: string
  text: string
  priority: number
}

type MineruModelVersion = 'pipeline' | 'vlm' | 'MinerU-HTML'

export interface MineruConfig {
  baseUrl: string
  apiKey: string
  outputDir?: string
  modelVersion?: MineruModelVersion
}

function isContentListJsonPath(zipPath: string): boolean {
  const lowerPath = zipPath.toLowerCase()
  return lowerPath.endsWith('content_list.json') ||
    lowerPath.endsWith('content_list_v2.json') ||
    lowerPath.endsWith('_content_list_v2.json')
}

function isContentListV2Path(zipPath: string): boolean {
  return zipPath.toLowerCase().endsWith('content_list_v2.json')
}

function flattenInlineContent(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(flattenInlineContent).filter(Boolean).join('')
  if (!value || typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  if (typeof record.content === 'string') return record.content
  if (Array.isArray(record.children)) return flattenInlineContent(record.children)
  return ''
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => flattenInlineContent(item).trim())
    .filter(Boolean)
}

function convertContentListV2PageItem(item: Record<string, unknown>, pageIdx: number) {
  const type = typeof item.type === 'string' ? item.type : ''
  const content = item.content && typeof item.content === 'object'
    ? item.content as Record<string, unknown>
    : {}
  const base = {
    bbox: item.bbox,
    page_idx: pageIdx,
  }

  if (type === 'title') {
    return {
      ...base,
      type: 'text',
      text: flattenInlineContent(content.title_content).trim(),
      text_level: Number(content.level) || 1,
    }
  }

  if (type === 'paragraph') {
    return {
      ...base,
      type: 'text',
      text: flattenInlineContent(content.paragraph_content).trim(),
    }
  }

  if (type === 'equation_interline') {
    return {
      ...base,
      type: 'text',
      text: flattenInlineContent(content.math_content).trim(),
    }
  }

  if (type === 'table') {
    return {
      ...base,
      type: 'table',
      img_path: content.img_path,
      table_caption: normalizeStringList(content.table_caption),
      table_footnote: normalizeStringList(content.table_footnote),
      table_body: flattenInlineContent(content.table_body || content.html || content.content).trim(),
    }
  }

  if (type === 'image' || type === 'chart') {
    return {
      ...base,
      type: 'image',
      img_path: content.img_path,
      sub_type: type === 'chart' ? 'chart' : item.sub_type,
      image_caption: normalizeStringList(content.image_caption || content.chart_caption),
      image_footnote: normalizeStringList(content.image_footnote || content.chart_footnote),
      text: flattenInlineContent(content.content).trim(),
    }
  }

  if (type === 'code' || type === 'algorithm') {
    return {
      ...base,
      type: 'text',
      text: flattenInlineContent(content.code_content || content.algorithm_content).trim(),
    }
  }

  if (type === 'list' || type === 'index') {
    return {
      ...base,
      type: 'text',
      text: normalizeStringList(content.list_items).join('\n'),
    }
  }

  if (type.startsWith('page_')) {
    return {
      ...base,
      type: 'discarded',
      text: flattenInlineContent(content[`${type}_content`]).trim(),
    }
  }

  return null
}

function convertContentListV2(parsed: unknown): any[] | null {
  if (!Array.isArray(parsed) || !parsed.every(page => Array.isArray(page))) return null

  return parsed.flatMap((page, pageIdx) =>
    (page as unknown[])
      .map(item => item && typeof item === 'object'
        ? convertContentListV2PageItem(item as Record<string, unknown>, pageIdx)
        : null)
      .filter(Boolean),
  )
}

function normalizeContentList(parsed: unknown, zipPath: string): any[] | null {
  if (isContentListV2Path(zipPath)) {
    return convertContentListV2(parsed)
  }

  if (Array.isArray(parsed)) return parsed
  if (!parsed || typeof parsed !== 'object') return null

  const maybeRecord = parsed as Record<string, unknown>
  if (Array.isArray(maybeRecord.content_list)) return maybeRecord.content_list
  if (Array.isArray(maybeRecord.contentList)) return maybeRecord.contentList
  if (Array.isArray(maybeRecord.data)) return maybeRecord.data
  return null
}

function markdownPriority(zipPath: string): number {
  const fileName = zipPath.split('/').pop()?.toLowerCase() ?? zipPath.toLowerCase()
  if (fileName === 'content_list_parsed.md') return 0
  if (fileName === 'full.md') return 1
  return 2
}

export class MineruParserAdapter implements IDocumentParser {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly outputDir: string
  private readonly modelVersion: MineruModelVersion
  private progressStore?: IProgressStore
  private currentTaskId?: string
  private currentUserId?: string

  constructor(config: MineruConfig, progressStore?: IProgressStore) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
    this.outputDir = config.outputDir || path.join(process.cwd(), '.mineru-output')
    this.modelVersion = config.modelVersion ?? 'vlm'
    this.progressStore = progressStore
  }

  private async reportProgress(currentChunk: number, totalChunks: number, totalPages: number) {
    if (!this.progressStore || !this.currentTaskId) return
    
    await this.progressStore.setProgress(this.currentTaskId, {
      currentChunk,
      totalChunks,
      currentPage: Math.min(currentChunk * 200, totalPages),
      totalPages,
      percentComplete: Math.round((currentChunk / totalChunks) * 100),
    })
  }

  private async mineruFetch(apiPath: string, init?: RequestInit): Promise<Response> {
    try {
      const res = await fetch(`${this.baseUrl}${apiPath}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...init?.headers,
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status === 401) {
          throw new InfrastructureError(
            `MinerU authentication failed (401). Check PDF_MINERU_API_KEY (and PDF_MINERU_BASE_URL).`
          );
        }
        throw new InfrastructureError(`MinerU ${apiPath} failed (${res.status}): ${body}`);
      }
      return res;
    } catch (e) {
      if (e instanceof InfrastructureError) throw e;
      throw new InfrastructureError(`Connection error to MinerU API: ${apiPath}`, e);
    }
  }

  private async downloadPdfBuffer(fileUrl: string): Promise<Buffer> {
    const res = await fetch(fileUrl)
    if (!res.ok) {
      throw new InfrastructureError(`Failed to download PDF (${res.status}) from storage`)
    }

    return Buffer.from(await res.arrayBuffer())
  }

  private async uploadTempPdf(fileBuffer: Buffer, destPath: string): Promise<{ publicUrl: string; filePath: string }> {
    const bucket = getBucket()
    const fileRef = bucket.file(destPath)

    await fileRef.save(fileBuffer, {
      metadata: { contentType: 'application/pdf' },
    })

    await fileRef.makePublic()

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destPath}`
    return { publicUrl, filePath: destPath }
  }

  private async submitExtractTask(fileUrl: string): Promise<string> {
    const res = await this.mineruFetch('/extract/task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: fileUrl,
        model_version: this.modelVersion,
        enable_formula: true,
        enable_table: true,
        language: 'vi',
      }),
    });
    const data = await res.json();
    const taskId = data.data?.task_id;
    if (!taskId) throw new InfrastructureError(`MinerU: no task_id returned: ${JSON.stringify(data)}`);
    return taskId;
  }

  private async parseSingleDocument(fileUrl: string, safeName: string): Promise<ParseResult> {
    const taskId = await this.submitExtractTask(fileUrl)
    return await this.pollAndExtract(taskId, safeName)
  }

  private async parseLargeDocument(safeName: string, pdfBuffer: Buffer, pageCount: number): Promise<ParseResult> {
    const pageRanges = buildPdfPageRanges(pageCount)
    const chunkBuffers = await splitPdfBufferByRanges(pdfBuffer, pageRanges)
    const tempFiles: string[] = []
    const chunkResults: MineruChunkResult[] = []
    const baseName = safeName.replace(/\.pdf$/i, '')

    try {
      for (const [chunkIndex, chunkBuffer] of chunkBuffers.entries()) {
        const pageRange = pageRanges[chunkIndex]
        const chunkTag = `part-${String(chunkIndex + 1).padStart(2, '0')}_${pageRange.startPage}-${pageRange.endPage}`
        const destPath = `uploads/mineru-chunks/${Date.now()}_${baseName}_${chunkTag}.pdf`
        const { publicUrl, filePath } = await this.uploadTempPdf(chunkBuffer, destPath)
        tempFiles.push(filePath)

        const chunkResult = await this.parseSingleDocument(publicUrl, `${baseName}_${chunkTag}`)
        chunkResults.push({
          ...chunkResult,
          chunkIndex,
          pageRange,
        })

        await this.reportProgress(chunkIndex + 1, chunkBuffers.length, pageCount)
      }

      const mergedContentList = mergeMineruChunkResults(chunkResults)
      const markdown = contentListToMarkdown(mergedContentList)

      return {
        markdown,
        contentList: mergedContentList,
      }
    } finally {
      await Promise.all(tempFiles.map((filePath) => this.deleteTempFile(filePath)))
    }
  }

  private async pollAndExtract(taskId: string, safeName: string, timeoutMs = 900_000, intervalMs = 3_000): Promise<ParseResult> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const res = await this.mineruFetch(`/extract/task/${taskId}`, { method: 'GET' });
      const data = await res.json();
      const state = data.data?.state;

      if (state === 'done') {
        const zipUrl = data.data?.full_zip_url;
        if (!zipUrl) throw new InfrastructureError('MinerU: task done but no full_zip_url');
        return await this.downloadAndSave(zipUrl, safeName);
      }

      if (state === 'failed') {
        throw new InfrastructureError(`MinerU task failed: ${data.data?.err_msg || JSON.stringify(data.data)}`);
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new InfrastructureError(`MinerU task ${taskId} timed out after ${timeoutMs / 1000}s`);
  }

  private async downloadAndSave(zipUrl: string, safeName: string): Promise<ParseResult> {
    const res = await fetch(zipUrl);
    if (!res.ok) throw new InfrastructureError(`Failed to download zip (${res.status})`);

    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    const outDir = path.join(this.outputDir, safeName.replace(/\.pdf$/i, ''));
    await fs.mkdir(outDir, { recursive: true });

    let contentList: any[] = [];
    let markdown = '';
    let pdfLocalPath: string | undefined;
    const markdownCandidates: MarkdownCandidate[] = [];
    const zipFileNames: string[] = [];
    const imagesByPath = new Map<string, UploadedMineruImage>();

    for (const [zipPath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const normalizedZipPath = zipPath.replace(/\\/g, '/');
      zipFileNames.push(normalizedZipPath);
      const dest = path.join(outDir, zipPath);
      await fs.mkdir(path.dirname(dest), { recursive: true });

      const data = zipPath.endsWith('.md') || zipPath.endsWith('.json')
        ? await entry.async('string')
        : await entry.async('nodebuffer');

      await fs.writeFile(dest, data, typeof data === 'string' ? 'utf-8' : undefined);

      const uploadedImage = await this.uploadLayoutImage(normalizedZipPath, data, safeName);
      if (uploadedImage) {
        const imagePath = normalizeMineruAssetPath(normalizedZipPath)
        imagesByPath.set(imagePath, uploadedImage);
        const imageDirIndex = imagePath.indexOf('images/')
        if (imageDirIndex > 0) {
          imagesByPath.set(imagePath.slice(imageDirIndex), uploadedImage)
        }
      }

      if (zipPath.endsWith('_origin.pdf')) {
        pdfLocalPath = dest;
      }

      if (typeof data === 'string' && normalizedZipPath.toLowerCase().endsWith('.md') && data.trim()) {
        markdownCandidates.push({
          path: normalizedZipPath,
          text: data.trim(),
          priority: markdownPriority(normalizedZipPath),
        });
      }

      if (isContentListJsonPath(normalizedZipPath)) {
        try {
          const parsedContentList = normalizeContentList(JSON.parse(data as string), normalizedZipPath);
          if (parsedContentList?.length) {
            contentList = parsedContentList;
            markdown = contentListToMarkdown(contentList);
          }
        } catch {
          logger.warn('[parse-pdf] Failed to parse content_list JSON', { zipPath })
        }
      }
    }

    if (contentList.length > 0) {
      contentList = attachImageSourcesToContentList(contentList, imagesByPath);
      const contentListMarkdown = contentListToMarkdown(contentList);
      if (contentListMarkdown.trim()) {
        markdown = contentListMarkdown;
        await fs.writeFile(path.join(outDir, 'content_list_parsed.md'), markdown, 'utf-8');
      }
    }

    if (!markdown) {
      const fallback = markdownCandidates.sort((a, b) => a.priority - b.priority)[0];
      if (fallback) {
        markdown = fallback.text;
        logger.warn('[parse-pdf] Falling back to markdown output; content_list JSON missing/empty', { path: fallback.path })
      }
    }

    if (!markdown) {
      const entryList = zipFileNames.slice(0, 20).join(', ') || 'no files';
      throw new InfrastructureError(`MinerU output zip did not contain readable markdown or content_list JSON. Entries: ${entryList}`);
    }

    logger.info('[parse-pdf] Saved output', { outDir, pdfLocalPath })
    return { markdown, contentList, pdfLocalPath };
  }

  private async uploadLayoutImage(zipPath: string, data: string | Buffer, safeName: string): Promise<UploadedMineruImage | null> {
    if (!this.currentUserId || !this.currentTaskId || !Buffer.isBuffer(data)) return null

    const normalizedPath = normalizeMineruAssetPath(zipPath)
    const mimeType = mimeTypeForImagePath(normalizedPath)
    if (!normalizedPath || !mimeType.startsWith('image/')) return null

    try {
      const storagePath = buildLayoutImageStoragePath(this.currentUserId, this.currentTaskId, safeName, normalizedPath)
      await getBucket().file(storagePath).save(data, {
        metadata: {
          cacheControl: 'private, max-age=31536000',
          contentType: mimeType,
        },
      })
      return {
        storagePath,
        url: layoutImageUrl(storagePath),
        mimeType,
      }
    } catch {
      return null
    }
  }

  private async deleteTempFile(filePath: string): Promise<void> {
    try {
      await getBucket().file(filePath).delete()
    } catch {
      // non-critical, ignore
    }
  }

  async extractMarkdown(fileUrl: string, safeName: string, taskId?: string, userId?: string): Promise<ParseResult> {
    this.currentTaskId = taskId
    this.currentUserId = userId
    
    try {
      const pdfBuffer = await this.downloadPdfBuffer(fileUrl)
      const pdfDocument = await PDFDocument.load(pdfBuffer)
      const pageCount = pdfDocument.getPageCount()

      if (pageCount <= 200) {
        await this.reportProgress(1, 1, pageCount)
        return await this.parseSingleDocument(fileUrl, safeName)
      }

      return await this.parseLargeDocument(safeName, pdfBuffer, pageCount)
    } finally {
      this.currentTaskId = undefined
      this.currentUserId = undefined
    }
  }
}
