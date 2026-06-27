"use client"

/**
 * ThemeToggle — переключатель тёмной/светлой темы.
 *
 * Используется в Sidebar. Сохраняет выбор в localStorage
 * и управляет классом "dark" на document.documentElement.
 *
 * @param {Object} props
 * @param {string} [props.className] — дополнительные классы
 *
 * Состояния:
 * - isDark: текущая тема
 * - Инициализация из localStorage или системных настроек
 */

import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { t } from "@/lib/translations"

/**
 * getInitialTheme — определяет начальную тему из localStorage или HTML.
 * @returns true = тёмная тема, false = светлая
 */
function getInitialTheme(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem("theme")
  if (stored === "dark") return true
  if (stored === "light") return false
  return document.documentElement.classList.contains("dark")
}

/**
 * ThemeToggle — кнопка переключения темы.
 *
 * Шаги:
 * 1. При монтировании: getInitialTheme() -> установка isDark и класса.
 * 2. toggle: переключает isDark, обновляет класс на html, сохраняет в localStorage.
 *
 * @param className — доп. классы
 * @returns JSX — кнопка с иконкой солнца/луны
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const dark = getInitialTheme()
    setIsDark(dark)
    document.documentElement.classList.toggle("dark", dark)
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      aria-label={t("Toggle dark mode")}
      title={t("Toggle dark mode")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? t("Light mode") : t("Dark mode")}
    </button>
  )
}
