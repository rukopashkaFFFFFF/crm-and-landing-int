"use client"

/**
 * LeadColumn — колонка Kanban-доски для лидов (droppable-область).
 *
 * Используется внутри LeadsBoard для каждой стадии воронки продаж.
 * Содержит заголовок, количество карточек и дочерние элементы (LeadCard).
 *
 * @param {Object} props
 * @param {string} props.id — уникальный идентификатор колонки (stage key)
 * @param {string} props.label — отображаемое название (локализовано)
 * @param {number} props.count — количество лидов в колонке
 * @param {boolean} [props.isWinLose] — визуальное выделение Won/Lost
 * @param {React.ReactNode} props.children — карточки лидов
 *
 * Состояния: isOver (подсветка границы при наведении drag).
 */

import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

interface Props {
  id: string
  label: string
  count: number
  isWinLose?: boolean
  children: React.ReactNode
}

/**
 * LeadColumn — droppable-колонка для лидов.
 *
 * Шаги:
 * 1. useDroppable регистрирует область с id.
 * 2. При isOver — кольцевая подсветка (ring-2 ring-primary).
 * 3. Won/Lost колонки слегка затемнены (opacity-80).
 * 4. Внутри — вертикальный список карточек с прокруткой.
 *
 * @param id — ключ стадии
 * @param label — название стадии
 * @param count — количество лидов
 * @param isWinLose — флаг финальной стадии
 * @param children — карточки лидов
 * @returns JSX — колонка
 */
export function LeadColumn({ id, label, count, isWinLose, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] w-[280px] shrink-0 rounded-lg border bg-muted/30",
        isOver && "ring-2 ring-primary",
        isWinLose && "opacity-80"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{label}</h3>
          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-[11px] font-medium">
            {count}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-[calc(100vh-240px)]">
        {children}
      </div>
    </div>
  )
}
