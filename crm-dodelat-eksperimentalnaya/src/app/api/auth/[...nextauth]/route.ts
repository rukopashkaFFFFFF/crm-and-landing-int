/**
 * @file NextAuth.js catch-all API-route для аутентификации.
 *
 * @description Экспортирует обработчики GET и POST для всех маршрутов
 * NextAuth.js (login, callback, session, csrf и т.д.).
 * Использует конфигурацию из `@/lib/auth`.
 *
 * @route /api/auth/[...nextauth]
 * @exports GET — обработчик GET-запросов NextAuth.
 * @exports POST — обработчик POST-запросов NextAuth (login, register).
 */

import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
