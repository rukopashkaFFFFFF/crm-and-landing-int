/**
 * @file Сид-файл (заполнитель) базы данных
 * @description Создаёт тестовый набор данных для разработки и демонстрации CRM.
 *              Запускается через: npx prisma db seed  (или tsx ./prisma/seed.ts)
 *
 * ЧТО СОЗДАЁТСЯ:
 *   — 6 пользователей с разными ролями (OWNER, PM, DEVELOPER, DESIGNER, SALES)
 *   — 10 клиентов с разными статусами и источниками
 *   — 5 лидов на разных этапах воронки продаж
 *   — 5 проектов (для 4 клиентов)
 *   — 30 задач по проектам
 *   — 15 записей времени (time tracking)
 *   — 12 комментариев
 *   — 5 счетов
 *   — 20 активностей в логе
 *   — 5 уведомлений
 *   — 2 токена клиентского портала
 *
 * ВАЖНО: Все данные на русском языке — для демонстрации клиенту.
 */

// Загружаем переменные окружения из .env.local до всех импортов.
// Это необходимо, чтобы DATABASE_URL была доступна при инициализации PrismaClient.
import { config } from "dotenv"
config({ path: ".env.local" })

// PrismaClient — сгенерированный ORM-клиент для работы с БД.
// Импортируем из директории src/generated/prisma (см. schema.prisma: output).
import { PrismaClient } from "../src/generated/prisma/client"

// PrismaPg — адаптер для подключения через pg (node-postgres).
// Позволяет использовать нативный PostgreSQL-драйвер вместо HTTP-query engine.
import { PrismaPg } from "@prisma/adapter-pg"

// hashPassword — утилита для хеширования паролей (bcrypt/argon2).
// Находится в src/lib/auth-helpers.ts.
import { hashPassword } from "../src/lib/auth-helpers"

// =====================================================================
// ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
// =====================================================================

// Создаём адаптер PostgreSQL с connection string из переменной окружения.
// Non-null assertion (!) — мы уверены, что DATABASE_URL определена в .env.local.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

// Создаём экземпляр PrismaClient с кастомным адаптером (PG driver adapter).
// Это улучшает производительность по сравнению со стандартным HTTP-движком.
const prisma = new PrismaClient({ adapter })

// =====================================================================
// ОСНОВНАЯ ФУНКЦИЯ СИДИРОВАНИЯ
// =====================================================================

/**
 * main — точка входа для наполнения базы данных.
 * Все операции выполняются последовательно (Promise.all для независимых созданий),
 * чтобы сохранить ссылочную целостность (связи между сущностями).
 *
 * Порядок создания (важен из-за foreign keys):
 *   1. Пользователи (User) — нет внешних зависимостей
 *   2. Клиенты (Client) — зависит от User (assignedTo)
 *   3. Лиды (Lead) — зависит от Client
 *   4. Проекты (Project) — зависит от Client, User (pm)
 *   5. Задачи (Task) — зависит от Project, User (assignee)
 *   6. TimeEntry — зависит от Task, User
 *   7. Comment — зависит от Project, User
 *   8. Invoice — зависит от Client, Project
 *   9. Activity — зависит от User, Client, Project
 *   10. Notification — зависит от User
 *   11. ClientPortalToken — зависит от Client, Project
 */
