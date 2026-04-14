export interface IDocumentParser {
  extractMarkdown(fileUrl: string, safeName: string): Promise<string>;
}
