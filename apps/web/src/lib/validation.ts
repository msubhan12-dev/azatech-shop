export const formRules = {
  product: {
    product_code: { required: true, maxLength: 50, label: 'Product Code' },
    product_name: { required: true, maxLength: 255, label: 'Product Name' },
    price: { required: true, min: 0, label: 'Price' },
    stock: { required: true, min: 0, label: 'Stock' },
    low_stock_threshold: { min: 0, default: 5, label: 'Low Stock Threshold' },
  },
  customer: {
    customer_name: { required: true, maxLength: 255, label: 'Full Name' },
    email: { pattern: 'email', maxLength: 255, label: 'Email' },
    phone: { maxLength: 20, label: 'Phone' },
    customer_address: { maxLength: 500, label: 'Address' },
    gender: { label: 'Gender' },
    birth_date: { label: 'Birth Date' },
  },
  order: {
    customer_id: { required: true, label: 'Customer' },
    items: { required: true, minItems: 1, label: 'Order Items' },
  },
}

export interface FieldRule {
  required?: boolean
  pattern?: 'email' | string
  maxLength?: number
  minItems?: number
  min?: number
  default?: any
  label?: string
}

export function validateField(entity: string, field: string, value: any): string | null {
  const rules = formRules[entity as keyof typeof formRules]
  if (!rules) return null

  const rule = rules[field as keyof typeof rules] as FieldRule | undefined
  if (!rule) return null

  // Required validation
  if (rule.required) {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      return `${rule.label || field} is required`
    }
  }

  // Min items validation
  if (rule.minItems && Array.isArray(value)) {
    if (value.length < rule.minItems) {
      return `At least ${rule.minItems} item(s) required`
    }
  }

  // Min value validation
  if (rule.min !== undefined && typeof value === 'number') {
    if (value < rule.min) {
      return `${rule.label || field} must be at least ${rule.min}`
    }
  }

  // Max length validation
  if (rule.maxLength && typeof value === 'string') {
    if (value.length > rule.maxLength) {
      return `${rule.label || field} cannot exceed ${rule.maxLength} characters`
    }
  }

  // Pattern validation
  if (rule.pattern && value) {
    if (rule.pattern === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return 'Invalid email format'
      }
    }
  }

  return null
}

export function validateForm(entity: string, data: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {}
  const rules = formRules[entity as keyof typeof formRules]

  if (!rules) return errors

  Object.entries(rules).forEach(([field]) => {
    const error = validateField(entity, field, data[field])
    if (error) {
      errors[field] = error
    }
  })

  return errors
}
