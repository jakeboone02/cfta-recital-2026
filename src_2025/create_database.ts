import { Database } from 'bun:sqlite';

const db_file_path = `${import.meta.dir}/database.db`;

const db_file = Bun.file(db_file_path);

if (await db_file.exists()) {
  await db_file.delete();
}

const db = new Database(db_file_path);

const sql = await Bun.file(`${import.meta.dir}/create_database.sql`).text();

db.transaction(() => db.run(sql))();

// Test query: Dancers with multiple dances in the same group
console.table(
  db
    .query(
      `
SELECT recital_group "Group", dancer "Dancer", group_concat(dance, ', ') "Dances in Group", count(*) "Dance #"
  FROM dances INNER JOIN dance_dancers ON dances.id = dance_id
 WHERE recital_group IN (1, 2, 3)
   AND dance NOT LIKE '%TAP'
 GROUP BY recital_group, dancer
HAVING "Dance #" > 1
 ORDER BY 4 DESC, 1 ASC, 2 ASC`
    )
    .all()
);

db.close();
