import { IStorageService, UploadResult } from '@/core/ports/storage.port';
import type { Bucket } from '@google-cloud/storage';

export class FirebaseStorageAdapter implements IStorageService {
  constructor(private readonly bucket: Bucket) {}

  async upload(file: Buffer, safeName: string): Promise<UploadResult> {
    const filePath = `uploads/${Date.now()}_${safeName}`;
    const fileRef = this.bucket.file(filePath);

    await fileRef.save(file, {
      metadata: { contentType: 'application/pdf' },
    });

    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filePath}`;
    return { publicUrl, filePath };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await this.bucket.file(filePath).delete();
    } catch {
      // non-critical, ignore
    }
  }
}
