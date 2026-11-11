# Calorieser

Підрахунок калорій: Expo-додаток (iOS, Android, Web) і Node-сервер (Hono + PostgreSQL). Правила, стек і план — `AGENTS.md`, план сервера — `server/PLAN.md`.

Усі команди виконуються з кореня репозиторію.

## Перший запуск

```bash
nvm use                               # Node 26 з .nvmrc
npm install                           # залежності всіх workspaces
cp server/.env.example server/.env    # локальні налаштування сервера
npm run db:up -w server               # Postgres у Docker
npm run dev -w server                 # API на http://localhost:3000
```

Перевірка: `curl localhost:3000/health` → `{"ok":true}`.

## Команди npm (`server/package.json`)

`-w server` запускає скрипт у workspace `server`.

| Команда | Для чого |
| --- | --- |
| `npm run dev -w server` | Сервер у режимі розробки: перезапускається після збереження файлу, читає `server/.env`. Зупинка — `Ctrl+C`. |
| `npm run typecheck -w server` | Перевірка типів TypeScript без запуску. |
| `npm run db:up -w server` | Запускає Postgres у Docker у фоні (`docker compose up -d`). |
| `npm run db:generate -w server` | Створює SQL-міграцію в `server/drizzle/` зі змін у `src/schema.ts`. |
| `npm run db:migrate -w server` | Застосовує нові міграції до бази. |
| `npm run db:studio -w server` | Відкриває Drizzle Studio — таблиці й дані в браузері. |

Після зміни `schema.ts`: `db:generate`, переглянути SQL у `server/drizzle/`, потім `db:migrate`.

## Команди Docker

`-f server/docker-compose.yml` вказує файл з описом бази, бо він лежить не в корені.

| Команда | Для чого |
| --- | --- |
| `docker compose -f server/docker-compose.yml ps` | Стан контейнера бази: `Up` — працює. |
| `docker compose -f server/docker-compose.yml logs -f db` | Лог Postgres у реальному часі. Вихід — `Ctrl+C`. |
| `docker compose -f server/docker-compose.yml stop` | Зупиняє базу, контейнер лишається. Знову запустити — `db:up`. |
| `docker compose -f server/docker-compose.yml down` | Зупиняє і видаляє контейнер. Дані в томі `pgdata` зберігаються. |
| `docker compose -f server/docker-compose.yml down -v` | Те саме, але видаляє й том: база стає порожньою. |
| `docker compose -f server/docker-compose.yml exec db psql -U calorieser` | Консоль SQL усередині бази. Вихід — `\q`. |
