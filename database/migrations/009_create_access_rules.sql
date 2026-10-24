-- ============================================================
-- Migration: 009_create_access_rules.sql
-- Purpose:   Time-based and role-based access control for
--            objects, edges, and entrances.
--            The routing engine checks active access rules
--            before including an object or edge in a route.
-- ============================================================

CREATE TYPE access_rule_target AS ENUM (
    'object',   -- Applies to a specific object (room, entrance, amenity)
    'edge',     -- Applies to a specific nav_edge (corridor, path section)
    'floor',    -- Applies to an entire floor
    'building'  -- Applies to an entire building
);

CREATE TYPE access_rule_type AS ENUM (
    'closure',          -- Permanently or temporarily closed
    'restricted',       -- Only accessible to specific user roles
    'time_restricted',  -- Accessible only during defined time windows
    'maintenance'       -- Closed for maintenance; routing should avoid
);

CREATE TABLE access_rules (
    id                  UUID                PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id           UUID                NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    -- What this rule applies to (exactly one of these will be non-null)
    target_type         access_rule_target  NOT NULL,
    object_id           UUID                REFERENCES objects(id)   ON DELETE CASCADE,
    edge_id             UUID                REFERENCES nav_edges(id) ON DELETE CASCADE,
    floor_id            UUID                REFERENCES floors(id)    ON DELETE CASCADE,
    building_id         UUID                REFERENCES buildings(id) ON DELETE CASCADE,
    rule_type           access_rule_type    NOT NULL DEFAULT 'closure',
    name                VARCHAR(120)        NOT NULL,
    description         TEXT,
    -- Time window constraints (NULL = always applies)
    valid_from          TIMESTAMPTZ,
    valid_until         TIMESTAMPTZ,
    -- Weekly schedule (null = all days)
    -- Array of day numbers: 0=Sunday, 1=Monday, ..., 6=Saturday
    active_days         SMALLINT[],
    -- Daily time window (null = all hours)
    open_time           TIME,
    close_time          TIME,
    -- Role-based restrictions (null = restricts all users)
    allowed_roles       TEXT[],
    -- e.g. ["staff", "faculty", "emergency"] — student users are blocked
    -- Routing engine behaviour
    is_routing_blocked  BOOLEAN             NOT NULL DEFAULT TRUE,
    -- ^ TRUE: routing engine will NOT route through this target
    -- ^ FALSE: accessible but UI shows a warning
    is_active           BOOLEAN             NOT NULL DEFAULT TRUE,
    -- Temporary closure reason for UI display
    closure_reason      JSONB,
    -- { "en": "Renovation work until Dec 2026", "ta": "புனரமைப்பு வேலைகள்" }
    metadata            JSONB               NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    -- Exactly one target must be set
    CONSTRAINT chk_access_rule_single_target CHECK (
        (CASE WHEN object_id   IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN edge_id     IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN floor_id    IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN building_id IS NOT NULL THEN 1 ELSE 0 END) = 1
    ),
    -- valid_from must precede valid_until if both are set
    CONSTRAINT chk_access_rule_date_order CHECK (
        valid_from IS NULL OR valid_until IS NULL OR valid_from < valid_until
    )
);

COMMENT ON TABLE access_rules IS
    'Time-based and role-based access control for navigation graph entities.
     The routing engine evaluates these rules at query time to exclude
     blocked objects, edges, floors, or buildings from route calculations.';
COMMENT ON COLUMN access_rules.is_routing_blocked IS
    'When TRUE, the routing engine will not traverse the target entity.
     When FALSE, the entity is still reachable but the UI shows a restriction notice.';
COMMENT ON COLUMN access_rules.active_days IS
    'Days of week when rule applies: 0=Sunday … 6=Saturday. NULL = every day.';

-- Lookup indexes
CREATE INDEX idx_access_rules_campus_id   ON access_rules (campus_id);
CREATE INDEX idx_access_rules_object_id   ON access_rules (object_id)   WHERE object_id   IS NOT NULL;
CREATE INDEX idx_access_rules_edge_id     ON access_rules (edge_id)     WHERE edge_id     IS NOT NULL;
CREATE INDEX idx_access_rules_floor_id    ON access_rules (floor_id)    WHERE floor_id    IS NOT NULL;
CREATE INDEX idx_access_rules_building_id ON access_rules (building_id) WHERE building_id IS NOT NULL;
CREATE INDEX idx_access_rules_is_active   ON access_rules (is_active);
CREATE INDEX idx_access_rules_valid_range ON access_rules (valid_from, valid_until);
CREATE INDEX idx_access_rules_rule_type   ON access_rules (rule_type);

CREATE TRIGGER trg_access_rules_updated_at
    BEFORE UPDATE ON access_rules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
