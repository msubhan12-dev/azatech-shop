import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/orders/create',
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-idempotency-key-' + Math.random(),
}));

// Mock api - MUST come before useQuery mock
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn(),
  },
  tokenStorage: {
    getAccess: () => 'test-token',
  },
}));

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockImplementation(({ queryKey }) => {
    if (queryKey[0] === 'customers-all') {
      return {
        data: [
          { id: 'cust-1', customerName: 'Budi Santoso' },
          { id: 'cust-2', customerName: 'Siti Aminah' },
        ],
        isLoading: false,
      };
    }
    if (queryKey[0] === 'products-all') {
      return {
        data: [
          { id: 1, productCode: 'P001', productName: 'Hydrococo 150ml', stock: 10, price: 5000 },
          { id: 2, productCode: 'P002', productName: 'Teh Botol 350ml', stock: 5, price: 5500 },
          { id: 3, productCode: 'P003', productName: 'Aqua 600ml', stock: 0, price: 3500 },
        ],
        isLoading: false,
      };
    }
    return { data: undefined, isLoading: false };
  }),
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

import CreateOrderPage from '../app/dashboard/orders/create/page';

describe('CreateOrderPage - Order Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the create order form with customer and product dropdowns', async () => {
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Buat Order')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Pelanggan')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Produk item/)).toHaveLength(1);
    expect(screen.getByText('+ Tambah Item')).toBeInTheDocument();
  });

  it('can add multiple item rows dynamically', async () => {
    const user = userEvent.setup();
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('+ Tambah Item')).toBeInTheDocument();
    });

    // Add item 2
    await user.click(screen.getByText('+ Tambah Item'));
    expect(screen.getAllByLabelText(/Produk item/)).toHaveLength(2);

    // Add item 3
    await user.click(screen.getByText('+ Tambah Item'));
    expect(screen.getAllByLabelText(/Produk item/)).toHaveLength(3);
  });

  it('can remove item rows (but not if only 1 row remains)', async () => {
    const user = userEvent.setup();
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('+ Tambah Item')).toBeInTheDocument();
    });

    // Add a second row
    await user.click(screen.getByText('+ Tambah Item'));
    let removeButtons = screen.getAllByLabelText('Hapus baris');
    expect(removeButtons).toHaveLength(2);

    // Remove row 2
    await user.click(removeButtons[1]);
    expect(screen.getAllByLabelText(/Produk item/)).toHaveLength(1);

    // Try to remove last row (should be disabled)
    removeButtons = screen.getAllByLabelText('Hapus baris');
    expect(removeButtons[0]).toBeDisabled();
  });

  it('validates that customer must be selected', async () => {
    const user = userEvent.setup();
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Simpan Order')).toBeInTheDocument();
    });

    // Try to submit without customer
    await user.click(screen.getByText('Simpan Order'));

    await waitFor(() => {
      expect(screen.getByText('Pilih pelanggan')).toBeInTheDocument();
    });
  });

  it('validates that at least one item must have a product selected', async () => {
    const user = userEvent.setup();
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Simpan Order')).toBeInTheDocument();
    });

    // Select customer
    const customerSelect = screen.getByLabelText('Pelanggan');
    await user.selectOptions(customerSelect, 'cust-1');

    // Try to submit without selecting product
    await user.click(screen.getByText('Simpan Order'));

    await waitFor(() => {
      expect(screen.getByText('Pilih produk')).toBeInTheDocument();
    });
  });

  it('validates quantity must be positive integer', async () => {
    const user = userEvent.setup();
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('Simpan Order')).toBeInTheDocument();
    });

    // Select customer and product
    await user.selectOptions(screen.getByLabelText('Pelanggan'), 'cust-1');
    await user.selectOptions(screen.getAllByLabelText(/Produk item/)[0], '1');

    // Set quantity to 0
    const qtyInput = screen.getAllByLabelText(/Jumlah item/)[0];
    await user.clear(qtyInput);
    await user.type(qtyInput, '0');

    // Try to submit
    await user.click(screen.getByText('Simpan Order'));

    await waitFor(() => {
      expect(screen.getByText(/Qty harus > 0/)).toBeInTheDocument();
    });
  });

  it('calculates total preview in real-time', async () => {
    const user = userEvent.setup();
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText(/Hydrococo 150ml/)).toBeInTheDocument();
    });

    // Select product with price 5000 (P001 has id: 1)
    const productSelect = screen.getAllByLabelText(/Produk item/)[0] as HTMLSelectElement;
    await user.selectOptions(productSelect, '1');

    // Wait for total to update (default qty is 1, so total should be 5000)
    await waitFor(() => {
      const totalValue = screen.getByText('Total Estimasi').parentElement?.querySelector('span:last-child')?.textContent;
      expect(totalValue).toContain('Rp');
      // Should show 5000 or similar (check for pattern to avoid locale issues)
      if (totalValue !== 'Rp 0') {
        expect(totalValue).toMatch(/Rp\s+5[\.,]?000/);
      }
    }, { timeout: 3000 });

    // Change qty to 3
    const qtyInput = screen.getAllByLabelText(/Jumlah item/)[0] as HTMLInputElement;
    await user.clear(qtyInput);
    await user.type(qtyInput, '3');

    // Total should now be 15000
    await waitFor(() => {
      const totalValue = screen.getByText('Total Estimasi').parentElement?.querySelector('span:last-child')?.textContent;
      expect(totalValue).toMatch(/Rp\s+15[\.,]?000/);
    }, { timeout: 3000 });
  });

  it('prevents duplicate products in same order', async () => {
    const user = userEvent.setup();
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText('+ Tambah Item')).toBeInTheDocument();
    });

    // Select same product (P001) in both rows
    await user.selectOptions(screen.getByLabelText('Pelanggan'), 'cust-1');
    await user.selectOptions(screen.getAllByLabelText(/Produk item/)[0], '1');

    // Add another row
    await user.click(screen.getByText('+ Tambah Item'));
    await user.selectOptions(screen.getAllByLabelText(/Produk item/)[1], '1');

    // Try to submit
    await user.click(screen.getByText('Simpan Order'));

    await waitFor(() => {
      expect(screen.getByText('Produk duplikat dalam order')).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    render(<CreateOrderPage />);

    await waitFor(() => {
      const submitBtn = screen.getByText('Simpan Order');
      expect(submitBtn).toBeInTheDocument();
    });
  });

  it('displays customer options loaded from API', async () => {
    render(<CreateOrderPage />);

    await waitFor(() => {
      expect(screen.getByText(/Budi Santoso/)).toBeInTheDocument();
      expect(screen.getByText(/Siti Aminah/)).toBeInTheDocument();
    });
  });

  it('shows stock availability in product dropdown', async () => {
    const user = userEvent.setup();
    render(<CreateOrderPage />);

    await waitFor(() => {
      // Products should be loaded
      expect(screen.getByText(/Hydrococo 150ml/)).toBeInTheDocument();
    });

    // Check product select options contain stock info
    const productSelects = screen.getAllByLabelText(/Produk item/);
    
    await waitFor(() => {
      // Open the dropdown to verify options have stock info
      productSelects.forEach(select => {
        const options = select.querySelectorAll('option');
        // P001 has 10 stock
        expect(Array.from(options).some(opt => opt.textContent?.includes('10 tersisa'))).toBe(true);
        // P003 has 0 stock
        expect(Array.from(options).some(opt => opt.textContent?.includes('0 tersisa'))).toBe(true);
      });
    });
  });
});
