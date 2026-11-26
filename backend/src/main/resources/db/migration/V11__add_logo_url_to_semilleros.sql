-- V11: Agregar columna logo_url a la tabla semilleros

ALTER TABLE semilleros
    ADD COLUMN logo_url VARCHAR(500);
