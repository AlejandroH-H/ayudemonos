// Acceso a datos de comentarios de la comunidad sobre los reportes.
const { query } = require('../db/pool');

// Crea un comentario. autor es opcional (anónimo permitido).
async function crear(reporteId, { autor, cuerpo, esConfirmacion }) {
  const { rows } = await query(
    `INSERT INTO comentarios (reporte_id, autor, cuerpo, es_confirmacion)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [reporteId, autor || null, cuerpo, !!esConfirmacion]
  );
  return rows[0];
}

// Lista los comentarios visibles de un reporte (más antiguos primero).
async function listarPorReporte(reporteId, incluirOcultos = false) {
  const { rows } = await query(
    `SELECT * FROM comentarios
     WHERE reporte_id = $1 ${incluirOcultos ? '' : 'AND oculto = false'}
     ORDER BY creado_en ASC`,
    [reporteId]
  );
  return rows;
}

// Cuenta cuántas confirmaciones ("fue encontrada") tiene un reporte.
async function contarConfirmaciones(reporteId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS n
     FROM comentarios
     WHERE reporte_id = $1 AND oculto = false AND es_confirmacion = true`,
    [reporteId]
  );
  return rows[0].n;
}

// ── Moderación (admin) ──
async function fijarOculto(id, oculto) {
  await query('UPDATE comentarios SET oculto = $1 WHERE id = $2', [oculto, id]);
}

module.exports = { crear, listarPorReporte, contarConfirmaciones, fijarOculto };
