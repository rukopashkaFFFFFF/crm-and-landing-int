/**
 * webhooks.ts (Server Actions)
 *
 * Server Actions для управления webhook'ами (таблица webhook).
 * Содержит:
 * - createWebhook — создание нового webhook'а
 * - deleteWebhook — удаление webhook'а
 * - testWebhook — отправка тестового ping-события на URL webhook'а
 *
 * Все функции проверяют аутентификацию и RBAC (ресурс "settings").
 * Побочные эффекты: revalidatePath("/dashboard/settings").
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { canAccess } from "@/lib/permissions"

/**
 * Создаёт новый webhook для отправки событий на внешний URL.
 * Проверки: аутентификация, RBAC (settings/manage).
 * Валидация: url и хотя бы одно событие обязательны.
 * БД: db.webhook.create()
 * Побочные эффекты: revalidatePath("/dashboard/settings").
 *
 * @param formData - FormData с полями: url, events (строка через запятую), secret
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function createWebhook(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "settings", "manage")) return { error: "Unauthorized" }

  const url = formData.get("url") as string
  const eventsRaw = formData.get("events") as string
  const secret = formData.get("secret") as string

  const events = eventsRaw ? eventsRaw.split(",").map(s => s.trim()).filter(Boolean) : []

  if (!url || events.length === 0) return { error: "URL and events are required" }

  await db.webhook.create({
    data: { url, events, secret: secret || undefined },
  })

  revalidatePath("/dashboard/settings")
  return { success: true }
}

/**
 * Удаляет webhook по ID.
 * Проверки: аутентификация, RBAC (settings/manage).
 * БД: db.webhook.delete()
 * Побочные эффекты: revalidatePath("/dashboard/settings").
 *
 * @param id - ID webhook'а
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function deleteWebhook(id: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "settings", "manage")) return { error: "Unauthorized" }

  await db.webhook.delete({ where: { id } })

  revalidatePath("/dashboard/settings")
  return { success: true }
}

/**
 * Отправляет тестовый ping-запрос на URL webhook'а.
 * Проверки: аутентификация, RBAC (settings/manage), существование webhook'а.
 * Отправляет POST с JSON: { event: "ping", timestamp, data: {} }.
 * При наличии секрета добавляет заголовок X-Webhook-Secret.
 * Обновляет lastCall, lastStatus, lastResponse в БД.
 * Побочные эффекты: обновление записи webhook'а в БД.
 *
 * @param id - ID webhook'а для тестирования
 * @returns { success: true, status: number } при успехе,
 *          { error: string } при ошибке
 */
export async function testWebhook(id: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "settings", "manage")) return { error: "Unauthorized" }

  const webhook = await db.webhook.findUnique({ where: { id } })
  if (!webhook) return { error: "Webhook not found" }

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhook.secret ? { "X-Webhook-Secret": webhook.secret } : {}),
      },
      body: JSON.stringify({ event: "ping", timestamp: new Date().toISOString(), data: {} }),
    })

    const responseText = await res.text().catch(() => null)

    await db.webhook.update({
      where: { id },
      data: { lastCall: new Date(), lastStatus: res.status, lastResponse: responseText },
    })

    return { success: true, status: res.status }
  } catch (e: any) {
    await db.webhook.update({
      where: { id },
      data: { lastCall: new Date(), lastStatus: 0, lastResponse: e.message },
    })

    return { error: e.message }
  }
}
