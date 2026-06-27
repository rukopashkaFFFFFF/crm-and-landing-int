"use client"

/**
 * CreateLeadDialog — модальный диалог создания нового лида (сделки).
 *
 * Страница: /dashboard/leads.
 * Позволяет создать лид для выбранного клиента с указанием суммы,
 * вероятности и ожидаемой даты закрытия.
 *
 * @param {Object} props
 * @param {Client[]} props.clients — список клиентов для выбора
 * @param {() => void} props.onCreated — колбэк после успешного создания
 *
 * Server action: createLead (FormData).
 *
 * Состояния:
 * - open: boolean (открыт/закрыт)
 * - isSubmitting: boolean (React Hook Form)
 * - Валидация через createLeadSchema (Zod)
 */

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { createLeadSchema } from "@/lib/validations"
import { createLead } from "@/lib/actions/leads"
import { t } from "@/lib/translations"
import type { z } from "zod"

type Schema = z.infer<typeof createLeadSchema>
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"

type Client = { id: string; name: string }

interface Props {
  clients: Client[]
  onCreated: () => void
}

/**
 * CreateLeadDialog — диалог создания лида.
 *
 * Шаги:
 * 1. Выбор клиента из выпадающего списка.
 * 2. Ввод суммы, вероятности (0-100), ожидаемой даты.
 * 3. Отправка FormData через createLead.
 * 4. При успехе: тост, ресет формы, закрытие, onCreated().
 *
 * Побочные эффекты:
 * - toast.success/error
 * - onCreated() для обновления родительского списка
 *
 * @param clients — клиенты для Select
 * @param onCreated — колбэк после создания
 * @returns JSX — Dialog с формой
 */
export function CreateLeadDialog({ clients, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(createLeadSchema) as any,
    defaultValues: { stage: "NEW", value: 0, probability: 0 } as any,
  })

  async function onSubmit(data: Schema) {
    const fd = new FormData()
    Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.set(k, String(v))
    })

    const result = await createLead(fd)
    if (result.error) {
      toast.error(t("Failed to create lead"))
      return
    }
    toast.success(t("Lead created"))
    reset()
    setOpen(false)
    onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="group/button inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 h-9 text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
        <Plus className="mr-2 h-4 w-4" /> {t("Add Lead")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Create Lead")}</DialogTitle>
          <DialogDescription>{t("Add a new lead to the pipeline")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Client")}</Label>
            <Select onValueChange={(v) => setValue("clientId" as any, v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("Select client")} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("Create Lead")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
