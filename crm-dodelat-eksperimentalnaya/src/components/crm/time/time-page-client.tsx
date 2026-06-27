"use client"

/**
 * TimePageClient — страница учёта времени с недельным и табличным
 * представлением.
 *
 * Страница: /dashboard/time.
 * Позволяет просматривать записи времени по неделям (календарь) или
 * списком, быстро добавлять/редактировать/удалять записи.
 *
 * @param {Object} props
 * @param {Entry[]} props.entries — все записи времени
 * @param {User[]} props.users — пользователи
 * @param {Task[]} props.tasks — задачи (для выбора)
 * @param {string} props.currentUserId — ID текущего пользователя
 * @param {string} props.currentUserRole — роль (для прав редактирования)
 *
 * Server actions: logTime, updateTimeEntry, deleteTimeEntry.
 *
 * Состояния:
 * - view: "week" | "list"
 * - currentWeek: выбранная неделя
 * - filterProject, filterBillable
 * - editingEntry: редактирование записи (Dialog)
 * - deletingEntryId: подтверждение удаления
 * - Empty states: "No entries"
 */

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, eachDayOfInterval } from "date-fns"
import { toast } from "sonner"
import { ChevronLeft, ChevronRight, CalendarDays, List, Plus, Loader2, Pencil, Trash2 } from "lucide-react"

import { t, translateStatus } from "@/lib/translations"
import { logTime, updateTimeEntry, deleteTimeEntry } from "@/lib/actions/tasks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"

type Entry = any
type User = { id: string; name: string | null }
type Task = { id: string; title: string }

interface Props { entries: Entry[]; users: User[]; tasks: Task[]; currentUserId: string; currentUserRole: string }

/**
 * TimePageClient — страница учёта времени.
 *
 * Шаги (Week view):
 * 1. Стрелки навигации по неделям.
 * 2. 7 карточек-дней с суммами часов и списком задач.
 * 3. Кнопка "Log Time" открывает Sheet с формой.
 *
 * Шаги (List view):
 * 1. Фильтры по проекту и билльности.
 * 2. Таблица записей с кнопками Edit/Delete.
 * 3. Dialog редактирования и подтверждения удаления.
 *
 * Побочные эффекты: toast, router.refresh().
 *
 * @param entries — записи времени
 * @param users — пользователи
 * @param tasks — задачи
 * @param currentUserId — текущий пользователь
 * @param currentUserRole — роль
 * @returns JSX — страница времени
 */
