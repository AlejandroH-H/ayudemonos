// Punto de entrada: arranca el servidor HTTP.
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Red de seguridad: un error transitorio (p. ej. una desconexión del WebSocket
// de Neon estando inactivo) no debe tumbar el servicio. Lo registramos y
// seguimos sirviendo; las consultas se reconectan con reintentos (db/pool.js).
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

app.listen(PORT, () => {
  console.log(`\n🌐 Sistema de Reportes Sismo escuchando en http://localhost:${PORT}`);
  console.log(`   Reportar:  http://localhost:${PORT}/reportar`);
  console.log(`   Admin:     http://localhost:${PORT}/admin/login\n`);
});
