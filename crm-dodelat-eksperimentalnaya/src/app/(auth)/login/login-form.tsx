/**
 * @file Клиентский компонент формы входа (LoginForm).
 *
 * @description Предоставляет UI для аутентификации пользователя.
 * Использует react-hook-form с Zod-валидацией (loginSchema).
 * При успешном входе перенаправляет на `/dashboard` и обновляет сессию.
 *
 * @route Часть страницы /login.
 * @exports LoginForm — компонент с формой email + password.
 */

"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { loginSchema, type LoginInput } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { t } from "@/lib/translations"

/**
 * Форма входа с email и паролем.
 *
 * @returns {JSX.Element} Карточка с полями email, password и кнопкой "Sign in".
 *
 * @sideeffect
 * 1. Вызывает `signIn("credentials")` с данными формы.
 * 2. При ошибке показывает toast с сообщением.
 * 3. При успехе — редирект на `/dashboard` и `router.refresh()`.
 */
export function LoginForm() {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  /**
   * Обрабатывает отправку формы.
   *
   * @param {LoginInput} data - Валидированные данные (email, password).
   * @returns {Promise<void>}
   */
  async function onSubmit(data: LoginInput) {
    setIsPending(true)

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    setIsPending(false)

    if (!result?.ok) {
      toast.error(t("Invalid email or password"))
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("Email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("name@company.com")}
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("Password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("Enter your password")}
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("Sign in")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
