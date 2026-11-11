# Журнал

- План проєкту записано в `AGENTS.md`.
- Додано особливості здоров'я в профіль (`healthConditions`, `healthNotes`), AI-норму `calcDailyTarget`, `warnings` в аналізі фото, беклог з аналізу схожих додатків.
- Базу знань розділено: корінь `AGENTS.md` — правила, стек і план; контракти пакетів — `.cursor/rules/{shared,server,app}.mdc`; ідеї — `docs/backlog.md`; журнал — цей файл.
- Додано `CLAUDE.md` з імпортом `AGENTS.md`, щоб ті самі правила читав Claude Code.
- Досліджено аналоги (глобальні, українські, ніша харчування при хворобах), точність AI-фото, утримання, вимоги сторів і закону, App Check і моделі Gemini — `docs/research.md`. Написано PRD MVP — `docs/prd.md`.
- Рішення за PRD: AI на сервері за зразком `numismat-web-app` (`POST /api/meals/analyze`, `POST /api/profile/target`), `gemini-3.8-flash`, текстовий опис і уточнення страви. Згода — `aiConsentAt` у профілі, норма й запобіжники — `shared/calories.ts`. Ручний ввід і видалення акаунта — у беклозі до публікації.
- Сервер: PostgreSQL 18 + Drizzle і власний JWT (access 15 хв + refresh 30 днів з ротацією, паролі Argon2id) замість MongoDB і Better Auth; Swagger через `hono-openapi`. Покроковий план з поясненнями — `server/PLAN.md`; `AGENTS.md`, правила пакетів, PRD і беклог оновлено.
- Фронтенд: план `app/PLAN.md` — Expo SDK 58 замість 57 (Expo Go зі сторів з жовтня 2026 відкриває лише SDK 58), шаблон `blank-typescript` + Expo Router, порожні екрани Головна / Вхід / Реєстрація, запуск на iOS / Android / web, web як SPA на `calorieser.tetiana-redko.com` (збірка на сервері, nginx + `certbot certonly`). Правила Expo, які генерує `create-expo-app`, перенесено в `app.mdc`.
- Додано скіл `commit` (`.claude/skills/commit/SKILL.md`, його читають і Cursor, і Claude Code): повідомлення лише зі staged-змін у стилі історії репозиторію, коміт тільки після підтвердження.
- Каркас сервера (`server/PLAN.md`, крок 1): npm workspaces, Hono 4.13 + `@hono/node-server`, Drizzle 0.45 + `pg`, zod 4, `env.ts`, `/health`, єдиний формат помилок, CORS, Postgres 18 у `docker-compose.yml`. Node 26 через nvm. Перевірено 404 / 500 / CORS, `/health` з Postgres у Docker — 200.
- Додано `README.md`: перший запуск, npm-скрипти сервера і команди Docker для бази.
