"use client"

/**
 * TaskDetailPanel — боковая панель детального просмотра/редактирования задачи.
 *
 * Открывается из BoardView, ListView, TasksPageClient.
 * Содержит табы: Details (форма редактирования), Subtasks, Comments, Time.
 * Включает встроенный таймер учёта времени.
 *
 * @param {Object} props
 * @param {Task|null} props.task — выбранная задача (null = закрыто)
 * @param {() => void} props.onClose — закрыть панель
 * @param {User[]} props.users — пользователи (для назначения)
 * @param {() => void} props.onUpdated — колбэк после обновления
 *
 * Server actions: updateTask, deleteTask, logTime.
 *
 * Состояния:
 * - open: boolean (синхронизирован с task)
 * - tab: "details" | "subtasks" | "comments" | "time"
 */

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { format } from "date-fns"
import { X, Loader2, Clock, MessageSquare, ListChecks, Play, Square } from "lucide-react"

import { updateTask, deleteTask, logTime } from "@/lib/actions/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { TaskSubtasks } from "./task-subtasks"
import { TaskComments } from "./task-comments"
import { TaskTimeLog } from "./task-time-log"

import { TaskTimer } from "@/components/crm/time/task-timer"
import { t, translateStatus } from "@/lib/translations"

type Task = any
type User = { id: string; name: string | null; image: string | null }

const priorityColors: Record<string, string> = {
  URGENT: "bg-red-500", HIGH: "bg-orange-500", MEDIUM: "bg-yellow-500", LOW: "bg-green-500",
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
  task: Task | null
  onClose: () => void
  users: User[]
  onUpdated: () => void
}

/**
 * TaskDetailPanel — боковая панель задачи с табами.
 *
 * Шаги:
 * 1. При task (не null) открывается панель справа.
 * 2. Хедер: приоритет (цветная точка), заголовок, кнопка закрытия.
 * 3. Табы: Details, Subtasks, Comments, Time.
 * 4. Details: TaskEditForm (поля title, description, status, priority, assignee и т.д.).
 * 5. Внизу: таймер + кнопка Save Changes.
 * 6. Закрытие: setOpen(false) -> useEffect(onClose).
 *
 * @param task — задача или null
 * @param onClose — закрыть
 * @param users — пользователи
 * @param onUpdated — обновить родителя
 * @returns JSX — панель или null
 */
export function TaskDetailPanel({ task, onClose, users, onUpdated }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState("details")

  useEffect(() => { setOpen(!!task) }, [task])
  useEffect(() => { if (!open) onClose() }, [open, onClose])

  if (!task) return null

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-xl bg-background shadow-xl border-l h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-full", priorityColors[task.priority])} />
                <h2 className="font-semibold">{task.title}</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="p-4">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1"><ListChecks className="mr-1 h-4 w-4" />{t("Details")}</TabsTrigger>
                <TabsTrigger value="subtasks" className="flex-1"><ListChecks className="mr-1 h-4 w-4" />{t("Subtasks")}</TabsTrigger>
                <TabsTrigger value="comments" className="flex-1"><MessageSquare className="mr-1 h-4 w-4" />{t("Comments")}</TabsTrigger>
                <TabsTrigger value="time" className="flex-1"><Clock className="mr-1 h-4 w-4" />{t("Time")}</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <TaskEditForm task={task} users={users} onUpdated={onUpdated} />
              </TabsContent>

              <TabsContent value="subtasks" className="mt-4">
                <TaskSubtasks taskId={task.id} subtasks={task.subtasks || []} onUpdated={onUpdated} />
              </TabsContent>

              <TabsContent value="comments" className="mt-4">
                <TaskComments taskId={task.id} />
              </TabsContent>

              <TabsContent value="time" className="mt-4">
                <TaskTimeLog taskId={task.id} timeEntries={task.timeEntries || []} onUpdated={onUpdated} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </>
  )
}

function cn(...classes: any[]) { return classes.filter(Boolean).join(" ") }

/**
 * TaskEditForm — форма редактирования полей задачи.
 *
 * @param task — текущая задача (defaults для формы)
 * @param users — пользователи для Select Assignee
 * @param onUpdated — колбэк после сохранения
 * @returns JSX — форма
 */
function TaskEditForm({ task, users, onUpdated }: { task: Task; users: User[]; onUpdated: () => void }) {
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: {
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId || "",
      dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
      estimatedHours: Number(task.estimatedHours),
    },
  })

  async function onSubmit(data: any) {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.set(k, String(v)) })
    const result = await updateTask(task.id, fd)
    if (result.error) { toast.error(t("Failed to update")); return }
    toast.success(t("Task updated")); onUpdated()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("Title")}</Label>
        <Input {...register("title")} />
      </div>
      <div className="space-y-2">
        <Label>{t("Description")}</Label>
        <Textarea {...register("description")} rows={4} placeholder={t("Add description...")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("Status")}</Label>
          <Select defaultValue={task.status} onValueChange={(v) => setValue("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"].map((s) => (
                <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("Priority")}</Label>
          <Select defaultValue={task.priority} onValueChange={(v) => setValue("priority", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["LOW", "MEDIUM", "HIGH", "URGENT"].map((s) => (
                <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("Assignee")}</Label>
          <Select defaultValue={task.assigneeId || ""} onValueChange={(v) => setValue("assigneeId", v)}>
            <SelectTrigger><SelectValue placeholder={t("Unassigned")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("Unassigned")}</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("Due Date")}</Label>
          <Input type="date" {...register("dueDate")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("Estimated Hours")}</Label>
        <Input type="number" step="0.5" {...register("estimatedHours")} />
      </div>
      <div className="flex items-center justify-between">
        <TaskTimer taskId={task.id} taskTitle={task.title} onStop={(hours) => {
          const fd = new FormData()
          fd.set("taskId", task.id)
          fd.set("hours", String(hours))
          fd.set("description", "")
          fd.set("billable", "true")
          fd.set("date", new Date().toISOString().split("T")[0])
          logTime(fd).then(() => onUpdated())
        }} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Save Changes")}
        </Button>
      </div>
    </form>
  )
}
