/**
 * @file Компонент Skeleton (скелетон / заглушка загрузки).
 * Не использует @base-ui/react — реализован на нативном <div>.
 * Используется для отображения плейсхолдера во время загрузки данных.
 *
 * @base-ui/react — не используется.
 */

import { cn } from "@/lib/utils"

/**
 * Skeleton — анимированный блок-заглушка для индикации загрузки.
 *
 * @param className - Дополнительные CSS-классы (задайте width/height для кастомизации).
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="skeleton"
 *
 * Кастомизация: cn() объединяет animate-pulse и bg-muted с переданным className.
 * Размеры задаются через className (например, className="h-4 w-24").
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
