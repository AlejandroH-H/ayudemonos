// Controlador del panel de autoridades.
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const reportesService = require('../services/reportes.service');

const SEGUIMIENTOS = ['recibido', 'en_atencion', 'resuelto'];

function getLogin(req, res) {
  if (req.session.autoridad) return res.redirect('/panel');
  res.render('panel/login', { error: null });
}

async function postLogin(req, res, next) {
  try {
    const { email, password } = req.body;
    const { rows } = await query('SELECT * FROM autoridades WHERE email = $1', [
      (email || '').trim().toLowerCase(),
    ]);
    const autoridad = rows[0];

    const ok = autoridad && (await bcrypt.compare(password || '', autoridad.password_hash));
    if (!ok) {
      return res.status(401).render('panel/login', {
        error: 'Credenciales inválidas.',
      });
    }

    // Guarda solo lo necesario en sesión.
    req.session.autoridad = {
      id: autoridad.id,
      estado: autoridad.estado,
      organismo: autoridad.organismo,
      email: autoridad.email,
    };
    res.redirect('/panel');
  } catch (err) {
    next(err);
  }
}

function postLogout(req, res) {
  req.session.destroy(() => res.redirect('/panel/login'));
}

async function getLista(req, res, next) {
  try {
    const { estado } = req.session.autoridad;
    const filtro = SEGUIMIENTOS.includes(req.query.seguimiento)
      ? req.query.seguimiento
      : null;
    const reportes = await reportesService.listarPorEstado(estado, filtro);
    res.render('panel/lista', { reportes, filtro, seguimientos: SEGUIMIENTOS });
  } catch (err) {
    next(err);
  }
}

async function getDetalle(req, res, next) {
  try {
    const { estado } = req.session.autoridad;
    const reporte = await reportesService.obtenerPorIdYEstado(req.params.id, estado);
    if (!reporte) {
      return res.status(404).render('error', {
        titulo: 'Reporte no encontrado',
        mensaje: 'Este reporte no existe o no pertenece a tu estado.',
      });
    }
    res.render('panel/detalle', { reporte, seguimientos: SEGUIMIENTOS });
  } catch (err) {
    next(err);
  }
}

async function postSeguimiento(req, res, next) {
  try {
    const { estado } = req.session.autoridad;
    const nuevo = req.body.seguimiento;
    if (!SEGUIMIENTOS.includes(nuevo)) {
      return res.status(400).redirect(`/panel/reporte/${req.params.id}`);
    }
    await reportesService.actualizarSeguimiento(req.params.id, estado, nuevo);
    res.redirect(`/panel/reporte/${req.params.id}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLogin,
  postLogin,
  postLogout,
  getLista,
  getDetalle,
  postSeguimiento,
};
