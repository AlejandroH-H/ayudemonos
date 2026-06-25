// Controlador público: vista principal, creación, detalle, comentarios y subsanado.
const { ESTADOS } = require('../db/estados');
const { TIPOS, SEVERIDADES } = require('../middlewares/validate');
const cloudinaryService = require('../services/cloudinary.service');
const reportes = require('../services/reportes.service');
const comentarios = require('../services/comentarios.service');

// Datos comunes para renderizar el formulario de reporte.
function datosFormulario(extra = {}) {
  return { estados: ESTADOS, tipos: TIPOS, severidades: SEVERIDADES, ...extra };
}

// ── Vista principal: estadísticas + listas de activos y subsanados ──
async function getInicio(req, res, next) {
  try {
    const [stats, activos, subsanados] = await Promise.all([
      reportes.estadisticas(),
      reportes.listar(false),
      reportes.listar(true),
    ]);
    res.render('index', { stats, activos, subsanados });
  } catch (err) {
    next(err);
  }
}

function getFormulario(req, res) {
  res.render('reportar', datosFormulario({ errores: [], valores: {} }));
}

async function postReporte(req, res, next) {
  try {
    const errores = [...(req.erroresValidacion || [])];
    if (req.uploadError) errores.push(req.uploadError);

    if (errores.length > 0) {
      return res
        .status(400)
        .render('reportar', datosFormulario({ errores, valores: req.body }));
    }

    let fotoUrl = null;
    if (req.file && req.file.buffer) {
      try {
        fotoUrl = await cloudinaryService.uploadFromBuffer(req.file.buffer);
      } catch (e) {
        console.error('Fallo al subir la foto a Cloudinary:', e.message);
      }
    }

    const reporte = await reportes.crearReporte({
      estado: req.body.estado,
      municipio: req.body.municipio,
      direccion: req.body.direccion,
      lat: req.body.lat || null,
      lng: req.body.lng || null,
      persona_nombre: req.body.persona_nombre,
      tipo_emergencia: req.body.tipo_emergencia,
      severidad: req.body.severidad,
      descripcion: req.body.descripcion,
      personas_afectadas: req.body.personas_afectadas,
      contacto_nombre: req.body.contacto_nombre,
      contacto_telefono: req.body.contacto_telefono,
      foto_url: fotoUrl,
    });

    // Se publica de inmediato; mostramos el código de resolución.
    return res.redirect(`/reporte/${reporte.codigo}/creado`);
  } catch (err) {
    next(err);
  }
}

// Página de confirmación tras crear (enfatiza guardar el código).
async function getCreado(req, res, next) {
  try {
    const reporte = await reportes.obtenerPorCodigo(req.params.codigo);
    if (!reporte) return notFound(res);
    res.render('confirmacion', { reporte });
  } catch (err) {
    next(err);
  }
}

// Detalle público de un reporte + comentarios.
async function getReporte(req, res, next) {
  try {
    const reporte = await reportes.obtenerPorCodigo(req.params.codigo);
    if (!reporte) return notFound(res);
    const [lista, confirmaciones] = await Promise.all([
      comentarios.listarPorReporte(reporte.id),
      comentarios.contarConfirmaciones(reporte.id),
    ]);
    res.render('reporte', {
      reporte,
      comentarios: lista,
      confirmaciones,
      errores: [],
      subsanarError: null,
    });
  } catch (err) {
    next(err);
  }
}

// Crear comentario.
async function postComentario(req, res, next) {
  try {
    const reporte = await reportes.obtenerPorCodigo(req.params.codigo);
    if (!reporte) return notFound(res);

    if ((req.erroresValidacion || []).length > 0) {
      const [lista, confirmaciones] = await Promise.all([
        comentarios.listarPorReporte(reporte.id),
        comentarios.contarConfirmaciones(reporte.id),
      ]);
      return res.status(400).render('reporte', {
        reporte,
        comentarios: lista,
        confirmaciones,
        errores: req.erroresValidacion,
        subsanarError: null,
      });
    }

    await comentarios.crear(reporte.id, {
      autor: req.body.autor,
      cuerpo: req.body.cuerpo,
      esConfirmacion: req.body.es_confirmacion === 'on' || req.body.es_confirmacion === 'true',
    });
    res.redirect(`/reporte/${reporte.codigo}#comentarios`);
  } catch (err) {
    next(err);
  }
}

// Marcar subsanado con el código de resolución.
async function postSubsanar(req, res, next) {
  try {
    const codigoUrl = req.params.codigo;
    const codigoIngresado = (req.body.codigo || '').trim().toUpperCase();
    const reporte = await reportes.obtenerPorCodigo(codigoUrl);
    if (!reporte) return notFound(res);

    if (codigoIngresado !== reporte.codigo) {
      const [lista, confirmaciones] = await Promise.all([
        comentarios.listarPorReporte(reporte.id),
        comentarios.contarConfirmaciones(reporte.id),
      ]);
      return res.status(400).render('reporte', {
        reporte,
        comentarios: lista,
        confirmaciones,
        errores: [],
        subsanarError: 'El código no coincide con este reporte.',
      });
    }

    await reportes.subsanarPorCodigo(reporte.codigo);
    res.redirect(`/reporte/${reporte.codigo}`);
  } catch (err) {
    next(err);
  }
}

function notFound(res) {
  return res.status(404).render('error', {
    titulo: 'Reporte no encontrado',
    mensaje: 'No existe un reporte con ese código.',
  });
}

module.exports = {
  getInicio,
  getFormulario,
  postReporte,
  getCreado,
  getReporte,
  postComentario,
  postSubsanar,
};
