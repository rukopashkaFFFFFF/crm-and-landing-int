/**
 * @file Компонент Dialog (диалоговое окно / модалка).
 * Обёртка над @base-ui/react/dialog.
 * Используется для показа модальных окон, подтверждений, форм.
 *
 * @base-ui/react — @base-ui/react/dialog
 */

"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/**
 * Dialog — корневой компонент диалога (Provider).
 *
 * @param props - Пропсы DialogPrimitive.Root.Props.
 *
 * data-slot="dialog"
 */
function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

/**
 * DialogTrigger — элемент, открывающий диалог по клику.
 *
 * @param props - Пропсы DialogPrimitive.Trigger.Props.
 *
 * data-slot="dialog-trigger"
 */
function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

/**
 * DialogPortal — портал для рендера содержимого диалога вне DOM-иерархии.
 *
 * @param props - Пропсы DialogPrimitive.Portal.Props.
 *
 * data-slot="dialog-portal"
 */
function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/**
 * DialogClose — элемент для закрытия диалога (кнопка "закрыть").
 *
 * @param props - Пропсы DialogPrimitive.Close.Props.
 *
 * data-slot="dialog-close"
 */
function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/**
 * DialogOverlay — затемняющий фон (оверлей) поверх страницы.
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы DialogPrimitive.Backdrop.Props.
 *
 * data-slot="dialog-overlay"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * DialogContent — содержимое диалога (основной блок с контентом).
 * Автоматически включает Portal, Overlay и опциональную кнопку закрытия.
 *
 * @param className - Дополнительные CSS-классы.
 * @param showCloseButton - Показывать кнопку закрытия (X) в правом верхнем углу.
 * @param children - Дочерние элементы.
 * @param props - Остальные пропсы DialogPrimitive.Popup.Props.
 *
 * data-slot="dialog-content"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

/**
 * DialogHeader — шапка диалога (заголовок + описание).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="dialog-header"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

/**
 * DialogFooter — подвал диалога (кнопки действий).
 * При showCloseButton добавляет кнопку "Close" с variant="outline".
 *
 * @param className - Дополнительные CSS-классы.
 * @param showCloseButton - Показывать底部кнопку "Close".
 * @param children - Дочерние элементы.
 * @param props - Остальные пропсы React.ComponentProps<"div">.
 *
 * data-slot="dialog-footer"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

/**
 * DialogTitle — заголовок диалога (доступный, семантический).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы DialogPrimitive.Title.Props.
 *
 * data-slot="dialog-title"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

/**
 * DialogDescription — описание диалога (доступное, семантическое).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы DialogPrimitive.Description.Props.
 *
 * data-slot="dialog-description"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
