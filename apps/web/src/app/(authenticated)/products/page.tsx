'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { productsAPI } from '@/lib/api'
import Loading from '@/components/Loading'
import Modal from '@/components/Modal'
import ProductForm from '@/components/ProductForm'
import toast from 'react-hot-toast'
import { Plus, ChevronLeft, ChevronRight, AlertCircle, Edit, Trash2 } from 'lucide-react'

export default function ProductsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [page, setPage] = useState(Number(searchParams.get('page') || 1))
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const queryClient = useQueryClient()

  // Sync state ke URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (page > 1) params.set('page', String(page))
    if (search) params.set('search', search)
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '/products', { scroll: false })
  }, [page, search])

  const { data: response, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => productsAPI.list(page, 15, search || undefined),
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    refetchOnMount: true,
    staleTime: 0,
  })

  const products = response?.data?.data
  const meta = response?.data?.meta

  const handleOpenCreate = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] })
    setIsModalOpen(false)
    setEditingProduct(null)
  }

  const handleDelete = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    setDeleting(productId)
    try {
      await productsAPI.delete(productId)
      toast.success('Product deleted successfully')
      handleSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete product')
    } finally {
      setDeleting(null)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setSearch(searchInput)
      setPage(1)
    }
  }

  if (isLoading) return <Loading />

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your inventory</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or code... (Press Enter)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        {search && <p className="text-sm text-gray-500 mt-2">Showing results for: <span className="font-semibold">"{search}"</span></p>}
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 min-w-32">Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 min-w-40">Name</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 min-w-28">Price</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-20">Stock</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-24">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products?.map((product: any) => (
                <tr key={product.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono font-semibold text-gray-900">{product.product_code}</code>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate">{product.product_name}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                    Rp{Number(product.price).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span
                      className={`font-semibold ${
                        product.stock < (product.low_stock_threshold || 5)
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.stock < (product.low_stock_threshold || 5) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        <AlertCircle className="w-3 h-3" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => handleOpenEdit(product)}
                        className="text-blue-600 hover:text-blue-800 font-medium p-1 rounded hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deleting === product.id}
                        className="text-red-600 hover:text-red-800 font-medium p-1 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products?.length === 0 && (
          <div className="p-8 text-center text-gray-600">
            No products found
          </div>
        )}
      </div>

      {products?.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No products found</p>
        </div>
      )}

      <div className="mt-8 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Showing page <span className="font-semibold">{page}</span> of{' '}
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
          setEditingProduct(null)
        }}
        title={editingProduct ? 'Edit Product' : 'Create Product'}
      >
        <ProductForm
          onSuccess={handleSuccess}
          onClose={() => {
            setIsModalOpen(false)
            setEditingProduct(null)
          }}
          initialData={editingProduct}
        />
      </Modal>
    </div>
  )
}
