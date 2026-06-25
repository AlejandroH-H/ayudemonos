// Envío de la notificación por correo a la autoridad del estado del reporte.
const { getTransporter, nodemailer } = require('../config/mailer');

const ETIQUETAS_TIPO = {
  medica: 'Emergencia médica',
  rescate: 'Rescate',
  refugio: 'Refugio',
  agua: 'Agua',
  alimentos: 'Alimentos',
  desaparecido: 'Persona desaparecida',
  dano_estructural: 'Daño estructural',
  otro: 'Otro',
};

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function construirHtml(reporte, appUrl) {
  const tipo = ETIQUETAS_TIPO[reporte.tipo_emergencia] || reporte.tipo_emergencia;
  const panelUrl = `${appUrl || ''}/panel/reporte/${reporte.id}`;
  const ubicacion = [reporte.municipio, reporte.direccion].filter(Boolean).join(' — ');
  const foto = reporte.foto_url
    ? `<p><strong>Foto:</strong> <a href="${escapeHtml(reporte.foto_url)}">ver imagen</a></p>`
    : '';

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#b91c1c">Nuevo reporte de emergencia — ${escapeHtml(reporte.estado)}</h2>
      <p>Se ha registrado un nuevo reporte que requiere su atención.</p>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:4px"><strong>Código</strong></td><td style="padding:4px">${escapeHtml(reporte.codigo)}</td></tr>
        <tr><td style="padding:4px"><strong>Tipo</strong></td><td style="padding:4px">${escapeHtml(tipo)}</td></tr>
        <tr><td style="padding:4px"><strong>Severidad</strong></td><td style="padding:4px">${escapeHtml(reporte.severidad)}</td></tr>
        <tr><td style="padding:4px"><strong>Personas afectadas</strong></td><td style="padding:4px">${escapeHtml(reporte.personas_afectadas)}</td></tr>
        <tr><td style="padding:4px"><strong>Ubicación</strong></td><td style="padding:4px">${escapeHtml(ubicacion) || '—'}</td></tr>
        <tr><td style="padding:4px"><strong>Contacto</strong></td><td style="padding:4px">${escapeHtml(reporte.contacto_nombre) || '—'} ${escapeHtml(reporte.contacto_telefono) || ''}</td></tr>
      </table>
      <p><strong>Descripción:</strong><br>${escapeHtml(reporte.descripcion)}</p>
      ${foto}
      <p style="margin-top:16px">
        <a href="${escapeHtml(panelUrl)}" style="background:#b91c1c;color:#fff;padding:10px 16px;text-decoration:none;border-radius:4px">
          Abrir en el panel
        </a>
      </p>
    </div>
  `;
}

// Envía el correo a la autoridad. Devuelve la URL de previsualización (Ethereal)
// o null. Lanza si falla el envío.
async function enviarReporteAAutoridad(reporte, autoridad) {
  const transporter = await getTransporter();
  const appUrl = process.env.APP_URL || '';

  // Deja constancia del enrutamiento: el reporte de un estado va a la autoridad
  // de ese estado.
  console.log(
    `→ Notificando reporte ${reporte.codigo} (${reporte.estado}) a ${autoridad.organismo} <${autoridad.email}>`
  );

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@reportes-sismo.ve',
    to: autoridad.email,
    subject: `[${reporte.severidad.toUpperCase()}] Reporte ${reporte.codigo} — ${reporte.estado}`,
    html: construirHtml(reporte, appUrl),
  });

  // En modo JSON, info.message es el correo compuesto (incluye el destinatario).
  if (process.env.MAIL_TRANSPORT === 'json' && info.message) {
    const env = info.envelope || {};
    console.log(`  ✓ correo compuesto — envelope.to: ${JSON.stringify(env.to)}`);
  }

  // En modo Ethereal devuelve una URL para inspeccionar el correo.
  return nodemailer.getTestMessageUrl(info) || null;
}

module.exports = { enviarReporteAAutoridad };
