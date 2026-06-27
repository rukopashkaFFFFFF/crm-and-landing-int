/**
 * @file Страница задач (Tasks).
 *
 * @description Отображает список всех задач.
 * - Для менеджеров (OWNER, PM): все задачи системы.
 * - Для остальных: только назначенные им задачи.
 * Загружает также проекты и пользователей для фильтрации.
 *
 * @route GET /dashboard/tasks
 * @exports TasksPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TasksPageClient } from "@/components/crm/tasks/tasks-page-client"
import { t } from "@/lib/translations"

export const metadata: Metadata = { title: t("Tasks | CRM") }

/**
 * Серверная страница задач.
 *
 * @returns {Promise<JSX.Element>} Компонент TasksPageClient с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Определяет роль: менеджеры видят все задачи, остальные — только свои.
 * - Загружает задачи, проекты и пользователей из БД.
 */
export default async function TasksPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isManager = ["OWNER", "PM"].includes(session.user.role)

  const [tasks, projects, users] = await Promise.all([
    db.task.findMany({
      where: isManager ? {} : { assigneeId: session.user.id },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      select: { id: true, name: true, image: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("Tasks")}</h1>
      </div>
      <TasksPageClient
        tasks={JSON.parse(JSON.stringify(tasks))}
        projects={JSON.parse(JSON.stringify(projects))}
        users={JSON.parse(JSON.stringify(users))}
        currentUserId={session.user.id}
      />
    </div>
  )
}
