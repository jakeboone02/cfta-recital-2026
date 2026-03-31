CREATE TABLE dances (
  dance_id int PRIMARY KEY,
  dance_style text check (dance_style IN ('All', 'Ballet', 'Hip Hop', 'Jazz', 'Modern/Lyrical', 'Musical Theater', 'Tap')) not null,
  dance_name text,
  choreography text,
  song text,
  artist text,
  skip_overlap_checks int check (skip_overlap_checks IN (0, 1)) not null default 0,
  exclude_teachers int check (exclude_teachers IN (0, 1)) not null default 0
);

CREATE TABLE dancers (
  dancer_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  first_name text not null,
  last_name text not null,
  family_label text,
  is_teacher int check (is_teacher IN (0, 1)) not null
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

CREATE TABLE placeholder_dances (
  dance_order text not null -- JSON array of dance IDs in show-order sequence for PLACEHOLDER slots
);

CREATE TABLE recital_groups (
  recital_group text not null,
  show_order text not null,
  has_fixed_order int check (has_fixed_order IN (0, 1)) not null default 0
);

CREATE TABLE shows (
  show_id int PRIMARY KEY,
  group_order text not null, -- JSON array of group names, e.g. '["OPENER","A","B","CLOSER"]'
  show_description text not null,
  show_time text not null
);

CREATE TABLE dressing_rooms (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE UNIQUE INDEX dressing_room ON dressing_rooms (name);

CREATE TABLE show_class_dressing_rooms (
  show_id INTEGER NOT NULL,
  class_id INTEGER NOT NULL,
  dressing_room_id INTEGER NOT NULL
);
CREATE UNIQUE INDEX show_class_dressing_room ON show_class_dressing_rooms(show_id, class_id);

CREATE TABLE guest_list_2025 (
  order_number TEXT,
  order_date TEXT,
  guest_first_name TEXT,
  guest_last_name TEXT,
  email TEXT,
  ticket_type TEXT,
  ticket_number TEXT,
  checked_in TEXT,
  dancer_names TEXT
);

--------------------------------------------------------------------------------
-- Views
--------------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS show_group_order AS
SELECT r.show_id,
       ROW_NUMBER() OVER (PARTITION BY r.show_time ORDER BY json_each.key) as show_part,
       json_each.value as recital_group,
       r.show_description,
       r.show_time
  FROM shows r, json_each(r.group_order)
 ORDER BY r.show_time, json_each.key;

CREATE VIEW IF NOT EXISTS group_dance_order AS
SELECT recital_group,
       ROW_NUMBER() OVER (PARTITION BY recital_group ORDER BY json_each.key) AS order_in_group,
       CASE WHEN json_each.value = 'PLACEHOLDER' THEN NULL ELSE CAST(json_each.value AS INTEGER) END AS dance_id,
       CASE WHEN json_each.value = 'PLACEHOLDER' THEN 1 ELSE 0 END AS is_placeholder
  FROM recital_groups, json_each(show_order);

CREATE VIEW IF NOT EXISTS recital_group_dances AS
SELECT gdo.recital_group,
       gdo.order_in_group,
       gdo.dance_id,
       gdo.is_placeholder,
       COALESCE(d.dance_style, 'PLACEHOLDER') AS dance_style,
       COALESCE(d.dance_name, 'PLACEHOLDER') AS dance_name,
       COALESCE(d.choreography, '???') AS choreography,
       COALESCE(d.song, '???') AS song,
       COALESCE(d.artist, '???') AS artist
  FROM group_dance_order gdo
       LEFT JOIN dances d ON gdo.dance_id = d.dance_id
 ORDER BY gdo.recital_group, order_in_group;

CREATE VIEW IF NOT EXISTS show_order_view AS
SELECT ROW_NUMBER() OVER (ORDER BY sgo.show_id, sgo.show_part, rgd.order_in_group) AS overall_show_order,
       sgo.show_id, sgo.show_part, rgd.recital_group, rgd.order_in_group, rgd.is_placeholder, rgd.dance_id, rgd.dance_style, rgd.dance_name, rgd.choreography, rgd.song, rgd.artist
  FROM show_group_order sgo
       INNER JOIN recital_group_dances rgd ON sgo.recital_group = rgd.recital_group
 ORDER BY sgo.show_id, sgo.show_part, rgd.order_in_group;

CREATE VIEW IF NOT EXISTS consecutive_dances_tracker AS
SELECT
  o.*,
  -- 1) all dancers in this dance
  (SELECT json_group_array(dancer_name ORDER BY UPPER(last_name), UPPER(first_name)) FROM dance_dancers WHERE dance_id = o.dance_id) AS dancer_list,
  -- 2) dancers in the next dance
  (SELECT json_group_array(dancer_name ORDER BY UPPER(last_name), UPPER(first_name)) FROM dance_dancers WHERE dance_id = o.dance_id AND dancer_name IN (SELECT dancer_name FROM dance_dancers WHERE dance_id = o.next_dance_id)) AS common_with_next,
  -- 3) dancers in the dance after next
  (SELECT json_group_array(dancer_name ORDER BY UPPER(last_name), UPPER(first_name)) FROM dance_dancers WHERE dance_id = o.dance_id AND dancer_name IN (SELECT dancer_name FROM dance_dancers WHERE dance_id = o.next2_dance_id)) AS common_with_next2
