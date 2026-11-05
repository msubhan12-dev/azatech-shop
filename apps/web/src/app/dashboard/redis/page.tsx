'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface RedisStats {
  status: string;
  host: string;
  port: number;
  db: number;
  memory: string;
  connectedClients: number;
  usedMemory: string;
  totalSystemMemory: string;
  uptime: number;
  commands: number;
}

export default function RedisPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on client before fetching
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['redis-stats', refreshKey],
    queryFn: async () => {
      try {
        console.log('Fetching Redis stats...');
        const res = await api.get<{ success: boolean; message: string; data: { data: RedisStats } }>('/redis/stats');
        console.log('Redis response full:', res.data);
        console.log('Redis response data:', res.data?.data);
        
        const statsData = res.data?.data?.data;
        if (!statsData) {
          console.warn('No stats data in response, trying fallback');
          // Try fallback in case structure is different
          return res.data?.data as any;
        }
        
        console.log('Parsed stats:', statsData);
        return statsData;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('Redis stats error:', message, e);
        throw new Error(`Failed to load Redis stats: ${message}`);
      }
    },
    enabled: isClient,  // Only fetch after component is mounted on client
    retry: 2,
    staleTime: 30 * 1000, // 30 seconds
  });

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">⚡ Redis Cache</h1>
          <p className="text-gray-500 mt-1">Monitor koneksi dan penggunaan cache Redis</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 font-semibold shadow-md transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-semibold">❌ Error Loading Redis Stats</p>
          <p className="text-red-500 text-sm mt-2">{error instanceof Error ? error.message : 'Failed to fetch data'}</p>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-semibold">Loading Redis statistics...</p>
        </div>
      ) : stats ? (
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
                <p className="text-lg font-bold text-gray-900 mt-2">DB {stats.db}</p>
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
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                      style={{
                        width: `${
                          Math.min(
                            (parseFloat(stats.usedMemory) / parseFloat(stats.totalSystemMemory)) * 100,
                            100,
                          ) || 0
                        }%`,
                      }}
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
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-red-600 font-semibold">❌ Tidak dapat terhubung ke Redis</p>
        </div>
      )}
    </div>
  );
}
