/**
 * @file Страница отчётов (Reports).
 *
 * @description Отображает обзор отчётов по проектам:
 * - Все time entries за текущий год (с задачами, проектами, пользователями).
 * - Активные пользователи (роль, ставка, ёмкость).
 * - Все проекты (с клиентами).
 * - Оплаченные инвойсы.
 *
 * @route GET /dashboard/reports
 * @exports ReportsPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { t } from "@/lib/translations"
import { ReportsOverview } from "@/components/crm/reports/reports-overview"

export const metadata: Metadata = { title: t("Reports | CRM") }

/**
 * Серверная страница отчётов.
 *
 * @returns {Promise<JSX.Element>} Компонент ReportsOverview с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Выполняет 4 параллельных запроса к БД (timeEntries, users, projects, invoices).
 */
export default async function ReportsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const [timeEntries, users, projects, invoices] = await Promise.all([
    db.timeEntry.findMany({
      where: { date: { gte: startOfYear } },
      include: { task: { select: { title: true, projectId: true, project: { select: { name: true, clientId: true, budget: true } } } }, user: { select: { id: true, name: true, hourlyRate: true } } },
      orderBy: { date: "desc" },
    }),
    db.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true, hourlyRate: true, capacityHours: true } }),
    db.project.findMany({ include: { client: { select: { name: true } } } }),
    db.invoice.findMany({ where: { status: "PAID" }, select: { id: true, total: true, clientId: true, createdAt: true } }),
  ])

  return (
    <ReportsOverview
      timeEntries={JSON.parse(JSON.stringify(timeEntries))}
      users={JSON.parse(JSON.stringify(users))}
      projects={JSON.parse(JSON.stringify(projects))}
      invoices={JSON.parse(JSON.stringify(invoices))}
    />
  )
}
