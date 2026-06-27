/**
 * leads.ts (Server Actions)
 *
 * Server Actions для управления лидами (таблица lead) и их воронкой продаж.
 * Содержит:
 * - createLead — создание лида для клиента
 * - updateLead — обновление данных лида
 * - moveLeadStage — перемещение лида по этапам (с возможным указанием
 *   причины проигрыша при этапе LOST)
 *
 * Все функции проверяют аутентификацию и RBAC (ресурс "leads").
 * Побочные эффекты: logActivity(), revalidatePath(), emitWebhookEvent(),
 * evaluateAutomationRules().
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { createLeadSchema, updateLeadSchema } from "@/lib/validations"
import { canAccess } from "@/lib/permissions"
import { logActivity } from "./activity"
import { emitWebhookEvent } from "@/lib/webhook-emitter"
import { evaluateAutomationRules } from "@/lib/automation-engine"

/**
 * Создаёт новый лид для клиента.
 * Проверки: аутентификация, RBAC (leads/manage), Zod-валидация (createLeadSchema).
 * БД: db.lead.create()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/leads"),
 *   revalidatePath("/dashboard/clients").
 *
 * @param formData - FormData с полями: clientId, stage, value, probability,
 *                   expectedCloseDate, notes, lostReason
 * @returns { data: lead } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function createLead(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "leads", "manage")) {
    return { error: "Unauthorized" }
  }

  const raw = Object.fromEntries(formData)
  const parsed = createLeadSchema.safeParse({
    ...raw,
    value: raw.value || "0",
    probability: raw.probability || "0",
    expectedCloseDate: raw.expectedCloseDate || null,
    lostReason: raw.lostReason || null,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const lead = await db.lead.create({
    data: parsed.data,
  })

  await logActivity({
    type: "LEAD_CREATED",
    description: `Created lead for client`,
    userId: session.user.id,
    clientId: lead.clientId,
  })

  revalidatePath("/dashboard/leads")
  revalidatePath("/dashboard/clients")
  return { data: lead }
}

/**
 * Обновляет данные существующего лида.
 * Проверки: аутентификация, RBAC (leads/manage), Zod-валидация (updateLeadSchema).
 * БД: db.lead.update()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/leads"),
 *   revalidatePath("/dashboard/clients").
 *
 * @param leadId - ID лида
 * @param formData - FormData с обновляемыми полями
 * @returns { data: lead } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function updateLead(leadId: string, formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "leads", "manage")) {
    return { error: "Unauthorized" }
  }

  const raw = Object.fromEntries(formData)
  const parsed = updateLeadSchema.safeParse({
    ...raw,
    value: raw.value || "0",
    probability: raw.probability || "0",
    expectedCloseDate: raw.expectedCloseDate || null,
    lostReason: raw.lostReason || null,
  })

  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const lead = await db.lead.update({
    where: { id: leadId },
    data: parsed.data,
  })

  await logActivity({
    type: "LEAD_UPDATED",
    description: `Updated lead`,
    userId: session.user.id,
    clientId: lead.clientId,
  })

  revalidatePath("/dashboard/leads")
  revalidatePath("/dashboard/clients")
  return { data: lead }
}

/**
 * Перемещает лид на другой этап воронки продаж.
 * При перемещении на этап LOST можно указать причину проигрыша.
 * Проверки: аутентификация, RBAC (leads/manage).
 * БД: db.lead.update({ stage, lostReason? })
 * Побочные эффекты: logActivity({ metadata: { stage, lostReason } }),
 *   revalidatePath("/dashboard/leads"), revalidatePath("/dashboard/clients"),
 *   emitWebhookEvent("lead.stage_changed"),
 *   evaluateAutomationRules("lead.stage_changed").
 *
 * @param leadId - ID лида
 * @param stage - Новый этап (NEW, CONTACTED, PROPOSAL_SENT, NEGOTIATION, WON, LOST)
 * @param lostReason - Причина проигрыша (только для этапа LOST)
 * @returns { data: lead } при успехе, { error: string } при ошибке
 */
export async function moveLeadStage(leadId: string, stage: string, lostReason?: string | null) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "leads", "manage")) {
    return { error: "Unauthorized" }
  }

  const lead = await db.lead.update({
    where: { id: leadId },
    data: {
      stage: stage as any,
      ...(stage === "LOST" ? { lostReason: lostReason || null } : {}),
    },
  })

  await logActivity({
    type: "LEAD_UPDATED",
    description: `Moved lead to ${stage}`,
    userId: session.user.id,
    clientId: lead.clientId,
    metadata: { stage, lostReason },
  })

  revalidatePath("/dashboard/leads")
  revalidatePath("/dashboard/clients")
  emitWebhookEvent("lead.stage_changed", { leadId: lead.id, stage, clientId: lead.clientId })
  evaluateAutomationRules("lead.stage_changed", { leadId: lead.id, stage, clientId: lead.clientId })
  return { data: lead }
}
