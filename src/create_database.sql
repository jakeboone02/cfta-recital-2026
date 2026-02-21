CREATE TABLE dances (
  dance_id int PRIMARY KEY,
  -- recital_group text check (recital_group IN ('SpecTAPular', 'A', 'B', 'C', 'PREDANCE', 'Hip Hop', 'Finale')) null,
  dance_style text check (dance_style IN ('All', 'Ballet', 'Hip Hop', 'Jazz', 'Modern/Lyrical', 'Musical Theater', 'Tap')) not null,
  dance_name text,
  choreography text,
  song text,
  artist text
);

CREATE TABLE dancers (
  dancer_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  first_name text not null,
  last_name text not null,
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

CREATE TABLE recital_groups (
  recital_group text check (recital_group IN ('A', 'B', 'C')) not null,
  show_order text not null
);

CREATE TABLE recitals (
  recital_id int PRIMARY KEY check (recital_id IN (1, 2, 3)),
  recital_group_part_1 int check (recital_group_part_1 IN ('A', 'B', 'C')) null,
  recital_group_part_2 int check (recital_group_part_2 IN ('A', 'B', 'C')) null,
  recital_description text not null,
  recital_time text not null
);

--------------------------------------------------------------------------------
-- Views
--------------------------------------------------------------------------------

CREATE VIEW IF NOT EXISTS recital_group_order AS
SELECT r.recital_id,
       ROW_NUMBER() OVER (PARTITION BY r.recital_time ORDER BY json_each.key) as recital_part,
       json_each.value as recital_group,
       r.recital_description,
       r.recital_time
  FROM recitals r, json_each('["' || r.recital_group_part_1 || '","' || r.recital_group_part_2 || '"]')
 ORDER BY r.recital_time, json_each.key;

CREATE VIEW IF NOT EXISTS group_dance_order AS
SELECT recital_group,
       ROW_NUMBER() OVER (PARTITION BY recital_group ORDER BY json_each.key) AS order_in_group,
       json_each.value AS dance_id
  FROM recital_groups, json_each(show_order);

CREATE VIEW IF NOT EXISTS recital_group_dances AS
SELECT gdo.recital_group,
       gdo.order_in_group,
       gdo.dance_id,
       COALESCE(d.dance_style, 'PREDANCE') AS dance_style,
       COALESCE(d.dance_name, 'PREDANCE') AS dance_name,
       COALESCE(d.choreography, '???') AS choreography,
       COALESCE(d.song, '???') AS song,
       COALESCE(d.artist, '???') AS artist
  FROM group_dance_order gdo
       LEFT JOIN dances d ON gdo.dance_id = d.dance_id
 ORDER BY gdo.recital_group, order_in_group;

CREATE VIEW IF NOT EXISTS recital_show_order AS
SELECT ROW_NUMBER() OVER (ORDER BY base.recital_id, base.recital_part, base.order_in_group) AS overall_show_order,
       base.*
  FROM (SELECT rgo.recital_id, rgo.recital_part, rgd.recital_group, rgd.order_in_group, rgd.dance_id, rgd.dance_style, rgd.dance_name, rgd.choreography, song, artist
          FROM recital_group_order rgo INNER JOIN recital_group_dances rgd ON rgo.recital_group = rgd.recital_group
        UNION ALL
        SELECT recital_id, 1 recital_part, dance_name AS recital_group, 0 order_in_group, dance_id, dance_style, dance_name, choreography, song, artist
          FROM dances INNER JOIN recitals r
        WHERE dance_name = 'SpecTAPular'
        UNION ALL
        SELECT recital_id, 2 recital_part, dance_name AS recital_group, 98 order_in_group, dance_id, dance_style, dance_name, choreography, song, artist
          FROM dances INNER JOIN recitals r
        WHERE dance_name = 'Hip Hop'
        UNION ALL
        SELECT recital_id, 2 recital_part, dance_name AS recital_group, 99 order_in_group, dance_id, dance_style, dance_name, choreography, song, artist
          FROM dances INNER JOIN recitals r
        WHERE dance_name = 'Finale'
       ) base
 ORDER BY base.recital_id, base.recital_part, base.order_in_group;

CREATE VIEW IF NOT EXISTS consecutive_dances_tracker AS
SELECT
  o.*,
  -- 1) all dancers in this dance
  (SELECT json_group_array(dancer_name) FROM dance_dancers WHERE dance_id = o.dance_id) AS dancer_list,
  -- 2) dancers in the next dance
  (SELECT json_group_array(dancer_name) FROM dance_dancers WHERE dance_id = o.dance_id AND dancer_name IN (SELECT dancer_name FROM dance_dancers WHERE dance_id = o.next_dance_id)) AS common_with_next,
  -- 3) dancers in the dance after next
  (SELECT json_group_array(dancer_name) FROM dance_dancers WHERE dance_id = o.dance_id AND dancer_name IN (SELECT dancer_name FROM dance_dancers WHERE dance_id = o.next2_dance_id)) AS common_with_next2
FROM (SELECT rso.*,
             LEAD(dance_id, 1) OVER (ORDER BY overall_show_order) AS next_dance_id,
             LEAD(dance_id, 2) OVER (ORDER BY overall_show_order) AS next2_dance_id
        FROM recital_show_order rso
     ) o
ORDER BY o.overall_show_order;

CREATE VIEW IF NOT EXISTS participants AS
SELECT d.dance_id,
       gdo.recital_group,
       d.dance_style,
       d.dance_name,
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
 WHERE NOT (gdo.recital_group = 'SpecTAPular' AND p.is_teacher = 1)
 ORDER BY dance_name, last_name, first_name;

CREATE VIEW IF NOT EXISTS dance_dancers AS
SELECT d.*, p.*
  FROM dances d
     INNER JOIN class_dances cd ON d.dance_id = cd.dance_id
     INNER JOIN classes c ON cd.class_id = c.class_id
     INNER JOIN dancer_classes dc ON cd.class_id = dc.class_id
     INNER JOIN dancers p ON dc.dancer_name = p.dancer_name
 ORDER BY d.dance_name, last_name, first_name;

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
     AND dance_name <> 'SpecTAPular'
     AND last_name <> 'Boone'
     AND last_name <> 'Wells'
   GROUP BY dancer_name, last_name
), children AS (
  SELECT dancer_name, last_name, GROUP_CONCAT(recital_group, ', ') AS groups, GROUP_CONCAT(dance_name, ', ') AS dances
    FROM participants
   WHERE class_name NOT LIKE '%Adult%'
     AND dance_name <> 'SpecTAPular'
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
