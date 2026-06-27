# CRM — Система управления взаимоотношениями с клиентами для веб-студии

Полнофункциональная, готовая к продакшену CRM-система, созданная специально для веб-студий. Управляйте клиентами, проектами, задачами, финансами, загрузкой команды и коммуникациями — всё в одном месте.

---

## Стек технологий

| Слой | Технология |
|---|---|
| **Фреймворк** | Next.js 16.2.9 (App Router) |
| **UI** | React 19.2.4 |
| **Язык** | TypeScript 5 |
| **ORM** | Prisma 7.8.0 |
| **База данных** | PostgreSQL |
| **Аутентификация** | NextAuth v5 (Credentials + JWT) |
| **Стилизация** | Tailwind CSS v4 + shadcn/ui (base-nova) |
| **Формы** | react-hook-form + zod |
| **Drag & Drop** | @dnd-kit |
| **Графики** | Recharts |
| **Email** | Resend |
| **Файлы** | UploadThing |
| **Иконки** | Lucide React |
| **Даты** | date-fns |
| **Командная палитра** | cmdk |
| **Уведомления** | sonner |

---

## Возможности — полный обзор модулей

### 1. Аутентификация и управление ролями

- **Вход / Регистрация** по email + пароль (bcryptjs)
- **Регистрация только по приглашению** — новые участники присоединяются через email-инвайты с токенами (7 дней)
- **Смена пароля** на странице настроек
- **5 ролей** с гранулярными правами:
  - **Owner (Владелец)** — полный доступ ко всему
  - **PM (Project Manager)** — управляет проектами, клиентами, лидами, задачами, командой, настройками
  - **Developer (Разработчик)** — видит дашборд, проекты, задачи; управляет своими задачами и временем
  - **Designer (Дизайнер)** — видит дашборд, проекты, задачи; управляет задачами
  - **Sales (Продажи)** — управляет клиентами, лидами, сметами
- **RBAC middleware** — через колбэк `authorized` NextAuth + Next.js middleware
- Защита маршрутов с редиректом на `/login`
- Бейджи ролей в боковом меню

### 2. Управление клиентами

- **Список клиентов** (`/dashboard/clients`) — таблица с поиском, сортировкой и пагинацией
- **Фильтры** по статусу (Lead / Active / Inactive / Churned), источнику (Referral / Website / Cold / Other), ответственному, тегам
- **Карточка клиента** (`/dashboard/clients/[id]`) — табы: обзор, проекты, активность, счета
- **Inline-редактирование** заметок
- **Добавление клиента** через боковую панель
- **Импорт из CSV** — загрузка CSV с предпросмотром, авто-маппинг полей
- **Server Actions**: createClient, updateClient, deleteClient, importClients — с Zod-валидацией, логированием, RBAC

### 3. Воронка лидов (Kanban)

- **Kanban-доска** (`/dashboard/leads`) — колонки с drag-and-drop: New → Contacted → Proposal Sent → Negotiation → Won / Lost
- **Карточки лидов** — имя клиента, сумма сделки, шкала вероятности, дата закрытия, аватар ответственного
- **Боковая панель** — полная информация о лиде с формой редактирования
- **Модалка Won/Lost** с причиной проигрыша
- **Server Actions**: createLead, updateLead, moveLeadStage — запускает webhooks и правила автоматизации

### 4. Управление проектами

- **Список проектов** (`/dashboard/projects`) — карточки с бейджем статуса, аватаром PM, прогрессом, бюджетом, дедлайном
- **Фильтры** по статусу, клиенту, PM
- **Статистика** — активные, просроченные, завершённые в этом месяце
- **Рабочее пространство** (`/dashboard/projects/[id]`) с вкладками:
  - **Board (Доска)** — Kanban (Todo → In Progress → In Review → Done) с drag-and-drop
  - **List (Список)** — таблица с inline-изменением статуса/приоритета
  - **Timeline (Временная шкала)** — Gantt-диаграмма с цветами по исполнителям, зумом (неделя/месяц), линией текущего дня
  - **Finance (Финансы)** — бюджет, часы, рентабельность
- **Milestones (Вехи)** — разделители на таймлайне
- **Server Actions**: createProject, updateProject, deleteProject — с уведомлениями

### 5. Управление задачами

- **Глобальная страница задач** (`/dashboard/tasks`) — полный список с:
  - Поиск по названию
  - Фильтры по статусу, приоритету, исполнителю, проекту
  - Сортировка по дате, приоритету, статусу
  - Inline-смена статуса через dropdown
  - Клик → боковая панель с деталями
  - Просроченные подсвечены красным
  - Пустое состояние с иконкой
  - Кнопка "Очистить фильтры"
