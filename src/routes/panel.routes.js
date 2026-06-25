// Rutas del panel de autoridades (protegidas con sesión).
const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/panel.controller');
const { requireAuthority } = require('../middlewares/auth');

const router = express.Router();

// Limita intentos de login para mitigar fuerza bruta.
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/login', ctrl.getLogin);
router.post('/login', limiteLogin, ctrl.postLogin);
router.post('/logout', ctrl.postLogout);

// A partir de aquí, todo exige autoridad autenticada.
router.use(requireAuthority);

router.get('/', ctrl.getLista);
router.get('/reporte/:id', ctrl.getDetalle);
router.post('/reporte/:id/seguimiento', ctrl.postSeguimiento);

module.exports = router;
