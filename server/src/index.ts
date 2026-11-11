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
