/**
 * @file Корневая страница приложения (Home).
 *
 * @description Перенаправляет пользователя на `/login`.
 * Используется как точка входа: если пользователь не аутентифицирован —
 * middleware (proxy.ts) также перенаправит на `/login`, но эта страница
 * служит fallback для корневого маршрута `/`.
 *
 * @route GET /
 * @exports Home — серверный компонент, выполняющий redirect.
 */

import { redirect } from "next/navigation"

/**
 * Перенаправляет на страницу входа.
 *
 * @returns {never} Выполняет редирект на `/login`.
 */
export default function Home() {
  redirect("/login")
}
