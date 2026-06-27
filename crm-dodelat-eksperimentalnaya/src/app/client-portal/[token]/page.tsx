/**
 * @file Страница клиентского портала (Client Portal).
 *
 * @description Отображает внешнюю страницу для клиента, доступную по уникальному токену.
 * Не требует аутентификации — доступна по ссылке из email.
 * Показывает:
 * - Прогресс проекта (процент выполнения задач).
 * - Статус и таймлайн проекта.
 * - Вехи (milestones).
 * - Список задач с исполнителями.
 * - Комментарии (CommentThread в portalMode).
 * - Инвойсы (кроме DRAFT).
 * - Сметы (SENT/ACCEPTED/DECLINED).
 *
 * @route GET /client-portal/[token]
 * @exports ClientPortalPage — серверный компонент.
 */

import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CommentThread } from "@/components/crm/comments/comment-thread"
import { CheckCircle, Clock, Building2 } from "lucide-react"

interface PageProps { params: Promise<{ token: string }> }

const statusColors: Record<string, string> = {
  PLANNING: "bg-blue-100 text-blue-700", IN_PROGRESS: "bg-amber-100 text-amber-700",
  REVIEW: "bg-purple-100 text-purple-700", COMPLETED: "bg-green-100 text-green-700",
  ON_HOLD: "bg-zinc-100 text-zinc-700", CANCELLED: "bg-red-100 text-red-700",
}
const invStatusColors: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700", SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700", OVERDUE: "bg-red-100 text-red-700",
}
const estStatusColors: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700", SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700", DECLINED: "bg-red-100 text-red-700",
}

/**
 * Серверная страница клиентского портала.
 *
 * @param {PageProps} props - params с токеном доступа.
 * @returns {Promise<JSX.Element>} Страница портала с данными проекта.
 *
 * @sideeffect
 * - Проверяет токен в БД (ClientPortalToken).
 * - Проверяет срок действия токена.
 * - Загружает клиента, проект, вехи, задачи, инвойсы, сметы.
 * - Вызывает notFound() если токен недействителен.
 */
export default async function ClientPortalPage({ params }: PageProps) {
  const { token } = await params

  const portalToken = await db.clientPortalToken.findUnique({ where: { token } })
  if (!portalToken || new Date() > portalToken.expiresAt) notFound()

  const [client, project, milestones, tasks, invoices, estimates] = await Promise.all([
    db.client.findUnique({ where: { id: portalToken.clientId } }),
    db.project.findUnique({ where: { id: portalToken.projectId } }),
    db.milestone.findMany({ where: { projectId: portalToken.projectId }, orderBy: { dueDate: "asc" } }),
    db.task.findMany({
      where: { projectId: portalToken.projectId },
      include: { assignee: { select: { id: true, name: true } } },
      orderBy: { position: "asc" },
    }),
    db.invoice.findMany({
      where: { projectId: portalToken.projectId, status: { not: "DRAFT" } },
      orderBy: { createdAt: "desc" },
    }),
    db.estimate.findMany({
      where: { projectId: portalToken.projectId, status: { in: ["SENT" as any, "ACCEPTED" as any, "DECLINED" as any] } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  if (!client || !project) notFound()

  const doneTasks = tasks.filter((t: any) => t.status === "DONE").length
  const totalTasks = tasks.length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="border-b pb-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Agency Name — Client Portal</span>
          </div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground mt-1">Welcome, {client.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="py-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div><p className="text-2xl font-bold">{progress}%</p><p className="text-xs text-muted-foreground">Progress ({doneTasks}/{totalTasks} tasks)</p></div>
          </CardContent></Card>
          <Card><CardContent className="py-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div><p className="text-sm font-medium">Status</p><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${statusColors[project.status] || ""}`}>{project.status?.replace("_", " ")}</span></div>
          </CardContent></Card>
          <Card><CardContent className="py-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-blue-500" />
            <div><p className="text-sm font-medium">Timeline</p><p className="text-xs text-muted-foreground mt-1">{project.startDate ? format(new Date(project.startDate), "MMM d") : "N/A"} — {project.endDate ? format(new Date(project.endDate), "MMM d, yyyy") : "N/A"}</p></div>
          </CardContent></Card>
        </div>

        {milestones.length > 0 && (
          <Card><CardHeader><CardTitle className="text-lg">Milestones</CardTitle></CardHeader>
            <CardContent><div className="space-y-3">{milestones.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <span className="text-sm font-medium">{m.title}</span>
                {m.dueDate && <span className="text-xs text-muted-foreground">{format(new Date(m.dueDate), "MMM d, yyyy")}</span>}
              </div>
            ))}</div></CardContent></Card>
        )}

        {tasks.length > 0 && (
          <Card><CardHeader><CardTitle className="text-lg">Tasks</CardTitle></CardHeader>
            <CardContent><div className="space-y-2">{tasks.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="text-sm font-medium">{task.title}</p>{task.assignee && <p className="text-xs text-muted-foreground">Assigned to: {task.assignee.name}</p>}</div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${task.status === "DONE" ? "bg-green-100 text-green-700" : task.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-700"}`}>
                  {task.status.replace("_", " ")}
                </span>
              </div>
            ))}</div></CardContent></Card>
        )}

        <Card><CardHeader><CardTitle className="text-lg">Comments</CardTitle></CardHeader>
          <CardContent><CommentThread projectId={project.id} portalMode clientName={client.name} /></CardContent>
        </Card>

        {invoices.length > 0 && (
          <Card><CardHeader><CardTitle className="text-lg">Invoices</CardTitle></CardHeader>
            <CardContent><div className="space-y-2">{invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="text-sm font-medium">{inv.number}</p><p className="text-xs text-muted-foreground">${Number(inv.total).toLocaleString()} — Due {inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "N/A"}</p></div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${invStatusColors[inv.status] || ""}`}>{inv.status}</span>
              </div>
            ))}</div></CardContent></Card>
        )}

        {estimates.length > 0 && (
          <Card><CardHeader><CardTitle className="text-lg">Estimates</CardTitle></CardHeader>
            <CardContent><div className="space-y-2">{estimates.map((est: any) => (
              <div key={est.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="text-sm font-medium">Estimate</p><p className="text-xs text-muted-foreground">${Number(est.total).toLocaleString()}</p></div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estStatusColors[est.status] || ""}`}>{est.status}</span>
              </div>
            ))}</div></CardContent></Card>
        )}

        <div className="text-center text-xs text-muted-foreground border-t pt-6">
          Powered by Agency CRM — {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
