"use client"

/**
 * LeadCard — карточка лида для Kanban-доски Leads.
 *
 * Страница: /dashboard/leads (внутри LeadsBoard).
 * Отображает краткую информацию: имя клиента, сумму, вероятность закрытия
 * с цветной шкалой, ожидаемую дату закрытия.
 *
 * Поддерживает drag & drop через @dnd-kit (useSortable).
 *
 * @param {Object} props
 * @param {Lead} props.lead — объект лида (клиент, value, probability, stage)
 * @param {() => void} props.onClick — открыть детальную панель
 *
 * Состояния: isDragging (прозрачность при перетаскивании).
 */

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { t } from "@/lib/translations"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Globe } from "lucide-react"

type Lead = any

interface Props {
  lead: Lead
  onClick: () => void
}

/**
 * getInitials — возвращает инициалы для аватара.
 * @param name — полное имя
 * @returns до 2 заглавных букв
 */
function getInitials(name: string) {
  return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
}

/**
 * LeadCard — перетаскиваемая карточка лида на доске.
 *
 * Шаги:
 * 1. useSortable подключает DnD (setNodeRef, attributes, listeners).
 * 2. Отображает имя клиента, ожидаемую дату (если есть).
 * 3. Если value > 0 — отображает сумму.
 * 4. Прогресс-бар вероятности с цветом (зелёный >=80%, жёлтый >=50%,
 *    оранжевый >=20%, красный <20%).
 * 5. При isDragging — opacity 50%.
 *
 * @param lead — объект лида
 * @param onClick — открытие детальной панели
 * @returns JSX — карточка
 */
export function LeadCard({ lead, onClick }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const probColor =
    lead.probability >= 80 ? "bg-green-500" :
    lead.probability >= 50 ? "bg-yellow-500" :
    lead.probability >= 20 ? "bg-orange-500" :
    "bg-red-500"

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{lead.client?.name || t("Unknown")}</p>
          {lead.externalId && (
            <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/50 text-blue-400 shrink-0">
              <Globe className="h-2.5 w-2.5" />
              {lead.externalId}
            </Badge>
          )}
        </div>
        {lead.expectedCloseDate && (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
            {format(new Date(lead.expectedCloseDate), "MMM d")}
          </span>
        )}
      </div>

      {lead.value > 0 && (
        <p className="text-sm font-semibold mb-2">
          ${Number(lead.value).toLocaleString()}
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", probColor)}
              style={{ width: `${lead.probability}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
            {lead.probability}%
          </span>
        </div>
      </div>
    </div>
  )
}
