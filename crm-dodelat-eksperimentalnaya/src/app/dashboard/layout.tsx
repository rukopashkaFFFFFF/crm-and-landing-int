/**
 * @file Layout-компонент для всех страниц дашборда.
 *
 * @description Оборачивает страницы панели управления в общий UI:
 * - Providers (ThemeProvider, SessionProvider и т.д.).
 * - Sidebar (навигация).
 * - TopHeader (шапка с польз. меню).
 * - Основной контент (children).
 *
 * @route /dashboard/*
 * @exports DashboardLayout — серверный компонент layout.
 */

import { Providers } from "@/lib/providers"
import { Sidebar } from "@/components/crm/sidebar"
import { TopHeader } from "@/components/crm/top-header"

interface DashboardLayoutProps {
  children: React.ReactNode
}

/**
 * Layout дашборда с сайдбаром и хедером.
 *
 * @param {DashboardLayoutProps} props - Дочерние компоненты.
 * @returns {JSX.Element} Обёртка для всех страниц дашборда.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Providers>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopHeader />
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </div>
    </Providers>
  )
}
