/**
 * @file API-маршрут для ежедневных cron-задач.
 *
 * @description Выполняет ежедневную проверку:
 * - Просроченные задачи (checkOverdueTasks).
 * - Просроченные инвойсы (checkOverdueInvoices).
 * - "Зависшие" лиды (checkStaleLeads).
 * Требует заголовок Authorization с CRON_SECRET.
 *
 * @route POST /api/cron/daily
 * @exports POST — запуск ежедневных задач.
 */

import { NextResponse } from "next/server"
import { checkOverdueTasks, checkOverdueInvoices, checkStaleLeads } from "@/lib/jobs/runner"

const CRON_SECRET = process.env.CRON_SECRET || ""

/**
 * Запускает ежедневные cron-задачи.
 *
 * @param {Request} request - HTTP-запрос с заголовком Authorization.
 * @returns {Promise<NextResponse>}
 * - 200: { success, results }.
 * - 401: { error } — неверный секрет.
 *
 * @sideeffect Выполняет 3 параллельных запроса к БД/уведомлениям.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const results = await Promise.all([
    checkOverdueTasks(),
    checkOverdueInvoices(),
    checkStaleLeads(),
  ])
  return NextResponse.json({ success: true, results })
}
