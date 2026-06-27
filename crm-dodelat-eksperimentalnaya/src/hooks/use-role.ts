/**
 * use-role.ts
 *
 * Хук для определения роли текущего пользователя и проверок
 * на конкретные роли. Использует useSession() из next-auth/react.
 *
 * @returns Объект с полями:
 *   - role — строка роли пользователя или null (если не авторизован)
 *   - isOwner — true, если роль OWNER
 *   - isPM — true, если роль PM
 *   - isDeveloper — true, если роль DEVELOPER
 *   - isDesigner — true, если роль DESIGNER
 *   - isSales — true, если роль SALES
 */

import { useSession } from "next-auth/react"

export function useRole() {
  const { data: session } = useSession()
  return {
    role: session?.user?.role ?? null,
    isOwner: session?.user?.role === "OWNER",
    isPM: session?.user?.role === "PM",
    isDeveloper: session?.user?.role === "DEVELOPER",
    isDesigner: session?.user?.role === "DESIGNER",
    isSales: session?.user?.role === "SALES",
  }
}
