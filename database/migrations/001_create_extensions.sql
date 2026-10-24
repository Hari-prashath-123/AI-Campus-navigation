-- ============================================================
-- Migration: 001_create_extensions.sql
-- Purpose:   Enable required PostgreSQL extensions
-- Run:       psql -U postgres -d omnicampus -f 001_create_extensions.sql
-- ============================================================

-- PostGIS: Spatial geometry types, functions, and indexes
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID generation for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm: trigram-based fuzzy text search on names/descriptions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent: accent-insensitive multilingual search
CREATE EXTENSION IF NOT EXISTS unaccent;
