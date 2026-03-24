-- === FAMILY TICKET STATISTICS ===
-- Run with: sqlite3 -header -column src/database.db < src/stats.sql

-- (1) Families in each show also in exactly one other show (and which)
-- (2) Families in each show also in both other shows
WITH show_families AS (
  SELECT DISTINCT sov.show_id,
    COALESCE(NULLIF(TRIM(dd.family_label), ''), dd.last_name) AS family_name,
    CASE WHEN dd.dance_name LIKE 'Pre%' THEN 'PRE' ELSE 'GROUP' END AS dance_type
  FROM show_order_view sov
  INNER JOIN dance_dancers dd ON sov.dance_id = dd.dance_id
),
family_shows AS (
  SELECT family_name,
    MAX(CASE WHEN show_id = 1 THEN 1 ELSE 0 END) AS in_s1,
    MAX(CASE WHEN show_id = 2 THEN 1 ELSE 0 END) AS in_s2,
    MAX(CASE WHEN show_id = 3 THEN 1 ELSE 0 END) AS in_s3
  FROM (SELECT DISTINCT show_id, family_name FROM show_families)
  GROUP BY family_name
)

SELECT 'OVERLAP WITH ONE OTHER SHOW' AS section, '' AS detail, '' AS count
UNION ALL
SELECT '  Show 1 (Fri Eve)', 'shared only w/ Show 2 (Sat AM)', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s1=1 AND in_s2=1 AND in_s3=0
UNION ALL
SELECT '  Show 1 (Fri Eve)', 'shared only w/ Show 3 (Sat PM)', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s1=1 AND in_s3=1 AND in_s2=0
UNION ALL
SELECT '  Show 2 (Sat AM)', 'shared only w/ Show 1 (Fri Eve)', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s2=1 AND in_s1=1 AND in_s3=0
UNION ALL
SELECT '  Show 2 (Sat AM)', 'shared only w/ Show 3 (Sat PM)', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s2=1 AND in_s3=1 AND in_s1=0
UNION ALL
SELECT '  Show 3 (Sat PM)', 'shared only w/ Show 1 (Fri Eve)', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s3=1 AND in_s1=1 AND in_s2=0
UNION ALL
SELECT '  Show 3 (Sat PM)', 'shared only w/ Show 2 (Sat AM)', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s3=1 AND in_s2=1 AND in_s1=0

UNION ALL SELECT '', '', ''

UNION ALL
SELECT 'IN ALL THREE SHOWS', '', ''
UNION ALL
SELECT '  Families in all 3', '', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s1=1 AND in_s2=1 AND in_s3=1

UNION ALL SELECT '', '', ''

UNION ALL
SELECT 'TOTALS', '', ''
UNION ALL
SELECT '  Total families in Show 1', '(Fri Eve)', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s1=1
UNION ALL
SELECT '  Total families in Show 2', '(Sat AM)', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s2=1
UNION ALL
SELECT '  Total families in Show 3', '(Sat PM)', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s3=1
UNION ALL
SELECT '  Total distinct families', 'across all shows', CAST(COUNT(*) AS TEXT)
  FROM family_shows
UNION ALL
SELECT '  Families ONLY in 1 show', '', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE (in_s1+in_s2+in_s3)=1
UNION ALL
SELECT '  Families in exactly 2', '', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE (in_s1+in_s2+in_s3)=2
UNION ALL
SELECT '  Families in all 3', '', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE (in_s1+in_s2+in_s3)=3;


-- (3) Pre-dance families already attending that show via an older sibling's group dance
WITH show_families AS (
  SELECT DISTINCT sov.show_id,
    COALESCE(NULLIF(TRIM(dd.family_label), ''), dd.last_name) AS family_name,
    CASE WHEN dd.dance_name LIKE 'Pre%' THEN 'PRE' ELSE 'GROUP' END AS dance_type
  FROM show_order_view sov
  INNER JOIN dance_dancers dd ON sov.dance_id = dd.dance_id
),
show_group_fam AS (
  SELECT DISTINCT show_id, family_name FROM show_families WHERE dance_type = 'GROUP'
),
show_pre_fam AS (
  SELECT DISTINCT show_id, family_name FROM show_families WHERE dance_type = 'PRE'
)
SELECT p.show_id,
  s.show_description,
  COUNT(DISTINCT p.family_name) AS pre_families_total,
  COUNT(DISTINCT CASE WHEN g.family_name IS NOT NULL THEN p.family_name END) AS pre_already_in_show,
  COUNT(DISTINCT CASE WHEN g.family_name IS NULL THEN p.family_name END) AS pre_unique_to_pre
FROM show_pre_fam p
INNER JOIN shows s ON p.show_id = s.show_id
LEFT JOIN show_group_fam g ON p.show_id = g.show_id AND p.family_name = g.family_name
GROUP BY p.show_id, s.show_description;

--
WITH dance_families AS (
  SELECT DISTINCT dd.dance_id,
         CASE WHEN dd.dance_name LIKE 'Pre%' THEN 'PRE' ELSE 'OTHER' END AS pre_or_other,
         COALESCE(NULLIF(TRIM(family_label), ''), last_name) AS family_name
    FROM dance_dancers dd
)
SELECT sov.show_id,
       pre_or_other,
       COUNT(DISTINCT family_name) AS family_count
  FROM show_order_view sov
       INNER JOIN dance_families ON sov.dance_id = dance_families.dance_id
 GROUP BY sov.show_id, pre_or_other;

--
WITH show_families AS (
  SELECT DISTINCT sov.show_id,
    COALESCE(NULLIF(TRIM(dd.family_label), ''), dd.last_name) AS family_name,
    CASE WHEN dd.dance_name LIKE 'Pre%' THEN 'PRE' ELSE 'GROUP' END AS dance_type
  FROM show_order_view sov
  INNER JOIN dance_dancers dd ON sov.dance_id = dd.dance_id
),
family_shows AS (
  SELECT family_name,
    MAX(CASE WHEN show_id = 1 THEN 1 ELSE 0 END) AS in_s1,
    MAX(CASE WHEN show_id = 2 THEN 1 ELSE 0 END) AS in_s2,
    MAX(CASE WHEN show_id = 3 THEN 1 ELSE 0 END) AS in_s3
  FROM (SELECT DISTINCT show_id, family_name FROM show_families)
  GROUP BY family_name
)
SELECT 'ONLY SHOW 1' AS section, '' AS detail, CAST(COUNT(*) AS TEXT) AS count
  FROM family_shows WHERE in_s1=1 AND in_s2=0 AND in_s3=0
UNION ALL
SELECT 'ONLY SHOW 2', '', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s2=1 AND in_s1=0 AND in_s3=0
UNION ALL
SELECT 'ONLY SHOW 3', '', CAST(COUNT(*) AS TEXT)
  FROM family_shows WHERE in_s3=1 AND in_s1=0 AND in_s2=0;
