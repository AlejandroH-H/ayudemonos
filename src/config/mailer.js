// Configuración de Nodemailer.
//
// En desarrollo (MAIL_TRANSPORT=ethereal) se crea automáticamente una cuenta
// de prueba de Ethereal: no envía correos reales, pero genera una URL de
// previsualización para verificar el contenido y el destinatario.
//
// En producción (MAIL_TRANSPORT=smtp) se usa el servidor SMTP configurado.
require('dotenv').config();
const nodemailer = require('nodemailer');

let transporterPromise = null;

async function buildTransporter() {
  if (process.env.MAIL_TRANSPORT === 'json') {
    // No envía nada por red: compone el correo y devuelve su contenido (incluido
    // el destinatario). Útil para probar el enrutamiento sin depender del SMTP.
    console.log('✉ Modo de correo: JSON (no se envía, solo se compone).');
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (process.env.MAIL_TRANSPORT === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Modo desarrollo: cuenta de prueba Ethereal.
  const testAccount = await nodemailer.createTestAccount();
  console.log('✉ Modo de correo: Ethereal (prueba). Usuario:', testAccount.user);
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
}

// Devuelve un transporter único reutilizable (lazy singleton).
function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }
  return transporterPromise;
}

module.exports = { getTransporter, nodemailer };
