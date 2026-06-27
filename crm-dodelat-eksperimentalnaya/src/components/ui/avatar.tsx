/**
 * @file Компонент Avatar (аватар).
 * Обёртка над @base-ui/react/avatar.
 * Используется для отображения фотографии пользователя,
 * заглушки (fallback), бейджа поверх аватара и группы аватаров.
 *
 * @base-ui/react — @base-ui/react/avatar
 */

"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"

import { cn } from "@/lib/utils"

/**
 * Avatar — корневой контейнер аватара.
 *
 * @param className - Дополнительные CSS-классы.
 * @param size - Размер аватара: "default" (32px), "sm" (24px), "lg" (40px).
 * @param props - Остальные пропсы AvatarPrimitive.Root.Props.
 *
 * data-slot="avatar"
 * data-size — значение размера.
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 dark:after:mix-blend-lighten",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarImage — изображение внутри аватара.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы AvatarPrimitive.Image.Props.
 *
 * data-slot="avatar-image"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "aspect-square size-full rounded-full object-cover",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarFallback — заглушка, показываемая пока не загрузилось изображение.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы AvatarPrimitive.Fallback.Props.
 *
 * data-slot="avatar-fallback"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 * Стили адаптируются под размер группы через group-data-[size=sm]/avatar.
 */
function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarBadge — бейдж (например, статус "онлайн") поверх аватара.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"span">.
 *
 * data-slot="avatar-badge"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 * Размер адаптируется к data-size родительского Avatar.
 */
function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarGroup — контейнер для группировки нескольких аватаров.
 * Аватары накладываются друг на друга с отрицательным margin.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="avatar-group"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
        className
      )}
      {...props}
    />
  )
}

/**
 * AvatarGroupCount — счётчик оставшихся аватаров внутри AvatarGroup.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="avatar-group-count"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 * Размер адаптируется под размер группы через group-has-data-[size=lg]/avatar-group.
 */
function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
