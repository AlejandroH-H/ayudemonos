# Sistema de Reportes Sismo · Venezuela

Tablero **público y comunitario** para reportar y seguir a personas/situaciones afectadas
por un sismo. Cualquiera crea un reporte, se publica para toda la comunidad, y la gente puede
**comentar** y **confirmar** cuando una persona es encontrada o la situación se resuelve.

## Funcionalidades

- **Reporte anónimo** (sin cuenta) con foto opcional (Cloudinary) y ubicación GPS opcional.
- **Tablero público** en la portada con: total de reportes, lista de **activos** (sin
  subsanar) y lista de **subsanados**, y total de personas afectadas.
- **Comentarios** por reporte; cada comentario puede marcarse como *"confirmo que fue
  encontrada / resuelto"*, lo que suma a un **contador de confirmaciones**.
- **Resolución verificable** de cada reporte (ver abajo).
- **Moderación** de administrador para ocultar abuso y forzar cierres.

## ¿Cómo se comprueba que un reporte fue "subsanado"?

Tres capas, de mayor a menor autoridad:

1. **Código de resolución (autoritativo).** Al crear el reporte se genera un código privado
   (`SIS-XXXXXX`). Para marcarlo como subsanado hay que introducir ese código → solo quien lo
   creó (o alguien de confianza a quien se lo dio) puede cerrarlo. Evita cierres falsos.
2. **Confirmaciones de la comunidad (transparencia).** Cualquiera puede comentar y confirmar
   un hallazgo; se muestra el contador, pero **no cambia el estado oficial** por sí solo.
3. **Moderación de administrador.** El operador puede forzar el cierre u ocultar contenido.

## Stack

Node.js · Express · EJS · PostgreSQL (`pg` / driver serverless de Neon) · Cloudinary ·
express-validator · express-session + bcrypt (solo admin) · helmet · express-rate-limit ·
CSRF propio por cookie (double-submit, sin estado).

## Puesta en marcha

```bash
npm install
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
#   Configura DATABASE_URL, SESSION_SECRET, CLOUDINARY_URL, ADMIN_EMAIL, ADMIN_PASSWORD.
npm run db:setup            # crea/migra tablas y siembra el admin
npm run dev                 # o: npm start
```

Abre **http://localhost:3000**. El acceso de moderación está en **/admin/login** con las
credenciales de `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Verificación rápida de Cloudinary: `npm run test:cloudinary` (debe imprimir una `secure_url`).

## Rutas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | `/` | Portada: estadísticas + listas de activos y subsanados |
| GET/POST | `/reportar` | Crear reporte (foto opcional → Cloudinary) |
| GET  | `/reporte/:codigo/creado` | Confirmación con el código de resolución |
| GET  | `/reporte/:codigo` | Detalle público + comentarios |
| POST | `/reporte/:codigo/comentario` | Añadir comentario (opcionalmente confirmación) |
| POST | `/reporte/:codigo/subsanar` | Marcar subsanado con el código |
| GET/POST | `/admin/login` · `/admin/logout` | Acceso del administrador |
| GET  | `/admin` · `/admin/reporte/:id` | Moderación |
| POST | `/admin/reporte/:id/oculto` · `/subsanar` · `/admin/comentario/:id/oculto` | Acciones de moderación |

## Despliegue en Render (gratis)

El repo incluye `render.yaml` (Blueprint). La base de datos es **Neon** (externa).

1. Sube el proyecto a **GitHub**.
2. En **Render** → *New* → *Blueprint* → conecta el repo (detecta `render.yaml`).
3. Rellena las variables secretas: `DATABASE_URL` (Neon), `CLOUDINARY_URL`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`. (`NODE_ENV=production` y `SESSION_SECRET` ya vienen
   en el Blueprint.)
4. Tras el primer deploy, pon la URL `https://<nombre>.onrender.com` en `APP_URL` y redesplega.

> El plan gratuito **duerme** el servicio tras ~15 min de inactividad (primer acceso
> ~30–50 s). Para un dominio `.com` propio: cómpralo y añádelo en Render → *Settings* →
> *Custom Domains*.

## Nota de red (drivers)

Algunas redes resetean conexiones TLS en puertos distintos del 443 (rompe Postgres en 5432).
Por eso, si `DATABASE_URL` apunta a **Neon**, el proyecto usa automáticamente el *driver
serverless* por WebSocket/443. El helper de consultas (`src/db/pool.js`) reintenta ante
fallos transitorios (p. ej. el arranque en frío de Neon).

## Estructura

```
src/
  app.js · server.js
  db/        pool.js · schema.sql · estados.js · setup.js
  config/    cloudinary.js
  middlewares/  upload.js · auth.js · validate.js · csrf.js
  routes/    public.routes.js · admin.routes.js
  controllers/  reportes.controller.js · admin.controller.js
  services/  reportes.service.js · comentarios.service.js · cloudinary.service.js
  utils/     html.js
  views/     index · reportar · confirmacion · reporte · error · admin/{login,panel,detalle} · partials
  public/    css/styles.css · js/geo.js
scripts/     test-cloudinary.js
```
