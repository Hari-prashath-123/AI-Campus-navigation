-- ============================================================
-- Migration: 002_create_organizations.sql
-- Purpose:   Top-level tenant entity. Every campus belongs to
--            exactly one organization. Enables multi-tenancy.
-- ============================================================

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            VARCHAR(80)  NOT NULL UNIQUE,  -- URL-safe identifier
    name            JSONB        NOT NULL,          -- { "en": "...", "es": "...", ... }
    description     JSONB,
    logo_url        TEXT,
    website_url     TEXT,
    contact_email   VARCHAR(255),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    metadata        JSONB        NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS
    'Top-level tenant. Universities, hospital groups, airport authorities etc.';
COMMENT ON COLUMN organizations.name IS
    'Multilingual JSONB: { "en": "Global Institute", "es": "Instituto Global" }';

-- Index for slug-based lookups (common API pattern)
CREATE UNIQUE INDEX idx_organizations_slug ON organizations (slug);

-- Partial index: only active organizations for tenant resolution
CREATE INDEX idx_organizations_active ON organizations (is_active) WHERE is_active = TRUE;

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
