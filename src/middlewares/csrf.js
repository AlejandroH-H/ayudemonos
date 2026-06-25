// Protección CSRF sin estado (patrón "double-submit cookie"): no toca la base de
// datos ni la sesión. El token vive en una cookie httpOnly y se replica en un
// campo oculto del formulario; en cada POST se comprueba que coincidan.
const crypto = require('crypto');

const COOKIE = 'csrf';

function leerCookie(req, nombre) {
  const raw = req.headers.cookie || '';
  for (const par of raw.split(';')) {
    const i = par.indexOf('=');
    if (i > -1 && par.slice(0, i).trim() === nombre) {
      return decodeURIComponent(par.slice(i + 1).trim());
    }
  }
  return null;
}

// Garantiza que exista un token y lo expone a las vistas (campo oculto _csrf).
function proveerCsrf(req, res, next) {
  let token = leerCookie(req, COOKIE);
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    });
  }
  res.locals.csrfToken = token;
  next();
}

// Verifica que el token del formulario coincida con el de la cookie.
function verificarCsrf(req, res, next) {
  const enviado = (req.body && req.body._csrf) || req.headers['x-csrf-token'] || '';
  const cookie = leerCookie(req, COOKIE) || '';
  const ok =
    cookie &&
    enviado.length === cookie.length &&
    crypto.timingSafeEqual(Buffer.from(enviado), Buffer.from(cookie));

  if (ok) return next();
  return res.status(403).render('error', {
    titulo: 'Solicitud inválida',
    mensaje:
      'El token de seguridad es inválido o expiró. Recarga la página e inténtalo de nuevo.',
  });
}

module.exports = { proveerCsrf, verificarCsrf };
