/**
 * @file Компонент Table (таблица).
 * Не использует @base-ui/react — реализован на нативных HTML-элементах.
 * Предоставляет семантические составные части: Table, TableHeader, TableBody, TableRow и т.д.
 *
 * @base-ui/react — не используется.
 */

"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Table — корневой контейнер таблицы.
 * Оборачивает <table> в <div> для поддержки горизонтального скролла.
 *
 * @param className - Дополнительные CSS-классы для <table>.
 * @param props - Остальные пропсы React.ComponentProps<"table">.
 *
 * data-slot="table" (на <table>), data-slot="table-container" (на <div>-обёртке).
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

/**
 * TableHeader — секция заголовка таблицы (<thead>).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"thead">.
 *
 * data-slot="table-header"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

/**
 * TableBody — тело таблицы (<tbody>).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"tbody">.
 *
 * data-slot="table-body"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

/**
 * TableFooter — подвал таблицы (<tfoot>).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"tfoot">.
 *
 * data-slot="table-footer"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * TableRow — строка таблицы (<tr>).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"tr">.
 *
 * data-slot="table-row"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 * Поддерживает hover-эффект и состояние has-aria-expanded.
 */
function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

/**
 * TableHead — ячейка заголовка (<th>).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"th">.
 *
 * data-slot="table-head"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * TableCell — ячейка данных (<td>).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"td">.
 *
 * data-slot="table-cell"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * TableCaption — подпись таблицы (<caption>).
 *
 * @param className - Дополнительные CSS-классы.
 * @param props - Остальные пропсы React.ComponentProps<"caption">.
 *
 * data-slot="table-caption"
 *
 * Кастомизация: cn() объединяет базовые стили с переданным className.
 */
function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
