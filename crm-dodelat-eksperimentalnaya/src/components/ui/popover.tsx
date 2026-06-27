/**
 * @file Компонент Popover (всплывающая подсказка / поповер).
 * Обёртка над @base-ui/react/popover.
 * Используется для показа контента поверх других элементов по клику или ховеру.
 *
 * @base-ui/react — @base-ui/react/popover
 */

"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

/**
 * Popover — корневой компонент (Provider).
 *
 * @param props - Пропсы PopoverPrimitive.Root.Props.
 *
 * data-slot="popover"
 */
function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

/**
 * PopoverTrigger — элемент, открывающий поповер.
 *
 * @param props - Пропсы PopoverPrimitive.Trigger.Props.
 *
 * data-slot="popover-trigger"
 */
function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

/**
 * PopoverContent — содержимое поповера.
 *
 * @param className - Дополнительные CSS-классы.
 * @param align - Выравнивание: "start", "center", "end".
 * @param alignOffset - Смещение выравнивания.
 * @param side - Сторона появления: "top", "bottom", "left", "right", "inline-start", "inline-end".
 * @param sideOffset - Отступ от триггера.
 * @param props - Остальные пропсы PopoverPrimitive.Popup.Props и позиционера.
 *
 * data-slot="popover-content"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

/**
 * PopoverHeader — шапка поповера (заголовок + описание).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="popover-header"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-0.5 text-sm", className)}
      {...props}
    />
  )
}

/**
 * PopoverTitle — заголовок поповера.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы PopoverPrimitive.Title.Props.
 *
 * data-slot="popover-title"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

/**
 * PopoverDescription — описание поповера.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы PopoverPrimitive.Description.Props.
 *
 * data-slot="popover-description"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function PopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