- **Боковая панель задачи** — редактирование названия, описания (markdown), статуса, приоритета, исполнителя, дат
- **Комментарии** — с @упоминаниями, markdown, отметкой "внутренний"
- **Подзадачи** — inline создание/отметка
- **Учёт времени** — быстрый ввод часов
- **Файлы** — прикрепление к задаче
- **Board view** — Kanban с drag-and-drop
- **List view** — таблица с inline-редактированием
- **Timeline view** — Gantt с вехами
- **Server Actions**: createTask, updateTask, moveTask, deleteTask, logTime

### 6. Финансы (счета и сметы)

- **Финансовый обзор** (`/dashboard/finance`) — KPI (MRR, просрочки, собрано за месяц), график revenue за 12 месяцев, вкладки счетов/смет
- **Создание счёта** — выбор клиента/проекта, таблица позиций (авто-расчёт), авто-номер, валюта, дата, заметки, предпросмотр
- **Просмотр счёта** — профессиональный макет, управление статусом (отправить, оплата, аннулировать), история платежей, частичные оплаты
- **PDF счёта** — `/api/invoices/[id]/pdf` — оптимизированный HTML для печати, браузерная печать → PDF
- **Email-отправка** — через Resend с HTML-таблицей
- **Создание сметы** — та же структура, конвертация в счёт при принятии
- **Server Actions**: createInvoice, updateInvoice, sendInvoice, updateInvoiceStatus, recordPayment, createEstimate, convertEstimateToInvoice — с логированием и webhooks

### 7. Клиентский портал

- **Доступ по токену** — `/client-portal/[token]` — без аутентификации
- **Просмотр** — проект, вехи, публичные задачи (не внутренние), публичные комментарии
- **Клиент может оставлять комментарии** (автор = имя клиента)
- **Счета** — только не черновики
- **Сметы** — клиент может утвердить
- **Генерация ссылки** — токен на 90 дней, отправка по email

### 8. Учёт времени

- **Таймер задачи** — старт/стоп, сохранение в localStorage
- **Страница времени** (`/dashboard/time`) — недельный календарь + таблица
- **Быстрый ввод** — через боковую панель (задача, часы, описание, дата, billable)
- **Редактирование** — изменение часов/описания/даты/billable, удаление с подтверждением
- **Общая сумма** часов за неделю
- **Нагрузка команды** (`/dashboard/team`) — часы каждого vs ёмкость, процент загрузки, перегрузка подсвечена
- **Server Actions**: logTime, updateTimeEntry, deleteTimeEntry

### 9. Дашборд и аналитика

- **Главный дашборд** (`/dashboard`) — KPI (активные проекты, выручка, просроченные задачи, pipeline), лента активности (10), мои задачи, последние клиенты (5), ближайшие дедлайны (7 дней)
- **Кастомизация виджетов** — скрыть/показать, сохранение в localStorage
- **Тренды** — динамика проектов, сравнение выручки с прошлым месяцем
- **PDF-отчёт** — `/api/dashboard/pdf` — дашборд в формате печатного HTML
- **Аналитика** (`/dashboard/analytics`) — выбор периода (неделя/месяц/3 месяца/год), stacked bar выручки по клиентам, воронка лидов, круговая по проектам, линейный график выполнения задач, таблица эффективности команды
- **Отчёты** (`/dashboard/reports`) — billable vs non-billable, выручка по клиентам (CSV), рентабельность проектов, загрузка команды, вкладки

### 10. Коммуникации и уведомления

- **Комментарии** — markdown (bold, italic, ссылки, код), @упоминания с автодополнением, флаг "внутренний" (оранжевая точка, скрыто от клиента), файлы, редактирование/удаление своих, soft-delete
- **Колокольчик уведомлений** — выпадашка со счётчиком, отметить все/одно прочитанным, клик → переход, иконки типов (emoji)
- **Real-time (SSE)** — `/api/notifications/stream` — Server-Sent Events, авто-переподключение, опрос каждые 5 секунд, fallback на 30-секундный polling
- **Email-уведомления** через Resend — 7 шаблонов:
  - Приглашение в команду
  - Счёт (с таблицей)
  - Назначена задача
  - @упоминание в комментарии
  - Изменение статуса проекта
  - Ссылка на портал
  - Получен платёж
- **Лог активности** — каждое значимое действие логируется

