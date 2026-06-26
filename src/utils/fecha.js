// Formato de fecha/hora en horario de Venezuela (America/Caracas, UTC-4),
// independiente de la zona horaria del servidor (Render corre en UTC).
function formatFecha(d) {
  if (!d) return '';
  const fecha = d instanceof Date ? d : new Date(d);
  return fecha.toLocaleString('es-VE', {
    timeZone: 'America/Caracas',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

module.exports = { formatFecha };
