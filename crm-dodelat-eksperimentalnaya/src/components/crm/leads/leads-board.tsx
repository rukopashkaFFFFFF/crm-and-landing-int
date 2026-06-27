"use client"

/**
 * LeadsBoard — Kanban-доска для управления лидами (сделками).
 *
 * Страница: /dashboard/leads.
 * Отображает лиды по стадиям (New, Contacted, Proposal Sent, Negotiation,
 * Won, Lost) с возможностью перетаскивания между колонками.
 *
 * @param {Object} props
 * @param {Lead[]} props.leads — все лиды системы
 * @param {Client[]} props.clients — клиенты (для CreateLeadDialog)
 *
 * Server action: moveLeadStage(id, newStage).
 *
 * Состояния:
 * - activeLead: перетаскиваемый лид (для DragOverlay)
 * - selectedLead: выбранный для просмотра (LeadDetailPanel)
 * - showCreate: открыть диалог создания
 * - Grouping лидов по stage через useMemo
 */

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { toast } from "sonner"
import { Globe, List } from "lucide-react"

import { moveLeadStage } from "@/lib/actions/leads"
import { t, translateStatus } from "@/lib/translations"
import { LeadColumn } from "./lead-column"
import { LeadCard } from "./lead-card"
import { LeadDetailPanel } from "./lead-detail-panel"
import { CreateLeadDialog } from "./create-lead-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Lead = any
type Client = { id: string; name: string }

const STAGES = [
  { key: "NEW" },
  { key: "CONTACTED" },
  { key: "PROPOSAL_SENT" },
  { key: "NEGOTIATION" },
  { key: "WON" },
  { key: "LOST" },
]

interface Props {
  leads: Lead[]
  clients: Client[]
}

/**
 * LeadsBoard — доска лидов с Drag & Drop.
 *
 * Шаги:
 * 1. Группировка лидов по stage через useMemo.
 * 2. DndContext с PointerSensor (активация через 8px).
 * 3. При DragStart — сохраняет activeLead для DragOverlay.
 * 4. При DragEnd — вызывает moveLeadStage, если колонка изменилась.
 * 5. DragOverlay показывает копию карточки с поворотом.
 * 6. Кнопка "Add Lead" открывает CreateLeadDialog.
 * 7. LeadDetailPanel открывается по клику на карточку.
 *
 * Побочные эффекты:
 * - toast.success/error при перемещении
 * - router.refresh() после перемещения или создания
 *
 * @param leads — все лиды
 * @param clients — клиенты
 * @returns JSX — доска с колонками
 */
export function LeadsBoard({ leads, clients }: Props) {
  const router = useRouter()
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [filter, setFilter] = useState<"all" | "landing">("all")

  const filteredLeads = useMemo(() => {
    if (filter === "landing") {
      return leads.filter((l) => l.externalId != null)
    }
    return leads
  }, [leads, filter])

  const landingLeadsCount = useMemo(
    () => leads.filter((l) => l.externalId != null).length,
    [leads]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    STAGES.forEach((s) => {
      map[s.key] = filteredLeads
        .filter((l) => l.stage === s.key)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    })
    return map
  }, [filteredLeads])

  function handleDragStart(event: DragStartEvent) {
    const lead = filteredLeads.find((l) => l.id === event.active.id)
    if (lead) setActiveLead(lead)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null)
    const { active, over } = event
    if (!over) return

    const leadId = active.id as string
    const overId = over.id as string
    const stageKeys = STAGES.map(s => s.key)

    let targetColumn: string
    if (stageKeys.includes(overId)) {
      targetColumn = overId
    } else {
      const overLead = filteredLeads.find(l => l.id === overId)
      if (!overLead) return
      targetColumn = overLead.stage
    }

    const lead = filteredLeads.find((l) => l.id === leadId)
    if (!lead || lead.stage === targetColumn) return

    const result = await moveLeadStage(leadId, targetColumn)
    if (result.error) {
      toast.error(t("Failed to move lead"))
      return
    }
    toast.success(t("Lead moved to {label}", { label: translateStatus(targetColumn) }))
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            Все
            <Badge variant="secondary" className="ml-1">{leads.length}</Badge>
          </Button>
          <Button
            variant={filter === "landing" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("landing")}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            С сайта
            {landingLeadsCount > 0 && (
              <Badge variant="secondary">{landingLeadsCount}</Badge>
            )}
          </Button>
        </div>
        <CreateLeadDialog clients={clients} onCreated={() => router.refresh()} />
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const items = grouped[stage.key] || []
            const isWinLose = stage.key === "WON" || stage.key === "LOST"

            return (
              <LeadColumn
                key={stage.key}
                id={stage.key}
                label={translateStatus(stage.key)}
                count={items.length}
                isWinLose={isWinLose}
              >
                <SortableContext
                  items={items.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))}
                </SortableContext>
              </LeadColumn>
            )
          })}
        </div>

        <DragOverlay>
          {activeLead && (
            <div className="opacity-90 rotate-2">
              <LeadCard lead={activeLead} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <LeadDetailPanel
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        clients={clients}
        onUpdated={() => router.refresh()}
      />
    </div>
  )
}
