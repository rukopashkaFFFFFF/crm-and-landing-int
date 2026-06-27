"use client"

/**
 * InvoiceBuilder — форма создания нового инвойса (счёта).
 *
 * Страница: /dashboard/finance/invoices/new.
 * Позволяет выбрать клиента, проект, валюту, дату оплаты, добавить
 * позиции, указать заметки и условия оплаты. Есть режим предпросмотра.
 *
 * @param {Object} props
 * @param {Client[]} props.clients — список клиентов
 * @param {Project[]} props.projects — проекты (фильтруются по clientId)
 *
 * Server action: createInvoice (FormData).
 *
 * Состояния:
 * - clientId, projectId, currency, dueDate, notes, terms
 * - lineItems: массив строк
 * - preview: boolean
 * - saving: boolean
 */

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Eye, EyeOff, Loader2 } from "lucide-react"

import { createInvoice } from "@/lib/actions/invoices"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { t } from "@/lib/translations"

type Client = { id: string; name: string }
type Project = { id: string; name: string; clientId: string }

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  tax: number
}

interface Props { clients: Client[]; projects: Project[] }

/**
 * InvoiceBuilder — конструктор инвойса.
 *
 * Шаги:
 * 1. Выбор клиента, проекта, валюты, даты оплаты.
 * 2. Добавление позиций (line items) с расчётом subtotal/tax/total.
 * 3. Поля Notes и Terms.
 * 4. Режим предпросмотра.
 * 5. Сохранение -> редирект на /dashboard/finance/invoices/[id].
 *
 * Побочные эффекты: toast, router.push.
 *
 * @param clients — клиенты
 * @param projects — проекты
 * @returns JSX — форма инвойса
 */
