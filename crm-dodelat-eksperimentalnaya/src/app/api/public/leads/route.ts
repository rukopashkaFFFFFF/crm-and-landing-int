import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { emitWebhookEvent } from "@/lib/webhook-emitter"
import { evaluateAutomationRules } from "@/lib/automation-engine"

const LandingLeadSchema = z.object({
  externalId: z.string(),
  formSource: z.enum([
    "quiz", "calculator", "header_cta", "exit_intent", "tariff"
  ]),

  contact: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    company: z.string().optional(),
  }),

  project: z.object({
    goal: z.string().optional(),
    type: z.string().optional(),
    niche: z.string().optional(),
    deadline: z.string().optional(),
    budget: z.string().optional(),
    features: z.array(z.string()).optional(),
    comment: z.string().optional(),
  }),

  calculator: z.object({
    siteType: z.string().optional(),
    pages: z.number().optional(),
    designLevel: z.string().optional(),
    features: z.array(z.string()).optional(),
    urgency: z.string().optional(),
    estimatedPriceMin: z.number().optional(),
    estimatedPriceMax: z.number().optional(),
  }).optional(),

  utmData: z.object({
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    referrer: z.string().optional(),
    pageUrl: z.string().optional(),
  }).optional(),

  deviceInfo: z.object({
    userAgent: z.string().optional(),
    screenResolution: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),

  behaviorData: z.object({
    timeOnPage: z.number().optional(),
    scrollDepth: z.number().optional(),
  }).optional(),
})

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.LANDING_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (token !== process.env.LANDING_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders })
  }

  const result = LandingLeadSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten() },
      { status: 422, headers: corsHeaders }
    )
  }

  const data = result.data

  const existing = await db.lead.findUnique({
    where: { externalId: data.externalId }
  })
  if (existing) {
    return NextResponse.json(
      { success: true, leadId: existing.id, duplicate: true },
      { status: 200, headers: corsHeaders }
    )
  }

  let client = null
  if (data.contact.email) {
    client = await db.client.findFirst({
      where: { email: data.contact.email }
    })
  }
  if (!client && data.contact.phone) {
    client = await db.client.findFirst({
      where: { phone: data.contact.phone }
    })
  }
  if (!client) {
    client = await db.client.create({
      data: {
        name: data.contact.company || data.contact.name,
        email: data.contact.email || null,
        phone: data.contact.phone,
        status: "LEAD",
        source: "WEBSITE",
        notes: `Автоматически создан из заявки ${data.externalId} с лендинга`,
      }
    })
  }

  const assignee = await db.user.findFirst({
    where: {
      role: { in: ["SALES", "PM", "OWNER"] },
      active: true,
    },
    orderBy: { createdAt: "asc" }
  })

  const siteType = data.project.type || data.calculator?.siteType || "Сайт"
  const budget = data.project.budget ||
    (data.calculator?.estimatedPriceMin
      ? `$${data.calculator.estimatedPriceMin}–$${data.calculator.estimatedPriceMax}`
      : null)

  const title = `${siteType} — ${data.contact.company || data.contact.name}`

  const notes = [
    `**Заявка с лендинга ${data.externalId}**`,
    `**Источник формы:** ${data.formSource}`,
    data.project.goal && `**Цель:** ${data.project.goal}`,
    data.project.niche && `**Сфера:** ${data.project.niche}`,
    data.project.deadline && `**Срок:** ${data.project.deadline}`,
    budget && `**Бюджет:** ${budget}`,
    data.project.features?.length && `**Функционал:** ${data.project.features.join(", ")}`,
    data.project.comment && `**Комментарий:** ${data.project.comment}`,
    `---`,
    `**Контакт:** ${data.contact.name} | ${data.contact.phone} | ${data.contact.email || "—"}`,
    data.utmData?.utm_source && `**UTM:** ${data.utmData.utm_source} / ${data.utmData.utm_medium} / ${data.utmData.utm_campaign}`,
    data.behaviorData?.timeOnPage && `**Время на сайте:** ${data.behaviorData.timeOnPage} сек, скролл ${data.behaviorData.scrollDepth}%`,
  ].filter(Boolean).join("\n")

  const lead = await db.lead.create({
    data: {
      clientId: client.id,
      stage: "NEW",
      value: data.calculator?.estimatedPriceMin ?? 0,
      probability: 20,
      notes,
      externalId: data.externalId,
      source: `landing_${data.formSource}`,
      quizAnswers: data.project as object,
      utmData: (data.utmData ?? {}) as object,
      deviceInfo: (data.deviceInfo ?? {}) as object,
      behaviorData: (data.behaviorData ?? {}) as object,
    }
  })

  const allUsers = await db.user.findMany()
  const notifyUsers = allUsers.filter(u => ["SALES", "PM", "OWNER"].includes(u.role))

  if (notifyUsers.length > 0) {
    await Promise.all(notifyUsers.map(user =>
      db.notification.create({
        data: {
          userId: user.id,
          type: "INFO",
          title: `Новая заявка с сайта`,
          message: `${title} — ${data.contact.phone}`,
          link: `/dashboard/leads`,
        }
      })
    ))
  }

  const activityUserId = assignee?.id ?? allUsers[0]?.id
  if (activityUserId) {
    await db.activity.create({
      data: {
        type: "LEAD_CREATED_FROM_LANDING",
        description: `Новая заявка ${data.externalId} с лендинга (${data.formSource})`,
        userId: activityUserId,
        clientId: client.id,
        metadata: { externalId: data.externalId, formSource: data.formSource },
      }
    })
  }

  await emitWebhookEvent("lead.created", {
    leadId: lead.id,
    externalId: data.externalId,
    title,
    clientName: data.contact.name,
    phone: data.contact.phone,
    source: "landing",
  })

  evaluateAutomationRules("lead.created", {
    leadId: lead.id,
    externalId: data.externalId,
    clientId: client.id,
    source: "landing",
  })

  return NextResponse.json({
    success: true,
    leadId: lead.id,
    externalId: data.externalId,
    message: `Заявка ${data.externalId} принята`,
  }, { status: 201, headers: corsHeaders })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}
