'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { auditAPI } from '@/lib/api'
import Loading from '@/components/Loading'
import { ChevronLeft, ChevronRight, Database, Server, AlertCircle, Activity, HardDrive, Zap } from 'lucide-react'

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800 border-green-300',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-300',
  READ: 'bg-gray-100 text-gray-800 border-gray-300',
  DELETE: 'bg-red-100 text-red-800 border-red-300',
  STOCK_ADJUSTMENT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ORDER_PAID: 'bg-purple-100 text-purple-800 border-purple-300',
}

export default function MonitoringPage() {
  const [page, setPage] = useState(1)
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedEntityType, setSelectedEntityType] = useState('')
  const queryClient = useQueryClient()

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', page, selectedAction, selectedEntityType],
    queryFn: () => auditAPI.getLogs(page, 15, selectedAction || undefined, selectedEntityType || undefined),
    refetchOnMount: true,
    refetchInterval: 3000, // Refresh setiap 3 detik
    staleTime: 0,
  })

  const { data: metricsData } = useQuery({
    queryKey: ['audit-metrics'],
    queryFn: () => auditAPI.getMetrics(),
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  const { data: redisKeysData } = useQuery({
    queryKey: ['redis-keys'],
    queryFn: () => auditAPI.getRedisKeys(),
    refetchInterval: 5000,
  })

  const logsArray = Array.isArray((response as any)?.data?.data) ? (response as any).data.data : []
  const meta = (response as any)?.data?.meta || { page, per_page: 15, total: 0, total_pages: 1 }
  const metrics = (metricsData as any)?.data || {}
  const redisKeys = Array.isArray((redisKeysData as any)?.data) ? (redisKeysData as any).data : []

  // Get TanStack Query metrics
  const cache = queryClient.getQueryCache()
  const queries = cache.getAll()
  const activeQueries = queries.filter((q) => q.getObserversCount() > 0)
  const staleCacheSize = queries.length

  if (isLoading) return <Loading />

  const uniqueActions = Array.from(new Set(logsArray.map((log: any) => log.action)))
  const uniqueEntityTypes = Array.from(new Set(logsArray.map((log: any) => log.entityType)))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Monitoring & Audit Logs</h1>
        <p className="text-gray-600 mt-1">Pantau semua aktivitas sistem</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 bg-white p-4 rounded-lg border">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Aksi</label>
          <select
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
            <option value="">Semua Aksi</option>
            {uniqueActions.map((action: any) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Entity</label>
          <select
            value={selectedEntityType}
            onChange={(e) => {
              setSelectedEntityType(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          >
            <option value="">Semua Tipe</option>
            {uniqueEntityTypes.map((type: any) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-600 mb-2">Total Aktivitas</p>
          <p className="text-3xl font-bold text-gray-900">{meta?.total || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-600 mb-2">Halaman Aktif</p>
          <p className="text-3xl font-bold text-blue-600">{page}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-600 mb-2">Total Halaman</p>
          <p className="text-3xl font-bold text-gray-900">{meta?.total_pages || 1}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-600 mb-2">Status Sistem</p>
          <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
            Online
          </span>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Database</h3>
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalOrders || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Pending</p>
              <p className="text-lg font-semibold text-yellow-600">{metrics.pendingOrders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Redis Cache</h3>
            <Server className="w-5 h-5 text-red-600" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600">Keys Cached</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.redisKeys || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Memory Used</p>
              <p className="text-lg font-semibold text-red-600">
                {metrics.redisMemory ? (metrics.redisMemory / 1024 / 1024).toFixed(2) : 0} MB
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Inventory</h3>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.lowStockProducts || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Today Orders</p>
              <p className="text-lg font-semibold text-orange-600">{metrics.todayOrders || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* TanStack Query & BullMQ Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">TanStack Query Cache</h3>
            <HardDrive className="w-5 h-5 text-purple-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
              <span className="text-sm text-gray-700">Total Queries Cached</span>
              <span className="font-bold text-lg text-purple-600">{staleCacheSize}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="text-sm text-gray-700">Active Queries</span>
              <span className="font-bold text-lg text-green-600">{activeQueries.length}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
              <span className="text-sm text-gray-700">Cache Hit Rate</span>
              <span className="font-bold text-lg text-blue-600">
                {staleCacheSize > 0 ? Math.round((activeQueries.length / staleCacheSize) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">BullMQ Queue Status</h3>
            <Zap className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
              <span className="text-sm text-gray-700">Queue Ready</span>
              <span className="font-bold text-lg text-yellow-600">0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded">
              <span className="text-sm text-gray-700">Queue Failed</span>
              <span className="font-bold text-lg text-red-600">0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="text-sm text-gray-700">Queue Completed</span>
              <span className="font-bold text-lg text-green-600">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Redis Cached Keys</h2>
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Key Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">TTL / Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {redisKeys.length > 0 ? (
                  redisKeys.slice(0, 10).map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 text-sm font-mono text-gray-900 break-all">{item.key}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{item.ttl}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-600">
                      No cached keys
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {redisKeys.length > 10 && (
            <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600 border-t">
              Showing 10 of {redisKeys.length} cached keys
            </div>
          )}
        </div>
      </div>

      {/* TanStack Query Queries */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Active TanStack Queries</h2>
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Query Key</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Observers</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeQueries.length > 0 ? (
                  activeQueries.slice(0, 10).map((query: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 text-sm font-mono text-gray-900 break-all">
                        {JSON.stringify(query.queryKey)}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            query.state.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : query.state.status === 'error'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {query.state.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900 font-semibold">
                        {query.getObserversCount()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-600">
                      No active queries
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {activeQueries.length > 10 && (
            <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600 border-t">
              Showing 10 of {activeQueries.length} active queries
            </div>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Waktu</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">User</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Aksi</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Entity Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Entity ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logsArray?.length > 0 ? (
                logsArray.map((log: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {log.user?.name}
                      <br />
                      <span className="text-xs text-gray-600">{log.user?.email}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                          actionColors[log.action] || 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.entityType}</td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{log.entityId}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {(() => {
                        try {
                          const m = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
                          return m?.description || m?.path || '-'
                        } catch {
                          return '-'
                        }
                      })()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-600">
                    Tidak ada data audit log
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Halaman <span className="font-semibold">{page}</span> dari{' '}
          <span className="font-semibold">{meta?.total_pages || 1}</span> ({' '}
          <span className="font-semibold">{meta?.total || 0}</span> total)
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Sebelumnya
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (meta?.total_pages || 1)}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Selanjutnya
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
