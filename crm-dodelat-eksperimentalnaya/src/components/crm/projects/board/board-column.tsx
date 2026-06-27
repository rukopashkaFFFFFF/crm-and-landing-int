"use client"

/**
 * BoardColumn — droppable-колонка для задач на доске Kanban.
 *
 * Используется внутри BoardView.
 * Принимает задачи через children (SortableContext + TaskCard).
 * Колонка подсвечивается при наведении перетаскиваемой задачи.
 *
 * @param {Object} props
 * @param {string} props.id — уникальный ID колонки (ключ статуса)
 * @param {string} props.label — название колонки (локализовано)
 * @param {number} props.count — количество задач
 * @param {React.ReactNode} props.children — карточки задач + QuickAddButton
 *
 * Состояния: isOver (useDroppable) — подсветка границ.
 */

import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

interface Props {
  id: string
  label: string
  count: number
  children: React.ReactNode
}

/**
 * BoardColumn — droppable-колонка Kanban.
 *
 * @param id — идентификатор колонки (статус задачи)
 * @param label — отображаемый заголовок
 * @param count — количество задач
 * @param children — содержимое (карточки + кнопка)
 * @returns JSX — колонка с бордером и скроллом
 */
export function BoardColumn({ id, label, count, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className={cn(
      "flex flex-col min-w-[280px] w-[280px] shrink-0 rounded-lg border bg-muted/30",
      isOver && "ring-2 ring-primary"
    )}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{label}</h3>
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[11px] font-medium">{count}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-[calc(100vh-340px)]">
        {children}
      </div>
    </div>
  )
}
