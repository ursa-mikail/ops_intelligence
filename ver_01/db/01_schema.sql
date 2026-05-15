-- OPS INTELLIGENCE PLATFORM — SCHEMA

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  environment TEXT NOT NULL,
  region TEXT NOT NULL,
  owner TEXT NOT NULL,
  team TEXT NOT NULL,
  status TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assets_name_trgm ON assets USING GIN (name gin_trgm_ops);
CREATE INDEX idx_assets_tags ON assets USING GIN (tags);

CREATE TABLE vulnerabilities (
  id SERIAL PRIMARY KEY,
  cve_id TEXT UNIQUE NOT NULL,
  asset_id INT REFERENCES assets(id),
  severity TEXT NOT NULL,
  cvss_score NUMERIC(4,1),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_component TEXT NOT NULL,
  resolution TEXT NOT NULL,
  status TEXT NOT NULL,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE incidents (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id),
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency INT DEFAULT 1,
  intensity NUMERIC(3,1),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT FALSE,
  mttr_minutes INT,
  impact TEXT,
  root_cause TEXT
);

CREATE TABLE system_drifts (
  id SERIAL PRIMARY KEY,
  asset_id INT REFERENCES assets(id),
  drift_type TEXT NOT NULL,
  component TEXT NOT NULL,
  expected_value TEXT NOT NULL,
  actual_value TEXT NOT NULL,
  severity TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  change_count INT DEFAULT 1
);

CREATE TABLE cost_records (
  id SERIAL PRIMARY KEY,
  period DATE NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  provider TEXT,
  resource_id TEXT,
  tags JSONB DEFAULT '{}'
);

CREATE TABLE compliance_controls (
  id SERIAL PRIMARY KEY,
  framework TEXT NOT NULL,
  control_id TEXT NOT NULL,
  control_name TEXT NOT NULL,
  status TEXT NOT NULL,
  score NUMERIC(5,2),
  last_assessed TIMESTAMPTZ,
  remediation TEXT,
  priority TEXT
);

CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  team TEXT NOT NULL,
  incidents_handled INT DEFAULT 0,
  avg_mttr_minutes NUMERIC(8,2),
  on_call_hours INT DEFAULT 0,
  satisfaction_score NUMERIC(3,1),
  certifications TEXT[] DEFAULT '{}',
  availability TEXT DEFAULT 'active'
);

CREATE TABLE risks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  probability TEXT NOT NULL,
  impact TEXT NOT NULL,
  risk_score INT,
  status TEXT NOT NULL,
  owner TEXT,
  mitigation TEXT,
  due_date DATE,
  blockers TEXT[] DEFAULT '{}'
);

CREATE TABLE deliverables (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  assigned_team TEXT,
  target_date DATE,
  completion_pct INT DEFAULT 0,
  dependencies TEXT[] DEFAULT '{}',
  notes TEXT
);
