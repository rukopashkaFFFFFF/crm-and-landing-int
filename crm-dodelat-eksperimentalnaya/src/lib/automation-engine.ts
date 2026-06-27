/**
 * automation-engine.ts
 *
 * Движок правил автоматизации CRM.
 * Позволяет создавать триггерные сценарии: при наступлении события
 * (например, "task.overdue", "lead.stage_changed") движок находит
 * все активные правила с соответствующим триггером и выполняет
 * привязанные действия (уведомления, смена статуса, назначение
 * исполнителя, отправка webhook).
 */

import { db } from "@/lib/db"
import { emitWebhookEvent } from "./webhook-emitter"

/**
 * Оценивает все активные правила автоматизации для переданного триггера.
 * Для каждого правила выполняется последовательность действий (actions),
 * после чего обновляются счётчик запусков и дата последнего выполнения.
 *
 * @param trigger - Название события-триггера (например, "client.created",
 *                  "invoice.status_changed", "lead.stage_changed")
 * @param context - Объект с контекстными данными события (clientId,
 *                  projectId, status, stage и т.д.), доступными для
 *                  интерполяции в сообщениях
 */
export async function evaluateAutomationRules(trigger: string, context: any) {
  try {
    const rules = await db.automationRule.findMany({
      where: { trigger, active: true },
    })

    for (const rule of rules) {
      try {
        for (const action of (rule.actions as any[]) || []) {
          await executeAction(action, context)
        }

        await db.automationRule.update({
          where: { id: rule.id },
          data: { lastRunAt: new Date(), runCount: { increment: 1 } },
        })
      } catch (e) {
        console.error(`Automation rule ${rule.id} failed:`, e)
      }
    }
  } catch (e) {
    console.error("Automation engine error:", e)
  }
}

/**
 * Исполняет одно действие правила автоматизации.
 * Поддерживаемые типы:
 * - send_notification — создаёт уведомление в БД для указанного пользователя
 * - change_status — изменяет статус сущности (project, task, lead)
 * - assign_to — назначает ответственного (task, lead)
 * - send_webhook — эмитирует webhook-событие automation.*
 *
 * @param action - Объект действия: { type, userId, title, message, entity, status, ... }
 * @param context - Контекст события для интерполяции полей
 */
async function executeAction(action: any, context: any) {
  switch (action.type) {
    case "send_notification": {
      const userId = resolveUserId(action.userId, action.assigneeField, context)
      if (userId) {
        await db.notification.create({
          data: {
            userId,
            title: action.title || "Automation Notification",
            message: interpolate(action.message || "", context),
            type: action.notificationType || "INFO",
            link: action.link ? interpolate(action.link, context) : null,
          },
        })
      }
      break
    }

    case "change_status": {
      if (action.entity === "project" && context.projectId) {
        await db.project.update({
          where: { id: context.projectId },
          data: { status: action.status },
        })
      }
      if (action.entity === "task" && context.taskId) {
        await db.task.update({
          where: { id: context.taskId },
          data: { status: action.status },
        })
      }
      if (action.entity === "lead" && context.leadId) {
        await db.lead.update({
          where: { id: context.leadId },
          data: { stage: action.stage },
        })
      }
      break
    }

    case "assign_to": {
      if (action.entity === "task" && context.taskId && action.userId) {
        await db.task.update({
          where: { id: context.taskId },
          data: { assigneeId: action.userId },
        })
      }
      if (action.entity === "lead" && context.leadId && action.userId) {
        await db.client.update({
          where: { id: context.clientId || "" },
          data: { assignedToId: action.userId },
        })
      }
      break
    }

    case "send_webhook": {
      await emitWebhookEvent("automation." + (context.event || "trigger"), { action, context })
      break
    }
  }
}

/**
 * Определяет ID пользователя-получателя уведомления:
 * сначала проверяет статичный staticId, затем извлекает
 * значение из контекста по имени поля assigneeField.
 *
 * @param staticId - Конкретный ID пользователя (может быть пустым)
 * @param field - Имя поля в контексте, содержащего ID пользователя
 * @param context - Контекст события
 * @returns ID пользователя или null
 */
function resolveUserId(staticId?: string, field?: string, context?: any): string | null {
  if (staticId) return staticId
  if (field && context) return context[field] || null
  return null
}

/**
 * Подставляет переменные вида {{key}} из объекта vars в шаблон.
 *
 * @param template - Строка с плейсхолдерами {{key}}
 * @param vars - Объект со значениями для подстановки
 * @returns Строка с подставленными значениями
 */
function interpolate(template: string, vars: any): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}
