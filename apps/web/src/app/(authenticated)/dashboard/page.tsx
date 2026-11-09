'use client'

import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '@/lib/api'
import Loading from '@/components/Loading'
import { TrendingUp, DollarSign, AlertCircle, ShoppingCart, Clock, Users, Package, Activity } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => reportsAPI.summary(),
    refetchOnMount: true,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 0,
  })

  // Update lastUpdated when data changes (outside of render phase)
  useEffect(() => {
    if (summary) {
      setLastUpdated(new Date())
    }
  }, [summary])

  if (isLoading) return <Loading />

  const data = summary?.data || {}
  const orderStats = data.order_statistics || {}
  const revenueMetrics = data.revenue_metrics || {}
  const inventoryMetrics = data.inventory_metrics || {}
  const customerMetrics = data.customer_metrics || {}

  const mainStats = [
    {
      label: 'Pending Orders',
      value: orderStats.pending_orders || 0,
      icon: Clock,
      color: 'yellow',
      href: '/orders?status=PENDING',
    },
    {
      label: 'Paid Orders',
      value: orderStats.paid_orders || 0,
      icon: DollarSign,
      color: 'blue',
      href: '/orders?status=PAID',
    },
    {
      label: 'Shipped Orders',
      value: orderStats.shipped_orders || 0,
      icon: ShoppingCart,
      color: 'purple',
      href: '/orders?status=SHIPPED',
    },
    {
      label: 'Completed Orders',
      value: orderStats.completed_orders || 0,
      icon: TrendingUp,
      color: 'green',
      href: '/orders?status=COMPLETED',
    },
  ]

  const secondaryStats = [
    {
      label: 'Total Revenue',
      value: `Rp${(revenueMetrics.total_revenue || 0).toLocaleString('id-ID')}`,
      icon: DollarSign,
      color: 'green',
    },
    {
      label: 'Total Customers',
      value: customerMetrics.total_customers || 0,
      icon: Users,
      color: 'blue',
      href: '/customers',
    },
    {
      label: 'Total Products',
      value: inventoryMetrics.total_products || 0,
      icon: Package,
      color: 'indigo',
      href: '/products',
    },
    {
      label: 'Low Stock Products',
      value: inventoryMetrics.low_stock_products || 0,
      icon: AlertCircle,
      color: 'red',
      href: '/products',
    },
  ]

  const colorClasses: Record<string, string> = {
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  }

  const StatCard = ({ stat, isMain = false }: any) => {
    const Icon = stat.icon
    const colors = colorClasses[stat.color as keyof typeof colorClasses]

    const card = (
      <div
        className={`${colors} p-6 rounded-lg border transition hover:shadow-lg ${
          stat.href ? 'cursor-pointer' : ''
        } ${isMain ? 'md:col-span-1' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
          </div>
          <div className="p-3 bg-white bg-opacity-60 rounded-lg">
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    )

    return stat.href ? (
      <Link key={stat.label} href={stat.href}>
        {card}
      </Link>
    ) : (
      <div key={stat.label}>{card}</div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to your order management system</p>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-2">
              Last updated: {lastUpdated.toLocaleTimeString('id-ID')}
            </p>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Refresh Now
        </button>
      </div>

      {/* Order Status Cards */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mainStats.map((stat) => (
            <StatCard key={stat.label} stat={stat} isMain />
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {secondaryStats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
          {data?.recent_orders && data.recent_orders.length > 0 ? (
            <div className="space-y-2">
              {data.recent_orders.map((order: any) => (
                <div
                  key={order.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-600">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      Rp{order.total_amount.toLocaleString('id-ID')}
                    </p>
                    <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              <Link
                href="/orders"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-4 block"
              >
                View All Orders →
              </Link>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No recent orders</p>
          )}
        </div>

        {/* Top Customer */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Customer</h2>
          {customerMetrics.top_customer ? (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-600">Customer Name</p>
              <p className="text-2xl font-bold text-gray-900 mb-2">{customerMetrics.top_customer.customer_name}</p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{customerMetrics.top_customer.order_count}</span> orders
              </p>
              <Link
                href="/customers"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-4 block"
              >
                View All Customers →
              </Link>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No customer data available</p>
          )}
        </div>
      </div>

      {/* Low Stock & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Products */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Low Stock Products
          </h2>
          {data?.recently_added_products && data.recently_added_products.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.recently_added_products
                .filter((p: any) => p.stock < 5)
                .map((product: any) => (
                  <div key={product.id} className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <div>
                      <p className="font-mono text-sm font-semibold text-gray-900">{product.product_code}</p>
                      <p className="text-xs text-gray-600">{product.product_name}</p>
                    </div>
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                      {product.stock} units
                    </span>
                  </div>
                ))}
              <Link
                href="/products"
                className="text-sm text-red-600 hover:text-red-800 font-medium mt-4 block"
              >
                Manage Inventory →
              </Link>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No low stock products</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/orders?create=true"
              className="block px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-medium"
            >
              + Create New Order
            </Link>
            <Link
              href="/customers"
              className="block px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-center font-medium"
            >
              View Customers
            </Link>
            <Link
              href="/products"
              className="block px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-center font-medium"
            >
              Manage Products
            </Link>
            <Link
              href="/reports"
              className="block px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition text-center font-medium"
            >
              View Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
