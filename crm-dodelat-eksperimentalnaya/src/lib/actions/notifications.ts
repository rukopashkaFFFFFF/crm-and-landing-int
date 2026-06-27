/**
 * notifications.ts (Server Actions)
 *
 * Server Actions для работы с уведомлениями пользователя (таблица notification).
 * Содержит:
 * - getNotifications — получение последних 20 уведомлений
 * - markNotificationRead — отметка одного уведомления как прочитанного
 * - markAllNotificationsRead — отметка всех уведомлений как прочитанных
 * - getUnreadCount — получение количества непрочитанных уведомлений
 *
 * Все функции проверяют аутентификацию (без RBAC, т.к. уведомления
 * привязаны к конкретному пользователю).
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

/**
 * Возвращает последние 20 уведомлений текущего пользователя.
 * Проверки: аутентификация (если нет сессии — пустой массив).
 *
 * @returns Массив уведомлений (сериализованный через JSON.parse/stringify)
 */
export async function getNotifications() {
  const session = await auth()
  if (!session) return []

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return JSON.parse(JSON.stringify(notifications))
}

/**
 * Отмечает одно уведомление как прочитанное.
 * Проверки: аутентификация, проверка принадлежности уведомления пользователю.
 * Побочные эффекты: revalidatePath("/dashboard").
 *
 * @param notificationId - ID уведомления
 */
export async function markNotificationRead(notificationId: string) {
  const session = await auth()
  if (!session) return

  await db.notification.update({
    where: { id: notificationId, userId: session.user.id },
    data: { read: true },
  })

  revalidatePath("/dashboard")
}

/**
 * Отмечает все непрочитанные уведомления текущего пользователя как прочитанные.
 * Проверки: аутентификация.
 * Побочные эффекты: revalidatePath("/dashboard").
 */
export async function markAllNotificationsRead() {
  const session = await auth()
  if (!session) return

  await db.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })

  revalidatePath("/dashboard")
}

/**
 * Возвращает количество непрочитанных уведомлений текущего пользователя.
 * Проверки: аутентификация (без сессии — 0).
 *
 * @returns Число непрочитанных уведомлений
 */
export async function getUnreadCount() {
  const session = await auth()
  if (!session) return 0

  const count = await db.notification.count({
    where: { userId: session.user.id, read: false },
  })

  return count
}
