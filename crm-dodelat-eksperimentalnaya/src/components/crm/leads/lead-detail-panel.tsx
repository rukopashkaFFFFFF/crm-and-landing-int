"use client"

/**
 * LeadDetailPanel — боковая панель просмотра и редактирования лида (сделки).
 *
 * Панель: открывается при клике на карточку лида на доске /dashboard/leads.
 * Показывает детали: сумму, вероятность, дату закрытия, причину проигрыша.
 * Позволяет редактировать все поля лида через встроенную форму.
 *
 * @param {Object} props
 * @param {Lead|null} props.lead — выбранный лид (null = панель закрыта)
 * @param {() => void} props.onClose — закрыть панель
 * @param {Client[]} props.clients — список клиентов (не используется в форме)
 * @param {() => void} props.onUpdated — колбэк после обновления
 *
 * Server action: updateLead (id, FormData).
 *
 * Состояния:
 * - open: boolean (синхронизирован с props.lead)
 * - isSubmitting в форме редактирования
 * - Empty: если lead = null, возвращает null
 */

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, X, Globe } from "lucide-react"

import { updateLeadSchema } from "@/lib/validations"
import type { z } from "zod"

type Schema = z.infer<typeof updateLeadSchema>
import { updateLead } from "@/lib/actions/leads"
import { t, translateStatus } from "@/lib/translations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"

type Lead = any
type Client = { id: string; name: string }

interface Props {
  lead: Lead | null
  onClose: () => void
  clients: Client[]
  onUpdated: () => void
}

/**
 * LeadDetailPanel — панель просмотра/редактирования лида.
 *
 * Шаги:
 * 1. При получении lead (не null) открывается боковая панель.
 * 2. Отображает: имя клиента, статус, сумму, вероятность, дату.
 * 3. Ниже — форма редактирования (LeadEditForm) со всеми полями.
 * 4. Закрытие: setOpen(false) -> useEffect вызывает onClose().
 *
 * @param lead — лид для просмотра/редактирования
 * @param onClose — закрыть панель
 * @param clients — клиенты (передаются дальше)
 * @param onUpdated — обновить родительский список
 * @returns JSX — боковая панель или null
 */
export function LeadDetailPanel({ lead, onClose, clients, onUpdated }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(!!lead)
  }, [lead])

  useEffect(() => {
    if (!open) onClose()
  }, [open, onClose])

  if (!lead) return null

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-background shadow-xl border-l h-full overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">{lead.client?.name || "Lead"}</h2>
                <Badge className="mt-1">{translateStatus(lead.stage)}</Badge>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">{t("Value")}</Label>
                  <p className="text-xl font-bold">${Number(lead.value).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t("Probability")}</Label>
                  <p className="text-xl font-bold">{lead.probability}%</p>
                </div>
              </div>

              {lead.expectedCloseDate && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t("Expected Close")}</Label>
                  <p>{format(new Date(lead.expectedCloseDate), "MMMM d, yyyy")}</p>
                </div>
              )}

              {lead.lostReason && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t("Lost Reason")}</Label>
                  <p className="text-destructive">{lead.lostReason}</p>
                </div>
              )}

              {lead.externalId && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Заявка с лендинга</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="gap-1 border-blue-500/50 text-blue-400">
                        <Globe className="h-3 w-3" />
                        {lead.externalId}
                      </Badge>
                      {lead.source && (
                        <span className="text-xs text-muted-foreground">{lead.source}</span>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {lead.quizAnswers && typeof lead.quizAnswers === "object" && Object.keys(lead.quizAnswers).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Ответы квиза</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(lead.quizAnswers).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key}:</span>
                        <span className="font-medium">{Array.isArray(val) ? val.join(", ") : String(val ?? "")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lead.utmData && typeof lead.utmData === "object" && Object.keys(lead.utmData).length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">UTM / Источник</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(lead.utmData).map(([key, val]) => val ? (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">{String(val)}</span>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {lead.behaviorData && typeof lead.behaviorData === "object" && Object.keys(lead.behaviorData).length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Поведение</h4>
                  <div className="space-y-1 text-sm">
                    {lead.behaviorData.timeOnPage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Время на сайте:</span>
                        <span className="font-medium">{lead.behaviorData.timeOnPage} сек</span>
                      </div>
                    )}
                    {lead.behaviorData.scrollDepth !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Глубина скролла:</span>
                        <span className="font-medium">{lead.behaviorData.scrollDepth}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              <LeadEditForm lead={lead} onSuccess={onUpdated} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Separator() {
  return <div className="h-px bg-border" />
}

/**
 * LeadEditForm — форма редактирования полей лида.
 *
 * @param lead — текущий лид (значения по умолчанию)
 * @param onSuccess — колбэк после успешного обновления
 * @returns JSX — форма с полями stage, value, probability, date, notes, lostReason
 */
function LeadEditForm({ lead, onSuccess }: { lead: Lead; onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(updateLeadSchema) as any,
    defaultValues: {
      stage: lead.stage,
      value: Number(lead.value),
      probability: lead.probability,
      notes: lead.notes || "",
      lostReason: lead.lostReason || "",
      expectedCloseDate: lead.expectedCloseDate
        ? format(new Date(lead.expectedCloseDate), "yyyy-MM-dd")
        : "",
    },
  })

  async function onSubmit(data: Schema) {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.set(k, String(v))
    })

    const result = await updateLead(lead.id, fd)
    if (result.error) {
      toast.error(t("Failed to update"))
      return
    }
    toast.success(t("Lead updated"))
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>{t("Stage")}</Label>
        <Select
          defaultValue={lead.stage}
          onValueChange={(v) => setValue("stage", v as any)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"].map((s) => (
              <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="value">{t("Value ($)")}</Label>
          <Input id="value" type="number" step="0.01" {...register("value")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="probability">{t("Probability %")}</Label>
          <Input id="probability" type="number" min={0} max={100} {...register("probability")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expectedCloseDate">{t("Expected Close Date")}</Label>
        <Input id="expectedCloseDate" type="date" {...register("expectedCloseDate")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t("Notes")}</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lostReason">{t("Lost Reason")}</Label>
        <Input id="lostReason" {...register("lostReason")} placeholder={t("Why was this lost?")} />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("Save Changes")}
      </Button>
    </form>
  )
}
