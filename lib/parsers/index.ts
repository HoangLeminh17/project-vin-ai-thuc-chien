export type ParsePDF = (file: Buffer, filename: string) => Promise<string>

export { parsePDF } from './mineru'
