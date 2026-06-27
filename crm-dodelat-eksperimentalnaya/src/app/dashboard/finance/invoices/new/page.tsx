/**
 * @file Страница создания нового инвойса (New Invoice).
 *
 * @description Отображает конструктор инвойса.
 * Загружает список клиентов и проектов для выбора.
 *
 * @route GET /dashboard/finance/invoices/new
 * @exports NewInvoicePage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { InvoiceBuilder } from "@/components/crm/finance/invoice-builder"
import { t } from "@/lib/translations"

export const metadata: Metadata = { title: t("New Invoice | CRM") }

/**
 * Серверная страница создания инвойса.
 *
 * @returns {Promise<JSX.Element>} Компонент InvoiceBuilder с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает список клиентов и проектов из БД.
 */
export default async function NewInvoicePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [clients, projects] = await Promise.all([
    db.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.project.findMany({ select: { id: true, name: true, clientId: true }, orderBy: { name: "asc" } }),
  ])

  return <InvoiceBuilder clients={JSON.parse(JSON.stringify(clients))} projects={JSON.parse(JSON.stringify(projects))} />
}
