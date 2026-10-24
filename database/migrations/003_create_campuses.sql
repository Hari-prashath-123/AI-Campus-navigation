-- ============================================================
-- Migration: 003_create_campuses.sql
-- Purpose:   Campus entity. One organization can have multiple
--            campuses (main campus, north campus, hospital wing etc.)
-- ============================================================

CREATE TABLE campuses (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug                VARCHAR(80) NOT NULL,           -- Unique within organization
    code                VARCHAR(20) NOT NULL,           -- Short code e.g. "GIT-MAIN"
    name                JSONB       NOT NULL,           -- Multilingual names
    description         JSONB,                         -- Multilingual descriptions
    address             JSONB,                         -- { street, city, state, country, postal_code }
    -- Spatial: geo center point for outdoor map positioning
    geo_center          GEOMETRY(Point, 4326),         -- WGS84 lat/lng center
    geo_bounds          GEOMETRY(Polygon, 4326),       -- Bounding polygon
    -- Coordinate system for internal 2D floor plans
    coordinate_system   VARCHAR(20) NOT NULL DEFAULT 'pixel',  -- 'pixel' | 'metric' | 'geographic'
    map_settings        JSONB       NOT NULL DEFAULT '{}',
    -- e.g. { "defaultZoom": 15, "maxFloorZoom": 19, "tileLayerUrl": null }
    logo_url            TEXT,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    is_published        BOOLEAN     NOT NULL DEFAULT FALSE,  -- Published = visible to end users
    metadata            JSONB       NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE campuses IS
    'Represents one campus/site. Multiple campuses can coexist under one organization.';
COMMENT ON COLUMN campuses.coordinate_system IS
    '"pixel": normalized 0-100 2D canvas coords; "metric": real-world meters; "geographic": lat/lng.';
COMMENT ON COLUMN campuses.map_settings IS
    'Campus-level map rendering configuration (zoom levels, tile layers, CRS overrides).';

-- Unique slug per organization
CREATE UNIQUE INDEX idx_campuses_org_slug ON campuses (organization_id, slug);

-- Spatial index for geographic queries (nearest campus, bounding box checks)
CREATE INDEX idx_campuses_geo_center ON campuses USING GIST (geo_center);
CREATE INDEX idx_campuses_geo_bounds ON campuses USING GIST (geo_bounds);

-- Lookup indexes
CREATE INDEX idx_campuses_org_id ON campuses (organization_id);
CREATE INDEX idx_campuses_is_published ON campuses (is_published) WHERE is_published = TRUE;

-- Trigram index for multilingual name search
CREATE INDEX idx_campuses_name_trgm ON campuses USING GIN ((name::TEXT) gin_trgm_ops);

CREATE TRIGGER trg_campuses_updated_at
    BEFORE UPDATE ON campuses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
