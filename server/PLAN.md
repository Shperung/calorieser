# План сервера: Hono + PostgreSQL + JWT + Swagger

Покроковий план бекенду для розробника, який добре знає фронтенд і менше — сервер. Кожен крок закінчується перевіркою: переходимо далі, лише коли попередній крок працює.

Як цей файл пов'язаний з рештою:

- три кроки тут — це кроки 3–5 «Плану» в `AGENTS.md`;
- остаточний контракт (файли, таблиці, API) — у `.cursor/rules/server.mdc`;
- вимоги до входу й реєстрації з боку продукту — `docs/prd.md`, розділ 6.1.

## Словник

- **API** — сервер, який приймає HTTP-запити від додатка і відповідає JSON.
- **Ендпоінт (роут)** — пара «метод + шлях», наприклад `POST /api/auth/login`, і функція-обробник, яка на неї відповідає.
- **Статус відповіді** — число, яке каже, чим скінчився запит: 200 — успіх, 201 — створено, 204 — успіх без тіла, 400 — неправильні дані, 401 — не автентифіковано, 404 — не знайдено, 409 — конфлікт (наприклад, email уже зайнятий), 500 — помилка сервера.
- **Middleware** — функція, що виконується перед обробником: логує запит, додає CORS-заголовки, перевіряє токен. Як interceptor в axios, тільки на сервері.
- **Змінні оточення** — налаштування й секрети (адреса бази, ключ для JWT), які лежать у файлі `.env` поза кодом і поза git.
- **Docker-контейнер** — ізольована програма (у нас Postgres), яку не треба встановлювати в систему. **Том (volume)** — сховище, де контейнер тримає дані між перезапусками.
- **ORM** — бібліотека, через яку з таблицями працюють з TypeScript замість сирого SQL, одразу з типами.
- **Міграція** — SQL-файл зі зміною структури бази (створити таблицю, додати колонку). Як коміт у git, але для схеми бази.
- **Хеш пароля** — одностороннє перетворення: з хешу пароль не відновити, можна лише перевірити, чи збігається. **Сіль** — випадкові байти, які додаються до пароля, щоб однакові паролі давали різні хеші.
- **JWT** — підписаний рядок із трьох частин `заголовок.дані.підпис`. Дані може прочитати будь-хто, а підробити підпис без секрету неможливо. Тому в JWT кладемо лише id користувача і термін дії.
- **Access-токен** — короткий JWT (15 хв), який додаток надсилає в кожному запиті в заголовку `Authorization: Bearer <токен>`.
- **Refresh-токен** — довгий (30 днів) випадковий рядок, яким додаток отримує нову пару токенів, коли access прострочився.
- **CORS** — правило браузера: сторінка з одного домену не може читати відповіді з іншого, якщо сервер цього не дозволив. Стосується лише web-версії, у iOS і Android його немає.
- **OpenAPI / Swagger** — опис API у форматі JSON і веб-сторінка, яка показує всі ендпоінти й дозволяє викликати їх з браузера.

## Рішення і чому саме так

