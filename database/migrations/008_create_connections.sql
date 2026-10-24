-- ============================================================
-- Migration: 008_create_connections.sql
-- Purpose:   Navigation graph topology.
--            Nodes = spatial waypoints (can alias an Object).
--            Edges = walkable / traversable connections.
--            Supports: multi-floor, multi-building, outdoor-indoor.
-- ============================================================

-- Node type drives routing engine behaviour
CREATE TYPE node_type AS ENUM (
    'waypoint',         -- Generic hallway / path junction
    'door',             -- Room or building entrance door
    'stairs',           -- Stair landing (one per floor)
    'elevator',         -- Elevator landing (one per floor)
    'escalator',        -- Escalator landing
    'ramp',             -- Accessible ramp node
    'outdoor_junction', -- Outdoor path intersection
    'virtual'           -- Invisible routing helper node
);

-- Directed / undirected edge directionality
CREATE TYPE edge_direction AS ENUM (
    'bidirectional',    -- Traversable in both directions
    'forward_only',     -- Source → Target only (e.g. one-way corridor, down-only escalator)
    'backward_only'     -- Target → Source only
);

-- Edge traversal type (used to select appropriate route option)
CREATE TYPE edge_traversal_type AS ENUM (
    'walkway',
    'stairs_up',
    'stairs_down',
    'elevator',
    'escalator',
    'ramp',
    'outdoor_path',
    'vehicle_path'
);

-- ---- Navigation Nodes ----
CREATE TABLE nav_nodes (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id           UUID            NOT NULL REFERENCES campuses(id)   ON DELETE CASCADE,
    building_id         UUID            REFERENCES buildings(id) ON DELETE CASCADE,
    floor_id            UUID            REFERENCES floors(id)    ON DELETE CASCADE,
    object_id           UUID            REFERENCES objects(id)   ON DELETE SET NULL,
    -- ^ Optional: if this node is the navigation anchor for a named object
    node_type           node_type       NOT NULL DEFAULT 'waypoint',
    label               VARCHAR(120),   -- Human-readable debug label
    -- 2D coordinates in campus plan space
    x                   NUMERIC(10,4)   NOT NULL,
    y                   NUMERIC(10,4)   NOT NULL,
    -- Optional WGS84 for outdoor nodes
    geo_point           GEOMETRY(Point, 4326),
    is_accessible       BOOLEAN         NOT NULL DEFAULT TRUE,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    metadata            JSONB           NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE nav_nodes IS
    'Navigation graph nodes. Each node is a traversable waypoint.
     Nodes can optionally reference an Object (room entrance, elevator landing, etc.).';

-- Lookup
CREATE INDEX idx_nav_nodes_campus_id   ON nav_nodes (campus_id);
CREATE INDEX idx_nav_nodes_building_id ON nav_nodes (building_id);
CREATE INDEX idx_nav_nodes_floor_id    ON nav_nodes (floor_id);
CREATE INDEX idx_nav_nodes_object_id   ON nav_nodes (object_id);
CREATE INDEX idx_nav_nodes_node_type   ON nav_nodes (node_type);

-- Spatial index for nearest-node queries
CREATE INDEX idx_nav_nodes_geo_point ON nav_nodes USING GIST (geo_point);

CREATE TRIGGER trg_nav_nodes_updated_at
    BEFORE UPDATE ON nav_nodes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Back-fill: update objects.nav_node_id FK now that nav_nodes exists
ALTER TABLE objects
    ADD CONSTRAINT fk_objects_nav_node
        FOREIGN KEY (nav_node_id) REFERENCES nav_nodes(id) ON DELETE SET NULL;

-- ---- Navigation Edges ----
CREATE TABLE nav_edges (
    id                  UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
    campus_id           UUID                    NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
    source_node_id      UUID                    NOT NULL REFERENCES nav_nodes(id) ON DELETE CASCADE,
    target_node_id      UUID                    NOT NULL REFERENCES nav_nodes(id) ON DELETE CASCADE,
    traversal_type      edge_traversal_type     NOT NULL DEFAULT 'walkway',
    direction           edge_direction          NOT NULL DEFAULT 'bidirectional',
    -- Routing weights
    distance_meters     NUMERIC(8,3)            NOT NULL CHECK (distance_meters >= 0),
    weight              NUMERIC(6,3)            NOT NULL DEFAULT 1.0 CHECK (weight > 0),
    -- ^ Multiplier: stairs = 2.0, elevator = 1.5, preferred ramp = 0.9
    time_seconds        NUMERIC(8,2)            GENERATED ALWAYS AS (distance_meters / 1.2 * weight) STORED,
    -- ^ Estimated traversal time at 1.2 m/s walking speed × weight multiplier
    -- Access flags
    is_walkable         BOOLEAN                 NOT NULL DEFAULT TRUE,
    is_vehicle_accessible BOOLEAN               NOT NULL DEFAULT FALSE,
    is_accessible       BOOLEAN                 NOT NULL DEFAULT TRUE, -- Wheelchair accessible
    is_active           BOOLEAN                 NOT NULL DEFAULT TRUE,
    -- Floor / building transition metadata
    from_floor_id       UUID                    REFERENCES floors(id) ON DELETE SET NULL,
    to_floor_id         UUID                    REFERENCES floors(id) ON DELETE SET NULL,
    -- ^ Populated for stairs/elevator edges that cross floor boundaries
    properties          JSONB                   NOT NULL DEFAULT '{}',
    -- e.g. { "label": "Staircase A — Floors 0-3", "requiresKeycard": false }
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    -- Prevent duplicate edges in the same direction
    CONSTRAINT uq_nav_edge_direction
        UNIQUE (source_node_id, target_node_id)
);

COMMENT ON TABLE nav_edges IS
    'Navigation graph edges connecting pairs of nav_nodes.
     The routing engine loads these to build an adjacency graph per campus.
     Edges carry distance, weight multiplier, accessibility, and traversal type.';
COMMENT ON COLUMN nav_edges.weight IS
    'Penalty multiplier applied on top of distance_meters during pathfinding.
     1.0 = normal walkway. 2.0 = stairs penalty. 1.5 = elevator wait.
     Set lower (0.8) for a preferred accessible ramp.';
COMMENT ON COLUMN nav_edges.time_seconds IS
    'Computed: distance_meters / 1.2 m/s * weight. Stored for efficient sorting.';

-- Lookup
CREATE INDEX idx_nav_edges_campus_id      ON nav_edges (campus_id);
CREATE INDEX idx_nav_edges_source_node    ON nav_edges (source_node_id);
CREATE INDEX idx_nav_edges_target_node    ON nav_edges (target_node_id);
CREATE INDEX idx_nav_edges_traversal_type ON nav_edges (traversal_type);
CREATE INDEX idx_nav_edges_accessible     ON nav_edges (is_accessible);
CREATE INDEX idx_nav_edges_floor_pair     ON nav_edges (from_floor_id, to_floor_id);

CREATE TRIGGER trg_nav_edges_updated_at
    BEFORE UPDATE ON nav_edges
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
