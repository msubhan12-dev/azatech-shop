'use client'

import { useState, useEffect } from 'react'
import { ordersAPI, customersAPI, productsAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import { validateField, formRules } from '@/lib/validation'

interface OrderFormProps {
  onSuccess: () => void
  onClose: () => void
  initialData?: any
}

interface OrderItem {
  product_id: number
  quantity: number
  productName?: string
  price?: number
}

export default function OrderForm({ onSuccess, onClose, initialData }: OrderFormProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [customerId, setCustomerId] = useState(initialData?.customerId || '')
  const [items, setItems] = useState<OrderItem[]>(initialData?.items || [])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedQuantity, setSelectedQuantity] = useState('1')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, productsRes] = await Promise.all([
          customersAPI.list(1, 100),
          productsAPI.list(1, 100),
        ])
        setCustomers(customersRes.data.data || [])
        setProducts(productsRes.data.data || [])
      } catch (error) {
        toast.error('Failed to load data')
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  const handleAddItem = () => {
    if (!selectedProductId || !selectedQuantity) {
      toast.error('Select product and quantity')
      return
    }

    const product = products.find((p) => p.id === parseInt(selectedProductId))
    if (!product) {
      toast.error('Product not found')
      return
    }

    const quantity = parseInt(selectedQuantity)
    if (quantity > product.stock) {
      toast.error(`Only ${product.stock} units available`)
      return
    }

    // Check if product already in items
    const existingItem = items.find((i) => i.product_id === product.id)
    if (existingItem) {
      if (existingItem.quantity + quantity > product.stock) {
        toast.error(`Only ${product.stock} units available total`)
        return
      }
      setItems(
        items.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      )
    } else {
      setItems([
        ...items,
        {
          product_id: product.id,
          quantity,
          productName: product.productName,
          price: product.price,
        },
      ])
    }

    setSelectedProductId('')
    setSelectedQuantity('1')
  }

  const handleRemoveItem = (productId: number) => {
    setItems(items.filter((i) => i.product_id !== productId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    
    // Validate customer_id
    const customerError = validateField('order', 'customer_id', customerId)
    if (customerError) newErrors['customer_id'] = customerError

    // Validate items
    const itemsError = validateField('order', 'items', items)
    if (itemsError) newErrors['items'] = itemsError

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fix validation errors')
      return
    }

    setLoading(true)

    try {
      const orderData = {
        customer_id: customerId,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
      }

      if (initialData?.id) {
        // For editing, you'd need to implement this on the backend
        // For now, only allow creating new orders
        toast.error('Order editing not supported')
      } else {
        await ordersAPI.create(orderData)
        toast.success('Order created successfully')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0)

  if (loadingData) {
    return <div className="text-center py-4 text-gray-600">Loading data...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Customer Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Customer <span className="text-red-500">*</span>
        </label>
        <select
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value)
            const newErrors = { ...errors }
            delete newErrors['customer_id']
            setErrors(newErrors)
          }}
          disabled={!!initialData?.id}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100 ${
            errors.customer_id ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          <option value="">Select a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.customerName} ({customer.email})
            </option>
          ))}
        </select>
        {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id}</p>}
      </div>

      {/* Items Section */}
      <div className="border-t pt-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          Order Items <span className="text-red-500">*</span>
        </h3>
        {errors.items && <p className="text-red-500 text-xs mb-2">{errors.items}</p>}

        {!initialData?.id && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.productName} (Stock: {product.stock}, Rp
                    {Number(product.price).toLocaleString('id-ID')})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="1"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        {items.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-700">Product</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Price</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-700">Qty</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-700">Subtotal</th>
                  {!initialData?.id && <th className="px-3 py-2 text-center font-medium text-gray-700">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => (
                  <tr key={item.product_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2 text-right text-gray-600">
                      Rp{Number(item.price).toLocaleString('id-ID')}
                    </td>
                    <td className="px-3 py-2 text-center font-medium">{item.quantity}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      Rp{((item.price || 0) * item.quantity).toLocaleString('id-ID')}
                    </td>
                    {!initialData?.id && (
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.product_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2">
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-900">
                    Total:
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-lg text-blue-600">
                    Rp{totalAmount.toLocaleString('id-ID')}
                  </td>
                  {!initialData?.id && <td />}
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500 border border-dashed rounded-lg">
            No items added yet
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
        >
          {loading ? 'Creating...' : 'Create Order'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-200 text-gray-900 py-2 rounded-lg hover:bg-gray-300 font-medium transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
