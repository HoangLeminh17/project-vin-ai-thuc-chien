export interface ParseProgress {
  currentChunk: number
  totalChunks: number
  currentPage: number
  totalPages: number
  percentComplete: number
}

export interface IProgressStore {
  setProgress(taskId: string, progress: ParseProgress): Promise<void>
  getProgress(taskId: string): Promise<ParseProgress | null>
  clearProgress(taskId: string): Promise<void>
}
