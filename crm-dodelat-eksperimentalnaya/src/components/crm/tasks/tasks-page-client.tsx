"use client"

/**
 * TasksPageClient — страница всех задач с фильтрацией, сортировкой и поиском.
 *
 * Страница: /dashboard/tasks.
 * Показывает все задачи системы (не только одного проекта). Поддерживает
 * фильтры по статусу, приоритету, исполнителю, проекту, поиск по названию,
 * сортировку по столбцам (статус, приоритет, дата).
 *
 * @param {Object} props
 * @param {Task[]} props.tasks — все задачи
 * @param {Project[]} props.projects — проекты
 * @param {User[]} props.users — пользователи
 * @param {string} props.currentUserId — текущий пользователь (не используется)
 *
 * Server action: moveTask (для смены статуса через Select).
 *
 * Состояния:
 * - Фильтры: statusFilter, priorityFilter, assigneeFilter, projectFilter
 * - searchQuery: строка поиска
 * - sortKey/sortDir: сортировка
 * - selectedTask: выбранная задача (TaskDetailPanel)
 * - Empty state: "No tasks found"
 */

import { useState, useMemo, useCallback } from "react"
import { format, formatDistanceToNow } from "date-fns"
import {
  ListTodo, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, Search,
} from "lucide-react"
import { toast } from "sonner"

import { moveTask } from "@/lib/actions/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { TaskDetailPanel } from "@/components/crm/projects/task-detail/task-detail-panel"
import { t, translateStatus } from "@/lib/translations"

type Task = {
  id: string
  projectId: string
  assigneeId: string | null
  title: string
  description: string | null
  status: string
  priority: string
  startDate: string | null
  dueDate: string | null
  estimatedHours: number
  position: number
  parentTaskId: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  project: { id: string; name: string }
  assignee: { id: string; name: string | null; image: string | null } | null
}

type Project = { id: string; name: string }
type User = { id: string; name: string | null; image: string | null }

const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
const statusOrder: Record<string, number> = { TODO: 0, IN_PROGRESS: 1, IN_REVIEW: 2, DONE: 3, CANCELLED: 4 }

const priorityDotColor: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"> = {
  TODO: "outline",
  IN_PROGRESS: "secondary",
  IN_REVIEW: "default",
  DONE: "ghost",
  CANCELLED: "destructive",
}

function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

interface Props {
  tasks: Task[]
  projects: Project[]
  users: User[]
  currentUserId: string
}

/**
 * TasksPageClient — страница всех задач.
 *
 * Шаги:
 * 1. Фильтрация задач по статусу, приоритету, исполнителю, проекту, поиску.
 * 2. Сортировка по статусу/приоритету/дате (asc/desc).
 * 3. Таблица с чекбоксами, Select для смены статуса, названием, проектом,
 *    исполнителем, приоритетом (цветная точка), датой, часами.
 * 4. Клик по названию открывает TaskDetailPanel.
 * 5. Сброс фильтров одной кнопкой.
 *
 * Побочные эффекты: toast при moveTask.
 *
 * @param tasks — все задачи
 * @param projects — проекты
 * @param users — пользователи
 * @param currentUserId — ID текущего пользователя
 * @returns JSX — страница задач
 */
export function TasksPageClient({ tasks, projects, users, currentUserId }: Props) {
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [assigneeFilter, setAssigneeFilter] = useState("")
  const [projectFilter, setProjectFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<string>("dueDate")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const toggleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        return prev
      }
      setSortDir("asc")
      return key
    })
  }, [])

  const filtered = useMemo(() => {
    let result = [...tasks]

    if (statusFilter) result = result.filter((t) => t.status === statusFilter)
    if (priorityFilter) result = result.filter((t) => t.priority === priorityFilter)
    if (assigneeFilter) result = result.filter((t) => t.assigneeId === assigneeFilter)
    if (projectFilter) result = result.filter((t) => t.projectId === projectFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortKey === "dueDate") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
        cmp = da - db
      } else if (sortKey === "priority") {
        cmp = (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
      } else if (sortKey === "status") {
        cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return result
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, projectFilter, searchQuery, sortKey, sortDir])

  async function handleStatusChange(taskId: string, newStatus: string) {
    const result = await moveTask(taskId, newStatus)
    if (result.error) {
      toast.error(t("Failed to update"))
      return
    }
    toast.success(t("Status updated"))
  }

  function handleTaskClick(task: Task) {
    setSelectedTask(task)
  }

  const SortIcon = sortDir === "asc" ? ArrowUp : ArrowDown

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Search tasks...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("Status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("All Statuses")}</SelectItem>
              {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"].map((s) => (
                <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? "")}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder={t("Priority")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("All Priorities")}</SelectItem>
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                <SelectItem key={p} value={p}>{translateStatus(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={(v) => setAssigneeFilter(v ?? "")}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("Assignee")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("All Assignees")}</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name || t("Unknown")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={(v) => setProjectFilter(v ?? "")}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("Project")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">{t("All Projects")}</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => {
            setStatusFilter(""); setPriorityFilter(""); setAssigneeFilter(""); setProjectFilter(""); setSearchQuery("")
          }}>
            {t("Clear Filters")}
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"><input type="checkbox" className="h-4 w-4" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                  <span className="flex items-center gap-1">
                    {t("Status")} {sortKey === "status" ? <SortIcon className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
                  </span>
                </TableHead>
                <TableHead className="min-w-[200px]">{t("Title")}</TableHead>
                <TableHead>{t("Project")}</TableHead>
                <TableHead>{t("Assignee")}</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("priority")}>
                  <span className="flex items-center gap-1">
                    {t("Priority")} {sortKey === "priority" ? <SortIcon className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("dueDate")}>
                  <span className="flex items-center gap-1">
                    {t("Due Date")} {sortKey === "dueDate" ? <SortIcon className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3" />}
                  </span>
                </TableHead>
                <TableHead className="text-right">{t("Est. Hours")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ListTodo className="h-10 w-10" />
                      <p className="text-sm font-medium">{t("No tasks found")}</p>
                      <p className="text-xs">{t("Try adjusting your filters or search query")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell><input type="checkbox" className="h-4 w-4" /></TableCell>
                    <TableCell>
                      <Select
                        defaultValue={task.status}
                        onValueChange={(v) => v && handleStatusChange(task.id, v)}
                      >
                        <SelectTrigger className="h-6 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"].map((s) => (
                            <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleTaskClick(task)}
                        className="text-sm font-medium text-left hover:text-primary transition-colors cursor-pointer"
                      >
                        {task.title}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{task.project.name}</span>
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px]">{getInitials(task.assignee.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("Unassigned")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2.5 w-2.5 rounded-full", priorityDotColor[task.priority] || "bg-gray-400")} />
                        <span className="text-sm text-muted-foreground">{translateStatus(task.priority)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.dueDate ? (
                        <span className={cn(
                          "text-sm",
                          new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "CANCELLED"
                            ? "text-red-500 font-medium"
                            : "text-muted-foreground"
                        )}>
                          {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {Number(task.estimatedHours) > 0 ? `${Number(task.estimatedHours)}h` : "—"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-xs text-muted-foreground">
          {t("Showing {n} of {total} tasks", { n: filtered.length, total: tasks.length })}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          users={users}
          onUpdated={() => window.location.reload()}
        />
      )}
    </>
  )
}
