/**
 * @file Страница учёта времени (Time).
 *
 * @description Отображает записи времени текущего пользователя (до 200 записей).
 * Менеджеры могут видеть записи других пользователей.
 * Загружает также пользователей и задачи для фильтрации.
 *
 * @route GET /dashboard/time
 * @exports TimePage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { t } from "@/lib/translations"
import { TimePageClient } from "@/components/crm/time/time-page-client"

export const metadata: Metadata = { title: t("Time | CRM") }

/**
 * Серверная страница учёта времени.
 *
 * @returns {Promise<JSX.Element>} Компонент TimePageClient с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает time entries пользователя (с задачами и проектами).
 * - Загружает пользователей и задачи для фильтрации.
 */
export default async function TimePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const entries = await db.timeEntry.findMany({
    where: { userId: session.user.id },
    include: { task: { select: { id: true, title: true, projectId: true, project: { select: { name: true } } } } },
    orderBy: { date: "desc" },
    take: 200,
  })

  const [users, tasks] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.task.findMany({ select: { id: true, title: true }, where: { project: { status: { not: "CANCELLED" } } }, take: 100 }),
  ])

  return (
    <TimePageClient
      entries={JSON.parse(JSON.stringify(entries))}
      users={JSON.parse(JSON.stringify(users))}
      tasks={JSON.parse(JSON.stringify(tasks))}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  )
}
