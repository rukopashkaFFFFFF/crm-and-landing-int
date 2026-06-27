/**
 * invoices.ts (Server Actions)
 *
 * Server Actions для управления счетами (таблицы invoice, payment).
 * Содержит:
 * - createInvoice — создание счёта с авторасчётом сумм
 * - updateInvoice — обновление счёта
 * - updateInvoiceStatus — смена статуса (при PAID проставляет paidAt)
 * - sendInvoice — отправка счёта на email клиента (также меняет статус на SENT)
 * - recordPayment — запись платежа с автоматическим пересчётом paidAmount
 *   и обновлением статуса на PAID при полной оплате
 *
 * Побочные эффекты: logActivity(), revalidatePath(), emitWebhookEvent(),
 * evaluateAutomationRules().
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { createInvoiceSchema, updateInvoiceSchema, recordPaymentSchema } from "@/lib/validations"
import { canAccess } from "@/lib/permissions"
import { logActivity } from "./activity"
import { sendInvoiceEmail } from "@/lib/mail"
import { emitWebhookEvent } from "@/lib/webhook-emitter"
import { evaluateAutomationRules } from "@/lib/automation-engine"

/**
 * Генерирует номер счёта в формате INV-{year}-{random 4 цифры}.
 *
 * @returns Строка номера счёта, например "INV-2026-3847"
 */
function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `INV-${year}-${rand}`
}

/**
 * Вычисляет subtotal, tax и total для массива позиций.
 *
 * @param items - Массив позиций { quantity, unitPrice, tax }
 * @returns { subtotal, tax, total }
 */
function calcLineTotals(items: any[]) {
  let subtotal = 0
  let tax = 0
  for (const item of items) {
    const st = item.quantity * item.unitPrice
    subtotal += st
    tax += st * (item.tax || 0) / 100
  }
  return { subtotal, tax, total: subtotal + tax }
}

/**
 * Создаёт новый счёт.
 * Проверки: аутентификация, RBAC (invoices/manage), Zod-валидация (createInvoiceSchema).
 * Парсит lineItems из FormData по индексированным ключам.
 * БД: db.invoice.create() с рассчитанными subtotal, tax, total, статусом "DRAFT".
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/finance").
 *
 * @param formData - FormData с полями: clientId, projectId, currency,
 *                   dueDate, notes, terms, lineItems[N].{description,quantity,unitPrice,tax}
 * @returns { data: invoice } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function createInvoice(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "invoices", "manage")) return { error: "Unauthorized" }

  const raw: Record<string, any> = {}
  formData.forEach((v, k) => {
    if (k.startsWith("lineItems")) {
      if (!raw.lineItems) raw.lineItems = []
      const idx = parseInt(k.match(/\[(\d+)\]/)?.[1] || "0")
      const field = k.match(/\.(\w+)$/)?.[1] || ""
      if (!raw.lineItems[idx]) raw.lineItems[idx] = {}
      raw.lineItems[idx][field] = v
    } else {
      raw[k] = v
    }
  })

  const parsed = createInvoiceSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { subtotal, tax, total } = calcLineTotals(parsed.data.lineItems)

  const invoice = await db.invoice.create({
    data: {
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId || null,
      number: generateInvoiceNumber(),
      currency: parsed.data.currency,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      notes: parsed.data.notes || null,
      terms: parsed.data.terms || null,
      lineItems: parsed.data.lineItems as any,
      subtotal, tax, total,
      status: "DRAFT",
    },
  })

  await logActivity({
    type: "INVOICE_CREATED", description: `Created invoice ${invoice.number}`,
    userId: session.user.id, clientId: invoice.clientId, projectId: invoice.projectId || undefined,
  })

  revalidatePath("/dashboard/finance")
  return { data: invoice }
}

/**
 * Обновляет существующий счёт.
 * Проверки: аутентификация, RBAC (invoices/manage), Zod-валидация (updateInvoiceSchema).
 * Если обновляются lineItems — пересчитывает subtotal, tax, total.
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/finance"),
 *   revalidatePath("/dashboard/finance/invoices/{invoiceId}").
 *
 * @param invoiceId - ID счёта
 * @param formData - FormData с обновляемыми полями
 * @returns { data: invoice } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function updateInvoice(invoiceId: string, formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "invoices", "manage")) return { error: "Unauthorized" }

  const raw: Record<string, any> = {}
  formData.forEach((v, k) => {
    if (k.startsWith("lineItems")) {
      if (!raw.lineItems) raw.lineItems = []
      const idx = parseInt(k.match(/\[(\d+)\]/)?.[1] || "0")
      const field = k.match(/\.(\w+)$/)?.[1] || ""
      if (!raw.lineItems[idx]) raw.lineItems[idx] = {}
      raw.lineItems[idx][field] = v
    } else {
      raw[k] = v
    }
  })

  const parsed = updateInvoiceSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const updateData: any = { ...parsed.data }
  if (parsed.data.lineItems) {
    const { subtotal, tax, total } = calcLineTotals(parsed.data.lineItems)
    updateData.subtotal = subtotal
    updateData.tax = tax
    updateData.total = total
  }
  if (parsed.data.dueDate) updateData.dueDate = new Date(parsed.data.dueDate)

  const invoice = await db.invoice.update({ where: { id: invoiceId }, data: updateData })

  await logActivity({
    type: "INVOICE_UPDATED", description: `Updated invoice ${invoice.number}`,
    userId: session.user.id, clientId: invoice.clientId,
  })

  revalidatePath("/dashboard/finance")
  revalidatePath(`/dashboard/finance/invoices/${invoiceId}`)
  return { data: invoice }
}

/**
 * Обновляет статус счёта (DRAFT, SENT, PAID, OVERDUE, CANCELLED).
 * При статусе PAID также устанавливает paidAt = new Date().
 * Проверки: аутентификация, RBAC (invoices/manage).
 * Побочные эффекты: logActivity(), revalidatePath(), emitWebhookEvent("invoice.status_changed"),
 *   evaluateAutomationRules("invoice.status_changed").
 *
 * @param invoiceId - ID счёта
 * @param status - Новый статус
 * @returns { data: invoice } при успехе, { error: string } при ошибке
 */
