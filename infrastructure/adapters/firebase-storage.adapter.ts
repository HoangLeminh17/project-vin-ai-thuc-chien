import { IStorageService, UploadResult } from '@/core/ports/storage.port';
import { getBucket } from '@/lib/firebase-admin';

export class FirebaseStorageAdapter implements IStorageService {
  async upload(file: Buffer, safeName: string): Promise<UploadResult> {
    const filePath = `uploads/${Date.now()}_${safeName}`;
    const bucket = getBucket();
    const fileRef = bucket.file(filePath);

    await fileRef.save(file, {
      metadata: { contentType: 'application/pdf' },
    });

    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    return { publicUrl, filePath };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await getBucket().file(filePath).delete();
    } catch {
      // non-critical, ignore
    }
  }
}
