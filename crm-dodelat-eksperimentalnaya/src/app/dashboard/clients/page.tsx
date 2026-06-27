/**
 * @file Страница списка клиентов (Clients).
 *
 * @description Отображает список клиентов с пагинацией и фильтрацией.
 * Поддерживает query-параметры: q (поиск), status, source, page.
 * Загружает также список пользователей для назначения ответственного.
 *
 * @route GET /dashboard/clients?q=&status=&source=&page=
 * @exports ClientsPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ClientListClient } from "@/components/crm/clients/client-list-client"
import { t } from "@/lib/translations"

export const metadata: Metadata = {
  title: t("Clients | CRM"),
  description: "Manage your clients",
}

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; source?: string; page?: string }>
}

/**
 * Серверная страница со списком клиентов.
 *
 * @param {PageProps} props - searchParams для фильтрации и пагинации.
 * @returns {Promise<JSX.Element>} Компонент ClientListClient с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Выполняет 3 запроса к БД (clients, total count, users).
 * - Сериализует данные для клиентского компонента.
 */
export default async function ClientsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1)
  const take = 20
  const skip = (page - 1) * take

  const where: Record<string, unknown> = {}

  if (sp.q) {
    where.OR = [
      { name: { contains: sp.q, mode: "insensitive" } },
      { email: { contains: sp.q, mode: "insensitive" } },
      { company: { contains: sp.q, mode: "insensitive" } },
    ]
  }
  if (sp.status) where.status = sp.status
  if (sp.source) where.source = sp.source

  const [clients, total, users] = await Promise.all([
    db.client.findMany({
      where,
      include: { assignedTo: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.client.count({ where }),
    db.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
      </div>
      <ClientListClient
        clients={JSON.parse(JSON.stringify(clients))}
        users={JSON.parse(JSON.stringify(users))}
        currentPage={page}
        totalPages={totalPages}
        total={total}
        searchParams={sp}
      />
    </div>
  )
}
