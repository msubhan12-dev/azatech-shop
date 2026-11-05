'use client';

import { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  ipAddress: string;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setLoading(true);
        const api = (await import('@/lib/api')).default;
        const res = await api.get('/audit-logs/recent?limit=50000000');

        console.log('Audit logs response:', res.data);

        // Handle nested response format: res.data = { success, message, data: { data: [...] } }
        const auditData = res.data?.data?.data || res.data?.data || [];
        const logArray = Array.isArray(auditData) ? auditData : [];
        setLogs(logArray);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Audit logs fetch failed:', message);
        setError(message);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📋 Audit Logs</h1>
        <p className="text-gray-500 mt-1">All system activities and changes are logged</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-900 font-semibold">Error Loading Audit Logs</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 text-center">
          <p className="text-gray-500">Loading audit logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 text-center">
          <p className="text-gray-500">No audit logs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Entity</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">User</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.action === 'CREATE'
                            ? 'bg-green-100 text-green-800'
                            : log.action === 'UPDATE'
                              ? 'bg-blue-100 text-blue-800'
                              : log.action === 'DELETE'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.entityType} #{log.entityId}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <div className="text-sm">{log.user.name}</div>
                      <div className="text-xs text-gray-500">{log.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Audit Log API Reference</h2>
        
        <div className="space-y-4 text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="font-mono font-semibold text-blue-900 mb-2">GET /api/audit-logs/recent</p>
            <p className="text-gray-700">Get recent audit logs with optional limit</p>
            <p className="text-gray-600 mt-2">Query: ?limit=50</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded p-4">
            <p className="font-mono font-semibold text-green-900 mb-2">GET /api/audit-logs/entity</p>
            <p className="text-gray-700">Filter audit logs by entity type and ID</p>
            <p className="text-gray-600 mt-2">Query: ?type=Order&id=123&limit=50</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded p-4">
            <p className="font-mono font-semibold text-purple-900 mb-2">GET /api/audit-logs/export</p>
            <p className="text-gray-700">Export audit logs as CSV</p>
            <p className="text-gray-600 mt-2">Query: ?type=Order&id=123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
