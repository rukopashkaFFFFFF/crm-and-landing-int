/**
 * use-current-user.ts
 *
 * Хук для получения текущего пользователя из сессии NextAuth.
 * Использует useSession() из next-auth/react.
 *
 * @returns Объект пользователя (session.user) или undefined,
 *          если сессия не загружена или пользователь не авторизован.
 *          Содержит поля: id, name, email, image (avatar), role.
 */

import { useSession } from "next-auth/react"

export function useCurrentUser() {
  const { data: session } = useSession()
  return session?.user
}
