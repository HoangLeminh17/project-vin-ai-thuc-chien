'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';


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

interface TokenUsageRecord {
  timestamp: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  type: string;
}

export default function AdminMonitorPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [usage, setUsage] = useState<{ daily: any[], recent: TokenUsageRecord[] }>({ daily: [], recent: [] });
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filterLevel, setFilterLevel] = useState<'all' | 'error'>('all');
  const [filterHighLatency, setFilterHighLatency] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || role !== 'admin') return;

    try {
      const [logsRes, usageRes] = await Promise.all([
        fetch('/api/admin/logs'),
        fetch('/api/admin/usage')
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs);
        setMetrics(data.metrics);
      }

      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage({ daily: data.daily || [], recent: data.recent || [] });
      }
    } catch (err) {
      console.error('Failed to fetch monitoring data', err);
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      // Small delay to allow the user to see what's happening or just redirect
      const timer = setTimeout(() => router.push('/dashboard'), 3000);
      return () => clearTimeout(timer);
    }
    
    if (user && role === 'admin') {
      fetchData();
      const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [user, role, authLoading, router, fetchData]);

  const totalTokensToday = usage.daily.length > 0 
    ? usage.daily[usage.daily.length - 1].total 
    : 0;

  // Filtered logs logic
  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'error' && log.level !== 'error') return false;
    if (filterHighLatency) {
      const latency = log.context?.durationMs || 0;
      if (latency < 3000) return false;
    }
    return true;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 15.632c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-8">
            You do not have the required permissions to view this dashboard. 
            Redirecting you back to safety...
          </p>
          <Link href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors w-full">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">System Monitor</h1>
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm font-medium">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Tokens Today</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-indigo-600">
                {totalTokensToday.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Real-time Log Stream */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Real-time Log Stream</h2>
              <div className="flex items-center gap-3">
                {/* Filters */}
                <div className="flex bg-gray-200 p-0.5 rounded-lg text-[10px]">
                  <button 
                    onClick={() => setFilterLevel('all')}
                    className={`px-2 py-1 rounded-md transition-all ${filterLevel === 'all' ? 'bg-white shadow-sm font-bold text-gray-900' : 'text-gray-500'}`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setFilterLevel('error')}
                    className={`px-2 py-1 rounded-md transition-all ${filterLevel === 'error' ? 'bg-red-500 text-white font-bold' : 'text-gray-500'}`}
                  >
                    Errors
                  </button>
                </div>
                <button 
                  onClick={() => setFilterHighLatency(!filterHighLatency)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    filterHighLatency 
                      ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  High Latency
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-gray-900 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">No logs match the current filters</div>
              ) : (
                <div className="space-y-1">
                  {filteredLogs.map((log) => (
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
                      {log.context?.durationMs && (
                        <span className={`ml-2 px-1 rounded text-[10px] ${log.context.durationMs > 3000 ? 'bg-amber-900 text-amber-200 font-bold' : 'text-gray-500'}`}>
                          {log.context.durationMs}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Token Usage Tracking */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[500px]">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800">Token Usage History</h2>
              <span className="text-xs text-gray-500">Last 50 requests</span>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-medium text-gray-500 border-b">Time</th>
                    <th className="px-4 py-2 font-medium text-gray-500 border-b">Type</th>
                    <th className="px-4 py-2 font-medium text-gray-500 border-b">Model</th>
                    <th className="px-4 py-2 font-medium text-gray-500 border-b text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.recent.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No usage data recorded yet</td>
                    </tr>
                  ) : (
                    usage.recent.map((rec, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b text-gray-500 whitespace-nowrap">
                          {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2 border-b">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            rec.type === 'course_generation' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {rec.type.split('_')[0]}
                          </span>
                        </td>
                        <td className="px-4 py-2 border-b text-gray-600 truncate max-w-[100px]">
                          {rec.model}
                        </td>
                        <td className="px-4 py-2 border-b text-right font-mono font-medium">
                          {rec.totalTokens.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Daily Summary Bar (Simple CSS visualization) */}
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Last 7 Days</h4>
              <div className="flex items-end gap-2 h-20">
                {usage.daily.slice(-7).map((day, i) => {
                  const max = Math.max(...usage.daily.map(d => d.total), 1);
                  const height = (day.total / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                      <div 
                        className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-400 transition-all cursor-help relative"
                        style={{ height: `${Math.max(height, 5)}%` }}
                        title={`${day.date}: ${day.total} tokens`}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {day.total}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 rotate-45 mt-1">{day.date.split('-').slice(1).join('/')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
