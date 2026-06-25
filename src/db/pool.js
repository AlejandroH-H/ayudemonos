// Pool de conexiones a PostgreSQL, compartido por toda la aplicación.
//
// Soporta dos drivers de forma transparente:
//   - Neon  → @neondatabase/serverless (conecta por WebSocket sobre el puerto
//             443/HTTPS; útil en redes que filtran o resetean el 5432).
//   - Otros → pg (node-postgres) con conexión TCP normal.
// Se elige automáticamente según DATABASE_URL. Puedes forzar el driver clásico
// con DB_DRIVER=pg.
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en el entorno (.env).');
  process.exit(1);
}

const rawUrl = process.env.DATABASE_URL;
const esNeon = /neon\.tech/i.test(rawUrl) && process.env.DB_DRIVER !== 'pg';

let pool;

if (esNeon) {
  // Driver serverless de Neon sobre WebSocket (puerto 443).
  const { Pool, neonConfig } = require('@neondatabase/serverless');
  neonConfig.webSocketConstructor = require('ws');
  pool = new Pool({ connectionString: rawUrl });
  console.log('🗄  Driver de BD: Neon serverless (WebSocket/443)');
} else {
  // Driver clásico node-postgres (TCP 5432).
  const { Pool } = require('pg');

  const necesitaSSL =
    process.env.DATABASE_SSL === 'true' ||
    /sslmode=/i.test(rawUrl) ||
    /render\.com|supabase\.co|amazonaws\.com/i.test(rawUrl);

  // Quitamos sslmode de la URL para controlar el SSL desde el objeto `ssl` y
  // evitar que las versiones nuevas de pg lo traten como verify-full.
  let connectionString = rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.delete('sslmode');
    connectionString = u.toString();
  } catch {
    /* si no es una URL válida, la dejamos tal cual */
  }

  pool = new Pool({
    connectionString,
    ssl: necesitaSSL ? { rejectUnauthorized: false } : false,
  });
  console.log('🗄  Driver de BD: node-postgres (TCP)');
}

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

// Errores transitorios (suspensión de Neon, cortes de red) que vale la pena
// reintentar. Los errores de SQL tienen un SQLSTATE (p. ej. '23505') y NO se
// reintentan; un error sin code suele ser un corte de conexión / arranque en frío.
const ERRORES_TRANSITORIOS = new Set([
  'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE',
  '57P01', '57P03', '08006', '08001', 'XX000',
]);

// Helper para consultas con reintentos ante fallos transitorios (despierta la
// base de Neon si estaba suspendida sin que el usuario reciba un error).
async function query(text, params) {
  let ultimoError;
  for (let intento = 1; intento <= 3; intento++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      ultimoError = err;
      const transitorio = !err.code || ERRORES_TRANSITORIOS.has(err.code);
      if (!transitorio || intento === 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * intento));
    }
  }
  throw ultimoError;
}

module.exports = { pool, query };
