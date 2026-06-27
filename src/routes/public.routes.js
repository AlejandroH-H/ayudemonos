// Rutas públicas (ciudadanía, sin registro).
const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/reportes.controller');
const { manejarUploadFoto } = require('../middlewares/upload');
const {
  reglasReporte,
  reglasComentario,
  recolectarErrores,
} = require('../middlewares/validate');
const { verificarCsrf } = require('../middlewares/csrf');

const router = express.Router();

// Anti-spam: límites por IP.
const limiteReportes = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Has enviado demasiados reportes en poco tiempo. Espera unos minutos.',
});
const limiteComentarios = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Has enviado demasiados comentarios en poco tiempo. Espera unos minutos.',
});

router.get('/', ctrl.getInicio);
router.get('/contactos', ctrl.getContactos);
router.get('/reportar', ctrl.getFormulario);

router.post(
  '/reportar',
  limiteReportes,
  manejarUploadFoto, // multer procesa la foto antes de validar/CSRF
  verificarCsrf,
  reglasReporte,
  recolectarErrores,
  ctrl.postReporte
);

// Las URLs públicas usan el id numérico; el código de resolución es secreto
// y solo se le muestra al creador en la confirmación.
router.get('/reporte/:id', ctrl.getReporte);

router.post(
  '/reporte/:id/comentario',
  limiteComentarios,
  verificarCsrf,
  reglasComentario,
  recolectarErrores,
  ctrl.postComentario
);

router.post('/reporte/:id/subsanar', verificarCsrf, ctrl.postSubsanar);

router.post(
  '/reporte/:id/necesidad/cubierto',
  limiteComentarios,
  verificarCsrf,
  ctrl.postNecesidadCubierto
);

module.exports = router;
