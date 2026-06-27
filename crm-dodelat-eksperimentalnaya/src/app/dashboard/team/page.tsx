/**
 * @file Страница команды (Team Workload).
 *
 * @description Отображает нагрузку на команду за текущий месяц:
 * - Все активные пользователи (с ролями).
 * - Time entries за месяц (часы, биллабельность).
 * - Назначенные задачи (не завершённые).
 * Загружает также проекты для контекста.
 *
 * @route GET /dashboard/team
 * @exports TeamPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { t } from "@/lib/translations"
import { TeamWorkload } from "@/components/crm/team/team-workload"

export const metadata: Metadata = { title: t("Team | CRM") }

/**
 * Серверная страница нагрузки команды.
 *
 * @returns {Promise<JSX.Element>} Компонент TeamWorkload с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает активных пользователей с timeEntries и assignedTasks за месяц.
 * - Загружает проекты.
 */
export default async function TeamPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const users = await db.user.findMany({
    where: { active: true },
    include: {
      timeEntries: {
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { id: true, hours: true, billable: true, taskId: true, date: true, description: true },
      },
      assignedTasks: {
        where: { status: { notIn: ["DONE", "CANCELLED"] } },
        select: { id: true, title: true, estimatedHours: true, priority: true, dueDate: true, projectId: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const projects = await db.project.findMany({
    select: { id: true, name: true },
  })

  return (
    <TeamWorkload
      users={JSON.parse(JSON.stringify(users))}
      projects={JSON.parse(JSON.stringify(projects))}
    />
  )
}
