/**
 * providers.tsx
 *
 * Клиентский корневой провайдер приложения (Client Component).
 * Оборачивает дерево компонентов в SessionProvider (next-auth)
 * для доступа к сессии на клиенте и QueryClientProvider (TanStack Query)
 * для управления серверным состоянием (кэширование, повторные запросы).
 */

"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SessionProvider } from "next-auth/react"
import { useState } from "react"

interface ProvidersProps {
  children: React.ReactNode
}

/**
 * Провайдер, оборачивающий приложение в SessionProvider и
 * QueryClientProvider. QueryClient создаётся один раз при
 * монтировании компонента (через useState).
 *
 * @param children - Дочерние компоненты приложения
 * @returns Оборачивающий провайдер
 */
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  )
}
