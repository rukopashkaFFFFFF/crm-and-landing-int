/**
 * @file Компонент Separator (разделитель).
 * Обёртка над @base-ui/react/separator.
 * Используется для визуального разделения контента по горизонтали или вертикали.
 *
 * @base-ui/react — @base-ui/react/separator
 */

"use client"

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"

import { cn } from "@/lib/utils"

/**
 * Separator — стилизованный разделитель (горизонтальный или вертикальный).
 *
 * @param className - Дополнительные CSS-классы.
 * @param orientation - Ориентация: "horizontal" или "vertical".
 * @param props - Остальные пропсы SeparatorPrimitive.Props.
 *
 * data-slot="separator"
 * data-horizontal / data-vertical — атрибуты ориентации (управляются SeparatorPrimitive).
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
