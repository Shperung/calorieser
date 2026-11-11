# Журнал

- План проєкту записано в `AGENTS.md`.
- Додано особливості здоров'я в профіль (`healthConditions`, `healthNotes`), AI-норму `calcDailyTarget`, `warnings` в аналізі фото, беклог з аналізу схожих додатків.
- Базу знань розділено: корінь `AGENTS.md` — правила, стек і план; контракти пакетів — `.cursor/rules/{shared,server,app}.mdc`; ідеї — `docs/backlog.md`; журнал — цей файл.
- Додано `CLAUDE.md` з імпортом `AGENTS.md`, щоб ті самі правила читав Claude Code.
- Досліджено аналоги (глобальні, українські, ніша харчування при хворобах), точність AI-фото, утримання, вимоги сторів і закону, App Check і моделі Gemini — `docs/research.md`. Написано PRD MVP — `docs/prd.md`.
- Рішення за PRD: AI на сервері за зразком `numismat-web-app` (`POST /api/meals/analyze`, `POST /api/profile/target`), `gemini-3.8-flash`, текстовий опис і уточнення страви. Згода — `aiConsentAt` у профілі, норма й запобіжники — `shared/calories.ts`. Ручний ввід і видалення акаунта — у беклозі до публікації.
- Сервер: PostgreSQL 18 + Drizzle і власний JWT (access 15 хв + refresh 30 днів з ротацією, паролі Argon2id) замість MongoDB і Better Auth; Swagger через `hono-openapi`. Покроковий план з поясненнями — `server/PLAN.md`; `AGENTS.md`, правила пакетів, PRD і беклог оновлено.
