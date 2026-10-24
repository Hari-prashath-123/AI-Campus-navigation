-- ============================================================
-- Migration: 005_create_floors.sql
-- Purpose:   Individual floors within a building. Each floor
--            has its own 2D plan and navigation graph partition.
-- ============================================================

CREATE TABLE floors (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    building_id         UUID        NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    campus_id           UUID        NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    code                VARCHAR(20) NOT NULL,           -- e.g. "FL-G", "FL-01", "FL-B1"
    name                JSONB       NOT NULL,           -- Multilingual label
    floor_number        SMALLINT    NOT NULL,           -- -1 = basement, 0 = ground, 1 = first, etc.
    -- Floor plan dimensions in the campus coordinate system units
    width               NUMERIC(10,3) NOT NULL CHECK (width > 0),
    height              NUMERIC(10,3) NOT NULL CHECK (height > 0),
    -- Optional: real-world floor outline (for outdoor-to-indoor stitching)
    geo_outline         GEOMETRY(Polygon, 4326),
    -- Floor plan image/SVG reference
    plan_image_url      TEXT,
    plan_svg_url        TEXT,
    -- Affine transform to align the floor plan image onto the map canvas
    map_settings        JSONB       NOT NULL DEFAULT '{}',
    -- e.g. { "offsetX": 0, "offsetY": 0, "scaleX": 1.0, "scaleY": 1.0, "rotation": 0 }
    is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
    metadata            JSONB       NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (building_id, floor_number)
);

COMMENT ON TABLE floors IS
    'A single floor/level within a building. Source of truth for 2D plan dimensions and map transform.';
COMMENT ON COLUMN floors.floor_number IS
    'Integer level: -1 = basement, 0 = ground floor, 1 = first floor, etc.';
COMMENT ON COLUMN floors.map_settings IS
    'Affine transform for overlaying plan_image_url onto the canvas: offsetX, offsetY, scaleX, scaleY, rotation.';

-- Unique floor number per building
CREATE UNIQUE INDEX idx_floors_building_floor_number ON floors (building_id, floor_number);

-- Lookup indexes
CREATE INDEX idx_floors_building_id ON floors (building_id);
CREATE INDEX idx_floors_campus_id   ON floors (campus_id);
CREATE INDEX idx_floors_geo_outline ON floors USING GIST (geo_outline);

CREATE TRIGGER trg_floors_updated_at
    BEFORE UPDATE ON floors
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
