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

CREATE VIEW IF NOT EXISTS participants AS
SELECT d.dance_id,
       d.recital_group,
       c.class_time,
       d.dance_style,
       d.dance_name,
       d.choreography,
       p.dancer_name,
       p.last_name,
       p.first_name
  FROM dances d
       INNER JOIN class_dances cd ON d.dance_id = cd.dance_id
       INNER JOIN classes c ON cd.class_id = c.class_id
       INNER JOIN dancer_classes dc ON cd.class_id = dc.class_id
       INNER JOIN dancers p ON dc.dancer_name = p.dancer_name
 WHERE NOT (d.recital_group = 'SpecTAPular' AND p.is_teacher = 1)
 ORDER BY dance_name, last_name, first_name;

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
SELECT DISTINCT parents.dancer_name parent, participants.dancer_name child
  FROM participants
       INNER JOIN (SELECT * FROM participants WHERE dance_name LIKE '%Adult%') parents
       ON parents.last_name = participants.last_name
 WHERE parents.dancer_name <> participants.dancer_name
 ORDER BY parent, child;