- **Node.js 26 LTS.** LTS — версія з довгою підтримкою (26-та — до квітня 2029). У ній уже є потрібне без бібліотек: `--env-file` читає `.env`, `crypto.argon2` хешує паролі.
- **Hono 4 (не нижче 4.11.4) + `@hono/node-server`.** Express найпопулярніший (~196 млн завантажень на тиждень), але його дизайну понад 15 років: типи, валідацію і Swagger до нього збирають з окремих бібліотек. NestJS потужний, але вимагає вчити декоратори, модулі й впровадження залежностей. Hono — найпопулярніший серед нових: друге місце (~103 млн на тиждень), найшвидше зростання і найвища задоволеність у State of JS 2025 (95 %). Він побудований на тих самих `Request`, `Response` і `fetch`, що й браузер, а JWT, CORS і логер у ньому вбудовані. Версія від 4.11.4, бо в ній закрили вразливість у перевірці JWT.
- **PostgreSQL 18.** Наші дані пов'язані між собою (користувач → профіль, вага, страви), а для таких даних реляційна база природніша за MongoDB. Postgres — найпоширеніша серед розробників база, безкоштовна. Локально запускаємо її в Docker.
- **Drizzle ORM + drizzle-kit, драйвер `pg`.** Найпопулярніша ORM 2026 року. Таблиці описуються звичайним TypeScript, типи запитів виводяться одразу, без кроку генерації, як у Prisma. Запити схожі на SQL, тож заодно вчимо SQL. drizzle-kit робить міграції і показує дані в Drizzle Studio.
- **zod 4 у пакеті `shared`.** Та сама схема перевіряє запит на сервері і форму в додатку.
- **Власний JWT-флов замість Better Auth.** Better Auth зробив би все сам, але сховав би, як це працює. Тут пишемо стандартний флов (access + refresh) і розуміємо кожну його частину. Токен іде в заголовку `Authorization`, cookies не потрібні, тож iOS, Android і web працюють однаково.
- **Argon2id з `node:crypto`.** Алгоритм, який OWASP радить першим, вбудований у Node 26, тож зовнішня бібліотека не потрібна.
- **Swagger — `hono-openapi` + `@hono/swagger-ui`.** Опис додається до готових роутів окремим кроком, схеми беруться з тих самих zod-об'єктів.
- **`tsx` для розробки.** Запускає TypeScript без збирання і перезапускає сервер після кожного збереження файлу.

## Перед стартом

- Node.js 26: `nvm install 26 && nvm use 26`, перевірка — `node -v` показує `v26.x`.
- Docker Desktop встановлений і запущений: `docker -v` відповідає версією.
- Усі команди виконуємо з кореня репозиторію, якщо не сказано інше.

## Крок 1. Каркас: Hono + Postgres

Мета: сервер стартує на `http://localhost:3000`, а `GET /health` перевіряє, що база відповідає. Таблиць ще немає.

### 1.1 Корінь monorepo

Що робимо: у корені репозиторію — `package.json`, `.gitignore` (рядки `node_modules` і `.env`) і `.nvmrc` (рядок `26`).

```json
{
  "name": "calorieser",
  "private": true,
  "workspaces": ["server"]
}
```

Навіщо:

- npm workspaces тримають кілька пакетів (`server`, далі `shared` і `app`) в одному репозиторії з одним `npm install` і однією папкою `node_modules`.
- `"private": true` не дає випадково опублікувати пакет у npm.
- `.nvmrc` підказує `nvm`, яку версію Node вмикати в цій папці.

### 1.2 Пакет server

Що робимо: `server/package.json`, `server/tsconfig.json`, потім ставимо залежності.

```json
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch --env-file=.env src/index.ts",
    "typecheck": "tsc --noEmit",
    "db:up": "docker compose up -d",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```

```bash
npm install hono @hono/node-server zod drizzle-orm pg -w server
npm install -D typescript tsx @types/node @types/pg drizzle-kit -w server
```

У `tsconfig.json`: `"strict": true`, `"module": "ESNext"`, `"moduleResolution": "bundler"`, `"noEmit": true`, `"types": ["node"]`.

Навіщо:

- `"type": "module"` вмикає `import` / `export`, як у фронтенді.
- `-w server` ставить пакет саме у workspace `server`. Звичайні залежності потрібні серверу для роботи, `-D` — лише для розробки.
- `tsx watch` запускає TypeScript без збирання і перезапускає сервер після збереження файлу. `--env-file=.env` — вбудована можливість Node: читає `.env` без бібліотеки dotenv.
- `"noEmit": true`: TypeScript тут лише перевіряє типи (`npm run typecheck -w server`) і JS-файлів не створює.
- Drizzle ставимо стабільний (станом на листопад 2026 — 0.45), без `@rc` з документації: потрібне нам API однакове, а сюрпризів менше.

### 1.3 Postgres у Docker

Що робимо: `server/docker-compose.yml`, потім `npm run db:up -w server`.

```yaml
services:
  db:
    image: postgres:18
    environment:
      POSTGRES_USER: calorieser
      POSTGRES_PASSWORD: calorieser
      POSTGRES_DB: calorieser
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql

volumes:
  pgdata:
```

Навіщо:

