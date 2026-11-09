'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '@/lib/api'
import Loading from '@/components/Loading'
import toast from 'react-hot-toast'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Download, TrendingUp } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { data: salesData, isLoading: loadingSales, refetch: refetchSales } = useQuery({
    queryKey: ['reports-sales', dateFrom, dateTo],
    queryFn: () => reportsAPI.sales(dateFrom, dateTo, 'day'),
    enabled: !!dateFrom && !!dateTo,
    refetchOnMount: true,
    refetchInterval: 1800000, // Auto-refresh every 30 minutes
    staleTime: 0,
  })

  const { data: topProducts, isLoading: loadingProducts, refetch: refetchProducts } = useQuery({
    queryKey: ['reports-top-products', dateFrom, dateTo],
    queryFn: () => reportsAPI.topProducts(dateFrom, dateTo, 10),
    enabled: !!dateFrom && !!dateTo,
    refetchOnMount: true,
    refetchInterval: 1800000, // Auto-refresh every 30 minutes
    staleTime: 0,
  })

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => reportsAPI.summary(),
    refetchOnMount: true,
    refetchInterval: 1800000, // Auto-refresh every 30 minutes
    staleTime: 0,
  })

  // Update lastUpdated when any data changes
  useEffect(() => {
    if (salesData || topProducts || summary) {
      setLastUpdated(new Date())
    }
  }, [salesData, topProducts, summary])

  const sales = salesData?.data?.data
  const topProductsList = topProducts?.data?.data
  const summaryData = summary?.data

  const handleRefreshAll = async () => {
    await Promise.all([refetchSales(), refetchProducts(), refetchSummary()])
    setLastUpdated(new Date())
  }

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      // Sheet 1: Data Penjualan
      const salesSheet = XLSX.utils.json_to_sheet(
        (Array.isArray(sales) ? sales : []).map((d: any) => ({
          Tanggal: d.date || d.order_date,
          'Jumlah Order': d.order_count || 0,
          'Total Penjualan': d.total_sales || 0,
          'Rata-rata Order': d.avg_order_value || 0,
        })) || []
      )
      XLSX.utils.book_append_sheet(wb, salesSheet, 'Penjualan')
      
      // Sheet 2: Produk Top
      const productsSheet = XLSX.utils.json_to_sheet(
        (Array.isArray(topProductsList) ? topProductsList : []).map((p: any, idx: number) => ({
          Rank: idx + 1,
          'Nama Produk': p.productName || p.product_name,
          'Kode Produk': p.productCode || p.product_code,
          'Terjual': p.quantity_sold || p.total_quantity,
          'Total Revenue': p.total_revenue || 0,
        })) || []
      )
      XLSX.utils.book_append_sheet(wb, productsSheet, 'Top Produk')
      
      // Sheet 3: Ringkasan
      const summarySheet = XLSX.utils.json_to_sheet([
        { Metrik: 'Total Order', Nilai: summaryData?.revenue_metrics?.order_count || 0 },
        { Metrik: 'Total Revenue', Nilai: summaryData?.revenue_metrics?.total_revenue || 0 },
        { Metrik: 'Order Pending', Nilai: summaryData?.order_statistics?.pending_orders || 0 },
        { Metrik: 'Produk Low Stock', Nilai: summaryData?.inventory_metrics?.low_stock_products || 0 },
      ])
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan')
      
      XLSX.writeFile(wb, `Laporan-${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel berhasil diunduh')
    } catch (error) {
      toast.error('Gagal export Excel')
    }
  }

  const isLoading = loadingSales || loadingProducts || loadingSummary
  if (isLoading) return <Loading />

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16']

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Laporan & Analytics</h1>
          <p className="text-gray-600 mt-1">Analisis penjualan dan performa bisnis</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString('id-ID')} · Auto-refresh every 30 minutes
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefreshAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            Refresh Now
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            <Download className="w-5 h-5" />
            Unduh Excel
          </button>
        </div>
      </div>

      {/* Filter Tanggal */}
      <div className="mb-6 flex gap-4 items-end bg-white p-4 rounded-lg border">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-600 mb-2">Total Order</p>
          <p className="text-3xl font-bold text-gray-900">{summaryData?.revenue_metrics?.order_count || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">
            Rp{(summaryData?.revenue_metrics?.total_revenue || 0).toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-600 mb-2">Order Pending</p>
          <p className="text-3xl font-bold text-yellow-600">{summaryData?.order_statistics?.pending_orders || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <p className="text-sm text-gray-600 mb-2">Stok Rendah</p>
          <p className="text-3xl font-bold text-red-600">{summaryData?.inventory_metrics?.low_stock_products || 0}</p>
        </div>
      </div>

      {/* Grafik */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Grafik Penjualan */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Tren Penjualan Harian
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={Array.isArray(sales) ? sales : []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval={Math.max(0, Math.floor((Array.isArray(sales) ? sales.length : 0) / 6))}
              />
              <YAxis />
              <Tooltip
                formatter={(value) => `Rp${Number(value).toLocaleString('id-ID')}`}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line type="monotone" dataKey="total_sales" stroke="#3b82f6" name="Total Penjualan" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart Produk Top */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Produk Terlaris</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Array.isArray(topProductsList) ? topProductsList.slice(0, 5) : []}
                dataKey="total_revenue"
                nameKey="productName"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {Array.isArray(topProductsList) && topProductsList.slice(0, 5).map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `Rp${Number(value).toLocaleString('id-ID')}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabel Produk Top 10 */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Top 10 Produk</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rank</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nama Produk</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Kode</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Terjual</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Array.isArray(topProductsList) && topProductsList.length > 0 ? (
                topProductsList.map((product: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">#{idx + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {product.productName || product.product_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.productCode || product.product_code}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-semibold">
                      {product.quantity_sold || product.total_quantity} unit
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-bold text-green-600">
                      Rp{(product.total_revenue || 0).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-600">
                    Tidak ada data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
