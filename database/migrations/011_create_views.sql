-- ============================================================
-- Migration: 011_create_views.sql
-- Purpose:   Convenience views for common API query patterns.
--            Views are not materialised — no stale data risk.
-- ============================================================

-- Full object detail with type info resolved
CREATE OR REPLACE VIEW v_objects_with_type AS
SELECT
    o.id,
    o.campus_id,
    o.building_id,
    o.floor_id,
    o.object_type_id,
    o.code,
    o.name,
    o.description,
    o.geometry,
    o.geometry_type,
    o.properties,
    o.tags,
    o.status,
    o.is_accessible,
    o.nav_node_id,
    o.metadata,
    o.created_at,
    o.updated_at,
    -- Object type fields
    ot.slug          AS type_slug,
    ot.category      AS type_category,
    ot.icon_name     AS type_icon,
    ot.default_color AS type_color,
    ot.is_navigable  AS type_is_navigable,
    ot.is_connector  AS type_is_connector
FROM objects o
JOIN object_types ot ON ot.id = o.object_type_id
WHERE o.status != 'demolished';

COMMENT ON VIEW v_objects_with_type IS
    'Joined view: objects + object_type fields. Excludes demolished objects.';

-- Active nav edges enriched with node coordinates
CREATE OR REPLACE VIEW v_nav_graph AS
SELECT
    e.id              AS edge_id,
    e.campus_id,
    e.source_node_id,
    e.target_node_id,
    e.traversal_type,
    e.direction,
    e.distance_meters,
    e.weight,
    e.time_seconds,
    e.is_walkable,
    e.is_accessible,
    e.is_active,
    e.from_floor_id,
    e.to_floor_id,
    -- Source node coords
    sn.x              AS source_x,
    sn.y              AS source_y,
    sn.floor_id       AS source_floor_id,
    sn.node_type      AS source_node_type,
    -- Target node coords
    tn.x              AS target_x,
    tn.y              AS target_y,
    tn.floor_id       AS target_floor_id,
    tn.node_type      AS target_node_type
FROM nav_edges e
JOIN nav_nodes sn ON sn.id = e.source_node_id
JOIN nav_nodes tn ON tn.id = e.target_node_id
WHERE e.is_active = TRUE
  AND sn.is_active = TRUE
  AND tn.is_active = TRUE;

COMMENT ON VIEW v_nav_graph IS
    'Active navigation graph edges enriched with source/target node coordinates.
     Used by the routing engine to build the adjacency graph per campus.';

-- Campus summary statistics
CREATE OR REPLACE VIEW v_campus_summary AS
SELECT
    c.id              AS campus_id,
    c.organization_id,
    c.slug,
    c.name,
    c.is_published,
    COUNT(DISTINCT b.id)   AS building_count,
    COUNT(DISTINCT f.id)   AS floor_count,
    COUNT(DISTINCT o.id)   AS object_count,
    COUNT(DISTINCT nn.id)  AS node_count,
    COUNT(DISTINCT ne.id)  AS edge_count
FROM campuses c
LEFT JOIN buildings b  ON b.campus_id = c.id
LEFT JOIN floors    f  ON f.campus_id = c.id
LEFT JOIN objects   o  ON o.campus_id = c.id AND o.status != 'demolished'
LEFT JOIN nav_nodes nn ON nn.campus_id = c.id
LEFT JOIN nav_edges ne ON ne.campus_id = c.id
WHERE c.is_active = TRUE
GROUP BY c.id, c.organization_id, c.slug, c.name, c.is_published;

COMMENT ON VIEW v_campus_summary IS
    'Per-campus entity counts for admin dashboard and workflow completeness checks.';
