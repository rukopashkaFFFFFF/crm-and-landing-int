/**
 * auth-helpers.ts
 * 
 * Вспомогательные утилиты для системы аутентификации.
 * Содержит функции хеширования/верификации паролей и генерации
 * invite-токенов для приглашения новых участников команды.
 */

import { hashSync, genSaltSync, compareSync } from "bcryptjs"
import { randomBytes } from "crypto"
import { addDays } from "date-fns"

/**
 * Хеширует пароль с помощью bcryptjs (salt rounds = 12).
 * 
 * @param password - Пароль в открытом виде
 * @returns Хешированная строка пароля
 */
export function hashPassword(password: string): string {
  const salt = genSaltSync(12)
  return hashSync(password, salt)
}

/**
 * Сверяет открытый пароль с сохранённым хешем.
 * 
 * @param password - Пароль в открытом виде для проверки
 * @param hash - Ранее сохранённый хеш пароля
 * @returns true, если пароль совпадает с хешем
 */
export function verifyPassword(password: string, hash: string): boolean {
  return compareSync(password, hash)
}

/**
 * Генерирует криптостойкий случайный токен для ссылки-приглашения.
 * 
 * @returns Строка из 64 hex-символов (32 байта)
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Возвращает дату истечения ссылки-приглашения (через 7 дней от текущего момента).
 * 
 * @returns Дата через 7 дней
 */
export function getInviteExpiry(): Date {
  return addDays(new Date(), 7)
}
