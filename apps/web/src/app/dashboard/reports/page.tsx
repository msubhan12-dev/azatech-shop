'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { SalesReportItem, TopProduct } from '@/types';
import { formatCurrency } from '@/lib/format';
import { Download, Filter } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function ReportsPage() {
  const today = new Date().toISOString().split('T')[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [from, setFrom] = useState(ninetyDaysAgo);
  const [to, setTo] = useState(today);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('month');

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', from, to, groupBy],
    queryFn: async () => {
      const res = await api.get<{ data: SalesReportItem[] }>(
        `/reports/sales?from=${from}&to=${to}&group_by=${groupBy}`,
      );
      return res.data.data;
    },
  });

  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['top-products', from, to],
    queryFn: async () => {
      const res = await api.get<{ data: TopProduct[] }>(
        `/reports/top-products?from=${from}&to=${to}&limit=10`,
      );
      return res.data.data;
    },
  });

  const handleExport = () => {
    const params = new URLSearchParams({ from, to, group_by: groupBy });
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    window.location.href = `${apiBase}/reports/sales/export?${params}`;
  };

  const chartData = (salesData ?? []).map((item) => ({
    ...item,
    period: new Date(item.period).toLocaleDateString('id-ID', {
      day: groupBy === 'day' ? '2-digit' : undefined,
      month: 'short',
      year: 'numeric',
    }),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Laporan Penjualan</h1>
          <p className="text-gray-500 mt-1">Analisis omzet dan produk terlaris Anda</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-semibold shadow-md transition-all hover:shadow-lg"
        >
          <Download className="w-5 h-5" />
          Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filter Laporan</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="r-from" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Dari Tanggal
            </label>
            <input
              id="r-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div>
            <label htmlFor="r-to" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Sampai Tanggal
            </label>
            <input
              id="r-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            />
          </div>
          <div>
            <label htmlFor="r-group" className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Grouping
            </label>
            <select
              id="r-group"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
            >
              <option value="day">Per Hari</option>
              <option value="month">Per Bulan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Omzet {groupBy === 'day' ? 'Harian' : 'Bulanan'}</h2>
        {salesLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-2xl">⏳</div>
            <p className="text-gray-500 mt-2">Memuat data...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">📭 Tidak ada data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'totalRevenue' ? [formatCurrency(value), 'Omzet'] : [value, 'Order']
                }
              />
              <Legend formatter={(value) => (value === 'totalRevenue' ? 'Omzet' : 'Total Order')} />
              <Bar dataKey="totalOrders" fill="#3b82f6" name="totalOrders" />
              <Bar dataKey="totalRevenue" fill="#10b981" name="totalRevenue" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top products table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">⭐ Produk Terlaris</h2>
        {productsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-2xl">⏳</div>
            <p className="text-gray-500 mt-2">Memuat data...</p>
          </div>
        ) : !topProducts || topProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">📭 Tidak ada data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr className="text-left text-gray-700">
                  <th className="px-4 py-3 font-bold">#</th>
                  <th className="px-4 py-3 font-bold">Kode</th>
                  <th className="px-4 py-3 font-bold">Produk</th>
                  <th className="px-4 py-3 font-bold text-right">Qty Terjual</th>
                  <th className="px-4 py-3 font-bold text-right">Omzet</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.productId} className={`border-t border-gray-100 hover:bg-blue-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 font-bold text-blue-600">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-600">{p.productCode}</td>
                    <td className="px-4 py-3 text-gray-700">{p.productName}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{p.totalQuantity}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(p.totalRevenue)}</td>
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
