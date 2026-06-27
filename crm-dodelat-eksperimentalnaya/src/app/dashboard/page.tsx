/**
 * @file Главная страница дашборда (Dashboard).
 *
 * @description Отображает сводку KPI для текущего пользователя:
 * - Количество активных проектов (с трендом к прошлому месяцу).
 * - Выручка за текущий и прошлый месяц.
 * - Просроченные задачи пользователя.
 * - Общая стоимость активных лидов (воронка).
 * - Лента последних активностей (10 шт.).
 * - Мои задачи (10 шт.).
 * - Последние клиенты (5 шт.).
 * - Предстоящие дедлайны на 7 дней (10 шт.).
 * Данные кэшируются через React.cache.
 *
 * @route GET /dashboard
 * @exports DashboardPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { cache } from "react"
import { DashboardClient } from "@/components/crm/dashboard-client"
import { t } from "@/lib/translations"

export const metadata: Metadata = { title: t("Dashboard | CRM") }

/**
 * Кэшированная функция для получения данных дашборда.
 *
 * @param {string} userId - ID текущего пользователя.
 * @returns {Promise<Object>} Объект с activeProjects, projectsTrend,
 * revenueThisMonth, revenueLastMonth, overdueTasks, totalLeadValue,
 * leadCount, activities, myTasks, recentClients, milestones.
 *
 * @sideeffect Выполняет 11 параллельных запросов к БД.
 */
const getDashboardData = cache(async (userId: string) => {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    activeProjects, projectsLastMonth,
    revenueThisMonth, revenueLastMonth,
    overdueTasks,
    leadValueAgg, leadCountResult,
    activities,
    myTasks,
    recentClients,
    deadlines,
  ] = await Promise.all([
    db.project.count({ where: { status: "IN_PROGRESS" } }),
    db.project.count({ where: { status: "IN_PROGRESS", createdAt: { lt: firstOfMonth } } }),
    db.invoice.aggregate({ where: { paidAt: { gte: firstOfMonth }, status: "PAID" }, _sum: { total: true } }),
    db.invoice.aggregate({ where: { paidAt: { gte: lastMonthStart, lte: lastMonthEnd }, status: "PAID" }, _sum: { total: true } }),
    db.task.count({ where: { assigneeId: userId, status: { notIn: ["DONE", "CANCELLED"] }, dueDate: { lt: now } } }),
    db.lead.aggregate({ where: { stage: { in: ["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATION"] } }, _sum: { value: true } }),
    db.lead.count({ where: { stage: { in: ["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATION"] } } }),
    db.activity.findMany({
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" }, take: 10,
    }),
    db.task.findMany({
      where: { assigneeId: userId, status: { notIn: ["DONE", "CANCELLED"] } },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" as const }, take: 10,
    }),
    db.client.findMany({
      orderBy: { updatedAt: "desc" }, take: 5,
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    db.task.findMany({
      where: { dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) }, status: { notIn: ["DONE", "CANCELLED"] } },
      include: { project: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" }, take: 10,
    }),
  ])

  return {
    activeProjects,
    projectsTrend: activeProjects - projectsLastMonth,
    revenueThisMonth: Number(revenueThisMonth._sum.total || 0),
    revenueLastMonth: Number(revenueLastMonth._sum.total || 0),
    overdueTasks,
    totalLeadValue: Number(leadValueAgg._sum.value || 0),
    leadCount: leadCountResult,
    activities: JSON.parse(JSON.stringify(activities)),
    myTasks: JSON.parse(JSON.stringify(myTasks)),
    recentClients: JSON.parse(JSON.stringify(recentClients)),
    milestones: JSON.parse(JSON.stringify(deadlines)),
  }
})

/**
 * Серверная страница дашборда.
 *
 * @returns {Promise<JSX.Element>} Компонент DashboardClient с данными.
 *
 * @sideeffect
 * - Проверяет сессию (редирект на /login при отсутствии).
 * - Вызывает getDashboardData для получения KPI.
 */
export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const data = await getDashboardData(session.user.id)

  return <DashboardClient data={data} />
}
