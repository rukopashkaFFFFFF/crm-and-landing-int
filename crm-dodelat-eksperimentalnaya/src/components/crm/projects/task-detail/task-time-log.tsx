"use client"

/**
 * TaskTimeLog — блок учёта времени по задаче (в TaskDetailPanel).
 *
 * Позволяет логировать часы с описанием и просматривать историю.
 *
 * @param {Object} props
 * @param {string} props.taskId — ID задачи
 * @param {TimeEntry[]} props.timeEntries — массив записей времени
 * @param {() => void} props.onUpdated — обновить родительский список
 *
 * Server action: logTime (FormData).
 *
 * Состояния:
 * - hours: количество часов (input)
 * - description: описание (input)
 * - submitting: флаг отправки
 * - Empty state: "No time logged yet"
 */

import { useState } from "react"
import { toast } from "sonner"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

import { logTime } from "@/lib/actions/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { t } from "@/lib/translations"

type TimeEntry = { id: string; hours: number; description: string | null; date: string; userId: string; billable: boolean }

interface Props { taskId: string; timeEntries: TimeEntry[]; onUpdated: () => void }

/**
 * TaskTimeLog — форма и список учёта времени.
 *
 * Шаги:
 * 1. Форма с hours (min 0.25), description, billable.
 * 2. Отправка через logTime (FormData).
 * 3. При успехе: тост, сброс полей, onUpdated().
 * 4. Отображение существующих записей с суммой часов.
 *
 * @param taskId — ID задачи
 * @param timeEntries — записи времени
 * @param onUpdated — обновить данные
 * @returns JSX — блок времени
 */
export function TaskTimeLog({ taskId, timeEntries, onUpdated }: Props) {
  const [hours, setHours] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hours || parseFloat(hours) < 0.25) { toast.error(t("Minimum 0.25 hours")); return }
    setSubmitting(true)
    const fd = new FormData()
    fd.set("taskId", taskId)
    fd.set("hours", hours)
    fd.set("description", description)
    fd.set("billable", "true")
    fd.set("date", new Date().toISOString().split("T")[0])
    const result = await logTime(fd)
    setSubmitting(false)
    if (result.error) { toast.error(t("Failed to log time")); return }
    toast.success(t("Time logged"))
    setHours(""); setDescription("")
    onUpdated()
  }

  const totalHours = timeEntries.reduce((sum, e) => sum + Number(e.hours), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t("Time Log")}</p>
        <p className="text-sm text-muted-foreground">{t("Total: {n}h", { n: totalHours.toFixed(1) })}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("Hours")}</Label>
            <Input type="number" step="0.25" min="0.25" max="24" value={hours}
              onChange={(e) => setHours(e.target.value)} placeholder="0" className="h-8" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">{t("Description")}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={t("What did you work on?")} className="h-8" />
          </div>
        </div>
        <Button type="submit" size="sm" disabled={submitting} className="w-full">
          {submitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}{t("Log Time")}
        </Button>
      </form>

      <div className="space-y-1">
        {timeEntries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between py-1.5 text-sm border-b last:border-0">
            <div>
              <span className="font-medium">{Number(entry.hours).toFixed(1)}h</span>
              {entry.description && <span className="text-muted-foreground ml-2">{entry.description}</span>}
            </div>
            <span className="text-xs text-muted-foreground">{format(new Date(entry.date), "MMM d")}</span>
          </div>
        ))}
        {timeEntries.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">{t("No time logged yet")}</p>
        )}
      </div>
    </div>
  )
}
