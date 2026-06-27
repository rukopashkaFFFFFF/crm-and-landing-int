/**
 * @file Страница аналитики (Analytics).
 *
 * @description Отображает расширенную аналитику CRM за текущий год:
 * - Помесячная выручка (Paid invoices).
 * - Все лиды (с клиентами).
 * - Все проекты (со статусами, бюджетом).
 * - Все оплаченные инвойсы.
 * - Все задачи (статусы, даты).
 * - Активные пользователи.
 * - Time entries за год (с пользователями).
 * - Все клиенты.
 * Данные кэшируются через React.cache.
 *
 * @route GET /dashboard/analytics
 * @exports AnalyticsPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { cache } from "react"
import { t } from "@/lib/translations"
import { AnalyticsClient } from "@/components/crm/analytics-client"

export const metadata: Metadata = { title: t("Analytics | CRM") }

/**
 * Кэшированная функция загрузки данных аналитики.
 *
 * @returns {Promise<Object>} Объект с monthlyRevenue, leads, projects,
 * paidInvoices, tasks, users, timeEntries, clients.
 *
 * @sideeffect Выполняет 8 параллельных запросов к БД.
 */
const getAnalyticsData = cache(async () => {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const [
    monthlyRevenue,
    leads,
    projects,
    invoices,
    tasks,
    users,
    timeEntries,
    clients,
  ] = await Promise.all([
    db.invoice.findMany({
      where: { paidAt: { gte: startOfYear }, status: "PAID" },
      select: { total: true, paidAt: true, clientId: true },
      orderBy: { paidAt: "asc" },
    }),
    db.lead.findMany({
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.project.findMany({
      select: { id: true, name: true, status: true, budget: true, clientId: true, client: { select: { name: true } } },
    }),
    db.invoice.findMany({ where: { status: "PAID" }, select: { total: true, clientId: true } }),
    db.task.findMany({
      select: { id: true, status: true, completedAt: true, createdAt: true, assigneeId: true, projectId: true },
    }),
    db.user.findMany({
      where: { active: true },
      select: { id: true, name: true, image: true, role: true },
    }),
    db.timeEntry.findMany({
      where: { date: { gte: startOfYear } },
      include: { user: { select: { id: true, name: true } } },
    }),
    db.client.findMany({ select: { id: true, name: true } }),
  ])

  return {
    monthlyRevenue: JSON.parse(JSON.stringify(monthlyRevenue)),
    leads: JSON.parse(JSON.stringify(leads)),
    projects: JSON.parse(JSON.stringify(projects)),
    paidInvoices: JSON.parse(JSON.stringify(invoices)),
    tasks: JSON.parse(JSON.stringify(tasks)),
    users: JSON.parse(JSON.stringify(users)),
    timeEntries: JSON.parse(JSON.stringify(timeEntries)),
    clients: JSON.parse(JSON.stringify(clients)),
  }
})

/**
 * Серверная страница аналитики.
 *
 * @returns {Promise<JSX.Element>} Компонент AnalyticsClient с данными.
 *
 * @sideeffect Проверяет сессию, загружает данные через getAnalyticsData.
 */
export default async function AnalyticsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const data = await getAnalyticsData()

  return <AnalyticsClient data={data} />
}
