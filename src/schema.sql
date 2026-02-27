-- D1 Schema for CFTA Dance Recital App
-- Multi-instance support via recital_instance_id FK

--------------------------------------------------------------------------------
-- Recital Instances (one per annual dance recital)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS recital_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  config TEXT -- JSON: every-show dances, group structure, show descriptions
);

--------------------------------------------------------------------------------
-- Core data tables (all scoped by recital_instance_id)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dances (
  dance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  csv_dance_id INTEGER, -- original ID from the CSV for cross-referencing
  dance_style TEXT NOT NULL,
  dance_name TEXT,
  choreography TEXT,
  song TEXT,
  artist TEXT
);
CREATE INDEX IF NOT EXISTS idx_dances_instance ON dances(recital_instance_id);

CREATE TABLE IF NOT EXISTS dancers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  dancer_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  is_teacher INTEGER CHECK (is_teacher IN (0, 1)) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dancers_instance ON dancers(recital_instance_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dancers_name_instance ON dancers(dancer_name, recital_instance_id);

CREATE TABLE IF NOT EXISTS classes (
  class_id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  csv_class_id INTEGER, -- original ID from the CSV
  teacher TEXT NOT NULL,
  class_name TEXT NOT NULL,
  class_time TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_classes_instance ON classes(recital_instance_id);

CREATE TABLE IF NOT EXISTS dancer_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  class_id INTEGER NOT NULL REFERENCES classes(class_id),
  dancer_name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dancer_classes_instance ON dancer_classes(recital_instance_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dancer_class_unique ON dancer_classes(dancer_name, class_id);

CREATE TABLE IF NOT EXISTS class_dances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  class_id INTEGER NOT NULL REFERENCES classes(class_id),
  dance_id INTEGER NOT NULL REFERENCES dances(dance_id)
);
CREATE INDEX IF NOT EXISTS idx_class_dances_instance ON class_dances(recital_instance_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_class_dance_unique ON class_dances(class_id, dance_id);

CREATE TABLE IF NOT EXISTS recital_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  recital_group TEXT NOT NULL,
  show_order TEXT NOT NULL -- JSON array of dance IDs / "PRE"
);
CREATE INDEX IF NOT EXISTS idx_recital_groups_instance ON recital_groups(recital_instance_id);

CREATE TABLE IF NOT EXISTS recitals (
  recital_id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  csv_recital_id INTEGER, -- original 1/2/3 from CSV
  group_order TEXT, -- JSON array of group names, e.g. '["A","B"]'
  recital_description TEXT NOT NULL,
  recital_time TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recitals_instance ON recitals(recital_instance_id);

--------------------------------------------------------------------------------
-- Server-side state (show order + bookmarks)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS saved_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  group_orders TEXT NOT NULL, -- JSON: {"A": [...], "B": [...], "C": [...]}
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_orders_instance ON saved_orders(recital_instance_id);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  name TEXT NOT NULL,
  group_orders TEXT NOT NULL,
  saved_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_instance ON bookmarks(recital_instance_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_name_instance ON bookmarks(name, recital_instance_id);
