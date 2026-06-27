/**
 * @file Страница детального просмотра клиента (Client Detail).
 *
 * @description Отображает полную информацию о клиенте:
 * - Основные данные (имя, email, телефон, компания и т.д.).
 * - Связанные лиды.
 * - Проекты клиента (с менеджерами).
 * - Лента активностей (до 50 записей).
 * - Инвойсы клиента.
 * Загружает также список всех пользователей для назначения ответственного.
 *
 * @route GET /dashboard/clients/[id]
 * @exports ClientDetailPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ClientDetailClient } from "@/components/crm/clients/client-detail-client"
import { t } from "@/lib/translations"

export const metadata: Metadata = {
  title: t("Client | CRM"),
}

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Серверная страница деталей клиента.
 *
 * @param {PageProps} props - params с id клиента.
 * @returns {Promise<JSX.Element>} Компонент ClientDetailClient с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает клиента со связанными данными (assignedTo, leads, projects,
 *   activities, invoices).
 * - Вызывает notFound() если клиент не найден.
 * - Загружает список пользователей.
 */
export default async function ClientDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params

  const client = await db.client.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, image: true } },
      leads: { orderBy: { createdAt: "desc" } },
      projects: {
        include: { pm: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      activities: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      invoices: { orderBy: { createdAt: "desc" } },
    },
  })

  if (!client) notFound()

  const users = await db.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <ClientDetailClient
      client={JSON.parse(JSON.stringify(client))}
      users={JSON.parse(JSON.stringify(users))}
    />
  )
}
