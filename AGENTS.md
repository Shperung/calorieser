# Calorieser — підрахунок калорій (Expo / React Native + Web, Node-сервер)

## Мета проєкту
Додаток для підрахунку калорій на iOS, Android і Web з одного коду (React Native + react-native-web через Expo).
- Профіль користувача: біопараметри, хронічні хвороби / особливості здоров'я + графік ваги в часі.
- AI враховує особливості здоров'я: персональна норма ккал / БЖВ і попередження до страв.
- Раз на тиждень користувач вносить вагу і стежить за нею на графіку.
- Фото їжі → AI визначає страви, грами, калорії та БЖВ.
- Власний бекенд у цьому ж репозиторії: Node.js + MongoDB, авторизація і зберігання даних користувача.

## Як працюємо (правила для AI)
- Малі кроки, без генерації великих шматків коду за раз.
- Код мінімальний і простий, без передчасних абстракцій та зайвих бібліотек.
- Мова спілкування — українська.
- Після завершення кроку оновлювати розділи "План", "Поточний стан" і "Журнал" у цьому файлі.
- Expo: перед роботою з API звіряти версію `expo` у `package.json` і документацію `https://docs.expo.dev/versions/v<major>.0.0/`;
  пакети ставити через `npx expo install`.

## Стек
- Мова: TypeScript (клієнт, сервер, спільні типи).
- Клієнт: Expo SDK 57, Expo Router, `react-native-web` (Expo web — `npx expo start --web`).
- Зображення: `expo-image-picker` (камера / галерея; на web — вибір файлу), `expo-image`.
- Графік ваги: власний компонент на `react-native-svg` (працює на iOS / Android / Web), без chart-бібліотек.
- AI: Firebase AI Logic (`firebase/ai`, `AgentPlatformBackend("global")`, `gemini-3.5-flash`, `responseSchema`) прямо з клієнта —
  так само, як у `numismat-expo-app/src/lib/ai.ts` і `numismat-web-app/src/lib/ai.ts`. Firebase — лише для AI.
- Сервер: Hono + `@hono/node-server` (Web-standard `Request/Response`, TS-first), dev — `tsx watch`, запуск — `node --env-file=.env`.
- Авторизація: Better Auth (email + пароль), `mongodbAdapter`, плагін `expo()`; у клієнті `better-auth/react` + `@better-auth/expo`
  (токен у `expo-secure-store` на iOS / Android, cookie на web).
- БД: MongoDB (локально Docker `mongo:8` або Atlas free), офіційний драйвер `mongodb` без Mongoose.
- Валідація: `zod` + `@hono/zod-validator`, схеми спільні для клієнта і сервера.

## Структура репозиторію (npm workspaces)
```
calorieser/
  AGENTS.md
  package.json               # workspaces: ["app", "server", "shared"]
  shared/                    # спільні типи + zod-схеми: Profile, WeightEntry, Meal, MealItem
    src/index.ts
  server/                    # Hono + Better Auth + MongoDB
    src/
      index.ts               # Hono app, cors (credentials), mount routes, serve()
      db.ts                  # MongoClient, колекції, індекси
      auth.ts                # betterAuth({ database: mongodbAdapter(db), emailAndPassword, plugins: [expo()], trustedOrigins })
      middleware/session.ts  # auth.api.getSession → c.set("user"), інакше 401
      routes/profile.ts
      routes/weights.ts
      routes/meals.ts
    .env.example             # MONGODB_URI, BETTER_AUTH_SECRET, BETTER_AUTH_URL
  app/                       # Expo (iOS / Android / Web)
    app.json
    src/
      app/
        _layout.tsx          # AuthProvider, Stack.Protected guard={!!session}
        sign-in.tsx
        sign-up.tsx
        (tabs)/_layout.tsx
        (tabs)/index.tsx     # Сьогодні: ккал / БЖВ за день vs норма, список прийомів їжі
        (tabs)/add-meal.tsx  # фото → AI → редагування → зберегти
        (tabs)/profile.tsx   # біопараметри + графік ваги + "Внести вагу"
        profile-edit.tsx
        weight-add.tsx       # modal
      components/            # weight-chart.tsx, meal-card.tsx, form.tsx
      lib/                   # firebase.ts, ai.ts, api.ts (fetch з токеном), auth-client.ts, calories.ts
      theme.ts
```

