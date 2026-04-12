export interface UploadResult {
  publicUrl: string;
  filePath: string;
}

export interface IStorageService {
  upload(file: Buffer, safeName: string): Promise<UploadResult>;
  delete(filePath: string): Promise<void>;
}
