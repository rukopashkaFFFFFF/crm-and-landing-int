"use client"

/**
 * InvoiceView — страница просмотра инвойса с действиями.
 *
 * Страница: /dashboard/finance/invoices/[id].
 * Отображает полную информацию об инвойсе: номер, даты, клиент,
 * позиции, суммы, историю платежей. Доступные действия: отправить,
 * записать платеж, аннулировать, скачать PDF.
 *
 * @param {Object} props
 * @param {Invoice} props.invoice — полный объект инвойса
 *
 * Server actions: sendInvoice, updateInvoiceStatus, recordPayment.
 *
 * Состояния:
 * - sending: отправка инвойса
 * - showPayment: диалог записи платежа
 * - payAmount, payMethod, payNotes: поля платежа
 * - Empty: если нет lineItems (отображается "—")
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowLeft, Send, Download, CheckCircle, XCircle, DollarSign, Loader2 } from "lucide-react"

import { updateInvoiceStatus, sendInvoice, recordPayment } from "@/lib/actions/invoices"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { t, translateStatus } from "@/lib/translations"

type Invoice = any

const statusColors: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700", SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700", OVERDUE: "bg-red-100 text-red-700", CANCELLED: "bg-zinc-100 text-zinc-400",
}

interface Props { invoice: Invoice }

/**
 * InvoiceView — детальная страница инвойса.
 *
 * Шаги:
 * 1. Хедер: номер, статус, кнопки действий (Send, Record Payment, Void, PDF).
 * 2. Карточка с данными инвойса: дата, клиент, таблица line items.
 * 3. Блок с subtotal, tax, total, paid amount, balance due.
 * 4. История платежей (если есть).
 * 5. Диалог Record Payment с полями amount, method, notes.
 *
 * Побочные эффекты: toast, router.refresh().
 *
 * @param invoice — инвойс
 * @returns JSX — страница инвойса
 */