## Потоки даних
```
Expo app (iOS / Android / Web)
  ├─ /api/auth/*                         → Hono server (Better Auth) → MongoDB
  ├─ /api/profile, /api/weights, /api/meals → Hono server            → MongoDB
  └─ фото (base64) + responseSchema      → Firebase AI Logic (Gemini) → JSON: страви, грами, ккал, БЖВ
```

## Моделі даних (MongoDB)
- Better Auth сам створює колекції `user`, `session`, `account`, `verification`.
- `profiles`: `{ userId, sex, birthDate, heightCm, activityLevel, goal: "lose" | "keep" | "gain", targetWeightKg,
  healthConditions: string[], healthNotes, dailyTarget?: { kcal, protein, fat, carbs, explanation } }`.
  - `healthConditions` — вибір зі списку (діабет 1 / 2 типу, гіпертонія, захворювання нирок, подагра, гастрит / виразка,
    гіпотиреоз, целіакія, лактозна непереносимість, вагітність / годування, харчові алергії тощо); `healthNotes` — вільний текст
    (ліки, обмеження від лікаря).
  - Базова норма ккал — формула Mifflin-St Jeor у `lib/calories.ts` (працює і без AI, fallback).
  - `dailyTarget` — персональна норма від AI з урахуванням здоров'я; перераховується при збереженні профілю,
    користувач бачить пояснення і може залишити базову норму.
- `weights`: `{ userId, weekStart (понеділок, ISO-дата), weightKg }`, унікальний індекс `(userId, weekStart)` —
  повторне внесення за той самий тиждень оновлює запис.
- `meals`: `{ userId, eatenAt, title, items: [{ name, grams, kcal, protein, fat, carbs }], totalKcal }`, індекс `(userId, eatenAt)`.
- Фото їжі не зберігаємо (лише результат аналізу); зберігання фото — опційно пізніше.

## API (усе, крім `/api/auth/*`, — за session middleware)
```
ALL    /api/auth/*                  Better Auth (sign-up / sign-in / sign-out / get-session)
GET    /api/profile                 → Profile | null
PUT    /api/profile                 Profile → Profile
GET    /api/weights                 → WeightEntry[] (за датою)
PUT    /api/weights                 { weightKg } → upsert поточного тижня
GET    /api/meals?date=YYYY-MM-DD   → Meal[]
POST   /api/meals                   Meal → Meal
DELETE /api/meals/:id
```

