'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Zap, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface QueueInfo {
  name: string;
  jobCounts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  jobTypes: {
    [key: string]: string;
  };
  config: {
    retryAttempts: number;
    backoffType: string;
    initialDelay: number;
    keepCompleted: number;
    keepFailed: number;
  };
}

export default function QueuePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const { data: queues, isLoading } = useQuery({
    queryKey: ['queue-stats', refreshKey],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: { data: QueueInfo[] } }>('/queue/stats');
        return res.data?.data?.data || [];
      } catch (e) {
        return [];
      }
    },
    enabled: isHydrated,
  });

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Get config from first queue (they're all the same)
  const config = queues?.[0]?.config;

  if (!isHydrated) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">⚙️ BullMQ Queue</h1>
          <p className="text-gray-500 mt-1">Monitor background job processing dan queue status</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 font-semibold shadow-md transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Queues Grid */}
      {queues && queues.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {queues.map((queue) => (
            <div key={queue.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg capitalize">{queue.name} Queue</h3>
                  <span className="text-xs font-semibold px-2 py-1 rounded mt-1 bg-green-100 text-green-700">
                    🟢 Active
                  </span>
                </div>
                <Zap className="w-6 h-6 text-purple-600" />
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 uppercase">Waiting</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{queue.jobCounts.waiting}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-green-700 uppercase">Active</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">{queue.jobCounts.active}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-purple-700 uppercase">Completed</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">{queue.jobCounts.completed}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-700 uppercase">Failed</p>
                    <p className="text-2xl font-bold text-red-900 mt-1">{queue.jobCounts.failed}</p>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-yellow-700 uppercase">Delayed</p>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">{queue.jobCounts.delayed}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-600 font-semibold">📭 No queues available</p>
        </div>
      )}

      {/* Job Types Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4">📋 Job Types</h3>
        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
            <div className="font-bold text-gray-900">Invoice Generation</div>
            <p className="text-sm text-gray-600">
              Trigger: Order status changed to PAID. Generate HTML invoice and send email notification.
            </p>
          </div>
          <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
            <div className="font-bold text-gray-900">Low Stock Notifications</div>
            <p className="text-sm text-gray-600">
              Trigger: Product stock falls below threshold. Send alert email to admin.
            </p>
          </div>
        </div>
      </div>

      {/* Configuration */}
      {config && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">⚙️ Configuration</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Retry Attempts:</span>
              <span className="font-mono font-bold text-gray-900">{config.retryAttempts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Backoff Type:</span>
              <span className="font-mono font-bold text-gray-900">{config.backoffType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Initial Delay:</span>
              <span className="font-mono font-bold text-gray-900">{config.initialDelay}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Keep Completed:</span>
              <span className="font-mono font-bold text-gray-900">{config.keepCompleted} jobs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Keep Failed:</span>
              <span className="font-mono font-bold text-gray-900">{config.keepFailed} jobs</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

