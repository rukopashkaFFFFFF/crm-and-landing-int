/**
 * auth.ts
 *
 * Инициализация NextAuth.js с Prisma-адаптером.
 * Экспортирует хендлеры API-маршрутов, вспомогательные
 * функции auth(), signIn(), signOut() для использования
 * в Server Components и Server Actions.
 *
 * Подключён PrismaAdapter для сохранения сессий/аккаунтов
 * в базе данных через Prisma, поверх конфигурации auth.config.
 */

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"

import { db } from "./db"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
})