export function InvoiceBuilder({ clients, projects }: Props) {
  const router = useRouter()
  const [clientId, setClientId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [dueDate, setDueDate] = useState("")
  const [notes, setNotes] = useState("")
  const [terms, setTerms] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, tax: 0 },
  ])
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  const filteredProjects = projects.filter((p) => !clientId || p.clientId === clientId)

  const addRow = useCallback(() => {
    setLineItems((prev) => [...prev, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, tax: 0 }])
  }, [])

  const removeRow = useCallback((id: string) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }, [])

  const updateRow = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: typeof value === "string" && field !== "description" ? parseFloat(value) || 0 : value } : r)))
  }, [])

  const calcSubtotal = () => lineItems.reduce((s, r) => s + r.quantity * r.unitPrice, 0)
  const calcTax = () => lineItems.reduce((s, r) => s + r.quantity * r.unitPrice * (r.tax / 100), 0)
  const calcTotal = () => calcSubtotal() + calcTax()

  async function handleSave() {
    if (!clientId) { toast.error(t("Select a client")); return }
    if (!lineItems.some((r) => r.description && r.quantity > 0)) { toast.error(t("Add at least one line item")); return }

    setSaving(true)
    const fd = new FormData()
    fd.set("clientId", clientId)
    if (projectId) fd.set("projectId", projectId)
    fd.set("currency", currency)
    if (dueDate) fd.set("dueDate", dueDate)
    fd.set("notes", notes)
    fd.set("terms", terms)
    lineItems.forEach((r, i) => {
      fd.set(`lineItems[${i}].description`, r.description)
      fd.set(`lineItems[${i}].quantity`, String(r.quantity))
      fd.set(`lineItems[${i}].unitPrice`, String(r.unitPrice))
      fd.set(`lineItems[${i}].tax`, String(r.tax || 0))
    })

    const result = await createInvoice(fd)
    setSaving(false)
    if (result.error) { toast.error(t("Failed to create invoice")); return }
    if (!result.data) { toast.error(t("No data returned")); return }
    toast.success(t("Invoice created"))
    router.push(`/dashboard/finance/invoices/${result.data.id}`)
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("New Invoice")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreview(!preview)}>
            {preview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {preview ? t("Edit - preview toggle") : t("Preview")}
          </Button>
        </div>
      </div>

      {preview ? (
        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div><h2 className="text-xl font-bold">{t("INVOICE")}</h2><p className="text-muted-foreground">INV-{new Date().getFullYear()}-XXXX</p></div>
              <div className="text-right text-sm"><p className="font-medium">{clients.find((c) => c.id === clientId)?.name || t("Client")}</p></div>
            </div>
            <Separator />
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground"><th className="text-left py-2">{t("Description")}</th><th className="text-right py-2">{t("Qty")}</th><th className="text-right py-2">{t("Unit Price")}</th><th className="text-right py-2">{t("Tax")}</th><th className="text-right py-2">{t("Total")}</th></tr></thead>
              <tbody>
                {lineItems.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2">{r.description || "—"}</td>
                    <td className="text-right py-2">{r.quantity}</td>
                    <td className="text-right py-2">${r.unitPrice.toFixed(2)}</td>
                    <td className="text-right py-2">{r.tax}%</td>
                    <td className="text-right py-2">${(r.quantity * r.unitPrice).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-right text-sm">
              <p>{t("Subtotal:")} ${calcSubtotal().toFixed(2)}</p>
              <p>{t("Tax:")} ${calcTax().toFixed(2)}</p>
              <p className="text-lg font-bold">{t("Total:")} ${calcTotal().toFixed(2)}</p>
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreview(false)}>{t("Back to Edit")}</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Save as Draft")}</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Client")}</Label>
                  <Select onValueChange={(v: any) => setClientId(v || "")}>
                    <SelectTrigger><SelectValue placeholder={t("Select client")} /></SelectTrigger>
                    <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("Project (optional)")}</Label>
                  <Select onValueChange={(v: any) => setProjectId(v || "")}>
                    <SelectTrigger><SelectValue placeholder={t("Select project")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("None")}</SelectItem>
                      {filteredProjects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("Currency")}</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v || "USD")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">{t("USD ($)")}</SelectItem>
                      <SelectItem value="EUR">{t("EUR (€)")}</SelectItem>
                      <SelectItem value="GBP">{t("GBP (£)")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("Due Date")}</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t("Line Items")}</h3>
                <Button variant="outline" size="sm" onClick={addRow}><Plus className="mr-1 h-4 w-4" />{t("Add Row")}</Button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
                  <div className="col-span-5">{t("Description")}</div>
                  <div className="col-span-2 text-right">{t("Qty")}</div>
                  <div className="col-span-2 text-right">{t("Unit Price")}</div>
                  <div className="col-span-2 text-right">{t("Tax %")}</div>
                  <div className="col-span-1"></div>
                </div>
                {lineItems.map((row) => (
                  <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                    <Input className="col-span-5 h-8 text-sm" placeholder={t("Description")} value={row.description}
                      onChange={(e) => updateRow(row.id, "description", e.target.value)} />
                    <Input className="col-span-2 h-8 text-sm text-right" type="number" min="0" value={row.quantity}
                      onChange={(e) => updateRow(row.id, "quantity", e.target.value)} />
                    <Input className="col-span-2 h-8 text-sm text-right" type="number" min="0" step="0.01" value={row.unitPrice}
                      onChange={(e) => updateRow(row.id, "unitPrice", e.target.value)} />
                    <Input className="col-span-2 h-8 text-sm text-right" type="number" min="0" max="100" value={row.tax}
                      onChange={(e) => updateRow(row.id, "tax", e.target.value)} />
                    <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => removeRow(row.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="text-right space-y-1 text-sm">
                <p className="text-muted-foreground">{t("Subtotal:")} ${calcSubtotal().toFixed(2)}</p>
                <p className="text-muted-foreground">{t("Tax:")} ${calcTax().toFixed(2)}</p>
                <p className="text-lg font-bold">{t("Total:")} ${calcTotal().toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>{t("Notes")}</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t("Additional notes for the client...")} />
              </div>
              <div className="space-y-2">
                <Label>{t("Terms")}</Label>
                <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} placeholder={t("Payment terms...")} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()}>{t("Cancel")}</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Save as Draft")}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
