# Calorieser — підрахунок калорій (Expo / React Native + Web, Node-сервер)

## Мета проєкту
Додаток для підрахунку калорій на iOS, Android і Web з одного коду (React Native + react-native-web через Expo).
- Профіль: біопараметри, хронічні хвороби / особливості здоров'я, графік ваги.
- AI враховує здоров'я: персональна норма ккал / БЖВ і попередження до страв.
- Раз на тиждень — вага на графіку.
- Фото їжі → AI: страви, грами, калорії, БЖВ.
- Бекенд у цьому репозиторії: Node.js + PostgreSQL, авторизація і дані користувача.

## Як працюємо
- Проєкт навчальний: користувач — фронтендер, який переходить у фулстек. Пояснюй серверні поняття простими словами.
- Код пише агент. Усі команди в терміналі (`npm install`, сервер, Docker, міграції, curl) запускає користувач: агент дає їх покроково з очікуваним результатом і сам не виконує. Зміни користувач ревʼюїть і сам додає в staged; агент git не чіпає.
- Малі кроки, без великих шматків коду за раз.
- Код мінімальний, без передчасних абстракцій і зайвих бібліотек.
- Мова спілкування — українська.
- Claude Code читає `CLAUDE.md`, який імпортує цей файл. Окремої копії правил не заводити.
- На початку кроку, що створює або змінює пакет, прочитай відповідне правило, навіть якщо папки ще немає:
  - `shared` → `.cursor/rules/shared.mdc`
  - `server` → `.cursor/rules/server.mdc`
  - `app` → `.cursor/rules/app.mdc`
- Після кроку: онови «План» і «Поточний стан» тут; допиши рядок у `docs/journal.md`; контракт пакета в правилі — лише якщо він змінився.
- Ідеї після кроку 14 — у `docs/backlog.md`. Читай його, коли користувач просить наступні фічі. Не реалізовуй пункти звідти без явного запиту.
- Продукт — `docs/prd.md` (основа — `docs/research.md`). На початку кроків 8–13 звіряй вимоги й критерії приймання з відповідним розділом PRD.
- Expo: перед роботою з API звіряти версію `expo` у `package.json` і документацію `https://docs.expo.dev/versions/v<major>.0.0/`; пакети ставити через `npx expo install`.

## Стек
Рішення, які легко порушити:
- TypeScript скрізь. npm workspaces: `app`, `server`, `shared`.
- Клієнт: Expo SDK 58, Expo Router, `react-native-web`. Web — SPA (`web.output: "single"`), статичні файли на nginx. Графік ваги — власний компонент на `react-native-svg`, без chart-бібліотек.
- AI: Firebase AI Logic на сервері за зразком `numismat-web-app` (`gemini-3.8-flash`, `responseSchema`, App Check-токен від `firebase-admin`). Клієнт у Gemini не ходить. Firebase — лише для AI.
- Сервер: Node.js 26 LTS, Hono + `@hono/node-server`. Dev — `tsx watch --env-file=.env`, запуск — `node --env-file=.env`.
- Авторизація: власний JWT-флов (email + пароль): access-токен JWT на 15 хв (`hono/jwt`, HS256) і refresh-токен на 30 днів (у БД лише хеш, ротація при кожному оновленні). Паролі — Argon2id з `node:crypto`.
- БД: PostgreSQL 18 (локально Docker `postgres:18`), Drizzle ORM і `drizzle-kit` для міграцій, драйвер `pg`.
- Валідація і документація: `zod` + `validator` з `hono-openapi`, Swagger UI на `/docs`. Схеми живуть у `shared`, їх імпортують клієнт і сервер.

## Карта
- `shared/` — типи й zod: Profile, WeightEntry, Meal, MealDraft; норма ккал і запобіжники (`calories.ts`). Деталі в `.cursor/rules/shared.mdc`. Коли з’явиться код, джерело правди — `shared/src/index.ts`; правило лише посилається на нього.
- `server/` — Hono, JWT-авторизація, Postgres (Drizzle), Swagger, роути profile / weights / meals, AI (`src/ai.ts`). Деталі в `.cursor/rules/server.mdc`, кроки з поясненнями — `server/PLAN.md`.
- `app/` — Expo: екрани, auth-клієнт, виклики API, зокрема AI-роутів. Деталі в `.cursor/rules/app.mdc`, кроки з поясненнями — `app/PLAN.md`.

