# Sistema de Reportes Sismo · Venezuela

Sistema web para que las personas afectadas por un sismo **creen y guarden reportes**
de su situación. Cada reporte se **enruta automáticamente a las autoridades del estado**
seleccionado (correo + panel de seguimiento).

- **Reporte ciudadano anónimo** (sin registro) con foto opcional.
- **Notificación automática por estado**: al guardar, se envía un correo a la autoridad
  del estado correspondiente.
- **Panel de autoridades**: cada autoridad inicia sesión y ve **solo** los reportes de su
  estado, con filtro por estado de seguimiento y cambio de estado (recibido → en atención
  → resuelto).
- **Consulta pública por código** de seguimiento.

## Stack

Node.js · Express · EJS (vistas server-rendered) · PostgreSQL (`pg`) ·
Cloudinary (fotos, vía `multer` en memoria) · Nodemailer (correo) ·
express-validator · express-session + bcrypt · helmet · express-rate-limit.

## Requisitos

- Node.js 18+ (usa `node --watch` para `npm run dev`).
- PostgreSQL 13+.
- (Opcional) Cuenta de Cloudinary para subir fotos.
- Para correo en desarrollo **no necesitas SMTP**: se usa una cuenta de prueba de Ethereal.

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env        # en Windows PowerShell: Copy-Item .env.example .env
#    Edita .env y configura al menos DATABASE_URL y SESSION_SECRET.
#    Para fotos, añade CLOUDINARY_URL. Para correo real, MAIL_TRANSPORT=smtp + SMTP_*.

# 3. Crear el esquema y sembrar las 24 autoridades (una por estado)
npm run db:setup

# 4. Arrancar
npm run dev     # o: npm start
```

Abre **http://localhost:3000**.

### Credenciales de ejemplo del panel

`npm run db:setup` crea una autoridad por estado con el patrón de correo
`proteccioncivil.<estado>@reportes-sismo.ve` y la contraseña por defecto `Cambiar123*`
(configurable con `SEED_AUTHORITY_PASSWORD`). Por ejemplo:

```
email:    proteccioncivil.merida@reportes-sismo.ve
password: Cambiar123*
```

> ⚠ Los correos y la contraseña sembrados son **de ejemplo para desarrollo**. Antes de
> producción, sustitúyelos por los datos oficiales de Protección Civil / gobernaciones.

## Rutas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | `/` | Inicio |
| GET  | `/reportar` | Formulario de reporte |
| POST | `/reportar` | Crea el reporte, sube la foto, notifica a la autoridad del estado |
| GET  | `/reporte/:codigo` | Consulta pública por código |
| GET/POST | `/panel/login` · `/panel/logout` | Acceso autoridades |
| GET  | `/panel` | Reportes del estado de la autoridad (filtro por seguimiento) |
| GET  | `/panel/reporte/:id` | Detalle del reporte |
| POST | `/panel/reporte/:id/seguimiento` | Cambia el estado de seguimiento |

## Cómo verificar el flujo completo

1. `npm run dev` y abre `/reportar`.
2. Elige un estado (p. ej. **Mérida**), completa el formulario, adjunta una foto y envía.
3. Verás la página de confirmación con un **código de seguimiento** (`SIS-XXXXXX`).
4. En la consola del servidor aparece la **URL de previsualización de Ethereal**: ábrela y
   confirma que el correo salió **a la autoridad de Mérida**.
5. En `/panel/login` entra como `proteccioncivil.merida@...`: debes ver el reporte.
   Entra como otra autoridad (otro estado): **no** debe verlo (aislamiento por estado).
6. Cambia el seguimiento a "en atención" y vuelve a consultar `/reporte/<codigo>`.

## Correo con Gmail (producción)

El sistema envía un correo a la autoridad del estado de cada reporte. Para usar Gmail:

1. Usa (o crea) una cuenta Gmail dedicada, p. ej. `reportes.sismo.ve@gmail.com`.
2. Activa la **Verificación en 2 pasos** en la cuenta de Google.
3. Genera una **Contraseña de aplicación**: Google Account → Seguridad → *Contraseñas de
   aplicaciones* → copia los 16 caracteres.
4. Configura las variables:
   ```
   MAIL_TRANSPORT=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=reportes.sismo.ve@gmail.com
   SMTP_PASS=<contraseña de aplicación de 16 caracteres>
   MAIL_FROM="Reportes Sismo <reportes.sismo.ve@gmail.com>"
   ```

> **Importante:** con Gmail, `MAIL_FROM` debe usar la **misma dirección** que `SMTP_USER`.
> Límite ~500 correos/día. **Migrar a Brevo/SendGrid** (mejor para volumen): cambia solo
> `SMTP_HOST`, `SMTP_USER` y `SMTP_PASS`; el resto del código no cambia.
>
> Nota: en una red que filtra el puerto 587, el envío SMTP **solo funcionará desde el
> servidor desplegado** (Render), no desde tu PC local.

## Despliegue en Render (gratis)

El repo incluye `render.yaml` (Blueprint). La base de datos es **Neon** (externa), ya con
esquema y 24 autoridades sembradas.

1. Sube el proyecto a un repositorio de **GitHub**.
2. En **Render** → *New* → *Blueprint* → conecta el repo. Render detecta `render.yaml`.
3. Rellena las variables marcadas como secretas (no van en el repo):
   `DATABASE_URL` (Neon), `CLOUDINARY_URL`, `SESSION_SECRET`, `SMTP_USER`, `SMTP_PASS`,
   `MAIL_FROM`. (`MAIL_TRANSPORT=smtp`, `SMTP_HOST/PORT/SECURE` y `NODE_ENV=production` ya
   vienen en el Blueprint.)
4. Tras el primer deploy, copia la URL `https://<nombre>.onrender.com` y ponla en la
   variable `APP_URL` → guarda (re-despliega). Así los enlaces de los correos y del panel
   apuntan al dominio correcto.

> El plan gratuito **duerme** el servicio tras ~15 min de inactividad (primer acceso
> ~30–50 s). Para conectar un dominio `.com` propio: cómpralo (Namecheap/Porkbun/Cloudflare)
> y en Render → *Settings* → *Custom Domains* añade el dominio y apunta el DNS según indique.

## Resolución de problemas de red

Algunas redes (firewalls corporativos, antivirus con inspección SSL, ciertos ISP)
**resetean conexiones TLS en puertos distintos del 443**, lo que rompe Postgres (5432)
y SMTP (587/465). Soluciones ya integradas:

- **Base de datos:** si usas **Neon**, el proyecto conmuta solo al *driver serverless*
  (`@neondatabase/serverless`), que conecta por **WebSocket sobre el 443**. No tienes que
  hacer nada; basta con que el `DATABASE_URL` contenga `neon.tech`.
- **Correo:** usa `MAIL_TRANSPORT=json` para ver a qué autoridad se dirige cada reporte sin
  enviar nada por red. Para envío real desde una red restringida, usa un proveedor con API
  HTTP (sobre 443) o despliega en la nube, donde los puertos no están filtrados.

## Estructura

```
src/
  app.js · server.js
  db/        pool.js · schema.sql · estados.js · setup.js
  config/    cloudinary.js · mailer.js
  middlewares/  upload.js · auth.js · validate.js
  routes/    public.routes.js · panel.routes.js
  controllers/  reportes.controller.js · panel.controller.js
  services/  reportes.service.js · cloudinary.service.js · notificaciones.service.js
  views/     index · reportar · confirmacion · error · panel/{login,lista,detalle} · partials
  public/    css/styles.css · js/geo.js
```
