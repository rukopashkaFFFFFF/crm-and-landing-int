"use client"

/**
 * EstimateBuilder — форма создания/редактирования сметы (estimate).
 *
 * Страница: /dashboard/finance/estimates/new.
 * Позволяет выбрать клиента и проект, добавить позиции (line items)
 * с количеством, ценой, налогом, указать валюту и срок действия.
 * Есть режим предпросмотра.
 *
 * @param {Object} props
 * @param {Client[]} props.clients — список клиентов
 * @param {Project[]} props.projects — проекты (фильтруются по clientId)
 *
 * Server action: createEstimate (FormData).
 *
 * Состояния:
 * - clientId, projectId, currency, validUntil, notes
 * - lineItems: массив строк с описанием, quantity, unitPrice, tax
 * - preview: boolean (переключение режима)
 * - saving: boolean
 */

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Trash2, Loader2, Eye, EyeOff } from "lucide-react"

import { createEstimate } from "@/lib/actions/estimates"
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

interface LineItem { id: string; description: string; quantity: number; unitPrice: number; tax: number }
interface Props { clients: Client[]; projects: Project[] }

/**
 * EstimateBuilder — конструктор сметы.
 *
 * Шаги:
 * 1. Выбор клиента, проекта (опционально), валюты, срока действия.
 * 2. Добавление позиций (line items) с описанием, количеством, ценой, налогом.
 * 3. Автоматический расчёт subtotal, tax, total.
 * 4. Переключение Preview для просмотра печатной формы.
 * 5. Сохранение через createEstimate -> редирект на /dashboard/finance.
 *
 * Побочные эффекты:
 * - toast при ошибках
 * - router.push("/dashboard/finance") после создания
 *
 * @param clients — клиенты
 * @param projects — проекты
 * @returns JSX — форма сметы
 */
export function EstimateBuilder({ clients, projects }: Props) {
  const router = useRouter()
  const [clientId, setClientId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: "1", description: "", quantity: 1, unitPrice: 0, tax: 0 }])
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)

  const filteredProjects = projects.filter((p) => !clientId || p.clientId === clientId)

  const addRow = useCallback(() => { setLineItems((p) => [...p, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, tax: 0 }]) }, [])
  const removeRow = useCallback((id: string) => { setLineItems((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p)) }, [])
  const updateRow = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((p) => p.map((r) => (r.id === id ? { ...r, [field]: typeof value === "string" && field !== "description" ? parseFloat(value) || 0 : value } : r)))
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
    if (validUntil) fd.set("validUntil", validUntil)
    fd.set("notes", notes)
    lineItems.forEach((r, i) => {
      fd.set(`lineItems[${i}].description`, r.description)
      fd.set(`lineItems[${i}].quantity`, String(r.quantity))
      fd.set(`lineItems[${i}].unitPrice`, String(r.unitPrice))
      fd.set(`lineItems[${i}].tax`, String(r.tax || 0))
    })
    const result = await createEstimate(fd)
    setSaving(false)
    if (result.error) { toast.error(t("Failed to create estimate")); return }
    toast.success(t("Estimate created"))
    router.push("/dashboard/finance")
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("New Estimate")}</h1>
        <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>
          {preview ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}{preview ? t("Edit - preview toggle") : t("Preview")}
        </Button>
      </div>

      {preview ? (
        <Card><CardContent className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div><h2 className="text-xl font-bold">{t("ESTIMATE")}</h2></div>
            <div className="text-right text-sm"><p className="font-medium">{clients.find((c) => c.id === clientId)?.name || t("Client")}</p></div>
          </div>
          <Separator />
          <table className="w-full text-sm"><thead><tr className="border-b text-muted-foreground"><th className="text-left py-2">{t("Description")}</th><th className="text-right py-2">{t("Qty")}</th><th className="text-right py-2">{t("Unit Price")}</th><th className="text-right py-2">{t("Total")}</th></tr></thead>
            <tbody>{lineItems.map((r) => (<tr key={r.id} className="border-b"><td className="py-2">{r.description || "—"}</td><td className="text-right py-2">{r.quantity}</td><td className="text-right py-2">${r.unitPrice.toFixed(2)}</td><td className="text-right py-2">${(r.quantity * r.unitPrice).toFixed(2)}</td></tr>))}</tbody>
          </table>
          <div className="text-right space-y-1 text-sm"><p>{t("Subtotal:")} ${calcSubtotal().toFixed(2)}</p><p>{t("Tax:")} ${calcTax().toFixed(2)}</p><p className="text-lg font-bold">{t("Total:")} ${calcTotal().toFixed(2)}</p></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPreview(false)}>{t("Back to Edit")}</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Save as Draft")}</Button></div>
        </CardContent></Card>
      ) : (
        <>
          <Card><CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("Client")}</Label><Select onValueChange={(v: any) => setClientId(v || "")}><SelectTrigger><SelectValue placeholder={t("Select client")} /></SelectTrigger><SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label>{t("Project (optional)")}</Label><Select onValueChange={(v: any) => setProjectId(v || "")}><SelectTrigger><SelectValue placeholder={t("Select project")} /></SelectTrigger><SelectContent><SelectItem value="">{t("None")}</SelectItem>{filteredProjects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t("Currency")}</Label><Select value={currency} onValueChange={(v) => setCurrency(v || "USD")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">{t("USD ($)")}</SelectItem><SelectItem value="EUR">{t("EUR (€)")}</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>{t("Valid Until")}</Label><Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} /></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-semibold">{t("Line Items")}</h3><Button variant="outline" size="sm" onClick={addRow}><Plus className="mr-1 h-4 w-4" />{t("Add Row")}</Button></div>
            {lineItems.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-5 h-8 text-sm" placeholder={t("Description")} value={row.description} onChange={(e) => updateRow(row.id, "description", e.target.value)} />
                <Input className="col-span-2 h-8 text-sm text-right" type="number" min="0" value={row.quantity} onChange={(e) => updateRow(row.id, "quantity", e.target.value)} />
                <Input className="col-span-2 h-8 text-sm text-right" type="number" min="0" step="0.01" value={row.unitPrice} onChange={(e) => updateRow(row.id, "unitPrice", e.target.value)} />
                <Input className="col-span-2 h-8 text-sm text-right" type="number" min="0" max="100" value={row.tax} onChange={(e) => updateRow(row.id, "tax", e.target.value)} />
                <Button variant="ghost" size="icon" className="col-span-1 h-8 w-8" onClick={() => removeRow(row.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            ))}
            <Separator />
            <div className="text-right space-y-1 text-sm"><p className="text-muted-foreground">{t("Subtotal:")} ${calcSubtotal().toFixed(2)}</p><p className="text-muted-foreground">{t("Tax:")} ${calcTax().toFixed(2)}</p><p className="text-lg font-bold">{t("Total:")} ${calcTotal().toFixed(2)}</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-6"><div className="space-y-2"><Label>{t("Notes")}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></div></CardContent></Card>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => router.back()}>{t("Cancel")}</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Save as Draft")}</Button></div>
        </>
      )}
    </div>
  )
}
