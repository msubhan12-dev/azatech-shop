'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DashboardSummary } from '@/types';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import { TrendingUp, Package, Users, ShoppingCart, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardSummary }>('/dashboard/summary');
      return res.data.data;
    },
  });

  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-bounce-smooth text-6xl">⏳</div>
      </div>
    );
  if (isError)
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl font-bold">
        ❌ Gagal memuat data dashboard
      </div>
    );
  if (!data) return null;

  const statCards = [
    {
      title: 'Total Order',
      value: data.orders.total,
      icon: '📦',
      color: 'bg-blue-50',
      accentColor: 'bg-blue-600',
      borderColor: 'border-blue-200',
      trend: '+12%',
    },
    {
      title: 'Total Omzet',
      value: formatCurrency(data.revenue.total),
      icon: '💰',
      color: 'bg-green-50',
      accentColor: 'bg-green-600',
      borderColor: 'border-green-200',
      trend: '+8%',
    },
    {
      title: 'Total Produk',
      value: data.products.total,
      icon: '📦',
      color: 'bg-purple-50',
      accentColor: 'bg-purple-600',
      borderColor: 'border-purple-200',
      trend: '+5',
    },
    {
      title: 'Stok Rendah',
      value: data.products.lowStock,
      icon: '⚠️',
      color: 'bg-red-50',
      accentColor: 'bg-red-600',
      borderColor: 'border-red-200',
      trend: data.products.lowStock > 0 ? '⚠️' : '✅',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-5xl font-black text-gray-900">
          👋 Selamat Datang di Azatech Shop
        </h1>
        <p className="text-gray-600 mt-3 text-lg">Kelola order, produk, dan pelanggan dengan mudah dan modern</p>
      </div>

      {/* Stat Cards - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {statCards.map((card, idx) => (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl ${card.color} ${card.borderColor} border-2 p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-bold text-gray-700 uppercase tracking-widest">{card.title}</p>
                <div className="text-3xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
                  {card.icon}
                </div>
              </div>
              <p className="text-4xl font-black text-gray-900 mb-3 group-hover:scale-110 origin-left transition-transform duration-300">
                {card.value}
              </p>
              <p className="text-sm font-bold text-gray-600">{card.trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Order Status Breakdown */}
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-md animate-slide-up" style={{ animationDelay: '0.4s' }}>
        <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-3">
          <span className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </span>
          Status Order
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Pending', value: data.orders.pending, color: 'bg-yellow-50 border-yellow-200', icon: '⏳', textColor: 'text-yellow-700' },
            { label: 'Paid', value: data.orders.paid, color: 'bg-blue-50 border-blue-200', icon: '💳', textColor: 'text-blue-700' },
            { label: 'Shipped', value: data.orders.shipped, color: 'bg-purple-50 border-purple-200', icon: '📦', textColor: 'text-purple-700' },
            { label: 'Completed', value: data.orders.completed, color: 'bg-green-50 border-green-200', icon: '✅', textColor: 'text-green-700' },
            { label: 'Cancelled', value: data.orders.cancelled, color: 'bg-red-50 border-red-200', icon: '❌', textColor: 'text-red-700' },
          ].map((status, idx) => (
            <div
              key={idx}
              className={`group ${status.color} border-2 rounded-2xl p-6 text-center shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300 cursor-pointer`}
              style={{ animationDelay: `${0.5 + idx * 0.1}s` }}
            >
              <p className="text-3xl mb-2 group-hover:scale-125 transition-transform duration-300">{status.icon}</p>
              <p className={`text-sm font-bold uppercase tracking-wide ${status.textColor}`}>{status.label}</p>
              <p className="text-3xl font-black text-gray-900 mt-2 group-hover:animate-bounce-smooth">{status.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-md animate-slide-up" style={{ animationDelay: '0.7s' }}>
        <div className="p-8 border-b border-gray-200 bg-gray-50">
          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <span className="w-10 h-10 bg-pink-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-white" />
            </span>
            Order Terbaru
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-gray-900">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-sm font-bold uppercase tracking-wider text-gray-700">
                <th className="px-6 py-4">No. Order</th>
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order, idx) => (
                <tr
                  key={idx}
                  className={`border-t border-gray-200 hover:bg-gray-50 transition-colors duration-300 group ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 font-mono font-bold text-blue-600 group-hover:text-blue-700">{order.orderNumber}</td>
                  <td className="px-6 py-4 text-gray-700">{order.customerName || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        order.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'PAID'
                            ? 'bg-blue-100 text-blue-700'
                            : order.status === 'SHIPPED'
                              ? 'bg-purple-100 text-purple-700'
                              : order.status === 'PENDING'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600">{formatCurrency(order.totalAmount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.orderDate).toLocaleDateString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Link
            href="/dashboard/orders"
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 hover:shadow-lg active:scale-95 transition-all duration-300"
          >
            Lihat Semua Order →
          </Link>
        </div>
      </div>
    </div>
  );
}
