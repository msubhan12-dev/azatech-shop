'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { setToken, initializeToken } from '@/lib/api'

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize token from localStorage first
    initializeToken()
    
    // Then initialize token from zustand store
    const accessToken = useAuthStore.getState().accessToken
    if (accessToken) {
      setToken(accessToken)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      {children}
    </QueryClientProvider>
  )
}