Потоки: додаток ходить у `/api/auth/*`, `/api/profile`, `/api/weights`, `/api/meals` на Hono → Postgres. Фото (base64) і текст страви йдуть у `POST /api/meals/analyze`, норма — у `POST /api/profile/target`; сервер викликає Firebase AI Logic. Фото ніде не зберігається.

## План
1. [x] `AGENTS.md`: мета, стек, структура, моделі, API, план.
   - [x] Дослідження аналогів і PRD MVP: `docs/research.md`, `docs/prd.md`.
2. [ ] Каркас monorepo: кореневий `package.json` з workspaces, `shared/` з zod-схемами — у складі кроків 3–4.
3. [x] Сервер-каркас: Hono + Postgres 18 (Docker) + Drizzle, `GET /health`, `.env.example` — `server/PLAN.md`, крок 1.
4. [ ] Реєстрація і вхід з JWT (access + refresh): таблиці `users` і `refresh_tokens`, `GET /api/auth/me` — `server/PLAN.md`, крок 2.
5. [ ] Swagger: OpenAPI із zod-схем через `hono-openapi`, Swagger UI на `/docs` — `server/PLAN.md`, крок 3.
6. [ ] `requireAuth` + таблиці й роути `profile`, `weights`, `meals` з zod-валідацією і `describeRoute`; перевірка через `/docs`.
7. [ ] Expo-додаток за `app/PLAN.md`: SDK 58, Expo Router, порожні екрани Головна / Вхід / Реєстрація, запуск на iOS / Android / Web, web на `calorieser.tetiana-redko.com`.
8. [ ] Auth у клієнті: `auth-client.ts` (токени, оновлення при 401), екрани входу / реєстрації, `Stack.Protected`.
9. [ ] Профіль: форма біопараметрів + хронічні хвороби / особливості здоров'я, базова норма ккал (Mifflin-St Jeor, `shared/calories.ts`) із запобіжниками,
   згода на AI, `src/ai.ts` на сервері, персональна норма від AI (`POST /api/profile/target`) з поясненням і дисклеймером.
10. [ ] Вага: modal "Внести вагу" (раз на тиждень; нагадування, якщо цього тижня ще немає запису) + `WeightChart` на `react-native-svg`.
11. [ ] Страва: фото (`expo-image-picker`) і / або текст → `POST /api/meals/analyze` (`analyzeMeal` на сервері, з урахуванням здоров'я, `warnings`) → форма редагування → `POST /api/meals`.
12. [ ] Екран "Сьогодні": сума ккал / БЖВ за день vs норма, список прийомів, видалення.
13. [ ] Полірування: тема, помилки / лоадери, перевірка на S25 Ultra, iOS Simulator, у браузері.
14. [ ] (Пізніше) Деплой API на Hetzner за схемою `numismat-server` (pm2 + nginx + certbot): `location /api/` на `calorieser.tetiana-redko.com` → `127.0.0.1:3003`.

## Поточний стан
Є каркас сервера (`server/PLAN.md`, крок 1): корінь monorepo, `server/` з Hono, `env.ts`, `db.ts`, `/health`, `docker-compose.yml`; Node 26 через `.nvmrc`; `/health` з Postgres у Docker відповідає 200. База знань розділена: цей файл — правила, стек і план; продукт — `docs/prd.md` і `docs/research.md`; контракти пакетів — `.cursor/rules/`; ідеї — `docs/backlog.md`; журнал — `docs/journal.md`. Claude Code підхоплює цей файл через `CLAUDE.md`. Рішення за PRD (розділ 10) прийнято: AI на сервері, `gemini-3.8-flash`, текстовий опис і уточнення страви. Сервер — PostgreSQL + Drizzle і власний JWT замість MongoDB і Better Auth; план з поясненнями — `server/PLAN.md`. Клієнт — Expo SDK 58 замість 57 (Expo Go зі сторів з жовтня 2026 відкриває лише SDK 58), план — `app/PLAN.md`. Наступний крок — `server/PLAN.md`, крок 2 (крок 4 плану); `app/PLAN.md` від сервера не залежить, його можна робити паралельно.