export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "invoices", "manage")) return { error: "Unauthorized" }

  const updateData: any = { status }
  if (status === "PAID") updateData.paidAt = new Date()

  const invoice = await db.invoice.update({ where: { id: invoiceId }, data: updateData })

  await logActivity({
    type: "INVOICE_UPDATED", description: `Invoice ${invoice.number} marked as ${status}`,
    userId: session.user.id, clientId: invoice.clientId,
  })

  revalidatePath("/dashboard/finance")
  revalidatePath(`/dashboard/finance/invoices/${invoiceId}`)
  emitWebhookEvent("invoice.status_changed", { invoiceId, status, clientId: invoice.clientId })
  evaluateAutomationRules("invoice.status_changed", { invoiceId, status, clientId: invoice.clientId })
  return { data: invoice }
}

/**
 * Отправляет счёт на email клиента и меняет статус на SENT.
 * Проверки: аутентификация, RBAC (invoices/manage), наличие email у клиента.
 * БД: db.invoice.findUnique() → db.invoice.update({ status: "SENT" }) → sendInvoiceEmail()
 * Побочные эффекты: sendInvoiceEmail(), logActivity(), revalidatePath(),
 *   emitWebhookEvent("invoice.sent").
 *
 * @param invoiceId - ID счёта
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function sendInvoice(invoiceId: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "invoices", "manage")) return { error: "Unauthorized" }

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { select: { name: true, email: true } } },
  })
  if (!invoice || !invoice.client.email) return { error: "Client has no email" }

  await db.invoice.update({ where: { id: invoiceId }, data: { status: "SENT" } })
  await sendInvoiceEmail(invoice.client.email, invoice)
  await logActivity({
    type: "INVOICE_SENT", description: `Sent invoice ${invoice.number} to ${invoice.client.email}`,
    userId: session.user.id, clientId: invoice.clientId,
  })

  revalidatePath("/dashboard/finance")
  revalidatePath(`/dashboard/finance/invoices/${invoiceId}`)
  emitWebhookEvent("invoice.sent", { invoiceId, number: invoice.number, clientId: invoice.clientId })
  return { success: true }
}

/**
 * Записывает платеж по счету.
 * Проверки: аутентификация, RBAC (invoices/manage), Zod-валидация (recordPaymentSchema).
 * БД: db.payment.create() → агрегация всех платежей → db.invoice.update({ paidAmount, status }).
 * Если сумма платежей >= total → статус PAID + paidAt.
 * Побочные эффекты: logActivity(), revalidatePath(), emitWebhookEvent("invoice.paid") при полной оплате.
 *
 * @param formData - FormData с полями: invoiceId, amount, date, method, notes
 * @returns { data: payment } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function recordPayment(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "invoices", "manage")) return { error: "Unauthorized" }

  const raw = Object.fromEntries(formData)
  const parsed = recordPaymentSchema.safeParse({
    ...raw, date: raw.date || new Date().toISOString().split("T")[0],
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const payment = await db.payment.create({
    data: {
      invoiceId: parsed.data.invoiceId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      notes: parsed.data.notes || null,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    },
  })

  const allPayments = await db.payment.aggregate({
    where: { invoiceId: parsed.data.invoiceId },
    _sum: { amount: true },
  })
  const paidAmount = allPayments._sum.amount || 0

  const invoice = await db.invoice.findUnique({ where: { id: parsed.data.invoiceId } })
  const newStatus = Number(paidAmount) >= Number(invoice?.total) ? "PAID" : undefined

  await db.invoice.update({
    where: { id: parsed.data.invoiceId },
    data: { paidAmount, ...(newStatus ? { status: newStatus, paidAt: new Date() } : {}) },
  })

  await logActivity({
    type: "PAYMENT_RECORDED", description: `Payment of $${parsed.data.amount} recorded`,
    userId: session.user.id, clientId: invoice?.clientId,
  })

  revalidatePath("/dashboard/finance")
  revalidatePath(`/dashboard/finance/invoices/${parsed.data.invoiceId}`)
  if (newStatus === "PAID") {
    emitWebhookEvent("invoice.paid", { invoiceId: invoice?.id, clientId: invoice?.clientId, amount: Number(paidAmount) })
  }
  return { data: payment }
}
