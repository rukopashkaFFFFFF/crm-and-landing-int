/**
 * @file Конфигурация PostCSS
 * @description Определяет набор PostCSS-плагинов, обрабатывающих CSS-файлы.
 *              PostCSS — это инструмент для трансформации CSS с помощью плагинов
 *              (автопрефиксы, минификация, поддержка современных CSS-возможностей).
 *
 * В данном проекте PostCSS используется исключительно для интеграции
 * Tailwind CSS v4 — самого популярного CSS-фреймворка.
 *
 * @see https://tailwindcss.com/docs/installation/using-postcss
 */

const config = {
  /**
   * Список PostCSS-плагинов в порядке их применения.
   * Каждый плагин получает CSS из предыдущего плагина, трансформирует и передаёт дальше.
   */
  plugins: {
    /**
     * @tailwindcss/postcss — официальный PostCSS-плагин Tailwind CSS.
     * v4 этого плагина заменяет:
     *   — tailwind.config.js (конфигурация теперь в CSS через @theme)
     *   — autoprefixer (встроен в Tailwind)
     *   — cssnano (опционально, для production)
     *
     * Плагин обрабатывает директивы @import "tailwindcss", @theme, @apply
     * и генерирует финальные CSS-классы на основе использованных в шаблонах.
     */
    "@tailwindcss/postcss": {},
  },
};

export default config;
