// Catálogo de servicios/productos urgentes que puede necesitar un reporte.
// Se usa para poblar el formulario, validar las claves enviadas y resolver
// la etiqueta legible que se guarda y se muestra.
const CATALOGO = [
  {
    grupo: 'Agua y alimentos',
    items: [
      { clave: 'agua', etiqueta: 'Agua', icono: 'droplet' },
      { clave: 'comida', etiqueta: 'Comida preparada', icono: 'utensils' },
      { clave: 'atun', etiqueta: 'Atún enlatado', icono: 'fish' },
      { clave: 'diablito', etiqueta: 'Diablito', icono: 'package' },
      { clave: 'sardinas', etiqueta: 'Sardinas', icono: 'fish' },
      { clave: 'arroz_pasta', etiqueta: 'Arroz / pasta', icono: 'package' },
      { clave: 'formula_bebe', etiqueta: 'Fórmula para bebé', icono: 'baby' },
    ],
  },
  {
    grupo: 'Insumos médicos',
    items: [
      { clave: 'alcohol', etiqueta: 'Alcohol', icono: 'droplet' },
      { clave: 'jeringas', etiqueta: 'Jeringas', icono: 'syringe' },
      { clave: 'gasas', etiqueta: 'Gasas', icono: 'plus' },
      { clave: 'guantes', etiqueta: 'Guantes', icono: 'shield' },
      { clave: 'vendas', etiqueta: 'Vendas', icono: 'plus' },
    ],
  },
  {
    grupo: 'Medicamentos',
    items: [
      { clave: 'analgesicos', etiqueta: 'Analgésicos', icono: 'pill' },
      { clave: 'antibioticos', etiqueta: 'Antibióticos', icono: 'pill' },
      { clave: 'sueros', etiqueta: 'Sueros / rehidratación', icono: 'droplet' },
      { clave: 'insulina', etiqueta: 'Insulina', icono: 'syringe' },
      { clave: 'tension', etiqueta: 'Medicación de tensión', icono: 'heart-pulse' },
    ],
  },
  {
    grupo: 'Otros',
    items: [
      { clave: 'panales', etiqueta: 'Pañales', icono: 'baby' },
      { clave: 'ropa', etiqueta: 'Ropa', icono: 'shirt' },
      { clave: 'cobijas', etiqueta: 'Cobijas / abrigo', icono: 'bed' },
    ],
  },
];

// Mapa clave → { etiqueta, icono } para validar y resolver rápidamente.
const MAPA = {};
for (const g of CATALOGO) {
  for (const it of g.items) MAPA[it.clave] = it;
}

// Nombre del icono (Lucide) para una necesidad guardada; 'otro' u otros usan
// un icono genérico.
function iconoDe(item) {
  return (MAPA[item] && MAPA[item].icono) || 'package';
}

module.exports = { CATALOGO, MAPA, iconoDe };
