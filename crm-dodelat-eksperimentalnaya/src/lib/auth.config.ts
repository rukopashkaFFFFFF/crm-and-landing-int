/**
 * auth.config.ts
 *
 * Конфигурация NextAuth.js для CRM-системы.
 * Определяет стратегию аутентификации (JWT), страницы входа,
 * колбэки для обогащения токена/сессии ролями и провайдер
 * входа по email/паролю (Credentials).
 */

import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { verifyPassword } from "./auth-helpers"

/**
 * Объект конфигурации NextAuth.
 * - trustHost: true — разрешает работу на любом хосте
 * - pages.signIn: перенаправление на "/login"
 * - session.strategy: "jwt" — безбазовая сессия через JWT
 * - callbacks.jwt: добавляет id, role, picture в JWT-токен
 * - callbacks.session: переносит id и роль из токена в session.user
 * - callbacks.authorized: проверяет доступ к маршрутам (защита страниц)
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    /**
     * Обогащает JWT-токен данными пользователя при входе.
     *
     * @param token - Текущий JWT-токен
     * @param user - Объект пользователя (только при первой авторизации)
     * @returns Обогащённый токен
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.picture = user.image
      }
      return token
    },

    /**
     * Переносит кастомные поля из JWT в session.user.
     *
     * @param session - Объект сессии
     * @param token - JWT-токен с обогащёнными полями
     * @returns Сессия с id и role пользователя
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },

    /**
     * Middleware-проверка: разрешает доступ к публичным страницам,
     * перенаправляет на /login неавторизованных пользователей
     * и на /dashboard уже авторизованных на страницах входа.
     *
     * @param auth - Текущая сессия (null, если не авторизован)
     * @param request.nextUrl - URL запроса
     * @returns true, Response с редиректом или false
     */
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl
      const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register")
      const isApiAuthRoute = pathname.startsWith("/api/auth")
      const isClientPortal = pathname.startsWith("/client-portal")
      const isPublic = isAuthPage || isApiAuthRoute || isClientPortal

      if (!auth && !isPublic) {
        return Response.redirect(new URL("/login", nextUrl))
      }

      if (auth && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
  },
  providers: [
    /**
     * Провайдер входа по email и паролю (Credentials).
     * Ищет пользователя в БД по email, проверяет пароль
     * через bcrypt, убеждается, что аккаунт активен.
     *
     * @param credentials - { email, password }
     * @returns Объект пользователя или null при неудаче
     */
    Credentials({
      async authorize(credentials) {
        const { email, password } = credentials as { email: string; password: string }

        if (!email || !password) return null

        const { db } = await import("@/lib/db")

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
        })

        if (!user || !user.password || !user.active) return null

        const isValid = await verifyPassword(password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
          role: user.role,
        }
      },
    }),
  ],
}
