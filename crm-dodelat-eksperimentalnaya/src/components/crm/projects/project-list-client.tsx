"use client"

/**
 * ProjectListClient — страница списка проектов с фильтрацией и карточками.
 *
 * Страница: /dashboard/projects.
 * Отображает KPI-карточки (активные, просроченные, завершённые), фильтры
 * по статусу и клиенту, сетку карточек проектов с прогрессом и бюджетом.
 *
 * @param {Object} props
 * @param {Project[]} props.projects — массив проектов
 * @param {Client[]} props.clients — клиенты (для фильтра)
 * @param {User[]} props.users — пользователи (для AddProjectDialog)
 * @param {Record<string, string|undefined>} props.searchParams — URL-параметры
 *
 * Состояния:
 * - KPI-блок: active, overdue, completed
 * - Фильтры по статусу и клиенту (через URL)
 * - Empty state "No projects found"
 */

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { Plus, AlertCircle, CheckCircle2, Clock } from "lucide-react"

import { t, translateStatus } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AddProjectDialog } from "./add-project-dialog"

type Project = {
  id: string
  name: string
  description: string | null
  status: string
  startDate: string | null
  endDate: string | null
  budget: number
  spent: number
  client: { id: string; name: string }
  pm: { id: string; name: string | null; image: string | null } | null
  tasks: { id: string; status: string }[]
}

type Client = { id: string; name: string }
type User = { id: string; name: string | null }

const statusColors: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  REVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ON_HOLD: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-green-500",
}

/**
 * getInitials — инициалы для аватара (до 2 букв) или "?".
 * @param name — имя или null
 * @returns инициалы
 */
function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

interface Props {
  projects: Project[]
  clients: Client[]
  users: User[]
  searchParams: Record<string, string | undefined>
}

/**
 * ProjectListClient — список проектов в виде карточек с KPI и фильтрами.
 *
 * Шаги:
 * 1. Расчёт KPI: активные, просроченные, завершённые за месяц.
 * 2. Фильтры по статусу и клиенту (обновление URL).
 * 3. Сетка карточек проектов с прогресс-баром, бюджетом, deadlines.
 * 4. Каждая карточка ведёт на /dashboard/projects/[id].
 *
 * @param projects — массив проектов
 * @param clients — клиенты
 * @param users — пользователи
 * @param searchParams — URL-параметры
 * @returns JSX — страница проектов
 */
export function ProjectListClient({ projects, clients, users, searchParams }: Props) {
  const router = useRouter()
  const sp = useSearchParams()

  const buildUrl = useCallback((params: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString())
    Object.entries(params).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k) })
    return `/dashboard/projects?${next.toString()}`
  }, [sp])

  function handleFilter(key: string, val: string | undefined) {
    router.push(buildUrl({ [key]: val }))
  }

  const totalActive = projects.filter((p) => p.status === "IN_PROGRESS").length
  const overdue = projects.filter((p) => p.endDate && new Date(p.endDate) < new Date() && p.status !== "COMPLETED" && p.status !== "CANCELLED").length
  const completedThisMonth = projects.filter((p) => p.status === "COMPLETED").length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-8 w-8 text-amber-500" />
            <div><p className="text-2xl font-bold">{totalActive}</p><p className="text-sm text-muted-foreground">{t("Active Projects")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div><p className="text-2xl font-bold">{overdue}</p><p className="text-sm text-muted-foreground">{t("Overdue")}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div><p className="text-2xl font-bold">{completedThisMonth}</p><p className="text-sm text-muted-foreground">{t("Completed This Month")}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={searchParams.status || ""} onValueChange={(v) => handleFilter("status", v || undefined)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("Status")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">{t("All")}</SelectItem>
            {["PLANNING", "IN_PROGRESS", "REVIEW", "COMPLETED", "ON_HOLD", "CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={searchParams.clientId || ""} onValueChange={(v) => handleFilter("clientId", v || undefined)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("Client")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">{t("All Clients")}</SelectItem>
            {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <AddProjectDialog clients={clients} users={users} onCreated={() => router.refresh()} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => {
          const total = project.tasks.length
          const done = project.tasks.filter((t) => t.status === "DONE").length
          const progress = total > 0 ? Math.round((done / total) * 100) : 0
          const budgetUsed = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0
          const deadline = project.endDate ? formatDistanceToNow(new Date(project.endDate), { addSuffix: true }) : null
          const isOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== "COMPLETED" && project.status !== "CANCELLED"

          return (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-tight">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.client.name}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] || ""}`}>
                    {translateStatus(project.status)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {project.pm && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{getInitials(project.pm.name)}</AvatarFallback></Avatar>
                      <span>{project.pm.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("Progress")}</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {project.budget > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t("Budget")}</span>
                      <span className="font-medium">${project.spent.toLocaleString()} / ${project.budget.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${budgetUsed > 90 ? "bg-red-500" : budgetUsed > 70 ? "bg-amber-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min(budgetUsed, 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{done}/{total} {t("Tasks")}</span>
                  {deadline && (
                    <span className={isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}>
                      {isOverdue ? t("Overdue") : deadline}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        {projects.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">{t("No projects found")}</div>
        )}
      </div>
    </div>
  )
}