export function TimePageClient({ entries, users, tasks, currentUserId, currentUserRole }: Props) {
  const router = useRouter()
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [view, setView] = useState<"week" | "list">("week")
  const [filterProject, setFilterProject] = useState("")
  const [filterBillable, setFilterBillable] = useState("")
  const [quickTaskId, setQuickTaskId] = useState("")
  const [quickHours, setQuickHours] = useState("")
  const [quickDesc, setQuickDesc] = useState("")
  const [quickBillable, setQuickBillable] = useState("true")
  const [saving, setSaving] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)
  const [editHours, setEditHours] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editBillable, setEditBillable] = useState("true")
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const canModify = useCallback((entryUserId: string) => {
    return entryUserId === currentUserId || ["OWNER", "PM"].includes(currentUserRole)
  }, [currentUserId, currentUserRole])

  function openEdit(entry: Entry) {
    setEditingEntry(entry)
    setEditHours(String(Number(entry.hours)))
    setEditDesc(entry.description || "")
    setEditDate(format(new Date(entry.date), "yyyy-MM-dd"))
    setEditBillable(entry.billable ? "true" : "false")
  }

  async function handleUpdate() {
    if (!editingEntry) return
    if (!editHours || parseFloat(editHours) <= 0) { toast.error(t("Invalid hours")); return }
    setSavingEdit(true)
    const fd = new FormData()
    fd.set("id", editingEntry.id)
    fd.set("hours", editHours)
    fd.set("description", editDesc)
    fd.set("date", editDate)
    fd.set("billable", editBillable)
    const result = await updateTimeEntry(fd)
    setSavingEdit(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(t("Time entry updated"))
    setEditingEntry(null)
    router.refresh()
  }

  async function handleDelete() {
    if (!deletingEntryId) return
    setDeleting(true)
    const result = await deleteTimeEntry(deletingEntryId)
    setDeleting(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(t("Time entry deleted"))
    setDeletingEntryId(null)
    router.refresh()
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const weekEntries = useMemo(() => {
    return entries.filter((e: Entry) => {
      const d = new Date(e.date)
      return d >= weekStart && d <= weekEnd
    })
  }, [entries, weekStart, weekEnd])

  const filteredEntries = useMemo(() => {
    let list = entries
    if (filterProject) list = list.filter((e: Entry) => e.task?.projectId === filterProject)
    if (filterBillable === "billable") list = list.filter((e: Entry) => e.billable)
    if (filterBillable === "non-billable") list = list.filter((e: Entry) => !e.billable)
    return list
  }, [entries, filterProject, filterBillable])

  const dayTotal = useMemo(() => {
    const map: Record<string, number> = {}
    days.forEach((d) => map[format(d, "yyyy-MM-dd")] = 0)
    weekEntries.forEach((e: Entry) => {
      const key = format(new Date(e.date), "yyyy-MM-dd")
      if (map[key] !== undefined) map[key] += Number(e.hours)
    })
    return map
  }, [days, weekEntries])

  const weekTotal = Object.values(dayTotal).reduce((s, v) => s + v, 0)

  async function handleQuickAdd() {
    if (!quickTaskId || !quickHours) { toast.error(t("Fill task and hours")); return }
    setSaving(true)
    const fd = new FormData()
    fd.set("taskId", quickTaskId)
    fd.set("hours", quickHours)
    fd.set("description", quickDesc)
    fd.set("billable", quickBillable)
    fd.set("date", format(new Date(), "yyyy-MM-dd"))
    const result = await logTime(fd)
    setSaving(false)
    if (result.error) { toast.error(t("Failed to log time")); return }
    toast.success(t("Time logged"))
    setQuickHours(""); setQuickDesc("")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("Time Tracking")}</h1>
        <Sheet>
          <SheetTrigger render={<Button />}><Plus className="mr-2 h-4 w-4" />{t("Log Time")}</SheetTrigger>
          <SheetContent>
            <SheetHeader><SheetTitle>{t("Log Time - sheet title")}</SheetTitle><SheetDescription>{t("Quick add a time entry")}</SheetDescription></SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("Task")}</Label>
                <Select onValueChange={(v: any) => setQuickTaskId(v || "")}>
                  <SelectTrigger><SelectValue placeholder={t("Select task")} /></SelectTrigger>
                  <SelectContent>{tasks.map((t: Task) => (<SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("Hours")}</Label>
                <Input type="number" step="0.25" min="0.25" value={quickHours} onChange={(e) => setQuickHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("Description")}</Label>
                <Input value={quickDesc} onChange={(e) => setQuickDesc(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("Billable")}</Label>
                <Select value={quickBillable} onValueChange={(v: any) => setQuickBillable(v || "true")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("Billable")}</SelectItem>
                    <SelectItem value="false">{t("Non-billable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleQuickAdd} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Log Time")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2">
        <Tabs value={view} onValueChange={(v: any) => setView(v)}>
          <TabsList>
            <TabsTrigger value="week"><CalendarDays className="mr-2 h-4 w-4" />{t("Week - tab")}</TabsTrigger>
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />{t("List - tab")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "week" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-medium">
              {format(weekStart, "MMM d")} — {format(weekEnd, "MMM d, yyyy")}
              <span className="text-muted-foreground ml-2">({weekTotal.toFixed(1)}h)</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayEntries = weekEntries.filter((e: Entry) => format(new Date(e.date), "yyyy-MM-dd") === key)
              const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
              return (
                <Card key={key} className={isToday ? "ring-2 ring-primary" : ""}>
                  <CardContent className="p-3 space-y-1">
                    <p className="text-xs font-medium text-center">{format(day, "EEE")}</p>
                    <p className="text-xs text-center text-muted-foreground">{format(day, "MMM d")}</p>
                    <p className="text-sm font-bold text-center">{dayTotal[key]?.toFixed(1) || "0"}h</p>
                    <div className="space-y-1 mt-1">
                      {dayEntries.slice(0, 3).map((e: Entry) => (
                        <div key={e.id} className="text-[10px] bg-muted rounded px-1 py-0.5 truncate">
                          {e.task?.title || t("Unknown")} — {Number(e.hours).toFixed(1)}h
                        </div>
                      ))}
                      {dayEntries.length > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center">+{dayEntries.length - 3} more</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Select value={filterProject} onValueChange={(v: any) => setFilterProject(v || "")}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder={t("All projects")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">{t("All")}</SelectItem>
                {users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterBillable} onValueChange={(v: any) => setFilterBillable(v || "")}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder={t("All entries")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">{t("All")}</SelectItem>
                <SelectItem value="billable">{t("Billable")}</SelectItem>
                <SelectItem value="non-billable">{t("Non-billable")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead>{t("Task")}</TableHead>
                  <TableHead>{t("Hours")}</TableHead>
                  <TableHead>{t("Type - column")}</TableHead>
                  <TableHead>{t("Description")}</TableHead>
                  <TableHead className="w-[80px]">{t("Actions - column")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("No entries")}</TableCell></TableRow>
                )}
                {filteredEntries.map((e: Entry) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{format(new Date(e.date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-sm">{e.task?.title || "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{Number(e.hours).toFixed(1)}h</TableCell>
                    <TableCell><Badge variant={e.billable ? "default" : "outline"}>{e.billable ? translateStatus("Billable") : translateStatus("Non-billable")}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.description || "—"}</TableCell>
                    <TableCell>
                      {canModify(e.userId) && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">{t("Edit")}</span>
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeletingEntryId(e.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            <span className="sr-only">{t("Delete")}</span>
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      <Dialog open={!!editingEntry} onOpenChange={(open) => { if (!open) setEditingEntry(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Edit Time Entry")}</DialogTitle>
            <DialogDescription>{t("Update the time entry details")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("Task")}</Label>
              <Select value={editingEntry?.taskId || ""} disabled>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tasks.map((t: Task) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Hours")}</Label>
              <Input type="number" step="0.25" min="0.25" value={editHours} onChange={(e) => setEditHours(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("Date")}</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("Description")}</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("Billable")}</Label>
              <Select value={editBillable} onValueChange={(v: any) => setEditBillable(v || "true")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t("Billable")}</SelectItem>
                  <SelectItem value="false">{t("Non-billable")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>{t("Cancel")}</Button>
            <Button onClick={handleUpdate} disabled={savingEdit}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingEntryId} onOpenChange={(open) => { if (!open) setDeletingEntryId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Delete Time Entry")}</DialogTitle>
            <DialogDescription>
              {t("Are you sure you want to delete this time entry? This action cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingEntryId(null)}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
