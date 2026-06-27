/**
 * @file Страница входа в CRM (Login).
 *
 * @description Отображает форму аутентификации пользователя.
 * Содержит заголовок "Welcome back" и подпись "Sign in to your CRM account".
 * Использует клиентский компонент LoginForm для обработки ввода.
 *
 * @route GET /login
 * @exports LoginPage — серверный компонент страницы.
 * @exports metadata — SEO-метаданные (title, description).
 */

import type { Metadata } from "next"
import { LoginForm } from "./login-form"
import { t } from "@/lib/translations"

export const metadata: Metadata = {
  title: t("Login | CRM"),
  description: t("Sign in to your account"),
}

/**
 * Рендерит страницу входа с формой LoginForm.
 *
 * @returns {JSX.Element} Центрированная страница с карточкой логина.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Welcome back")}</h1>
          <p className="text-sm text-muted-foreground">{t("Sign in to your CRM account")}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
