/**
 * @file API-маршрут для получения списка активных пользователей.
 *
 * @description Возвращает массив пользователей (id, name, image),
 * отсортированных по имени. Используется для выпадающих списков
 * назначения задач, фильтрации и т.д.
 *
 * @route GET /api/users
 * @exports GET — асинхронный обработчик.
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * Возвращает список активных пользователей (id, name, image).
 *
 * @returns {Promise<NextResponse>}
 * - 200: User[] — массив пользователей.
 * - 401: { error } — не аутентифицирован.
 *
 * @sideeffect Выполняет запрос к БД (user.findMany).
 */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const users = await db.user.findMany({
    select: { id: true, name: true, image: true },
    where: { active: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(users)
}