### 11. Автоматизации

- **Cron-задачи** — 4 проверки:
  - Просроченные задачи → уведомления исполнителям
  - Просроченные счета → авто-статус OVERDUE, уведомление владельцу
  - Засидевшиеся лиды (14+ дней на этапе) → уведомление продажнику
  - Дедлайны проектов (3 дня) → уведомление PM
- **Cron endpoint'ы** — `/api/cron/`, `/api/cron/daily`, `/api/cron/weekly` — с защитой CRON_SECRET
- **Webhook'и** — регистрация URL для событий, HMAC-SHA256 подпись, отслеживание доставки (статус, ответ, дата)
  - События: client.created, lead.stage_changed, project.status_changed, invoice.sent, invoice.paid, invoice.status_changed
- **UI Webhook'ов** — Настройки → вкладка Webhooks — добавить/тестировать/удалить, статус последней доставки
- **Правила автоматизации** — КОГДА [триггер] ТОГДА [действие]
  - Триггеры: task.overdue, lead.stage_changed, invoice.overdue, project.status_changed, client.created
  - Действия: отправить уведомление, изменить статус сущности, назначить пользователю, отправить webhook
  - Интерполяция шаблонов: `{{title}}`, `{{name}}`, `{{projectId}}`
- **UI автоматизации** — Настройки → вкладка Automations — создать/удалить, включить/выключить, счётчик запусков

### 12. UI/UX

- **Боковое меню** — фиксированное 240px, логотип, иконки, видимость по ролям, подсветка активного, выпадающее меню пользователя
- **Тёмная тема** — CSS-переменные в `.dark`, переключатель в футере сайдбара, сохранение в localStorage
- **Командная палитра (Cmd+K)** — cmdk, поиск навигации/действий, фильтрация по ролям, горячие клавиши (↑↓ ↵ Esc)
- **Адаптивность** — сетки подстраиваются, таблицы через shadcn/ui
- **Пустые состояния** — иконка + сообщение в каждом списке
- **Загрузка** — Skeleton-компоненты
- **Оптимистичные обновления** — смена статусов через Server Actions
- **17 shadcn/ui компонентов**: avatar, badge, button, calendar, card, dialog, dropdown-menu, input, label, popover, select, separator, sheet, skeleton, table, tabs, textarea

### 13. Инфраструктура и DevOps

- **Docker** — 3-stage сборка (deps → builder → runner), non-root, 22-alpine
- **Docker Compose** — app + PostgreSQL 16 с healthcheck, именованный volume
- **CI/CD** — GitHub Actions:
  - `ci.yml` — type-check, lint, build на push/PR в main
  - `deploy.yml` — на тег v*: сборка Docker, push в ghcr.io
- **Railway** — `railway.toml`: nixpacks, prisma migrate deploy, start
- **Скрипт установки** — `scripts/setup.ps1` — развернуть окружение одной командой

---

## Эволюция проекта

### Начальное состояние (когда я спросил "что это за проект?")

Проект представлял собой частично построенный CRM-скелет. Вот что уже существовало:

| Область | Статус |
|---|---|
| Next.js 16 + Prisma + shadcn/ui | ✅ Полностью |
| Схема Prisma (19 моделей, все enum, индексы) | ✅ Полностью |
| Seed (3 пользователя, 10 клиентов, 5 проектов, 30 задач, счета, комментарии) | ✅ Полностью |
| Аутентификация (NextAuth v5, логин/регистрация, инвайты, RBAC) | ✅ Полностью |
| Клиенты CRUD (список, карточка, добавление, CSV-импорт) | ✅ Полностью |
| Лиды Kanban (drag-and-drop, боковая панель, server actions) | ✅ Полностью |
| Проекты (список, workspace с Board/List/Timeline) | ✅ Полностью |
| Задачи (колонки, список, таймлайн, боковая панель) | ✅ Полностью |
| Milestones (модель + server actions) | ✅ Полностью |
| Счета (создание, просмотр, оплаты, статусы) | ✅ Полностью |
| Сметы (создание, конвертация в счёт) | ✅ Полностью |
| Клиентский портал (токен, проекты, задачи, счета, комментарии) | ✅ Полностью |
| Комментарии (markdown, @упоминания, внутренние, портал) | ✅ Полностью |
| Уведомления (колокольчик, авто-опрос 30с) | ✅ Полностью |
| Учёт времени (недельный обзор, таймер) | ✅ Полностью |
| Нагрузка команды | ✅ Полностью |
| Дашборд (KPI, лента, мои задачи, дедлайны) | ✅ Полностью |
| Аналитика (Recharts: revenue, funnel, pie, line) | ✅ Полностью |
| Отчёты (billable, выручка, рентабельность, CSV) | ✅ Полностью |
| Email-шаблоны (7 шаблонов) | ✅ Полностью |
| CSS-переменные тёмной темы | ✅ Полностью |
| Лог активности | ✅ Полностью |

