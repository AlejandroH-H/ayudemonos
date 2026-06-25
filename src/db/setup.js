// Script de preparación de la base de datos.
//   1. Ejecuta schema.sql (crea/migra tablas).
//   2. Siembra una cuenta de administrador (para moderación) desde variables de entorno.
//
// Uso:  npm run db:setup
//
// Variables: ADMIN_EMAIL, ADMIN_PASSWORD (si faltan, usa valores de ejemplo y avisa).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@reportes-sismo.ve';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Cambiar123*';

// Conecta reintentando: el plan gratuito de Neon suspende la base por
// inactividad y la primera conexión (que la "despierta") puede resetearse.
async function conectarConReintentos(intentos = 5) {
  for (let i = 1; i <= intentos; i++) {
    try {
      return await pool.connect();
    } catch (err) {
      const recuperable = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(err.code);
      if (!recuperable || i === intentos) throw err;
      console.log(`  conexión ${i} falló (${err.code}); reintentando en 3 s...`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  const client = await conectarConReintentos();
  try {
    console.log('→ Aplicando schema.sql ...');
    await client.query(schema);

    console.log('→ Sembrando cuenta de administrador ...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await client.query(
      `INSERT INTO admins (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [ADMIN_EMAIL.toLowerCase(), passwordHash]
    );

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM reportes');
    console.log(`✓ Listo. Reportes en la base: ${rows[0].n}`);
    console.log('\nAcceso de administrador (moderación):');
    console.log(`  email:    ${ADMIN_EMAIL.toLowerCase()}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`  password: ${ADMIN_PASSWORD}   (⚠ define ADMIN_PASSWORD en .env)`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error en la preparación de la base de datos:', err);
  process.exit(1);
});
