/**
 * @file Страница просмотра инвойса (Invoice Detail).
 *
 * @description Отображает детальную информацию об инвойсе:
 * - Данные клиента (имя, email, компания, телефон, сайт).
 * - Проект.
 * - Платежи с историей.
 *
 * @route GET /dashboard/finance/invoices/[id]
 * @exports InvoiceDetailPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { InvoiceView } from "@/components/crm/finance/invoice-view"
import { t } from "@/lib/translations"

interface PageProps { params: Promise<{ id: string }> }

export const metadata: Metadata = { title: t("Invoice | CRM") }

/**
 * Серверная страница деталей инвойса.
 *
 * @param {PageProps} props - params с id инвойса.
 * @returns {Promise<JSX.Element>} Компонент InvoiceView с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает инвойс с клиентом, проектом и платежами.
 * - Вызывает notFound() если инвойс не найден.
 */
export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, email: true, company: true, phone: true, website: true } },
      project: { select: { id: true, name: true } },
      payments: { orderBy: { date: "desc" } },
    },
  })

  if (!invoice) notFound()

  return <InvoiceView invoice={JSON.parse(JSON.stringify(invoice))} />
}
