-- ============================================================
-- Migration: 006_create_object_types.sql
-- Purpose:   Generic type registry for all spatial entities.
--            Rooms, corridors, lifts, stairs, POIs, landmarks —
--            all are Objects with a specific ObjectType.
--            NEVER create separate tables per object category.
-- ============================================================

-- Category enum for first-level grouping in UI filters
CREATE TYPE object_category AS ENUM (
    'room',         -- Classrooms, labs, offices, auditoriums
    'amenity',      -- Restrooms, cafeterias, ATMs, water fountains
    'transit',      -- Stairs, elevators, escalators, ramps, corridors
    'entrance',     -- Doors, gates, main entrances, emergency exits
    'outdoor',      -- Parking, open spaces, sports fields, bus stops
    'infrastructure',-- Utility rooms, server rooms, mechanical
    'virtual'       -- Navigation-only waypoints invisible to end users
);

CREATE TABLE object_types (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug                VARCHAR(60)     NOT NULL UNIQUE,    -- e.g. "classroom", "elevator", "restroom"
    name                JSONB           NOT NULL,           -- Multilingual display name
    description         JSONB,
    category            object_category NOT NULL,
    icon_name           VARCHAR(80)     NOT NULL DEFAULT 'MapPin',  -- Lucide icon key
    default_color       VARCHAR(7)      NOT NULL DEFAULT '#6366f1', -- Hex color
    -- JSON Schema defining the allowed properties for this type
    -- Objects of this type must conform to this schema in their `properties` JSONB column
    property_schema     JSONB           NOT NULL DEFAULT '{}',
    -- e.g. { "type": "object", "properties": { "capacity": { "type": "integer" }, "occupant": { "type": "string" } } }
    is_navigable        BOOLEAN         NOT NULL DEFAULT TRUE,  -- Can be a route target
    is_barrier          BOOLEAN         NOT NULL DEFAULT FALSE, -- Physically blocks movement
    is_connector        BOOLEAN         NOT NULL DEFAULT FALSE, -- Connects floors/buildings (elevator, stairs)
    is_system           BOOLEAN         NOT NULL DEFAULT FALSE, -- Built-in type; cannot be deleted
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    sort_order          SMALLINT        NOT NULL DEFAULT 100,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE object_types IS
    'Generic object type registry. All spatial entities are Objects with a type here.
     Do NOT add separate tables for rooms, stairs, elevators, etc.';
COMMENT ON COLUMN object_types.property_schema IS
    'JSON Schema (Draft-07) defining which properties objects of this type may have.
     Used for validation in the admin editor and API layer.';
COMMENT ON COLUMN object_types.is_connector IS
    'TRUE for types that link floors or buildings (elevator, stairs, escalator, ramp).
     The routing engine uses this flag to handle multi-floor graph transitions.';

-- Fast slug lookup (used in API routes)
CREATE UNIQUE INDEX idx_object_types_slug ON object_types (slug);

-- Filter by category in UI
CREATE INDEX idx_object_types_category ON object_types (category);
CREATE INDEX idx_object_types_is_navigable ON object_types (is_navigable);

CREATE TRIGGER trg_object_types_updated_at
    BEFORE UPDATE ON object_types
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