export function InvoiceView({ invoice }: Props) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [payAmount, setPayAmount] = useState(Number(invoice.total) - Number(invoice.paidAmount))
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER")
  const [payNotes, setPayNotes] = useState("")

  const remaining = Number(invoice.total) - Number(invoice.paidAmount)

  async function handleSend() {
    setSending(true)
    const result = await sendInvoice(invoice.id)
    setSending(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(t("Invoice sent"))
    router.refresh()
  }

  async function handleStatus(status: string) {
    const result = await updateInvoiceStatus(invoice.id, status)
    if (result.error) { toast.error(t("Failed")); return }
    toast.success(t("Invoice {status}", { status: status.toLowerCase() }))
    router.refresh()
  }

  async function handlePayment() {
    if (payAmount <= 0) { toast.error(t("Amount must be positive")); return }
    const fd = new FormData()
    fd.set("invoiceId", invoice.id)
    fd.set("amount", String(payAmount))
    fd.set("method", payMethod)
    fd.set("notes", payNotes)
    const result = await recordPayment(fd)
    if (result.error) { toast.error(t("Failed to record payment")); return }
    toast.success(t("Payment recorded"))
    setShowPayment(false)
    router.refresh()
  }

  const lineItems = typeof invoice.lineItems === "string" ? JSON.parse(invoice.lineItems) : invoice.lineItems

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/finance")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold">{invoice.number}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1 ${statusColors[invoice.status] || ""}`}>{translateStatus(invoice.status)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === "DRAFT" && <Button size="sm" onClick={handleSend} disabled={sending}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{t("Send")}</Button>}
          {invoice.status === "SENT" && <>
            <Button size="sm" variant="outline" onClick={() => handleSend()} disabled={sending}><Send className="mr-2 h-4 w-4" />{t("Resend")}</Button>
            <Button size="sm" onClick={() => setShowPayment(true)}><DollarSign className="mr-2 h-4 w-4" />{t("Record Payment")}</Button>
          </>}
          {(invoice.status === "SENT" || invoice.status === "OVERDUE") && (
            <Button size="sm" variant="outline" onClick={() => handleStatus("CANCELLED")}><XCircle className="mr-2 h-4 w-4" />{t("Void")}</Button>
          )}
          {invoice.status === "PAID" && (
            <Button size="sm" variant="outline" onClick={() => setShowPayment(true)}><DollarSign className="mr-2 h-4 w-4" />{t("Add Payment")}</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, "_blank")}><Download className="mr-2 h-4 w-4" />{t("PDF")}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold" style={{ fontSize: "1.25rem" }}>{t("INVOICE")}</h2>
              <p className="text-muted-foreground">{invoice.number}</p>
              <p className="text-sm text-muted-foreground mt-1">{t("Date:")} {format(new Date(invoice.createdAt), "MMMM d, yyyy")}</p>
              {invoice.dueDate && <p className="text-sm text-muted-foreground">{t("Due:")} {format(new Date(invoice.dueDate), "MMMM d, yyyy")}</p>}
            </div>
            <div className="text-right">
              <p className="font-semibold">{invoice.client?.name || t("Client")}</p>
              {invoice.client?.company && <p className="text-sm text-muted-foreground">{invoice.client.company}</p>}
              {invoice.client?.email && <p className="text-sm text-muted-foreground">{invoice.client.email}</p>}
            </div>
          </div>

          <Separator />

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-3 font-medium">{t("Description")}</th>
                <th className="text-right py-3 font-medium">{t("Qty")}</th>
                <th className="text-right py-3 font-medium">{t("Unit Price")}</th>
                <th className="text-right py-3 font-medium">{t("Tax")}</th>
                <th className="text-right py-3 font-medium">{t("Total")}</th>
              </tr>
            </thead>
            <tbody>
              {(lineItems || []).map((item: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="py-3">{item.description}</td>
                  <td className="text-right py-3">{item.quantity}</td>
                  <td className="text-right py-3">${Number(item.unitPrice).toFixed(2)}</td>
                  <td className="text-right py-3">{(item.tax || 0)}%</td>
                  <td className="text-right py-3 font-medium">${(item.quantity * item.unitPrice).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-right text-sm ml-auto w-64">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("Subtotal")}</span><span>${Number(invoice.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">{t("Tax")}</span><span>${Number(invoice.tax).toFixed(2)}</span></div>
            <Separator />
            <div className="flex justify-between text-lg font-bold"><span>{t("Total ({currency})", { currency: invoice.currency })}</span><span>${Number(invoice.total).toFixed(2)}</span></div>
            {Number(invoice.paidAmount) > 0 && (
              <div className="flex justify-between text-green-600"><span>{t("Paid")}</span><span>-${Number(invoice.paidAmount).toFixed(2)}</span></div>
            )}
            {remaining > 0 && invoice.status !== "CANCELLED" && (
              <div className="flex justify-between text-amber-600 font-medium"><span>{t("Balance Due")}</span><span>${remaining.toFixed(2)}</span></div>
            )}
          </div>

          {invoice.notes && (
            <div className="pt-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t("Notes")}</p>
              <p className="text-sm">{invoice.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {invoice.payments?.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-3">{t("Payment History")}</h3>
            <div className="space-y-2">
              {invoice.payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div>
                    <span className="font-medium">${Number(p.amount).toFixed(2)}</span>
                    <span className="text-muted-foreground ml-2">{translateStatus(p.method)}</span>
                    {p.notes && <span className="text-muted-foreground ml-2">— {p.notes}</span>}
                  </div>
                  <span className="text-muted-foreground">{format(new Date(p.date), "MMM d, yyyy")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Record Payment - dialog")}</DialogTitle><DialogDescription>{t("Enter payment details for invoice {number}", { number: invoice.number })}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("Amount")}</Label>
              <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">{t("Remaining: ${n}", { n: remaining.toFixed(2) })}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("Payment Method")}</Label>
              <Select value={payMethod} onValueChange={(v) => setPayMethod(v || "BANK_TRANSFER")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["BANK_TRANSFER", "CREDIT_CARD", "PAYPAL", "CASH", "CHECK", "OTHER"].map((m) => (
                    <SelectItem key={m} value={m}>{translateStatus(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Notes")}</Label>
              <Input value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder={t("Optional notes...")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>{t("Cancel")}</Button>
            <Button onClick={handlePayment}>{t("Record Payment")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
