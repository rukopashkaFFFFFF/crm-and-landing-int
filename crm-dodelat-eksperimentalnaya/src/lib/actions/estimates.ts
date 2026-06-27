/**
 * estimates.ts (Server Actions)
 *
 * Server Actions для управления сметами (таблица estimate).
 * Содержит:
 * - createEstimate — создание сметы с расчётом subtotal/tax/total
 * - updateEstimateStatus — смена статуса сметы
 * - convertEstimateToInvoice — конвертация принятой сметы в счёт
 *
 * Все функции проверяют аутентификацию и RBAC (ресурс "estimates").
 * После операций: logActivity(), revalidatePath("/dashboard/finance").
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { createEstimateSchema } from "@/lib/validations"
import { canAccess } from "@/lib/permissions"
import { logActivity } from "./activity"

/**
 * Вычисляет subtotal, tax и total для массива позиций.
 * Каждая позиция: quantity * unitPrice = строка; налог = строка * tax% / 100.
 *
 * @param items - Массив позиций с полями quantity, unitPrice, tax
 * @returns Объект { subtotal, tax, total }
 */
function calcLineTotals(items: any[]) {
  let subtotal = 0, tax = 0
  for (const item of items) {
    const st = item.quantity * item.unitPrice
    subtotal += st
    tax += st * (item.tax || 0) / 100
  }
  return { subtotal, tax, total: subtotal + tax }
}

/**
 * Создаёт новую смету для клиента/проекта.
 * Проверки: аутентификация, RBAC (estimates/manage), Zod-валидация (createEstimateSchema).
 * Парсит lineItems из FormData (индексированные поля lineItems[N].description и т.д.).
 * БД: db.estimate.create() с рассчитанными subtotal, tax, total, статусом "DRAFT".
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/finance").
 *
 * @param formData - FormData с полями: clientId, projectId, currency,
 *                   validUntil, notes, lineItems[N].{description,quantity,unitPrice,tax}
 * @returns { data: estimate } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function createEstimate(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "estimates", "manage")) return { error: "Unauthorized" }

  const raw: Record<string, any> = {}
  formData.forEach((v, k) => {
    if (k.startsWith("lineItems")) {
      if (!raw.lineItems) raw.lineItems = []
      const idx = parseInt(k.match(/\[(\d+)\]/)?.[1] || "0")
      const field = k.match(/\.(\w+)$/)?.[1] || ""
      if (!raw.lineItems[idx]) raw.lineItems[idx] = {}
      raw.lineItems[idx][field] = v
    } else { raw[k] = v }
  })

  const parsed = createEstimateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { subtotal, tax, total } = calcLineTotals(parsed.data.lineItems)

  const estimate = await db.estimate.create({
    data: {
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId || null,
      currency: parsed.data.currency,
      validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      notes: parsed.data.notes || null,
      lineItems: parsed.data.lineItems as any,
      subtotal, tax, total,
      status: "DRAFT",
    },
  })

  await logActivity({
    type: "ESTIMATE_CREATED", description: `Created estimate #${estimate.id.slice(0, 8)}`,
    userId: session.user.id, clientId: estimate.clientId,
  })

  revalidatePath("/dashboard/finance")
  return { data: estimate }
}

/**
 * Обновляет статус сметы (например, "SENT", "ACCEPTED", "DECLINED").
 * Проверки: аутентификация, RBAC (estimates/manage).
 * БД: db.estimate.update({ status })
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/finance").
 *
 * @param estimateId - ID сметы
 * @param status - Новый статус (SENT, ACCEPTED, DECLINED и т.д.)
 * @returns { data: estimate } при успехе, { error: string } при ошибке
 */
export async function updateEstimateStatus(estimateId: string, status: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "estimates", "manage")) return { error: "Unauthorized" }

  const estimate = await db.estimate.update({ where: { id: estimateId }, data: { status: status as any } })

  await logActivity({
    type: "ESTIMATE_UPDATED", description: `Estimate #${estimate.id.slice(0, 8)} marked as ${status}`,
    userId: session.user.id, clientId: estimate.clientId,
  })

  revalidatePath("/dashboard/finance")
  return { data: estimate }
}

/**
 * Конвертирует принятую смету в счёт (создаёт запись в invoice и меняет статус сметы на ACCEPTED).
 * Проверки: аутентификация, RBAC (estimates/manage + invoices/manage),
 *   существование сметы.
 * БД: db.estimate.findUnique() → db.invoice.create({ ... }) → db.estimate.update({ status: "ACCEPTED" }).
 * Номер счёта генерируется как INV-{year}-{random}.
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/finance").
 *
 * @param estimateId - ID сметы для конвертации
 * @returns { data: invoice } при успехе, { error: string } при ошибке
 */
export async function convertEstimateToInvoice(estimateId: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "estimates", "manage") || !canAccess(session.user.role, "invoices", "manage")) {
    return { error: "Unauthorized" }
  }

  const estimate = await db.estimate.findUnique({ where: { id: estimateId } })
  if (!estimate) return { error: "Estimate not found" }

  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  const invoice = await db.invoice.create({
    data: {
      clientId: estimate.clientId,
      projectId: estimate.projectId,
      number: `INV-${year}-${rand}`,
      currency: estimate.currency,
      lineItems: estimate.lineItems as any,
      subtotal: estimate.subtotal,
      tax: estimate.tax,
      total: estimate.total,
      status: "DRAFT",
    },
  })

  await db.estimate.update({ where: { id: estimateId }, data: { status: "ACCEPTED" } })

  await logActivity({
    type: "ESTIMATE_CONVERTED", description: `Estimate converted to invoice ${invoice.number}`,
    userId: session.user.id, clientId: estimate.clientId,
  })

  revalidatePath("/dashboard/finance")
  return { data: invoice }
}
