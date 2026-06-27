"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { canAccess } from "@/lib/permissions"
import { hashPassword } from "@/lib/auth-helpers"
import { z } from "zod"

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(["OWNER", "PM", "DEVELOPER", "DESIGNER", "SALES"]),
})

export async function createUser(formData: FormData) {
  const session = await auth()
  if (!session || !canAccess(session.user.role, "team", "manage")) {
    return { error: "Unauthorized" }
  }

  const raw = Object.fromEntries(formData)
  const parsed = createUserSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { email, name, password, role } = parsed.data

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return { error: "User with this email already exists" }

  const user = await db.user.create({
    data: {
      email,
      name,
      password: hashPassword(password),
      role,
      active: true,
    },
  })

  revalidatePath("/dashboard/team")
  return { data: { id: user.id, email: user.email, name: user.name, role: user.role } }
}
