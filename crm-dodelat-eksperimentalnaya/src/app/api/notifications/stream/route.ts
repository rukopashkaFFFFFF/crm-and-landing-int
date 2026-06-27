/**
 * @file API-маршрут Server-Sent Events (SSE) для уведомлений в реальном времени.
 *
 * @description Устанавливает долгоживущее SSE-соединение для текущего пользователя.
 * Каждые 5 секунд проверяет БД на новые непрочитанные уведомления
 * (createdAt > последней проверки). Если есть новые — отправляет событие
 * с типом "new_notifications", количеством и данными уведомлений.
 *
 * @route GET /api/notifications/stream
 * @exports GET — асинхронный обработчик SSE.
 */

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * Устанавливает SSE-стрим для push-уведомлений.
 *
 * @param {Request} request - HTTP-запрос.
 * @returns {Promise<Response>}
 * - 200: Response с Content-Type "text/event-stream".
 * - 401: "Unauthorized".
 *
 * @sideeffect
 * - Создаёт ReadableStream с интервалом 5с.
 * - При каждом тике делает запрос к notification.count и notification.findMany.
 * - Закрывает стрим при отмене запроса (abort).
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()
  let lastCheck = new Date()

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode("retry: 3000\n\n"))

      const interval = setInterval(async () => {
        try {
          const count = await db.notification.count({
            where: { userId: session.user.id, read: false, createdAt: { gt: lastCheck } },
          })
          if (count > 0) {
            const notifications = await db.notification.findMany({
              where: { userId: session.user.id, read: false, createdAt: { gt: lastCheck } },
              orderBy: { createdAt: "desc" },
              take: 5,
            })
            lastCheck = new Date()
            const data = JSON.stringify({ type: "new_notifications", count, notifications })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        } catch {}
      }, 5000)

      request.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
