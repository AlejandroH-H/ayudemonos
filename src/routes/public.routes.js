// Rutas públicas (ciudadanía, sin registro).
const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/reportes.controller');
const { manejarUploadFoto } = require('../middlewares/upload');
const { reglasReporte, recolectarErrores } = require('../middlewares/validate');

const router = express.Router();

// Anti-spam: máximo 10 reportes por IP cada 15 minutos.
const limiteReportes = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Has enviado demasiados reportes en poco tiempo. Espera unos minutos.',
});

router.get('/', ctrl.getInicio);
router.get('/reportar', ctrl.getFormulario);

router.post(
  '/reportar',
  limiteReportes,
  manejarUploadFoto, // multer procesa la foto antes de validar el cuerpo
  reglasReporte,
  recolectarErrores,
  ctrl.postReporte
);

router.get('/reporte/:codigo', ctrl.getSeguimiento);

module.exports = router;
