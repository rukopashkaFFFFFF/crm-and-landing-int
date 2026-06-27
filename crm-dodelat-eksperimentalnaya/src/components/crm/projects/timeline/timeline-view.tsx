"use client"

/**
 * TimelineView — временная шкала (Gantt-диаграмма) задач и вех проекта.
 *
 * Вкладка: Timeline в ProjectWorkspace.
 * Отображает задачи в виде горизонтальных полос на шкале дней/недель.
 * Вехи отображаются в виде флажков. Поддерживает масштабирование
 * (неделя/месяц) и автопрокрутку к сегодняшнему дню.
 *
 * @param {Object} props
 * @param {Task[]} props.tasks — задачи с startDate/dueDate
 * @param {Milestone[]} props.milestones — вехи с dueDate
 * @param {User[]} props.users — пользователи (для цвета полос)
 * @param {string|null} props.projectStart — дата начала проекта
 * @param {string|null} props.projectEnd — дата окончания проекта
 *
 * Состояния:
 * - zoom: "week" | "month"
 * - Автопрокрутка к сегодняшнему дню
 * - Пустой таймлайн (если нет задач)
 */

import { useState, useMemo, useRef, useEffect } from "react"
import { format, differenceInDays, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { t } from "@/lib/translations"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Flag } from "lucide-react"

type Task = any
type User = { id: string; name: string | null; image: string | null }
type Milestone = any

const ASSIGNEE_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-rose-500",
  "bg-amber-500", "bg-cyan-500", "bg-pink-500", "bg-lime-500",
]

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
  milestones: Milestone[]
  users: User[]
  projectStart: string | null
  projectEnd: string | null
}

/**
 * TimelineView — Gantt-диаграмма проекта.
 *
 * Шаги:
 * 1. Вычисление границ таймлайна (от самой ранней до самой поздней даты).
 * 2. Генерация массива дней и недель.
 * 3. Рендер заголовка шкалы (недели или месяцы).
 * 4. Для каждой задачи — полоса с позицией и шириной по дням.
 * 5. Вехи — флажки в соответствующие даты.
 * 6. Красная вертикальная линия "сегодня".
 * 7. Автопрокрутка к сегодняшнему дню при монтировании.
 * 8. Кнопка переключения zoom (неделя/месяц).
 *
 * @param tasks — задачи с датами
 * @param milestones — вехи
 * @param users — пользователи
 * @param projectStart — начало проекта
 * @param projectEnd — конец проекта
 * @returns JSX — таймлайн
 */
