-- ============================================================
-- Migration: 007_create_objects.sql
-- Purpose:   Core generic spatial entity table.
--            All rooms, corridors, lifts, stairs, landmarks,
--            amenities, outdoor waypoints — everything is an Object.
--            Type-specific data lives in `properties` JSONB.
-- ============================================================

-- Status lifecycle for objects
CREATE TYPE object_status AS ENUM (
    'draft',        -- Created but not published
    'active',       -- Visible & navigable
    'inactive',     -- Exists but removed from routing/display
    'under_maintenance', -- Temporarily closed; routing engine avoids
    'demolished'    -- Permanently removed; kept for audit trail
);

-- Geometry representation type (how this object appears on the map)
CREATE TYPE geometry_representation AS ENUM (
    'point',        -- Single coordinate (POI pin, door, lift landing)
    'polyline',     -- Linear path (corridor, ramp, outdoor path)
    'polygon',      -- Area fill (room boundary, parking lot)
    'none'          -- Navigation node only — no visual representation
);

CREATE TABLE objects (
    id                  UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id           UUID                    NOT NULL REFERENCES campuses(id)   ON DELETE CASCADE,
    building_id         UUID                    REFERENCES buildings(id) ON DELETE CASCADE,
    floor_id            UUID                    REFERENCES floors(id)    ON DELETE CASCADE,
    object_type_id      UUID                    NOT NULL REFERENCES object_types(id),
    code                VARCHAR(50),                        -- Human-readable code e.g. "ROOM-101", "ELEV-A"
    name                JSONB                   NOT NULL,   -- Multilingual display name
    description         JSONB,                             -- Multilingual description
    -- Spatial representation in 2D plan coordinates (campus CRS)
    geometry            GEOMETRY,                          -- Point/LineString/Polygon in plan space
    geometry_type       geometry_representation NOT NULL DEFAULT 'point',
    -- Spatial representation in WGS84 (for outdoor objects)
    geo_geometry        GEOMETRY(Geometry, 4326),
    -- Navigation graph anchor
    nav_node_id         UUID,                              -- FK to connections.nodes after Phase 2
    -- Type-specific attributes (conforms to object_types.property_schema)
    properties          JSONB                   NOT NULL DEFAULT '{}',
    -- e.g. classroom: { "capacity": 40, "hasProjector": true, "occupant": "Dr. Smith" }
    -- e.g. elevator:  { "loadKg": 630, "servicesFloors": [0, 1, 2, 3] }
    -- e.g. restroom:  { "gender": "all", "isAccessible": true }
    tags                TEXT[]                  NOT NULL DEFAULT '{}',
    status              object_status           NOT NULL DEFAULT 'draft',
    is_accessible       BOOLEAN                 NOT NULL DEFAULT TRUE,
    sort_order          INTEGER                 NOT NULL DEFAULT 0,
    metadata            JSONB                   NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    -- An object on a floor must belong to the same campus
    CONSTRAINT chk_object_campus_consistency
        CHECK (
            (floor_id IS NULL) OR
            (building_id IS NOT NULL AND floor_id IS NOT NULL)
        )
);

COMMENT ON TABLE objects IS
    'Generic spatial entity. ALL map elements (rooms, corridors, lifts, stairs, landmarks,
     entrances, outdoor POIs, virtual waypoints) are rows in this table.
     The object_type_id determines the category and property schema.
     Do NOT create separate tables per object category.';
COMMENT ON COLUMN objects.properties IS
    'JSONB property bag validated against object_types.property_schema.
     Holds type-specific fields: capacity, occupant, accessible, gender, etc.';
COMMENT ON COLUMN objects.geometry IS
    'PostGIS geometry in the campus internal coordinate reference system.
     Use ST_AsGeoJSON / ST_GeomFromGeoJSON for interchange.';
COMMENT ON COLUMN objects.nav_node_id IS
    'Reference to the navigation graph node for this object.
     Populated during graph-build phase. Used by the routing engine as target/source.';

-- ---- Core lookup indexes ----
CREATE INDEX idx_objects_campus_id      ON objects (campus_id);
CREATE INDEX idx_objects_building_id    ON objects (building_id);
CREATE INDEX idx_objects_floor_id       ON objects (floor_id);
CREATE INDEX idx_objects_object_type    ON objects (object_type_id);
CREATE INDEX idx_objects_status         ON objects (status);
CREATE INDEX idx_objects_is_accessible  ON objects (is_accessible);

-- ---- Spatial indexes ----
CREATE INDEX idx_objects_geometry     ON objects USING GIST (geometry);
CREATE INDEX idx_objects_geo_geometry ON objects USING GIST (geo_geometry);

-- ---- Full-text / trigram name search ----
CREATE INDEX idx_objects_name_trgm    ON objects USING GIN ((name::TEXT) gin_trgm_ops);
CREATE INDEX idx_objects_code_trgm    ON objects USING GIN (code gin_trgm_ops);

-- ---- Tag filtering ----
CREATE INDEX idx_objects_tags         ON objects USING GIN (tags);

-- ---- Properties JSONB index (for type-specific property queries) ----
CREATE INDEX idx_objects_properties   ON objects USING GIN (properties);

-- Unique code per campus (optional; campus-scoped room codes)
CREATE UNIQUE INDEX idx_objects_campus_code
    ON objects (campus_id, code)
    WHERE code IS NOT NULL;

CREATE TRIGGER trg_objects_updated_at
    BEFORE UPDATE ON objects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
