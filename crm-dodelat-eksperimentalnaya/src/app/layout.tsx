/**
 * @file Корневой Layout-компонент приложения (Next.js RootLayout).
 *
 * @description Определяет глобальную HTML-структуру для ВСЕХ страниц CRM.
 * - Подключает шрифты Geist (Sans и Mono) через next/font/google.
 * - Устанавливает мета-данные (title, description) для SEO.
 * - Добавляет глобальные CSS-стили (globals.css).
 * - Рендерит компонент Toaster (sonner) для всплывающих уведомлений.
 *
 * @route Применяется ко всем маршрутам (корневой layout).
 * @exports metadata — объект Metadata для SEO.
 * @exports RootLayout — компонент-обёртка для дочерних страниц.
 */

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"

import "./globals.css"
import { t } from "@/lib/translations"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "CRM",
    template: "%s | CRM",
  },
  description: t("Web Development Agency CRM"),
}

/**
 * Корневой Layout Next.js.
 *
 * @param {Readonly<{ children: React.ReactNode }>} props - Дочерние компоненты (страницы).
 * @returns {JSX.Element} HTML-документ с подключёнными шрифтами, Toaster и children.
 *
 * @sideeffect Устанавливает `lang="ru"`, CSS-классы шрифтов и `h-full`.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors />
      </body>
    </html>
  )
}
