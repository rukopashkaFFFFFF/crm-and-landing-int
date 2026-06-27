/**
 * @file API-маршрут смены пароля.
 *
 * @description Позволяет аутентифицированному пользователю сменить пароль.
 * 1. Проверяет сессию.
 * 2. Валидирует currentPassword и newPassword.
 * 3. Находит пользователя в БД, сверяет текущий пароль.
 * 4. Хэширует новый пароль и обновляет запись в БД.
 *
 * @route POST /api/auth/change-password
 * @exports POST — асинхронный обработчик.
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { verifyPassword, hashPassword } from "@/lib/auth-helpers"

/**
 * Меняет пароль текущего пользователя.
 *
 * @param {Request} request - HTTP-запрос с JSON-телом { currentPassword, newPassword }.
 * @returns {Promise<NextResponse>}
 * - 200: { message } — пароль изменён.
 * - 400: { error } — невалидные данные или неверный текущий пароль.
 * - 401: { error } — не аутентифицирован.
 *
 * @sideeffect
 * - Обновляет поле password у пользователя в БД.
 * - Логирует ошибки в console.error.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required" }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: "Account has no password set. Use OAuth provider." }, { status: 400 })
    }

    if (!verifyPassword(currentPassword, user.password)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashPassword(newPassword) },
    })

    return NextResponse.json({ message: "Password changed successfully" })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
