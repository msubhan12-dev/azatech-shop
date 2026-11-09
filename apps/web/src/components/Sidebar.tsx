'use client'

  'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  Activity,
} from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { setToken } from '@/lib/api'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuthStore()
  const clearAuth = useAuthStore((s) => s.clear)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const isAdmin = user?.role === 'ADMIN'

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Orders',
      href: '/orders',
      icon: ShoppingCart,
    },
    {
      label: 'Products',
      href: '/products',
      icon: Package,
      adminOnly: true,
    },
    {
      label: 'Customers',
      href: '/customers',
      icon: Users,
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: BarChart3,
      adminOnly: true,
    },
    {
      label: 'Monitoring',
      href: '/monitoring',
      icon: Activity,
      adminOnly: true,
    },
  ]

  const handleLogout = () => {
    clearAuth()
    setToken(null)
    router.push('/login')
  }

  const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin)

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-blue-600">Online Shop</h1>
        <p className="text-xs text-gray-500 mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {filteredItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t space-y-3">
        <div className="px-4 py-2 bg-gray-50 rounded">
          <p className="text-xs text-gray-600">Logged in as</p>
          <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
          <p className="text-xs text-gray-500">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-white border rounded-lg hover:bg-gray-50"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-64 bg-white border-r shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-screen w-64 bg-white shadow-lg z-40">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
