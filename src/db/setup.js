// Script de preparación de la base de datos.
//   1. Ejecuta schema.sql (crea tipos y tablas).
//   2. Siembra una autoridad de ejemplo por cada estado (idempotente).
//
// Uso:  npm run db:setup
//
// IMPORTANTE: los correos y la contraseña aquí son DE EJEMPLO para desarrollo.
// Antes de producción deben sustituirse por los datos oficiales de Protección
// Civil / gobernaciones de cada estado.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');
const { ESTADOS } = require('./estados');

// Contraseña de ejemplo para todas las autoridades sembradas (solo desarrollo).
const DEFAULT_PASSWORD = process.env.SEED_AUTHORITY_PASSWORD || 'Cambiar123*';

// Convierte "Distrito Capital" -> "distrito-capital" para construir el email.
function slug(estado) {
  return estado
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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

    console.log('→ Sembrando autoridades (una por estado) ...');
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    for (const estado of ESTADOS) {
      const email = `proteccioncivil.${slug(estado)}@reportes-sismo.ve`;
      const organismo = `Protección Civil ${estado}`;
      // Idempotente: si el email ya existe, no se duplica.
      await client.query(
        `INSERT INTO autoridades (estado, organismo, email, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [estado, organismo, email, passwordHash]
      );
    }

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM autoridades');
    console.log(`✓ Listo. Autoridades en la base: ${rows[0].n}`);
    console.log('\nCredenciales de ejemplo para el panel:');
    console.log(`  email:    proteccioncivil.merida@reportes-sismo.ve`);
    console.log(`  password: ${DEFAULT_PASSWORD}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error en la preparación de la base de datos:', err);
  process.exit(1);
});
