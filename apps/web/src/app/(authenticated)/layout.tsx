'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, initializeToken } from '@/lib/api'
import Sidebar from '@/components/Sidebar'

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    initializeToken()
    if (!getToken()) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
