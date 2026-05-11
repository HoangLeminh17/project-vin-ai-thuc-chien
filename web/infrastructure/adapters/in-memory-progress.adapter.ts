import { IProgressStore, ParseProgress } from '@/core/ports/progress.port'

export class InMemoryProgressStore implements IProgressStore {
  private store = new Map<string, ParseProgress>()

  async setProgress(taskId: string, progress: ParseProgress): Promise<void> {
    this.store.set(taskId, progress)
  }

  async getProgress(taskId: string): Promise<ParseProgress | null> {
    return this.store.get(taskId) ?? null
  }

  async clearProgress(taskId: string): Promise<void> {
    this.store.delete(taskId)
  }
}
