WITH RECURSIVE dance_order AS (
  SELECT recital_id, d1.recital_group, dance_id, follows_dance_id, dance_id AS start_id, 0 AS level
    FROM recital_group_orders INNER JOIN dances d1 ON recital_group_orders.dance_id = d1.id
   WHERE follows_dance_id IS NULL
  UNION ALL
  SELECT d.recital_id, d2.recital_group, d.dance_id, d.follows_dance_id, o.start_id, level + 1
    FROM recital_group_orders d INNER JOIN dances d2 ON d.dance_id = d2.id
         JOIN dance_order o ON o.dance_id = d.follows_dance_id
)
SELECT recital
      ,recital_description
      ,part
      ,recital_group
      ,dance_style
      ,dance
      ,song
      ,artist
      ,choreography
      ,id
      ,follows_dance_id
      ,COALESCE(dancer_count, tap_dancer_count) dancer_count
      ,level
      ,COALESCE(dancers, tap_dancers) dancers
  FROM (
  SELECT r1.id recital
          ,r1.description recital_description
          ,1 part
          ,d1.recital_group recital_group
          ,d1.dance_style
          ,d1.dance
          ,d1.song
          ,d1.artist
          ,d1.choreography
          ,d1.id dance_id
    FROM recitals r1
         INNER JOIN dances d1
           ON r1.recital_group_part_1 = d1.recital_group
  UNION ALL
    SELECT r2.id recital
          ,r2.description recital_description
          ,2 part
          ,d2.recital_group recital_group
          ,d2.dance_style
          ,d2.dance
          ,d2.song
          ,d2.artist
          ,d2.choreography
          ,d2.id dance_id
    FROM recitals r2
         INNER JOIN dances d2
           ON r2.recital_group_part_2 = d2.recital_group
  UNION ALL
    SELECT rb.recital_id recital
          ,rb2.description recital_description
          ,CASE rb2.recital_group_part_1 WHEN db2.recital_group THEN 1 ELSE 2 END part
          ,'B' recital_group
          ,db.dance_style
          ,db.dance
          ,db.song
          ,db.artist
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
          ,rs.description recital_description
          ,1 part
          ,'T' recital_group
          ,ds.dance_style
          ,ds.dance
          ,ds.song
          ,ds.artist
          ,ds.choreography
          ,ds.id dance_id
    FROM recitals rs INNER JOIN dances ds ON ds.id = -1
) all_dance_instances
 LEFT OUTER JOIN (SELECT d.id
                   ,COUNT(*) dancer_count
                   ,json_group_array(dd.dancer ORDER BY UPPER(last_name), UPPER(first_name)) AS dancers
                FROM dances d
                     INNER JOIN (SELECT * FROM dance_dancers INNER JOIN dancers ON name = dancer ORDER BY last_name, first_name) dd ON d.id = dd.dance_id
               GROUP BY d.id) dc ON dc.id = all_dance_instances.dance_id
 LEFT OUTER JOIN (SELECT recital_id
                   ,dance_id
                   ,follows_dance_id
                   ,start_id
                   ,level
               FROM dance_order
              ORDER BY start_id, level) do ON do.dance_id = all_dance_instances.dance_id
 LEFT OUTER JOIN (SELECT -1 AS ds_id
                   ,COUNT(*) tap_dancer_count
                   ,json_group_array(dd.dancer ORDER BY UPPER(last_name), UPPER(first_name)) AS tap_dancers
                FROM dances d
                     INNER JOIN (SELECT * FROM dance_dancers INNER JOIN dancers ON name = dancer ORDER BY last_name, first_name) dd ON d.id = dd.dance_id
               WHERE spectapular = 1) ds ON ds.ds_id = all_dance_instances.dance_id
 ORDER BY recital_description
         ,part
         ,level
         ,CASE recital_group WHEN 'T' THEN 0 ELSE 1 END
         ,CASE recital_group WHEN 'B' THEN 0 ELSE 1 END
;
