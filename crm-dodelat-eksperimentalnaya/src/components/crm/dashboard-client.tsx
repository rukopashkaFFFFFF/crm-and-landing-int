"use client"

/**
 * DashboardClient — главная страница дашборда с настраиваемыми виджетами.
 *
 * Страница: /dashboard.
 * Отображает KPI-карточки, активность, задачи текущего пользователя,
 * последние клиенты, предстоящие дедлайны. Виджеты можно включать/
 * выключать через режим настройки (сохраняется в localStorage).
 *
 * @param {Object} props
 * @param {Data} props.data — объект с метриками:
 *   activeProjects, projectsTrend, revenueThisMonth, revenueLastMonth,
 *   overdueTasks, totalLeadValue, leadCount, activities, myTasks,
 *   recentClients, milestones
 *
 * Состояния:
 * - widgets: Record<string, boolean> (видимость виджетов)
 * - customizing: boolean (режим настройки)
 * - Пустые состояния для каждого виджета
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import {
  Briefcase, DollarSign, AlertCircle, TrendingUp, Activity, ListTodo, Users, Calendar,
  ChevronRight, Settings2, X, GripHorizontal,
} from "lucide-react"
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { t, translateStatus } from "@/lib/translations"

// ─── Types ─────────────────────────────────────────────
type Data = {
  activeProjects: number; projectsTrend: number
  revenueThisMonth: number; revenueLastMonth: number
  overdueTasks: number; totalLeadValue: number; leadCount: number
  activities: any[]; myTasks: any[]; recentClients: any[]; milestones: any[]
}

interface Props { data: Data }

// ─── Helpers ────────────────────────────────────────────
/**
 * getInitials — инициалы для аватара (до 2 букв) или "?".
 * @param name — имя или null
 * @returns инициалы
 */
function getInitials(name?: string | null) {
  return (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

const sparklineData = [
  { v: 10 }, { v: 25 }, { v: 15 }, { v: 40 }, { v: 30 },
  { v: 55 }, { v: 45 }, { v: 70 }, { v: 60 }, { v: 85 }, { v: 75 }, { v: 90 },
]

// ─── Main Component ─────────────────────────────────────
/**
 * DashboardClient — дашборд с настраиваемыми виджетами.
 *
 * Шаги:
 * 1. Загрузка видимости виджетов из localStorage.
 * 2. Кнопка "Customize" включает режим настройки (кнопки включения/выключения).
 * 3. KPI-карточки: активные проекты, выручка, просроченные задачи, pipeline.
 * 4. Виджеты (включаемые): Activity Feed, My Tasks, Recent Clients, Deadlines.
 * 5. Кнопка Export PDF открывает /api/dashboard/pdf.
 *
 * @param data — дашборд-данные
 * @returns JSX — страница дашборда
 */
export function DashboardClient({ data }: Props) {
  const [widgets, setWidgets] = useState<Record<string, boolean>>({
    kpi: true, activity: true, myTasks: true, clients: true, deadlines: true,
  })
  const [customizing, setCustomizing] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dashboard_widgets")
      if (stored) setWidgets((prev) => ({ ...prev, ...JSON.parse(stored) }))
    } catch { /* ignore */ }
  }, [])

  function toggleWidget(key: string) {
    setWidgets((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem("dashboard_widgets", JSON.stringify(next))
      return next
    })
  }

  const KPI = [
    { key: "active", label: t("Active Projects"), value: String(data.activeProjects), trend: `${data.projectsTrend >= 0 ? "+" : ""}${data.projectsTrend} vs last month`, icon: Briefcase, color: "text-blue-500" },
    { key: "revenue", label: t("Revenue This Month"), value: `$${data.revenueThisMonth.toLocaleString()}`, trend: `${data.revenueThisMonth >= data.revenueLastMonth ? "+" : ""}$${(data.revenueThisMonth - data.revenueLastMonth).toLocaleString()} vs last month`, icon: DollarSign, color: "text-green-500", sparkline: true },
    { key: "overdue", label: t("Overdue Tasks"), value: String(data.overdueTasks), trend: data.overdueTasks > 0 ? t("Action needed") : t("All clear"), icon: AlertCircle, color: data.overdueTasks > 0 ? "text-red-500" : "text-muted-foreground" },
    { key: "leads", label: t("Pipeline Value"), value: `$${data.totalLeadValue.toLocaleString()}`, trend: `${data.leadCount} open leads`, icon: TrendingUp, color: "text-purple-500" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("Dashboard")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("/api/dashboard/pdf", "_blank")}>
            <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            {t("Export PDF")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCustomizing(!customizing)}>
            <Settings2 className="mr-2 h-4 w-4" />{customizing ? t("Done") : t("Customize")}
          </Button>
        </div>
      </div>

      {customizing && (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3">
            {Object.entries(widgets).map(([key, visible]) => (
              <Button key={key} variant={visible ? "default" : "outline"} size="sm" onClick={() => toggleWidget(key)}>
                {visible ? <X className="mr-1 h-3 w-3" /> : <GripHorizontal className="mr-1 h-3 w-3" />}
                {key === "kpi" ? t("KPI Cards") : key === "activity" ? t("Activity Feed") : key === "myTasks" ? t("My Tasks") : key === "clients" ? t("Recent Clients") : t("Deadlines")}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {widgets.kpi && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI.map((kpi) => (
            <Card key={kpi.key}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.trend}</p>
                  </div>
                  <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                </div>
                {kpi.sparkline && (
                  <div className="mt-2 h-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <defs>
                          <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="url(#spark)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.activity && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5" />{t("Activity Feed")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.activities.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{t("No recent activity")}</p>}
              {data.activities.map((a: any, i: number) => (
                <div key={a.id} className="flex gap-3 py-3 border-b last:border-0">
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarFallback className="text-[9px]">{getInitials(a.user?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{a.user?.name || t("System")}</span>
                      <span className="text-muted-foreground ml-1">{a.description}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {a.type && <Badge variant="outline" className="text-[10px] shrink-0">{a.type.replace("_", " ")}</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {widgets.myTasks && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><ListTodo className="h-5 w-5" />{t("My Tasks")}</CardTitle>
              <Link href="/dashboard/tasks" className="text-sm text-primary hover:underline">{t("View all")}</Link>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.myTasks.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{t("No pending tasks")}</p>}
              {data.myTasks.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.project?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`h-2 w-2 rounded-full ${
                      t.priority === "URGENT" ? "bg-red-500" : t.priority === "HIGH" ? "bg-orange-500" : "bg-yellow-500"
                    }`} />
                    {t.dueDate && (
                      <span className={`text-xs ${new Date(t.dueDate) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                        {formatDistanceToNow(new Date(t.dueDate), { addSuffix: true })}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.clients && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />{t("Recent Clients")}</CardTitle>
              <Link href="/dashboard/clients" className="text-sm text-primary hover:underline">{t("View all")}</Link>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.recentClients.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{t("No clients")}</p>}
              {data.recentClients.map((c: any) => (
                <Link key={c.id} href={`/dashboard/clients/${c.id}`}
                  className="flex items-center justify-between py-2.5 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{getInitials(c.name)}</AvatarFallback></Avatar>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.company || c.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{translateStatus(c.status)}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}

        {widgets.deadlines && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5" />{t("Upcoming Deadlines")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              {data.milestones.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{t("No deadlines this week")}</p>}
              {data.milestones.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.project?.name} · {t.assignee?.name || t("Unassigned")}</p>
                  </div>
                  <span className={`text-xs shrink-0 ${new Date(t.dueDate) < new Date() ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                    {format(new Date(t.dueDate), "MMM d")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
