/**
 * @file Клиентский компонент страницы настроек (SettingsPageClient).
 *
 * @description Многофункциональная страница с вкладками:
 * - Profile: отображение имени, email, роли + смена пароля.
 * - Team: список участников команды + приглашение нового (только OWNER/PM).
 * - Account: опасная зона (заглушка).
 * - Automations: CRUD правил автоматизации (создание, включение/отключение, удаление).
 * - Webhooks: CRUD вебхуков (только OWNER).
 *
 * Использует server actions (createRule, deleteRule, toggleRule,
 * createWebhook, deleteWebhook, testWebhook) и API-маршрут change-password.
 *
 * @exports SettingsPageClient — компонент настроек.
 */

"use client"

import { useState } from "react"
import { User, Mail, Shield, UserPlus, KeyRound, AlertTriangle, Webhook, Cable, Trash2, Play, Pause, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { t, translateEnum } from "@/lib/translations"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/hooks/use-current-user"
import { useRole } from "@/hooks/use-role"
import { getRoleBadgeVariant, getRoleLabel } from "@/lib/permissions"
import { createRule, deleteRule, toggleRule } from "@/lib/actions/automations"
import { createWebhook, deleteWebhook, testWebhook } from "@/lib/actions/webhooks"

type TeamMember = {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  active: boolean
  createdAt: string
}

type CurrentUser = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
}

type AutomationRule = {
  id: string
  name: string
  description: string | null
  trigger: string
  conditions: any
  actions: any
  active: boolean
  lastRunAt: string | null
  runCount: number
  createdAt: string
  updatedAt: string
}

const TRIGGER_OPTIONS = [
  { value: "task.overdue", label: t("Task Overdue") },
  { value: "lead.stage_changed", label: t("Lead Stage Changed") },
  { value: "invoice.overdue", label: t("Invoice Overdue") },
  { value: "project.status_changed", label: t("Project Status Changed") },
]

const TRIGGER_LABEL_MAP: Record<string, string> = {
  "task.overdue": t("Task Overdue"),
  "lead.stage_changed": t("Lead Stage Changed"),
  "invoice.overdue": t("Invoice Overdue"),
  "project.status_changed": t("Project Status Changed"),
}

type WebhookItem = {
  id: string
  url: string
  events: string[]
  active: boolean
  secret: string | null
  lastCall: string | null
  lastStatus: number | null
  lastResponse: string | null
  createdAt: string
}

interface Props {
  currentUser: CurrentUser
  teamMembers: TeamMember[]
  webhooks: WebhookItem[]
  automationRules: AutomationRule[]
}

/**
 * Возвращает инициалы из имени (макс 2 символа).
 *
 * @param {string | null | undefined} name - Полное имя пользователя.
 * @returns {string} Инициалы в верхнем регистре.
 */