### Что отсутствовало (обнаружено при аудите)

| Проблема | Серьёзность |
|---|---|
| ❌ Не было `middleware.ts` — auth protection только через proxy.ts | Критично |
| ❌ У пользователей в сиде не было паролей — нельзя залогиниться | Критично |
| ❌ Страница `/dashboard/tasks` не существовала — 404 в сайдбаре | Высокая |
| ❌ Не было Cmd+K — `cmdk` в зависимостях, но не используется | Высокая |
| ❌ Не было переключателя тёмной темы в UI | Высокая |
| ❌ Не было страницы настроек (`/dashboard/settings`) | Высокая |
| ❌ Не было Dockerfile / docker-compose.yml | Средняя |
| ❌ Не было CI/CD (GitHub Actions) | Средняя |
| ❌ Не было cron-задач | Средняя |
| ❌ Не было webhook'ов | Средняя |
| ❌ Не было движка правил автоматизации | Средняя |
| ❌ Не было PDF для счетов | Средняя |
| ❌ Не было real-time уведомлений (только polling 30с) | Средняя |
| ❌ Не было PDF-экспорта дашборда | Низкая |
| ❌ Time entry нельзя было редактировать/удалять | Низкая |
| ❌ Роль PM не имела доступа к "leads" и "settings" | Низкая |
| ❌ `next.config.ts` без `output: "standalone"` (нужно для Docker) | Низкая |
| ❌ Не было Prisma-миграций | Низкая |

### Что было добавлено / исправлено (в этой сессии)

| Исправление | Файлы |
|---|---|
| ✅ **`src/middleware.ts`** — корректный NextAuth middleware с защитой маршрутов | `src/middleware.ts` |
| ✅ **Пароли в сиде** — все 3 пользователя с паролем `password123` | `prisma/seed.ts` |
| ✅ **`/dashboard/tasks`** — страница задач с таблицей, фильтрами, поиском, сортировкой | `src/app/dashboard/tasks/page.tsx`, `src/components/crm/tasks/tasks-page-client.tsx` |
| ✅ **Командная палитра (Cmd+K)** — cmdk с навигацией + быстрыми действиями + RBAC | `src/components/crm/command-palette.tsx`, `top-header.tsx` |
| ✅ **Переключатель тёмной темы** — Sun/Moon в сайдбаре, localStorage | `src/components/crm/theme-toggle.tsx`, `sidebar.tsx` |
| ✅ **Страница настроек** — 3 вкладки: профиль (смена пароля), команда (инвайты), аккаунт | `src/app/dashboard/settings/`, `change-password/route.ts` |
| ✅ **PDF счёта** — печатный HTML, кнопка в invoice-view | `src/app/api/invoices/[id]/pdf/route.ts`, `invoice-view.tsx` |
| ✅ **Docker + Docker Compose** — 3-stage, PostgreSQL с healthcheck | `Dockerfile`, `.dockerignore`, `docker-compose.yml` |
| ✅ **CI/CD** — type-check + lint + build на push, Docker deploy на tag | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |
| ✅ **Railway config** — nixpacks билд/деплой | `railway.toml` |
| ✅ **Cron-задачи** — 4 функции + 3 API endpoint'а с CRON_SECRET | `src/lib/jobs/runner.ts`, `src/app/api/cron/*` |
| ✅ **Webhook'и** — модель, UI в настройках, HMAC-эмиттер, триггеры из 4 action-файлов | `prisma/schema.prisma`, `webhooks.ts`, `webhook-emitter.ts`, Settings tab |
| ✅ **Правила автоматизации** — модель, UI, движок, 4 типа действий | `prisma/schema.prisma`, `automations.ts`, `automation-engine.ts`, Settings tab |
| ✅ **SSE Real-time** — `/api/notifications/stream`, хук `useSSE`, интеграция с колокольчиком | `src/app/api/notifications/stream/route.ts`, `src/hooks/use-sse.ts`, `notification-bell.tsx` |
| ✅ **PDF дашборда** — KPI + задачи + клиенты + дедлайны | `src/app/api/dashboard/pdf/route.ts`, `dashboard-client.tsx` |
| ✅ **Редактирование time entry** — update + delete, боковая панель, подтверждение | `src/lib/actions/tasks.ts`, `time-page-client.tsx` |
| ✅ **Права PM** — добавлены "leads" и "settings" | `src/lib/permissions.ts` |
| ✅ **`output: "standalone"`** в next.config.ts для Docker | `next.config.ts` |
| ✅ **Prisma миграции** — SQL + migration.json | `prisma/migrations/20260627000000_init/` |
| ✅ **Скрипт установки** — автоматическая настройка PowerShell | `scripts/setup.ps1` |
| ✅ **`.env.local`** — с dev-значениями и сгенерированными секретами | `.env.local` |
| ✅ **`CRON_SECRET`** добавлен в `.env.example` | `.env.example` |
| ✅ **Файлы `.github/`** — корректная структура CI/CD | `.github/workflows/` |

