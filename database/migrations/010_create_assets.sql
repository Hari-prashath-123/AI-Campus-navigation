-- ============================================================
-- Migration: 010_create_assets.sql
-- Purpose:   Images and binary assets associated with
--            campuses, buildings, floors, or objects.
--            Stored as metadata references (URL / CDN path);
--            actual binary storage is in S3/CDN/local FS.
-- ============================================================

CREATE TYPE asset_type AS ENUM (
    'floor_plan_image',  -- Raster floorplan (PNG/JPG)
    'floor_plan_svg',    -- Vector floorplan (SVG)
    'building_photo',    -- Photo of building exterior
    'object_photo',      -- Photo of room/POI
    'campus_map',        -- Full campus map overview image
    'logo',              -- Organization or campus logo
    'document',          -- PDF / document asset
    'icon'               -- Custom icon for object type
);

CREATE TABLE assets (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id           UUID            NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    asset_type          asset_type      NOT NULL,
    -- Polymorphic parent reference (at most one set)
    organization_id     UUID            REFERENCES organizations(id) ON DELETE CASCADE,
    building_id         UUID            REFERENCES buildings(id)     ON DELETE CASCADE,
    floor_id            UUID            REFERENCES floors(id)        ON DELETE CASCADE,
    object_id           UUID            REFERENCES objects(id)       ON DELETE CASCADE,
    object_type_id      UUID            REFERENCES object_types(id)  ON DELETE CASCADE,
    -- Asset metadata
    file_name           VARCHAR(255)    NOT NULL,
    file_url            TEXT            NOT NULL,   -- CDN / S3 / local URL
    file_size_bytes     BIGINT,
    mime_type           VARCHAR(80),
    width_px            INTEGER,
    height_px           INTEGER,
    -- For floor plan images: affine alignment onto the 2D map canvas
    map_alignment       JSONB           NOT NULL DEFAULT '{}',
    -- e.g. { "offsetX": 10.5, "offsetY": 0.0, "scaleX": 1.02, "scaleY": 1.0, "rotation": 0.5 }
    alt_text            JSONB,         -- Multilingual alt text for accessibility
    is_primary          BOOLEAN         NOT NULL DEFAULT FALSE,
    sort_order          SMALLINT        NOT NULL DEFAULT 0,
    metadata            JSONB           NOT NULL DEFAULT '{}',
    uploaded_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE assets IS
    'Image and file asset registry. References to binary files stored externally (CDN/S3).
     Associated polymorphically with campus, building, floor, object, or object_type.';
COMMENT ON COLUMN assets.map_alignment IS
    'Affine transform parameters for overlaying a floor_plan_image onto the 2D canvas.
     Applied by the map renderer to correctly register the image with nav nodes.';

-- Lookup indexes
CREATE INDEX idx_assets_campus_id      ON assets (campus_id);
CREATE INDEX idx_assets_building_id    ON assets (building_id)    WHERE building_id    IS NOT NULL;
CREATE INDEX idx_assets_floor_id       ON assets (floor_id)       WHERE floor_id       IS NOT NULL;
CREATE INDEX idx_assets_object_id      ON assets (object_id)      WHERE object_id      IS NOT NULL;
CREATE INDEX idx_assets_object_type_id ON assets (object_type_id) WHERE object_type_id IS NOT NULL;
CREATE INDEX idx_assets_asset_type     ON assets (asset_type);
CREATE INDEX idx_assets_is_primary     ON assets (is_primary) WHERE is_primary = TRUE;

CREATE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
