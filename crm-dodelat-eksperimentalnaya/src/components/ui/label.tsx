/**
 * @file Компонент Label (метка для полей ввода).
 * Не использует @base-ui/react — реализован на нативном <label>.
 * Используется совместно с Input, Select, Textarea и т.д.
 *
 * @base-ui/react — не используется.
 */

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Label — стилизованная метка для элементов формы.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"label">.
 *
 * data-slot="label"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 * Автоматически отключается при data-[disabled=true] на родителе (group-data-[disabled]).
 * Реагирует на peer-disabled соседнего элемента.
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
