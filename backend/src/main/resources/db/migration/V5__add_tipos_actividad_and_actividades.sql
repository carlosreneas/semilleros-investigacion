CREATE TABLE tipos_actividad (
    id     BIGSERIAL    PRIMARY KEY,
    nombre VARCHAR(160) NOT NULL UNIQUE
);

CREATE TABLE actividades (
    id                      BIGSERIAL    PRIMARY KEY,
    semillero_id            BIGINT       NOT NULL REFERENCES semilleros(id),
    tipo_actividad_id       BIGINT       NOT NULL REFERENCES tipos_actividad(id),
    nombre                  VARCHAR(255) NOT NULL,
    porcentaje_cumplimiento INT          NOT NULL CHECK (porcentaje_cumplimiento >= 0 AND porcentaje_cumplimiento <= 100)
);

-- =====================================================
-- Tipos de actividad de investigación iniciales
-- =====================================================
INSERT INTO tipos_actividad (nombre) VALUES
    ('Espacio de socialización'),
    ('Feria de carreras'),
    ('Taller formativo'),
    ('Capacitación metodológica'),
    ('Seminario de investigación'),
    ('Salida de campo')
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- Actividades de ejemplo para semilleros
-- =====================================================
INSERT INTO actividades (semillero_id, tipo_actividad_id, nombre, porcentaje_cumplimiento) VALUES
    (
        (SELECT id FROM semilleros WHERE sigla = 'SIAA'),
        (SELECT id FROM tipos_actividad WHERE nombre = 'Espacio de socialización'),
        'Apertura Semana Internacional Ciencia y Tecnología',
        100
    ),
    (
        (SELECT id FROM semilleros WHERE sigla = 'SIAA'),
        (SELECT id FROM tipos_actividad WHERE nombre = 'Feria de carreras'),
        'Participación en la feria de carreras con los proyectos del semillero',
        100
    ),
    (
        (SELECT id FROM semilleros WHERE sigla = 'SIAA'),
        (SELECT id FROM tipos_actividad WHERE nombre = 'Taller formativo'),
        'Taller Práctico de Modelos de Lenguaje y RAG',
        85
    ),
    (
        (SELECT id FROM semilleros WHERE sigla = 'SAM'),
        (SELECT id FROM tipos_actividad WHERE nombre = 'Seminario de investigación'),
        'Seminario de Arquitectura Limpia y Microservicios',
        100
    ),
    (
        (SELECT id FROM semilleros WHERE sigla = 'SAM'),
        (SELECT id FROM tipos_actividad WHERE nombre = 'Feria de carreras'),
        'Muestra interactiva de desarrollo cloud para aspirantes',
        90
    ),
    (
        (SELECT id FROM semilleros WHERE sigla = 'SIHE'),
        (SELECT id FROM tipos_actividad WHERE nombre = 'Espacio de socialización'),
        'Jornada de Ciberseguridad y CTF Interuniversitario',
        100
    ),
    (
        (SELECT id FROM semilleros WHERE sigla = 'SIHE'),
        (SELECT id FROM tipos_actividad WHERE nombre = 'Capacitación metodológica'),
        'Capacitación en análisis de malware y pentesting',
        75
    ),
    (
        (SELECT id FROM semilleros WHERE sigla = 'SRSE'),
        (SELECT id FROM tipos_actividad WHERE nombre = 'Taller formativo'),
        'Taller de Prototipado Rápido con ESP32 y Sensores IoT',
        90
    ),
    (
        (SELECT id FROM semilleros WHERE sigla = 'SVRX'),
        (SELECT id FROM tipos_actividad WHERE nombre = 'Espacio de socialización'),
        'Exhibición de Realidad Virtual y Videojuegos Formativos',
        100
    );
