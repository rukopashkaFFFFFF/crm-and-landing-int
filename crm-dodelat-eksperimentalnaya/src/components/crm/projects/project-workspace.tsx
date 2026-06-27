"use client"

/**
 * ProjectWorkspace — рабочая область проекта с переключением представлений.
 *
 * Страница: /dashboard/projects/[id].
 * Показывает хедер проекта (имя, статус, клиент, PM), KPI-карточки
 * (прогресс, задачи, бюджет, часы), переключение между Board, List,
 * Timeline и Finance вкладками.
 *
 * @param {Object} props
 * @param {Project} props.project — полный объект проекта (с задачами,
 *   milestones, invoices)
 * @param {User[]} props.users — пользователи для назначения задач
 *
 * Server action: updateProject (смена статуса).
 *
 * Состояния:
 * - view: "board" | "list" | "timeline" | "finance"
 * - selectedTask: открытая панель задачи
 * - showAddTask: открыть модал добавления задачи
 */

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { Plus, GanttChart, List, Columns3, ExternalLink, DollarSign } from "lucide-react"

import { updateProject } from "@/lib/actions/projects"
import { t, translateStatus } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BoardView } from "./board/board-view"
import { ListView } from "./list/list-view"
import { TimelineView } from "./timeline/timeline-view"
import { TaskDetailPanel } from "./task-detail/task-detail-panel"
import { ProjectFinanceTab } from "./finance/project-finance-tab"

type Project = any
type User = { id: string; name: string | null; image: string | null }

/**
 * getInitials — возвращает инициалы (до 2 букв) или "?".
 * @param name — полное имя или null
 * @returns строка инициалов
 */
function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

const statusColors: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  REVIEW: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ON_HOLD: "bg-zinc-100 text-zinc-800",
  CANCELLED: "bg-red-100 text-red-800",
}

interface Props { project: Project; users: User[] }

/**
 * ProjectWorkspace — основная рабочая область проекта.
 *
 * Шаги:
 * 1. Отображение хедера: имя, статус (с возможностью смены), клиент, PM.
 * 2. KPI-карточки: прогресс задач, бюджет, затраченные часы.
 * 3. Tabs для переключения между Board/List/Timeline/Finance.
 * 4. Кнопка "Send Portal Link" для отправки клиенту.
 * 5. TaskDetailPanel открывается по клику на задачу.
 *
 * Побочные эффекты:
 * - updateProject при смене статуса (тост, router.refresh)
 * - fetch /api/portal/generate для портальной ссылки
 *
 * @param project — проект с полными данными
 * @param users — пользователи
 * @returns JSX — рабочая область проекта
 */
export function ProjectWorkspace({ project, users }: Props) {
  const router = useRouter()
  const [view, setView] = useState("board")
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showAddTask, setShowAddTask] = useState(false)

  const handleStatusChange = useCallback(async (status: string) => {
    const fd = new FormData(); fd.set("status", status)
    const result = await updateProject(project.id, fd)
    if (result.error) { toast.error(t("Failed to update status")); return }
    toast.success(t("Status updated")); router.refresh()
  }, [project.id, router])

  const budgetUsed = project.budget > 0 ? Math.round((Number(project.spent) / Number(project.budget)) * 100) : 0
  const totalTasks = project.tasks.length
  const doneTasks = project.tasks.filter((t: any) => t.status === "DONE").length
  const totalHours = project.tasks.reduce((sum: number, t: any) =>
    sum + (t.timeEntries || []).reduce((s: number, e: any) => s + Number(e.hours), 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status] || ""}`}>
              {translateStatus(project.status)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{t("Client:")} <a href={`/dashboard/clients/${project.client.id}`} className="font-medium hover:underline">{project.client.name}</a></span>
            {project.pm && (
              <div className="flex items-center gap-1.5">
                <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px]">{getInitials(project.pm.name)}</AvatarFallback></Avatar>
                <span>{project.pm.name}</span>
              </div>
            )}
            <Select defaultValue={project.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["PLANNING", "IN_PROGRESS", "REVIEW", "COMPLETED", "ON_HOLD", "CANCELLED"].map((s) => (
                  <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <PortalLinkButton projectId={project.id} clientName={project.client.name} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t("Progress")}</p><p className="text-lg font-bold">{totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t("Tasks")}</p><p className="text-lg font-bold">{doneTasks}/{totalTasks}</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t("Budget")}</p><p className="text-lg font-bold">{budgetUsed}%</p></div>
        <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t("Hours Logged")}</p><p className="text-lg font-bold">{totalHours.toFixed(1)}</p></div>
      </div>

      <div className="flex items-center justify-between border-b pb-2">
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="board"><Columns3 className="mr-2 h-4 w-4" />{t("Board")}</TabsTrigger>
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />{t("List")}</TabsTrigger>
            <TabsTrigger value="timeline"><GanttChart className="mr-2 h-4 w-4" />{t("Timeline")}</TabsTrigger>
            <TabsTrigger value="finance"><DollarSign className="mr-2 h-4 w-4" />{t("Finance")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={() => setShowAddTask(true)}><Plus className="mr-1 h-4 w-4" />{t("Add Task")}</Button>
      </div>

      {view === "board" && (
        <BoardView
          tasks={project.tasks}
          projectId={project.id}
          users={users}
          onTaskClick={(t) => setSelectedTask(t)}
          onRefresh={() => router.refresh()}
        />
      )}
      {view === "list" && (
        <ListView
          tasks={project.tasks}
          users={users}
          milestones={project.milestones}
          onTaskClick={(t) => setSelectedTask(t)}
          onRefresh={() => router.refresh()}
        />
      )}
      {view === "timeline" && (
        <TimelineView
          tasks={project.tasks}
          milestones={project.milestones}
          users={users}
          projectStart={project.startDate}
          projectEnd={project.endDate}
        />
      )}

      <TaskDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        users={users}
        onUpdated={() => router.refresh()}
      />
    </div>
  )
}

/**
 * PortalLinkButton — генерирует портальную ссылку для клиента.
 *
 * Вызывает /api/portal/generate (POST), отправляет ссылку клиенту.
 *
 * @param projectId — ID проекта
 * @param clientName — имя клиента (для тоста)
 * @returns JSX — кнопка с состоянием загрузки
 */
function PortalLinkButton({ projectId, clientName }: { projectId: string; clientName: string }) {
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch("/api/portal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || t("Failed")); return }
      toast.success(t("Portal link generated and sent to client"))
    } catch {
      toast.error(t("Failed to generate portal link"))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
      <ExternalLink className="mr-2 h-4 w-4" />
      {generating ? t("Sending...") : t("Send Portal Link")}
    </Button>
  )
}
