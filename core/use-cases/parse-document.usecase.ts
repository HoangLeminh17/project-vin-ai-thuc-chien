import { IStorageService } from '../ports/storage.port';
import { IDocumentParser } from '../ports/parser.port';

export class ParseDocumentUseCase {
  constructor(
    private readonly storageService: IStorageService,
    private readonly documentParser: IDocumentParser
  ) {}

  async execute(file: Buffer, filename: string): Promise<string> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const { publicUrl, filePath } = await this.storageService.upload(file, safeName);
    console.log(`[parse-document-usecase] Uploaded to storage URL: ${publicUrl}`);

    try {
      const markdown = await this.documentParser.extractMarkdown(publicUrl, safeName);
      return markdown;
    } finally {
      await this.storageService.delete(filePath);
      console.log(`[parse-document-usecase] Deleted temporary file: ${filePath}`);
    }
  }
}
