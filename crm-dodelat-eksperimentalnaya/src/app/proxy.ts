/**
 * @file Middleware-прокси для маршрутизации и аутентификации (Next.js Edge Middleware).
 *
 * @description Выполняется перед каждым запросом (кроме статики).
 * Определяет, является ли маршрут публичным, требует ли аутентификации,
 * и перенаправляет пользователя на `/login` или `/dashboard` соответственно.
 *
 * - Публичные маршруты: `/login`, `/register`.
 * - API-маршруты аутентификации (`/api/auth`) и клиентский портал (`/client-portal`)
 *   обрабатываются без редиректов (прокси пропускает их насквозь).
 * - Все остальные маршруты требуют активной сессии.
 *
 * @route Matcher: `/((?!_next/static|_next/image|favicon.ico).*)`
 * @exports proxy — функция middleware.
 * @exports config — конфигурация matcher для Next.js.
 */

import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicRoutes = ["/login", "/register"]
const apiAuthPrefix = "/api/auth"
const clientPortalPrefix = "/client-portal"

/**
 * Middleware-функция для проверки аутентификации и редиректов.
 *
 * @param {NextRequest} request - Входящий HTTP-запрос.
 * @returns {NextResponse} Ответ — либо редирект (на /login или /dashboard),
 * либо пропуск запроса (NextResponse.next()).
 *
 * @sideeffect
 * - Проверяет сессию через `auth()` (NextAuth).
 * - Перенаправляет неаутентифицированных пользователей на `/login`.
 * - Перенаправляет аутентифицированных пользователей с публичных страниц на `/dashboard`.
 * - Пропускает `/api/auth` и `/client-portal` без проверки.
 */
export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))
  const isApiAuth = pathname.startsWith(apiAuthPrefix)
  const isClientPortal = pathname.startsWith(clientPortalPrefix)

  if (isApiAuth || isClientPortal) {
    return NextResponse.next()
  }

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
