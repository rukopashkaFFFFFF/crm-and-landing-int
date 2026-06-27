/**
 * activity.ts (Server Action)
 *
 * Сервис логирования активности в CRM.
 * Используется всеми остальными action-файлами для записи
 * в таблицу activity истории действий пользователей:
 * создание/обновление/удаление клиентов, проектов, задач,
 * счетов, смет, лидов и т.д.
 */

"use server"

import { db } from "@/lib/db"

interface LogActivityInput {
  type: string
  description: string
  userId: string
  clientId?: string
  projectId?: string
  taskId?: string
  metadata?: Record<string, unknown>
}

/**
 * Создаёт запись в логе активности.
 * Вызывается из всех Server Actions после успешного
 * выполнения операции с БД.
 *
 * @param input.type - Тип события (CLIENT_CREATED, PROJECT_UPDATED, TASK_MOVED и т.д.)
 * @param input.description - Человекочитаемое описание действия
 * @param input.userId - ID пользователя, совершившего действие
 * @param input.clientId - ID связанного клиента (опционально)
 * @param input.projectId - ID связанного проекта (опционально)
 * @param input.taskId - ID связанной задачи (опционально)
 * @param input.metadata - Дополнительные данные (статус, этап и т.д.)
 */
export async function logActivity(input: LogActivityInput) {
  await db.activity.create({
    data: {
      type: input.type,
      description: input.description,
      userId: input.userId,
      clientId: input.clientId || null,
      projectId: input.projectId || null,
      taskId: input.taskId || null,
      metadata: (input.metadata ?? {}) as any,
    },
  })
}
