'use client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { Order, PaginatedResponse } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const page = Number(searchParams.get('page') ?? 1);
  const perPage = Number(searchParams.get('perPage') ?? 10);
  const status = searchParams.get('status') ?? '';
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['orders', { page, perPage, status, from, to }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get<PaginatedResponse<Order>>(`/orders?${params}`);
      return res.data;
    },
  });

  function updateQuery(params: Record<string, string | number>) {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) newParams.set(key, String(value));
      else newParams.delete(key);
    });
    router.push(`${pathname}?${newParams.toString()}`);
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-5xl font-black text-gray-900">
          🛒 Order Management
        </h1>
        <p className="text-gray-600 mt-3 text-lg">Kelola semua pesanan pelanggan Anda dengan mudah</p>
      </div>

      {/* Action Button */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <Link
          href="/dashboard/orders/create"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg active:scale-95 transition-all duration-300"
        >
          <Plus className="w-6 h-6" />
          Buat Order Baru
        </Link>
      </div>

      {/* Filters Card */}
      <div className="bg-white border border-gray-200 p-6 rounded-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-900 text-lg">🔍 Filter Order</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="f-status" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Status
            </label>
            <select
              id="f-status"
              value={status}
              onChange={(e) => updateQuery({ status: e.target.value, page: 1 })}
              className="w-full bg-white border-2 border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 hover:border-gray-400"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">⏳ Pending</option>
              <option value="PAID">💳 Paid</option>
              <option value="SHIPPED">📮 Shipped</option>
              <option value="COMPLETED">✅ Completed</option>
              <option value="CANCELLED">❌ Cancelled</option>
            </select>
          </div>

          <div>
            <label htmlFor="f-from" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Dari Tanggal
            </label>
            <input
              id="f-from"
              type="date"
              value={from}
              onChange={(e) => updateQuery({ from: e.target.value, page: 1 })}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          <div>
            <label htmlFor="f-to" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Sampai Tanggal
            </label>
            <input
              id="f-to"
              type="date"
              value={to}
              onChange={(e) => updateQuery({ to: e.target.value, page: 1 })}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>

          {(status || from || to) && (
            <div className="flex items-end">
              <button
                onClick={() => updateQuery({ status: '', from: '', to: '', page: 1 })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin">⏳</div>
          <p className="text-gray-500 mt-2">Memuat data order...</p>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-700 font-semibold">⚠️ Gagal memuat data order</p>
          <p className="text-red-600 text-sm">Silakan refresh halaman atau coba lagi nanti.</p>
        </div>
      )}

      {/* Data Table */}
      {data && (
        <>
          {/* Desktop Table */}
          <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr className="text-left text-gray-700">
                  <th className="px-6 py-4 font-bold">No. Order</th>
                  <th className="px-6 py-4 font-bold">Pelanggan</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Total</th>
                  <th className="px-6 py-4 font-bold">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {data.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-gray-400 text-lg">📭 Tidak ada order</p>
                    </td>
                  </tr>
                ) : (
                  data.data.map((order, idx) => (
                    <tr key={order.id} className={`border-t border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{order.customer?.customerName ?? '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusColor(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(order.totalAmount)}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{formatDateTime(order.orderDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {data.data.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-400 text-lg">📭 Tidak ada order</p>
              </div>
            ) : (
              data.data.map((order) => (
                <Link
                  key={order.id}
                  href={`/dashboard/orders/${order.id}`}
                  className="block bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-blue-600">{order.orderNumber}</span>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${statusColor(order.status)}`}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-1">{order.customer?.customerName ?? '-'}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(order.orderDate)}</p>
                  <p className="font-bold text-gray-900 mt-2">{formatCurrency(order.totalAmount)}</p>
                </Link>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{data.meta.total}</span> total order
              {' | '}
              Halaman <span className="font-semibold text-gray-900">{page}</span> dari{' '}
              <span className="font-semibold text-gray-900">{data.meta.total_pages}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => updateQuery({ page: page - 1 })}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>
              <button
                onClick={() => updateQuery({ page: page + 1 })}
                disabled={page >= data.meta.total_pages}
                className="flex items-center gap-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    PAID: 'bg-blue-100 text-blue-700',
    SHIPPED: 'bg-purple-100 text-purple-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-700';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: '⏳ Pending',
    PAID: '💳 Paid',
    SHIPPED: '📮 Shipped',
    COMPLETED: '✅ Completed',
    CANCELLED: '❌ Cancelled',
  };
  return labels[status] ?? status;
}
