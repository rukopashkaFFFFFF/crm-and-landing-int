/**
 * @file API-маршрут для управления комментариями (CRUD).
 *
 * @description Обрабатывает:
 * - POST: создание комментария (к задаче или проекту), с детекцией упоминаний
 *   @username и созданием уведомлений.
 * - GET: получение списка комментариев (фильтр по taskId или projectId).
 * - PATCH: редактирование комментария (только автор).
 * - DELETE: мягкое удаление комментария (установка deletedAt).
 *
 * @route /api/comments
 * @exports POST — создание комментария.
 * @exports GET — получение комментариев.
 * @exports PATCH — обновление комментария.
 * @exports DELETE — мягкое удаление комментария.
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * Создаёт новый комментарий.
 *
 * @param {Request} request - Тело { content, taskId?, projectId?, isInternal? }.
 * @returns {Promise<NextResponse>}
 * - 201: Comment — созданный комментарий с автором.
 * - 400: { error } — отсутствует content.
 * - 401: { error } — не аутентифицирован.
 *
 * @sideeffect
 * - Если комментарий не внутренний (isInternal = false), парсит mentions
 *   (@Username) и создаёт Notification для каждого упомянутого пользователя.
 * - Делает запросы к БД: comment.create, user.findFirst, notification.create.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content, taskId, projectId, isInternal } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 })

  const comment = await db.comment.create({
    data: {
      content,
      authorId: session.user.id,
      taskId: taskId || null,
      projectId: projectId || null,
      isInternal: isInternal || false,
    },
    include: {
      author: { select: { id: true, name: true, image: true } },
    },
  })

  if (!isInternal) {
    const mentions = content.match(/@(\w+\s?\w+)/g) || []
    for (const mention of mentions) {
      const name = mention.slice(1).trim()
      const mentionedUser = await db.user.findFirst({
        where: { name: { contains: name, mode: "insensitive" } },
      })
      if (mentionedUser && mentionedUser.id !== session.user.id) {
        await db.notification.create({
          data: {
            userId: mentionedUser.id,
            title: "You were mentioned",
            message: `${session.user.name} mentioned you in a comment`,
            type: "INFO",
            link: taskId ? `/dashboard/projects/${projectId || ""}?task=${taskId}` : `/dashboard/projects/${projectId || ""}`,
          },
        })
      }
    }
  }

  return NextResponse.json(comment)
}

/**
 * Возвращает комментарии по фильтру (taskId или projectId).
 * Только неудалённые (deletedAt = null), до 100 штук.
 *
 * @param {Request} request - query-параметры: taskId?, projectId?.
 * @returns {Promise<NextResponse>}
 * - 200: Comment[] — массив комментариев.
 * - 401: { error } — не аутентифицирован.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const taskId = searchParams.get("taskId")
  const projectId = searchParams.get("projectId")

  const where: Record<string, any> = { deletedAt: null }
  if (taskId) where.taskId = taskId
  if (projectId) where.projectId = projectId

  const comments = await db.comment.findMany({
    where,
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  })

  return NextResponse.json(comments)
}

/**
 * Редактирует комментарий (только автор).
 *
 * @param {Request} request - query-параметр id, тело { content }.
 * @returns {Promise<NextResponse>}
 * - 200: Comment — обновлённый комментарий.
 * - 400: { error } — отсутствует id или content.
 * - 401: { error } — не аутентифицирован.
 * - 403: { error } — не автор комментария.
 */
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const commentId = searchParams.get("id")
  if (!commentId) return NextResponse.json({ error: "Comment ID required" }, { status: 400 })

  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 })

  const comment = await db.comment.findUnique({ where: { id: commentId } })
  if (!comment || comment.authorId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const updated = await db.comment.update({
    where: { id: commentId },
    data: { content },
    include: { author: { select: { id: true, name: true, image: true } } },
  })

  return NextResponse.json(updated)
}

/**
 * Мягко удаляет комментарий (устанавливает deletedAt).
 * Только автор может удалить свой комментарий.
 *
 * @param {Request} request - query-параметр id.
 * @returns {Promise<NextResponse>}
 * - 200: { success: true } — комментарий помечен удалённым.
 * - 400: { error } — отсутствует id.
 * - 401: { error } — не аутентифицирован.
 * - 403: { error } — не автор комментария.
 */
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const commentId = searchParams.get("id")
  if (!commentId) return NextResponse.json({ error: "Comment ID required" }, { status: 400 })

  const comment = await db.comment.findUnique({ where: { id: commentId } })
  if (!comment || comment.authorId !== session.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  await db.comment.update({
    where: { id: commentId },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
