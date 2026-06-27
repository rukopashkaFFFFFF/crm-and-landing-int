"use client"

/**
 * CommentThread — поток комментариев с поддержкой Markdown, упоминаний
 * (@name), внутренних комментариев, портального режима.
 *
 * Используется: задача (TaskDetailPanel), проект, портал клиента.
 * Комментарии загружаются и отправляются через /api/comments.
 *
 * @param {Object} props
 * @param {string} [props.taskId] — ID задачи (для комментариев к задаче)
 * @param {string} [props.projectId] — ID проекта (для комментариев к проекту)
 * @param {boolean} [props.showInternal=true] — показывать внутренние
 * @param {boolean} [props.portalMode=false] — режим портала (без упоминаний)
 * @param {string} [props.clientName] — имя клиента (для portalMode)
 * @param {() => void} [props.onCommentAdded] — колбэк после добавления
 *
 * Состояния:
 * - comments: загруженные комментарии
 * - content, editingId, editContent
 * - loading, submitting
 * - showMentions, mentionSearch, users (для @упоминаний)
 * - Empty: "No comments yet", Loading: "Loading comments..."
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { format } from "date-fns"
import { Edit3, Trash2, Loader2, Send, Lock } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

import { t } from "@/lib/translations"
import { useCurrentUser } from "@/hooks"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

type Comment = {
  id: string
  content: string
  isInternal: boolean
  createdAt: string
  updatedAt: string
  author: { id: string; name: string | null; image: string | null } | null
  authorName: string | null
}

/**
 * getInitials — инициалы для аватара или "?".
 * @param name — имя или null
 * @returns инициалы
 */
function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

interface Props {
  taskId?: string
  projectId?: string
  showInternal?: boolean
  portalMode?: boolean
  clientName?: string
  onCommentAdded?: () => void
}

/**
 * CommentThread — поток комментариев с Markdown, упоминаниями и
 * внутренними заметками.
 *
 * Шаги:
 * 1. Загрузка комментариев через GET /api/comments.
 * 2. Пользователь пишет текст с поддержкой @упоминаний (выпадающий список).
 * 3. Отправка POST /api/comments с content, taskId/projectId.
 * 4. Комментарии рендерятся через ReactMarkdown + remarkGfm.
 * 5. Автор может редактировать (PATCH) или удалять (DELETE) свой комментарий.
 * 6. Внутренние комментарии помечены бейджем с замком.
 * 7. В portalMode: скрыт input для внутренних, нет @упоминаний.
 *
 * Побочные эффекты: toast, fetch API.
 *
 * @param taskId — ID задачи
 * @param projectId — ID проекта
 * @param showInternal — показывать внутренние комментарии
 * @param portalMode — режим портала
 * @param clientName — имя клиента
 * @param onCommentAdded — колбэк
 * @returns JSX — поток комментариев
 */
export function CommentThread({ taskId, projectId, showInternal = true, portalMode = false, clientName, onCommentAdded }: Props) {
  const user = useCurrentUser()
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState("")
  const [users, setUsers] = useState<{ id: string; name: string | null }[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchComments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (taskId) params.set("taskId", taskId)
      if (projectId) params.set("projectId", projectId)
      const res = await fetch(`/api/comments?${params}`)
      const data = await res.json()
      setComments(data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [taskId, projectId])

  useEffect(() => { fetchComments() }, [fetchComments])

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/users")
        if (res.ok) {
          const data = await res.json()
          setUsers(data)
        }
      } catch { /* ignore */ }
    }
    if (!portalMode) loadUsers()
  }, [portalMode])

  function handleInput(val: string) {
    setContent(val)
    const lastAt = val.lastIndexOf("@")
    if (lastAt >= 0 && (lastAt === 0 || val[lastAt - 1] === " ")) {
      const search = val.slice(lastAt + 1)
      if (search.length > 0 && !search.includes(" ")) {
        setMentionSearch(search)
        setShowMentions(true)
        return
      }
    }
    setShowMentions(false)
  }

  function insertMention(name: string) {
    const lastAt = content.lastIndexOf("@")
    const before = content.slice(0, lastAt)
    setContent(`${before}@${name} `)
    setShowMentions(false)
    textareaRef.current?.focus()
  }

  async function handleSubmit() {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          taskId: taskId || null,
          projectId: projectId || null,
          isInternal: false,
          authorName: portalMode ? clientName : undefined,
        }),
      })
      if (!res.ok) throw new Error()
      setContent("")
      toast.success(t("Comment added"))
      fetchComments()
      onCommentAdded?.()
    } catch {
      toast.error(t("Failed to add comment"))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(commentId: string) {
    const res = await fetch(`/api/comments?id=${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent.trim() }),
    })
    if (!res.ok) { toast.error(t("Failed to edit")); return }
    toast.success(t("Comment updated"))
    setEditingId(null)
    fetchComments()
  }

  async function handleDelete(commentId: string) {
    const res = await fetch(`/api/comments?id=${commentId}`, { method: "DELETE" })
    if (!res.ok) { toast.error(t("Failed to delete")); return }
    toast.success(t("Comment deleted"))
    fetchComments()
  }

  const filteredComments = comments.filter((c) => {
    if (portalMode) return !c.isInternal
    if (!showInternal) return !c.isInternal
    return true
  })

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(mentionSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {!portalMode && (
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={t("Write a comment... Use @ to mention someone")}
            rows={3}
          />
          {showMentions && filteredUsers.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-60 rounded-md border bg-popover shadow-md z-10">
              {filteredUsers.slice(0, 5).map((u) => (
                <button
                  key={u.id}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left"
                  onClick={() => insertMention(u.name || "")}
                >
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px]">{getInitials(u.name)}</AvatarFallback></Avatar>
                  {u.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-muted-foreground">{t("Markdown supported: **bold**, *italic*, `code`, [links](url)")}</p>
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !content.trim()}>
              {submitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Send className="mr-2 h-3 w-3" />}
              {t("Send")}
            </Button>
          </div>
        </div>
      )}

      {portalMode && (
        <div className="space-y-2">
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder={t("Write a message...")} rows={3} />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !content.trim()}>
              {submitting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Send className="mr-2 h-3 w-3" />}
              {t("Send")}
            </Button>
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground text-center py-4">{t("Loading comments...")}</p>}
        {!loading && filteredComments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t("No comments yet")}</p>
        )}
        {filteredComments.map((comment) => (
          <div key={comment.id} className={`flex gap-3 ${comment.isInternal ? "bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 -mx-3" : ""}`}>
            <Avatar className="h-8 w-8 mt-0.5">
              <AvatarFallback className="text-[10px]">
                {getInitials(comment.author?.name || comment.authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{comment.author?.name || comment.authorName || t("Unknown")}</span>
                {comment.isInternal && (
                  <Badge variant="outline" className="text-[10px] px-1 border-amber-300 text-amber-700">
                    <Lock className="h-3 w-3 mr-0.5" /> {t("Internal")}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                </span>
              </div>

              {editingId === comment.id ? (
                <div className="mt-1 space-y-2">
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEdit(comment.id)}>{t("Save")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>{t("Cancel")}</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-sm prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {comment.content}
                  </ReactMarkdown>
                </div>
              )}

              {!portalMode && comment.author?.id === user?.id && editingId !== comment.id && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => { setEditingId(comment.id); setEditContent(comment.content) }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Edit3 className="h-3 w-3" /> {t("Edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> {t("Delete")}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
