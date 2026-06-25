// Rutas de administración (moderación). Protegidas con sesión.
const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/admin.controller');
const { requireAdmin } = require('../middlewares/auth');
const { verificarCsrf } = require('../middlewares/csrf');

const router = express.Router();

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/login', ctrl.getLogin);
router.post('/login', limiteLogin, verificarCsrf, ctrl.postLogin);
router.post('/logout', verificarCsrf, ctrl.postLogout);

// A partir de aquí, todo exige admin autenticado.
router.use(requireAdmin);

router.get('/', ctrl.getPanel);
router.get('/reporte/:id', ctrl.getDetalle);
router.post('/reporte/:id/oculto', verificarCsrf, ctrl.postOcultarReporte);
router.post('/reporte/:id/subsanar', verificarCsrf, ctrl.postSubsanarReporte);
router.post('/comentario/:id/oculto', verificarCsrf, ctrl.postOcultarComentario);

module.exports = router;
