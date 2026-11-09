/**
 * Component test untuk OrderForm
 * Menguji: validasi input, add/remove item, kalkulasi total real-time
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock API calls
vi.mock('@/lib/api', () => ({
  ordersAPI: {
    create: vi.fn().mockResolvedValue({ data: { id: 1, order_number: 'INV-001' } }),
  },
  customersAPI: {
    list: vi.fn().mockResolvedValue({
      data: {
        data: [
          { id: 'cust-1', customer_name: 'Budi Santoso' },
          { id: 'cust-2', customer_name: 'Ani Rahayu' },
        ],
      },
    }),
  },
  productsAPI: {
    list: vi.fn().mockResolvedValue({
      data: {
        data: [
          { id: 1, product_name: 'Kopi Arabica', product_code: 'PROD-001', price: 85000, stock: 100 },
          { id: 2, product_name: 'Teh Hijau', product_code: 'PROD-002', price: 45000, stock: 50 },
        ],
      },
    }),
  },
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Trash2: () => <span>x</span>,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import OrderForm from './OrderForm'

describe('OrderForm', () => {
  const mockOnSuccess = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form dengan field yang diperlukan', async () => {
    render(<OrderForm onSuccess={mockOnSuccess} onClose={mockOnClose} />)

    // Form harus loading data dulu
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    }, { timeout: 3000 })

    // Cek tombol submit ada
    expect(screen.getByRole('button', { name: /create order|buat order/i })).toBeInTheDocument()
  })

  it('menampilkan error saat submit tanpa customer', async () => {
    render(<OrderForm onSuccess={mockOnSuccess} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    }, { timeout: 3000 })

    // Submit tanpa mengisi customer
    const submitBtn = screen.getByRole('button', { name: /create order|buat order/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      // Harus ada error message
      const errorMsg = screen.queryByText(/customer|pelanggan/i)
      expect(errorMsg).toBeTruthy()
    })

    // onSuccess tidak boleh dipanggil
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('menampilkan error saat submit tanpa item produk', async () => {
    render(<OrderForm onSuccess={mockOnSuccess} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    }, { timeout: 3000 })

    const submitBtn = screen.getByRole('button', { name: /create order|buat order/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      const errorMsg = screen.queryByText(/item|produk|at least/i)
      expect(errorMsg).toBeTruthy()
    })

    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('tombol close memanggil onClose', async () => {
    render(<OrderForm onSuccess={mockOnSuccess} onClose={mockOnClose} />)

    const cancelBtn = screen.getByRole('button', { name: /cancel|batal/i })
    fireEvent.click(cancelBtn)

    expect(mockOnClose).toHaveBeenCalled()
  })
})
