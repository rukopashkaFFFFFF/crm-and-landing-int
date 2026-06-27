"use client"

/**
 * TaskCard — карточка задачи на Kanban-доске проекта.
 *
 * Отображает заголовок, приоритет (цветная точка), исполнителя (аватар),
 * дату завершения, прогресс подзадач.
 *
 * Поддерживает drag & drop через @dnd-kit (useSortable).
 *
 * @param {Object} props
 * @param {Task} props.task — объект задачи (title, priority, assignee, dueDate, subtasks)
 * @param {() => void} props.onClick — открыть детальную панель задачи
 *
 * Состояния: isDragging (прозрачность при перетаскивании).
 */

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { t } from "@/lib/translations"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

type Task = any

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

interface Props { task: Task; onClick: () => void }

/**
 * TaskCard — сортируемая карточка задачи.
 *
 * Шаги:
 * 1. useSortable подключает DnD (setNodeRef, listeners, transform).
 * 2. Отображает приоритет (цветная точка слева).
 * 3. Исполнитель (аватар), дата дедлайна (красным, если просрочена).
 * 4. Прогресс подзадач (done/total).
 * 5. При isDragging — opacity 50% + тень.
 *
 * @param task — задача
 * @param onClick — открытие деталей
 * @returns JSX — карточка
 */
export function TaskCard({ task, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  const subtaskTotal = task.subtasks?.length || 0
  const subtaskDone = task.subtasks?.filter((s: any) => s.status === "DONE").length || 0

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md space-y-2",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", priorityColors[task.priority] || "bg-gray-300")} />
        <p className="text-sm font-medium leading-tight flex-1">{task.title}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assignee && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[9px]">{getInitials(task.assignee.name)}</AvatarFallback>
            </Avatar>
          )}
        </div>
        {task.dueDate && (
          <span className={cn("text-[10px]", new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "text-red-500 font-medium" : "text-muted-foreground")}>
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}
      </div>

      {subtaskTotal > 0 && (
        <p className="text-[10px] text-muted-foreground">{subtaskDone}/{subtaskTotal} {t("subtasks")}</p>
      )}
    </div>
  )
}
