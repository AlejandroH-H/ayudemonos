// Reglas de validación con express-validator para el formulario de reporte.
const { body, validationResult } = require('express-validator');
const { ESTADOS } = require('../db/estados');

const TIPOS = [
  'medica',
  'rescate',
  'refugio',
  'agua',
  'alimentos',
  'desaparecido',
  'dano_estructural',
  'otro',
];
const SEVERIDADES = ['baja', 'media', 'alta', 'critica'];

const reglasReporte = [
  body('estado')
    .trim()
    .isIn(ESTADOS)
    .withMessage('Selecciona un estado válido.'),
  body('tipo_emergencia')
    .trim()
    .isIn(TIPOS)
    .withMessage('Selecciona un tipo de emergencia válido.'),
  body('severidad')
    .trim()
    .isIn(SEVERIDADES)
    .withMessage('Selecciona una severidad válida.'),
  body('descripcion')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('La descripción debe tener entre 10 y 2000 caracteres.'),
  body('persona_nombre').trim().isLength({ max: 120 }).optional({ values: 'falsy' }),
  body('cedula').trim().isLength({ max: 20 }).optional({ values: 'falsy' }),
  body('municipio').trim().isLength({ max: 120 }).optional({ values: 'falsy' }),
  body('direccion').trim().isLength({ max: 300 }).optional({ values: 'falsy' }),
  body('personas_afectadas')
    .toInt()
    .isInt({ min: 0, max: 100000 })
    .withMessage('Número de personas afectadas inválido.'),
  body('contacto_nombre').trim().isLength({ max: 120 }).optional({ values: 'falsy' }),
  body('contacto_telefono').trim().isLength({ max: 40 }).optional({ values: 'falsy' }),
  body('lat').optional({ values: 'falsy' }).toFloat().isFloat({ min: -90, max: 90 }),
  body('lng').optional({ values: 'falsy' }).toFloat().isFloat({ min: -180, max: 180 }),
];

const reglasComentario = [
  body('cuerpo')
    .trim()
    .isLength({ min: 2, max: 1000 })
    .withMessage('El comentario debe tener entre 2 y 1000 caracteres.'),
  body('autor').trim().isLength({ max: 80 }).optional({ values: 'falsy' }),
  body('parent_id').optional({ values: 'falsy' }).toInt().isInt({ min: 1 }),
];

// Recoge los errores de validación en req.erroresValidacion (array de mensajes).
function recolectarErrores(req, res, next) {
  const result = validationResult(req);
  req.erroresValidacion = result.isEmpty()
    ? []
    : result.array().map((e) => e.msg);
  next();
}

module.exports = {
  reglasReporte,
  reglasComentario,
  recolectarErrores,
  TIPOS,
  SEVERIDADES,
};
