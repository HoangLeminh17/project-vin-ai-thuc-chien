import { IDocumentParser } from '@/core/ports/parser.port';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import { InfrastructureError } from '@/core/errors/domain-error'

export interface MineruConfig {
  baseUrl: string
  apiKey: string
  outputDir?: string
}

export class MineruParserAdapter implements IDocumentParser {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly outputDir: string

  constructor(config: MineruConfig) {
    this.baseUrl = config.baseUrl
    this.apiKey = config.apiKey
    this.outputDir = config.outputDir || path.join(process.cwd(), '.mineru-output')
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

  private async pollAndExtract(taskId: string, safeName: string, timeoutMs = 300_000, intervalMs = 3_000): Promise<string> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const res = await this.mineruFetch(`/extract/task/${taskId}`, { method: 'GET' });
      const data = await res.json();
      const state = data.data?.state;

      if (state === 'done') {
        const zipUrl = data.data?.full_zip_url;
        if (!zipUrl) throw new InfrastructureError('MinerU: task done but no full_zip_url');
        return this.downloadAndSave(zipUrl, safeName);
      }

      if (state === 'failed') {
        throw new InfrastructureError(`MinerU task failed: ${data.data?.err_msg || JSON.stringify(data.data)}`);
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new InfrastructureError(`MinerU task ${taskId} timed out after ${timeoutMs / 1000}s`);
  }

  private async downloadAndSave(zipUrl: string, safeName: string): Promise<string> {
    const res = await fetch(zipUrl);
    if (!res.ok) throw new InfrastructureError(`Failed to download zip (${res.status})`);

    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    const outDir = path.join(this.outputDir, safeName.replace(/\.pdf$/i, ''));
    await fs.mkdir(outDir, { recursive: true });

    let markdown = '';

    for (const [zipPath, entry] of Object.entries(zip.files)) {
      if (entry.dir) continue;
      const dest = path.join(outDir, zipPath);
      await fs.mkdir(path.dirname(dest), { recursive: true });

      if (zipPath.endsWith('full.md')) {
        markdown = await entry.async('string');
        await fs.writeFile(dest, markdown, 'utf-8');
      } else {
        const data = await entry.async('nodebuffer');
        await fs.writeFile(dest, data);
      }
    }

    if (!markdown) throw new InfrastructureError('full.md not found in zip archive');
    console.log(`[parse-pdf] Saved to ${outDir}`);
    return markdown;
  }

  async extractMarkdown(fileUrl: string, safeName: string): Promise<string> {
    const taskId = await this.submitExtractTask(fileUrl);
    return await this.pollAndExtract(taskId, safeName);
  }
}
