/**
 * @file Конфигурация Prisma ORM
 * @description Определяет подключение к базе данных PostgreSQL, путь к схеме
 *              и команду для запуска сидирования (заполнения тестовыми данными).
 *              Файл использует современный Prisma Config API (Prisma v6+).
 *
 * @see https://www.prisma.io/docs/orm/prisma-migrate/getting-started
 */

/**
 * Загрузка переменных окружения из файла .env.local.
 * Prisma Config по умолчанию не загружает dotenv, поэтому делаем это вручную.
 * Это необходимо, чтобы DATABASE_URL была доступна при запуске миграций.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

/**
 * defineConfig — функция для типизированного определения конфигурации Prisma.
 * env — утилита для безопасного чтения переменных окружения с type-safety.
 */
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  /**
   * Путь к файлу схемы Prisma.
   * Именно эта схема описывает все модели, enum'ы и отношения базы данных.
   * Путь задаётся относительно корня проекта.
   */
  schema: './prisma/schema.prisma',

  /**
   * Конфигурация источника данных (базы данных).
   * В данном случае используется PostgreSQL с URL из переменной окружения.
   */
  datasource: {
    /**
     * URL подключения к базе данных PostgreSQL.
     * Формат: postgresql://user:password@host:port/database
     * Значение берётся из переменной DATABASE_URL в .env.local.
     * env() проверяет, что переменная определена, и выбрасывает ошибку, если нет.
     */
    url: env('DATABASE_URL'),
  },

  /**
   * Настройки управления миграциями базы данных.
   */
  migrations: {
    /**
     * Команда для выполнения сидирования (заполнения) базы данных.
     * Выполняется после prisma migrate dev или вручную через prisma db seed.
     * tsx — TypeScript executor, запускает ./prisma/seed.ts напрямую (без компиляции).
     */
    seed: 'tsx ./prisma/seed.ts',
  },
})
