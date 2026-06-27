"use client"

/**
 * CommandPalette — командная палитра (Ctrl+K или /) для быстрой навигации.
 *
 * Используется в TopHeader. Открывается по Ctrl+K (Cmd+K) или клавише "/"
 * (не в полях ввода). Показывает список страниц и быстрых действий
 * с учётом прав доступа.
 *
 * Состояния:
 * - open: открыта/закрыта
 * - Поиск/фильтрация через cmdk (Command.Dialog)
 * - Фильтрация пунктов по правам (canAccess)
 */

import { useEffect, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Command } from "cmdk"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ListTodo,
  Clock,
  DollarSign,
  UserPlus,
  BarChart,
  TrendingUp,
  Settings,
  ClipboardList,
  Plus,
  Timer,
  FileText,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useRole } from "@/hooks"
import { canAccess } from "@/lib/permissions"
import { t } from "@/lib/translations"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  resource: string
}

interface ActionItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  resource?: string
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, resource: "dashboard" },
  { href: "/dashboard/clients", label: "Clients", icon: Users, resource: "clients" },
  { href: "/dashboard/leads", label: "Leads", icon: ClipboardList, resource: "leads" },
  { href: "/dashboard/projects", label: "Projects", icon: Briefcase, resource: "projects" },
  { href: "/dashboard/tasks", label: "Tasks", icon: ListTodo, resource: "tasks" },
  { href: "/dashboard/time", label: "Time", icon: Clock, resource: "time" },
  { href: "/dashboard/finance", label: "Finance", icon: DollarSign, resource: "invoices" },
  { href: "/dashboard/team", label: "Team", icon: UserPlus, resource: "team" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart, resource: "reports" },
  { href: "/dashboard/analytics", label: "Analytics", icon: TrendingUp, resource: "analytics" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, resource: "settings" },
]

const quickActions: ActionItem[] = [
  { href: "/dashboard/clients/new", label: "New Client", icon: Plus, resource: "clients" },
  { href: "/dashboard/projects/new", label: "New Project", icon: Briefcase, resource: "projects" },
  { href: "/dashboard/tasks/new", label: "New Task", icon: FileText, resource: "tasks" },
  { href: "/dashboard/time", label: "Log Time", icon: Timer, resource: "time" },
]

/**
 * CommandPalette — поиск и быстрая навигация.
 *
 * Шаги:
 * 1. Нажатие Ctrl+K (или / вне полей ввода) открывает Command.Dialog.
 * 2. Фильтрация navItems и quickActions по роли (canAccess).
 * 3. Ввод текста фильтрует пункты через cmdk.
 * 4. Выбор пункта — router.push(href) + закрытие.
 *
 * @returns JSX — Command.Dialog portal
 */
export function CommandPalette() {
  const router = useRouter()
  const { role } = useRole()
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return
        }
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const visibleNavItems = navItems.filter((item) =>
    canAccess(role ?? "", item.resource, "view"),
  )

  const visibleActions = quickActions.filter((item) =>
    item.resource ? canAccess(role ?? "", item.resource, "manage") : true,
  )

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label={t("Command menu")}>
      <div
        className={cn(
          "fixed inset-0 z-50",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        )}
      >
        <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
        <div className="fixed inset-0 flex items-start justify-center pt-[15vh]">
          <div
            className={cn(
              "w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl",
              "bg-background text-foreground",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[state=open]:slide-in-from-top-2",
            )}
          >
            <Command.Input
              placeholder={t("Search or type a command...")}
              className={cn(
                "flex h-12 w-full rounded-t-xl border-b bg-transparent px-4 py-3",
                "text-sm outline-none placeholder:text-muted-foreground",
                "border-border",
              )}
            />
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                {t("No results found.")}
              </Command.Empty>
              <Command.Group heading={t("Navigation")}>
                {visibleNavItems.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={t(item.label)}
                    onSelect={() => handleSelect(item.href)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                      "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    )}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {t(item.label)}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Separator className="my-2 h-px bg-border" />
              <Command.Group heading={t("Quick Actions")}>
                {visibleActions.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={t(item.label)}
                    onSelect={() => handleSelect(item.href)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm",
                      "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    )}
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {t(item.label)}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
                {t("Navigate")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
                {t("Open")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
                {t("Close")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Command.Dialog>
  )
}
