'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { FileText, Download, Filter } from 'lucide-react';
import { useState } from 'react';

interface AuditLog {
  id: bigint;
  action: string;
  entityType: string;
  entityId: string;
  user?: { id: string; name: string; email: string };
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export default function AuditPage() {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [action, setAction] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', entityType, entityId, action],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType) params.set('type', entityType);
      if (entityId) params.set('id', entityId);
      if (action) params.set('action', action);
      
      const res = await api.get<{ data: AuditLog[] }>(`/audit-logs/recent?limit=100`);
      return res.data.data;
    },
  });

  const handleExport = async () => {
    if (!entityType || !entityId) {
      alert('Silakan pilih entity type dan ID untuk export');
      return;
    }

    try {
      const params = new URLSearchParams({
        type: entityType,
        id: entityId,
      });

      const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      
      const response = await fetch(`${apiBase}/audit-logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${entityType}-${entityId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Gagal mengexport audit logs');
    }
  };

  const actionColor = (actionType: string): string => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-700',
      UPDATE: 'bg-blue-100 text-blue-700',
      DELETE: 'bg-red-100 text-red-700',
      CANCEL: 'bg-yellow-100 text-yellow-700',
      RESTORE: 'bg-purple-100 text-purple-700',
      PAYMENT_RECEIVED: 'bg-green-100 text-green-700',
      SHIPMENT_STARTED: 'bg-blue-100 text-blue-700',
      ORDER_COMPLETED: 'bg-green-100 text-green-700',
    };
    return colors[actionType] ?? 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📋 Audit Log</h1>
          <p className="text-gray-500 mt-1">Track semua aktivitas user dan perubahan sistem</p>
        </div>
        <button
          onClick={handleExport}
          disabled={!entityType || !entityId}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md transition-all"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filter Audit</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="entity-type" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Entity Type
            </label>
            <input
              id="entity-type"
              type="text"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="e.g. Order, Product"
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div>
            <label htmlFor="entity-id" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Entity ID
            </label>
            <input
              id="entity-id"
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="e.g. 123"
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div>
            <label htmlFor="action" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Action
            </label>
            <select
              id="action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="">Semua Action</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="CANCEL">Cancel</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b-2 border-gray-200 flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Recent Audit Logs</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin text-2xl">⏳</div>
            <p className="text-gray-500 mt-2">Memuat audit logs...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600">
            <p>❌ Gagal memuat audit logs</p>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>📭 Tidak ada audit logs</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr className="text-left text-gray-700">
                  <th className="px-6 py-4 font-bold">Waktu</th>
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Action</th>
                  <th className="px-6 py-4 font-bold">Entity</th>
                  <th className="px-6 py-4 font-bold">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {data.map((log, idx) => (
                  <tr
                    key={log.id.toString()}
                    className={`border-t border-gray-100 hover:bg-blue-50 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-gray-700">
                      <time dateTime={log.createdAt} className="text-xs">
                        {formatDateTime(log.createdAt)}
                      </time>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{log.user?.name ?? 'System'}</div>
                      <div className="text-xs text-gray-500">{log.user?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${actionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="font-mono text-xs font-semibold">{log.entityType}</div>
                      <div className="text-xs text-gray-500">{log.entityId}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">{log.ipAddress ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
