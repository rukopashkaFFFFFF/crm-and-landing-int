/**
 * projects.ts (Server Actions)
 *
 * Server Actions для управления проектами (таблица project).
 * Содержит:
 * - createProject — создание проекта
 * - updateProject — обновление проекта (при смене статуса создаёт
 *   уведомления для PM и срабатывают webhook/автоматизации)
 * - deleteProject — удаление проекта
 *
 * Все функции проверяют аутентификацию и RBAC (ресурс "projects").
 * Побочные эффекты: logActivity(), revalidatePath(), emitWebhookEvent(),
 * evaluateAutomationRules(), создание уведомлений.
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { createProjectSchema, updateProjectSchema } from "@/lib/validations"
import { canAccess } from "@/lib/permissions"
import { logActivity } from "./activity"
import { emitWebhookEvent } from "@/lib/webhook-emitter"
import { evaluateAutomationRules } from "@/lib/automation-engine"

/**
 * Создаёт новый проект.
 * Проверки: аутентификация, RBAC (projects/manage), Zod-валидация (createProjectSchema).
 * БД: db.project.create()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/projects").
 *
 * @param formData - FormData с полями: clientId, name, description, status,
 *                   startDate, endDate, budget, pmId
 * @returns { data: project } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function createProject(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "projects", "manage")) {
    return { error: "Unauthorized" }
  }

  const raw = Object.fromEntries(formData)
  const parsed = createProjectSchema.safeParse({
    ...raw,
    budget: raw.budget || "0",
    startDate: raw.startDate || null,
    endDate: raw.endDate || null,
    pmId: raw.pmId || null,
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const project = await db.project.create({ data: parsed.data })

  await logActivity({
    type: "PROJECT_CREATED", description: `Created project: ${project.name}`,
    userId: session.user.id, clientId: project.clientId, projectId: project.id,
  })

  revalidatePath("/dashboard/projects")
  return { data: project }
}

/**
 * Обновляет проект.
 * Проверки: аутентификация, RBAC (projects/manage), Zod-валидация (updateProjectSchema).
 * БД: db.project.update()
 * Если обновляется статус:
 * - Создаются уведомления для PM (если это не текущий пользователь)
 * - Срабатывает emitWebhookEvent("project.status_changed")
 * - Срабатывает evaluateAutomationRules("project.status_changed")
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/projects"),
 *   revalidatePath("/dashboard/projects/{projectId}").
 *
 * @param projectId - ID проекта
 * @param formData - FormData с обновляемыми полями
 * @returns { data: project } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function updateProject(projectId: string, formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "projects", "manage")) {
    return { error: "Unauthorized" }
  }

  const raw = Object.fromEntries(formData)
  const parsed = updateProjectSchema.safeParse({
    ...raw, budget: raw.budget || "0",
    startDate: raw.startDate || null, endDate: raw.endDate || null, pmId: raw.pmId || null,
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const project = await db.project.update({ where: { id: projectId }, data: parsed.data })

  if (parsed.data.status) {
    const pm = project.pmId ? await db.user.findUnique({ where: { id: project.pmId } }) : null
    const mentionedUsers: { id: string; email: string | null; name: string | null }[] = []
    if (pm && pm.id !== session.user.id) {
      mentionedUsers.push({ id: pm.id, email: null, name: pm.name })
    }

    for (const u of mentionedUsers) {
      await db.notification.create({
        data: {
          userId: u.id,
          title: `Project "${project.name}" status changed`,
          message: `Status changed to ${parsed.data.status.replace("_", " ")}`,
          type: "PROJECT_UPDATED" as any,
          link: `/dashboard/projects/${project.id}`,
        },
      })
    }
  }

  await logActivity({
    type: "PROJECT_UPDATED", description: `Updated project: ${project.name}`,
    userId: session.user.id, clientId: project.clientId, projectId: project.id,
  })

  revalidatePath("/dashboard/projects")
  revalidatePath(`/dashboard/projects/${projectId}`)
  if (parsed.data.status) {
    emitWebhookEvent("project.status_changed", { projectId: project.id, status: parsed.data.status, clientId: project.clientId })
    evaluateAutomationRules("project.status_changed", { projectId: project.id, status: parsed.data.status, clientId: project.clientId })
  }
  return { data: project }
}

/**
 * Удаляет проект по ID.
 * Проверки: аутентификация, RBAC (projects/manage).
 * БД: db.project.delete()
 * Побочные эффекты: revalidatePath("/dashboard/projects").
 *
 * @param projectId - ID проекта
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function deleteProject(projectId: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "projects", "manage")) return { error: "Unauthorized" }

  await db.project.delete({ where: { id: projectId } })

  revalidatePath("/dashboard/projects")
  return { success: true }
}
