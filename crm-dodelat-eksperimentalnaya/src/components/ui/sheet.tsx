/**
 * @file Компонент Sheet (боковая панель / шторка).
 * Обёртка над @base-ui/react/dialog (использует DialogPrimitive как SheetPrimitive).
 * Используется для показа боковых панелей, фильтров, меню.
 *
 * @base-ui/react — @base-ui/react/dialog
 */

"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/**
 * Sheet — корневой компонент (Provider).
 *
 * @param props - Пропсы SheetPrimitive.Root.Props.
 *
 * data-slot="sheet"
 */
function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

/**
 * SheetTrigger — элемент, открывающий панель.
 *
 * @param props - Пропсы SheetPrimitive.Trigger.Props.
 *
 * data-slot="sheet-trigger"
 */
function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

/**
 * SheetClose — элемент для закрытия панели.
 *
 * @param props - Пропсы SheetPrimitive.Close.Props.
 *
 * data-slot="sheet-close"
 */
function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

/**
 * SheetPortal — портал для рендера панели вне DOM-иерархии.
 *
 * @param props - Пропсы SheetPrimitive.Portal.Props.
 *
 * data-slot="sheet-portal"
 */
function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

/**
 * SheetOverlay — затемняющий фон.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы SheetPrimitive.Backdrop.Props.
 *
 * data-slot="sheet-overlay"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  )
}

/**
 * SheetContent — содержимое панели (сама шторка).
 *
 * @param className - Дополнительные CSS-классы.
 * @param side - Сторона появления: "top", "right", "bottom", "left".
 * @param showCloseButton - Показывать кнопку закрытия (X).
 * @param children - Дочерние элементы.
 * @param props - Остальные пропсы SheetPrimitive.Popup.Props.
 *
 * data-slot="sheet-content"
 * data-side — сторона появления.
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

/**
 * SheetHeader — шапка панели (заголовок + описание).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="sheet-header"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

/**
 * SheetFooter — подвал панели (кнопки действий).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="sheet-footer"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

/**
 * SheetTitle — заголовок панели (доступный, семантический).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы SheetPrimitive.Title.Props.
 *
 * data-slot="sheet-title"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

/**
 * SheetDescription — описание панели (доступное, семантическое).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы SheetPrimitive.Description.Props.
 *
 * data-slot="sheet-description"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
