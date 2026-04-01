CREATE TABLE IF NOT EXISTS minibo_brands (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS minibo_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  unit TEXT NOT NULL,
  conversion_factor NUMERIC(12,4) NOT NULL,
  brand_code TEXT NOT NULL REFERENCES minibo_brands(code),
  status TEXT NOT NULL,
  sub_group TEXT NOT NULL,
  main_group TEXT NOT NULL,
  custom_group TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS minibo_shifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  hours_count INTEGER NOT NULL,
  allowed_brand_codes JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS minibo_report_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT NOT NULL,
  filter_status TEXT,
  brand_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS minibo_required_rows (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  order_state TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  required_qty NUMERIC(12,4) NOT NULL,
  actual_qty NUMERIC(12,4) NOT NULL,
  warehouse_name TEXT NOT NULL,
  comment TEXT
);

CREATE TABLE IF NOT EXISTS minibo_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS minibo_sessions (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL REFERENCES minibo_shifts(id),
  brand_code TEXT NOT NULL REFERENCES minibo_brands(code),
  report_type TEXT NOT NULL,
  session_date DATE NOT NULL,
  started_by TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  approvers JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS minibo_session_rows (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES minibo_sessions(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES minibo_products(id),
  quantity_cartons NUMERIC(12,4) NOT NULL DEFAULT 0,
  quantity_kg NUMERIC(12,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS minibo_notes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES minibo_sessions(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES minibo_products(id),
  quantity_kg NUMERIC(12,4),
  note_time TEXT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS minibo_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES minibo_sessions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES minibo_products(id),
  quantity_cartons NUMERIC(12,4) NOT NULL,
  quantity_kg NUMERIC(12,4) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL
);
