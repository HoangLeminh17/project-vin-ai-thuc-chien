import { IStorageService } from '../ports/storage.port';
import { IDocumentParser, ParseResult } from '../ports/parser.port';
import { randomUUID } from 'crypto';

export interface ParseDocumentResult extends ParseResult {
  taskId: string;
}

export class ParseDocumentUseCase {
  constructor(
    private readonly storageService: IStorageService,
    private readonly documentParser: IDocumentParser
  ) { }

  async execute(file: Buffer, filename: string): Promise<ParseDocumentResult> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const taskId = randomUUID();
    const { publicUrl, filePath } = await this.storageService.upload(file, safeName);

    try {
      const result = await this.documentParser.extractMarkdown(publicUrl, safeName, taskId);
      return { ...result, taskId };
    } finally {
      if (filePath) {
        await this.storageService.delete(filePath);
      }
    }
  }
}