async function main() {
  console.log("Наполнение базы данных...")

  // ===================================================================
  // ШАГ 1: ОЧИСТКА СУЩЕСТВУЮЩИХ ДАННЫХ
  // ===================================================================
  // Удаляем все записи в обратном порядке зависимостей (от дочерних к родительским).
  // Это необходимо для идемпотентности — скрипт можно запускать многократно.
  // !!! ВАЖНО: Order of deleteMany имеет значение из-за foreign key constraints.
  await prisma.clientPortalToken.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.timeEntry.deleteMany()
  await prisma.task.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.estimate.deleteMany()
  await prisma.project.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.client.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()

  // ===================================================================
  // ШАГ 2: ПОЛЬЗОВАТЕЛИ (Users)
  // ===================================================================
  // Создаём 6 пользователей с разными ролями для тестирования RLS и permissions.
  // Используем upsert вместо create, чтобы скрипт можно было запускать повторно
  // без ошибок дублирования (по уникальному полю email).

  /**
   * Хешируем пароль один раз для всех пользователей (одинаковый пароль для тестов).
   * Пароль: "password123" — стандартный тестовый пароль.
   * Хеширование через hashPassword() — bcrypt с солью (см. src/lib/auth-helpers.ts).
   */
  const password = hashPassword("password123")

  /**
   * upsertUser — вспомогательная функция для создания или обновления пользователя.
   * Использует Prisma.upsert:
   *   - where: { email } — поиск по уникальному email
   *   - update: обновляет поля, если пользователь уже существует
   *   - create: создаёт нового, если не найден
   *
   * Это делает сид-скрипт идемпотентным — можно запускать многократно.
   */
  async function upsertUser(email: string, name: string, role: any) {
    return prisma.user.upsert({
      where: { email },
      update: { name, role, password, active: true },
      create: { email, name, role, password, active: true },
    })
  }

  // OWNER — владелец агентства (полный доступ)
  const owner = await upsertUser("alex@agency.com", "Александр Митчелл", "OWNER")

  // PM — Project Manager (управление проектами и клиентами)
  const pm = await upsertUser("sarah@agency.com", "Сара Чен", "PM")

  // DEVELOPER — разработчик (работа с задачами)
  const dev = await upsertUser("marcus@agency.com", "Маркус Джонсон", "DEVELOPER")

  // DESIGNER — дизайнер (создание макетов)
  const designer = await upsertUser("anna@agency.com", "Анна Петровна", "DESIGNER")

  // SALES — менеджер по продажам (лиды и клиенты)
  const sales = await upsertUser("elena@agency.com", "Елена Продажник", "SALES")

  // DEVELOPER (support) — второй разработчик для поддержки
  const support = await upsertUser("support@agency.com", "Дмитрий Саппорт", "DEVELOPER")

  console.log(`Создано ${6} пользователей`)

  // ===================================================================
  // ШАГ 3: КЛИЕНТЫ (Clients)
  // ===================================================================
  // Создаём 10 клиентов с разными:
  //   — статусами (LEAD, ACTIVE, INACTIVE, CHURNED)
  //   — источниками (REFERRAL, WEBSITE, COLD, OTHER)
  //   — ответственным менеджером (assignedToId)
  //   — тегами для фильтрации
  //
  // Используем Promise.all для параллельного создания — все клиенты независимы.

  const clients = await Promise.all([
    // Клиент 0: ТехСтарт — активный финтех-стартап, по рекомендации
    prisma.client.create({
      data: {
        name: "ООО «ТехСтарт»",
        email: "hello@techstart.io",
        phone: "+1-555-0101",
        company: "ООО «ТехСтарт»",
        website: "https://techstart.io",
        country: "US",
        notes: "Быстрорастущий стартап в сфере финтеха. Ищут постоянного партнёра по разработке.",
        status: "ACTIVE",
        source: "REFERRAL",
        tags: ["startup", "fintech", "high-priority"],
        assignedToId: pm.id,   // PM — ответственный
      },
    }),

    // Клиент 1: Зелёный Лист — лид с сайта, нужен редизайн
    prisma.client.create({
      data: {
        name: "МедиаГрупп «Зелёный Лист»",
        email: "contact@greenleafmedia.com",
        phone: "+1-555-0102",
        company: "МедиаГрупп «Зелёный Лист»",
        website: "https://greenleafmedia.com",
        country: "US",
        notes: "Заинтересованы в полном редизайне сайта. Первая встреча запланирована.",
        status: "LEAD",
        source: "WEBSITE",
        tags: ["media", "design"],
        assignedToId: owner.id, // OWNER ведёт переговоры лично
      },
    }),

    // Клиент 2: БлюОушен — активный SAAS-клиент, долгосрочные отношения
    prisma.client.create({
      data: {
        name: "БлюОушен Аналитикс",
        email: "info@blueocean.io",
        phone: "+1-555-0103",
        company: "БлюОушен Аналитикс",
        website: "https://blueocean.io",
        country: "UK",
        notes: "Постоянный клиент. Мы разработали их MVP и сейчас поддерживаем платформу.",
        status: "ACTIVE",
        source: "REFERRAL",
        tags: ["saas", "data", "long-term"],
        assignedToId: pm.id,
      },
    }),

    // Клиент 3: Саммит Венчурс — неактивный (проект завершён)
    prisma.client.create({
      data: {
        name: "Саммит Венчурс",
        email: "hello@summit.vc",
        company: "Саммит Венчурс",
        country: "US",
        notes: "Был активным клиентом 2 года. Проект завершён, текущих задач нет.",
        status: "INACTIVE",
        source: "COLD",
        tags: ["vc", "portfolio"],
        assignedToId: null, // Никто не назначен — клиент неактивен
      },
    }),

    // Клиент 4: ПикПерформанс — ушедший (CHURNED) после первого этапа
    prisma.client.create({
      data: {
        name: "ПикПерформанс Коучинг",
        email: "team@peakperform.co",
        phone: "+1-555-0105",
        company: "ПикПерформанс Коучинг",
        country: "CA",
        notes: "Ушли после запуска сайта. Не стали продолжать второй этап.",
        status: "CHURNED",
        source: "WEBSITE",
        tags: ["coaching", "lost"],
        assignedToId: owner.id,
      },
    }),

    // Клиент 5: Харбор Солюшнс — квалифицированный лид по рекомендации
    prisma.client.create({
      data: {
        name: "Харбор Солюшнс",
        email: "info@harbor.solutions",
        phone: "+1-555-0106",
        company: "Харбор Солюшнс Груп",
        country: "US",
        notes: "Квалифицированный лид по рекомендации существующего клиента. Нужна кастомная CRM.",
        status: "LEAD",
        source: "REFERRAL",
        tags: ["enterprise", "crm", "warm"],
        assignedToId: pm.id,
      },
    }),

    // Клиент 6: Атлас Инновейшнс — холодный контакт стал активным проектом
    prisma.client.create({
      data: {
        name: "Атлас Инновейшнс",
        email: "hello@atlasinnovations.com",
        company: "Атлас Инновейшнс Лтд",
        website: "https://atlasinnovations.com",
        country: "DE",
        notes: "Холодный контакт превратился в активный проект. Разрабатываем их SaaS-платформу.",
        status: "ACTIVE",
        source: "COLD",
        tags: ["saas", "german-market"],
        assignedToId: pm.id,
      },
    }),

    // Клиент 7: НортСтар — активный, сайт-визитка (назначен разработчику)
    prisma.client.create({
      data: {
        name: "НортСтар Диджитал",
        email: "studio@northstar.digital",
        phone: "+1-555-0108",
        company: "НортСтар Диджитал Студио",
        website: "https://northstar.digital",
        country: "US",
        notes: "Креативное агентство, нужен новый сайт-визитка и портфолио-платформа.",
        status: "ACTIVE",
        source: "WEBSITE",
        tags: ["creative", "agency", "design"],
        assignedToId: dev.id, // Разработчик ведёт как менеджер
      },
    }),

    // Клиент 8: РиверРан — неактивный (проект завершён, сотрудничество не нужно)
    prisma.client.create({
      data: {
        name: "РиверРан Студиос",
        email: "info@riverrunstudios.com",
        company: "РиверРан Студиос",
        country: "UK",
        notes: "Завершили разработку сайта для игровых ассетов. Дальнейшее сотрудничество не требуется.",
        status: "INACTIVE",
        source: "OTHER",
        tags: ["gaming", "completed"],
        assignedToId: null,
      },
    }),

    // Клиент 9: ГолденГейт — крупный лид на корпоративную панель
    prisma.client.create({
      data: {
        name: "ГолденГейт Тех",
        email: "partners@goldengate.tech",
        company: "ГолденГейт Технолоджис",
        website: "https://goldengate.tech",
        country: "US",
        notes: "Заинтересованы в корпоративной дашборд-системе. Ключевое лицо — технический директор.",
        status: "LEAD",
        source: "REFERRAL",
        tags: ["enterprise", "dashboard", "high-value"],
        assignedToId: owner.id,
      },
    }),
  ])

  console.log(`Создано ${clients.length} клиентов`)

  // ===================================================================
  // ШАГ 4: ЛИДЫ (Leads) — ВОРОНКА ПРОДАЖ
  // ===================================================================
  // Создаём 5 лидов на разных этапах воронки продаж.
  // Это демонстрирует пайплайн: от первого контакта до проигранной сделки.

  /**
   * pickClient — вспомогательная функция для случайного выбора клиента.
   * Используется для создания активностей (шаг 10) с привязкой к случайному клиенту.
   */
  const pickClient = () => clients[Math.floor(Math.random() * clients.length)]

  const leads = await Promise.all([
    // Лид 1: Зелёный Лист (clients[1]) — на этапе "Связались", сумма $45k
    prisma.lead.create({
      data: {
        clientId: clients[1].id,
        stage: "CONTACTED",
        value: 45000,
        probability: 40,
        expectedCloseDate: new Date("2026-08-15"),
        notes: "Первое предложение отправлено. Ожидаем обратную связь по цене.",
      },
    }),

    // Лид 2: Харбор Солюшнс (clients[5]) — отправлено КП, сумма $85k
    prisma.lead.create({
      data: {
        clientId: clients[5].id,
        stage: "PROPOSAL_SENT",
        value: 85000,
        probability: 60,
        expectedCloseDate: new Date("2026-07-30"),
        notes: "Кастомное CRM-решение. Клиент очень заинтересован в нашем подходе.",
      },
    }),

    // Лид 3: НортСтар (clients[7]) — переговоры, сумма $25k
    prisma.lead.create({
      data: {
        clientId: clients[7].id,
        stage: "NEGOTIATION",
        value: 25000,
        probability: 80,
        expectedCloseDate: new Date("2026-07-15"),
        notes: "Объём работ согласован. Обсуждаем сроки.",
      },
    }),

    // Лид 4: ГолденГейт (clients[9]) — переговоры, крупная сделка $120k
    prisma.lead.create({
      data: {
        clientId: clients[9].id,
        stage: "NEGOTIATION",
        value: 120000,
        probability: 70,
        expectedCloseDate: new Date("2026-08-01"),
        notes: "Сделка по корпоративной панели управления. Вовлечено несколько стейкхолдеров.",
      },
    }),

    // Лид 5: ПикПерформанс (clients[4]) — ПРОИГРАН, причина известна
    prisma.lead.create({
      data: {
        clientId: clients[4].id,
        stage: "LOST",
        value: 35000,
        probability: 0,
        expectedCloseDate: new Date("2026-05-01"),
        lostReason: "Бюджетные ограничения — клиент выбрал более дешёвый офшорный вариант.",
      },
    }),
  ])

  console.log(`Создано ${leads.length} лидов`)

  // ===================================================================
  // ШАГ 5: ПРОЕКТЫ (Projects)
  // ===================================================================
  // Создаём 5 проектов для 4 клиентов. Каждый проект имеет:
  //   — бюджет и уже потраченную сумму (для отображения прогресса)
  //   — PM (все проекты ведёт Сара Чен)
  //   — даты начала/окончания
  //   — статус (IN_PROGRESS, PLANNING, REVIEW)

  const projects = await Promise.all([
    // Проект 1: Редизайн интернет-магазина для ТехСтарт (клиент 0)
    // В процессе, потрачено $42k из $95k
    prisma.project.create({
      data: {
        clientId: clients[0].id,
        name: "Редизайн интернет-магазина",
        description: "Полный редизайн и перестройка e-commerce платформы ТехСтарт с использованием Next.js и интеграцией Stripe.",
        status: "IN_PROGRESS",
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-09-30"),
        budget: 95000,
        spent: 42000,
        pmId: pm.id,
      },
    }),

    // Проект 2: MVP мобильного приложения для ТехСтарт (клиент 0)
    // Планируется, бюджет $65k, ещё не начат
    prisma.project.create({
      data: {
        clientId: clients[0].id,
        name: "MVP мобильного приложения",
        description: "React Native мобильное приложение для клиентского портала ТехСтарт.",
        status: "PLANNING",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-12-31"),
        budget: 65000,
        spent: 0,
        pmId: pm.id,
      },
    }),

    // Проект 3: MVP панели аналитики для БлюОушен (клиент 2)
    // В процессе, потрачено $51k из $78k
    prisma.project.create({
      data: {
        clientId: clients[2].id,
        name: "MVP панели аналитики",
        description: "Интерактивная аналитическая панель с визуализацией данных в реальном времени с использованием D3.js и WebSockets.",
        status: "IN_PROGRESS",
        startDate: new Date("2026-04-15"),
        endDate: new Date("2026-08-15"),
        budget: 78000,
        spent: 51000,
        pmId: pm.id,
      },
    }),

    // Проект 4: Сайт-визитка для НортСтар (клиент 7)
    // На ревью, почти готов (потрачено $28k из $32k)
    prisma.project.create({
      data: {
        clientId: clients[7].id,
        name: "Сайт-визитка и портфолио",
        description: "Новый сайт-визитка с портфолио, интеграцией CMS и блогом.",
        status: "REVIEW",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-07-30"),
        budget: 32000,
        spent: 28000,
        pmId: pm.id,
      },
    }),

    // Проект 5: SaaS-платформа для Атлас Инновейшнс (клиент 6)
    // Самый крупный проект, $180k бюджет, потрачено $95k
    prisma.project.create({
      data: {
        clientId: clients[6].id,
        name: "Разработка SaaS-платформы",
        description: "Создание B2B SaaS-платформы с управлением подписками, функциями командной работы и API.",
        status: "IN_PROGRESS",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-11-30"),
        budget: 180000,
        spent: 95000,
        pmId: pm.id,
      },
    }),
  ])

  console.log(`Создано ${projects.length} проектов`)

  // ===================================================================
  // ШАГ 6: ЗАДАЧИ (Tasks)
  // ===================================================================
  // Создаём 30 задач для 5 проектов. Задачи имеют:
  //   — разные статусы (TODO, IN_PROGRESS, DONE, IN_REVIEW)
  //   — разные приоритеты (LOW, MEDIUM, HIGH, URGENT)
  //   — оценку в часах (estimatedHours)
  //   — назначаются разработчику или PM (чередуются)
  //
  // Структура taskData: массив объектов с указанием индекса проекта (projectIdx),
  // чтобы связать задачу с конкретным проектом.

  const taskData = [
    // === Проект 0: Интернет-магазин (10 задач) ===
    { projectIdx: 0, title: "Настройка Next.js проекта с TypeScript",         status: "DONE",        priority: "HIGH",   hours: 8  },
    { projectIdx: 0, title: "Реализация страницы каталога с поиском",         status: "DONE",        priority: "HIGH",   hours: 24 },
    { projectIdx: 0, title: "Разработка страницы товара",                    status: "DONE",        priority: "HIGH",   hours: 16 },
    { projectIdx: 0, title: "Реализация корзины покупок",                    status: "IN_PROGRESS", priority: "HIGH",   hours: 20 },
    { projectIdx: 0, title: "Интеграция платёжного шлюза Stripe",             status: "TODO",        priority: "URGENT", hours: 16 },
    { projectIdx: 0, title: "Разработка аутентификации и профиля пользователя", status: "IN_PROGRESS", priority: "HIGH",   hours: 12 },
    { projectIdx: 0, title: "Создание админ-панели для заказов",             status: "TODO",        priority: "MEDIUM", hours: 20 },
    { projectIdx: 0, title: "Реализация workflow управления заказами",        status: "TODO",        priority: "HIGH",   hours: 16 },
    { projectIdx: 0, title: "Написание юнит-тестов для ключевых функций",    status: "TODO",        priority: "MEDIUM", hours: 24 },
    { projectIdx: 0, title: "Оптимизация производительности и подготовка к запуску", status: "TODO", priority: "LOW",    hours: 16 },

    // === Проект 1: Мобильное приложение (4 задачи) ===
    { projectIdx: 1, title: "Дизайн вайрфреймов приложения",                status: "TODO",        priority: "HIGH",   hours: 16 },
    { projectIdx: 1, title: "Настройка структуры React Native проекта",     status: "TODO",        priority: "HIGH",   hours: 8  },
    { projectIdx: 1, title: "Реализация навигации и маршрутизации",          status: "TODO",        priority: "HIGH",   hours: 12 },
    { projectIdx: 1, title: "Создание слоя интеграции с API",               status: "TODO",        priority: "MEDIUM", hours: 20 },

    // === Проект 2: Панель аналитики (6 задач) ===
    { projectIdx: 2, title: "Проектирование схемы БД для аналитики",          status: "DONE",        priority: "HIGH",   hours: 8  },
    { projectIdx: 2, title: "Настройка WebSocket-соединения в реальном времени", status: "DONE",     priority: "HIGH",   hours: 12 },
    { projectIdx: 2, title: "Разработка пайплайна приёма данных",            status: "IN_PROGRESS", priority: "HIGH",   hours: 24 },
    { projectIdx: 2, title: "Создание компонентов графиков с recharts",     status: "IN_PROGRESS", priority: "HIGH",   hours: 16 },
    { projectIdx: 2, title: "Реализация макета панели и фильтров",           status: "TODO",        priority: "MEDIUM", hours: 20 },
    { projectIdx: 2, title: "Добавление функции экспорта (PDF/CSV)",        status: "TODO",        priority: "LOW",    hours: 12 },

    // === Проект 3: Сайт-визитка (5 задач) ===
    { projectIdx: 3, title: "Дизайн hero-секции главной страницы",           status: "DONE",        priority: "HIGH",   hours: 8  },
    { projectIdx: 3, title: "Разработка сетки портфолио с фильтрацией",     status: "DONE",        priority: "HIGH",   hours: 16 },
    { projectIdx: 3, title: "Интеграция headless CMS (Sanity)",             status: "IN_REVIEW",   priority: "HIGH",   hours: 12 },
    { projectIdx: 3, title: "Реализация блога с RSS-лентой",               status: "DONE",        priority: "MEDIUM", hours: 10 },
    { projectIdx: 3, title: "Адаптивное тестирование и кросс-браузерные исправления", status: "TODO", priority: "HIGH",   hours: 8  },

    // === Проект 4: SaaS-платформа (5 задач) ===
    { projectIdx: 4, title: "Настройка мультитенантной архитектуры БД",     status: "DONE",        priority: "URGENT", hours: 16 },
    { projectIdx: 4, title: "Реализация биллинга подписок через Stripe",    status: "DONE",        priority: "HIGH",   hours: 24 },
    { projectIdx: 4, title: "Разработка приглашений команды и управления ролями", status: "IN_PROGRESS", priority: "HIGH", hours: 20 },
    { projectIdx: 4, title: "Создание публичного API с ограничением запросов",  status: "TODO",    priority: "HIGH",   hours: 32 },
    { projectIdx: 4, title: "Реализация системы аудита логов",              status: "TODO",        priority: "MEDIUM", hours: 12 },
  ]

  /**
   * Создаём задачи последовательно (for...of), чтобы иметь массив tasks
   * для последующего использования (time entries, комментарии).
   * assigneeId чередуется (чётный projectIdx -> dev, нечётный -> pm).
   */
  const tasks = []
  for (const t of taskData) {
    const task = await prisma.task.create({
      data: {
        projectId: projects[t.projectIdx].id,
        assigneeId: t.projectIdx % 2 === 0 ? dev.id : pm.id,
        title: t.title,
        status: t.status as any,
        priority: t.priority as any,
        estimatedHours: t.hours,
        position: 0,
      },
    })
    tasks.push(task)
  }

  console.log(`Создано ${tasks.length} задач`)

  // ===================================================================
  // ШАГ 7: TIME ENTRIES (Записи времени)
  // ===================================================================
  // Создаём 15 записей времени для демонстрации time tracking.
  // Каждая запись привязана к задаче (по очереди) и пользователю (чередуются).
  // Часы: случайное число от 1 до 6.
  // billable: true для 3 из 4 записей (1 из 4 — административная, не выставляется).

  const timeEntries = []
  for (let i = 0; i < 15; i++) {
    const task = tasks[i % tasks.length]
    const entry = await prisma.timeEntry.create({
      data: {
        taskId: task.id,
        userId: i % 3 === 0 ? dev.id : pm.id, // Каждый 3-й entry от dev, остальные от pm
        description: `Работа над ${task.title}`,
        hours: Math.floor(Math.random() * 6) + 1, // 1-6 часов
        date: new Date(2026, 5, 15 - i),          // Дни с 15 июня назад
        billable: i % 4 !== 0,                     // Каждая 4-я — небиллируемая
      },
    })
    timeEntries.push(entry)
  }

  console.log(`Создано ${timeEntries.length} записей времени`)

  // ===================================================================
  // ШАГ 8: КОММЕНТАРИИ (Comments)
  // ===================================================================
  // Создаём 12 комментариев к проектам от разных авторов (OWNER, PM, DEV).
  // isInternal: каждый 4-й комментарий — внутренний (visible only to team).
  // Комментарии демонстрируют real-life коммуникацию в CRM.

  const commentTexts = [
    "Отлично выглядит! Дайте ещё раз посмотреть дизайн.",
    "Нужно обсудить изменения в API на следующем стендапе.",
    "Клиент утвердил макеты. Переходим к реализации.",
    "Нашёл баг в платёжном процессе. Нужно исправить до релиза.",
    "Показатели производительности стали значительно лучше после оптимизации.",
    "Ждём от клиента остальные материалы.",
    "Развернули на стейджинге для внутреннего тестирования.",
    "Обновил документацию с новыми эндпоинтами.",
    "Пожалуйста, добавьте обработку ошибок для краевого случая, который обсуждали.",
    "Ревью кода завершено. Несколько мелких замечаний по коду.",
    "Дизайн-команда запросила дополнительные итерации по мобильной вёрстке.",
    "Миграция БД прошла успешно на стейджинге.",
    "Ограничение запросов стороннего API вызывает проблемы. Нужно добавить кеширование.",
    "Ретроспектива спринта запланирована на пятницу.",
    "Клиент хочет добавить ещё две функции в объём работ.",
  ]

  const comments = []
  for (let i = 0; i < 12; i++) {
    const comment = await prisma.comment.create({
      data: {
        content: commentTexts[i],
        authorId: i % 3 === 0 ? owner.id : i % 3 === 1 ? pm.id : dev.id,
        projectId: projects[i % projects.length].id,
        isInternal: i % 4 === 0, // 25% комментариев — внутренние
      },
    })
    comments.push(comment)
  }

  console.log(`Создано ${comments.length} комментариев`)

  // ===================================================================
  // ШАГ 9: СЧЕТА (Invoices)
  // ===================================================================
  // Создаём 5 счетов для демонстрации биллинга.
  // Статусы: PAID (2), SENT (1), OVERDUE (1), DRAFT (1).
  // Содержат lineItems — JSON-массив с описанием работ, количеством, ценой.
  // Для оплаченных счетов указана дата оплаты (paidAt).

  const invoices = await Promise.all([
    // Счёт 1: ТехСтарт — Спринт 1, оплачен
    prisma.invoice.create({
      data: {
        clientId: clients[0].id,
        projectId: projects[0].id,
        number: "INV-2026-001",
        status: "PAID",
        subtotal: 15000,
        tax: 1500,
        total: 16500,
        dueDate: new Date("2026-05-15"),
        paidAt: new Date("2026-05-10"), // Оплачен досрочно
        lineItems: [
          { description: "Интернет-магазин — Спринт 1", quantity: 1, unitPrice: 12000, total: 12000 },
          { description: "Настройка дизайн-системы", quantity: 1, unitPrice: 3000, total: 3000 },
        ],
      },
    }),

    // Счёт 2: ТехСтарт — Спринт 2, отправлен (ждём оплату)
    prisma.invoice.create({
      data: {
        clientId: clients[0].id,
        projectId: projects[0].id,
        number: "INV-2026-002",
        status: "SENT",
        subtotal: 18000,
        tax: 1800,
        total: 19800,
        dueDate: new Date("2026-07-01"),
        lineItems: [
          { description: "Интернет-магазин — Спринт 2", quantity: 1, unitPrice: 15000, total: 15000 },
          { description: "Интеграция Stripe", quantity: 1, unitPrice: 3000, total: 3000 },
        ],
      },
    }),

    // Счёт 3: БлюОушен — Этап 1, оплачен
    prisma.invoice.create({
      data: {
        clientId: clients[2].id,
        projectId: projects[2].id,
        number: "INV-2026-003",
        status: "PAID",
        subtotal: 25000,
        tax: 2500,
        total: 27500,
        dueDate: new Date("2026-06-01"),
        paidAt: new Date("2026-05-28"),
        lineItems: [
          { description: "Панель аналитики — Этап 1", quantity: 1, unitPrice: 20000, total: 20000 },
          { description: "Инфраструктура WebSocket", quantity: 1, unitPrice: 5000, total: 5000 },
        ],
      },
    }),

    // Счёт 4: НортСтар — просрочен (OVERDUE)
    prisma.invoice.create({
      data: {
        clientId: clients[7].id,
        projectId: projects[3].id,
        number: "INV-2026-004",
        status: "OVERDUE",
        subtotal: 12000,
        tax: 1200,
        total: 13200,
        dueDate: new Date("2026-06-15"),
        lineItems: [
          { description: "Дизайн сайта — Главная + 5 страниц", quantity: 1, unitPrice: 8000, total: 8000 },
          { description: "Интеграция CMS", quantity: 1, unitPrice: 4000, total: 4000 },
        ],
      },
    }),

    // Счёт 5: Атлас Инновейшнс — черновик (ещё не отправлен)
    prisma.invoice.create({
      data: {
        clientId: clients[6].id,
        projectId: projects[4].id,
        number: "INV-2026-005",
        status: "DRAFT",
        subtotal: 45000,
        tax: 4500,
        total: 49500,
        dueDate: new Date("2026-08-01"),
        lineItems: [
          { description: "SaaS-платформа — Разработка Q3", quantity: 1, unitPrice: 35000, total: 35000 },
          { description: "Инфраструктура и DevOps", quantity: 1, unitPrice: 10000, total: 10000 },
        ],
      },
    }),
  ])

  console.log(`Создано ${invoices.length} счетов`)

  // ===================================================================
  // ШАГ 10: АКТИВНОСТИ (Activity Log)
  // ===================================================================
  // Создаём 20 записей в логе действий (аудит-трейл).
  // Каждая запись содержит тип действия, описание, кто сделал, к кому/чему относится.
  // metadata — дополнительный JSON (в данном случае источник и время).
  // Используется pickClient() для случайного выбора клиента.

  const activityTypes = [
    "CLIENT_CREATED", "LEAD_UPDATED", "PROJECT_STARTED",
    "TASK_COMPLETED", "INVOICE_SENT", "COMMENT_ADDED",
    "STATUS_CHANGED", "FILE_UPLOADED", "MEETING_SCHEDULED",
  ]

  for (let i = 0; i < 20; i++) {
    const client = pickClient()
    const project = projects[Math.floor(Math.random() * projects.length)]
    await prisma.activity.create({
      data: {
        type: activityTypes[i % activityTypes.length],
        description: `Активность #${i + 1}: ${activityTypes[i % activityTypes.length]} для ${client.name}`,
        userId: i % 2 === 0 ? pm.id : dev.id,
        clientId: client.id,
        projectId: project.id,
        metadata: { source: "seed", timestamp: new Date().toISOString() },
      },
    })
  }

  console.log("Создано 20 активностей")

  // ===================================================================
  // ШАГ 11: УВЕДОМЛЕНИЯ (Notifications)
  // ===================================================================
  // Создаём 5 уведомлений разных типов для разных пользователей.
  // Каждое уведомление содержит заголовок, сообщение, тип и ссылку для перехода.

  const notifications = await Promise.all([
    // PM: просроченный счёт (WARNING)
    prisma.notification.create({
      data: { userId: pm.id, title: "Просроченный счёт", message: "Счёт INV-2026-004 для НортСтар Диджитал просрочен.", type: "WARNING", link: "/invoices" },
    }),
    // PM: новый лид назначен (INFO)
    prisma.notification.create({
      data: { userId: pm.id, title: "Назначен новый лид", message: "ГолденГейт Тех назначен на вас.", type: "INFO", link: "/clients" },
    }),
    // DEV: задача выполнена (SUCCESS)
    prisma.notification.create({
      data: { userId: dev.id, title: "Задача выполнена", message: "Страница каталога интернет-магазина отмечена как выполненная.", type: "SUCCESS", link: "/tasks" },
    }),
    // OWNER: проект под угрозой (ERROR)
    prisma.notification.create({
      data: { userId: owner.id, title: "Проект под угрозой", message: "Проект SaaS-платформы отстаёт от графика.", type: "ERROR", link: "/projects" },
    }),
    // PM: встреча (INFO)
    prisma.notification.create({
      data: { userId: pm.id, title: "Обзор спринта", message: "Ретроспектива спринта запланирована на пятницу в 15:00.", type: "INFO", link: "/calendar" },
    }),
  ])

  console.log(`Создано ${notifications.length} уведомлений`)

  // ===================================================================
  // ШАГ 12: КЛИЕНТСКИЙ ПОРТАЛ (Portal Tokens)
  // ===================================================================
  // Создаём 2 токена для доступа клиентов к порталу проекта.
  // Токены дают возможность клиентам просматривать статус проекта без входа в CRM.
  // Срок действия — до 2027 года.

  await prisma.clientPortalToken.create({
    data: {
      clientId: clients[0].id,  // ТехСтарт
      projectId: projects[0].id, // Редизайн интернет-магазина
      token: "tkn_portal_techstart_001",
      expiresAt: new Date("2027-01-01"),
    },
  })

  await prisma.clientPortalToken.create({
    data: {
      clientId: clients[2].id,  // БлюОушен Аналитикс
      projectId: projects[2].id, // MVP панели аналитики
      token: "tkn_portal_blueocean_001",
      expiresAt: new Date("2027-01-01"),
    },
  })

  console.log("Создано 2 портальных токена")

  // ===================================================================
  // ИТОГИ
  // ===================================================================
  console.log("")
  console.log("✅ Наполнение базы данных успешно завершено!")
  console.log(`   ${3} пользователей`)
  console.log(`   ${clients.length} клиентов`)
  console.log(`   ${leads.length} лидов`)
  console.log(`   ${projects.length} проектов`)
  console.log(`   ${tasks.length} задач`)
  console.log(`   ${timeEntries.length} записей времени`)
  console.log(`   ${comments.length} комментариев`)
  console.log(`   ${invoices.length} счетов`)
}

// =====================================================================
// ЗАПУСК СИДИРОВАНИЯ
// =====================================================================

main()
  // Обработка ошибок — логируем и выходим с ненулевым кодом (CI/CD увидят failure).
  .catch((e) => {
    console.error("Ошибка наполнения БД:", e)
    process.exit(1)
  })
  // ВАЖНО: Всегда закрываем соединение с БД, даже при ошибке.
  // Иначе процесс Node.js зависнет (Prisma удерживает connection pool).
  .finally(async () => {
    await prisma.$disconnect()
  })
