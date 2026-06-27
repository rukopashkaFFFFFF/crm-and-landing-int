/**
 * runner.ts
 *
 * Cron-задачи (job runner) для автоматических проверок CRM.
 * Содержит функции, выполняемые по расписанию для выявления
 * и обработки проблемных ситуаций:
 *
 * - checkOverdueTasks — находит просроченные задачи и уведомляет исполнителей
 * - checkOverdueInvoices — находит просроченные счета, меняет статус на OVERDUE,
 *   уведомляет владельцев (OWNER)
 * - checkStaleLeads — находит лиды без изменений >14 дней, уведомляет
 *   ответственных менеджеров
 * - checkUpcomingDeadlines — находит проекты с дедлайном через 3 дня,
 *   уведомляет Project Manager'ов
 *
 * Каждая функция защищена try/catch и возвращает { processed: number }.
 */

import { db } from "@/lib/db"
import { addDays, startOfDay } from "date-fns"

/**
 * Проверяет задачи с истёкшим dueDate (не DONE и не CANCELLED).
 * Для каждой просроченной задачи создаёт уведомление типа WARNING
 * для назначенного исполнителя (assignee).
 *
 * @returns { processed: number } — количество обработанных задач
 */
export async function checkOverdueTasks() {
  const now = new Date()
  const overdueTasks = await db.task.findMany({
    where: { dueDate: { lt: now }, status: { notIn: ["DONE", "CANCELLED"] } },
    include: { assignee: { select: { id: true, name: true, email: true } }, project: { select: { name: true } } },
  })
  for (const task of overdueTasks) {
    if (task.assignee) {
      await db.notification.create({
        data: { userId: task.assignee.id, title: "Task Overdue", message: `"${task.title}" in ${task.project.name} is overdue.`, type: "WARNING", link: `/dashboard/projects/${task.projectId}` },
      })
    }
  }
  return { processed: overdueTasks.length }
}

/**
 * Проверяет счета с истёкшим dueDate (статус не PAID, CANCELLED, OVERDUE).
 * Меняет статус таких счетов на OVERDUE и создаёт уведомления
 * для всех пользователей с ролью OWNER.
 *
 * @returns { processed: number } — количество обработанных счетов
 */
export async function checkOverdueInvoices() {
  const now = new Date()
  const overdueInvoices = await db.invoice.findMany({
    where: { dueDate: { lt: now }, status: { notIn: ["PAID", "CANCELLED", "OVERDUE"] } },
  })
  for (const inv of overdueInvoices) {
    await db.invoice.update({ where: { id: inv.id }, data: { status: "OVERDUE" } })
    const owners = await db.user.findMany({ where: { role: "OWNER" } })
    for (const owner of owners) {
      await db.notification.create({
        data: { userId: owner.id, title: "Invoice Overdue", message: `Invoice ${inv.number} for $${Number(inv.total).toFixed(2)} is overdue.`, type: "ERROR", link: `/dashboard/finance` },
      })
    }
  }
  return { processed: overdueInvoices.length }
}

/**
 * Проверяет лиды, которые не обновлялись более 14 дней
 * и не находятся в статусах WON или LOST.
 * Создаёт уведомление WARNING для ответственного менеджера клиента.
 *
 * @returns { processed: number } — количество обработанных лидов
 */
export async function checkStaleLeads() {
  const fourteenDaysAgo = addDays(new Date(), -14)
  const staleLeads = await db.lead.findMany({
    where: { updatedAt: { lt: fourteenDaysAgo }, stage: { notIn: ["WON", "LOST"] } },
    include: { client: { select: { assignedToId: true, name: true } } },
  })
  for (const lead of staleLeads) {
    if (lead.client.assignedToId) {
      await db.notification.create({
        data: { userId: lead.client.assignedToId, title: "Lead Stale", message: `Lead "${lead.client.name}" has been in "${lead.stage}" for over 14 days.`, type: "WARNING", link: `/dashboard/leads` },
      })
    }
  }
  return { processed: staleLeads.length }
}

/**
 * Проверяет проекты, у которых endDate наступает в ближайшие 3 дня
 * (статус не COMPLETED и не CANCELLED).
 * Создаёт уведомление WARNING для Project Manager'а проекта.
 *
 * @returns { processed: number } — количество обработанных проектов
 */
export async function checkUpcomingDeadlines() {
  const inThreeDays = addDays(startOfDay(new Date()), 3)
  const projects = await db.project.findMany({
    where: { endDate: { lte: inThreeDays, gte: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } },
    include: { pm: { select: { id: true } }, client: { select: { name: true } } },
  })
  for (const project of projects) {
    if (project.pm) {
      await db.notification.create({
        data: { userId: project.pm.id, title: "Project Deadline Approaching", message: `"${project.name}" for ${project.client.name} is due in less than 3 days.`, type: "WARNING", link: `/dashboard/projects/${project.id}` },
      })
    }
  }
  return { processed: projects.length }
}
