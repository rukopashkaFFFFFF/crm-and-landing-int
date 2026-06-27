/**
 * @ API-маршрут регистрации нового сотрудника по инвайт-токену.
 *
 * @description Обрабатывает POST-запросы для создания аккаунта.
 * 1. Валидирует тело запроса (name, password, token) через registerSchema.
 * 2. Проверяет invite-токен в БД (существует, не использован, не истёк).
 * 3. Проверяет, что email из токена ещё не зарегистрирован.
 * 4. Хэширует пароль и создаёт пользователя в БД.
 * 5. Помечает токен как использованный (usedAt).
 *
 * @route POST /api/auth/register
 * @exports POST — асинхронный обработчик.
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth-helpers"
import { registerSchema } from "@/lib/validations"

/**
 * Создаёт нового пользователя по инвайт-токену.
 *
 * @param {Request} request - HTTP-запрос с JSON-телом { name, password, token }.
 * @returns {Promise<NextResponse>}
 * - 200: { message, userId } — успешная регистрация.
 * - 400: { error } — невалидные данные, истёкший или использованный токен.
 * - 409: { error } — пользователь с таким email уже существует.
 * - 500: { error } — внутренняя ошибка сервера.
 *
 * @sideeffect
 * - Создаёт запись User в БД.
 * - Обновляет InviteToken (устанавливает usedAt).
 * - При ошибке логирует в console.error.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, password, token } = parsed.data

    const invite = await db.inviteToken.findUnique({
      where: { token },
    })

    if (!invite) {
      return NextResponse.json({ error: "Invalid or expired invite token" }, { status: 400 })
    }

    if (invite.usedAt) {
      return NextResponse.json({ error: "This invite has already been used" }, { status: 400 })
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json({ error: "Invite token has expired" }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({
      where: { email: invite.email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    const hashedPassword = hashPassword(password)

    const user = await db.user.create({
      data: {
        name,
        email: invite.email,
        password: hashedPassword,
        role: invite.role,
        active: true,
      },
    })

    await db.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    })

    return NextResponse.json({
      message: "Account created successfully",
      userId: user.id,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
