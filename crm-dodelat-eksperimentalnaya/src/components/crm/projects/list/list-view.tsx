"use client"

/**
 * ListView — табличное/списочное представление задач проекта с группировкой.
 *
 * Вкладка: List в ProjectWorkspace.
 * Отображает задачи в виде списка с возможностью группировки по
 * исполнителю, приоритету или дате. Поддерживает чекбокс для быстрого
 * переключения статуса DONE/TODO.
 *
 * @param {Object} props
 * @param {Task[]} props.tasks — задачи проекта
 * @param {User[]} props.users — пользователи
 * @param {Milestone[]} props.milestones — вехи (для маркировки групп)
 * @param {(task: Task) => void} props.onTaskClick — открыть детали
 * @param {() => void} props.onRefresh — обновить данные
 *
 * Server action: updateTask (для смены статуса).
 *
 * Состояния:
 * - groupBy: "none" | "assignee" | "priority" | "dueDate"
 * - Группировка через useMemo
 * - Empty state "No tasks yet"
 */

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { CheckSquare, Square, ArrowUpDown, Users, Flag, Calendar } from "lucide-react"

import { updateTask } from "@/lib/actions/tasks"
import { t, translateStatus } from "@/lib/translations"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

type Task = any
type User = { id: string; name: string | null; image: string | null }
type Milestone = any

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-green-500",
}
const statusColors: Record<string, string> = {
  TODO: "bg-zinc-100 text-zinc-700", IN_PROGRESS: "bg-amber-100 text-amber-700",
  IN_REVIEW: "bg-purple-100 text-purple-700", DONE: "bg-green-100 text-green-700", CANCELLED: "bg-red-100 text-red-700",
}

/**
 * getInitials — инициалы для аватара или "?".
 * @param name — имя или null
 * @returns инициалы
 */
function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

interface Props {
  tasks: Task[]
  users: User[]
  milestones: Milestone[]
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

/**
 * ListView — список задач с группировкой и быстрым переключением статуса.
 *
 * Шаги:
 * 1. Выбор группировки через Select (None, Assignee, Priority, Due Date).
 * 2. Группировка через useMemo.
 * 3. Каждая группа отображается с заголовком и количеством.
 * 4. Чекбокс переключает статус DONE/TODO через updateTask.
 * 5. Вехи (milestones) выделяются пунктирной границей.
 *
 * Побочные эффекты: toast, onRefresh().
 *
 * @param tasks — задачи
 * @param users — пользователи
 * @param milestones — вехи
 * @param onTaskClick — клик по задаче
 * @param onRefresh — обновление
 * @returns JSX — список
 */
export function ListView({ tasks, users, milestones, onTaskClick, onRefresh }: Props) {
  const [groupBy, setGroupBy] = useState<string>("none")

  const grouped = useMemo(() => {
    if (groupBy === "none") return { "All Tasks": tasks }

    const map: Record<string, Task[]> = {}
    tasks.forEach((t: Task) => {
      let key = "Other"
      if (groupBy === "assignee") key = t.assignee?.name || t("Unassigned")
      else if (groupBy === "priority") key = t.priority || "MEDIUM"
      else if (groupBy === "dueDate") {
        if (!t.dueDate) key = t("No due date")
        else key = format(new Date(t.dueDate), "MMM d, yyyy")
      }
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [tasks, groupBy])

  async function handleStatusChange(taskId: string, status: string) {
    const fd = new FormData()
    fd.set("status", status)
    const result = await updateTask(taskId, fd)
    if (result.error) { toast.error(t("Failed to update")); return }
    toast.success(t("Task updated"))
    onRefresh()
  }

  function renderGroup(groupName: string, items: Task[]) {
    const isMilestoneGroup = milestones.some((m: Milestone) => m.title === groupName)
    return (
      <div key={groupName} className="space-y-1">
        <div className={cn(
          "flex items-center gap-2 py-2 px-1",
          isMilestoneGroup && "border-t-2 border-dashed border-primary/30 pt-4"
        )}>
          {isMilestoneGroup && <Flag className="h-4 w-4 text-primary" />}
          <h3 className="text-sm font-medium text-muted-foreground">{groupName}</h3>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <div className="rounded-md border">
          {items.map((task) => (
            <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-muted/50 cursor-pointer"
              onClick={() => onTaskClick(task)}
            >
              <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, task.status === "DONE" ? "TODO" : "DONE") }}>
                {task.status === "DONE" ? <CheckSquare className="h-4 w-4 text-green-500" /> : <Square className="h-4 w-4 text-muted-foreground" />}
              </button>
              <span className={cn("flex-1 text-sm", task.status === "DONE" && "line-through text-muted-foreground")}>{task.title}</span>
              <span className={cn("h-2 w-2 rounded-full", priorityColors[task.priority] || "bg-gray-300")} />
              {task.assignee && (
                <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{getInitials(task.assignee.name)}</AvatarFallback></Avatar>
              )}
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors[task.status] || ""}`}>
                {translateStatus(task.status)}
              </span>
              {task.dueDate && (
                <span className={cn("text-xs", new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "text-red-500" : "text-muted-foreground")}>
                  {format(new Date(task.dueDate), "MMM d")}
                </span>
              )}
              {task.estimatedHours > 0 && (
                <span className="text-xs text-muted-foreground">{Number(task.estimatedHours).toFixed(1)}h</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("Group by:")}</span>
        <Select value={groupBy} onValueChange={(v) => setGroupBy(v || "none")}>
          <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("None")}</SelectItem>
            <SelectItem value="assignee">{t("Assignee")}</SelectItem>
            <SelectItem value="priority">{t("Priority")}</SelectItem>
            <SelectItem value="dueDate">{t("Due Date")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([group, items]) => renderGroup(group, items))}
        {tasks.length === 0 && <p className="text-center py-12 text-muted-foreground">{t("No tasks yet")}</p>}
      </div>
    </div>
  )
}
