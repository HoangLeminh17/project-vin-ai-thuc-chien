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

export interface MineruConfig {
  baseUrl: string
  apiKey: string
  outputDir?: string
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

    for (const [zipPath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const dest = path.join(outDir, zipPath);
      await fs.mkdir(path.dirname(dest), { recursive: true });

      const data = zipPath.endsWith('.md') || zipPath.endsWith('.json')
        ? await entry.async('string')
        : await entry.async('nodebuffer');

      await fs.writeFile(dest, data, typeof data === 'string' ? 'utf-8' : undefined);

      if (zipPath.endsWith('_origin.pdf')) {
        pdfLocalPath = dest;
      }

      if (zipPath.endsWith('content_list.json') || zipPath.endsWith('_content_list_v2.json')) {
        try {
          contentList = JSON.parse(data as string);
          markdown = contentListToMarkdown(contentList);
          await fs.writeFile(path.join(outDir, 'content_list_parsed.md'), markdown, 'utf-8');
        } catch {
          console.warn(`[parse-pdf] Failed to parse content_list JSON from ${zipPath}`);
        }
      }
    }

    if (!markdown) throw new InfrastructureError('content_list.json not found or empty in zip archive');
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
