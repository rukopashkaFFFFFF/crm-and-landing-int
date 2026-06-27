/**
 * @file Конфигурация ESLint
 * @description Определяет правила линтинга JavaScript/TypeScript/React кода.
 *              Использует новую "flat config" систему ESLint (v9+),
 *              где конфигурация — это массив объектов (вместо иерархических .eslintrc).
 *
 * Для Next.js используются готовые настройки eslint-config-next:
 *   — core-web-vitals: базовые правила производительности и best-practices
 *   — typescript: правила для TypeScript (типизация, any, null и т.д.)
 *
 * @see https://nextjs.org/docs/app/api-reference/config/eslint
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 */

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Основной конфигурационный массив ESLint.
 * defineConfig — утилита для типизированного определения конфигурации (flat config).
 *
 * Структура:
 * 1. nextVitals — массив конфигов с правилами Core Web Vitals (LCP, CLS, INP)
 * 2. nextTs — массив конфигов с TypeScript-правилами
 * 3. globalIgnores — глобальные игнорируемые паттерны (файлы, которые не линтим)
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /**
   * Глобальные игнорируемые директории/файлы.
   * ESLint не будет проверять эти пути, что ускоряет линтинг.
   */
  globalIgnores([
    /**
     * Директория со сборочными артефактами Next.js.
     * Содержит скомпилированные файлы, сгенерированные страницы, кеш.
     * Эти файлы генерируются автоматически и не должны линтиться.
     */
    ".next/**",

    /**
     * Директория production-сборки.
     * Создаётся после команды next build (при output: "standalone").
     * Содержит минифицированный/собранный код — линтинг не имеет смысла.
     */
    "out/**",

    /**
     * Директория сборки (общий кеш/артефакты).
     * Используется некоторыми инструментами (tRPC, t3) для хранения build.
     */
    "build/**",

    /**
     * Сгенерированный TypeScript-файл с декларациями типов Next.js.
     * Автоматически создаётся/обновляется при next dev / next build.
     * Не предназначен для ручного редактирования или линтинга.
     */
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
