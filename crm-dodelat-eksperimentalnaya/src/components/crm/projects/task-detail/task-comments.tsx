"use client"

/**
 * TaskComments — блок комментариев к задаче (в TaskDetailPanel).
 *
 * Позволяет добавлять комментарии к задаче через API /api/comments.
 * Комментарии загружаются при монтировании и обновляются после добавления.
 * Использует клиентский fetch (не server action) для оптимистичных обновлений.
 *
 * @param {Object} props
 * @param {string} props.taskId — ID задачи, к которой привязаны комментарии
 *
 * Состояния:
 * - content: текст нового комментария
 * - submitting: отправка
 * - comments: массив загруженных комментариев (useState)
 * - Empty state: "No comments yet"
 */

import { useState } from "react"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"
import { format } from "date-fns"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { t } from "@/lib/translations"

/**
 * getInitials — инициалы для аватара или "?".
 * @param name — имя или null
 * @returns инициалы
 */
function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

interface Props { taskId: string }

/**
 * TaskComments — блок комментариев задачи.
 *
 * Шаги:
 * 1. Комментарии загружаются из /api/comments?taskId=X.
 * 2. Пользователь пишет текст, нажимает Send.
 * 3. POST /api/comments с content и taskId.
 * 4. При успехе: тост, сброс поля, опережающее добавление в список.
 *
 * Побочные эффекты: toast, fetch API запросы.
 *
 * @param taskId — ID задачи
 * @returns JSX — блок комментариев
 */
export function TaskComments({ taskId }: Props) {
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [comments, setComments] = useState<any[]>([])

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), taskId }),
      })
      if (!res.ok) throw new Error("Failed")
      setContent("")
      toast.success(t("Comment added"))
      const newComment = await res.json()
      setComments((prev) => [newComment, ...prev])
    } catch {
      toast.error(t("Failed to add comment"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Textarea value={content} onChange={(e) => setContent(e.target.value)}
          placeholder={t("Write a comment... (mention @name for team members)")} rows={3} className="flex-1" />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !content.trim()}>
          {submitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Send className="mr-2 h-3 w-3" />}
          {t("Send")}
        </Button>
      </div>

      <div className="space-y-4">
        {comments.map((comment: any) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px]">{getInitials(comment.author?.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{comment.author?.name || "User"}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                </span>
              </div>
              <p className="text-sm mt-1">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">{t("No comments yet. Be the first!")}</p>
        )}
      </div>
    </div>
  )
}