FROM (SELECT rso.*,
             LEAD(dance_id, 1) OVER (ORDER BY overall_show_order) AS next_dance_id,
             LEAD(dance_id, 2) OVER (ORDER BY overall_show_order) AS next2_dance_id
        FROM show_order_view rso
     ) o
ORDER BY o.overall_show_order;

CREATE VIEW IF NOT EXISTS participants AS
SELECT d.dance_id,
       gdo.recital_group,
       d.dance_style,
       d.dance_name,
       d.skip_overlap_checks,
       c.class_name,
       c.class_time,
       d.choreography,
       p.dancer_name,
       p.last_name,
       p.first_name
  FROM dances d
       INNER JOIN group_dance_order gdo ON gdo.dance_id = d.dance_id
       INNER JOIN class_dances cd ON d.dance_id = cd.dance_id
       INNER JOIN classes c ON cd.class_id = c.class_id
       INNER JOIN dancer_classes dc ON cd.class_id = dc.class_id
       INNER JOIN dancers p ON dc.dancer_name = p.dancer_name
 WHERE NOT (d.exclude_teachers = 1 AND p.is_teacher = 1)
 ORDER BY dance_name, last_name, first_name;

CREATE VIEW IF NOT EXISTS dance_dancers AS
SELECT dances.*, dancers.*
  FROM dances
     INNER JOIN class_dances cd ON dances.dance_id = cd.dance_id
     INNER JOIN classes c ON cd.class_id = c.class_id
     INNER JOIN dancer_classes dc ON cd.class_id = dc.class_id
     INNER JOIN dancers ON dc.dancer_name = dancers.dancer_name
 WHERE NOT (dances.exclude_teachers = 1 AND dancers.is_teacher = 1)
 ORDER BY dances.dance_name, UPPER(last_name), UPPER(first_name);

CREATE VIEW IF NOT EXISTS teacher_checklist AS
SELECT c.teacher AS "Teacher",
       c.class_name AS "Class",
       c.class_time AS "Time",
       p.first_name AS "First Name",
       p.last_name AS "Last Name",
       GROUP_CONCAT(d.dance_name, ', ') AS "Class Dances"
  FROM dances d
       INNER JOIN class_dances cd ON d.dance_id = cd.dance_id
       INNER JOIN classes c ON cd.class_id = c.class_id
       INNER JOIN dancer_classes dc ON cd.class_id = dc.class_id
       INNER JOIN dancers p ON dc.dancer_name = p.dancer_name
 GROUP BY c.teacher,
       c.class_name,
       c.class_time,
       p.first_name,
       p.last_name
 ORDER BY c.teacher,
          class_name,
          class_time,
          last_name,
          first_name;

CREATE VIEW IF NOT EXISTS parent_and_child_dancers AS
WITH parents AS (
  SELECT dancer_name, last_name, GROUP_CONCAT(recital_group, ', ') AS groups, GROUP_CONCAT(dance_name, ', ') AS dances
    FROM participants
   WHERE class_name LIKE '%Adult%'
     AND skip_overlap_checks = 0
     AND last_name <> 'Boone'
     AND last_name <> 'Wells'
   GROUP BY dancer_name, last_name
), children AS (
  SELECT dancer_name, last_name, GROUP_CONCAT(recital_group, ', ') AS groups, GROUP_CONCAT(dance_name, ', ') AS dances
    FROM participants
   WHERE class_name NOT LIKE '%Adult%'
     AND skip_overlap_checks = 0
   GROUP BY dancer_name, last_name
)
SELECT parents.dancer_name parent,
       parents.groups parent_groups,
       children.groups child_groups,
       children.dancer_name child,
       parents.dances parent_dances,
       children.dances child_dances
  FROM children INNER JOIN parents ON parents.last_name = children.last_name
 WHERE parents.dancer_name <> children.dancer_name
 ORDER BY parent, child;

CREATE VIEW IF NOT EXISTS busy_dancers AS
   SELECT dancer_name,
          COUNT(*) dance_count,
          GROUP_CONCAT(dance_name, '; ') dance_names
     FROM dance_dancers
 GROUP BY dancer_name
   HAVING count(*) > 2
 ORDER BY 2 DESC,
          last_name;

-- All show data, in show order, with a list of dancers for each dance.
-- Suitable for generating the program.
CREATE VIEW IF NOT EXISTS complete_program AS
WITH dd as (
  SELECT dance_id, group_concat(dancer_name, ', ') dancers
    FROM dance_dancers
   GROUP BY dance_id
   ORDER BY last_name, first_name)
SELECT sov.*, dd.dancers
  FROM show_order_view sov INNER JOIN dd ON sov.dance_id = dd.dance_id;

CREATE VIEW IF NOT EXISTS family_counts AS
WITH dance_families AS (
  SELECT DISTINCT dd.dance_id,
         CASE WHEN dd.dance_name LIKE 'Pre%' THEN 'PRE' ELSE 'OTHER' END AS pre_or_other,
         COALESCE(NULLIF(TRIM(family_label), ''), last_name) AS family_name
    FROM dance_dancers dd
)
SELECT sov.show_id, pre_or_other, COUNT(DISTINCT family_name) AS family_count
  FROM show_order_view sov INNER JOIN dance_families ON sov.dance_id = dance_families.dance_id
 GROUP BY sov.show_id, pre_or_other;
