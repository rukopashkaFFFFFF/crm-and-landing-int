/**
 * @file Страница детального просмотра проекта (Project Workspace).
 *
 * @description Отображает рабочее пространство проекта:
 * - Основная информация (клиент, менеджер, статус, бюджет).
 * - Список задач с исполнителями, подзадачами, трудозатратами и комментариями.
 * - Вехи (milestones) проекта.
 * - Лента активностей (до 30 записей).
 * Загружает также всех пользователей для назначения.
 *
 * @route GET /dashboard/projects/[id]
 * @exports ProjectDetailPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { t } from "@/lib/translations"
import { ProjectWorkspace } from "@/components/crm/projects/project-workspace"

interface PageProps { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: t("Project | CRM") }

/**
 * Серверная страница проекта.
 *
 * @param {PageProps} props - params с id проекта.
 * @returns {Promise<JSX.Element>} Компонент ProjectWorkspace с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает проект со связанными данными (client, pm, tasks, milestones, activities).
 * - Вызывает notFound() если проект не найден.
 * - Загружает список пользователей.
 */
export default async function ProjectDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params

  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      pm: { select: { id: true, name: true, image: true } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          subtasks: { select: { id: true, status: true } },
          timeEntries: { select: { id: true, hours: true } },
          comments: { select: { id: true } },
        },
        orderBy: { position: "asc" },
      },
      milestones: { orderBy: { dueDate: "asc" } },
      activities: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" }, take: 30,
      },
    },
  })

  if (!project) notFound()

  const users = await db.user.findMany({
    select: { id: true, name: true, image: true },
    orderBy: { name: "asc" },
  })

  return <ProjectWorkspace project={JSON.parse(JSON.stringify(project))} users={JSON.parse(JSON.stringify(users))} />
}
