export interface ParseResult {
  markdown: string
  contentList: any[]
  pdfLocalPath?: string
}

export interface IDocumentParser {
  extractMarkdown(fileUrl: string, safeName: string): Promise<ParseResult>;
}
