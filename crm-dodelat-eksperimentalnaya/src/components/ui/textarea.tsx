/**
 * @file Компонент Textarea (многострочное текстовое поле).
 * Не использует @base-ui/react — реализован на нативном <textarea>.
 * Используется для ввода длинного текста, комментариев, описаний.
 *
 * @base-ui/react — не используется.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Textarea — стилизованное многострочное текстовое поле.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"textarea">.
 *
 * data-slot="textarea"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 * Использует field-sizing-content для авто-высоты.
 * Поддерживает состояния: focus-visible, disabled, aria-invalid.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
