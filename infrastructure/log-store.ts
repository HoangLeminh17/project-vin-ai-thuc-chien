export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
}

export class InMemoryLogStore {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 500;

  addLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  getLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(0, limit);
  }

  getMetricsSummary() {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    let errorCount = 0;
    let latencySum = 0;
    let latencyCount = 0;

    for (const log of this.logs) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime < last24h) break;

      if (log.level === 'error') {
        errorCount++;
      }

      if (log.context && typeof log.context.durationMs === 'number') {
        latencySum += log.context.durationMs;
        latencyCount++;
      }
    }

    return {
      status: errorCount > 50 ? 'down' : 'up',
      errorCountToday: errorCount,
      averageLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
    };
  }
}

export const logStore = new InMemoryLogStore();
