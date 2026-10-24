-- ============================================================
-- Migration: 004_create_buildings.sql
-- Purpose:   Buildings within a campus. Each building has its
--            own floor stack and optional geographic footprint.
-- ============================================================

CREATE TABLE buildings (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id           UUID        NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    code                VARCHAR(30) NOT NULL,           -- e.g. "ENG-BLOCK", "MED-TOWER-A"
    name                JSONB       NOT NULL,           -- Multilingual
    description         JSONB,
    -- Spatial footprint on the campus outdoor map
    geo_footprint       GEOMETRY(Polygon, 4326),        -- Real-world building outline
    plan_footprint      GEOMETRY(Polygon),              -- 2D plan-space outline (campus CRS)
    total_floors        SMALLINT    NOT NULL DEFAULT 1 CHECK (total_floors >= 1),
    base_floor_level    SMALLINT    NOT NULL DEFAULT 0, -- Lowest floor index (e.g. -1 for basement)
    -- Entry point node IDs (populated once navigation graph is built)
    entrance_node_ids   UUID[]      NOT NULL DEFAULT '{}',
    is_accessible       BOOLEAN     NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    tags                TEXT[]      NOT NULL DEFAULT '{}',
    metadata            JSONB       NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE buildings IS
    'Physical building within a campus. Contains one or more floors.';
COMMENT ON COLUMN buildings.base_floor_level IS
    'The integer floor level of the lowest floor, e.g. -1 if there is a basement.';
COMMENT ON COLUMN buildings.entrance_node_ids IS
    'Array of navigation graph node UUIDs representing building entrance points.';

-- Per-campus unique building code
CREATE UNIQUE INDEX idx_buildings_campus_code ON buildings (campus_id, code);

-- Spatial indexes
CREATE INDEX idx_buildings_geo_footprint ON buildings USING GIST (geo_footprint);
CREATE INDEX idx_buildings_plan_footprint ON buildings USING GIST (plan_footprint);

-- Lookup
CREATE INDEX idx_buildings_campus_id ON buildings (campus_id);
CREATE INDEX idx_buildings_tags      ON buildings USING GIN (tags);

CREATE TRIGGER trg_buildings_updated_at
    BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
