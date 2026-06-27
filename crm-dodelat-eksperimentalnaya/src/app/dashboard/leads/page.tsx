/**
 * @file Страница воронки продаж (Leads Pipeline).
 *
 * @description Отображает Kanban-доску с лидами по стадиям воронки.
 * Загружает все лиды (с клиентами) и список клиентов для привязки.
 *
 * @route GET /dashboard/leads
 * @exports LeadsPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LeadsBoard } from "@/components/crm/leads/leads-board"
import { t } from "@/lib/translations"

export const metadata: Metadata = {
  title: t("Leads | CRM"),
  description: "Manage your sales pipeline",
}

/**
 * Серверная страница лидов (воронка продаж).
 *
 * @returns {Promise<JSX.Element>} Компонент LeadsBoard с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает все лиды (с клиентами) и список клиентов.
 */
export default async function LeadsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [leads, clients] = await Promise.all([
    db.lead.findMany({
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.client.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("Leads Pipeline")}</h1>
      </div>
      <LeadsBoard
        leads={JSON.parse(JSON.stringify(leads))}
        clients={JSON.parse(JSON.stringify(clients))}
      />
    </div>
  )
}
