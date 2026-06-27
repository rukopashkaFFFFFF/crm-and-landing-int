"use client"

/**
 * FinanceOverview — обзорная страница финансов.
 *
 * Страница: /dashboard/finance.
 * Отображает KPI-карточки (MRR, Outstanding, Overdue, Collected this month),
 * график месячной выручки (Recharts), быстрые действия (New Invoice/Estimate),
 * а также таблицы инвойсов и смет.
 *
 * @param {Object} props
 * @param {Invoice[]} props.invoices — все инвойсы
 * @param {Estimate[]} props.estimates — все сметы
 * @param {Client[]} props.clients — клиенты
 * @param {number} props.collectedThisMonth — собрано за месяц
 *
 * Состояния:
 * - Расчёты: outstanding, overdueAmount, mrr, monthlyData (useMemo)
 * - Tabs: Invoices / Estimates
 * - Empty states: "No invoices yet", "No estimates yet"
 */

import { useRouter } from "next/navigation"
import { useMemo } from "react"
import { format, startOfMonth, subMonths } from "date-fns"
import { Plus, DollarSign, FileText, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { t, translateStatus } from "@/lib/translations"

type Invoice = any
type Estimate = any
type Client = { id: string; name: string }

const statusColors: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700", SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700", OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-zinc-100 text-zinc-400",
}

interface Props {
  invoices: Invoice[]
  estimates: Estimate[]
  clients: Client[]
  collectedThisMonth: number
}

/**
 * FinanceOverview — обзор финансов.
 *
 * Шаги:
 * 1. Расчёт метрик: MRR, outstanding, overdue, collected.
 * 2. KPI-карточки в 4 колонки.
 * 3. График Monthly Revenue (BarChart) за 12 месяцев.
 * 4. Блок Quick Actions (New Invoice, New Estimate).
 * 5. Tabs: Invoices (таблица с номерами, суммами, статусом) и Estimates.
 *
 * @param invoices — инвойсы
 * @param estimates — сметы
 * @param clients — клиенты
 * @param collectedThisMonth — собрано за месяц
 * @returns JSX — страница финансов
 */
export function FinanceOverview({ invoices, estimates, clients, collectedThisMonth }: Props) {
  const router = useRouter()

  const outstanding = invoices
    .filter((i) => i.status === "SENT" || i.status === "OVERDUE")
    .reduce((s, i) => s + Number(i.total), 0)

  const overdueAmount = invoices
    .filter((i) => i.status === "OVERDUE" || (i.status === "SENT" && i.dueDate && new Date(i.dueDate) < new Date()))
    .reduce((s, i) => s + Number(i.total), 0)

  const mrr = invoices
    .filter((i) => i.status === "PAID")
    .reduce((s, i) => s + Number(i.total), 0)

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i)
      const key = format(d, "MMM yy")
      map[key] = 0
    }
    invoices
      .filter((i) => i.status === "PAID" && i.paidAt)
      .forEach((i) => {
        const key = format(new Date(i.paidAt), "MMM yy")
        if (map[key] !== undefined) map[key] += Number(i.total)
      })
    return Object.entries(map).map(([month, total]) => ({ month, total }))
  }, [invoices])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="py-4"><div className="flex items-center gap-3"><DollarSign className="h-8 w-8 text-green-500" /><div><p className="text-2xl font-bold">${mrr.toLocaleString()}</p><p className="text-xs text-muted-foreground">{t("MRR (paid invoices)")}</p></div></div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-amber-500" /><div><p className="text-2xl font-bold">${outstanding.toLocaleString()}</p><p className="text-xs text-muted-foreground">{t("Outstanding")}</p></div></div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="flex items-center gap-3"><AlertCircle className="h-8 w-8 text-red-500" /><div><p className="text-2xl font-bold">${overdueAmount.toLocaleString()}</p><p className="text-xs text-muted-foreground">{t("Overdue")}</p></div></div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-blue-500" /><div><p className="text-2xl font-bold">${collectedThisMonth.toLocaleString()}</p><p className="text-xs text-muted-foreground">{t("Collected this month")}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">{t("Monthly Revenue")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => `$${(v || 0).toLocaleString()}`} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t("Quick Actions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/dashboard/finance/invoices/new")}>
              <Plus className="mr-2 h-4 w-4" /> {t("New Invoice")}
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/dashboard/finance/estimates/new")}>
              <Plus className="mr-2 h-4 w-4" /> {t("New Estimate")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">{t("Invoices ({count})", { count: invoices.length })}</TabsTrigger>
          <TabsTrigger value="estimates">{t("Estimates ({count})", { count: estimates.length })}</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Number")}</TableHead>
                  <TableHead>{t("Client")}</TableHead>
                  <TableHead>{t("Amount")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead>{t("Due Date")}</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("No invoices yet")}</TableCell></TableRow>
                )}
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/finance/invoices/${inv.id}`)}>
                    <TableCell className="font-medium">{inv.number}</TableCell>
                    <TableCell>{inv.client?.name || "—"}</TableCell>
                    <TableCell>${Number(inv.total).toLocaleString()}</TableCell>
                    <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inv.status] || ""}`}>{translateStatus(inv.status)}</span></TableCell>
                    <TableCell className="text-muted-foreground">{inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/finance/invoices/${inv.id}`) }}>{t("View")}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="estimates" className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Client")}</TableHead>
                  <TableHead>{t("Amount")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead>{t("Valid Until")}</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("No estimates yet")}</TableCell></TableRow>
                )}
                {estimates.map((est) => (
                  <TableRow key={est.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/finance/estimates/${est.id}`)}>
                    <TableCell className="font-medium">{est.client?.name || "—"}</TableCell>
                    <TableCell>${Number(est.total).toLocaleString()}</TableCell>
                    <TableCell><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[est.status] || ""}`}>{translateStatus(est.status)}</span></TableCell>
                    <TableCell className="text-muted-foreground">{est.validUntil ? format(new Date(est.validUntil), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/finance/estimates/${est.id}`) }}>{t("View")}</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