- Docker запускає Postgres у контейнері: у систему нічого не встановлюється, а `docker compose down` прибирає контейнер.
- `environment` створює користувача, пароль і базу при першому старті. Пароль простий, бо це лише локальна розробка.
- `ports` відкриває порт 5432 для нашого сервера. Якщо на Mac уже працює свій Postgres і порт зайнятий, пишемо `"5433:5432"` і міняємо порт у `DATABASE_URL`.
- Том `pgdata` зберігає дані між перезапусками. Монтуємо саме `/var/lib/postgresql`: з 18-ї версії образ кладе дані в `/var/lib/postgresql/18/docker`, а зі старим шляхом `/var/lib/postgresql/data` контейнер не стартує.

Перевірка: `docker compose -f server/docker-compose.yml ps` показує сервіс `db` зі статусом `Up`.

### 1.4 Змінні оточення

Що робимо: `server/.env.example` (у git) і його копія `server/.env` (не в git), а `src/env.ts` перевіряє значення.

```bash
PORT=3000
DATABASE_URL=postgres://calorieser:calorieser@localhost:5432/calorieser
CORS_ORIGIN=http://localhost:8081
```

```ts
import { z } from 'zod'

export const env = z
  .object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.url(),
    CORS_ORIGIN: z.url(),
  })
  .parse(process.env)
```

Навіщо:

- Секрети й адреси не пишемо в код: на ноутбуці й на хостингу вони різні, а `.env` не потрапляє в git. `.env.example` показує, які змінні потрібні.
- `DATABASE_URL` — адреса бази у форматі `postgres://користувач:пароль@хост:порт/база`.
- `CORS_ORIGIN` — адреса web-версії додатка в розробці: Expo web відкривається на порту 8081.
- zod перевіряє змінні на старті. Якщо чогось бракує, сервер одразу падає з повідомленням, яка змінна неправильна, а не ламається пізніше посеред запиту. `z.coerce.number()` перетворює рядок `"3000"` з `.env` на число.

### 1.5 Підключення до бази

Що робимо: `src/db.ts`.

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { env } from './env'

export const db = drizzle(env.DATABASE_URL)
```

Навіщо: `db` — один об'єкт на весь сервер, через який робимо всі запити. Під капотом драйвер `pg` тримає пул з'єднань — кілька відкритих підключень до Postgres, які використовуються повторно, щоб не підключатися заново на кожен запит.

### 1.6 Застосунок Hono

Що робимо: `src/index.ts`.

```ts
import { serve } from '@hono/node-server'
import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { db } from './db'
import { env } from './env'

const app = new Hono()

app.use(logger())
app.use('/api/*', cors({ origin: env.CORS_ORIGIN }))

app.get('/health', async (c) => {
  await db.execute(sql`select 1`)
  return c.json({ ok: true })
})

