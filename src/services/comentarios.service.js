// Acceso a datos de comentarios de la comunidad sobre los reportes.
const { query } = require('../db/pool');

// Crea un comentario. autor es opcional (anónimo permitido).
// parentId opcional: id del comentario raíz al que responde (hilo de un nivel).
async function crear(reporteId, { autor, cuerpo, esConfirmacion, parentId }) {
  const { rows } = await query(
    `INSERT INTO comentarios (reporte_id, parent_id, autor, cuerpo, es_confirmacion)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [reporteId, parentId || null, autor || null, cuerpo, !!esConfirmacion]
  );
  return rows[0];
}

async function obtenerPorId(id) {
  const { rows } = await query('SELECT * FROM comentarios WHERE id = $1', [id]);
  return rows[0] || null;
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

// Agrupa una lista plana de comentarios en hilos de un nivel:
// raíces (parent_id null) con su array de respuestas en orden cronológico.
function armarHilos(lista) {
  const raices = [];
  const porId = new Map();
  for (const c of lista) {
    if (c.parent_id == null) {
      const raiz = { ...c, respuestas: [] };
      porId.set(c.id, raiz);
      raices.push(raiz);
    }
  }
  for (const c of lista) {
    if (c.parent_id != null && porId.has(c.parent_id)) {
      porId.get(c.parent_id).respuestas.push(c);
    }
  }
  return raices;
}

// ── Moderación (admin) ──
async function fijarOculto(id, oculto) {
  await query('UPDATE comentarios SET oculto = $1 WHERE id = $2', [oculto, id]);
}

module.exports = {
  crear,
  obtenerPorId,
  listarPorReporte,
  contarConfirmaciones,
  armarHilos,
  fijarOculto,
};
