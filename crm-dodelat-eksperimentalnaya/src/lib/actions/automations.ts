/**
 * automations.ts (Server Actions)
 *
 * Server Actions для управления правилами автоматизации.
 * Обслуживает CRUD для таблицы automationRule:
 * - Создание правила (createRule)
 * - Удаление правила (deleteRule)
 * - Включение/отключение правила (toggleRule)
 *
 * Все функции требуют роль с доступом к settings (manage).
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { canAccess } from "@/lib/permissions"

/**
 * Создаёт новое правило автоматизации.
 * Проверки: аутентификация, RBAC (settings/manage).
 * Валидация: name и trigger обязательны, actions — JSON-массив.
 * Побочные эффекты: revalidatePath("/dashboard/settings").
 *
 * @param formData - FormData с полями: name, trigger, description, actions (JSON-строка)
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function createRule(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "settings", "manage")) return { error: "Unauthorized" }

  const name = formData.get("name") as string
  const trigger = formData.get("trigger") as string
  const description = formData.get("description") as string

  if (!name || !trigger) return { error: "Name and trigger are required" }

  let actions: any[]
  try {
    const rawActions = formData.get("actions") as string
    actions = rawActions ? JSON.parse(rawActions) : []
    if (!Array.isArray(actions)) throw new Error()
  } catch {
    return { error: "Actions must be valid JSON array" }
  }

  await db.automationRule.create({ data: { name, description, trigger, actions } })

  revalidatePath("/dashboard/settings")
  return { success: true }
}

/**
 * Удаляет правило автоматизации по ID.
 * Проверки: аутентификация, RBAC (settings/manage).
 * Побочные эффекты: revalidatePath("/dashboard/settings").
 *
 * @param id - ID правила автоматизации
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function deleteRule(id: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "settings", "manage")) return { error: "Unauthorized" }

  await db.automationRule.delete({ where: { id } })

  revalidatePath("/dashboard/settings")
  return { success: true }
}

/**
 * Включает или отключает правило автоматизации.
 * Проверки: аутентификация, RBAC (settings/manage).
 * Побочные эффекты: revalidatePath("/dashboard/settings").
 *
 * @param id - ID правила
 * @param active - Новый статус (true = активно, false = отключено)
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function toggleRule(id: string, active: boolean) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "settings", "manage")) return { error: "Unauthorized" }

  await db.automationRule.update({ where: { id }, data: { active } })

  revalidatePath("/dashboard/settings")
  return { success: true }
}
