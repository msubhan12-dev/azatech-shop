'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { customersAPI } from '@/lib/api'
import Loading from '@/components/Loading'
import Modal from '@/components/Modal'
import CustomerForm from '@/components/CustomerForm'
import toast from 'react-hot-toast'
import { Plus, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react'

export default function CustomersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: response, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customersAPI.list(page, 15, search || undefined),
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    refetchOnMount: true,
    staleTime: 0,
  })

  const customers = response?.data?.data
  const meta = response?.data?.meta

  const handleOpenCreate = () => {
    setEditingCustomer(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (customer: any) => {
    setEditingCustomer(customer)
    setIsModalOpen(true)
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
    setIsModalOpen(false)
    setEditingCustomer(null)
  }

  const handleDelete = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return

    setDeleting(customerId)
    try {
      await customersAPI.delete(String(customerId))
      toast.success('Customer deleted successfully')
      handleSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete customer')
    } finally {
      setDeleting(null)
    }
  }

  if (isLoading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer database</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Address</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Gender</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customers?.map((customer: any) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {customer.customer_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{customer.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="line-clamp-1">{customer.customer_address}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{customer.gender}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(customer)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        disabled={deleting === customer.id}
                        className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {customers?.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            No customers found
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
        onClose={() => {
          setIsModalOpen(false)
          setEditingCustomer(null)
        }}
        title={editingCustomer ? 'Edit Customer' : 'Create Customer'}
      >
        <CustomerForm
          onSuccess={handleSuccess}
          onClose={() => {
            setIsModalOpen(false)
            setEditingCustomer(null)
          }}
          initialData={editingCustomer}
        />
      </Modal>
    </div>
  )
}
