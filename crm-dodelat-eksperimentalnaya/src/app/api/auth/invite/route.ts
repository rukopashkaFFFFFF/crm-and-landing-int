/**
 * @ API-маршрут отправки приглашения новому сотруднику.
 *
 * @description Обрабатывает POST-запросы для создания инвайт-токена и отправки
 * пригласительного письма. Доступен только пользователям с правом "team.manage".
 * 1. Проверяет аутентификацию и права (canAccess).
 * 2. Валидирует тело запроса (email, role).
 * 3. Проверяет, что email ещё не занят и нет активного инвайта.
 * 4. Создаёт InviteToken в БД с токеном и сроком действия.
 * 5. Отправляет email с ссылкой на регистрацию.
 *
 * @route POST /api/auth/invite
 * @exports POST — асинхронный обработчик.
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateInviteToken, getInviteExpiry } from "@/lib/auth-helpers"
import { inviteSchema } from "@/lib/validations"
import { sendInviteEmail } from "@/lib/mail"
import { canAccess } from "@/lib/permissions"

/**
 * Отправляет приглашение новому участнику команды.
 *
 * @param {Request} request - HTTP-запрос с JSON-телом { email, role }.
 * @returns {Promise<NextResponse>}
 * - 200: { message } — приглашение отправлено.
 * - 400: { error } — невалидные данные.
 * - 403: { error } — недостаточно прав.
 * - 409: { error } — пользователь или активный инвайт уже существует.
 * - 500: { error } — внутренняя ошибка сервера.
 *
 * @sideeffect
 * - Создаёт запись InviteToken в БД.
 * - Отправляет email через sendInviteEmail.
 * - Логирует ошибки в console.error.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || !canAccess(session.user.role, "team", "manage")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, role } = parsed.data

    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    const existingInvite = await db.inviteToken.findFirst({
      where: { email, usedAt: null, expiresAt: { gte: new Date() } },
    })

    if (existingInvite) {
      return NextResponse.json({ error: "An active invite already exists for this email" }, { status: 409 })
    }

    const token = generateInviteToken()
    const expiresAt = getInviteExpiry()

    await db.inviteToken.create({
      data: {
        email,
        token,
        role,
        invitedById: session.user.id,
        expiresAt,
      },
    })

    const inviteLink = `${process.env.NEXTAUTH_URL}/register?token=${token}`
    await sendInviteEmail(email, inviteLink, session.user.name ?? "A team member")

    return NextResponse.json({ message: "Invitation sent successfully" })
  } catch (error) {
    console.error("Invite error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
