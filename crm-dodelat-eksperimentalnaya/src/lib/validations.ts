/**
 * validations.ts
 *
 * Схемы валидации Zod для всех сущностей CRM.
 * Содержит:
 * - Auth: loginSchema, registerSchema, inviteSchema
 * - Клиенты: createClientSchema, updateClientSchema, csvImportSchema
 * - Лиды: createLeadSchema, updateLeadSchema, moveLeadStageSchema
 * - Проекты: createProjectSchema, updateProjectSchema
 * - Задачи: createTaskSchema, updateTaskSchema, logTimeSchema
 * - Вехи: createMilestoneSchema
 * - Счета: createInvoiceSchema, updateInvoiceSchema, recordPaymentSchema
 * - Сметы: createEstimateSchema
 *
 * Каждая схема экспортирует соответствующий TypeScript-тип через z.infer.
 */

import { z } from "zod"
import { t } from "@/lib/translations"

// ==================== AUTH ====================

/** Схема входа: email + пароль */
export const loginSchema = z.object({
  email: z.string().email(t("Invalid email address")),
  password: z.string().min(1, t("Password is required")),
})
export type LoginInput = z.infer<typeof loginSchema>

/** Схема регистрации: имя, пароль (≥8 символов), токен приглашения */
export const registerSchema = z.object({
  name: z.string().min(2, t("Name must be at least 2 characters")),
  password: z.string().min(8, t("Password must be at least 8 characters")),
  token: z.string().min(1, t("Invalid invite token")),
})
export type RegisterInput = z.infer<typeof registerSchema>

/** Схема приглашения участника: email + роль */
export const inviteSchema = z.object({
  email: z.string().email(t("Invalid email address")),
  role: z.enum(["PM", "DEVELOPER", "DESIGNER", "SALES"]),
})

// ==================== CLIENTS ====================

/** Схема создания клиента */
export const createClientSchema = z.object({
  name: z.string().min(1, t("Name is required")),
  email: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE", "CHURNED"]).default("ACTIVE"),
  source: z.enum(["REFERRAL", "WEBSITE", "COLD", "OTHER"]).default("OTHER"),
  tags: z.array(z.string()).default([]),
  assignedToId: z.string().optional().nullable(),
})
/** Схема обновления клиента (все поля опциональны) */
export const updateClientSchema = createClientSchema.partial()

// ==================== LEADS ====================

/** Схема создания лида */
export const createLeadSchema = z.object({
  clientId: z.string().min(1),
  stage: z.enum(["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"]).default("NEW"),
  value: z.coerce.number().min(0).default(0),
  probability: z.coerce.number().min(0).max(100).default(0),
  expectedCloseDate: z.string().optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
  lostReason: z.string().optional().or(z.literal("")),
})
/** Схема обновления лида (все поля опциональны) */
export const updateLeadSchema = createLeadSchema.partial()

/** Схема перемещения лида по этапам воронки */
export const moveLeadStageSchema = z.object({
  leadId: z.string().min(1),
  stage: z.enum(["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"]),
  lostReason: z.string().optional().nullable(),
})

/** Схема импорта клиентов из CSV-массива */
export const csvImportSchema = z.object({
  rows: z.array(z.object({
    name: z.string().min(1),
    email: z.string().optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    company: z.string().optional().or(z.literal("")),
    status: z.string().optional().or(z.literal("")),
  })),
})

// ==================== PROJECTS ====================

/** Схема создания проекта */
export const createProjectSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1, t("Name is required")),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["PLANNING", "IN_PROGRESS", "REVIEW", "COMPLETED", "ON_HOLD", "CANCELLED"]).default("PLANNING"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  budget: z.coerce.number().min(0).default(0),
  pmId: z.string().optional().nullable(),
})
/** Схема обновления проекта (все поля опциональны) */
export const updateProjectSchema = createProjectSchema.partial()

// ==================== TASKS ====================

/** Схема создания задачи */
export const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, t("Title is required")),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedHours: z.coerce.number().min(0).default(0),
  parentTaskId: z.string().optional().nullable(),
})
/** Схема обновления задачи (все поля опциональны) */
export const updateTaskSchema = createTaskSchema.partial()

/** Схема логирования времени */
export const logTimeSchema = z.object({
  taskId: z.string().min(1),
  hours: z.coerce.number().min(0.25, t("Minimum 0.25 hours")).max(24, t("Maximum 24 hours")),
  description: z.string().optional().or(z.literal("")),
  date: z.string().optional(),
  billable: z.boolean().default(true),
})

// ==================== MILESTONES ====================

/** Схема создания вехи проекта */
export const createMilestoneSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, t("Title is required")),
  description: z.string().optional().or(z.literal("")),
  dueDate: z.string().optional().nullable(),
})

// ==================== FINANCE (invoices / estimates / payments) ====================

/** Схема одной позиции в счёте/смете */
const lineItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1),
  quantity: z.coerce.number().min(0),
  unitPrice: z.coerce.number().min(0),
  tax: z.coerce.number().min(0).default(0),
})

/** Схема создания счёта */
export const createInvoiceSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  currency: z.string().default("USD"),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
  terms: z.string().optional().or(z.literal("")),
  lineItems: z.array(lineItemSchema).min(1, t("At least one line item required")),
})

/** Схема обновления счёта (все поля опциональны + статус) */
export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
})

/** Схема создания сметы */
export const createEstimateSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  currency: z.string().default("USD"),
  validUntil: z.string().optional().nullable(),
  notes: z.string().optional().or(z.literal("")),
  lineItems: z.array(lineItemSchema).min(1, t("At least one line item required")),
})

/** Схема записи платежа */
export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().min(0.01, t("Amount must be positive")),
  date: z.string().optional(),
  method: z.enum(["BANK_TRANSFER", "CREDIT_CARD", "PAYPAL", "CASH", "CHECK", "OTHER"]).default("BANK_TRANSFER"),
  notes: z.string().optional().or(z.literal("")),
})
