"use client"

/**
 * AnalyticsClient — страница аналитики с графиками и таблицами.
 *
 * Страница: /dashboard/analytics.
 * Отображает: Revenue by Client (stacked bar), Lead Funnel (horizontal bar),
 * Project Status (pie), Task Completion Rate (line), Team Performance (table).
 * Поддерживает выбор диапазона дат (week, month, 3months, year).
 *
 * @param {Object} props
 * @param {Data} props.data — объект с monthlyRevenue, leads, projects,
 *   paidInvoices, tasks, users, timeEntries, clients
 *
 * Состояния:
 * - dateRange: выбранный диапазон
 * - Фильтрация timeEntries по dateRange
 * - Все графики через useMemo
 */

import { useState, useMemo } from "react"
import { format, startOfWeek, startOfMonth, subMonths, startOfYear, isWithinInterval } from "date-fns"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts"
import { Download } from "lucide-react"

import { t, translateEnum } from "@/lib/translations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280", "#ec4899", "#14b8a6"]

type Data = {
  monthlyRevenue: any[]
  leads: any[]
  projects: any[]
  paidInvoices: any[]
  tasks: any[]
  users: any[]
  timeEntries: any[]
  clients: any[]
}

interface Props { data: Data }

/**
 * AnalyticsClient — страница аналитики.
 *
 * Шаги:
 * 1. Выбор dateRange фильтрует timeEntries.
 * 2. Revenue by Client: stacked bar с top-5 клиентами.
 * 3. Lead Funnel: horizontal bar по стадиям воронки.
 * 4. Project Status: pie chart по статусам.
 * 5. Task Completion Rate: line chart по месяцам.
 * 6. Team Performance: таблица с задачами, часами, билль%.
 *
 * @param data — все данные для аналитики
 * @returns JSX — страница аналитики
 */
export function AnalyticsClient({ data }: Props) {
  const [dateRange, setDateRange] = useState("year")

  const dateFilter = useMemo(() => {
    const now = new Date()
    switch (dateRange) {
      case "week": return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now }
      case "month": return { start: startOfMonth(now), end: now }
      case "3months": return { start: subMonths(now, 3), end: now }
      case "year": return { start: startOfYear(now), end: now }
      default: return { start: startOfYear(now), end: now }
    }
  }, [dateRange])

  const filteredEntries = useMemo(() =>
    data.timeEntries.filter((e: any) => isWithinInterval(new Date(e.date), dateFilter)),
  [data.timeEntries, dateFilter])

  // ─── Revenue stacked bar ──────────────────────────────
  const revenueByMonthByClient = useMemo(() => {
    const months: Record<string, Record<string, number>> = {}
    const clientNames: string[] = []
    data.monthlyRevenue.forEach((inv: any) => {
      const month = format(new Date(inv.paidAt), "MMM yy")
      const client = data.clients.find((c: any) => c.id === inv.clientId)
      const name = client?.name || "Unknown"
      if (!months[month]) months[month] = {}
      months[month][name] = (months[month][name] || 0) + Number(inv.total)
      if (!clientNames.includes(name) && name !== "Unknown") clientNames.push(name)
    })
    const topClients = clientNames.slice(0, 5)
    return Object.entries(months).map(([month, clients]) => {
      const row: Record<string, any> = { month }
      let otherTotal = 0
      topClients.forEach((c) => { row[c] = clients[c] || 0 })
      Object.entries(clients).forEach(([name, val]) => {
        if (!topClients.includes(name)) otherTotal += val
      })
      if (otherTotal > 0) row["Other"] = otherTotal
      return row
    })
  }, [data.monthlyRevenue, data.clients])

  // ─── Lead funnel ──────────────────────────────────────
  const leadFunnel = useMemo(() => {
    const stages = ["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATION", "WON"]
    const total = data.leads.length || 1
    return stages.map((stage) => {
      const count = data.leads.filter((l: any) => l.stage === stage).length
      return { name: stage.replace("_", " "), count, pct: Math.round((count / total) * 100) }
    })
  }, [data.leads])

  // ─── Project status pie ───────────────────────────────
  const projectPie = useMemo(() => {
    const map: Record<string, number> = {}
    data.projects.forEach((p: any) => {
      map[p.status] = (map[p.status] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name: name.replace("_", " "), value }))
  }, [data.projects])

  // ─── Task completion rate ─────────────────────────────
  const taskCompletion = useMemo(() => {
    const months: Record<string, { total: number; done: number }> = {}
    data.tasks.forEach((t: any) => {
      const month = format(new Date(t.createdAt), "MMM yy")
      if (!months[month]) months[month] = { total: 0, done: 0 }
      months[month].total++
      if (t.status === "DONE") months[month].done++
    })
    return Object.entries(months).map(([month, v]) => ({
      month, rate: v.total > 0 ? Math.round((v.done / v.total) * 100) : 0,
    }))
  }, [data.tasks])

  // ─── Team performance ─────────────────────────────────
  const teamPerformance = useMemo(() => {
    return data.users.map((u: any) => {
      const uEntries = data.timeEntries.filter((e: any) => e.userId === u.id)
      const totalHours = uEntries.reduce((s: number, e: any) => s + Number(e.hours), 0)
      const billableHours = uEntries.filter((e: any) => e.billable).reduce((s: number, e: any) => s + Number(e.hours), 0)
      const tasksDone = data.tasks.filter((t: any) => t.assigneeId === u.id && t.status === "DONE").length
      const totalTasks = data.tasks.filter((t: any) => t.assigneeId === u.id).length
      return {
        name: u.name || t("Unnamed"), role: u.role,
        tasksDone, tasksTotal: totalTasks,
        hoursLogged: Math.round(totalHours * 10) / 10,
        billablePct: totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0,
      }
    })
  }, [data.users, data.timeEntries, data.tasks])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("Analytics")}</h1>
        <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="week">{t("This Week")}</SelectItem>
            <SelectItem value="month">{t("This Month")}</SelectItem>
            <SelectItem value="3months">{t("Last 3 Months")}</SelectItem>
            <SelectItem value="year">{t("This Year")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("Revenue by Client")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByMonthByClient}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `$${v.toLocaleString()}`} />
                <Legend />
                {Object.keys(revenueByMonthByClient[0] || {}).filter((k) => k !== "month").map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("Lead Funnel")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadFunnel} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip formatter={(v: any) => `${v}`} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("Project Status")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={projectPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {projectPie.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t("Task Completion Rate")}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={taskCompletion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => `${v}%`} />
                <Line type="monotone" dataKey="rate" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{t("Team Performance")}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Name")}</TableHead>
                <TableHead>{t("Role")}</TableHead>
                <TableHead className="text-right">{t("Tasks Done")}</TableHead>
                <TableHead className="text-right">{t("Hours Logged")}</TableHead>
                <TableHead className="text-right">{t("Billable %")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance.map((m) => (
                <TableRow key={m.name}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell><Badge variant="outline">{translateEnum("Role", m.role)}</Badge></TableCell>
                  <TableCell className="text-right">{m.tasksDone}/{m.tasksTotal}</TableCell>
                  <TableCell className="text-right">{m.hoursLogged}h</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={m.billablePct >= 70 ? "default" : m.billablePct >= 40 ? "secondary" : "outline"}>
                      {m.billablePct}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
