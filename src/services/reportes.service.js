// Acceso a datos de reportes (PostgreSQL) — modelo comunitario.
const crypto = require('crypto');
const { query } = require('../db/pool');

// Genera un código de resolución corto y legible, p. ej. "SIS-7F3K9Q".
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
       (codigo, estado, municipio, direccion, lat, lng, persona_nombre, cedula,
        tipo_emergencia, severidad, descripcion, personas_afectadas,
        contacto_nombre, contacto_telefono, foto_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      codigo,
      data.estado,
      data.municipio || null,
      data.direccion || null,
      data.lat ?? null,
      data.lng ?? null,
      data.persona_nombre || null,
      data.cedula || null,
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

// Consulta pública por código (no incluye ocultos salvo que se pida).
async function obtenerPorCodigo(codigo, incluirOcultos = false) {
  const { rows } = await query(
    `SELECT * FROM reportes
     WHERE codigo = $1 ${incluirOcultos ? '' : 'AND oculto = false'}`,
    [codigo]
  );
  return rows[0] || null;
}

// Consulta por id numérico. Para uso público excluye los ocultos.
async function obtenerPorId(id, incluirOcultos = false) {
  const n = parseInt(id, 10);
  if (!Number.isInteger(n)) return null;
  const { rows } = await query(
    `SELECT * FROM reportes
     WHERE id = $1 ${incluirOcultos ? '' : 'AND oculto = false'}`,
    [n]
  );
  return rows[0] || null;
}

// Estadísticas para la vista principal.
async function estadisticas() {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE subsanado = false)::int AS activos,
       COUNT(*) FILTER (WHERE subsanado = true)::int  AS subsanados,
       COALESCE(SUM(personas_afectadas), 0)::int      AS personas_afectadas
     FROM reportes
     WHERE oculto = false`
  );
  return rows[0];
}

// Lista pública por estado de subsanado (excluye ocultos).
async function listar(subsanado, limite = 100) {
  const { rows } = await query(
    `SELECT * FROM reportes
     WHERE oculto = false AND subsanado = $1
     ORDER BY creado_en DESC
     LIMIT $2`,
    [subsanado, limite]
  );
  return rows;
}

// Marca un reporte como subsanado si el código coincide y aún está activo.
// Devuelve la fila actualizada o null si el código no corresponde.
async function subsanarPorCodigo(codigo) {
  const { rows } = await query(
    `UPDATE reportes
     SET subsanado = true, subsanado_en = now(), subsanado_por = 'codigo'
     WHERE codigo = $1 AND subsanado = false AND oculto = false
     RETURNING *`,
    [codigo]
  );
  return rows[0] || null;
}

// ── Moderación (admin) ──
async function listarTodos(limite = 300) {
  const { rows } = await query(
    'SELECT * FROM reportes ORDER BY creado_en DESC LIMIT $1',
    [limite]
  );
  return rows;
}

async function fijarOcultoReporte(id, oculto) {
  await query('UPDATE reportes SET oculto = $1 WHERE id = $2', [oculto, id]);
}

async function subsanarPorAdmin(id) {
  await query(
    `UPDATE reportes
     SET subsanado = true, subsanado_en = now(), subsanado_por = 'admin'
     WHERE id = $1`,
    [id]
  );
}

module.exports = {
  generarCodigo,
  crearReporte,
  obtenerPorCodigo,
  obtenerPorId,
  estadisticas,
  listar,
  subsanarPorCodigo,
  listarTodos,
  fijarOcultoReporte,
  subsanarPorAdmin,
};
