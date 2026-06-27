"use client"

/**
 * ClientDetailClient — детальная страница клиента.
 *
 * Страница: /dashboard/clients/[id].
 * Используется для просмотра всей информации о клиенте: контакты, заметки,
 * история сделок, проекты, активность, счета.
 *
 * @param {Object} props
 * @param {Client} props.client — объект клиента (полный, со связанными
 *   данными: projects, leads, invoices, activities).
 * @param {User[]} props.users — список пользователей системы (для отображения
 *   имени назначенного менеджера).
 *
 * Server actions: deleteClient (удаление с редиректом),
 *   updateClientNotes (сохранение заметок).
 *
 * Состояния:
 * - Просмотр контактной информации и блокнота
 * - Режим удаления (подтверждение через Dialog)
 * - Сохранение заметок (loader на кнопке, disabled)
 * - Empty states для табов Projects, Activity, Invoices
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Pencil,
  Trash2,
  FileText,
  MoreHorizontal,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  User,
} from "lucide-react"
import { toast } from "sonner"

import { deleteClient, updateClientNotes } from "@/lib/actions/clients"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { t, translateStatus } from "@/lib/translations"

type Client = any
type User = { id: string; name: string | null }

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  LEAD: "secondary",
  ACTIVE: "default",
  INACTIVE: "outline",
  CHURNED: "destructive",
}

/**
 * getInitials — возвращает первые буквы имени (для аватара).
 * @param {string} name — полное имя
 * @returns {string} до 2 заглавных букв
 */
function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
}

interface Props {
  client: Client
  users: User[]
}

/**
 * ClientDetailClient — компонент детальной страницы клиента.
 *
 * Шаги:
 * 1. Аватар, имя, статус, компания — отображаются в хедере.
 * 2. Dropdown-меню с действиями (редактировать, удалить).
 * 3. Табы: Overview (контакты, заметки, сделки), Projects, Activity, Invoices.
 * 4. Кнопка удаления открывает диалог подтверждения -> deleteClient -> router.push.
 * 5. Заметки редактируются inline с сохранением через updateClientNotes.
 *
 * Побочные эффекты:
 * - toast.success/error при сохранении/удалении
 * - router.push("/dashboard/clients") после удаления
 *
 * @param client — объект клиента
 * @param users — список пользователей (для assignedTo)
 * @returns JSX — детальная страница клиента
 */
export function ClientDetailClient({ client, users }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState(client.notes || "")
  const [savingNotes, setSavingNotes] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  /**
   * handleSaveNotes — сохраняет заметки клиента.
   * Вызывает updateClientNotes(client.id, notes).
   * Побочные эффекты: тост об успехе/ошибке.
   */
  async function handleSaveNotes() {
    setSavingNotes(true)
    const result = await updateClientNotes(client.id, notes)
    setSavingNotes(false)
    if (result.error) {
      toast.error(t("Failed to save notes"))
      return
    }
    toast.success(t("Notes saved"))
  }

  /**
   * handleDelete — удаляет клиента с подтверждением.
   * Вызывает deleteClient(client.id).
   * Побочные эффекты: тост, редирект на /dashboard/clients.
   */
  async function handleDelete() {
    const result = await deleteClient(client.id)
    if (result.error) {
      toast.error(t("Failed to delete client"))
      return
    }
    toast.success(t("Client deleted"))
    router.push("/dashboard/clients")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{getInitials(client.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <Badge variant={statusColors[client.status] || "outline"}>
                {translateStatus(client.status)}
              </Badge>
            </div>
            {client.company && (
              <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                <Building2 className="h-3.5 w-3.5" />
                {client.company}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("Actions")}</DropdownMenuLabel>
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" /> {t("Edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDelete(true)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {t("Delete")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="projects">{t("Projects ({count})", { count: client.projects?.length || 0 })}</TabsTrigger>
          <TabsTrigger value="activity">{t("Activity")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("Invoices ({count})", { count: client.invoices?.length || 0 })}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("Contact Information")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
                  </div>
                )}
                {client.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={client.website} target="_blank" rel="noreferrer" className="hover:underline">
                      {client.website}
                    </a>
                  </div>
                )}
                {client.country && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {client.country}
                  </div>
                )}
                {client.assignedTo && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t("Assigned to:")} {client.assignedTo.name}
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {t("Source:")} {translateStatus(client.source)}
                </div>
                {client.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("Notes")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("Add internal notes...")}
                  rows={6}
                />
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={savingNotes || notes === (client.notes || "")}
                >
                  {savingNotes ? t("Saving...") : t("Save Notes")}
                </Button>
              </CardContent>
            </Card>
          </div>

          {client.leads?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("Deal History")}</CardTitle>
              </CardHeader>
              <CardContent>
                {client.leads.map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between py-2">
                    <div>
                      <Badge>{translateStatus(lead.stage)}</Badge>
                      {lead.value && (
                        <span className="ml-2 text-sm font-medium">
                          ${Number(lead.value).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {lead.createdAt && format(new Date(lead.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          {(!client.projects || client.projects.length === 0) ? (
            <p className="text-muted-foreground py-8 text-center">{t("No projects yet")}</p>
          ) : (
            <div className="space-y-3">
              {client.projects.map((project: any) => (
                <Card key={project.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        PM: {project.pm?.name || t("Unassigned")}
                      </p>
                    </div>
                    <Badge>{translateStatus(project.status)}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          {(!client.activities || client.activities.length === 0) ? (
            <p className="text-muted-foreground py-8 text-center">{t("No activity recorded")}</p>
          ) : (
            <div className="space-y-4">
              {client.activities.map((activity: any) => (
                <div key={activity.id} className="flex gap-4 text-sm">
                  <Avatar className="h-8 w-8 mt-0.5">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(activity.user?.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{activity.user?.name || t("System")}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{activity.type}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          {(!client.invoices || client.invoices.length === 0) ? (
            <p className="text-muted-foreground py-8 text-center">{t("No invoices yet")}</p>
          ) : (
            <div className="space-y-3">
              {client.invoices.map((invoice: any) => (
                <Card key={invoice.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">{invoice.number}</p>
                      <p className="text-sm text-muted-foreground">
                        ${Number(invoice.total).toLocaleString()} — Due {invoice.dueDate ? format(new Date(invoice.dueDate), "MMM d, yyyy") : "N/A"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        invoice.status === "PAID" ? "default" :
                        invoice.status === "OVERDUE" ? "destructive" :
                        "secondary"
                      }
                    >
                      {translateStatus(invoice.status)}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Delete Client")}</DialogTitle>
            <DialogDescription>
              {t("Are you sure? This will permanently delete {name} and all associated data.", { name: client.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>{t("Cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t("Delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
