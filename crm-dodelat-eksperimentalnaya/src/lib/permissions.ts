/**
 * permissions.ts
 *
 * Система управления доступом (RBAC) для CRM.
 * Определяет пять ролей: OWNER, PM, DEVELOPER, DESIGNER, SALES.
 * Для каждой роли заданы списки ресурсов, доступных для просмотра
 * и управления. Содержит утилиты для проверки доступа, получения
 * стилей badge и локализованных названий ролей.
 */

import type { Role } from "@/generated/prisma/client"
import { t } from "@/lib/translations"

type Permission = {
  canView: string[]
  canManage: string[]
}

const permissions: Record<string, Permission> = {
  OWNER: {
    canView: ["*"],
    canManage: ["*"],
  },
  PM: {
    canView: ["dashboard", "clients", "leads", "projects", "tasks", "time", "invoices", "estimates", "team", "reports", "analytics", "settings"],
    canManage: ["projects", "clients", "leads", "tasks", "time", "estimates"],
  },
  DEVELOPER: {
    canView: ["dashboard", "projects", "tasks", "time"],
    canManage: ["tasks", "time"],
  },
  DESIGNER: {
    canView: ["dashboard", "projects", "tasks"],
    canManage: ["tasks"],
  },
  SALES: {
    canView: ["dashboard", "clients", "leads", "estimates"],
    canManage: ["clients", "leads", "estimates"],
  },
}

/**
 * Проверяет, имеет ли пользователь с данной ролью доступ
 * к указанному ресурсу с заданным действием.
 * OWNER имеет доступ ко всему (*).
 *
 * @param role - Роль пользователя (OWNER | PM | DEVELOPER | DESIGNER | SALES)
 * @param resource - Имя ресурса (например, "clients", "projects", "settings")
 * @param action - Тип действия: "view" (просмотр) или "manage" (управление)
 * @returns true, если доступ разрешён
 */
export function canAccess(role: string, resource: string, action: "view" | "manage"): boolean {
  const p = permissions[role as keyof typeof permissions]
  if (!p) return false

  const list = action === "manage" ? p.canManage : p.canView

  if (p.canView.includes("*")) return true
  if (list.includes(resource)) return true

  return false
}

/**
 * Возвращает вариант стилизации badge для роли.
 *
 * @param role - Роль пользователя
 * @returns Вариант badge: "default" | "secondary" | "destructive" | "outline"
 */
export function getRoleBadgeVariant(role: Role): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    OWNER: "destructive",
    PM: "default",
    DEVELOPER: "secondary",
    DESIGNER: "outline",
    SALES: "secondary",
  }
  return variants[role] ?? "outline"
}

/**
 * Возвращает локализованное название роли.
 *
 * @param role - Роль пользователя
 * @returns Человекочитаемое название роли (рус.)
 */
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    OWNER: t("Owner"),
    PM: t("Project Manager - role"),
    DEVELOPER: t("Developer - role"),
    DESIGNER: t("Designer - role"),
    SALES: t("Sales - role"),
  }
  return labels[role] ?? role
}
