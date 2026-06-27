/**
 * @file API-маршрут для ручного или автоматического запуска всех cron-задач.
 *
 * @description Выполняет все фоновые задачи одновременно:
 * - Проверка просроченных задач (checkOverdueTasks).
 * - Проверка просроченных инвойсов (checkOverdueInvoices).
 * - Проверка "зависших" лидов (checkStaleLeads).
 * - Проверка предстоящих дедлайнов (checkUpcomingDeadlines).
 * Требует заголовок Authorization с CRON_SECRET.
 *
 * @route POST /api/cron — запуск всех задач.
 * @route GET /api/cron — проверка статуса (ok + список задач).
 * @exports POST — запуск всех задач.
 * @exports GET — проверка статуса.
 */

import { NextResponse } from "next/server"
import { checkOverdueTasks, checkOverdueInvoices, checkStaleLeads, checkUpcomingDeadlines } from "@/lib/jobs/runner"

const CRON_SECRET = process.env.CRON_SECRET || ""

/**
 * Проверяет авторизацию по заголовку Authorization.
 *
 * @param {Request} request - HTTP-запрос.
 * @returns {Promise<boolean>} true, если Bearer-токен совпадает с CRON_SECRET.
 */
async function authenticate(request: Request) {
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${CRON_SECRET}`
}

/**
 * Запускает все фоновые cron-задачи.
 *
 * @param {Request} request - HTTP-запрос с заголовком Authorization.
 * @returns {Promise<NextResponse>}
 * - 200: { success, results } — результаты всех задач.
 * - 401: { error } — неверный секрет.
 */
export async function POST(request: Request) {
  if (!await authenticate(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const results = await Promise.all([
    checkOverdueTasks().catch(e => ({ error: String(e) })),
    checkOverdueInvoices().catch(e => ({ error: String(e) })),
    checkStaleLeads().catch(e => ({ error: String(e) })),
    checkUpcomingDeadlines().catch(e => ({ error: String(e) })),
  ])
  return NextResponse.json({ success: true, results })
}

/**
 * Возвращает статус cron-системы и список доступных задач.
 *
 * @param {Request} request - HTTP-запрос с заголовком Authorization.
 * @returns {Promise<NextResponse>}
 * - 200: { status, cronJobs[] }.
 * - 401: { error } — неверный секрет.
 */
export async function GET(request: Request) {
  if (!await authenticate(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return NextResponse.json({ status: "ok", cronJobs: ["overdue-tasks", "overdue-invoices", "stale-leads", "upcoming-deadlines"] })
}
