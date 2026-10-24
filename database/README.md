# OmniCampus — Database Schema Reference

## Technology

- **PostgreSQL 15+** with **PostGIS 3.3+**
- Extensions: `postgis`, `uuid-ossp`, `pg_trgm`, `unaccent`

## Architecture Decision

> **This is a frontend-first (Vite + React + TypeScript) project. No existing database was replaced.**
> The `database/` module is additive — it defines the target PostgreSQL schema for the backend API (Phase 2).
> The frontend currently uses in-memory mock services that will be replaced by API calls in Phase 2.

## Entity Relationship

```
organizations
    └── campuses (multi-tenant: 1 org → many campuses)
            └── buildings
                    └── floors
                            └── objects  (via object_type_id → object_types)
                                    └── nav_nodes  (1:1 anchor)
nav_nodes ──edge──► nav_nodes  (via nav_edges)
objects / nav_edges / floors / buildings ──► access_rules
campuses / buildings / floors / objects ──► assets
```

## Migration Files

Run in order:

| File | Purpose |
|------|---------|
| `001_create_extensions.sql` | PostGIS, uuid-ossp, pg_trgm, unaccent |
| `002_create_organizations.sql` | Top-level tenant table |
| `003_create_campuses.sql` | Campus with geo center + JSONB settings |
| `004_create_buildings.sql` | Buildings with PostGIS footprint |
| `005_create_floors.sql` | Floors with affine map alignment |
| `006_create_object_types.sql` | Generic type registry (no per-type tables) |
| `007_create_objects.sql` | All spatial entities (rooms, lifts, stairs, POIs...) |
| `008_create_connections.sql` | Nav nodes + edges (routing graph topology) |
| `009_create_access_rules.sql` | Time/role-based access control |
| `010_create_assets.sql` | Floor plan images, photos, logos |
| `011_create_views.sql` | Convenience views for API queries |

## Running Migrations

```bash
# Requires psql and a running PostgreSQL + PostGIS instance
./database/run_migrations.sh postgresql://postgres:password@localhost:5432/omnicampus
```

Or apply files manually in numeric order:
```bash
psql -U postgres -d omnicampus -f database/migrations/001_create_extensions.sql
# ... repeat for 002 through 011
psql -U postgres -d omnicampus -f database/seeds/001_seed_demo_data.sql
psql -U postgres -d omnicampus -f database/verify_schema.sql
```

## Key Design Decisions

### 1. Generic Object + ObjectType (No Per-Type Tables)
All spatial entities — classrooms, labs, corridors, lifts, stairs, emergency exits, outdoor POIs — are rows in the single `objects` table. The `object_type_id` FK determines the category. Type-specific fields live in the `properties JSONB` column validated against `object_types.property_schema` (JSON Schema Draft-07).

**Why:** Adding a new object category (e.g. `prayer_room`, `ATM`, `bike_rack`) requires zero schema changes — just a new row in `object_types`.

### 2. Multilingual JSONB Names
All user-facing text columns (`name`, `description`, `closure_reason`) are `JSONB` storing `{ "en": "...", "es": "...", "ta": "...", "hi": "..." }`. The API returns the appropriate language based on the `Accept-Language` header.

### 3. PostGIS Geometry
- `geo_*` columns use **SRID 4326** (WGS84 lat/lng) for outdoor real-world coordinates
- `geometry` (no prefix) uses the campus internal CRS (`pixel`, `metric`, or `geographic`) for indoor plan coordinates
- Separate GIST indexes on both

### 4. Navigation Graph in DB
The routing engine builds an adjacency graph from `nav_nodes` and `nav_edges` at startup. Edges carry `weight` multipliers (stairs penalty, elevator wait, ramp preference) and a computed `time_seconds` column for efficient sorting.

### 5. Multi-Campus Isolation
Every entity below `organizations` carries both `campus_id` and its direct parent FK. This enables:
- Fast per-campus queries without joins up the hierarchy
- Cascade deletes (removing a campus removes all its entities)
- Row-level security policies (future: per-campus admin access)

## Indexes Summary

| Table | Index Type | Columns |
|-------|-----------|---------|
| organizations | UNIQUE | slug |
| campuses | UNIQUE | (organization_id, slug) |
| campuses | GIST | geo_center, geo_bounds |
| campuses | GIN/trgm | name::TEXT |
| buildings | UNIQUE | (campus_id, code) |
| buildings | GIST | geo_footprint, plan_footprint |
| floors | UNIQUE | (building_id, floor_number) |
| floors | GIST | geo_outline |
| object_types | UNIQUE | slug |
| objects | BTREE | campus_id, building_id, floor_id, object_type_id, status |
| objects | GIST | geometry, geo_geometry |
| objects | GIN/trgm | name::TEXT, code |
| objects | GIN | tags, properties |
| nav_nodes | BTREE | campus_id, building_id, floor_id, node_type |
| nav_nodes | GIST | geo_point |
| nav_edges | BTREE | campus_id, source_node_id, target_node_id, traversal_type |
| access_rules | BTREE | campus_id, object_id, edge_id, floor_id, building_id |
| assets | BTREE | campus_id, floor_id, object_id, asset_type |