## AI-аналіз фото (`app/src/lib/ai.ts`)
- Як у numismat: `getAI(app, { backend: new AgentPlatformBackend("global") })`, `getGenerativeModel` з `responseMimeType: "application/json"` і `responseSchema`.
- `toPart(uri)`: `fetch(uri).blob()` → `FileReader.readAsDataURL` → base64 (працює для `file://` і на web).
- Схема: `title` + `items[]` (`name`, `grams`, `kcal`, `protein`, `fat`, `carbs`) + `warnings[]` (необов'язкове).
- `analyzeMealPhoto(uri, profile): Promise<MealDraft>`; у промпт додаються `healthConditions` / `healthNotes` →
  `warnings` (напр. «багато швидких вуглеводів — обережно при діабеті», «солоне — гіпертонія»);
  користувач редагує грами / ккал перед збереженням.
- `calcDailyTarget(profile): Promise<DailyTarget>` — Gemini з `responseSchema` (`kcal`, `protein`, `fat`, `carbs`, `explanation`):
  базова норма Mifflin-St Jeor + мета + особливості здоров'я → скоригована норма і БЖВ з коротким поясненням.
- Здоров'я — чутливі дані: у профілі явна згода на передачу в AI, дисклеймер «не є медичною порадою, консультуйтеся з лікарем».
- Ризик: з 2 листопада 2026 App Check для AI Logic стає обов'язковим. Для dev — debug token;
  якщо заважатиме — переносимо виклик Gemini на сервер (`POST /api/meals/analyze`, ключ лише в `.env`).

## План
1. [x] `AGENTS.md`: мета, стек, структура, моделі, API, план.
2. [ ] Каркас monorepo: кореневий `package.json` з workspaces, `shared/` з типами і zod-схемами.
3. [ ] Сервер-каркас: Hono + `GET /health`, `tsx watch`, `.env.example`.
4. [ ] MongoDB: локально (Docker `mongo:8`) або Atlas free; `db.ts` + індекси.
5. [ ] Better Auth на сервері: email / пароль, `mongodbAdapter`, плагін `expo()`, `trustedOrigins` (scheme додатку + web origin), CORS з credentials.
6. [ ] Session middleware + роути `profile`, `weights`, `meals` з zod-валідацією; перевірка через curl.
7. [ ] Expo-додаток: `create-expo-app` (SDK 57), Expo Router, запуск на iOS / Android / Web.
8. [ ] Auth у клієнті: `auth-client.ts`, екрани входу / реєстрації, `Stack.Protected`.
9. [ ] Профіль: форма біопараметрів + хронічні хвороби / особливості здоров'я, базова норма ккал (Mifflin-St Jeor),
   персональна норма від AI (`calcDailyTarget`) з поясненням і дисклеймером.
10. [ ] Вага: modal "Внести вагу" (раз на тиждень; нагадування, якщо цього тижня ще немає запису) + `WeightChart` на `react-native-svg`.
11. [ ] Фото їжі: `expo-image-picker` → `analyzeMealPhoto` (з урахуванням здоров'я, `warnings`) → форма редагування → `POST /api/meals`.
12. [ ] Екран "Сьогодні": сума ккал / БЖВ за день vs норма, список прийомів, видалення.
13. [ ] Полірування: тема, помилки / лоадери, перевірка на S25 Ultra, iOS Simulator, у браузері.
14. [ ] (Пізніше) Деплой сервера на Hetzner за схемою `numismat-server` (pm2 + nginx + certbot), web-білд `expo export -p web`,
    App Check / перенос AI на сервер.

## Ідеї на потім (після кроку 14, з аналізу MyFitnessPal / Yazio / Lose It! / Cal AI / MacroFactor / Cronometer / Noom)
Пріоритет — зверху; перші 5 — найбільша користь при мінімумі нових бібліотек, працюють на iOS / Android / Web.
1. Текстовий ввід страви для AI («вівсянка 60 г з бананом») — той самий `responseSchema`, без фото.
2. Нещодавні / улюблені страви — повтор в один тап з `meals`, без AI.
3. Тренд ваги (ковзне середнє) + прогноз дати досягнення `targetWeightKg` на тому ж графіку.
4. Push-нагадування (`expo-notifications`): щотижнева вага, прийоми їжі.
5. Вода: окрема колекція, кнопки «+250 мл».
6. Уточнення до фото: поле «що не видно на фото» (олія, соус) → в той самий запит до Gemini.
7. Адаптивна норма (як MacroFactor): раз на 2–4 тижні порівнювати з'їдене з динамікою ваги і коригувати `dailyTarget`.
8. Тижневий звіт: середні ккал / БЖВ, дні в нормі, зміна ваги + порада від Gemini з урахуванням здоров'я.
9. Сканер штрихкодів: `expo-camera` + Open Food Facts (на web — ручний ввід коду).
10. Мікронутрієнти в AI-схемі: клітковина, цукор, натрій (важливо для діабету / гіпертонії); денні ліміти з `dailyTarget`.
11. AI-чат-нутриціолог з контекстом профілю, здоров'я і останніх прийомів (аналог `startCoinChat` з numismat).
12. Генерація меню / рецепту під залишок ккал / БЖВ на сьогодні і обмеження здоров'я.
13. Обхвати тіла і фото прогресу.
14. Інтервальне голодування: таймер вікна харчування (з перевіркою на протипоказання, напр. діабет / вагітність).
15. Кроки й активність: Apple Health / Health Connect (потрібен development build, не на web).
16. Серії днів, досягнення.
17. Зберігання фото їжі (GridFS / S3 / R2) для історії.
18. Офлайн-черга записів.
19. Експорт CSV, видалення акаунта (вимога App Store), вхід через Google / Apple (Better Auth).
20. Темна тема, локалізація uk / en.

## Поточний стан
Репозиторій порожній, є лише план у цьому файлі. Код ще не писали.

## Журнал
- План проєкту записано в `AGENTS.md`.
- Додано особливості здоров'я в профіль (`healthConditions`, `healthNotes`), AI-норму `calcDailyTarget`, `warnings` в аналізі фото,
  розділ «Ідеї на потім» з аналізу схожих додатків.
