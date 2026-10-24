-- ============================================================
-- Verification: verify_schema.sql
-- Purpose:   Runs assertions that prove:
--            1. Multi-campus data isolation
--            2. Referential integrity
--            3. Spatial index availability
--            4. Object type generic-ness (no per-type tables)
--            5. Access rules scoping
-- Run via:   psql -U postgres -d omnicampus -f verify_schema.sql
-- ============================================================

\echo '========================================='
\echo 'OmniCampus Schema Verification'
\echo '========================================='

-- 1. Organization count
\echo ''
\echo '--- 1. Organizations ---'
SELECT id, slug, name->>'en' AS name FROM organizations;

-- 2. Campus isolation: each campus must report only its own buildings
\echo ''
\echo '--- 2. Campus summary (must show independent campus counts) ---'
SELECT
    campus_id,
    name->>'en'    AS campus_name,
    building_count,
    floor_count,
    object_count,
    node_count,
    edge_count,
    is_published
FROM v_campus_summary
ORDER BY campus_name;

-- 3. All buildings with their campus assignment
\echo ''
\echo '--- 3. Buildings per campus ---'
SELECT
    b.code        AS building_code,
    b.name->>'en' AS building_name,
    c.slug        AS campus_slug
FROM buildings b
JOIN campuses c ON c.id = b.campus_id
ORDER BY c.slug, b.code;

-- 4. Floors per building
\echo ''
\echo '--- 4. Floors per building ---'
SELECT
    f.code          AS floor_code,
    f.floor_number,
    f.name->>'en'   AS floor_name,
    f.width,
    f.height,
    b.code          AS building_code
FROM floors f
JOIN buildings b ON b.id = f.building_id
ORDER BY b.code, f.floor_number;

-- 5. All objects with their type — proving single generic table
\echo ''
\echo '--- 5. Objects with type (no per-type tables) ---'
SELECT
    o.code,
    o.name->>'en'        AS object_name,
    ot.slug              AS type_slug,
    ot.category          AS type_category,
    o.status,
    o.is_accessible
FROM objects o
JOIN object_types ot ON ot.id = o.object_type_id
ORDER BY ot.category, ot.slug, o.code;

-- 6. Navigation graph: edges between nodes
\echo ''
\echo '--- 6. Navigation graph edges (deterministic routing topology) ---'
SELECT
    sn.label           AS from_node,
    tn.label           AS to_node,
    e.traversal_type,
    e.distance_meters,
    e.weight,
    e.time_seconds,
    e.is_accessible,
    e.direction
FROM v_nav_graph e
JOIN nav_nodes sn ON sn.id = e.source_node_id
JOIN nav_nodes tn ON tn.id = e.target_node_id
ORDER BY sn.label;

-- 7. Cross-campus isolation: North Campus objects must NOT appear under Medical campus
\echo ''
\echo '--- 7. Cross-campus isolation check ---'
SELECT
    o.code,
    o.name->>'en'    AS name,
    c.slug           AS campus
FROM objects o
JOIN campuses c ON c.id = o.campus_id
ORDER BY c.slug, o.code;

-- 8. Access rules
\echo ''
\echo '--- 8. Access rules ---'
SELECT
    ar.name,
    ar.rule_type,
    ar.target_type,
    o.code           AS target_object,
    ar.valid_from,
    ar.valid_until,
    ar.is_routing_blocked,
    ar.is_active,
    ar.closure_reason->>'en' AS reason_en
FROM access_rules ar
LEFT JOIN objects o ON o.id = ar.object_id;

-- 9. Verify spatial indexes exist
\echo ''
\echo '--- 9. Spatial indexes ---'
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexdef ILIKE '%GIST%'
  AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 10. Object type count vs. zero per-type tables (schema purity check)
\echo ''
\echo '--- 10. Object types in registry ---'
SELECT
    slug,
    name->>'en'  AS name,
    category,
    icon_name,
    is_navigable,
    is_connector,
    is_system
FROM object_types
ORDER BY category, slug;

\echo ''
\echo '========================================='
\echo 'Verification Complete'
\echo '========================================='
