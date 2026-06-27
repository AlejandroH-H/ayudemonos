-- Esquema de la base de datos del Sistema de Reportes Sismo (modelo comunitario).
-- Idempotente: se puede ejecutar varias veces sin romper datos existentes.

-- Tipos controlados para los catálogos del reporte.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_emergencia') THEN
    CREATE TYPE tipo_emergencia AS ENUM (
      'medica', 'rescate', 'refugio', 'agua',
      'alimentos', 'desaparecido', 'dano_estructural', 'otro'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severidad') THEN
    CREATE TYPE severidad AS ENUM ('baja', 'media', 'alta', 'critica');
  END IF;
END$$;

-- Reportes públicos creados por la ciudadanía (anónimos).
CREATE TABLE IF NOT EXISTS reportes (
  id                 SERIAL PRIMARY KEY,
  codigo             TEXT NOT NULL UNIQUE,           -- código privado de resolución
  estado             TEXT NOT NULL,
  municipio          TEXT,
  direccion          TEXT,
  lat                DOUBLE PRECISION,
  lng                DOUBLE PRECISION,
  persona_nombre     TEXT,                            -- persona afectada/buscada (opcional)
  cedula             TEXT,                            -- identificación oficial (opcional)
  tipo_emergencia    tipo_emergencia NOT NULL,
  severidad          severidad NOT NULL DEFAULT 'media',
  descripcion        TEXT NOT NULL,
  personas_afectadas INTEGER NOT NULL DEFAULT 1 CHECK (personas_afectadas >= 0),
  contacto_nombre    TEXT,
  contacto_telefono  TEXT,
  foto_url           TEXT,
  subsanado          BOOLEAN NOT NULL DEFAULT false,
  subsanado_en       TIMESTAMPTZ,
  subsanado_por      TEXT,                            -- 'codigo' | 'admin'
  oculto             BOOLEAN NOT NULL DEFAULT false,  -- moderación
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migración suave desde el modelo anterior (tabla reportes preexistente).
-- Debe ir ANTES de crear índices que referencian estas columnas.
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS persona_nombre TEXT;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS cedula TEXT;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS subsanado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS subsanado_en TIMESTAMPTZ;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS subsanado_por TEXT;
ALTER TABLE reportes ADD COLUMN IF NOT EXISTS oculto BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE reportes DROP COLUMN IF EXISTS seguimiento;
ALTER TABLE reportes DROP COLUMN IF EXISTS notificado;

CREATE INDEX IF NOT EXISTS idx_reportes_subsanado ON reportes (subsanado);
CREATE INDEX IF NOT EXISTS idx_reportes_creado_en ON reportes (creado_en DESC);

-- Necesidades urgentes (servicios/productos) solicitadas en un reporte.
CREATE TABLE IF NOT EXISTS necesidades (
  id          SERIAL PRIMARY KEY,
  reporte_id  INTEGER NOT NULL REFERENCES reportes (id) ON DELETE CASCADE,
  item        TEXT NOT NULL,                 -- clave del catálogo o 'otro'
  etiqueta    TEXT NOT NULL,                 -- nombre legible mostrado
  cantidad    TEXT,                          -- libre y opcional: "20 L", "10"
  cubierto    BOOLEAN NOT NULL DEFAULT false,
  cubierto_en TIMESTAMPTZ,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_necesidades_reporte ON necesidades (reporte_id);

-- Comentarios públicos de la comunidad sobre un reporte.
CREATE TABLE IF NOT EXISTS comentarios (
  id              SERIAL PRIMARY KEY,
  reporte_id      INTEGER NOT NULL REFERENCES reportes (id) ON DELETE CASCADE,
  parent_id       INTEGER REFERENCES comentarios (id) ON DELETE CASCADE, -- hilo de respuestas
  autor           TEXT,                                -- opcional (anónimo permitido)
  cuerpo          TEXT NOT NULL,
  es_confirmacion BOOLEAN NOT NULL DEFAULT false,      -- "confirmo que fue encontrada"
  oculto          BOOLEAN NOT NULL DEFAULT false,      -- moderación
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migración suave: añade el hilo de respuestas a instalaciones previas.
ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comentarios (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_comentarios_reporte ON comentarios (reporte_id, creado_en);

-- Cuenta(s) de administrador para la moderación.
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de sesiones para connect-pg-simple (login del admin).
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL COLLATE "default",
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);

-- Limpieza del modelo anterior.
DROP TABLE IF EXISTS autoridades;
DROP TYPE IF EXISTS seguimiento_estado;
