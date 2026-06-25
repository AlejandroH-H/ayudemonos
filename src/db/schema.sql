-- Esquema de la base de datos del Sistema de Reportes Sismo
-- Ejecutar contra la base PostgreSQL indicada en DATABASE_URL.

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
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seguimiento_estado') THEN
    CREATE TYPE seguimiento_estado AS ENUM ('recibido', 'en_atencion', 'resuelto');
  END IF;
END$$;

-- Autoridades: usuarios del panel. Cada una pertenece a un estado y su email
-- es el destino de las notificaciones de los reportes de ese estado.
CREATE TABLE IF NOT EXISTS autoridades (
  id            SERIAL PRIMARY KEY,
  estado        TEXT NOT NULL,
  organismo     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autoridades_estado ON autoridades (estado);

-- Reportes creados por la ciudadanía (anónimos).
CREATE TABLE IF NOT EXISTS reportes (
  id                 SERIAL PRIMARY KEY,
  codigo             TEXT NOT NULL UNIQUE,
  estado             TEXT NOT NULL,
  municipio          TEXT,
  direccion          TEXT,
  lat                DOUBLE PRECISION,
  lng                DOUBLE PRECISION,
  tipo_emergencia    tipo_emergencia NOT NULL,
  severidad          severidad NOT NULL DEFAULT 'media',
  descripcion        TEXT NOT NULL,
  personas_afectadas INTEGER NOT NULL DEFAULT 1 CHECK (personas_afectadas >= 0),
  contacto_nombre    TEXT,
  contacto_telefono  TEXT,
  foto_url           TEXT,
  seguimiento        seguimiento_estado NOT NULL DEFAULT 'recibido',
  notificado         BOOLEAN NOT NULL DEFAULT false,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reportes_estado ON reportes (estado);
CREATE INDEX IF NOT EXISTS idx_reportes_creado_en ON reportes (creado_en DESC);

-- Tabla de sesiones para connect-pg-simple (panel de autoridades).
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL COLLATE "default",
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session (expire);