app.notFound((c) => c.json({ error: 'Не знайдено' }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
  console.error(err)
  return c.json({ error: 'Помилка сервера' }, 500)
})

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API: http://localhost:${info.port}`)
})
```

Навіщо:

- `app.get('/health', обробник)` — роут. Параметр `c` (context) містить запит (`c.req`) і вміє відповідати (`c.json(...)`).
- `logger()` друкує в терміналі кожен запит: метод, шлях, статус і час.
- `cors()` дозволяє web-версії додатка з адреси `CORS_ORIGIN` звертатися до `/api/*`.
- `/health` робить найпростіший запит `select 1`. Відповідь 200 означає, що живі і сервер, і база. Такий роут потім знадобиться для моніторингу на хостингу.
- `notFound` і `onError` дають один формат помилок `{ "error": "..." }` на весь сервер, тож у додатку всі помилки обробляються однаково. Деталі збою пишемо в лог сервера, а не у відповідь, щоб не показувати нутрощі назовні.
- `serve()` з `@hono/node-server` запускає Hono на Node.js.

### 1.7 Перевірка кроку 1

```bash
npm install
cp server/.env.example server/.env
npm run db:up -w server
npm run dev -w server
```

В іншому терміналі:

```bash
curl localhost:3000/health   # {"ok":true}
curl localhost:3000/nope     # {"error":"Не знайдено"}
```

Зупиніть базу (`docker compose -f server/docker-compose.yml stop`) і повторіть `/health`: має бути 500 і `{"error":"Помилка сервера"}`, а в терміналі сервера — текст помилки. Потім знову `npm run db:up -w server`.

## Крок 2. Реєстрація і вхід з JWT

Мета: користувач реєструється, входить, отримує токени, викликає захищений `GET /api/auth/me`, оновлює токени й виходить.

### Як це працює

Сервер не пам'ятає, хто до нього підключений. Тому після входу він видає додатку два токени:

- **access-токен** живе 15 хвилин і йде в кожному запиті. Сервер перевіряє його підпис секретом `JWT_SECRET` і не звертається для цього до бази, тому перевірка швидка;
- **refresh-токен** живе 30 днів і потрібен лише для одного: отримати нову пару, коли access прострочився. Сервер зберігає в базі його хеш, тож токен можна відкликати — саме так працює вихід.

Чому не один довгий токен: якщо його вкрадуть, ним користуватимуться місяць, і відкликати його не вийде. Короткий access обмежує шкоду 15 хвилинами, а refresh, записаний у базі, можна видалити.

При кожному оновленні старий refresh-токен видаляється і видається новий (ротація). Якщо вкрадений токен хтось уже використав, наступна спроба справжнього користувача отримає 401, і доведеться увійти знову.

```mermaid
sequenceDiagram
  participant App as Додаток
  participant Api as Сервер
  participant Db as Postgres
  App->>Api: POST /api/auth/login email і пароль
  Api->>Db: знайти користувача, перевірити хеш пароля
  Api->>Db: зберегти хеш нового refresh-токена
  Api-->>App: accessToken на 15 хв і refreshToken на 30 днів
  App->>Api: GET /api/auth/me з заголовком Authorization Bearer
  Api-->>App: 200 дані користувача
  Note over App,Api: через 15 хв access-токен прострочений
  App->>Api: GET /api/auth/me
  Api-->>App: 401
  App->>Api: POST /api/auth/refresh refreshToken
  Api->>Db: видалити старий токен, зберегти новий
  Api-->>App: нова пара токенів
  App->>Api: повтор GET /api/auth/me з новим access-токеном
```

### 2.1 Таблиці й міграції

Що робимо: `src/schema.ts` з двома таблицями і `server/drizzle.config.ts`, потім генеруємо й застосовуємо міграцію.

```ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

```ts
import { defineConfig } from 'drizzle-kit'

process.loadEnvFile()

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

```bash
npm run db:generate -w server   # створює SQL-файл у server/drizzle/
npm run db:migrate -w server    # застосовує його до бази
npm run db:studio -w server     # відкриває таблиці в браузері
```

Навіщо:

- `users` — користувачі. `email` унікальний, тож база сама не дасть зареєструвати двох з однаковою поштою. Пароль зберігаємо лише як хеш.
- `refresh_tokens` — видані refresh-токени, по одному на кожен вхід: телефон і браузер дають два рядки. `onDelete: 'cascade'`: якщо видалити користувача, його токени зникнуть автоматично.
- Ліворуч назви для TypeScript (`passwordHash`), праворуч — колонки в базі (`password_hash`): у SQL прийнято писати через підкреслення.
- `uuid` замість 1, 2, 3: такий id не вгадати перебором. `defaultRandom()` — база сама генерує його при вставці.
- `timestamp` з `withTimezone` зберігає час разом із часовим поясом, щоб не плутатися між київським часом і UTC.
- Міграція — це SQL, який drizzle-kit згенерував з різниці між `schema.ts` і базою. Відкрийте файл у `server/drizzle/` і прочитайте його: так видно, що насправді відбувається в базі. Міграції комітимо в git, щоб на хостингу база отримала ті самі зміни.
- `process.loadEnvFile()` — вбудована функція Node, яка читає `.env` для drizzle-kit без dotenv.

### 2.2 Спільні схеми в shared

Що робимо: пакет `shared` і перші схеми.

`shared/package.json`:

```json
{
  "name": "shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": "./src/index.ts"
}
```

У кореневому `package.json` — `"workspaces": ["server", "shared"]`. Далі `npm install zod -w shared`, у `server/package.json` у `dependencies` дописуємо `"shared": "*"` і запускаємо `npm install` у корені.

`shared/src/index.ts`:

```ts
import { z } from 'zod'

export const Credentials = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(128),
})

export const RefreshRequest = z.object({ refreshToken: z.string().min(1) })

export const AuthTokens = z.object({ accessToken: z.string(), refreshToken: z.string() })

export const PublicUser = z.object({ id: z.uuid(), email: z.email() })

export const AuthResponse = AuthTokens.extend({ user: PublicUser })

export const ApiError = z.object({ error: z.string() })
```

Навіщо:

- Ці самі схеми потім імпортує додаток для форм входу й реєстрації, тож правила (наприклад, пароль від 8 символів) живуть в одному місці. Тип для TypeScript отримуємо з схеми: `z.infer<typeof Credentials>`.
- `"exports": "./src/index.ts"` — пакет віддає TypeScript без збирання, `tsx` і TypeScript це розуміють.
- `"shared": "*"` означає «візьми локальний пакет із workspace», а не з npm.
- Email обрізаємо від пробілів і переводимо в нижній регістр до перевірки формату, щоб `Test@Mail.com` і `test@mail.com` були одним користувачем.
- Пароль до 128 символів: Argon2 навмисно повільний, і без верхньої межі сервер можна завантажити дуже довгими паролями.
- `PublicUser` — те, що можна віддавати назовні: без хешу пароля.

### 2.3 Паролі

Що робимо: у `src/auth.ts` — дві функції.

```ts
import { argon2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const argon2Async = promisify(argon2)
const params = { memory: 19456, passes: 2, parallelism: 1, tagLength: 32 }

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await argon2Async('argon2id', { ...params, message: password, nonce: salt })
  return `${salt.toString('base64')}:${hash.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':').map((part) => Buffer.from(part, 'base64'))
  const attempt = await argon2Async('argon2id', { ...params, message: password, nonce: salt })
  return timingSafeEqual(attempt, hash)
}
```

Навіщо:

- Пароль ніколи не зберігаємо як є: якщо базу вкрадуть, паролів там не буде.
- Argon2id навмисно повільний і потребує пам'яті (19 МБ на один хеш). Підбирати паролі мільйонами на секунду так не вийде, а для одного входу це десятки мілісекунд. Параметри — мінімум, який радить OWASP.
- Сіль робить хеші однакових паролів різними, тож заздалегідь пораховані таблиці хешів не допомагають. Сіль не секретна, тому зберігаємо її поруч із хешем: `сіль:хеш` в одному полі `password_hash`.
- `timingSafeEqual` порівнює за однаковий час, щоб за швидкістю відповіді не можна було вгадувати хеш.
- `promisify` дає асинхронну версію, яка не блокує сервер, поки рахується хеш.
- Спрощення: параметри зашиті в код. Якщо їх колись змінити, старі хеші перестануть збігатися, тож тоді параметри доведеться зберігати разом із хешем.

### 2.4 Токени

Що робимо: секрет `JWT_SECRET` у `server/.env` (у `.env.example` — порожній рядок `JWT_SECRET=`), у `src/env.ts` — `JWT_SECRET: z.string().min(32)`, а в `src/auth.ts` — видача й перевірка токенів.

```bash
openssl rand -base64 48   # згенерувати секрет і вставити в server/.env
```

```ts
import { createHash, randomBytes } from 'node:crypto'
import { jwt, sign } from 'hono/jwt'
import { db } from './db'
import { env } from './env'
import { refreshTokens } from './schema'

const ACCESS_TTL = 15 * 60
const REFRESH_TTL = 30 * 24 * 60 * 60

export const requireAuth = jwt({ secret: env.JWT_SECRET, alg: 'HS256' })

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export async function issueTokens(userId: string) {
  const now = Math.floor(Date.now() / 1000)
  const accessToken = await sign({ sub: userId, exp: now + ACCESS_TTL }, env.JWT_SECRET, 'HS256')
  const refreshToken = randomBytes(32).toString('base64url')
  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date((now + REFRESH_TTL) * 1000),
  })
  return { accessToken, refreshToken }
}
```

Навіщо:

- `sub` (subject) — стандартне поле JWT «про кого цей токен», `exp` — коли він спливає, у секундах від 1970 року. Терміни теж у секундах: 15 хвилин і 30 днів.
- HS256 — підпис одним секретом: той самий `JWT_SECRET` і підписує, і перевіряє. Хто знає секрет, може випускати токени, тому він довгий, випадковий і лежить лише в `.env`. zod не дасть запустити сервер із коротким секретом.
- `requireAuth` — вбудований у Hono middleware. Він читає заголовок `Authorization: Bearer ...`, перевіряє підпис і термін, кладе дані токена в `c.get('jwtPayload')`, а інакше відповідає 401. Опцію `alg` з Hono 4.11.4 вказувати обов'язково: так закрито вразливість, коли алгоритм перевірки брали з самого токена.
- Refresh-токен — не JWT, а 32 випадкові байти: перевіряти в ньому нічого, сервер шукає його в базі.
- У базі зберігаємо SHA-256 від refresh-токена, а не сам токен: якщо базу вкрадуть, токенами з неї не скористаєшся. Швидкого SHA-256 тут досить, бо токен довгий і випадковий, на відміну від пароля, який можна вгадати.

### 2.5 Роути

Що робимо: `npm install @hono/zod-validator -w server`, файл `src/routes/auth.ts` з п'ятьма роутами і підключення в `src/index.ts`: `app.route('/api/auth', authRoutes)`.

| Метод і шлях | Тіло запиту | Успіх | Помилки |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `{ email, password }` | 201, `AuthResponse` | 400 — невалідні поля; 409 — email уже зареєстровано |
| `POST /api/auth/login` | `{ email, password }` | 200, `AuthResponse` | 400; 401 — «Невірний email або пароль» |
| `POST /api/auth/refresh` | `{ refreshToken }` | 200, `AuthTokens` (нова пара) | 400; 401 — токен невідомий, уже використаний або прострочений |
| `POST /api/auth/logout` | `{ refreshToken }` | 204 | 400 |
| `GET /api/auth/me` | — | 200, `PublicUser` | 401 — немає токена або він прострочений |

Два роути як приклад. Імпорти опущено: `Hono`, `zValidator`, `eq` з `drizzle-orm`, схеми з `shared`, `db`, таблиці зі `schema.ts` і функції з `auth.ts`.

```ts
export const authRoutes = new Hono()

authRoutes.post('/login', zValidator('json', Credentials), async (c) => {
  const { email, password } = c.req.valid('json')
  const [user] = await db.select().from(users).where(eq(users.email, email))
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: 'Невірний email або пароль' }, 401)
  }
  const tokens = await issueTokens(user.id)
  return c.json({ ...tokens, user: { id: user.id, email: user.email } })
})

authRoutes.post('/refresh', zValidator('json', RefreshRequest), async (c) => {
  const { refreshToken } = c.req.valid('json')
  const [row] = await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)))
    .returning()
  if (!row || row.expiresAt < new Date()) {
    return c.json({ error: 'Сесія завершилась, увійдіть знову' }, 401)
  }
  return c.json(await issueTokens(row.userId))
})
```

Навіщо:

- `zValidator('json', Credentials)` перевіряє тіло запиту ще до обробника. Якщо поля неправильні, він сам відповідає 400 з переліком помилок, а в обробник потрапляють лише перевірені дані: `c.req.valid('json')`.
- Реєстрація спершу шукає email і відповідає 409, якщо він уже є. Унікальний індекс у базі страхує на випадок, коли два запити прийдуть одночасно.
- Реєстрація одразу повертає токени, щоб після неї не треба було окремо входити.
- Вхід відповідає однаковим текстом і для невідомого email, і для неправильного пароля: так не можна перевірити, чи зареєстрована чиясь пошта.
- `refresh` видаляє рядок і через `returning` отримує його в тій самій операції. Тому один токен спрацьовує лише раз, навіть якщо прийде два запити одночасно. Прострочений токен теж видаляється, але відповідь — 401.
- `logout` видаляє refresh-токен. Access-токен ще до 15 хвилин лишатиметься дійсним — це ціна перевірки без бази, і саме тому він короткий.
- `/me` стоїть за `requireAuth`, бере id з `c.get('jwtPayload').sub` і повертає лише `PublicUser`, без хешу пароля.

### 2.6 Перевірка кроку 2

Перед перевіркою: `JWT_SECRET` записаний у `server/.env`, міграція застосована, сервер запущений. `jq` вбудований у macOS 15 і новіші; без нього токени можна скопіювати з відповіді вручну.

```bash
API=http://localhost:3000/api/auth
BODY='{"email":"test@example.com","password":"supersecret"}'
JSON='content-type: application/json'

# реєстрація: 201 і токени; повтор — 409
curl -s -X POST $API/register -H "$JSON" -d "$BODY"

# вхід: 200, зберігаємо токени
RES=$(curl -s -X POST $API/login -H "$JSON" -d "$BODY")
ACCESS=$(echo "$RES" | jq -r .accessToken)
REFRESH=$(echo "$RES" | jq -r .refreshToken)

# хто я: 200 з токеном, 401 без нього
curl -s $API/me -H "authorization: Bearer $ACCESS"
curl -s $API/me

# оновлення: 200 і нова пара; повтор зі старим токеном — 401
NEW=$(curl -s -X POST $API/refresh -H "$JSON" -d "{\"refreshToken\":\"$REFRESH\"}")
curl -s -X POST $API/refresh -H "$JSON" -d "{\"refreshToken\":\"$REFRESH\"}"

# вихід: 204; після нього новий refresh теж дає 401
NEW_REFRESH=$(echo "$NEW" | jq -r .refreshToken)
curl -s -o /dev/null -w '%{http_code}\n' -X POST $API/logout -H "$JSON" -d "{\"refreshToken\":\"$NEW_REFRESH\"}"
curl -s -X POST $API/refresh -H "$JSON" -d "{\"refreshToken\":\"$NEW_REFRESH\"}"
```

Ще три перевірки: неправильний пароль дає 401 з тим самим текстом, що й невідомий email; пароль із 5 символів — 400; у Drizzle Studio в колонці `password_hash` видно хеш, а не пароль.

### 2.7 Що свідомо спрощено

- Ліміт спроб входу (захист від підбору паролів) — на кроці деплою, наприклад у nginx.
- Підтвердження email і скидання пароля — для них потрібна відправка листів.
- Вихід з усіх пристроїв — видалити всі рядки `refresh_tokens` користувача.
- Refresh-токен у httpOnly cookie для web — безпечніше за `localStorage`, але складніше: CORS з credentials і захист від CSRF.
- Прибирання прострочених refresh-токенів — простий `delete` за розкладом.

## Крок 3. Swagger

Мета: на `http://localhost:3000/docs` видно всі ендпоінти зі схемами, і їх можна викликати з браузера, зокрема з токеном.

Як це працює: OpenAPI — стандартний JSON-опис API: які є шляхи, що вони приймають і що повертають. Swagger UI — сторінка, яка показує цей JSON і дозволяє надсилати запити. Опис генеруємо з тих самих zod-схем, що й перевірку, тому документація не відстає від коду.

### 3.1 Пакети

```bash
npm install hono-openapi @hono/standard-validator @hono/swagger-ui -w server
npm uninstall @hono/zod-validator -w server
```

Навіщо: `hono-openapi` збирає OpenAPI зі схем і опису роутів, `@hono/standard-validator` — валідатор, на який він спирається, `@hono/swagger-ui` віддає сторінку Swagger. `@hono/zod-validator` більше не потрібен: його роботу бере `validator` з `hono-openapi`.

### 3.2 Опис роутів

Що робимо: у `src/routes/auth.ts` міняємо `zValidator` на `validator` з `hono-openapi` (аргументи ті самі) і перед кожним обробником додаємо `describeRoute`.

```ts
import { describeRoute, resolver, validator } from 'hono-openapi'

authRoutes.post(
  '/login',
  describeRoute({
    tags: ['Auth'],
    summary: 'Вхід за email і паролем',
    responses: {
      200: {
        description: 'Пара токенів і користувач',
        content: { 'application/json': { schema: resolver(AuthResponse) } },
      },
      401: {
        description: 'Невірний email або пароль',
        content: { 'application/json': { schema: resolver(ApiError) } },
      },
    },
  }),
  validator('json', Credentials),
  async (c) => {
    // той самий код, що й у кроці 2
  },
)
```

Навіщо:

- `describeRoute` додає до роуту людський опис і схему відповіді для кожного статусу. Схему тіла запиту `validator` з `hono-openapi` додає в документацію сам.
- `tags` групують ендпоінти на сторінці.
- Для `/me` додаємо `security: [{ bearerAuth: [] }]`: так Swagger знає, що тут потрібен токен.

### 3.3 Іменовані схеми

Що робимо: у `shared/src/index.ts` додаємо до схем назву й опис.

```ts
export const AuthResponse = AuthTokens.extend({ user: PublicUser }).meta({
  ref: 'AuthResponse',
  description: 'Пара токенів і користувач',
})
```

Навіщо: з `ref` схема з'являється у Swagger окремою іменованою моделлю (розділ Schemas), а не копіюється в кожен ендпоінт. `description` видно поруч зі схемою.

### 3.4 Специфікація і сторінка

Що робимо: у `src/index.ts` після `app.route(...)` — два роути.

```ts
import { swaggerUI } from '@hono/swagger-ui'
import { openAPIRouteHandler } from 'hono-openapi'

app.get(
  '/openapi.json',
  openAPIRouteHandler(app, {
    documentation: {
      info: { title: 'Calorieser API', version: '0.1.0' },
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    },
  }),
)

app.get('/docs', swaggerUI({ url: '/openapi.json' }))
```

Навіщо:

- `/openapi.json` — машинний опис API: його можна відкрити в Postman або віддати генератору клієнта.
- `/docs` — сторінка для людей, яка читає `/openapi.json`.
- `securitySchemes.bearerAuth` додає кнопку «Authorize», куди вставляємо access-токен.

### 3.5 Перевірка кроку 3

1. `npm run dev -w server` і відкрити `http://localhost:3000/docs`.
2. `POST /api/auth/register` → «Try it out» → ввести email і пароль → «Execute»: 201 і токени.
3. Скопіювати `accessToken`, натиснути «Authorize» і вставити токен.
4. `GET /api/auth/me` → «Execute»: 200 і ваш email.
5. У вікні «Authorize» натиснути «Logout» і повторити `/me`: 401.

`/openapi.json` має відкриватися і без помилок вставлятися в `editor.swagger.io`. Чи показувати `/docs` у проді, вирішимо на кроці деплою.

## Структура після трьох кроків

```
calorieser/
  package.json          workspaces: server, shared
  .gitignore            node_modules, .env
  .nvmrc                26
  shared/
    package.json
    src/index.ts        zod-схеми auth
  server/
    PLAN.md             цей файл
    package.json
    tsconfig.json
    docker-compose.yml  Postgres 18
    drizzle.config.ts
    .env.example        .env — лише локально, не в git
    drizzle/            SQL-міграції
    src/
      index.ts          Hono, middleware, /health, /openapi.json, /docs, serve()
      env.ts            змінні оточення через zod
      db.ts             підключення Drizzle
      schema.ts         таблиці users, refresh_tokens
      auth.ts           паролі, токени, requireAuth
      routes/auth.ts    register, login, refresh, logout, me
```

## Що далі

- Крок 6 в `AGENTS.md`: таблиці `profiles`, `weights`, `meals` у `schema.ts` і роути за `requireAuth` з `describeRoute`.
- Крок 8: додаток тримає `accessToken` у пам'яті, а `refreshToken` — у `expo-secure-store` (у web — `localStorage`). На 401 він викликає `/api/auth/refresh` і повторює запит.
- Крок 14: на хостингу — HTTPS, свій `.env` і `npm run db:migrate -w server` при кожному деплої.
