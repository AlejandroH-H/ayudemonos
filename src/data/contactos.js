// Directorio de teléfonos de emergencia (datos de referencia, no van en la BD).
// Para ampliar: añade objetos { nombre, telefonos: [...], ambito }.
//   ambito: 'Nacional' o el nombre del estado.
// Los teléfonos pueden ir con guiones o como códigos cortos (171, 911, *1, 112).
const CONTACTOS = [
  // ── Nacional ──
  { ambito: 'Nacional', nombre: 'Línea Central de Emergencias (SIEY)', telefonos: ['171', '911', '0424-7817515'] },
  { ambito: 'Nacional', nombre: 'Atención Ciudadana', telefonos: ['0800-9272289'] },
  { ambito: 'Nacional', nombre: 'Protección Civil', telefonos: ['0212-6318662', '0800-5588427', '0800-2668446'] },
  { ambito: 'Nacional', nombre: 'Ambulancias (CIACA)', telefonos: ['0800-2422201'] },
  { ambito: 'Nacional', nombre: 'Bomberos de Caracas', telefonos: ['0212-5454545', '0212-5417133'] },

  // ── Aragua ──
  { ambito: 'Aragua', nombre: 'Protección Civil de Aragua', telefonos: ['0243-2471778', '0243-2466554'] },
  { ambito: 'Aragua', nombre: 'Bomberos de Aragua', telefonos: ['0424-3456408'] },
  { ambito: 'Aragua', nombre: 'VEN Aragua 911 — Sede Orticeño', telefonos: ['0422-8470125'] },
  { ambito: 'Aragua', nombre: 'VEN Aragua 911 — Sede Pica', telefonos: ['0422-8470130'] },

  // ── Yaracuy ──
  { ambito: 'Yaracuy', nombre: 'Bomberos Yaracuy', telefonos: ['0254-2345533', '0254-2343895'] },
  { ambito: 'Yaracuy', nombre: 'Ambulancias Nirgua', telefonos: ['0254-5720591'] },
];

// Agrupa los contactos por ámbito, con "Nacional" primero y el resto alfabético.
function contactosPorAmbito() {
  const grupos = {};
  for (const c of CONTACTOS) {
    (grupos[c.ambito] ||= []).push(c);
  }
  const ambitos = Object.keys(grupos).sort((a, b) => {
    if (a === 'Nacional') return -1;
    if (b === 'Nacional') return 1;
    return a.localeCompare(b, 'es');
  });
  return ambitos.map((ambito) => ({ ambito, contactos: grupos[ambito] }));
}

module.exports = { CONTACTOS, contactosPorAmbito };
