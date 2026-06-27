"use client"

/**
 * ProjectFinanceTab — финансовая вкладка проекта с аналитикой.
 *
 * Вкладка: Finance в ProjectWorkspace.
 * Показывает бюджет, затраты (по инвойсам), оценочную стоимость,
 * рентабельность, настройки бюджета/ставки, сводку часов,
 * распределение билль-часов по участникам.
 *
 * @param {Object} props
 * @param {Project} props.project — проект с задачами, инвойсами, timeEntries
 *
 * Server action: updateProject (сохранение бюджета и hourlyRate).
 *
 * Состояния:
 * - budget, hourlyRate: редактируемые поля
 * - saving: флаг сохранения
 * - Расчёты через useMemo (totalSpent, estimatedCost, billableHoursByUser)
 */

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

import { updateProject } from "@/lib/actions/projects"
import { t } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Project = any

interface Props { project: Project }

/**
 * ProjectFinanceTab — финансовая аналитика проекта.
 *
 * Шаги:
 * 1. Отображение KPI-карточек: Budget, Spent, Estimated Cost.
 * 2. Прогресс-бар рентабельности (зелёный/красный).
 * 3. Редактирование бюджета и почасовой ставки.
 * 4. Сводка часов: estimated, billable, non-billable.
 * 5. Таблица билль-часов по участникам с утилизацией.
 *
 * Побочные эффекты: updateProject (тост, router.refresh).
 *
 * @param project — проект
 * @returns JSX — финансовая вкладка
 */
export function ProjectFinanceTab({ project }: Props) {
  const router = useRouter()
  const [budget, setBudget] = useState(String(Number(project.budget)))
  const [hourlyRate, setHourlyRate] = useState(String(Number(project.hourlyRate)))
  const [saving, setSaving] = useState(false)

  const tasks = project.tasks || []
  const invoices = project.invoices || []

  const totalSpent = useMemo(() => invoices.reduce((s: number, inv: any) => s + Number(inv.total), 0), [invoices])
  const totalEstimatedHours = useMemo(() => tasks.reduce((s: number, t: any) => s + Number(t.estimatedHours), 0), [tasks])
  const estimatedCost = Number(hourlyRate) * totalEstimatedHours

  const billableHoursByUser = useMemo(() => {
    const map: Record<string, { name: string; billable: number; nonBillable: number }> = {}
    tasks.forEach((t: any) => {
      (t.timeEntries || []).forEach((e: any) => {
        const key = t.assignee?.name || "Unassigned"
        if (!map[key]) map[key] = { name: key, billable: 0, nonBillable: 0 }
        if (e.billable) map[key].billable += Number(e.hours)
        else map[key].nonBillable += Number(e.hours)
      })
    })
    return Object.values(map)
  }, [tasks])

  const totalBillableHours = useMemo(() => {
    let h = 0
    tasks.forEach((t: any) => (t.timeEntries || []).forEach((e: any) => { if (e.billable) h += Number(e.hours) }))
    return h
  }, [tasks])

  const totalNonBillableHours = useMemo(() => {
    let h = 0
    tasks.forEach((t: any) => (t.timeEntries || []).forEach((e: any) => { if (!e.billable) h += Number(e.hours) }))
    return h
  }, [tasks])

  const profitability = Number(budget) > 0 ? Math.round(((Number(budget) - estimatedCost) / Number(budget)) * 100) : 0

  async function handleSave() {
    setSaving(true)
    const fd = new FormData()
    fd.set("budget", budget)
    fd.set("hourlyRate", hourlyRate)
    const result = await updateProject(project.id, fd)
    setSaving(false)
    if (result.error) { toast.error(t("Failed to save")); return }
    toast.success(t("Saved"))
    router.refresh()
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("Budget")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${Number(budget).toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("Spent (Invoices)")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${totalSpent.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("Estimated Cost")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${estimatedCost.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden flex">
              <div className="bg-green-500 h-full" style={{ width: `${Math.min(profitability, 100)}%` }} />
              <div className="bg-red-500 h-full" style={{ width: `${Math.max(100 - profitability, 0)}%` }} />
            </div>
            <span className={`text-sm font-bold ${profitability >= 0 ? "text-green-600" : "text-red-500"}`}>
              {profitability}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">{t("Profitability:")} {(profitability >= 0 ? t("Profit") : t("Loss"))} {t("of")} {Math.abs(profitability)}%</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">{t("Budget & Rate Settings")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>{t("Budget ($)")}</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{t("Hourly Rate Override ($/hr)")}</Label>
              <Input type="number" step="0.5" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
              <p className="text-xs text-muted-foreground">{t("Leave 0 to use each team member's default rate")}</p>
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}<Save className="mr-2 h-3 w-3" />{t("Save")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">{t("Hours Summary")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm"><span>{t("Total Estimated")}</span><span className="font-medium">{totalEstimatedHours.toFixed(1)}h</span></div>
            <div className="flex justify-between text-sm"><span>{t("Billable Logged")}</span><span className="font-medium text-green-600">{totalBillableHours.toFixed(1)}h</span></div>
            <div className="flex justify-between text-sm"><span>{t("Non-billable Logged")}</span><span className="font-medium text-amber-600">{totalNonBillableHours.toFixed(1)}h</span></div>
            <Separator />
            <div className="flex justify-between text-sm font-bold"><span>{t("Estimated Cost")}</span><span>${estimatedCost.toLocaleString()}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">{t("Billable Hours by Team Member")}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Member")}</TableHead>
                <TableHead className="text-right">{t("Billable (h)")}</TableHead>
                <TableHead className="text-right">{t("Non-billable (h)")}</TableHead>
                <TableHead className="text-right">{t("Utilization")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billableHoursByUser.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">{t("No time entries")}</TableCell></TableRow>
              )}
              {billableHoursByUser.map((u) => {
                const total = u.billable + u.nonBillable
                const util = total > 0 ? Math.round((u.billable / total) * 100) : 0
                return (
                  <TableRow key={u.name}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-right">{u.billable.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">{u.nonBillable.toFixed(1)}h</TableCell>
                    <TableCell className="text-right">{util}%</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
