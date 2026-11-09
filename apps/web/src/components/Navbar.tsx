'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { setToken } from '@/lib/api'

export default function Navbar() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const clear = useAuthStore((s) => s.clear)

  const handleLogout = () => {
    clear()
    setToken(null)
    router.push('/login')
  }

  return (
    <nav className="bg-white shadow">
      <div className="container flex items-center justify-between py-4">
        <div className="flex gap-8">
          <Link href="/dashboard" className="font-bold text-lg">
            Online Shop
          </Link>
          
          {user?.role === 'ADMIN' && (
            <>
              <Link href="/products" className="hover:text-blue-600">Products</Link>
              <Link href="/customers" className="hover:text-blue-600">Customers</Link>
              <Link href="/orders" className="hover:text-blue-600">Orders</Link>
              <Link href="/reports" className="hover:text-blue-600">Reports</Link>
              <Link href="/monitoring" className="hover:text-blue-600">Monitoring</Link>
            </>
          )}
          
          {user?.role === 'CASHIER' && (
            <>
              <Link href="/products" className="hover:text-blue-600">Products</Link>
              <Link href="/orders" className="hover:text-blue-600">Orders</Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name} ({user?.role})</span>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
