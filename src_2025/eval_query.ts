import { Database } from 'bun:sqlite';
const db = new Database(`${import.meta.dir}/database.db`);

const _mapToCSV = (r: any, i: number) =>
  `${
    i === 0
      ? Object.keys(r)
          .sort((a, b) => (a > b ? 1 : -1))
          .map(r => `"${r}"`)
          .join(',') + '\n'
      : ''
  }${Object.entries(r)
    .sort((a, b) => (a[0] > b[0] ? 1 : -1))
    .map(r => `"${`${r[1] ?? ''}`.replaceAll('"', '""')}"`)
    .join(',')}`;

// Dance order
console.table(
  db
    .query(
      `
WITH RECURSIVE dance_order AS (
  SELECT recital_id, d1.recital_group, dance_id, follows_dance_id, dance_id AS start_id, 0 AS level
    FROM recital_group_orders INNER JOIN dances d1 ON recital_group_orders.dance_id = d1.id
   WHERE follows_dance_id IS NULL
  UNION ALL
  SELECT d.recital_id, d2.recital_group, d.dance_id, d.follows_dance_id, o.start_id, level + 1
    FROM recital_group_orders d INNER JOIN dances d2 ON d.dance_id = d2.id
         JOIN dance_order o ON o.dance_id = d.follows_dance_id
)
SELECT recital, part, recital_group, dance, choreography, id, follows_dance_id, dancer_count, level
      -- ,CASE WHEN dancing_next IS NOT NULL THEN (SELECT COUNT(*) FROM (SELECT value FROM json_each(dancers) AS t1 INTERSECT SELECT value FROM json_each(dancing_next) AS t2)) END AS agg_dancing_next
      -- ,CASE WHEN dancing_next_next IS NOT NULL THEN (SELECT COUNT(*) FROM (SELECT value FROM json_each(dancers) AS t1 INTERSECT SELECT value FROM json_each(dancing_next_next) AS t2)) END AS agg_dancing_next_next
      -- ,CASE WHEN dancing_next IS NOT NULL THEN (SELECT json_group_array(value) FROM (SELECT value FROM json_each(dancers) AS t1 INTERSECT SELECT value FROM json_each(dancing_next) AS t2)) END AS also_dancing_next
      -- ,CASE WHEN dancing_next_next IS NOT NULL THEN (SELECT json_group_array(value) FROM (SELECT value FROM json_each(dancers) AS t1 INTERSECT SELECT value FROM json_each(dancing_next_next) AS t2)) END AS also_dancing_next_next
      -- SELECT recital, part, recital_group, dance, id, dancer_count
      --       ,(SELECT COUNT(*) FROM json_each(dancers)) dancers
      --       -- ,CASE WHEN dancing_next IS NOT NULL THEN (SELECT group_concat(value, ', ') FROM json_each(dancers) AS t1 INTERSECT SELECT group_concat(value, ', ') FROM json_each(dancing_next) AS t2) END AS dancing_next
      --       -- ,CASE WHEN dancing_next_next IS NOT NULL THEN (SELECT group_concat(value, ', ') FROM json_each(dancers) AS t1 INTERSECT SELECT group_concat(value, ', ') FROM json_each(dancing_next_next) AS t2) END AS dancing_next_next
  FROM (
SELECT recital, part, recital_group, dance, choreography, id, follows_dance_id, COALESCE(dancer_count, ds_dancer_count) dancer_count, level
      -- ,LEAD(SELECT group_concat(dancer) FROM (SELECT dancers FROM json_each(dancers) WHERE json_each(dancers).value IN (SELECT dancer FROM json_each(dancers))), 1) OVER (PARTITION BY recital, part, recital_group ORDER BY level) dancing_next
      -- ,CASE WHEN LEAD(dancers, 1) OVER (PARTITION BY recital, part, recital_group ORDER BY level) IS NOT NULL THEN (SELECT group_concat(value, ', ') FROM json_each(dancers) AS t1 INTERSECT SELECT group_concat(value, ', ') FROM json_each(LEAD(dancers, 1) OVER (PARTITION BY recital, part, recital_group ORDER BY level)) AS t2) END AS dancing_next
      ,COALESCE(dancers, tap_dancers) dancers
      ,LEAD(dancers, 1) OVER (PARTITION BY recital ORDER BY CASE recital_group WHEN 'T' THEN 0 ELSE 1 END, part, level) dancing_next
      ,LEAD(dancers, 2) OVER (PARTITION BY recital ORDER BY CASE recital_group WHEN 'T' THEN 0 ELSE 1 END, part, level) dancing_next_next
  FROM (
  SELECT r1.id recital
          ,'1' part
          ,d1.recital_group recital_group
          ,d1.dance
          ,d1.choreography
          ,d1.id dance_id
    FROM recitals r1
         INNER JOIN dances d1
           ON r1.recital_group_part_1 = d1.recital_group
  UNION ALL
    SELECT r2.id recital
          ,'2' part
          ,d2.recital_group recital_group
          ,d2.dance
          ,d2.choreography
          ,d2.id dance_id
    FROM recitals r2
         INNER JOIN dances d2
           ON r2.recital_group_part_2 = d2.recital_group
  UNION ALL
    SELECT rb.recital_id recital
          ,CASE rb2.recital_group_part_1 WHEN db2.recital_group THEN '1' ELSE '2' END part
          ,'B' recital_group
          ,db.dance
          ,db.choreography
          ,db.id dance_id
    FROM recital_group_orders rb
         INNER JOIN dances db
           ON db.id = rb.dance_id
         LEFT OUTER JOIN dances db2 ON db2.id = rb.follows_dance_id
         LEFT OUTER JOIN recitals rb2 ON rb2.id = rb.recital_id
   WHERE rb.recital_id IS NOT NULL
  UNION ALL
    SELECT rs.id recital
          ,'1' part
          ,'T' recital_group
          ,'SpecTAPular' dance
          ,'Ms. Angie' choreography
          ,-1 dance_id
    FROM recitals rs
) all_dance_instances
 LEFT OUTER JOIN (SELECT d.id
                   ,COUNT(*) dancer_count
                   ,json_group_array(dd.dancer) AS dancers
                FROM dances d INNER JOIN dance_dancers dd ON d.id = dd.dance_id
               GROUP BY d.id) dc ON dc.id = all_dance_instances.dance_id
 LEFT OUTER JOIN (SELECT recital_id
                   ,dance_id
                   ,follows_dance_id
                   ,start_id
                   ,level
               FROM dance_order
              ORDER BY start_id, level) do ON do.dance_id = all_dance_instances.dance_id
 LEFT OUTER JOIN (SELECT -1 AS ds_id
                   ,COUNT(*) ds_dancer_count
                   ,json_group_array(dd.dancer) AS tap_dancers
                FROM dances d INNER JOIN dance_dancers dd ON d.id = dd.dance_id
               WHERE spectapular = 1) ds ON ds.ds_id = all_dance_instances.dance_id
)
 ORDER BY recital
         ,part
         ,level
         ,CASE recital_group WHEN 'T' THEN 0 ELSE 1 END
         ,CASE recital_group WHEN 'B' THEN 0 ELSE 1 END
`
    )
    .all()
);

db.close();
