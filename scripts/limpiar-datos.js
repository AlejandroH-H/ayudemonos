// Borra TODOS los reportes y comentarios (datos de prueba), reiniciando los IDs.
// NO toca admins ni sesiones.
//
// Uso (requiere confirmación explícita):
//   npm run db:limpiar -- --si      (o)   CONFIRMAR=si npm run db:limpiar
require('dotenv').config();
const { pool, query } = require('../src/db/pool');

const confirmado =
  process.argv.includes('--si') || process.env.CONFIRMAR === 'si';

async function main() {
  if (!confirmado) {
    console.log('⚠ Esto BORRARÁ todos los reportes y comentarios.');
    console.log('  No se ejecutó nada. Para confirmar:');
    console.log('    npm run db:limpiar -- --si');
    return;
  }

  // El helper query() reintenta ante fallos transitorios (idle de Neon).
  const antes = await query(
    'SELECT (SELECT COUNT(*) FROM reportes)::int AS r, (SELECT COUNT(*) FROM comentarios)::int AS c'
  );
  console.log(`Antes → reportes: ${antes.rows[0].r}, comentarios: ${antes.rows[0].c}`);

  // CASCADE borra los comentarios ligados; RESTART IDENTITY reinicia los IDs.
  await query('TRUNCATE comentarios, reportes RESTART IDENTITY CASCADE');

  const despues = await query(
    'SELECT (SELECT COUNT(*) FROM reportes)::int AS r, (SELECT COUNT(*) FROM comentarios)::int AS c'
  );
  console.log(`✓ Listo → reportes: ${despues.rows[0].r}, comentarios: ${despues.rows[0].c}`);
  console.log('  (admins y sesiones intactos)');
}

main()
  .catch((err) => {
    console.error('Error al limpiar:', err.message || err.code || err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
