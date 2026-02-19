-- MOVE DOWN
SELECT follows_dance_id AS preceding_dance_id FROM recital_group_orders WHERE dance_id = :dance_id;
UPDATE recital_group_orders rgo_update
   SET follows_dance_id = (SELECT dance_id FROM recital_group_orders rgo_select WHERE dance_id = rgo_update.follows_dance_id)
 WHERE dance_id = :dance_id;
UPDATE recital_group_orders rgo_update
   SET follows_dance_id = :preceding_dance_id
 WHERE dance_id = (SELECT follows_dance_id FROM recital_group_orders rgo_select WHERE dance_id = :dance_id);
