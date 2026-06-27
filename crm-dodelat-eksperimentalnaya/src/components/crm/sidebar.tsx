"use client"

/**
 * Sidebar — боковая панель навигации CRM.
 *
 * Отображается на всех страницах /dashboard/*.
 * Содержит логотип, навигационные ссылки (с проверкой прав доступа),
 * переключатель темы (ThemeToggle), профиль пользователя с выпадающим
 * меню (настройки, выход).
 *
 * Состояния:
 * - Активный пункт меню (подсветка по pathname)
 * - Скрытие пунктов по правам (canAccess)
 * - DropdownMenu профиля
 */

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ListTodo,
  Clock,
  ClipboardList,
  Settings,
  UserPlus,
  DollarSign,
  BarChart,
  TrendingUp,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { useRole, useCurrentUser } from "@/hooks"
import { getRoleLabel, getRoleBadgeVariant, canAccess } from "@/lib/permissions"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "next-auth/react"
import { t } from "@/lib/translations"

const navItems = [
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

/**
 * getInitials — возвращает инициалы для аватара пользователя.
 * @param name — имя пользователя или null
 * @returns до 2 заглавных букв или "U"
 */
function getInitials(name?: string | null): string {
  if (!name) return "U"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Sidebar — навигационная панель CRM.
 *
 * Шаги:
 * 1. Рендерит логотип "Agency CRM" в хедере.
 * 2. Маппинг navItems с иконками и проверкой canAccess.
 * 3. Активная ссылка подсвечивается (bg-primary).
 * 4. ThemeToggle внизу перед профилем.
 * 5. Профиль: аватар, имя, email, роль, DropdownMenu (Settings, Sign out).
 *
 * @returns JSX — боковая панель (aside)
 */
export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useCurrentUser()
  const { role } = useRole()

  return (
    <aside className="flex w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-6 font-semibold">
        <Briefcase className="mr-2 h-5 w-5" />
        {t("Agency CRM")}
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          if (!canAccess(role ?? "", item.resource, "view")) return null
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.label)}
            </Link>
          )
        })}
      </nav>
      <div className="space-y-1 px-4 pb-2">
        <ThemeToggle />
      </div>
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
            </div>
            <Badge variant={getRoleBadgeVariant(role as any)}>
              {getRoleLabel(role ?? "")}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("My Account")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                {t("Settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                {t("Sign out")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
