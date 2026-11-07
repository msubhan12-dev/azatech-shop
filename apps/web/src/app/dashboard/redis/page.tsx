'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface RedisStats {
  status: string;
  host: string;
  port: number;
  db: number;
  dbName: string;
  memory: string;
  connectedClients: number;
  usedMemory: string;
  totalSystemMemory: string;
  uptime: number;
  commands: number;
}

export default function RedisPage() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['redis-stats'],
    queryFn: async () => {
      const res = await api.get<{ data: { data: RedisStats } }>('/redis/stats');
      return res.data?.data?.data || null;
    },
  });

  const memoryPercent = stats
    ? Math.min((parseFloat(stats.usedMemory) / parseFloat(stats.totalSystemMemory)) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">⚡ Redis Cache</h1>
        <p className="text-gray-500 mt-1">Monitor koneksi dan penggunaan cache Redis</p>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold">❌ Tidak dapat terhubung ke Redis</p>
        </div>
      )}

      {isLoading && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-semibold">Loading Redis statistics...</p>
        </div>
      )}

      {stats && (
        <>
          {/* Connection Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase">Status</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">Connected</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Host & Port</p>
                <p className="text-lg font-mono font-bold text-gray-900 mt-2">
                  {stats.host}:{stats.port}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase">Database</p>
                <p className="text-lg font-bold text-gray-900 mt-2">{stats.dbName}</p>
              </div>
            </div>
          </div>

          {/* Memory & Performance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">📊 Memory Usage</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Used Memory</span>
                    <span className="text-sm font-bold text-gray-900">{stats.usedMemory}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${memoryPercent}%` }}
                    ></div>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Total System Memory: <span className="font-bold">{stats.totalSystemMemory}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">⚙️ Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Connected Clients</span>
                  <span className="text-sm font-bold text-gray-900">{stats.connectedClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Commands Processed</span>
                  <span className="text-sm font-bold text-gray-900">{stats.commands}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Uptime (seconds)</span>
                  <span className="text-sm font-bold text-gray-900">{stats.uptime}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
