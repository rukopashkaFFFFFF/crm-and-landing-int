/**
 * @file Клиентский компонент формы регистрации по приглашению (RegisterForm).
 *
 * @description Принимает invite-токен из URL (searchParams), проверяет его наличие,
 * и отображает форму для создания аккаунта (имя, пароль).
 * При успешной регистрации вызывает `/api/auth/register`, затем автоматически
 * выполняет signIn для входа в систему. Если вход не удался — перенаправляет на /login.
 *
 * @route Часть страницы /register?token=<token>.
 * @exports RegisterForm — компонент формы регистрации.
 */

"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { registerSchema, type RegisterInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { t } from "@/lib/translations"

/**
 * Форма регистрации нового сотрудника по инвайт-ссылке.
 *
 * @returns {JSX.Element} Карточка с формой, либо сообщение об ошибке если токен отсутствует.
 *
 * @sideeffect
 * 1. Читает `token` из URL searchParams.
 * 2. Если токена нет — рендерит сообщение "Invalid invite link".
 * 3. При submit: POST `/api/auth/register` -> signIn -> редирект на `/dashboard`.
 * 4. Показывает toast при ошибках.
 */
export function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [isPending, setIsPending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { token: token ?? "" },
  })

  if (!token) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-destructive">
            {t("Invalid invite link. Please request a new invitation.")}
          </p>
        </CardContent>
      </Card>
    )
  }

  /**
   * Отправляет данные регистрации на сервер и выполняет вход.
   *
   * @param {RegisterInput} data - Валидированные данные (name, password, token).
   * @returns {Promise<void>}
   *
   * @sideeffect
   * - POST запрос на `/api/auth/register`.
   * - При успехе: автоматический signIn и редирект.
   * - При неудаче signIn: редирект на `/login` с toast-уведомлением.
   */
  async function onSubmit(data: RegisterInput) {
    setIsPending(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error)
        return
      }

      const signInResult = await signIn("credentials", {
        email: result.email ?? "",
        password: data.password,
        redirect: false,
      })

      if (signInResult?.ok) {
        router.push("/dashboard")
        router.refresh()
      } else {
        toast.success(t("Account created! Please sign in."))
        router.push("/login")
      }
    } catch {
      toast.error(t("Something went wrong. Please try again."))
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("token")} />
          <div className="space-y-2">
            <Label htmlFor="name">{t("Full name")}</Label>
            <Input
              id="name"
              placeholder={t("John Doe")}
              autoComplete="name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("Password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("At least 8 characters")}
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("Create account")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
