// Controlador público: vista principal, creación, detalle, comentarios y subsanado.
const { ESTADOS } = require('../db/estados');
const { CATALOGO, MAPA, iconoDe } = require('../db/necesidades');
const { TIPOS, SEVERIDADES } = require('../middlewares/validate');
const cloudinaryService = require('../services/cloudinary.service');
const reportes = require('../services/reportes.service');
const comentarios = require('../services/comentarios.service');
const necesidades = require('../services/necesidades.service');
const { contactosPorAmbito } = require('../data/contactos');

// Datos comunes para renderizar el formulario de reporte.
function datosFormulario(extra = {}) {
  return {
    estados: ESTADOS,
    tipos: TIPOS,
    severidades: SEVERIDADES,
    necesidadesCatalogo: CATALOGO,
    ...extra,
  };
}

// Construye la lista de necesidades a partir del cuerpo del formulario.
// Solo acepta claves del catálogo; toma la cantidad opcional por clave y
// añade el campo libre "otro" si tiene texto.
function parsearNecesidades(body) {
  const seleccion = [].concat(body['necesidades'] || []);
  const items = [];
  for (const clave of seleccion) {
    const it = MAPA[clave];
    if (!it) continue;
    const cantidad = (body[`cantidad_${clave}`] || '').trim().slice(0, 40);
    items.push({ item: clave, etiqueta: it.etiqueta, cantidad });
  }
  const otro = (body['necesidad_otro'] || '').trim().slice(0, 80);
  if (otro) {
    const cantidad = (body['cantidad_otro'] || '').trim().slice(0, 40);
    items.push({ item: 'otro', etiqueta: otro, cantidad });
  }
  return items;
}

// Agrupa una lista plana de comentarios en hilos de un nivel.
const armarHilos = comentarios.armarHilos;

// Carga y renderiza el detalle público de un reporte (comentarios en hilos,
// confirmaciones y necesidades con su icono). `extra` permite inyectar errores.
async function renderDetalle(res, reporte, status = 200, extra = {}) {
  const [lista, confirmaciones, listaNecesidades] = await Promise.all([
    comentarios.listarPorReporte(reporte.id),
    comentarios.contarConfirmaciones(reporte.id),
    necesidades.listarPorReporte(reporte.id),
  ]);
  listaNecesidades.forEach((n) => {
    n.icono = iconoDe(n.item);
  });
  res.status(status).render('reporte', {
    reporte,
    comentarios: armarHilos(lista),
    confirmaciones,
    necesidades: listaNecesidades,
    errores: [],
    subsanarError: null,
    necesidadesError: null,
    ...extra,
  });
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

// Directorio de teléfonos de emergencia.
function getContactos(req, res) {
  res.render('contactos', { grupos: contactosPorAmbito() });
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
      cedula: req.body.cedula,
      tipo_emergencia: req.body.tipo_emergencia,
      severidad: req.body.severidad,
      descripcion: req.body.descripcion,
      personas_afectadas: req.body.personas_afectadas,
      contacto_nombre: req.body.contacto_nombre,
      contacto_telefono: req.body.contacto_telefono,
      foto_url: fotoUrl,
    });

    // Necesidades urgentes seleccionadas en el formulario.
    await necesidades.crearMuchas(reporte.id, parsearNecesidades(req.body));

    // Se renderiza la confirmación en la propia respuesta del POST: así el
    // código de resolución solo lo ve quien creó el reporte y nunca aparece
    // en una URL que pueda compartirse.
    return res.render('confirmacion', { reporte });
  } catch (err) {
    next(err);
  }
}

// Detalle público de un reporte + comentarios (por id, sin exponer el código).
async function getReporte(req, res, next) {
  try {
    const reporte = await reportes.obtenerPorId(req.params.id);
    if (!reporte) return notFound(res);
    await renderDetalle(res, reporte);
  } catch (err) {
    next(err);
  }
}

// Crear comentario.
async function postComentario(req, res, next) {
  try {
    const reporte = await reportes.obtenerPorId(req.params.id);
    if (!reporte) return notFound(res);

    if ((req.erroresValidacion || []).length > 0) {
      return renderDetalle(res, reporte, 400, { errores: req.erroresValidacion });
    }

    // Hilo de un nivel: si se responde a una respuesta, se aplana a su raíz.
    let parentId = req.body.parent_id || null;
    let esConfirmacion =
      req.body.es_confirmacion === 'on' || req.body.es_confirmacion === 'true';
    if (parentId) {
      const padre = await comentarios.obtenerPorId(parentId);
      if (!padre || padre.reporte_id !== reporte.id) {
        parentId = null; // padre inválido → comentario raíz
      } else {
        parentId = padre.parent_id || padre.id;
        esConfirmacion = false; // las respuestas no confirman hallazgos
      }
    }

    await comentarios.crear(reporte.id, {
      autor: req.body.autor,
      cuerpo: req.body.cuerpo,
      esConfirmacion,
      parentId,
    });
    res.redirect(`/reporte/${reporte.id}#comentarios`);
  } catch (err) {
    next(err);
  }
}

// Marcar subsanado con el código de resolución.
async function postSubsanar(req, res, next) {
  try {
    const codigoIngresado = (req.body.codigo || '').trim().toUpperCase();
    const reporte = await reportes.obtenerPorId(req.params.id);
    if (!reporte) return notFound(res);

    if (codigoIngresado !== reporte.codigo) {
      return renderDetalle(res, reporte, 400, {
        subsanarError: 'El código no coincide con este reporte.',
      });
    }

    await reportes.subsanarPorCodigo(reporte.codigo);
    res.redirect(`/reporte/${reporte.id}`);
  } catch (err) {
    next(err);
  }
}

// Marca una necesidad como cubierta. Exclusivo del creador: requiere el código
// de resolución (los demás solo pueden confirmar por los comentarios).
async function postNecesidadCubierto(req, res, next) {
  try {
    const reporte = await reportes.obtenerPorId(req.params.id);
    if (!reporte) return notFound(res);

    const codigoIngresado = (req.body.codigo || '').trim().toUpperCase();
    if (codigoIngresado !== reporte.codigo) {
      return renderDetalle(res, reporte, 400, {
        necesidadesError:
          'El código no coincide; solo quien creó el reporte puede marcar necesidades como cubiertas. Si viste que ya las cubrieron, confírmalo en los comentarios.',
      });
    }

    const necesidad = await necesidades.obtenerPorId(req.body.necesidad_id);
    if (necesidad && necesidad.reporte_id === reporte.id) {
      await necesidades.marcarCubierto(necesidad.id, true);
    }
    res.redirect(`/reporte/${reporte.id}#necesidades`);
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
  getContactos,
  postReporte,
  getReporte,
  postComentario,
  postSubsanar,
  postNecesidadCubierto,
};
