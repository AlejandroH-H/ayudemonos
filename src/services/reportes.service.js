// Acceso a datos de reportes y autoridades (PostgreSQL).
const crypto = require('crypto');
const { query } = require('../db/pool');

// Genera un código de seguimiento corto y legible, p. ej. "SIS-7F3K9Q".
function generarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
  let s = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) s += chars[bytes[i] % chars.length];
  return `SIS-${s}`;
}

// Inserta un reporte y devuelve la fila creada.
async function crearReporte(data) {
  const codigo = generarCodigo();
  const { rows } = await query(
    `INSERT INTO reportes
       (codigo, estado, municipio, direccion, lat, lng, tipo_emergencia,
        severidad, descripcion, personas_afectadas, contacto_nombre,
        contacto_telefono, foto_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      codigo,
      data.estado,
      data.municipio || null,
      data.direccion || null,
      data.lat ?? null,
      data.lng ?? null,
      data.tipo_emergencia,
      data.severidad,
      data.descripcion,
      data.personas_afectadas ?? 1,
      data.contacto_nombre || null,
      data.contacto_telefono || null,
      data.foto_url || null,
    ]
  );
  return rows[0];
}

// Marca un reporte como notificado.
async function marcarNotificado(id) {
  await query('UPDATE reportes SET notificado = true WHERE id = $1', [id]);
}

// Consulta pública por código de seguimiento.
async function obtenerPorCodigo(codigo) {
  const { rows } = await query('SELECT * FROM reportes WHERE codigo = $1', [codigo]);
  return rows[0] || null;
}

// Busca la autoridad responsable de un estado (la primera registrada).
async function autoridadPorEstado(estado) {
  const { rows } = await query(
    'SELECT * FROM autoridades WHERE estado = $1 ORDER BY id LIMIT 1',
    [estado]
  );
  return rows[0] || null;
}

// Lista los reportes de un estado, con filtro opcional por seguimiento.
async function listarPorEstado(estado, seguimiento) {
  if (seguimiento) {
    const { rows } = await query(
      `SELECT * FROM reportes
       WHERE estado = $1 AND seguimiento = $2
       ORDER BY creado_en DESC`,
      [estado, seguimiento]
    );
    return rows;
  }
  const { rows } = await query(
    'SELECT * FROM reportes WHERE estado = $1 ORDER BY creado_en DESC',
    [estado]
  );
  return rows;
}

// Obtiene un reporte por id, restringido al estado de la autoridad (aislamiento).
async function obtenerPorIdYEstado(id, estado) {
  const { rows } = await query(
    'SELECT * FROM reportes WHERE id = $1 AND estado = $2',
    [id, estado]
  );
  return rows[0] || null;
}

// Actualiza el estado de seguimiento, restringido al estado de la autoridad.
async function actualizarSeguimiento(id, estado, seguimiento) {
  const { rows } = await query(
    `UPDATE reportes SET seguimiento = $1
     WHERE id = $2 AND estado = $3
     RETURNING *`,
    [seguimiento, id, estado]
  );
  return rows[0] || null;
}

module.exports = {
  crearReporte,
  marcarNotificado,
  obtenerPorCodigo,
  autoridadPorEstado,
  listarPorEstado,
  obtenerPorIdYEstado,
  actualizarSeguimiento,
};
