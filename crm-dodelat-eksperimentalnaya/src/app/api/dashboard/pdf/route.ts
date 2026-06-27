/**
 * @file API-маршрут генерации HTML-отчёта дашборда (для печати/PDF).
 *
 * @description Формирует HTML-страницу с KPI-панелью дашборда:
 * - Количество активных проектов.
 * - Выручка за текущий месяц.
 * - Просроченные задачи текущего пользователя.
 * - Общая стоимость активных лидов (воронка продаж).
 * - Список "Мои задачи" (до 5).
 * - Последние клиенты (до 5).
 * - Предстоящие дедлайны на 7 дней (до 5).
 *
 * @route GET /api/dashboard/pdf
 * @exports GET — асинхронный обработчик.
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { format, formatDistanceToNow } from "date-fns"

/**
 * Генерирует HTML-отчёт с данными дашборда для печати.
 *
 * @returns {Promise<NextResponse>}
 * - 200: HTML-страница (Content-Type: text/html).
 * - 401: { error } — не аутентифицирован.
 *
 * @sideeffect
 * - Выполняет 7 параллельных запросов к БД (aggregate, findMany, count).
 * - Формирует HTML с встроенными CSS-стилями для печати.
 */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const [activeProjects, revenueAgg, overdueTasks, leadAgg, myTasks, recentClients, upcomingDeadlines] = await Promise.all([
    db.project.count({ where: { status: "IN_PROGRESS" } }),
    db.invoice.aggregate({ where: { paidAt: { gte: firstOfMonth }, status: "PAID" }, _sum: { total: true } }),
    db.task.count({ where: { assigneeId: session.user.id, status: { notIn: ["DONE", "CANCELLED"] }, dueDate: { lt: now } } }),
    db.lead.aggregate({ where: { stage: { in: ["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATION"] } }, _sum: { value: true } }),
    db.task.findMany({ where: { assigneeId: session.user.id, status: { notIn: ["DONE", "CANCELLED"] } }, include: { project: { select: { name: true } } }, orderBy: { dueDate: "asc" }, take: 5 }),
    db.client.findMany({ orderBy: { updatedAt: "desc" }, take: 5, select: { name: true, company: true, email: true, status: true, createdAt: true } }),
    db.task.findMany({ where: { dueDate: { gte: now, lte: new Date(now.getTime() + 7 * 86400000) }, status: { notIn: ["DONE", "CANCELLED"] } }, include: { assignee: { select: { name: true } }, project: { select: { name: true } } }, orderBy: { dueDate: "asc" }, take: 5 }),
  ])

  const tasksHtml = myTasks.map((t: any) => `
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:6px 0;">${t.title}</td>
      <td style="padding:6px 0;">${t.project.name}</td>
      <td style="padding:6px 0;">${t.dueDate ? formatDistanceToNow(new Date(t.dueDate), { addSuffix: true }) : "—"}</td>
      <td style="padding:6px 0;">${t.status.replace("_", " ")}</td>
    </tr>
  `).join("")

  const clientsHtml = recentClients.map((c: any) => `
    <tr style="border-bottom:1px solid #eee;">
      <td style="padding:6px 0;">${c.name}</td>
      <td style="padding:6px 0;">${c.company || "—"}</td>
      <td style="padding:6px 0;">${c.status}</td>
      <td style="padding:6px 0;">${format(new Date(c.createdAt), "MMM d, yyyy")}</td>
    </tr>
  `).join("")

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Dashboard Report</title>
<style>
  @page { margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; font-size: 12px; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #000; }
  .header h1 { font-size: 24px; }
  .header .date { color: #666; font-size: 11px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .kpi-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
  .kpi-card .value { font-size: 22px; font-weight: 700; }
  .kpi-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 14px; font-weight: 600; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #ddd; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; color: #666; padding: 6px 0; border-bottom: 2px solid #000; }
  td { padding: 6px 0; }
  .footer { text-align: center; padding-top: 24px; border-top: 1px solid #ddd; color: #999; font-size: 10px; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>Dashboard Report</h1>
      <p class="date">Generated ${format(now, "MMMM d, yyyy 'at' h:mm a")} | Agency CRM</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card"><div class="label">Active Projects</div><div class="value">${activeProjects}</div></div>
    <div class="kpi-card"><div class="label">Revenue This Month</div><div class="value">$${Number(revenueAgg._sum.total || 0).toLocaleString()}</div></div>
    <div class="kpi-card"><div class="label">Overdue Tasks</div><div class="value">${overdueTasks}</div></div>
    <div class="kpi-card"><div class="label">Pipeline Value</div><div class="value">$${Number(leadAgg._sum.value || 0).toLocaleString()}</div></div>
  </div>

  <div class="section">
    <h2>My Tasks</h2>
    <table>${myTasks.length > 0 ? `<thead><tr><th>Title</th><th>Project</th><th>Due</th><th>Status</th></tr></thead><tbody>${tasksHtml}</tbody>` : '<p style="color:#888;">No pending tasks</p>'}</table>
  </div>

  <div class="section">
    <h2>Recent Clients</h2>
    <table>${clientsHtml.length > 0 ? `<thead><tr><th>Name</th><th>Company</th><th>Status</th><th>Created</th></tr></thead><tbody>${clientsHtml}</tbody>` : '<p style="color:#888;">No clients yet</p>'}</table>
  </div>

  <div class="section">
    <h2>Upcoming Deadlines (7 days)</h2>
    ${upcomingDeadlines.length > 0 ? upcomingDeadlines.map((t: any) => `<p style="padding:4px 0;">• <strong>${t.title}</strong> — ${t.project.name} (due ${t.dueDate ? format(new Date(t.dueDate), "MMM d") : "—"})${t.assignee ? ` — ${t.assignee.name}` : ""}</p>`).join("") : '<p style="color:#888;">No upcoming deadlines</p>'}
  </div>

  <div class="footer">
    <p>Agency CRM — Web Development Agency</p>
  </div>
</body></html>`

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
