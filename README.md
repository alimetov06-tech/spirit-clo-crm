# SPIRIT.CLO CRM

Внутренняя CRM-система для ателье индивидуального пошива SPIRIT.CLO. Приложение помогает собственникам вести клиентов, заказы, мерки, примерки, платежи, себестоимость, общие расходы и управленческие финансовые показатели.

## Стек

Next.js App Router, TypeScript, React, Tailwind CSS, Supabase PostgreSQL/Auth/Storage/RLS, React Hook Form-ready архитектура, Zod, date-fns с русской локалью, Recharts-ready слой, dnd-kit-ready структура, Lucide Icons.

## Локальный запуск

1. Установите зависимости: `pnpm install`.
2. Скопируйте `.env.example` в `.env.local`.
3. Заполните Supabase-переменные.
4. Запустите приложение: `pnpm dev`.
5. Откройте `http://localhost:3000`.

## Supabase

1. Создайте новый Supabase-проект.
2. В Project Settings → API скопируйте `Project URL` и `anon public key`.
3. Для seed-скрипта отдельно скопируйте `service_role key`. Не передавайте его в браузер и не публикуйте.
4. Примените миграции из `supabase/migrations` через Supabase CLI или SQL Editor:
   - `001_initial_schema.sql`
   - `002_storage_and_seed_defaults.sql`
5. В Storage должен появиться приватный bucket `order-files`. Если создаёте вручную: public выключен, лимит 10 МБ, MIME: JPEG, PNG, WebP, PDF.

## Переменные окружения

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — только для административных скриптов и seed.
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_ALLOW_SIGNUP`
- `NEXT_PUBLIC_DEMO_MODE` — `true` только для локального демо, в production оставьте `false`.
- `TELEGRAM_BOT_TOKEN` — необязательно.
- `TELEGRAM_CHAT_ID` — необязательно.

## Первый пользователь и организация

1. Установите `NEXT_PUBLIC_ALLOW_SIGNUP=true`.
2. Зарегистрируйте первого собственника.
3. На странице первичной настройки создайте организацию `SPIRIT.CLO`.
4. Пользователь получит роль `owner`.
5. После создания workspace автоматически добавляются базовые виды изделий, определения мерок и шаблоны мерок.
6. После настройки публичную регистрацию можно отключить: `NEXT_PUBLIC_ALLOW_SIGNUP=false`.

## Демо-данные

Seed не создаёт пользователей и пароли.

```bash
pnpm seed
```

Скрипт добавляет демо-организацию, клиентов, заказы, изделия, платежи, примерки, прямые и общие расходы.

## Проверки

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Развёртывание на Vercel

1. Подключите репозиторий к Vercel.
2. Добавьте переменные окружения из `.env.example`.
3. Убедитесь, что миграции применены в Supabase.
4. Укажите `NEXT_PUBLIC_APP_URL` с production-доменом.
5. После первого входа отключите публичную регистрацию, если новые сотрудники должны добавляться только приглашениями.

## Второй собственник

В MVP интерфейс приглашений минимален. Добавьте пользователя в Supabase Auth, создайте профиль в `profiles`, затем запись в `organization_members` с `role = owner` и нужным `organization_id`. Архитектура ролей уже поддерживает `owner`, `manager`, `seamstress`.

## RLS и безопасность

RLS включён на всех таблицах публичной схемы. Доступ ограничивается членством в организации. `owner` имеет полный доступ в своей организации. `manager` подготовлен для операционных сценариев: клиенты, заказы, платежи, примерки. `seamstress` архитектурно отделена от финансовых таблиц, чтобы позднее показать только назначенные заказы, технические данные, мерки, файлы и комментарии.

Клиентский код использует только anon key. `service_role` допустим только в seed и административных серверных скриптах.

## Резервное копирование

Для production настройте регулярный backup Supabase PostgreSQL и отдельную выгрузку Storage bucket `order-files`. Перед массовыми изменениями применяйте миграции сначала на staging-проекте.

## Telegram и WhatsApp

Telegram можно подключить позднее через `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`. При отсутствии переменных приложение работает без ошибок.

WhatsApp в MVP не реализован. Рекомендуемый путь — официальный WhatsApp Business API или проверенный провайдер, с отдельной таблицей каналов доставки и журналом отправки сообщений.
