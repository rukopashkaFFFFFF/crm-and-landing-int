/**
 * @file Страница регистрации сотрудника по приглашению (Register).
 *
 * @description Отображает форму создания аккаунта.
 * Принимает query-параметр `token` (invite token) из URL.
 * Если токен отсутствует, RegisterForm показывает сообщение об ошибке.
 * Оборачивает форму в React.Suspense для ожидания загрузки searchParams.
 *
 * @route GET /register?token=<invite_token>
 * @exports RegisterPage — серверный компонент страницы.
 * @exports metadata — SEO-метаданные (title, description).
 */

import type { Metadata } from "next"
import { Suspense } from "react"
import { RegisterForm } from "./register-form"
import { t } from "@/lib/translations"

export const metadata: Metadata = {
  title: t("Register | CRM"),
  description: t("Create your account"),
}

/**
 * Рендерит страницу регистрации с формой RegisterForm (обёрнутой в Suspense).
 *
 * @returns {JSX.Element} Центрированная страница с карточкой регистрации.
 */
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Create your account")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("You were invited to join the CRM")}
          </p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground py-8">{t("Loading...")}</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
}
