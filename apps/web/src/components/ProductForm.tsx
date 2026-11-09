'use client'

import { useState } from 'react'
import { productsAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { validateField, formRules } from '@/lib/validation'

interface ProductFormProps {
  onSuccess: () => void
  onClose: () => void
  initialData?: any
}

export default function ProductForm({ onSuccess, onClose, initialData }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState(
    initialData || {
      product_code: '',
      product_name: '',
      price: '',
      stock: '',
      low_stock_threshold: '5',
    }
  )

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
    const error = validateField('product', field, value)
    if (error) {
      setErrors({ ...errors, [field]: error })
    } else {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: Record<string, string> = {}
    Object.keys(formRules.product).forEach((field) => {
      const error = validateField('product', field, formData[field])
      if (error) newErrors[field] = error
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fix validation errors')
      return
    }

    setLoading(true)

    try {
      if (initialData?.id) {
        await productsAPI.update(initialData.id, {
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          low_stock_threshold: parseInt(formData.low_stock_threshold),
        })
        toast.success('Product updated successfully')
      } else {
        await productsAPI.create({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          low_stock_threshold: parseInt(formData.low_stock_threshold),
        })
        toast.success('Product created successfully')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.product_code}
          onChange={(e) => handleFieldChange('product_code', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
            errors.product_code ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., P0001"
        />
        {errors.product_code && <p className="text-red-500 text-xs mt-1">{errors.product_code}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.product_name}
          onChange={(e) => handleFieldChange('product_name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
            errors.product_name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., Coffee"
        />
        {errors.product_name && <p className="text-red-500 text-xs mt-1">{errors.product_name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price (Rp) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => handleFieldChange('price', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
              errors.price ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.stock}
            onChange={(e) => handleFieldChange('stock', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
              errors.stock ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="0"
          />
          {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Threshold</label>
        <input
          type="number"
          value={formData.low_stock_threshold}
          onChange={(e) => handleFieldChange('low_stock_threshold', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        {errors.low_stock_threshold && <p className="text-red-500 text-xs mt-1">{errors.low_stock_threshold}</p>}
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition"
        >
          {loading ? 'Saving...' : initialData?.id ? 'Update' : 'Create'}
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
