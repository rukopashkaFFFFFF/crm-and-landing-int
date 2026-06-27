"use client"

/**
 * TaskTimer — инлайн-таймер учёта времени для задачи.
 *
 * Используется в TaskDetailPanel (TaskEditForm).
 * Позволяет запустить/остановить таймер. Данные хранятся в localStorage.
 * При остановке вызывает onStop(hours) для логирования времени.
 *
 * @param {Object} props
 * @param {string} props.taskId — ID задачи
 * @param {string} props.taskTitle — название задачи (для хранения)
 * @param {(hours: number) => void} props.onStop — колбэк с часами
 *
 * Состояния:
 * - elapsed: прошедшие часы (обновляется каждую секунду)
 * - active: активный таймер (из localStorage)
 * - Stopped: отображает кнопку Play
 * - Running: отображает время и кнопку Stop
 */

import { useState, useEffect, useCallback } from "react"
import { Play, Square, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { t } from "@/lib/translations"

const TIMER_KEY_PREFIX = "crm_timer_"

interface ActiveTimer {
  taskId: string
  taskTitle: string
  startedAt: string
}

interface Props {
  taskId: string
  taskTitle: string
  onStop: (hours: number) => void
}

/**
 * TaskTimer — таймер для задачи с localStorage.
 *
 * Шаги:
 * 1. При монтировании проверяет localStorage на наличие активного таймера.
 * 2. Если таймер активен — запускает интервал обновления elapsed (1с).
 * 3. Start: сохраняет таймер в localStorage + устанавливает active.
 * 4. Stop: удаляет из localStorage + вызывает onStop(hours).
 * 5. formatElapsed: форматирует часы в HH:MM:SS.
 *
 * @param taskId — ID задачи
 * @param taskTitle — название задачи
 * @param onStop — колбэк с количеством часов
 * @returns JSX — кнопка Play/Stop с таймером
 */
export function TaskTimer({ taskId, taskTitle, onStop }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [active, setActive] = useState<ActiveTimer | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(TIMER_KEY_PREFIX + taskId)
    if (stored) {
      try {
        const t: ActiveTimer = JSON.parse(stored)
        setActive(t)
        const started = new Date(t.startedAt).getTime()
        setElapsed((Date.now() - started) / 3600000)
      } catch { localStorage.removeItem(TIMER_KEY_PREFIX + taskId) }
    }
  }, [taskId])

  useEffect(() => {
    if (!active) { setElapsed(0); return }
    const interval = setInterval(() => {
      const started = new Date(active.startedAt).getTime()
      setElapsed((Date.now() - started) / 3600000)
    }, 1000)
    return () => clearInterval(interval)
  }, [active])

  function handleStart() {
    const timer: ActiveTimer = { taskId, taskTitle, startedAt: new Date().toISOString() }
    localStorage.setItem(TIMER_KEY_PREFIX + taskId, JSON.stringify(timer))
    setActive(timer)
    setElapsed(0)
    toast.success(t("Timer started"))
  }

  function handleStop() {
    localStorage.removeItem(TIMER_KEY_PREFIX + taskId)
    const hours = Math.round(elapsed * 100) / 100
    setActive(null)
    setElapsed(0)
    onStop(hours)
    toast.success(t("Logged {n}h", { n: hours.toFixed(2) }))
  }

  const formatElapsed = () => {
    const h = Math.floor(elapsed)
    const m = Math.floor((elapsed - h) * 60)
    const s = Math.floor(((elapsed - h) * 60 - m) * 60)
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex items-center gap-2">
      {active ? (
        <>
          <span className="text-sm font-mono tabular-nums text-green-600">{formatElapsed()}</span>
          <Button size="sm" variant="outline" onClick={handleStop}>
            <Square className="mr-1 h-3 w-3" /> {t("Stop")}
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={handleStart}>
          <Play className="mr-1 h-3 w-3" /> {t("Track Time")}
        </Button>
      )}
    </div>
  )
}
