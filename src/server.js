// Punto de entrada: arranca el servidor HTTP.
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Red de seguridad: un error transitorio (p. ej. una desconexión del WebSocket
// de Neon estando inactivo) no debe tumbar el servicio. Lo registramos de forma
// concisa y seguimos sirviendo; las consultas reconectan con reintentos.
function resumirError(err) {
  if (!err) return 'desconocido';
  // Para errores reales preferimos el stack; para eventos de WebSocket (sin
  // stack) extraemos el código útil (p. ej. ETIMEDOUT).
  if (err.stack) return err.stack;
  return err.message || err.code || (err.error && err.error.code) || String(err);
}
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', resumirError(err));
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', resumirError(err));
});

app.listen(PORT, () => {
  console.log(`\n🌐 Sistema de Reportes Sismo escuchando en http://localhost:${PORT}`);
  console.log(`   Reportar:  http://localhost:${PORT}/reportar`);
  console.log(`   Admin:     http://localhost:${PORT}/admin/login\n`);
});
