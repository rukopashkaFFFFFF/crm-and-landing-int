"use client"

/**
 * TeamWorkload — страница загрузки команды.
 *
 * Страница: /dashboard/team.
 * Отображает карточки участников с утилизацией (загруженность),
 * количеством задач, часами, ставкой. При клике открывается диалог
 * с детализацией: задачи и записи времени за месяц.
 *
 * @param {Object} props
 * @param {User[]} props.users — пользователи с timeEntries и assignedTasks
 * @param {Project[]} props.projects — проекты
 *
 * Состояния:
 * - selectedUser: выбранный пользователь (Dialog)
 * - Расчёт utilization, overloaded, warning для каждого
 * - Empty states: "No active tasks", пустой список timeEntries
 */

import { useState } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { t, translateEnum } from "@/lib/translations"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type User = {
  id: string
  name: string | null
  email: string
  role: string
  hourlyRate: number
  capacityHours: number
  image: string | null
  timeEntries: { id: string; hours: number; billable: boolean; taskId: string; date: string; description: string | null }[]
  assignedTasks: { id: string; title: string; estimatedHours: number; priority: string; dueDate: string | null; projectId: string }[]
}

type Project = { id: string; name: string }

function getInitials(name?: string | null) { return (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) }

interface Props { users: User[]; projects: Project[] }

/**
 * TeamWorkload — загрузка команды.
 *
 * Шаги:
 * 1. Для каждого пользователя: расчёт totalHours, billableHours, utilization.
 * 2. Карточка: аватар, имя, роль, количество задач, часы, ставка.
 * 3. Прогресс-бар утилизации (красный >100%, жёлтый >80%, зелёный).
 * 4. Клик по карточке -> Dialog с задачами и timeEntries.
 *
 * @param users — пользователи
 * @param projects — проекты
 * @returns JSX — страница загрузки
 */
export function TeamWorkload({ users, projects }: Props) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("Team Workload")}</h1>

      <div className="space-y-4">
        {users.map((user) => {
          const totalHours = user.timeEntries.reduce((s, e) => s + Number(e.hours), 0)
          const billableHours = user.timeEntries.filter((e) => e.billable).reduce((s, e) => s + Number(e.hours), 0)
          const capacity = Number(user.capacityHours)
          const utilization = capacity > 0 ? Math.round((totalHours / capacity) * 100) : 0
          const overloaded = utilization > 100
          const warning = utilization > 80 && utilization <= 100

          return (
            <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedUser(user)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{user.name || t("Unnamed")}</p>
                      <Badge variant="outline" className="text-[10px]">{translateEnum("Role", user.role)}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{t("{n} tasks", { n: user.assignedTasks.length })}</span>
                      <span>{t("{n}h logged", { n: totalHours.toFixed(1) })}</span>
                      <span>{t("${n}/hr", { n: Number(user.hourlyRate).toFixed(2) })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={cn(
                          "h-full rounded-full transition-all",
                          overloaded ? "bg-red-500" : warning ? "bg-amber-500" : "bg-green-500"
                        )} style={{ width: `${Math.min(utilization, 100)}%` }} />
                      </div>
                      <span className={cn(
                        "text-sm font-bold", overloaded ? "text-red-500" : warning ? "text-amber-500" : "text-green-600"
                      )}>{utilization}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("{n}h / {n}h capacity", { n: totalHours.toFixed(1), n2: capacity })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("{name} — Tasks", { name: selectedUser?.name || "" })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedUser?.assignedTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Est: {n}h", { n: Number(task.estimatedHours).toFixed(1) })} · {task.dueDate ? `${t("Due {date}", { date: format(new Date(task.dueDate), "MMM d") })}` : t("No due date")}
                  </p>
                </div>
                <Badge className={
                  task.priority === "URGENT" ? "bg-red-500" : task.priority === "HIGH" ? "bg-orange-500" : task.priority === "MEDIUM" ? "bg-yellow-500" : "bg-green-500"
                }>{translateEnum("TaskPriority", task.priority)}</Badge>
              </div>
            ))}
            {(!selectedUser?.assignedTasks || selectedUser.assignedTasks.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("No active tasks")}</p>
            )}

            <Separator />
            <h3 className="font-semibold text-sm">{t("Time Entries This Month")}</h3>
            {selectedUser?.timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm border-b pb-1">
                <span className="text-muted-foreground">{entry.description || format(new Date(entry.date), "MMM d")}</span>
                <span className="font-medium">{Number(entry.hours).toFixed(1)}h {!entry.billable && <Badge variant="outline" className="text-[10px]">{t("NB")}</Badge>}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
