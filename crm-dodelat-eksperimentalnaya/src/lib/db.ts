/**
 * db.ts
 *
 * Инициализация и экспорт единственного экземпляра PrismaClient
 * (синглтон) для всего приложения. Использует PrismaPg-адаптер
 * для подключения к PostgreSQL.
 *
 * В режиме, отличном от production, клиент сохраняется в globalThis
 * для предотвращения множественных инстансов при hot-reload.
 */

import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
