// Acceso a datos de las necesidades urgentes (servicios/productos) de un reporte.
const { query } = require('../db/pool');

// Inserta en lote las necesidades seleccionadas al crear el reporte.
// items: [{ item, etiqueta, cantidad }]. Si está vacío, no hace nada.
async function crearMuchas(reporteId, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  const valores = [];
  const placeholders = items.map((it, i) => {
    const base = i * 4;
    valores.push(reporteId, it.item, it.etiqueta, it.cantidad || null);
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
  });
  await query(
    `INSERT INTO necesidades (reporte_id, item, etiqueta, cantidad)
     VALUES ${placeholders.join(', ')}`,
    valores
  );
}

// Lista las necesidades de un reporte: pendientes primero, luego por fecha.
async function listarPorReporte(reporteId) {
  const { rows } = await query(
    `SELECT * FROM necesidades
     WHERE reporte_id = $1
     ORDER BY cubierto ASC, creado_en ASC`,
    [reporteId]
  );
  return rows;
}

async function obtenerPorId(id) {
  const { rows } = await query('SELECT * FROM necesidades WHERE id = $1', [id]);
  return rows[0] || null;
}

// Marca una necesidad como cubierta (o pendiente) por la comunidad.
async function marcarCubierto(id, cubierto) {
  await query(
    `UPDATE necesidades
     SET cubierto = $1,
         cubierto_en = CASE WHEN $1 THEN now() ELSE NULL END
     WHERE id = $2`,
    [cubierto, id]
  );
}

module.exports = { crearMuchas, listarPorReporte, obtenerPorId, marcarCubierto };
