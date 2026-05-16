import { IDocumentParser, ParseResult } from '@/core/ports/parser.port';
import { IProgressStore } from '@/core/ports/progress.port';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import { InfrastructureError } from '@/core/errors/domain-error'
import { contentListToMarkdown } from './content-list-converter'
import { getBucket } from '@/lib/firebase-admin'
import { PDFDocument } from 'pdf-lib'
import { buildPdfPageRanges, mergeMineruChunkResults, splitPdfBufferByRanges, type MineruChunkResult } from './mineru-chunking'

type MarkdownCandidate = {
  path: string
  text: string
  priority: number
}

export interface MineruConfig {
  baseUrl: string
  apiKey: string
  outputDir?: string
}

function isContentListJsonPath(zipPath: string): boolean {
  const lowerPath = zipPath.toLowerCase()
  return lowerPath.endsWith('content_list.json') ||
    lowerPath.endsWith('content_list_v2.json') ||
    lowerPath.endsWith('_content_list_v2.json')
}

function normalizeContentList(parsed: unknown): any[] | null {
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
  private progressStore?: IProgressStore
  private currentTaskId?: string

  constructor(config: MineruConfig, progressStore?: IProgressStore) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
    this.outputDir = config.outputDir || path.join(process.cwd(), '.mineru-output')
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
        enable_formula: true,
        enable_table: true,
        language: 'vi',
        make_mode: 'content_list_v2',
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
          const parsedContentList = normalizeContentList(JSON.parse(data as string));
          if (parsedContentList?.length) {
            contentList = parsedContentList;
            markdown = contentListToMarkdown(contentList);
            if (markdown.trim()) {
              await fs.writeFile(path.join(outDir, 'content_list_parsed.md'), markdown, 'utf-8');
            }
          }
        } catch {
          console.warn(`[parse-pdf] Failed to parse content_list JSON from ${zipPath}`);
        }
      }
    }

    if (!markdown) {
      const fallback = markdownCandidates.sort((a, b) => a.priority - b.priority)[0];
      if (fallback) {
        markdown = fallback.text;
        console.warn(`[parse-pdf] Falling back to markdown output from ${fallback.path}; content_list JSON was missing or empty.`);
      }
    }

    if (!markdown) {
      const entryList = zipFileNames.slice(0, 20).join(', ') || 'no files';
      throw new InfrastructureError(`MinerU output zip did not contain readable markdown or content_list JSON. Entries: ${entryList}`);
    }

    console.log(`[parse-pdf] Saved to ${outDir}${pdfLocalPath ? `, pdf: ${pdfLocalPath}` : ''}`);
    return { markdown, contentList, pdfLocalPath };
  }

  private async deleteTempFile(filePath: string): Promise<void> {
    try {
      await getBucket().file(filePath).delete()
    } catch {
      // non-critical, ignore
    }
  }

  async extractMarkdown(fileUrl: string, safeName: string, taskId?: string): Promise<ParseResult> {
    this.currentTaskId = taskId
    
    const pdfBuffer = await this.downloadPdfBuffer(fileUrl)
    const pdfDocument = await PDFDocument.load(pdfBuffer)
    const pageCount = pdfDocument.getPageCount()

    if (pageCount <= 200) {
      await this.reportProgress(1, 1, pageCount)
      return await this.parseSingleDocument(fileUrl, safeName)
    }

    return await this.parseLargeDocument(safeName, pdfBuffer, pageCount)
  }
}
