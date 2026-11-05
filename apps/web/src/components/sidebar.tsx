'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  BarChart3,
  LogOut,
  FileText,
  Zap,
  Cog,
} from 'lucide-react';
import { User } from '@/types';

const mainMenuItems = [
  { href: '/dashboard', label: '📊 Dashboard', icon: LayoutDashboard, roles: ['admin', 'cashier'], exact: true },
  { href: '/dashboard/products', label: '📦 Produk', icon: Package, roles: ['admin', 'cashier'] },
  { href: '/dashboard/customers', label: '👥 Pelanggan', icon: Users, roles: ['admin', 'cashier'] },
  { href: '/dashboard/orders', label: '🛒 Order', icon: ShoppingCart, roles: ['admin', 'cashier'] },
];

const adminMenuItems = [
  { href: '/dashboard/reports', label: '📊 Laporan', icon: BarChart3, roles: ['admin'] },
  { href: '/dashboard/audit', label: '📋 Audit Log', icon: FileText, roles: ['admin'] },
  { href: '/dashboard/redis', label: '⚡ Redis Cache', icon: Zap, roles: ['admin'] },
  { href: '/dashboard/queue', label: '⚙️ Job Queue', icon: Cog, roles: ['admin'] },
];

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
}

export function Sidebar({ user, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const role = user?.role ?? 'cashier';

  const mainVisible = mainMenuItems.filter((item) => item.roles.includes(role));
  const adminVisible = adminMenuItems.filter((item) => item.roles.includes(role));

  const isActive = (item: any) => {
    const isExact = item.exact === true;
    return isExact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/');
  };

  return (
    <aside className="w-64 h-full bg-gray-900 border-r border-gray-700 flex flex-col text-white overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-black">
        <h1 className="text-2xl font-bold text-white">🏪 Azatech</h1>
        <p className="text-xs text-gray-400 mt-1">Order Management System</p>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        <p className="text-xs font-bold text-gray-500 uppercase px-3 mb-4 tracking-widest">Main Menu</p>
        {mainVisible.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {active && <div className="ml-auto w-2 h-2 bg-white rounded-full" />}
            </Link>
          );
        })}

        {/* Admin Section */}
        {adminVisible.length > 0 && (
          <>
            <p className="text-xs font-bold text-gray-500 uppercase px-3 mt-8 mb-4 tracking-widest">Admin Panel</p>
            {adminVisible.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    active
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {active && <div className="ml-auto w-2 h-2 bg-white rounded-full" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <p className="text-sm font-bold text-white truncate">{user?.name}</p>
          <p className="text-xs text-gray-300 truncate mt-1">{user?.email}</p>
          <span className={`inline-block mt-2 px-3 py-1 text-xs font-bold rounded-full ${
            role === 'admin' 
              ? 'bg-purple-600 text-white' 
              : 'bg-blue-600 text-white'
          }`}>
            {role === 'admin' ? '👑 Admin' : '👤 Kasir'}
          </span>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
