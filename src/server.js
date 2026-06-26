// Punto de entrada: arranca el servidor HTTP.
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🌐 Sistema de Reportes Sismo escuchando en http://localhost:${PORT}`);
  console.log(`   Reportar:  http://localhost:${PORT}/reportar`);
  console.log(`   Admin:     http://localhost:${PORT}/admin/login\n`);
});
