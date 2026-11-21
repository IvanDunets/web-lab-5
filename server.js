require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Зчитування змінних середовища (ENV)
const PORT = process.env.PORT || 5000;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const APP_ENV = process.env.APP_ENV || 'development';

app.use(cors());
app.use(express.json());

// Ініціалізація підключення до БД через змінні середовища
const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// 1. Головна сторінка статусу хмарного сервісу
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="uk">
    <head>
      <meta charset="UTF-8">
      <title>Лабораторна робота №5 — Хмарний деплоймент</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f3f4f6; padding: 40px; color: #1f2937; }
        .card { max-width: 600px; margin: 0 auto; background: #fff; padding: 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 999px; font-weight: 600; font-size: 13px; }
        a { color: #2563eb; text-decoration: none; font-weight: 500; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">● Сервіс активний у хмарі</span>
        <h1>Лабораторна робота №5</h1>
        <p><strong>Середовище (APP_ENV):</strong> ${APP_ENV}</p>
        <p><strong>Статус підключення до БД (ENV):</strong> ${supabase ? 'Підключено (PostgreSQL)' : 'Не налаштовано'}</p>
        <hr>
        <p>Ендпоінти для перевірки:</p>
        <ul>
          <li><a href="/health">/health</a> — Моніторинг продуктивності сервісу (JSON)</li>
          <li><a href="/api/tasks">/api/tasks</a> — Отримання даних із хмарної бази PostgreSQL</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

// 2. Ендпоінт моніторингу продуктивності сервісу
app.get('/health', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const startTime = process.hrtime();

  let dbStatus = 'disconnected';
  if (supabase) {
    const { error } = await supabase.from('tasks').select('id').limit(1);
    dbStatus = error ? `error: ${error.message}` : 'connected';
  }

  const diff = process.hrtime(startTime);
  const dbLatencyMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

  res.status(200).json({
    status: 'OK',
    environment: APP_ENV,
    timestamp: new Date().toISOString(),
    performance: {
      uptimeSeconds: Math.floor(process.uptime()),
      memoryRssMB: (memoryUsage.rss / 1024 / 1024).toFixed(2),
      heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      cpuLoadAverage: os.loadavg(),
      dbConnection: dbStatus,
      dbResponseLatencyMs: Number(dbLatencyMs)
    }
  });
});

// 3. Отримання записів із БД
app.get('/api/tasks', async (req, res) => {
  if (!supabase) {
    return res.status(500).json({ error: 'Змінні середовища БД не задані' });
  }
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
});

app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT} у режимі ${APP_ENV}`);
});