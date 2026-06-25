// Controlador de los reportes públicos (ciudadanía, anónimo).
const { ESTADOS } = require('../db/estados');
const { TIPOS, SEVERIDADES } = require('../middlewares/validate');
const cloudinaryService = require('../services/cloudinary.service');
const reportesService = require('../services/reportes.service');
const notificaciones = require('../services/notificaciones.service');

// Datos comunes para renderizar el formulario.
function datosFormulario(extra = {}) {
  return { estados: ESTADOS, tipos: TIPOS, severidades: SEVERIDADES, ...extra };
}

function getInicio(req, res) {
  res.render('index');
}

function getFormulario(req, res) {
  res.render('reportar', datosFormulario({ errores: [], valores: {} }));
}

async function postReporte(req, res, next) {
  try {
    const errores = [...(req.erroresValidacion || [])];
    if (req.uploadError) errores.push(req.uploadError);

    if (errores.length > 0) {
      return res.status(400).render(
        'reportar',
        datosFormulario({ errores, valores: req.body })
      );
    }

    // Sube la foto si vino una (Cloudinary). Si falla, no se pierde el reporte.
    let fotoUrl = null;
    if (req.file && req.file.buffer) {
      try {
        fotoUrl = await cloudinaryService.uploadFromBuffer(req.file.buffer);
      } catch (e) {
        console.error('Fallo al subir la foto a Cloudinary:', e.message);
      }
    }

    const reporte = await reportesService.crearReporte({
      estado: req.body.estado,
      municipio: req.body.municipio,
      direccion: req.body.direccion,
      lat: req.body.lat || null,
      lng: req.body.lng || null,
      tipo_emergencia: req.body.tipo_emergencia,
      severidad: req.body.severidad,
      descripcion: req.body.descripcion,
      personas_afectadas: req.body.personas_afectadas,
      contacto_nombre: req.body.contacto_nombre,
      contacto_telefono: req.body.contacto_telefono,
      foto_url: fotoUrl,
    });

    // Enrutamiento crítico: notificar a la autoridad del estado del reporte.
    try {
      const autoridad = await reportesService.autoridadPorEstado(reporte.estado);
      if (autoridad) {
        const previewUrl = await notificaciones.enviarReporteAAutoridad(reporte, autoridad);
        await reportesService.marcarNotificado(reporte.id);
        if (previewUrl) {
          console.log(`✉ Notificación a ${autoridad.email} — preview: ${previewUrl}`);
        }
      } else {
        console.warn(`No hay autoridad registrada para el estado: ${reporte.estado}`);
      }
    } catch (e) {
      // El reporte ya está guardado; la notificación se puede reintentar luego.
      console.error('Fallo al notificar a la autoridad:', e.message);
    }

    return res.redirect(`/reporte/${reporte.codigo}`);
  } catch (err) {
    next(err);
  }
}

async function getSeguimiento(req, res, next) {
  try {
    const reporte = await reportesService.obtenerPorCodigo(req.params.codigo);
    if (!reporte) {
      return res.status(404).render('error', {
        titulo: 'Reporte no encontrado',
        mensaje: 'No existe un reporte con ese código de seguimiento.',
      });
    }
    res.render('confirmacion', { reporte });
  } catch (err) {
    next(err);
  }
}

module.exports = { getInicio, getFormulario, postReporte, getSeguimiento };
