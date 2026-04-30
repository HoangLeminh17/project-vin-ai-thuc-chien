'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
}

interface Metrics {
  status: 'up' | 'down';
  errorCountToday: number;
  averageLatencyMs: number;
}

export default function AdminMonitorPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 text-gray-900">
        <h1 className="text-2xl font-bold mb-6">System Monitor</h1>
        <p>Loading system metrics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">System Monitor</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm font-medium">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">System Status</h3>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${metrics?.status === 'up' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-2xl font-bold capitalize">{metrics?.status || 'Unknown'}</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Errors (Last 24h)</h3>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${(metrics?.errorCountToday || 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {metrics?.errorCountToday || 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Avg Latency</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{metrics?.averageLatencyMs || 0} ms</span>
            </div>
          </div>
        </div>

        {/* Real-time Log Stream */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Real-time Log Stream</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 bg-gray-900 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No logs available</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="border-b border-gray-800 pb-1 mb-1 break-words">
                    <span className="text-gray-500 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <span className={`font-bold mr-2 ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'debug' ? 'text-gray-400' :
                      'text-green-400'
                    }`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-gray-300">{log.message}</span>
                    {log.context && (
                      <span className="text-gray-500 ml-2">
                        {JSON.stringify(log.context)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
