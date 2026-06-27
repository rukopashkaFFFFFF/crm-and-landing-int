/**
 * webhook-emitter.ts
 *
 * Сервис отправки webhook-уведомлений во внешние системы.
 * При вызове находит все активные webhook'и, подписанные
 * на переданное событие, и отправляет POST-запрос с JSON-телом.
 * Если у webhook'а настроен секрет, тело подписывается HMAC-SHA256
 * и передаётся в заголовке X-Webhook-Signature.
 *
 * После отправки обновляет статус последнего вызова webhook'а.
 */

import { db } from "@/lib/db"

/**
 * Эмитирует webhook-событие: отправляет POST-запросы на все
 * активные webhook'и, подписанные на данное событие.
 * Для каждого webhook'а формирует подпись HMAC-SHA256 (если есть секрет),
 * отправляет запрос и сохраняет статус ответа.
 *
 * @param event - Название события (например, "client.created",
 *                "invoice.status_changed", "project.updated")
 * @param payload - Дополнительные данные события (clientId, projectId,
 *                  status, сумма и т.д.)
 */
export async function emitWebhookEvent(event: string, payload: any) {
  try {
    const webhooks = await db.webhook.findMany({
      where: {
        active: true,
        events: { has: event },
      },
    })

    for (const webhook of webhooks) {
      try {
        const body = JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          ...payload,
        })

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Webhook-Event": event,
        }

        if (webhook.secret) {
          const encoder = new TextEncoder()
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(webhook.secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          )
          const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body))
          headers["X-Webhook-Signature"] = Array.from(new Uint8Array(signature))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
        }

        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body,
        })

        await db.webhook.update({
          where: { id: webhook.id },
          data: {
            lastCall: new Date(),
            lastStatus: response.status,
            lastResponse: await response.text().catch(() => null),
          },
        })
      } catch (e) {
        await db.webhook.update({
          where: { id: webhook.id },
          data: {
            lastCall: new Date(),
            lastStatus: null,
            lastResponse: `Error: ${e instanceof Error ? e.message : "Unknown error"}`,
          },
        })
      }
    }
  } catch (e) {
    console.error("Webhook emitter error:", e)
  }
}
