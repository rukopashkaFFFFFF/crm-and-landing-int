"use client"

/**
 * NotificationBell — колокольчик уведомлений в хедере.
 *
 * Компонент: TopHeader.
 * Показывает количество непрочитанных уведомлений, открывает
 * DropdownMenu со списком. Поддерживает SSE (Server-Sent Events)
 * для получения уведомлений в реальном времени.
 *
 * Server actions: getUnreadCount, getNotifications, markNotificationRead,
 *   markAllNotificationsRead.
 *
 * Состояния:
 * - notifications: массив уведомлений
 * - unread: количество непрочитанных
 * - Polling каждые 30 секунд + SSE
 * - Empty state: "No notifications"
 */

import { useState, useEffect, useCallback } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { getUnreadCount, getNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications"
import { useSSE } from "@/hooks/use-sse"
import { Button } from "@/components/ui/button"
import { t } from "@/lib/translations"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type Notification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  createdAt: string
}

const typeIcons: Record<string, string> = {
  TASK_ASSIGNED: "📋",
  MENTION: "💬",
  INVOICE_SENT: "📄",
  PAYMENT: "💳",
  PROJECT_UPDATED: "🔄",
  LEAD_WON: "🎉",
  LEAD_LOST: "😔",
  INFO: "ℹ️",
  WARNING: "⚠️",
  SUCCESS: "✅",
  ERROR: "❌",
}

/**
 * NotificationBell — колокольчик с уведомлениями.
 *
 * Шаги:
 * 1. При монтировании загружает unread count и список через fetchAll.
 * 2. Подключается к SSE /api/notifications/stream для real-time.
 * 3. Каждые 30 секунд — повторная загрузка (polling).
 * 4. Открытие DropdownMenu показывает 20 последних уведомлений.
 * 5. Клик по уведомлению: markNotificationRead + router.push (если link).
 * 6. Кнопка "Mark all read": markAllNotificationsRead + сброс счётчика.
 *
 * Побочные эффекты: toast при markAllRead.
 *
 * @returns JSX — иконка с бейджем и DropdownMenu
 */
export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)

  const fetchAll = useCallback(async () => {
    const [count, items] = await Promise.all([getUnreadCount(), getNotifications()])
    setUnread(count)
    setNotifications(items as Notification[])
  }, [])

  useSSE("/api/notifications/stream", useCallback((data) => {
    setUnread((prev) => prev + data.count)
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id))
      const newItems = data.notifications.filter((n: any) => !existingIds.has(n.id))
      return [...newItems, ...prev].slice(0, 20)
    })
  }, []))

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  async function handleMarkRead(id: string, link?: string | null) {
    await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnread((prev) => Math.max(0, prev - 1))
    if (link) router.push(link)
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
    toast.success(t("All notifications marked as read"))
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="group/trigger relative inline-flex shrink-0 items-center justify-center rounded-lg h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
            {unread > 9 ? "9+" : unread}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>{t("Notifications")}</span>
            {unread > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="h-3 w-3" /> {t("Mark all read")}
              </button>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">{t("No notifications")}</p>
        )}
        {notifications.map((n) => (
          <DropdownMenuItem
            key={n.id}
            className={`flex items-start gap-3 py-3 cursor-pointer ${!n.read ? "bg-muted/50" : ""}`}
            onClick={() => handleMarkRead(n.id, n.link)}
          >
            <span className="text-lg mt-0.5">{typeIcons[n.type] || "ℹ️"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground truncate">{n.message}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(n.createdAt), "MMM d, h:mm a")}
              </p>
            </div>
            {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
