// Configuración del SDK de Cloudinary.
// Lee las credenciales de la variable CLOUDINARY_URL del entorno.
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Si CLOUDINARY_URL está presente, el SDK la toma automáticamente.
// Forzamos URLs seguras (https).
cloudinary.config({ secure: true });

const isConfigured = Boolean(process.env.CLOUDINARY_URL);
if (!isConfigured) {
  console.warn(
    '⚠ CLOUDINARY_URL no está configurada: la subida de fotos quedará deshabilitada ' +
      '(los reportes se guardarán sin imagen).'
  );
}

module.exports = { cloudinary, isConfigured };
