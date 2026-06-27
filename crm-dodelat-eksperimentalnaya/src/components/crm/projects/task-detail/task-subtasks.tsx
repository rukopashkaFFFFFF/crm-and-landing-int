"use client"

/**
 * TaskSubtasks — блок подзадач (вложенных задач) в TaskDetailPanel.
 *
 * Позволяет просматривать, добавлять и переключать статус подзадач.
 * Подзадачи — это обычные задачи с parentTaskId.
 *
 * @param {Object} props
 * @param {string} props.taskId — ID родительской задачи
 * @param {Subtask[]} props.subtasks — массив подзадач
 * @param {() => void} props.onUpdated — обновить родительский список
 *
 * Server actions: createTask (с parentTaskId), updateTask (смена статуса).
 *
 * Состояния:
 * - title: новая подзадача (input)
 * - adding: флаг отправки
 * - Empty: если нет подзадач (просто не отображает список)
 */

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Loader2, CheckSquare, Square } from "lucide-react"

import { createTask, updateTask } from "@/lib/actions/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { t } from "@/lib/translations"

type Subtask = { id: string; title: string; status: string }

interface Props { taskId: string; subtasks: Subtask[]; onUpdated: () => void }

/**
 * TaskSubtasks — список подзадач с добавлением и переключением.
 *
 * Шаги:
 * 1. Отображение существующих подзадач с чекбоксами.
 * 2. Чекбокс переключает статус DONE/TODO через updateTask.
 * 3. Input + кнопка Plus для добавления (createTask с parentTaskId).
 * 4. Enter в input также добавляет подзадачу.
 *
 * Побочные эффекты: toast, onUpdated().
 *
 * @param taskId — ID родительской задачи
 * @param subtasks — массив подзадач
 * @param onUpdated — обновить данные
 * @returns JSX — блок подзадач
 */
export function TaskSubtasks({ taskId, subtasks, onUpdated }: Props) {
  const [title, setTitle] = useState("")
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!title.trim()) return
    setAdding(true)
    const fd = new FormData()
    fd.set("projectId", "") // will be set server-side via task lookup
    fd.set("title", title.trim())
    fd.set("parentTaskId", taskId)
    fd.set("status", "TODO")
    const result = await createTask(fd)
    setAdding(false)
    if (result.error) { toast.error(t("Failed to add subtask")); return }
    setTitle("")
    toast.success(t("Subtask added"))
    onUpdated()
  }

  async function handleToggle(subtaskId: string, currentStatus: string) {
    const fd = new FormData()
    fd.set("status", currentStatus === "DONE" ? "TODO" : "DONE")
    const result = await updateTask(subtaskId, fd)
    if (result.error) { toast.error(t("Failed to update")); return }
    onUpdated()
  }

  const done = subtasks.filter((s) => s.status === "DONE").length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t("Subtasks ({done}/{total})", { done, total: subtasks.length })}</p>
      </div>
      <div className="space-y-1">
        {subtasks.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 py-1.5">
            <button onClick={() => handleToggle(sub.id, sub.status)}>
              {sub.status === "DONE" ? <CheckSquare className="h-4 w-4 text-green-500" /> : <Square className="h-4 w-4 text-muted-foreground" />}
            </button>
            <span className={`text-sm ${sub.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>{sub.title}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Add subtask...")} className="h-8 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }} />
        <Button size="sm" variant="ghost" onClick={handleAdd} disabled={adding}>
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  )
}
