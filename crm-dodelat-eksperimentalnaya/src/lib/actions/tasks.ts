/**
 * tasks.ts (Server Actions)
 *
 * Server Actions для управления задачами (таблицы task, timeEntry).
 * Содержит:
 * - createTask — создание задачи в проекте
 * - updateTask — обновление задачи (при статусе DONE проставляет completedAt)
 * - moveTask — перемещение задачи по статусам (Kanban-доска)
 * - deleteTask — удаление задачи
 * - logTime — создание записи времени по задаче
 * - updateTimeEntry — обновление записи времени (только автор или OWNER/PM)
 * - deleteTimeEntry — удаление записи времени (только автор или OWNER/PM)
 *
 * Все функции проверяют аутентификацию и RBAC (ресурс "tasks" для задач,
 * "tasks" для timeEntry).
 * Побочные эффекты: logActivity(), revalidatePath().
 */

"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { createTaskSchema, updateTaskSchema, logTimeSchema } from "@/lib/validations"
import { canAccess } from "@/lib/permissions"
import { logActivity } from "./activity"

/**
 * Создаёт новую задачу в проекте.
 * Проверки: аутентификация, RBAC (tasks/manage), Zod-валидация (createTaskSchema).
 * БД: db.task.create()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/projects/{projectId}").
 *
 * @param formData - FormData с полями: projectId, title, description, status,
 *                   priority, assigneeId, startDate, dueDate, estimatedHours, parentTaskId
 * @returns { data: task } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function createTask(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "tasks", "manage")) return { error: "Unauthorized" }

  const raw = Object.fromEntries(formData)
  const parsed = createTaskSchema.safeParse({
    ...raw,
    estimatedHours: raw.estimatedHours || "0",
    startDate: raw.startDate || null,
    dueDate: raw.dueDate || null,
    assigneeId: raw.assigneeId || null,
    parentTaskId: raw.parentTaskId || null,
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const task = await db.task.create({ data: parsed.data })

  await logActivity({
    type: "TASK_CREATED", description: `Created task: ${task.title}`,
    userId: session.user.id, projectId: task.projectId, taskId: task.id,
  })

  revalidatePath(`/dashboard/projects/${task.projectId}`)
  return { data: task }
}

/**
 * Обновляет задачу.
 * Проверки: аутентификация, RBAC (tasks/manage), Zod-валидация (updateTaskSchema).
 * Если статус = DONE — устанавливает completedAt.
 * Если статус ≠ DONE — очищает completedAt.
 * БД: db.task.update()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/projects/{projectId}").
 *
 * @param taskId - ID задачи
 * @param formData - FormData с обновляемыми полями
 * @returns { data: task } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function updateTask(taskId: string, formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "tasks", "manage")) return { error: "Unauthorized" }

  const raw = Object.fromEntries(formData)
  const parsed = updateTaskSchema.safeParse({
    ...raw,
    estimatedHours: raw.estimatedHours || "0",
    startDate: raw.startDate || null,
    dueDate: raw.dueDate || null,
    assigneeId: raw.assigneeId || null,
    parentTaskId: raw.parentTaskId || null,
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const updateData: any = { ...parsed.data }
  if (parsed.data.status === "DONE") updateData.completedAt = new Date()
  if (parsed.data.status && parsed.data.status !== "DONE") updateData.completedAt = null

  const task = await db.task.update({ where: { id: taskId }, data: updateData })

  await logActivity({
    type: "TASK_UPDATED", description: `Updated task: ${task.title}`,
    userId: session.user.id, projectId: task.projectId, taskId: task.id,
  })

  revalidatePath(`/dashboard/projects/${task.projectId}`)
  return { data: task }
}

/**
 * Перемещает задачу на другой статус (для Kanban-доски).
 * При статусе DONE — проставляет completedAt, иначе очищает.
 * Поддерживает опциональную позицию (position) для сортировки.
 * Проверки: аутентификация, RBAC (tasks/manage).
 * БД: db.task.update({ status, position, completedAt })
 * Побочные эффекты: logActivity({ metadata: { status } }),
 *   revalidatePath("/dashboard/projects/{projectId}").
 *
 * @param taskId - ID задачи
 * @param status - Новый статус (TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED)
 * @param position - Новая позиция для сортировки (опционально)
 * @returns { data: task } при успехе, { error: string } при ошибке
 */
