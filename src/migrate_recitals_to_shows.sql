-- Migration: Rename recitals table → shows
-- Run against local wrangler D1 and remote D1:
--   bunx wrangler d1 execute cfta-dance-recital-2026 --local --file=src/migrate_recitals_to_shows.sql
--   bunx wrangler d1 execute cfta-dance-recital-2026 --file=src/migrate_recitals_to_shows.sql

-- 1. Create the new shows table
CREATE TABLE IF NOT EXISTS shows (
  show_id INTEGER PRIMARY KEY AUTOINCREMENT,
  recital_instance_id INTEGER NOT NULL REFERENCES recital_instances(id),
  csv_show_id INTEGER,
  group_order TEXT,
  show_description TEXT NOT NULL,
  show_time TEXT NOT NULL
);

-- 2. Copy data from recitals → shows
INSERT INTO shows (show_id, recital_instance_id, csv_show_id, group_order, show_description, show_time)
SELECT recital_id, recital_instance_id, csv_recital_id, group_order, recital_description, recital_time
  FROM recitals;

-- 3. Drop the old table
DROP TABLE IF EXISTS recitals;

-- 4. Create the index on the new table
CREATE INDEX IF NOT EXISTS idx_shows_instance ON shows(recital_instance_id);
