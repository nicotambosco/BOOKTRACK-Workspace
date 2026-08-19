-- ─────────────────────────────────────────────────────────────────
-- Setup Base de Datos BookTrack
-- ─────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS booktrack_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE booktrack_db;

-- Confirmar que la BD fue creada
SELECT 'Base de datos BookTrack creada correctamente ✓' AS status;
