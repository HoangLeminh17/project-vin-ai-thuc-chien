export interface ParseResult {
  markdown: string
  contentList: any[]
}

export interface IDocumentParser {
  extractMarkdown(fileUrl: string, safeName: string): Promise<ParseResult>;
}