export function TimelineView({ tasks, milestones, users, projectStart, projectEnd }: Props) {
  const [zoom, setZoom] = useState<"week" | "month">("week")
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  const timelineStart = useMemo(() => {
    const dates = tasks.filter((t: Task) => t.startDate).map((t: Task) => new Date(t.startDate))
    if (milestones.length) dates.push(...milestones.map((m: Milestone) => new Date(m.dueDate)))
    if (projectStart) dates.push(new Date(projectStart))
    if (dates.length === 0) return startOfMonth(today)
    return startOfWeek(new Date(Math.min(...dates.map((d) => d.getTime()))))
  }, [tasks, milestones, projectStart, today])

  const timelineEnd = useMemo(() => {
    const dates = tasks.filter((t: Task) => t.dueDate).map((t: Task) => new Date(t.dueDate))
    if (projectEnd) dates.push(new Date(projectEnd))
    if (dates.length === 0) return endOfMonth(addDays(today, 30))
    return endOfWeek(new Date(Math.max(...dates.map((d) => d.getTime()))))
  }, [tasks, projectEnd, today])

  const totalDays = differenceInDays(timelineEnd, timelineStart) + 1
  const dayWidth = zoom === "week" ? 28 : 14

  const days = useMemo(() => {
    const arr = []
    for (let i = 0; i < totalDays; i++) arr.push(addDays(timelineStart, i))
    return arr
  }, [timelineStart, totalDays])

  const todayOffset = differenceInDays(today, timelineStart)

  function getBarStyle(task: Task) {
    const start = task.startDate ? new Date(task.startDate) : timelineStart
    const end = task.dueDate || addDays(start, 7)
    const left = differenceInDays(start, timelineStart)
    const width = Math.max(differenceInDays(end, start) + 1, 1)
    return { left: left * dayWidth, width: width * dayWidth }
  }

  function getMilestoneStyle(m: Milestone) {
    if (!m.dueDate) return { left: 0 }
    const left = differenceInDays(new Date(m.dueDate), timelineStart)
    return { left: left * dayWidth }
  }

  useEffect(() => {
    if (scrollRef.current && todayOffset > 0) {
      scrollRef.current.scrollLeft = (todayOffset - 3) * dayWidth
    }
  }, [dayWidth, todayOffset])

  const weeks = useMemo(() => {
    const arr = []
    let d = timelineStart
    while (d <= timelineEnd) {
      arr.push(d)
      d = addDays(d, 7)
    }
    return arr
  }, [timelineStart, timelineEnd])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(zoom === "week" ? "month" : "week")}>
            {zoom === "week" ? <ZoomOut className="mr-1 h-4 w-4" /> : <ZoomIn className="mr-1 h-4 w-4" />}
            {zoom === "week" ? t("Month") : t("Week")}
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto" ref={scrollRef}>
          <div className="min-w-full" style={{ width: totalDays * dayWidth + 200 }}>
            <div className="flex border-b" style={{ marginLeft: 200 }}>
              {zoom === "week" ? (
                weeks.map((w, i) => (
                  <div key={i} className="flex" style={{ width: dayWidth * 7 }}>
                    <div className="text-[10px] text-muted-foreground px-1 py-1 border-r font-medium">
                      {format(w, "MMM d")}
                    </div>
                  </div>
                ))
              ) : (
                days.filter((d) => d.getDate() === 1).map((d, i) => (
                  <div key={i} className="text-[10px] text-muted-foreground px-1 py-1 border-r font-medium"
                    style={{ width: dayWidth * differenceInDays(endOfMonth(d), d) + dayWidth }}>
                    {format(d, "MMM yyyy")}
                  </div>
                ))
              )}
            </div>

            <div className="relative" style={{ marginLeft: 200, minHeight: 20 }}>
              {days.map((d, i) => (
                <div key={i} className={cn(
                  "absolute top-0 bottom-0 border-r",
                  d.getDay() === 0 || d.getDay() === 6 ? "bg-muted/20" : "",
                  format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") ? "bg-blue-100/50 dark:bg-blue-900/20" : ""
                )} style={{ left: i * dayWidth, width: dayWidth }} />
              ))}
              {todayOffset >= 0 && todayOffset < totalDays && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: todayOffset * dayWidth }} />
              )}
            </div>

            <div className="divide-y">
              {tasks.map((task: Task) => {
                const style = getBarStyle(task)
                const userColor = ASSIGNEE_COLORS[users.findIndex((u) => u.id === task.assigneeId) % ASSIGNEE_COLORS.length]
                return (
                  <div key={task.id} className="flex items-center h-8 relative hover:bg-muted/30">
                    <div className="absolute left-0 flex items-center gap-2 px-2 w-[200px] -ml-[200px] h-full">
                      <span className="text-xs truncate">{task.title}</span>
                    </div>
                    <div className={cn(
                      "absolute h-6 rounded-md flex items-center px-2 text-[10px] text-white truncate",
                      task.status === "DONE" ? "bg-green-500" : userColor
                    )} style={{ left: style.left, width: Math.max(style.width, 20) }}>
                      {task.assignee && getInitials(task.assignee.name)}
                    </div>
                  </div>
                )
              })}
              {milestones.map((m: Milestone) => {
                const style = getMilestoneStyle(m)
                return (
                  <div key={m.id} className="flex items-center h-6 relative hover:bg-muted/30">
                    <div className="absolute left-0 flex items-center gap-2 px-2 w-[200px] -ml-[200px] h-full">
                      <span className="text-xs truncate text-primary font-medium">{m.title}</span>
                    </div>
                    <div className="absolute -translate-x-1/2" style={{ left: style.left }}>
                      <Flag className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
