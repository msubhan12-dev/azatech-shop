'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { Product, PaginatedResponse } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ProductsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    productCode: '', productName: '', stock: '', price: '', lowStockThreshold: '5',
  });

  const page = Number(searchParams.get('page') ?? 1);
  const perPage = Number(searchParams.get('perPage') ?? 10);
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortOrder = searchParams.get('sortOrder') ?? 'desc';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', { page, perPage, search, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
        ...(search && { search }),
        sortBy,
        sortOrder,
      });
      const res = await api.get<PaginatedResponse<Product>>(`/products?${params}`);
      return res.data;
    },
  });

  // Debounce search via URL
  const [searchInput, setSearchInput] = useState(search);
  useMemo(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== search) {
        updateQuery({ search: searchInput, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  function updateQuery(params: Record<string, string | number>) {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, String(value));
      } else {
        newParams.delete(key);
      }
    });
    router.push(`${pathname}?${newParams.toString()}`);
  }

  function handleSort(field: string) {
    const newOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    updateQuery({ sortBy: field, sortOrder: newOrder });
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus produk'),
  });

  const createProductMutation = useMutation({
    mutationFn: async () => {
      await api.post('/products', {
        productCode: createForm.productCode,
        productName: createForm.productName,
        stock: Number(createForm.stock) || 0,
        price: Number(createForm.price) || 0,
        lowStockThreshold: Number(createForm.lowStockThreshold) || 5,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      toast.success('Produk berhasil ditambahkan');
      setShowCreate(false);
      setCreateForm({ productCode: '', productName: '', stock: '', price: '', lowStockThreshold: '5' });
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menambahkan produk';
      toast.error(msg);
    },
  });

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
          >
            Tambah Produk
          </button>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Cari produk..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label="Cari produk"
      />

      {showCreate && (
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200 space-y-3">
          <h2 className="font-semibold text-gray-900">Tambah Produk Baru</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="p-code" className="block text-sm text-gray-600 mb-1">Kode Produk</label>
              <input id="p-code" value={createForm.productCode} onChange={(e) => setCreateForm({ ...createForm, productCode: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="P0001" />
            </div>
            <div>
              <label htmlFor="p-name" className="block text-sm text-gray-600 mb-1">Nama Produk</label>
              <input id="p-name" value={createForm.productName} onChange={(e) => setCreateForm({ ...createForm, productName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Hydrococo 150ml" />
            </div>
            <div>
              <label htmlFor="p-stock" className="block text-sm text-gray-600 mb-1">Stok Awal</label>
              <input id="p-stock" type="number" min="0" value={createForm.stock} onChange={(e) => setCreateForm({ ...createForm, stock: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0" />
            </div>
            <div>
              <label htmlFor="p-price" className="block text-sm text-gray-600 mb-1">Harga</label>
              <input id="p-price" type="number" min="0" step="0.01" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="12000" />
            </div>
            <div>
              <label htmlFor="p-threshold" className="block text-sm text-gray-600 mb-1">Batas Stok Min. (opsional)</label>
              <input id="p-threshold" type="number" min="0" value={createForm.lowStockThreshold} onChange={(e) => setCreateForm({ ...createForm, lowStockThreshold: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="5" />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => createProductMutation.mutate()}
              disabled={!createForm.productCode || !createForm.productName || createProductMutation.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {createProductMutation.isPending ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 font-medium">Batal</button>
          </div>
        </div>
      )}

      {isLoading && <div className="text-gray-500">Memuat...</div>}
      {isError && <div className="text-red-600">Gagal memuat data.</div>}

      {data && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort('productCode')}>
                    Kode {sortBy === 'productCode' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort('productName')}>
                    Nama {sortBy === 'productName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 font-medium">Stok</th>
                  <th className="px-4 py-3 font-medium cursor-pointer" onClick={() => handleSort('price')}>
                    Harga {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  {isAdmin && <th className="px-4 py-3 font-medium">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {data.data.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-gray-400">
                      Tidak ada produk
                    </td>
                  </tr>
                ) : (
                  data.data.map((product) => (
                    <tr key={product.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{product.productCode}</td>
                      <td className="px-4 py-3">
                        {isAdmin && (
                          <Link href={`/dashboard/products/${product.id}`} className="text-primary-600 hover:underline">
                            {product.productName}
                          </Link>
                        )}
                        {!isAdmin && product.productName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={product.stock <= product.lowStockThreshold ? 'text-orange-600 font-medium' : ''}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 space-x-2">
                          <Link
                            href={`/dashboard/products/${product.id}`}
                            className="text-primary-600 hover:underline text-xs"
                          >
            Stock Adj
                          </Link>
                          <button
                            onClick={() => {
                              if (confirm(`Hapus produk "${product.productName}"?`)) {
                                deleteMutation.mutate(product.id);
                              }
                            }}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Total: {data.meta.total} produk
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => updateQuery({ page: page - 1 })}
                disabled={page <= 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page} / {data.meta.total_pages}
              </span>
              <button
                onClick={() => updateQuery({ page: page + 1 })}
                disabled={page >= data.meta.total_pages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
