// Construcción de la aplicación Express.
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./db/pool');

const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');
const { proveerCsrf } = require('./middlewares/csrf');

const app = express();

// Detrás del proxy de Render/Heroku: necesario para que las cookies de sesión
// seguras (cookie.secure) y el rate-limit por IP funcionen correctamente.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ─── Seguridad y cabeceras ─────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'https://res.cloudinary.com', 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
  })
);

// ─── Vistas (EJS) ──────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Parsers y estáticos ───────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Sesión (solo para el login del admin) ─────────────────
// En producción se persiste en PostgreSQL; en desarrollo se usa el almacén en
// memoria (evita depender de la BD para cada sesión). El flujo público NO usa
// sesión: la protección CSRF es por cookie, sin estado.
const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'inseguro-cambiar',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8, // 8 horas
    secure: process.env.NODE_ENV === 'production',
  },
};
if (process.env.NODE_ENV === 'production') {
  sessionOptions.store = new pgSession({ pool, tableName: 'session' });
}
app.use(session(sessionOptions));

// Token CSRF disponible en todas las vistas (campo oculto _csrf).
app.use(proveerCsrf);

// Expone el admin autenticado y la URL base a todas las vistas.
app.use((req, res, next) => {
  res.locals.admin = req.session.admin || null;
  res.locals.appUrl = process.env.APP_URL || '';
  next();
});

// ─── Rutas ─────────────────────────────────────────────────
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// ─── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    titulo: 'Página no encontrada',
    mensaje: 'La página que buscas no existe.',
  });
});

// ─── Manejador de errores ──────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).render('error', {
    titulo: 'Ocurrió un error',
    mensaje:
      process.env.NODE_ENV === 'production'
        ? 'Hubo un problema procesando tu solicitud. Intenta de nuevo.'
        : err.message,
  });
});

module.exports = app;
