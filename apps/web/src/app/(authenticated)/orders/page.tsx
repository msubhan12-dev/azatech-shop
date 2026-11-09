'use client'

import { useState, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersAPI } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import Loading from '@/components/Loading'
import Modal from '@/components/Modal'
import OrderForm from '@/components/OrderForm'
import { ChevronLeft, ChevronRight, Plus, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PAID: 'bg-blue-100 text-blue-800 border-blue-300',
  SHIPPED: 'bg-purple-100 text-purple-800 border-purple-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  CANCELLED: 'bg-red-100 text-red-800 border-red-300',
}

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const { data: response, isLoading } = useQuery({
    queryKey: ['orders', page, status],
    queryFn: () => ordersAPI.list(page, 15, status || undefined),
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    refetchOnMount: true,
    staleTime: 0,
  })

  const orders = response?.data?.data
  const meta = response?.data?.meta

  const handleCreateSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    setIsModalOpen(false)
    setPage(1)
  }

  const payMutation = useMutation({
    mutationFn: (id: number) => ordersAPI.pay(id),
    onSuccess: () => {
      toast.success('Order marked as PAID')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error updating order')
    },
  })

  if (isLoading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Manage your orders</p>
        </div>
        {user?.role === 'CASHIER' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create Order
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-4">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="SHIPPED">Shipped</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 w-12 flex-shrink-0"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 min-w-32">Order #</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 min-w-40">Customer</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 min-w-32">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-28">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-24">Date</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders?.map((order: any) => (
                <Fragment key={order.id}>
                  <tr className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-center w-12 flex-shrink-0">
                      <button
                        onClick={() =>
                          setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                        }
                        className="text-gray-600 hover:text-gray-900 inline-flex w-full justify-center"
                      >
                        {expandedOrderId === order.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono font-semibold text-gray-900 break-all">{order.order_number}</code>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 truncate">{order.customer?.customer_name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                      Rp{Number(order.total_amount).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${
                          statusColors[order.status] || 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center whitespace-nowrap">
                      {new Date(order.order_date || order.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex gap-1 justify-center">
                        <Link
                          href={`/orders/${order.id}/invoice`}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          Invoice
                        </Link>
                        {order.status === 'PENDING' && user?.role === 'CASHIER' && (
                          <button
                            onClick={() => payMutation.mutate(order.id)}
                            disabled={payMutation.isPending}
                            className="text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                          >
                            {payMutation.isPending ? 'Processing...' : 'Pay'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedOrderId === order.id && order.status_histories && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="bg-white p-4 rounded border border-gray-200">
                          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Status History</h3>
                          <div className="space-y-2">
                            {order.status_histories.map((history: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-gray-900">{history.status}</p>
                                  {history.reason && (
                                    <p className="text-xs text-gray-600 italic">{history.reason}</p>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 whitespace-nowrap ml-4">
                                  {new Date(history.created_at).toLocaleString('id-ID', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {orders?.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            No orders found
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Page <span className="font-semibold">{page}</span> of{' '}
          <span className="font-semibold">{meta?.total_pages || 1}</span> (
          <span className="font-semibold">{meta?.total || 0}</span> total)
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= (meta?.total_pages || 1)}
            className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Order"
        size="lg"
      >
        <OrderForm
          onSuccess={handleCreateSuccess}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  )
}
