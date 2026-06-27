"use client"

/**
 * AddProjectDialog — модальный диалог создания нового проекта.
 *
 * Страница: /dashboard/projects.
 * Форма с полями: клиент, название, описание, статус, бюджет,
 * даты начала/окончания, менеджер проекта.
 *
 * @param {Object} props
 * @param {Client[]} props.clients — список клиентов
 * @param {User[]} props.users — пользователи (для PM)
 * @param {() => void} props.onCreated — колбэк после создания
 *
 * Server action: createProject (FormData).
 *
 * Состояния:
 * - open: boolean (открыт/закрыт)
 * - isSubmitting: boolean (React Hook Form)
 * - Валидация через createProjectSchema
 */

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { createProjectSchema } from "@/lib/validations"
import { createProject } from "@/lib/actions/projects"
import { t, translateStatus } from "@/lib/translations"
import type { z } from "zod"
type Schema = z.infer<typeof createProjectSchema>

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

type Client = { id: string; name: string }
type User = { id: string; name: string | null }

interface Props { clients: Client[]; users: User[]; onCreated: () => void }

/**
 * AddProjectDialog — диалог создания проекта.
 *
 * Шаги:
 * 1. Выбор клиента, ввод названия и описания.
 * 2. Выбор статуса, бюджета, дат, PM.
 * 3. Отправка FormData через createProject.
 * 4. При успехе: тост, ресет, закрытие, onCreated().
 *
 * @param clients — клиенты
 * @param users — пользователи
 * @param onCreated — колбэк после создания
 * @returns JSX — диалог
 */
export function AddProjectDialog({ clients, users, onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<Schema>({
    resolver: zodResolver(createProjectSchema) as any,
    defaultValues: { status: "PLANNING", budget: 0 } as any,
  })

  async function onSubmit(data: Schema) {
    const fd = new FormData()
    Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== null && v !== undefined) fd.set(k, String(v))
    })
    const result = await createProject(fd)
    if (result.error) { toast.error(t("Failed to create project")); return }
    toast.success(t("Project created"))
    reset(); setOpen(false); onCreated()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="group/button inline-flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground px-4 h-9 text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"><Plus className="mr-2 h-4 w-4" /> {t("New Project")}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{t("New Project")}</DialogTitle><DialogDescription>{t("Create a new project")}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Client")}</Label>
            <Select onValueChange={(v) => setValue("clientId" as any, v)}>
              <SelectTrigger><SelectValue placeholder={t("Select client")} /></SelectTrigger>
              <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t("Name")}</Label>
            <Input id="name" {...register("name")} placeholder={t("Project name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("Description")}</Label>
            <Textarea id="description" {...register("description")} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Status")}</Label>
              <Select defaultValue="PLANNING" onValueChange={(v) => setValue("status" as any, v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["PLANNING", "IN_PROGRESS", "REVIEW", "COMPLETED", "ON_HOLD", "CANCELLED"].map((s) => (<SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">{t("Budget")}</Label>
              <Input id="budget" type="number" {...register("budget")} placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t("Start Date")}</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">{t("End Date")}</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("Project Manager")}</Label>
            <Select onValueChange={(v) => setValue("pmId" as any, v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder={t("Select PM")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("Unassigned")}</SelectItem>
                {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name || u.id}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