### Чистка TypeScript

- Удалена неиспользуемая переменная `isOwner` в sidebar
- Исправлен баг фильтрации на странице задач (`" "` → `""` в "All" options)
- Убрана несуществующая переменная `stage` из webhook-вызова в `updateLead`
- **Результат: ноль ошибок TypeScript**

---

## Быстрый старт

### Требования
- Node.js 22+
- PostgreSQL 16 (или Docker)
- npm

### Установка одной командой (Windows PowerShell)
```powershell
.\scripts\setup.ps1
```

### Ручная установка
```bash
# 1. Клонировать и установить
git clone https://github.com/moyslav/crm-dodelat.git
cd crm-dodelat
npm install

# 2. Настроить окружение
cp .env.example .env.local
# Отредактировать DATABASE_URL

# 3. Сгенерировать Prisma-клиент
npx prisma generate

# 4. Создать БД и применить схему
# Запустить PostgreSQL, затем:
npx prisma db push

# 5. Наполнить тестовыми данными
npx prisma db seed

# 6. Запустить dev-сервер
npm run dev
```

### Установка через Docker
```bash
docker compose up -d
npx prisma db push
npx prisma db seed
npm run dev
```

### Тестовые учётные данные
| Роль | Email | Пароль |
|---|---|---|
| **Owner (Владелец)** | alex@agency.com | password123 |
| **PM (Project Manager)** | sarah@agency.com | password123 |
| **Developer (Разработчик)** | marcus@agency.com | password123 |

---

## Переменные окружения

| Переменная | Обязательно | Описание |
|---|---|---|
| `DATABASE_URL` | ✅ | Строка подключения PostgreSQL |
| `NEXTAUTH_SECRET` | ✅ | Случайная строка для JWT |
| `NEXTAUTH_URL` | ✅ | URL приложения (http://localhost:3000 для dev) |
| `RESEND_API_KEY` | ❌ (dev) | API-ключ Resend для отправки email |
| `UPLOADTHING_SECRET` | ❌ (dev) | Secret UploadThing для файлов |
| `UPLOADTHING_APP_ID` | ❌ (dev) | App ID UploadThing |
| `CRON_SECRET` | ❌ (dev) | Секрет для cron endpoint'ов |

---

## Деплой

### Railway
Пуш в GitHub, подключить Railway. `railway.toml` управляет сборкой и запуском.

### Docker / Любой VPS
```bash
docker build -t crm .
docker run -p 3000:3000 --env-file .env.local crm
```

### Vercel + Neon (Serverless)
Залить Next.js на Vercel, Neon для PostgreSQL. Обновить `DATABASE_URL`.

---

## Структура проекта

```
src/
├── app/
│   ├── (auth)/           # Страницы входа/регистрации
│   ├── api/              # API-роуты (auth, cron, invoices, notifications, dashboard)
│   ├── client-portal/    # Клиентский портал (токен)
│   ├── dashboard/        # Все основные страницы CRM
│   ├── layout.tsx        # Корневой layout
│   └── middleware.ts     # NextAuth middleware
├── components/
│   ├── crm/              # Компоненты предметной области
│   └── ui/               # shadcn/ui компоненты
├── hooks/                # React хуки
├── lib/
│   ├── actions/          # Server Actions
│   ├── jobs/             # Cron job runner
│   └── ...               # auth, db, mail, permissions, utils, webhook-emitter, automation-engine
└── types/                # TypeScript declarations
prisma/
├── schema.prisma         # 21 модель
├── seed.ts               # Тестовые данные
└── migrations/           # SQL-миграции
```

---

## Лицензия

MIT
