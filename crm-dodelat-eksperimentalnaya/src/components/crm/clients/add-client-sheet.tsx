"use client"

/**
 * AddClientSheet — боковая панель (Sheet) для создания нового клиента.
 *
 * Модальное окно: открывается по кнопке "Add Client" на странице списка
 * клиентов. Содержит форму с полями: имя, email, телефон, компания, статус,
 * источник, ответственный, вебсайт, заметки.
 *
 * @param {Object} props
 * @param {boolean} props.open — состояние открытия Sheet
 * @param {(open: boolean) => void} props.onOpenChange — колбэк закрытия
 * @param {User[]} props.users — список пользователей для назначения
 *
 * Server action: createClient (FormData) — создание клиента.
 *
 * Состояния:
 * - isSubmitting (React Hook Form + Loader2 на кнопке)
 * - Валидация полей через Zod (createClientSchema)
 * - Ресет формы после успешного создания
 */

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { createClientSchema } from "@/lib/validations"
import { createClient } from "@/lib/actions/clients"
import type { z } from "zod"

type Schema = z.infer<typeof createClientSchema>
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { t, translateStatus } from "@/lib/translations"

type User = { id: string; name: string | null }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: User[]
}

/**
 * AddClientSheet — форма создания клиента в боковой панели.
 *
 * Шаги:
 * 1. Пользователь заполняет поля формы (имя обязательно).
 * 2. Нажатие "Create Client" запускает handleSubmit.
 * 3. Данные собираются в FormData, вызывается createClient.
 * 4. При успехе: тост, ресет формы, закрытие Sheet, router.refresh().
 * 5. При ошибке: тост с текстом ошибки.
 *
 * Побочные эффекты:
 * - toast.success/error
 * - router.refresh() после создания
 * - reset() формы
 *
 * @param open — открыт/закрыт
 * @param onOpenChange — управление видимостью
 * @param users — список пользователей для Select
 * @returns JSX — Sheet с формой
 */
export function AddClientSheet({ open, onOpenChange, users }: Props) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(createClientSchema) as any,
    defaultValues: { status: "ACTIVE", source: "OTHER", tags: [] } as any,
  })

  const onSubmit = useCallback(
    async (data: Schema) => {
    const fd = new FormData()
      Object.entries(data as Record<string, unknown>).forEach(([k, v]) => {
        if (k === "tags") {
          ;(v as string[]).forEach((t: string) => fd.append("tags", t))
        } else if (v !== null && v !== undefined) {
          fd.set(k, String(v))
        }
      })

      const result = await createClient(fd)
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Validation failed")
        return
      }
      toast.success(t("Client created"))
      reset()
      onOpenChange(false)
      router.refresh()
    },
    [reset, onOpenChange, router]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("Add Client - Sheet")}</SheetTitle>
          <SheetDescription>{t("Create a new client record")}</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("Name *")}
            </Label>
            <Input id="name" {...register("name")} placeholder={t("Client name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("Email")}</Label>
            <Input id="email" type="email" {...register("email")} placeholder={t("client@company.com")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("Phone")}</Label>
            <Input id="phone" {...register("phone")} placeholder={t("+1-555-0000")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">{t("Company")}</Label>
            <Input id="company" {...register("company")} placeholder={t("Company Inc.")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Status")}</Label>
              <Select
                defaultValue="ACTIVE"
                onValueChange={(v) => setValue("status", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["LEAD", "ACTIVE", "INACTIVE", "CHURNED"].map((s) => (
                    <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Source")}</Label>
              <Select
                defaultValue="OTHER"
                onValueChange={(v) => setValue("source", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["REFERRAL", "WEBSITE", "COLD", "OTHER"].map((s) => (
                    <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("Assigned To")}</Label>
            <Select onValueChange={(v) => setValue("assignedToId" as any, v === "unassigned" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("Select user")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">{t("Unassigned")}</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" {...register("website")} placeholder={t("https://")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">{t("Notes")}</Label>
            <Input id="notes" {...register("notes")} placeholder={t("Internal notes...")} />
          </div>
          <SheetFooter className="pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("Create Client")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
