/**
 * @file API-маршрут генерации токена клиентского портала.
 *
 * @description Создаёт одноразовый токен для доступа клиента к порталу проекта.
 * Доступно только пользователям с правом "projects.manage".
 * 1. Проверяет аутентификацию и права.
 * 2. Находит проект с клиентом.
 * 3. Генерирует криптостойкий токен (48 hex-символов).
 * 4. Сохраняет токен в БД (ClientPortalToken) со сроком 90 дней.
 * 5. Отправляет клиенту email со ссылкой на портал.
 *
 * @route POST /api/portal/generate
 * @exports POST — асинхронный обработчик.
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { canAccess } from "@/lib/permissions"
import { randomBytes } from "crypto"
import { addDays } from "date-fns"
import { sendPortalLinkEmail } from "@/lib/mail"

/**
 * Генерирует токен доступа к порталу для клиента проекта.
 *
 * @param {Request} request - HTTP-запрос с JSON-телом { projectId }.
 * @returns {Promise<NextResponse>}
 * - 200: { token, url, expiresAt } — данные токена.
 * - 400: { error } — нет projectId или email клиента.
 * - 403: { error } — недостаточно прав.
 * - 404: { error } — проект не найден.
 *
 * @sideeffect
 * - Создаёт запись ClientPortalToken в БД.
 * - Отправляет email через sendPortalLinkEmail.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "projects", "manage")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { projectId } = await request.json()
  if (!projectId) return NextResponse.json({ error: "Project ID required" }, { status: 400 })

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { client: { select: { id: true, name: true, email: true } } },
  })
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })
  if (!project.client.email) return NextResponse.json({ error: "Client has no email" }, { status: 400 })

  const token = randomBytes(24).toString("hex")
  const expiresAt = addDays(new Date(), 90)

  await db.clientPortalToken.create({
    data: {
      clientId: project.clientId,
      projectId: project.id,
      token,
      expiresAt,
    },
  })

  const portalUrl = `${process.env.NEXTAUTH_URL}/client-portal/${token}`
  await sendPortalLinkEmail(project.client.email, project.client.name, portalUrl, project.name)

  return NextResponse.json({ token, url: portalUrl, expiresAt })
}
