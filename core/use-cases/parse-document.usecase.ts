import { IStorageService } from '../ports/storage.port';
import { IDocumentParser } from '../ports/parser.port';

export class ParseDocumentUseCase {
  constructor(
    private readonly storageService: IStorageService,
    private readonly documentParser: IDocumentParser
  ) { }

  async execute(file: Buffer, filename: string): Promise<string> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const { publicUrl, filePath } = await this.storageService.upload(file, safeName);

    try {
      const markdown = await this.documentParser.extractMarkdown(publicUrl, safeName);
      return markdown;
    } finally {
      if (filePath) {
        await this.storageService.delete(filePath);
      }
    }
  }
}
