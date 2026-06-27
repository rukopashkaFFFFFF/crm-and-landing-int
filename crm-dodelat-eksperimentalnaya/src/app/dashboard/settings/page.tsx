/**
 * @file Страница настроек (Settings).
 *
 * @description Отображает панель настроек с вкладками:
 * - Profile: информация о текущем пользователе.
 * - Team: управление участниками команды (только OWNER/PM).
 * - Account: опасная зона (удаление аккаунта — в разработке).
 * - Automations: управление правилами автоматизации.
 * - Webhooks: управление вебхуками (только OWNER).
 * Загружает данные: teamMembers, webhooks, automationRules.
 *
 * @route GET /dashboard/settings
 * @exports SettingsPage — серверный компонент.
 * @exports metadata — SEO-метаданные.
 */

import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { t } from "@/lib/translations"
import { SettingsPageClient } from "./settings-page-client"

export const metadata: Metadata = { title: t("Settings | CRM") }

/**
 * Серверная страница настроек.
 *
 * @returns {Promise<JSX.Element>} Компонент SettingsPageClient с данными.
 *
 * @sideeffect
 * - Проверяет сессию.
 * - Загружает teamMembers, webhooks, automationRules из БД.
 * - Передаёт текущего пользователя (currentUser).
 */
export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const [teamMembers, webhooks, automationRules] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        active: true,
        createdAt: true,
      },
    }),
    db.webhook.findMany({
      orderBy: { createdAt: "desc" },
    }),
    db.automationRule.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ])

  return (
    <SettingsPageClient
      currentUser={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
        role: session.user.role,
      }}
      teamMembers={JSON.parse(JSON.stringify(teamMembers))}
      webhooks={JSON.parse(JSON.stringify(webhooks))}
      automationRules={JSON.parse(JSON.stringify(automationRules))}
    />
  )
}
