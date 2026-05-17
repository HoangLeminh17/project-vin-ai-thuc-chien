export type ParseProgress = { currentChunk: number; totalChunks: number; percentComplete: number }

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timeout = window.setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timeout)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

export async function pollParseProgress(
  taskId: string,
  onProgress: (progress: ParseProgress) => void,
  signal: AbortSignal,
  intervalMs = 2000,
): Promise<void> {
  while (!signal.aborted) {
    try {
      const progressRes = await fetch(`/api/parse-pdf/progress?taskId=${encodeURIComponent(taskId)}`, { signal })
      const progressData = await progressRes.json()
      if (progressData.success && progressData.progress) {
        onProgress({
          currentChunk: progressData.progress.currentChunk,
          totalChunks: progressData.progress.totalChunks,
          percentComplete: progressData.progress.percentComplete,
        })
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    }

    try {
      await wait(intervalMs, signal)
    } catch {
      return
    }
  }
}
