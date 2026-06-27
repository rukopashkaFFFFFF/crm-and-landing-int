"use client"

/**
 * ClientListClient — страница списка клиентов с фильтрацией, поиском и
 * пагинацией.
 *
 * Страница: /dashboard/clients.
 * Позволяет просматривать, фильтровать (по статусу, источнику), искать
 * клиентов, добавлять новых (через AddClientSheet), импортировать из CSV.
 *
 * @param {Object} props
 * @param {Client[]} props.clients — массив клиентов для текущей страницы
 * @param {User[]} props.users — список пользователей (для назначения)
 * @param {number} props.currentPage — текущая страница пагинации
 * @param {number} props.totalPages — всего страниц
 * @param {number} props.total — всего клиентов
 * @param {Record<string, string|undefined>} props.searchParams —
 *   текущие параметры URL (q, status, source, page)
 *
 * Server actions: не вызывает напрямую (данные приходят готовыми с сервера).
 *
 * Состояния:
 * - Поиск (input с debounce через router.push)
 * - Фильтры (Select для статуса и источника)
 * - Пагинация с номерами страниц
 * - Empty state "No clients found"
 * - AddClientSheet (открывается по клику)
 */

import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  MoreHorizontal,
  ArrowUpDown,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AddClientSheet } from "./add-client-sheet"
import { ImportCsvButton } from "./import-csv-button"
import { t, translateStatus } from "@/lib/translations"

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string
  source: string
  tags: string[]
  createdAt: string
  assignedTo: { id: string; name: string | null; image: string | null } | null
}

type User = { id: string; name: string | null }

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  LEAD: "secondary",
  ACTIVE: "default",
  INACTIVE: "outline",
  CHURNED: "destructive",
}

/**
 * getInitials — возвращает инициалы для аватара (до 2 букв).
 * @param name — полное имя или null
 * @returns строка инициалов или "?"
 */
function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

interface Props {
  clients: Client[]
  users: User[]
  currentPage: number
  totalPages: number
  total: number
  searchParams: Record<string, string | undefined>
}

/**
 * ClientListClient — рендерит таблицу клиентов с фильтрацией и пагинацией.
 *
 * Шаги:
 * 1. Отображение поиска (обновляет URL через router.push).
 * 2. Выпадающие фильтры по статусу и источнику.
 * 3. Кнопки импорта CSV и добавления клиента.
 * 4. Таблица с колонками: имя, компания, email, статус, ответственный, дата.
 * 5. Пагинация с кнопками "назад/вперёд" и номерами страниц.
 *
 * Побочные эффекты:
 * - router.push при поиске, фильтрации, пагинации
 * - buildUrl — вспомогательная функция для построения URL с параметрами
 *
 * @param clients — массив клиентов
 * @param users — пользователи для назначения
 * @param currentPage — текущая страница
 * @param totalPages — всего страниц
 * @param total — всего записей
 * @param searchParams — URL-параметры
 * @returns JSX — страница списка клиентов
 */
export function ClientListClient({ clients, users, currentPage, totalPages, total, searchParams }: Props) {
  const router = useRouter()
  const sp = useSearchParams()
  const [search, setSearch] = useState(searchParams.q || "")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [showAddSheet, setShowAddSheet] = useState(false)

  /**
   * buildUrl — строит URL с переданными параметрами, сохраняя существующие.
   * @param params — объект с параметрами для добавления/удаления
   * @returns строка URL
   */
  const buildUrl = useCallback(
    (params: Record<string, string | undefined>) => {
      const next = new URLSearchParams(sp.toString())
      Object.entries(params).forEach(([k, v]) => {
        if (v) next.set(k, v)
        else next.delete(k)
      })
      return `/dashboard/clients?${next.toString()}`
    },
    [sp]
  )

  /**
   * handleSearch — обновляет поисковый запрос в URL.
   * @param val — строка поиска
   */
  function handleSearch(val: string) {
    setSearch(val)
    router.push(buildUrl({ q: val || undefined, page: "1" }))
  }

  /**
   * handleFilter — обновляет выбранный фильтр в URL.
   * @param key — ключ фильтра (status, source)
   * @param val — значение фильтра
   */
  function handleFilter(key: string, val: string | undefined) {
    router.push(buildUrl({ [key]: val, page: "1" }))
  }

  /**
   * goPage — переключает страницу пагинации.
   * @param p — номер страницы
   */
  function goPage(p: number) {
    router.push(buildUrl({ page: String(p) }))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("Search clients...")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={searchParams.status || ""}
          onValueChange={(v) => handleFilter("status", v || undefined)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">{t("All")}</SelectItem>
            {["LEAD", "ACTIVE", "INACTIVE", "CHURNED"].map((s) => (
              <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.source || ""}
          onValueChange={(v) => handleFilter("source", v || undefined)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t("Source")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">{t("All")}</SelectItem>
            {["REFERRAL", "WEBSITE", "COLD", "OTHER"].map((s) => (
              <SelectItem key={s} value={s}>{translateStatus(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <ImportCsvButton />
        <Button onClick={() => setShowAddSheet(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t("Add Client")}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Name")}</TableHead>
              <TableHead>{t("Company")}</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead>{t("Assigned To")}</TableHead>
              <TableHead>
                <button
                  onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
                  className="inline-flex items-center gap-1"
                >
                  {t("Created")}
                  {sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                </button>
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {t("No clients found")}
                </TableCell>
              </TableRow>
            )}
            {clients.map((client) => (
              <TableRow
                key={client.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/clients/${client.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{client.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{client.company || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{client.email || "—"}</TableCell>
                <TableCell>
                  <Badge variant={statusColors[client.status] || "outline"}>{translateStatus(client.status)}</Badge>
                </TableCell>
                <TableCell>
                  {client.assignedTo ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">{getInitials(client.assignedTo.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{client.assignedTo.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t("Unassigned")}</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(client.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex shrink-0 items-center justify-center rounded-lg h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                          {t("View")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          {t("Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("Showing {n}–{m} of {total}", { n: (currentPage - 1) * 20 + 1, m: Math.min(currentPage * 20, total), total })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage <= 1}
              onClick={() => goPage(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
              const p = start + i
              if (p > totalPages) return null
              return (
                <Button
                  key={p}
                  variant={p === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => goPage(p)}
                >
                  {p}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage >= totalPages}
              onClick={() => goPage(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AddClientSheet open={showAddSheet} onOpenChange={setShowAddSheet} users={users} />
    </div>
  )
}
