#!/usr/bin/env bash
# =============================================================
# run_migrations.sh
# Usage: ./database/run_migrations.sh [DB_URL]
# Example: ./database/run_migrations.sh postgresql://postgres:password@localhost:5432/omnicampus
# =============================================================
set -euo pipefail

DB_URL="${1:-postgresql://postgres:postgres@localhost:5432/omnicampus}"
MIGRATIONS_DIR="$(dirname "$0")/migrations"
SEEDS_DIR="$(dirname "$0")/seeds"

echo ""
echo "======================================"
echo "  OmniCampus DB Migration Runner"
echo "======================================"
echo "  Target: $DB_URL"
echo ""

# Create database if it doesn't exist (ignores error if already exists)
DB_NAME="${DB_URL##*/}"
echo "→ Ensuring database '$DB_NAME' exists..."
psql "${DB_URL%/$DB_NAME}/postgres" \
    -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || echo "  (database already exists, continuing)"

echo ""
echo "→ Running migrations..."

for file in "$MIGRATIONS_DIR"/*.sql; do
    echo "  ✓ $(basename "$file")"
    psql "$DB_URL" -f "$file"
done

echo ""
echo "→ Running seed data..."

for file in "$SEEDS_DIR"/*.sql; do
    echo "  ✓ $(basename "$file")"
    psql "$DB_URL" -f "$file"
done

echo ""
echo "→ Running schema verification..."
psql "$DB_URL" -f "$(dirname "$0")/verify_schema.sql"

echo ""
echo "======================================"
echo "  Migration complete!"
echo "======================================"
