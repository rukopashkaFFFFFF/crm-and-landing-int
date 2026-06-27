/**
 * utils.ts
 *
 * Общие утилиты приложения.
 * Содержит функцию cn() для объединения классов Tailwind CSS
 * через clsx и tailwind-merge.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Объединяет несколько классов Tailwind CSS в одну строку,
 * разрешая конфликты утилит через tailwind-merge.
 *
 * @param inputs - Массив значений классов (строки, объекты, массивы)
 * @returns Объединённая строка классов
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
