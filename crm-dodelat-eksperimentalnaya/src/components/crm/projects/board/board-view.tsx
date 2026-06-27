"use client"

/**
 * BoardView — Kanban-доска задач проекта с Drag & Drop.
 *
 * Вкладка: Board в ProjectWorkspace.
 * Отображает задачи по колонкам: TODO, IN_PROGRESS, IN_REVIEW, DONE.
 * Поддерживает перетаскивание карточек и быстрое добавление задач.
 *
 * @param {Object} props
 * @param {Task[]} props.tasks — задачи проекта
 * @param {string} props.projectId — ID проекта (для новых задач)
 * @param {User[]} props.users — пользователи (для назначения)
 * @param {(task: Task) => void} props.onTaskClick — открыть детали задачи
 * @param {() => void} props.onRefresh — обновить данные
 *
 * Server actions: moveTask, createTask.
 *
 * Состояния:
 * - activeTask: перетаскиваемая задача (DragOverlay)
 * - Grouping задач по статусу через useMemo
 */

import { useState, useMemo } from "react"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { moveTask, createTask } from "@/lib/actions/tasks"
import { t, translateStatus } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { BoardColumn } from "./board-column"
import { TaskCard } from "./task-card"

type Task = any
type User = { id: string; name: string | null; image: string | null }

const COLUMNS = [
  { key: "TODO" },
  { key: "IN_PROGRESS" },
  { key: "IN_REVIEW" },
  { key: "DONE" },
]

interface Props {
  tasks: Task[]
  projectId: string
  users: User[]
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

/**
 * BoardView — доска задач Kanban с DnD и быстрым добавлением.
 *
 * Шаги:
 * 1. Группировка задач по статусу (useMemo).
 * 2. DndContext с PointerSensor (8px активация).
 * 3. DragStart — сохранение activeTask для DragOverlay.
 * 4. DragEnd — вызов moveTask (если колонка изменилась).
 * 5. QuickAddButton внутри каждой колонки.
 * 6. DragOverlay показывает карточку с opacity + rotate.
 *
 * Побочные эффекты: toast, onRefresh().
 *
 * @param tasks — задачи
 * @param projectId — ID проекта
 * @param users — пользователи
 * @param onTaskClick — клик по задаче
 * @param onRefresh — обновление
 * @returns JSX — доска
 */
export function BoardView({ tasks, projectId, users, onTaskClick, onRefresh }: Props) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {}
    COLUMNS.forEach((c) => {
      map[c.key] = tasks.filter((t: Task) => t.status === c.key)
        .sort((a: Task, b: Task) => a.position - b.position)
    })
    return map
  }, [tasks])

  function handleDragStart(event: DragStartEvent) {
    const t = tasks.find((tk: Task) => tk.id === event.active.id)
    if (t) setActiveTask(t)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const targetColumn = over.id as string
    const task = tasks.find((t: Task) => t.id === taskId)
    if (!task || task.status === targetColumn) return

    const result = await moveTask(taskId, targetColumn)
    if (result.error) { toast.error(t("Failed to move task")); return }
    toast.success(t("Task moved"))
    onRefresh()
  }

  async function handleQuickAdd(columnKey: string, title: string) {
    const fd = new FormData()
    fd.set("projectId", projectId)
    fd.set("title", title)
    fd.set("status", columnKey)
    const result = await createTask(fd)
    if (result.error) { toast.error(t("Failed to create task")); return }
    toast.success(t("Task created"))
    onRefresh()
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = grouped[col.key] || []
          return (
            <BoardColumn key={col.key} id={col.key} label={translateStatus(col.key)} count={items.length}>
              <SortableContext items={items.map((t: Task) => t.id)} strategy={verticalListSortingStrategy}>
                {items.map((task: Task) => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
              </SortableContext>
              <QuickAddButton onAdd={(title) => handleQuickAdd(col.key, title)} />
            </BoardColumn>
          )
        })}
      </div>
      <DragOverlay>
        {activeTask && <div className="opacity-90 rotate-2"><TaskCard task={activeTask} onClick={() => {}} /></div>}
      </DragOverlay>
    </DndContext>
  )
}

/**
 * QuickAddButton — инлайн-форма для быстрого добавления задачи в колонку.
 * @param onAdd — колбэк с заголовком задачи
 * @returns JSX — кнопка "+" или input для ввода
 */
function QuickAddButton({ onAdd }: { onAdd: (title: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState("")

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 mt-2 w-full rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors">
        <Plus className="h-3.5 w-3.5" /> {t("Add task")}
      </button>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) { onAdd(value.trim()); setValue(""); setEditing(false) } }} className="mt-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { if (!value) setEditing(false) }}
        placeholder={t("Task title...")}
        className="w-full rounded-md border px-2 py-1.5 text-sm bg-background outline-none"
      />
    </form>
  )
}