export async function moveTask(taskId: string, status: string, position?: number) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "tasks", "manage")) return { error: "Unauthorized" }

  const updateData: any = { status: status as any }
  if (position !== undefined) updateData.position = position
  if (status === "DONE") updateData.completedAt = new Date()
  if (status !== "DONE") updateData.completedAt = null

  const task = await db.task.update({ where: { id: taskId }, data: updateData })

  await logActivity({
    type: "TASK_MOVED", description: `Moved task "${task.title}" to ${status}`,
    userId: session.user.id, projectId: task.projectId, taskId: task.id,
    metadata: { status },
  })

  revalidatePath(`/dashboard/projects/${task.projectId}`)
  return { data: task }
}

/**
 * Удаляет задачу по ID.
 * Проверки: аутентификация, RBAC (tasks/manage), существование задачи.
 * БД: db.task.findUnique() → db.task.delete()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/projects/{projectId}").
 *
 * @param taskId - ID задачи
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function deleteTask(taskId: string) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "tasks", "manage")) return { error: "Unauthorized" }

  const task = await db.task.findUnique({ where: { id: taskId }, select: { projectId: true, title: true } })
  if (!task) return { error: "Task not found" }

  await db.task.delete({ where: { id: taskId } })

  await logActivity({
    type: "TASK_DELETED", description: `Deleted task: ${task.title}`,
    userId: session.user.id, projectId: task.projectId,
  })

  revalidatePath(`/dashboard/projects/${task.projectId}`)
  return { success: true }
}

/**
 * Создаёт запись учёта времени по задаче.
 * Проверки: аутентификация, Zod-валидация (logTimeSchema).
 * БД: db.timeEntry.create()
 * Побочные эффекты: logActivity(), revalidatePath("/dashboard/projects/{projectId}").
 *
 * @param formData - FormData с полями: taskId, hours, description, date, billable
 * @returns { data: entry } при успехе, { error: fieldErrors | string } при ошибке
 */
export async function logTime(formData: FormData) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }

  const raw = Object.fromEntries(formData)
  const parsed = logTimeSchema.safeParse({
    ...raw, hours: raw.hours || "0", date: raw.date || new Date().toISOString().split("T")[0],
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const entryDate = parsed.data.date ? new Date(parsed.data.date) : new Date()

  const entry = await db.timeEntry.create({
      data: { ...parsed.data, userId: session.user.id, date: entryDate },
  })

  const task = await db.task.findUnique({ where: { id: entry.taskId }, select: { projectId: true } })

  if (task) {
    await logActivity({
      type: "TIME_LOGGED", description: `Logged ${parsed.data.hours}h on task`,
      userId: session.user.id, projectId: task.projectId, taskId: entry.taskId,
    })
    revalidatePath(`/dashboard/projects/${task.projectId}`)
  }

  return { data: entry }
}

/**
 * Обновляет запись учёта времени.
 * Проверки: аутентификация, владелец записи или OWNER/PM.
 * БД: db.timeEntry.findUnique() → db.timeEntry.update()
 * Побочные эффекты: revalidatePath("/dashboard/time").
 *
 * @param formData - FormData с полями: id, hours, description, date, billable
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function updateTimeEntry(formData: FormData) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }
  const id = formData.get("id") as string
  const hours = parseFloat(formData.get("hours") as string)
  const description = formData.get("description") as string
  const date = formData.get("date") as string
  const billable = formData.get("billable") === "true"
  if (!id || !hours || hours <= 0) return { error: "Invalid input" }
  const entry = await db.timeEntry.findUnique({ where: { id }, select: { userId: true, taskId: true } })
  if (!entry) return { error: "Time entry not found" }
  if (entry.userId !== session.user.id && !["OWNER", "PM"].includes(session.user.role)) return { error: "Unauthorized" }
  await db.timeEntry.update({ where: { id }, data: { hours, description, date: date ? new Date(date) : undefined, billable } })
  revalidatePath("/dashboard/time")
  return { success: true }
}

/**
 * Удаляет запись учёта времени.
 * Проверки: аутентификация, владелец записи или OWNER/PM.
 * БД: db.timeEntry.findUnique() → db.timeEntry.delete()
 * Побочные эффекты: revalidatePath("/dashboard/time").
 *
 * @param id - ID записи времени
 * @returns { success: true } при успехе, { error: string } при ошибке
 */
export async function deleteTimeEntry(id: string) {
  const session = await auth()
  if (!session) return { error: "Unauthorized" }
  const entry = await db.timeEntry.findUnique({ where: { id }, select: { userId: true } })
  if (!entry) return { error: "Time entry not found" }
  if (entry.userId !== session.user.id && !["OWNER", "PM"].includes(session.user.role)) return { error: "Unauthorized" }
  await db.timeEntry.delete({ where: { id } })
  revalidatePath("/dashboard/time")
  return { success: true }
}
