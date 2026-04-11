export interface ParsePDFResult {
  markdown: string
  contentList?: any[]
}

export type ParsePDF = (file: Buffer, filename: string) => Promise<ParsePDFResult>

export { parsePDF } from './mineru'
