/**
 * @file API-маршрут для еженедельных cron-задач (дайджест задач).
 *
 * @description Собирает задачи на текущую неделю для каждого активного
 * пользователя и отправляет дайджест по email.
 * В текущей реализации только подсчитывает задачи (отправка email
 * будет добавлена позже). Требует заголовок Authorization с CRON_SECRET.
 *
 * @route POST /api/cron/weekly
 * @exports POST — запуск еженедельного дайджеста.
 */

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { addDays, startOfWeek, endOfWeek } from "date-fns"
import { sendTaskAssignedEmail } from "@/lib/mail"

const CRON_SECRET = process.env.CRON_SECRET || ""

/**
 * Формирует еженедельный дайджест задач для всех пользователей.
 *
 * @param {Request} request - HTTP-запрос с заголовком Authorization.
 * @returns {Promise<NextResponse>}
 * - 200: { success, digestTasksCount } — количество задач в дайджесте.
 * - 401: { error } — неверный секрет.
 *
 * @sideeffect
 * - Выполняет запросы к БД (user.findMany, task.findMany для каждого пользователя).
 * - В будущем будет отправлять email через sendTaskAssignedEmail.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const users = await db.user.findMany({ select: { id: true, name: true, email: true } })
  let sent = 0

  for (const user of users) {
    const tasks = await db.task.findMany({
      where: { assigneeId: user.id, dueDate: { gte: weekStart, lte: weekEnd }, status: { notIn: ["DONE", "CANCELLED"] } },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    })

    if (tasks.length > 0 && user.email) {
      sent += tasks.length
    }
  }

  return NextResponse.json({ success: true, digestTasksCount: sent })
}
