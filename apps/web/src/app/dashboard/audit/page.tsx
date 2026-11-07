'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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
  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get<{ data: AuditLog[] }>('/audit-logs/recent?limit=50');
      return res.data?.data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📋 Audit Logs</h1>
        <p className="text-gray-500 mt-1">All system activities and changes are logged</p>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-900 font-semibold">Error Loading Audit Logs</p>
        </div>
      )}

      {isLoading && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 text-center">
          <p className="text-gray-500">Loading audit logs...</p>
        </div>
      )}

      {!isLoading && !logs?.length && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 text-center">
          <p className="text-gray-500">No audit logs found</p>
        </div>
      )}

      {logs && logs.length > 0 && (
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
    </div>
  );
}
