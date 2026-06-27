"use client"

/**
 * TopHeader — верхняя панель (хедер) CRM.
 *
 * Отображается на всех страницах /dashboard/* справа от Sidebar.
 * Содержит колокольчик уведомлений и командную палитру.
 *
 * @returns JSX — header с уведомлениями
 */

import { NotificationBell } from "@/components/crm/notifications/notification-bell"
import { CommandPalette } from "@/components/crm/command-palette"

/**
 * TopHeader — хедер с уведомлениями и палитрой.
 *
 * @returns JSX — header
 */
export function TopHeader() {
  return (
    <header className="flex items-center justify-end h-14 px-6 border-b bg-background">
      <div className="flex items-center gap-3">
        <NotificationBell />
      </div>
      <CommandPalette />
    </header>
  )
}