function getInitials(name?: string | null) {
  return (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

/**
 * Компонент страницы настроек с вкладками.
 *
 * @param {Props} props - currentUser, teamMembers, webhooks, automationRules.
 * @returns {JSX.Element} Полноценная страница настроек.
 *
 * @sideeffect
 * - Использует хуки useCurrentUser, useRole для определения прав.
 * - Позволяет менять пароль, приглашать участников, управлять
 *   вебхуками и правилами автоматизации через server actions.
 */
export function SettingsPageClient({ currentUser, teamMembers: initialTeamMembers, webhooks: initialWebhooks, automationRules: initialRules }: Props) {
  const sessionUser = useCurrentUser()
  const { isOwner, isPM, role } = useRole()
  const canManageTeam = isOwner || isPM
  const canManageWebhooks = isOwner

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("DEVELOPER")
  const [sendingInvite, setSendingInvite] = useState(false)

  const [webhooks, setWebhooks] = useState(initialWebhooks)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookEvents, setWebhookEvents] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")
  const [creatingWebhook, setCreatingWebhook] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null)

  const [automationRules, setAutomationRules] = useState(initialRules)
  const [ruleName, setRuleName] = useState("")
  const [ruleTrigger, setRuleTrigger] = useState("task.overdue")
  const [ruleDescription, setRuleDescription] = useState("")
  const [ruleActions, setRuleActions] = useState('[{"type":"send_notification","title":"Automation Notification","message":"","notificationType":"INFO"}]')
  const [creatingRule, setCreatingRule] = useState(false)
  const [togglingRule, setTogglingRule] = useState<string | null>(null)

  /**
   * Меняет пароль текущего пользователя через API.
   *
   * @param {React.FormEvent} e - Событие формы.
   * @returns {Promise<void>}
   *
   * @sideeffect
   * - Валидирует совпадение паролей и длину.
   * - Отправляет POST /api/auth/change-password.
   * - Показывает toast при успехе/ошибке.
   */
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t("Passwords do not match"))
      return
    }
    if (newPassword.length < 8) {
      toast.error(t("Password must be at least 8 characters"))
      return
    }
    setChangingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t("Failed to change password"))
        return
      }
      toast.success(t("Password changed successfully"))
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error(t("Something went wrong"))
    } finally {
      setChangingPassword(false)
    }
  }

  /**
   * Отправляет приглашение новому участнику команды.
   *
   * @param {React.FormEvent} e - Событие формы.
   * @returns {Promise<void>}
   *
   * @sideeffect
   * - Вызывает POST /api/auth/invite с email и role.
   * - Показывает toast при успехе/ошибке.
   */
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail) {
      toast.error(t("Email is required"))
      return
    }
    setSendingInvite(true)
    try {
      const res = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t("Failed to send invite"))
        return
      }
      toast.success(t("Invitation sent successfully"))
      setInviteEmail("")
    } catch {
      toast.error(t("Something went wrong"))
    } finally {
      setSendingInvite(false)
    }
  }

  /**
   * Создаёт новый вебхук.
   *
   * @param {React.FormEvent} e - Событие формы.
   * @returns {Promise<void>}
   *
   * @sideeffect Вызывает server action createWebhook.
   */
  async function handleCreateWebhook(e: React.FormEvent) {
    e.preventDefault()
    if (!webhookUrl || !webhookEvents) {
      toast.error(t("URL and events are required"))
      return
    }
    setCreatingWebhook(true)
    try {
      const formData = new FormData()
      formData.set("url", webhookUrl)
      formData.set("events", webhookEvents)
      if (webhookSecret) formData.set("secret", webhookSecret)
      const result = await createWebhook(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(t("Webhook created"))
      setWebhookUrl("")
      setWebhookEvents("")
      setWebhookSecret("")
    } catch {
      toast.error(t("Something went wrong"))
    } finally {
      setCreatingWebhook(false)
    }
  }

  /**
   * Удаляет вебхук по ID.
   *
   * @param {string} id - ID вебхука.
   * @returns {Promise<void>}
   *
   * @sideeffect
   * - Вызывает server action deleteWebhook.
   * - Удаляет вебхук из локального состояния.
   */
  async function handleDeleteWebhook(id: string) {
    const result = await deleteWebhook(id)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setWebhooks((prev) => prev.filter((w) => w.id !== id))
    toast.success(t("Webhook deleted"))
  }

  /**
   * Тестирует вебхук (отправляет тестовый запрос).
   *
   * @param {string} id - ID вебхука.
   * @returns {Promise<void>}
   */
  async function handleTestWebhook(id: string) {
    setTestingWebhook(id)
    try {
      const result = await testWebhook(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(t("Webhook test sent — status {n}", { n: result.status ?? "N/A" }))
    } catch {
      toast.error(t("Something went wrong"))
    } finally {
      setTestingWebhook(null)
    }
  }

  /**
   * Создаёт новое правило автоматизации.
   *
   * @param {React.FormEvent} e - Событие формы.
   * @returns {Promise<void>}
   *
   * @sideeffect
   * - Валидирует JSON в поле actions.
   * - Вызывает server action createRule.
   */
  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault()
    if (!ruleName || !ruleTrigger) {
      toast.error(t("Name and trigger are required"))
      return
    }
    try {
      JSON.parse(ruleActions)
    } catch {
      toast.error(t("Actions must be valid JSON"))
      return
    }
    setCreatingRule(true)
    try {
      const formData = new FormData()
      formData.set("name", ruleName)
      formData.set("trigger", ruleTrigger)
      formData.set("description", ruleDescription)
      formData.set("actions", ruleActions)
      const result = await createRule(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(t("Automation rule created"))
      setRuleName("")
      setRuleTrigger("task.overdue")
      setRuleDescription("")
      setRuleActions('[{"type":"send_notification","title":"Automation Notification","message":"","notificationType":"INFO"}]')
    } catch {
      toast.error(t("Something went wrong"))
    } finally {
      setCreatingRule(false)
    }
  }

  /**
   * Включает/отключает правило автоматизации.
   *
   * @param {string} id - ID правила.
   * @param {boolean} currentActive - Текущий статус.
   * @returns {Promise<void>}
   *
   * @sideeffect
   * - Оптимистично обновляет состояние.
   * - При ошибке откатывает изменение.
   */
  async function handleToggleRule(id: string, currentActive: boolean) {
    setTogglingRule(id)
    setAutomationRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !currentActive } : r))
    )
    try {
      const result = await toggleRule(id, !currentActive)
      if (result.error) {
        toast.error(result.error)
        setAutomationRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, active: currentActive } : r))
        )
        return
      }
    } catch {
      setAutomationRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, active: currentActive } : r))
      )
      toast.error(t("Something went wrong"))
    } finally {
      setTogglingRule(null)
    }
  }

  /**
   * Удаляет правило автоматизации с подтверждением.
   *
   * @param {string} id - ID правила.
   * @returns {Promise<void>}
   *
   * @sideeffect
   * - Подтверждение через confirm().
   * - Оптимистично удаляет из состояния.
   */
  async function handleDeleteRule(id: string) {
    if (!confirm(t("Delete this automation rule?"))) return
    const prev = automationRules
    setAutomationRules((prev) => prev.filter((r) => r.id !== id))
    try {
      const result = await deleteRule(id)
      if (result.error) {
        setAutomationRules(prev)
        toast.error(result.error)
        return
      }
      toast.success(t("Automation rule deleted"))
    } catch {
      setAutomationRules(prev)
      toast.error(t("Something went wrong"))
    }
  }

  const displayName = sessionUser?.name || currentUser.name || "User"
  const displayEmail = sessionUser?.email || currentUser.email || ""
  const displayRole = sessionUser?.role || currentUser.role

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("Settings")}</h1>
        <p className="text-muted-foreground mt-1">{t("Manage your account and team preferences")}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="size-4" />
            {t("Profile")}
          </TabsTrigger>
          <TabsTrigger value="team" disabled={!canManageTeam}>
            <Shield className="size-4" />
            {t("Team")}
          </TabsTrigger>
          <TabsTrigger value="account">
            <AlertTriangle className="size-4" />
            {t("Account")}
          </TabsTrigger>
          <TabsTrigger value="automations">
            <Cable className="size-4" />
            {t("Automations")}
          </TabsTrigger>
          <TabsTrigger value="webhooks" disabled={!canManageWebhooks}>
            <Webhook className="size-4" />
            {t("Webhooks - tab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="size-4" />
                  {t("Profile Information")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("Name")}</label>
                  <Input value={displayName} disabled />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("Email")}</label>
                  <Input value={displayEmail} disabled />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t("Role")}</label>
                  <Input value={translateEnum("Role", displayRole)} disabled />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="size-4" />
                  {t("Change Password")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("Current Password")}</label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("New Password")}</label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("Confirm Password")}</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={changingPassword}>
                    {changingPassword ? t("Changing...") : t("Change Password - button")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="size-4" />
                  {t("Team Members")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {initialTeamMembers.map((member, i) => (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center justify-between py-3",
                      i < initialTeamMembers.length - 1 && "border-b"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name || t("Unnamed")}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="size-3" />
                          {member.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(member.role as any)}>
                        {translateEnum("Role", member.role)}
                      </Badge>
                      {!member.active && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {t("Inactive")}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="size-4" />
                  {t("Invite Member")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleInvite} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("Email")}</label>
                    <Input
                      type="email"
                      placeholder={t("colleague@example.com")}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("Role")}</label>
                    <Select value={inviteRole} onValueChange={(v) => v && setInviteRole(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PM">{translateEnum("Role", "PM")}</SelectItem>
                        <SelectItem value="DEVELOPER">{translateEnum("Role", "DEVELOPER")}</SelectItem>
                        <SelectItem value="DESIGNER">{translateEnum("Role", "DESIGNER")}</SelectItem>
                        <SelectItem value="SALES">{translateEnum("Role", "SALES")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={sendingInvite}>
                    {sendingInvite ? t("Sending...") : t("Send Invitation")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-4" />
                {t("Danger Zone")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t("Account management features will be available in a future update.")}
              </p>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("Delete Account")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Permanently delete your account and all associated data.")}
                  </p>
                </div>
                <Button variant="destructive" disabled>
                  {t("Delete Account - disabled")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cable className="size-4" />
                  {t("Automation Rules")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {automationRules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("No automation rules configured yet.")}</p>
                ) : (
                  <div className="space-y-3">
                    {automationRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-start justify-between gap-4 rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{rule.name}</p>
                            <Badge variant={rule.active ? "default" : "outline"} className="text-xs">
                              {rule.active ? t("Active") : t("Inactive")}
                            </Badge>
                          </div>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground">{rule.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {TRIGGER_LABEL_MAP[rule.trigger] || rule.trigger}
                            </Badge>
                            <span>{t("Actions: {n}", { n: Array.isArray(rule.actions) ? rule.actions.length : 0 })}</span>
                            <span>{t("Runs: {n}", { n: rule.runCount })}</span>
                            {rule.lastRunAt && (
                              <span>{t("Last: {date}", { date: new Date(rule.lastRunAt).toLocaleString() })}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRule(rule.id, rule.active)}
                            disabled={togglingRule === rule.id}
                          >
                            {rule.active ? (
                              <Pause className="size-3" />
                            ) : (
                              <Play className="size-3" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cable className="size-4" />
                  {t("Add Automation Rule")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRule} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-name">{t("Name")}</Label>
                    <Input
                      id="rule-name"
                      placeholder={t("e.g. Notify on overdue task")}
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-trigger">{t("Trigger")}</Label>
                    <Select value={ruleTrigger} onValueChange={(v) => v && setRuleTrigger(v)}>
                      <SelectTrigger id="rule-trigger" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-description">{t("Description (optional)")}</Label>
                    <Input
                      id="rule-description"
                      placeholder={t("Describe when this rule should fire")}
                      value={ruleDescription}
                      onChange={(e) => setRuleDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rule-actions">{t("Actions (JSON array)")}</Label>
                    <Textarea
                      id="rule-actions"
                      rows={6}
                      value={ruleActions}
                      onChange={(e) => setRuleActions(e.target.value)}
                      className="font-mono text-xs"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("JSON array of action objects. Types: send_notification, change_status, assign_to, send_webhook.")}
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={creatingRule}>
                    {creatingRule ? t("Creating...") : t("Create Rule")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="size-4" />
                  {t("Webhooks")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {webhooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("No webhooks configured yet.")}</p>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map((wh) => (
                      <div
                        key={wh.id}
                        className="flex items-start justify-between gap-4 rounded-lg border p-3"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-medium truncate">{wh.url}</p>
                          <div className="flex flex-wrap gap-1">
                            {wh.events.map((ev) => (
                              <Badge key={ev} variant="secondary" className="text-xs">
                                {ev}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant={wh.active ? "default" : "outline"}>
                              {wh.active ? t("Active") : t("Inactive")}
                            </Badge>
                            {wh.lastCall && (
                              <span>
                                {t("Last: {date} — Status: {n}", { date: new Date(wh.lastCall).toLocaleString(), n: wh.lastStatus ?? "N/A" })}
                              </span>
                            )}
                            {wh.secret && <span className="text-muted-foreground">{t("(signed)")}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestWebhook(wh.id)}
                            disabled={testingWebhook === wh.id}
                          >
                            {testingWebhook === wh.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Play className="size-3" />
                            )}
                            {t("Test")}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteWebhook(wh.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="size-4" />
                  {t("Add Webhook")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateWebhook} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("URL")}</label>
                    <Input
                      type="url"
                      placeholder={t("https://example.com/webhook")}
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("Events (comma-separated)")}</label>
                    <Input
                      placeholder={t("client.created, project.updated")}
                      value={webhookEvents}
                      onChange={(e) => setWebhookEvents(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">{t("Secret (optional)")}</label>
                    <Input
                      type="password"
                      placeholder={t("Signing secret")}
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={creatingWebhook}>
                    {creatingWebhook ? t("Creating...") : t("Create Webhook")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
