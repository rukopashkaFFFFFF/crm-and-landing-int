/**
 * milestones.ts (Server Actions)
 *
 * Server Actions для управления вехами проекта (таблица milestone).
 * Содержит:
 * - createMilestone — создание новой вехи
 * - deleteMilestone — удаление вехи
 *
 * Обе функции проверяют аутентификацию и RBAC (ресурс "projects").
 * Побочные эффекты: logActivity(), revalidatePath().
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { createMilestoneSchema } from "@/lib/validations"
import { canAccess } from "@/lib/permissions"
import { logActivity } from "./activity"

/**
 * Создаёт новую веху для проекта.
 * Проверки: аутентификация, RBAC (projects/manage), Zod-валидация (createMilestoneSchema).
 * БД: db.milestone.create()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/projects/{projectId}").
 *
 * @param formData - FormData с полями: projectId, title, description, dueDate
 * @returns { data: milestone } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function createMilestone(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "projects", "manage")) return { error: "Unauthorized" }

  const raw = Object.fromEntries(formData)
  const parsed = createMilestoneSchema.safeParse({
    ...raw, dueDate: raw.dueDate || null,
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const milestone = await db.milestone.create({ data: parsed.data })

  await logActivity({
    type: "MILESTONE_CREATED", description: `Created milestone: ${milestone.title}`,
    userId: session.user.id, projectId: milestone.projectId,
  })

  revalidatePath(`/dashboard/projects/${milestone.projectId}`)
  return { data: milestone }
}

/**
 * Удаляет веху по ID.
 * Проверки: аутентификация, RBAC (projects/manage).
 * БД: db.milestone.findUnique() → db.milestone.delete()
 * Побочные эффекты: revalidatePath("/dashboard/projects/{projectId}").
 *
 * @param milestoneId - ID вехи
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function deleteMilestone(milestoneId: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "projects", "manage")) return { error: "Unauthorized" }

  const m = await db.milestone.findUnique({ where: { id: milestoneId }, select: { projectId: true } })
  await db.milestone.delete({ where: { id: milestoneId } })

  if (m) revalidatePath(`/dashboard/projects/${m.projectId}`)
  return { success: true }
}
