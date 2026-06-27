/**
 * @file Страница финансов (Finance).
 *
 * @description Отображает обзор финансовых данных:
 * - Все инвойсы (с клиентами и платежами).
 * - Все сметы (estimates) с клиентами.
 * - Список клиентов для фильтрации.
 * - Сумма платежей за текущий месяц.
 *
 * @route GET /dashboard/finance
 * @exports FinancePage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { FinanceOverview } from "@/components/crm/finance/finance-overview"
import { t } from "@/lib/translations"

export const metadata: Metadata = { title: t("Finance | CRM") }

/**
 * Серверная страница финансов.
 *
 * @returns {Promise<JSX.Element>} Компонент FinanceOverview с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Выполняет 4 параллельных запроса к БД (invoices, estimates, clients, payments).
 * - Вычисляет collectedThisMonth из платежей.
 */
export default async function FinancePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1)

  const [invoices, estimates, clients, payments] = await Promise.all([
    db.invoice.findMany({
      include: { client: { select: { id: true, name: true, email: true } }, payments: true },
      orderBy: { createdAt: "desc" },
    }),
    db.estimate.findMany({
      include: { client: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.payment.findMany({
      where: { date: { gte: firstOfMonth } },
    }),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("Finance")}</h1>
      <FinanceOverview
        invoices={JSON.parse(JSON.stringify(invoices))}
        estimates={JSON.parse(JSON.stringify(estimates))}
        clients={JSON.parse(JSON.stringify(clients))}
        collectedThisMonth={payments.reduce((s, p) => s + Number(p.amount), 0)}
      />
    </div>
  )
}
