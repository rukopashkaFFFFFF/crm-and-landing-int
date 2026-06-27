/**
 * @file Страница списка проектов (Projects).
 *
 * @description Отображает список проектов с фильтрацией (по статусу, клиенту).
 * Загружает также клиентов и пользователей для фильтров и назначений.
 *
 * @route GET /dashboard/projects?status=&clientId=
 * @exports ProjectsPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { t, translateStatus } from "@/lib/translations"
import { ProjectListClient } from "@/components/crm/projects/project-list-client"

export const metadata: Metadata = { title: t("Projects | CRM") }

interface PageProps { searchParams: Promise<{ status?: string; clientId?: string; page?: string }> }

/**
 * Серверная страница списка проектов.
 *
 * @param {PageProps} props - searchParams для фильтрации.
 * @returns {Promise<JSX.Element>} Компонент ProjectListClient с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает проекты (с клиентом, менеджером, задачами), клиентов и пользователей.
 */
export default async function ProjectsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const sp = await searchParams
  const where: Record<string, any> = {}
  if (sp.status) where.status = sp.status
  if (sp.clientId) where.clientId = sp.clientId

  const [projects, clients, users] = await Promise.all([
    db.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        pm: { select: { id: true, name: true, image: true } },
        tasks: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  const serialized = JSON.parse(JSON.stringify(projects))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("Projects")}</h1>
      </div>
      <ProjectListClient projects={serialized} clients={clients} users={users} searchParams={sp} />
    </div>
  )
}
