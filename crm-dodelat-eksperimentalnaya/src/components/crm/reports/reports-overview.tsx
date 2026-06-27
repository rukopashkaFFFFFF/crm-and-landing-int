"use client"

/**
 * ReportsOverview — страница отчётов с аналитикой и экспортом CSV.
 *
 * Страница: /dashboard/reports.
 * Вкладки: Overview (билльность, выручка по клиентам), Project Profitability
 * (рентабельность проектов), Team Utilization (загрузка команды).
 *
 * @param {Object} props
 * @param {Entry[]} props.timeEntries — записи времени
 * @param {User[]} props.users — пользователи
 * @param {Project[]} props.projects — проекты (для расчёта profitability)
 * @param {any[]} props.invoices — инвойсы (для revenue)
 *
 * Состояния:
 * - Расчёты через useMemo: billableEntries, revenueByClient,
 *   projectProfitability, teamUtilization
 * - Tabs: overview / projects / team
 */

import { useMemo } from "react"
import { format } from "date-fns"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Download } from "lucide-react"
import { toast } from "sonner"

import { t } from "@/lib/translations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Entry = any
type User = any
type Project = any

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

interface Props { timeEntries: Entry[]; users: User[]; projects: Project[]; invoices: any[] }

/**
 * toCSV — форматирует данные в CSV-строку.
 * @param headers — заголовки колонок
 * @param rows — строки данных
 * @returns строка CSV
 */
function toCSV(headers: string[], rows: string[][]) {
  return [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n")
}

/**
 * downloadCSV — скачивает CSV-файл на клиенте.
 * @param filename — имя файла
 * @param csv — содержимое CSV
 */
function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
  toast.success(t("CSV downloaded"))
}

/**
 * ReportsOverview — страница отчётов.
 *
 * Шаги (Overview):
 * 1. PieChart: Billable vs Non-billable hours.
 * 2. BarChart: Revenue per Client + кнопка CSV.
 *
 * Шаги (Project Profitability):
 * 1. Таблица проектов с cost/revenue/margin.
 * 2. Кнопка CSV.
 *
 * Шаги (Team Utilization):
 * 1. Таблица участников с hours/capacity/utilization.
 * 2. Кнопка CSV.
 *
 * @param timeEntries — записи времени
 * @param users — пользователи
 * @param projects — проекты
 * @param invoices — инвойсы
 * @returns JSX — страница отчётов
 */
export function ReportsOverview({ timeEntries, users, projects, invoices }: Props) {
  const billableEntries = useMemo(() => timeEntries.filter((e: Entry) => e.billable), [timeEntries])
  const nonBillableEntries = useMemo(() => timeEntries.filter((e: Entry) => !e.billable), [timeEntries])

  const billableHours = billableEntries.reduce((s: number, e: Entry) => s + Number(e.hours), 0)
  const nonBillableHours = nonBillableEntries.reduce((s: number, e: Entry) => s + Number(e.hours), 0)

  const revenueByClient = useMemo(() => {
    const map: Record<string, number> = {}
    invoices.forEach((inv: any) => {
      const name = projects.find((p: Project) => p.id === inv.clientId)?.client?.name || "Unknown"
      map[name] = (map[name] || 0) + Number(inv.total)
    })
    return Object.entries(map).map(([name, revenue]) => ({ name, revenue }))
  }, [invoices, projects])

  const projectProfitability = useMemo(() => {
    return projects.map((p: Project) => {
      const pEntries = timeEntries.filter((e: Entry) => e.task?.projectId === p.id)
      const cost = pEntries.reduce((s: number, e: Entry) => {
        const rate = Number(e.user?.hourlyRate || 0)
        return s + Number(e.hours) * rate
      }, 0)
      const revenue = invoices.filter((i: any) => i.clientId === p.clientId).reduce((s: number, i: any) => s + Number(i.total), 0)
      const margin = revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : 0
      return { name: p.name, client: p.client?.name || "—", cost: Math.round(cost), revenue, margin }
    })
  }, [projects, timeEntries, invoices])

  const teamUtilization = useMemo(() => {
    return users.map((u: User) => {
      const uEntries = timeEntries.filter((e: Entry) => e.user?.id === u.id)
      const total = uEntries.reduce((s: number, e: Entry) => s + Number(e.hours), 0)
      const capacity = Number(u.capacityHours) * 4.33
      const util = capacity > 0 ? Math.round((total / capacity) * 100) : 0
      return { name: u.name || "Unnamed", total: Math.round(total), capacity: Math.round(capacity), util }
    })
  }, [users, timeEntries])

  const billableChart = [
    { name: "Billable", hours: Math.round(billableHours) },
    { name: "Non-billable", hours: Math.round(nonBillableHours) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("Reports")}</h1>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="projects">{t("Project Profitability")}</TabsTrigger>
          <TabsTrigger value="team">{t("Team Utilization")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">{t("Billable vs Non-billable")}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={billableChart} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {billableChart.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: any) => `${v}h`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{t("Revenue per Client")}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => {
                  const csv = toCSV(["Client", "Revenue"], revenueByClient.map((r) => [r.name, String(r.revenue)]))
                  downloadCSV("revenue-per-client.csv", csv)
                }}>
                  <Download className="mr-2 h-4 w-4" />{t("CSV")}
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={revenueByClient}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => `$${v.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              const csv = toCSV(["Project", "Client", "Cost", "Revenue", "Margin %"], projectProfitability.map((p) => [p.name, p.client, String(p.cost), String(p.revenue), String(p.margin)]))
              downloadCSV("project-profitability.csv", csv)
            }}>
              <Download className="mr-2 h-4 w-4" />{t("CSV")}
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Project")}</TableHead>
                  <TableHead>{t("Client")}</TableHead>
                  <TableHead className="text-right">{t("Cost")}</TableHead>
                  <TableHead className="text-right">{t("Revenue")}</TableHead>
                  <TableHead className="text-right">{t("Margin")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectProfitability.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.client}</TableCell>
                    <TableCell className="text-right">${p.cost.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${p.revenue.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.margin >= 20 ? "default" : p.margin >= 0 ? "secondary" : "destructive"}>
                        {p.margin >= 0 ? "+" : ""}{p.margin}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => {
              const csv = toCSV(["Name", "Hours Logged", "Capacity", "Utilization %"], teamUtilization.map((u) => [u.name, String(u.total), String(u.capacity), String(u.util)]))
              downloadCSV("team-utilization.csv", csv)
            }}>
              <Download className="mr-2 h-4 w-4" />{t("CSV")}
            </Button>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Team Member")}</TableHead>
                  <TableHead className="text-right">{t("Hours Logged")}</TableHead>
                  <TableHead className="text-right">{t("Capacity")}</TableHead>
                  <TableHead className="text-right">{t("Utilization")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamUtilization.map((u) => (
                  <TableRow key={u.name}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-right">{u.total}h</TableCell>
                    <TableCell className="text-right">{u.capacity}h</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={u.util > 100 ? "destructive" : u.util > 80 ? "secondary" : "default"}>
                        {u.util}%
                      </Badge>
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
