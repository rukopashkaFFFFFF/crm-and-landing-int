/**
 * @file Страница создания новой сметы (New Estimate).
 *
 * @description Отображает конструктор сметы.
 * Загружает список клиентов и проектов для выбора.
 *
 * @route GET /dashboard/finance/estimates/new
 * @exports NewEstimatePage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { EstimateBuilder } from "@/components/crm/finance/estimate-builder"
import { t } from "@/lib/translations"

export const metadata: Metadata = { title: t("New Estimate | CRM") }

/**
 * Серверная страница создания сметы.
 *
 * @returns {Promise<JSX.Element>} Компонент EstimateBuilder с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает список клиентов и проектов из БД.
 */
export default async function NewEstimatePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [clients, projects] = await Promise.all([
    db.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.project.findMany({ select: { id: true, name: true, clientId: true }, orderBy: { name: "asc" } }),
  ])

  return <EstimateBuilder clients={JSON.parse(JSON.stringify(clients))} projects={JSON.parse(JSON.stringify(projects))} />
}
