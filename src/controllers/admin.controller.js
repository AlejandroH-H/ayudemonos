// Controlador de administración: login y moderación.
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const reportes = require('../services/reportes.service');
const comentarios = require('../services/comentarios.service');
const necesidades = require('../services/necesidades.service');
const { iconoDe } = require('../db/necesidades');

function getLogin(req, res) {
  if (req.session.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
}

async function postLogin(req, res, next) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const { rows } = await query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = rows[0];
    const ok = admin && (await bcrypt.compare(req.body.password || '', admin.password_hash));
    if (!ok) {
      return res.status(401).render('admin/login', { error: 'Credenciales inválidas.' });
    }
    req.session.admin = { id: admin.id, email: admin.email };
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
}

function postLogout(req, res) {
  req.session.destroy(() => res.redirect('/admin/login'));
}

// Lista de moderación: todos los reportes (incluidos ocultos).
async function getPanel(req, res, next) {
  try {
    const lista = await reportes.listarTodos();
    res.render('admin/panel', { reportes: lista });
  } catch (err) {
    next(err);
  }
}

// Detalle de moderación: reporte + comentarios (incluidos ocultos).
async function getDetalle(req, res, next) {
  try {
    const reporte = await reportes.obtenerPorId(req.params.id, true);
    if (!reporte) {
      return res.status(404).render('error', {
        titulo: 'Reporte no encontrado',
        mensaje: 'Ese reporte no existe.',
      });
    }
    const [lista, listaNecesidades] = await Promise.all([
      comentarios.listarPorReporte(reporte.id, true),
      necesidades.listarPorReporte(reporte.id),
    ]);
    listaNecesidades.forEach((n) => {
      n.icono = iconoDe(n.item);
    });
    res.render('admin/detalle', {
      reporte,
      comentarios: comentarios.armarHilos(lista),
      necesidades: listaNecesidades,
    });
  } catch (err) {
    next(err);
  }
}

async function postOcultarReporte(req, res, next) {
  try {
    await reportes.fijarOcultoReporte(req.params.id, req.body.oculto === 'true');
    res.redirect(req.get('referer') || '/admin');
  } catch (err) {
    next(err);
  }
}

async function postSubsanarReporte(req, res, next) {
  try {
    await reportes.subsanarPorAdmin(req.params.id);
    res.redirect(req.get('referer') || '/admin');
  } catch (err) {
    next(err);
  }
}

async function postOcultarComentario(req, res, next) {
  try {
    await comentarios.fijarOculto(req.params.id, req.body.oculto === 'true');
    res.redirect(req.get('referer') || '/admin');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLogin,
  postLogin,
  postLogout,
  getPanel,
  getDetalle,
  postOcultarReporte,
  postSubsanarReporte,
  postOcultarComentario,
};
