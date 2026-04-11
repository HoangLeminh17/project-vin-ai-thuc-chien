import fs from 'fs/promises';
import path from 'path';
import { IStorageService, UploadResult } from '@/core/ports/storage.port';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

export class LocalFsStorageAdapter implements IStorageService {
  async upload(file: Buffer, safeName: string): Promise<UploadResult> {
    const filename = `${Date.now()}_${safeName}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Ensure directory exists
    await fs.mkdir(UPLOADS_DIR, { recursive: true });

    // Write file to public/uploads
    await fs.writeFile(filePath, file);

    // WARNING: Mineru API requires public internet-accessible URLs.
    // If you are using this adapter on local (localhost), Mineru parsing will fail 
    // unless you use ngrok to expose your server, or you deploy this to a public VPS.
    // For local dev with Mineru, you generally need Firebase or similar public storage.
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const publicUrl = `${baseUrl}/uploads/${filename}`;
    
    return { publicUrl, filePath };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // non-critical, ignore
    }
  }
}
