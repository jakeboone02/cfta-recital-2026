CREATE TABLE dances (
  dance_id int PRIMARY KEY,
  recital_group text check (recital_group IN ('SpecTAPular', 'Hip Hop', 'X', 'PREDANCE')) null,
  dance_style text check (dance_style IN ('Ballet', 'Hip Hop', 'Modern/Lyrical', 'Jazz', 'Musical Theater', 'Tap')) not null,
  dance_name text,
  choreography text,
  song text,
  artist text
);

CREATE TABLE dancers (
  dancer_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  first_name text not null,
  last_name text not null
);

CREATE UNIQUE INDEX dancers_name ON dancers (dancer_name);

CREATE TABLE classes (
  class_id int PRIMARY KEY,
  teacher text not null,
  class_name text not null,
  class_time text not null
);

CREATE TABLE dancer_classes (
  -- TODO: use dancer_id instead of dancer_name
  dancer_id int,
  class_id int not null,
  dancer_name text not null
);

CREATE UNIQUE INDEX dancer_class ON dancer_classes (dancer_name, class_id);

CREATE TABLE class_dances (
  class_id int not null,
  dance_id int not null
);

CREATE UNIQUE INDEX class_dance ON class_dances (class_id, dance_id);

-- CREATE TABLE recital_group_orders (
--   recital_id text check (recital_id IN ('A', 'B', 'C')) null,
--   dance_id int not null,
--   follows_dance_id int
-- );

CREATE TABLE recitals (
  recital_id int PRIMARY KEY check (recital_id IN (1, 2, 3)),
  recital_group_part_1 int check (recital_group_part_1 IN ('A', 'B', 'C')) null,
  recital_group_part_2 int check (recital_group_part_2 IN ('A', 'B', 'C')) null,
  recital_description text not null
);

--------------------------------------------------------------------------------
-- Views
--------------------------------------------------------------------------------

-- CREATE VIEW IF NOT EXISTS participants AS
--  SELECT
--    d.dance_id,
--    d.recital_group,
--    d.class_time,
--    d.dance_style,
--    d.dance_name,
--    d.choreography,
--    dd.dancer,
--    p.first_name,
--    p.last_name
--   FROM dances d JOIN dancer_classes dd ON d.dance_id = dd.dance_id JOIN dancers p ON p.name = dd.dancer
--  ORDER BY dance_name, class_time, last_name, first_name;
