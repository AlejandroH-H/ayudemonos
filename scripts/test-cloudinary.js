// Verifica que CLOUDINARY_URL esté bien configurada subiendo una imagen mínima.
//   Uso: npm run test:cloudinary
// Imprime la secure_url si funciona, o un diagnóstico si falla la autenticación.
require('dotenv').config();
const { uploadFromBuffer } = require('../src/services/cloudinary.service');
const { isConfigured } = require('../src/config/cloudinary');

// PNG 1x1 transparente (base64) como prueba.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function main() {
  if (!isConfigured) {
    console.error('✗ CLOUDINARY_URL no está definida en .env');
    process.exit(1);
  }

  try {
    const url = await uploadFromBuffer(PNG_1x1, { folder: 'reportes-sismo/_test' });
    console.log('✓ Cloudinary OK. secure_url:');
    console.log('  ' + url);
  } catch (err) {
    console.error('✗ Falló la subida a Cloudinary:', err.message || err);
    console.error(
      '\nSi el error es de autenticación (401/Invalid Signature/api_key), revisa el orden de\n' +
        'CLOUDINARY_URL. Debe ser: cloudinary://API_KEY:API_SECRET@CLOUD_NAME\n' +
        '(la API_KEY es la parte NUMÉRICA).'
    );
    process.exit(1);
  }
}

main();
