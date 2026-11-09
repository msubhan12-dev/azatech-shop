'use client'

import { useState } from 'react'
import { customersAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { validateField, formRules } from '@/lib/validation'

interface CustomerFormProps {
  onSuccess: () => void
  onClose: () => void
  initialData?: any
}

export default function CustomerForm({ onSuccess, onClose, initialData }: CustomerFormProps) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState(
    initialData || {
      customer_name: '',
      customer_address: '',
      gender: 'Pria',
      birth_date: '',
      phone: '',
      email: '',
    }
  )

  const handleFieldChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value })
    const error = validateField('customer', field, value)
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
    Object.keys(formRules.customer).forEach((field) => {
      const error = validateField('customer', field, formData[field])
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
        await customersAPI.update(initialData.id, formData)
        toast.success('Customer updated successfully')
      } else {
        await customersAPI.create(formData)
        toast.success('Customer created successfully')
      }
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.customer_name}
          onChange={(e) => handleFieldChange('customer_name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
            errors.customer_name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Full name"
        />
        {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="email@example.com"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleFieldChange('phone', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
            errors.phone ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="+62..."
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <textarea
          value={formData.customer_address}
          onChange={(e) => handleFieldChange('customer_address', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
            errors.customer_address ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Street address"
          rows={2}
        />
        {errors.customer_address && <p className="text-red-500 text-xs mt-1">{errors.customer_address}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option>Pria</option>
            <option>Wanita</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
          <input
            type="date"
            value={formData.birth_date}
            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t">
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
