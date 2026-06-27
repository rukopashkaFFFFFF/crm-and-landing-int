/**
 * @file Компонент Card (карточка).
 * Набор составных частей для создания карточки с контентом.
 * Не использует @base-ui/react — реализован на нативных HTML-элементах.
 *
 * @base-ui/react — не используется.
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card — корневой контейнер карточки.
 *
 * @param className - Дополнительные CSS-классы.
 * @param size - Размер отступов: "default" (16px), "sm" (12px).
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="card"
 * data-size — значение размера.
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 * Использует CSS-переменную --card-spacing для управления отступами.
 */
function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        "group/card flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl bg-card py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/10 [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
        className
      )}
      {...props}
    />
  )
}

/**
 * CardHeader — шапка карточки (заголовок + описание + действия).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="card-header"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

/**
 * CardTitle — заголовок карточки.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="card-title"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 * Размер шрифта адаптируется под data-size карточки.
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

/**
 * CardDescription — описание карточки.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="card-description"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

/**
 * CardAction — область действия (кнопки, ссылки) внутри CardHeader.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="card-action"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

/**
 * CardContent — основное содержимое карточки.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="card-content"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

/**
 * CardFooter — подвал карточки.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="card-footer"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
