import { IDocumentParser } from '@/core/ports/parser.port';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';

const BASE_URL = process.env.PDF_MINERU_BASE_URL!;
const API_KEY = process.env.PDF_MINERU_API_KEY!;
const OUTPUT_DIR = path.join(process.cwd(), '.mineru-output');

export class MineruParserAdapter implements IDocumentParser {
  private async mineruFetch(apiPath: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(`${BASE_URL}${apiPath}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`MinerU ${apiPath} failed (${res.status}): ${body}`);
    }
    return res;
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
    if (!taskId) throw new Error(`MinerU: no task_id returned: ${JSON.stringify(data)}`);
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
        if (!zipUrl) throw new Error('MinerU: task done but no full_zip_url');
        return this.downloadAndSave(zipUrl, safeName);
      }

      if (state === 'failed') {
        throw new Error(`MinerU task failed: ${data.data?.err_msg || JSON.stringify(data.data)}`);
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    throw new Error(`MinerU task ${taskId} timed out after ${timeoutMs / 1000}s`);
  }

  private async downloadAndSave(zipUrl: string, safeName: string): Promise<string> {
    const res = await fetch(zipUrl);
    if (!res.ok) throw new Error(`Failed to download zip (${res.status})`);

    const buf = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);

    const outDir = path.join(OUTPUT_DIR, safeName.replace(/\.pdf$/i, ''));
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

    if (!markdown) throw new Error('full.md not found in zip archive');
    console.log(`[parse-pdf] Saved to ${outDir}`);
    return markdown;
  }

  async extractMarkdown(fileUrl: string, safeName: string): Promise<string> {
    if (!BASE_URL || !API_KEY) {
      throw new Error('Missing PDF_MINERU_BASE_URL or PDF_MINERU_API_KEY in env');
    }
    const taskId = await this.submitExtractTask(fileUrl);
    return await this.pollAndExtract(taskId, safeName);
  }
}
