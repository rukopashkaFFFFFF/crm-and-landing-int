/**
 * hooks/index.ts
 *
 * Точка экспорта всех кастомных React-хуков приложения.
 * Упрощает импорт: import { useCurrentUser, useRole, useSSE } from "@/hooks"
 */

export { useCurrentUser } from "./use-current-user"
export { useRole } from "./use-role"
export { useSSE } from "./use-sse"
