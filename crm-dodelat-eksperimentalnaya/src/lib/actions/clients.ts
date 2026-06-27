/**
 * clients.ts (Server Actions)
 *
 * Server Actions для управления клиентами (таблица client).
 * Содержит полный CRUD:
 * - createClient — создание одного клиента
 * - updateClient — обновление данных клиента
 * - deleteClient — удаление клиента
 * - importClients — массовый импорт из CSV
 * - updateClientNotes — обновление заметок клиента
 *
 * Все функции проверяют аутентификацию и RBAC (ресурс "clients", действие "manage").
 * После операций с БД выполняются побочные эффекты:
 * logActivity(), revalidatePath(), emitWebhookEvent(), evaluateAutomationRules().
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { createClientSchema, updateClientSchema, csvImportSchema } from "@/lib/validations"
import { canAccess } from "@/lib/permissions"
import { logActivity } from "./activity"
import { emitWebhookEvent } from "@/lib/webhook-emitter"
import { evaluateAutomationRules } from "@/lib/automation-engine"

/**
 * Создаёт нового клиента из данных формы.
 * Проверки: аутентификация, RBAC (clients/manage), Zod-валидация (createClientSchema).
 * БД: db.client.create()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/clients"),
 *   emitWebhookEvent("client.created"), evaluateAutomationRules("client.created").
 *
 * @param formData - FormData с полями: name, email, phone, company, website,
 *                   country, notes, status, source, tags, assignedToId
 * @returns { data: client } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function createClient(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "clients", "manage")) {
    return { error: "Unauthorized" }
  }

  const raw = Object.fromEntries(formData)
  const tags = formData.getAll("tags").filter(Boolean)
  const parsed = createClientSchema.safeParse({ ...raw, tags, assignedToId: raw.assignedToId || null })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const client = await db.client.create({
    data: parsed.data,
  })

  await logActivity({
    type: "CLIENT_CREATED",
    description: `Created client: ${client.name}`,
    userId: session.user.id,
    clientId: client.id,
  })

  revalidatePath("/dashboard/clients")
  emitWebhookEvent("client.created", { clientId: client.id, name: client.name })
  evaluateAutomationRules("client.created", { clientId: client.id, name: client.name })
  return { data: client }
}

/**
 * Обновляет данные существующего клиента.
 * Проверки: аутентификация, RBAC (clients/manage), Zod-валидация (updateClientSchema).
 * БД: db.client.update()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/clients"),
 *   revalidatePath("/dashboard/clients/{clientId}").
 *
 * @param clientId - ID обновляемого клиента
 * @param formData - FormData с обновляемыми полями (все опциональны)
 * @returns { data: client } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function updateClient(clientId: string, formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "clients", "manage")) {
    return { error: "Unauthorized" }
  }

  const raw = Object.fromEntries(formData)
  const tags = formData.getAll("tags").filter(Boolean)
  const parsed = updateClientSchema.safeParse({ ...raw, tags, assignedToId: raw.assignedToId || null })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const client = await db.client.update({
    where: { id: clientId },
    data: parsed.data,
  })

  await logActivity({
    type: "CLIENT_UPDATED",
    description: `Updated client: ${client.name}`,
    userId: session.user.id,
    clientId: client.id,
  })

  revalidatePath("/dashboard/clients")
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data: client }
}

/**
 * Удаляет клиента по ID.
 * Проверки: аутентификация, RBAC (clients/manage).
 * БД: db.client.delete()
 * Побочные эффекты: revalidatePath("/dashboard/clients").
 *
 * @param clientId - ID удаляемого клиента
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function deleteClient(clientId: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "clients", "manage")) {
    return { error: "Unauthorized" }
  }

  await db.client.delete({ where: { id: clientId } })

  revalidatePath("/dashboard/clients")
  return { success: true }
}

/**
 * Импортирует клиентов из массива строк (CSV).
 * Проверки: аутентификация, RBAC (clients/manage), Zod-валидация (csvImportSchema).
 * БД: db.client.create() для каждой строки.
 * Для каждой строки: если статус невалидный — устанавливается "LEAD".
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/clients").
 *
 * @param raw.rows - Массив объектов с полями: name (обяз.), email, phone, company, status
 * @returns { data: Client[] } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function importClients(raw: { rows: { name: string; email?: string; phone?: string; company?: string; status?: string }[] }) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "clients", "manage")) {
    return { error: "Unauthorized" }
  }

  const parsed = csvImportSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const validStatuses = ["LEAD", "ACTIVE", "INACTIVE", "CHURNED"] as const

  const created = []
  for (const row of parsed.data.rows) {
    const status = validStatuses.includes(row.status as any) ? (row.status as any) : "LEAD"
    const client = await db.client.create({
      data: {
        name: row.name,
        email: row.email || null,
        phone: row.phone || null,
        company: row.company || null,
        status,
      },
    })
    created.push(client)
  }

  await logActivity({
    type: "CLIENT_CREATED",
    description: `Imported ${created.length} clients from CSV`,
    userId: session.user.id,
  })

  revalidatePath("/dashboard/clients")
  return { data: created }
}

/**
 * Обновляет заметки клиента (без изменения остальных полей).
 * Проверки: аутентификация, RBAC (clients/manage).
 * БД: db.client.update({ notes })
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/clients/{clientId}").
 *
 * @param clientId - ID клиента
 * @param notes - Новый текст заметок
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function updateClientNotes(clientId: string, notes: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "clients", "manage")) {
    return { error: "Unauthorized" }
  }

  await db.client.update({
    where: { id: clientId },
    data: { notes },
  })

  await logActivity({
    type: "CLIENT_UPDATED",
    description: "Updated client notes",
    userId: session.user.id,
    clientId,
  })

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { success: true }
}
