/**
 * @file API-маршрут генерации HTML-версии инвойса (для печати/PDF).
 *
 * @description Находит инвойс по ID (включая клиента, проект, платежи),
 * парсит lineItems (JSON-строка или объект), формирует HTML-страницу
 * с таблицей позиций, суммой, историей платежей и кнопкой "Download PDF
 * (Print → Save as PDF)" для печати в браузере.
 *
 * @route GET /api/invoices/[id]/pdf
 * @exports GET — асинхронный обработчик.
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { format } from "date-fns"

/**
 * Генерирует HTML для печати инвойса.
 *
 * @param {Request} _request - HTTP-запрос (не используется).
 * @param {{ params: Promise<{ id: string }> }} context - Параметры маршрута (id инвойса).
 * @returns {Promise<NextResponse>}
 * - 200: HTML-страница с инвойсом.
 * - 404: { error } — инвойс не найден.
 *
 * @sideeffect
 * - Запрашивает invoice, client, project, payments из БД.
 * - Парсит lineItems (JSON).
 * - Возвращает HTML с CSS-стилями для печати.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { name: true, company: true, email: true } },
      project: { select: { name: true } },
      payments: { orderBy: { date: "desc" } },
    },
  })

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const lineItems = typeof invoice.lineItems === "string"
    ? JSON.parse(invoice.lineItems)
    : invoice.lineItems

  const itemsHtml = (lineItems || []).map((item: any, i: number) => `
    <tr${i < lineItems.length - 1 ? ' style="border-bottom:1px solid #eee;"' : ""}>
      <td style="padding:10px 0;">${item.description}</td>
      <td style="padding:10px 0; text-align:center;">${item.quantity}</td>
      <td style="padding:10px 0; text-align:right;">$${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding:10px 0; text-align:right;">${(item.tax || 0)}%</td>
      <td style="padding:10px 0; text-align:right; font-weight:500;">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
    </tr>
  `).join("")

  const remaining = Number(invoice.total) - Number(invoice.paidAmount)

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${invoice.number}</title>
<style>
  @page { margin: 20mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; font-size: 13px; line-height: 1.5; padding: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #000; }
  .header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .header .meta { text-align: right; }
  .header .meta p { color: #555; font-size: 12px; margin-top: 2px; }
  .client { margin-bottom: 32px; }
  .client h3 { font-size: 14px; font-weight: 600; margin-bottom: 4px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
  .client p { color: #333; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { text-align: left; font-size: 11px; text-transform: uppercase; color: #666; padding: 10px 0; border-bottom: 2px solid #000; letter-spacing: 0.5px; }
  thead th:not(:first-child) { text-align: right; }
  tbody td { padding: 10px 0; }
  tbody td:not(:first-child) { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .row.total { font-size: 18px; font-weight: 700; border-top: 2px solid #000; padding-top: 8px; margin-top: 4px; }
  .totals .paid { color: #16a34a; }
  .totals .due { color: #d97706; font-weight: 600; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .badge-draft { background: #f4f4f5; color: #71717a; }
  .badge-sent { background: #dbeafe; color: #2563eb; }
  .badge-paid { background: #dcfce7; color: #16a34a; }
  .badge-overdue { background: #fee2e2; color: #dc2626; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <p style="color:#555;margin-top:4px;">${invoice.number}</p>
    </div>
    <div class="meta">
      <p style="font-size:16px;font-weight:600;margin-bottom:4px;">Agency Name</p>
      <p>Web Development Agency</p>
    </div>
  </div>

  <div class="client">
    <h3>Bill To</h3>
    <p style="font-size:15px;font-weight:600;">${invoice.client?.name || "Client"}</p>
    ${invoice.client?.company ? `<p>${invoice.client.company}</p>` : ""}
    ${invoice.client?.email ? `<p>${invoice.client.email}</p>` : ""}
  </div>

  <div style="display:flex;gap:48px;margin-bottom:24px;font-size:12px;color:#555;">
    <div>
      <p style="font-weight:600;color:#333;">Invoice Date</p>
      <p>${format(new Date(invoice.createdAt), "MMMM d, yyyy")}</p>
    </div>
    ${invoice.dueDate ? `<div><p style="font-weight:600;color:#333;">Due Date</p><p>${format(new Date(invoice.dueDate), "MMMM d, yyyy")}</p></div>` : ""}
    ${invoice.project?.name ? `<div><p style="font-weight:600;color:#333;">Project</p><p>${invoice.project.name}</p></div>` : ""}
    <div>
      <p style="font-weight:600;color:#333;">Status</p>
      <span class="badge badge-${invoice.status.toLowerCase()}">${invoice.status}</span>
    </div>
  </div>

  <table>
    <thead><tr>
      <th style="width:45%;">Description</th>
      <th style="width:12%;">Qty</th>
      <th style="width:17%;">Unit Price</th>
      <th style="width:10%;">Tax</th>
      <th style="width:16%;">Total</th>
    </tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span style="color:#666;">Subtotal</span><span>$${Number(invoice.subtotal).toFixed(2)}</span></div>
    <div class="row"><span style="color:#666;">Tax</span><span>$${Number(invoice.tax).toFixed(2)}</span></div>
    <div class="row total"><span>Total (${invoice.currency})</span><span>$${Number(invoice.total).toFixed(2)}</span></div>
    ${Number(invoice.paidAmount) > 0 ? `<div class="row paid"><span>Paid</span><span>-$${Number(invoice.paidAmount).toFixed(2)}</span></div>` : ""}
    ${remaining > 0 && invoice.status !== "CANCELLED" ? `<div class="row due"><span>Balance Due</span><span>$${remaining.toFixed(2)}</span></div>` : ""}
  </div>

  ${invoice.notes ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;"><p style="font-size:12px;font-weight:600;color:#666;margin-bottom:4px;">Notes</p><p style="font-size:13px;">${invoice.notes}</p></div>` : ""}

  ${invoice.payments?.length > 0 ? `
  <div style="margin-top:24px;">
    <h3 style="font-size:12px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Payment History</h3>
    ${invoice.payments.map((p: any) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:12px;"><span><strong>$${Number(p.amount).toFixed(2)}</strong> &mdash; ${p.method?.replace(/_/g, " ")}${p.notes ? " — " + p.notes : ""}</span><span style="color:#666;">${format(new Date(p.date), "MMM d, yyyy")}</span></div>`).join("")}
  </div>` : ""}

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top:4px;">Agency Name — Web Development Agency</p>
  </div>

  <div class="no-print" style="position:fixed;bottom:16px;left:50%;transform:translateX(-50%);">
    <button onclick="window.print()" style="padding:10px 24px;background:#000;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;">Download PDF (Print → Save as PDF)</button>
  </div>
</body></html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}
