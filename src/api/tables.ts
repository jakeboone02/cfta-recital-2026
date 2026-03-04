import type { Env } from '../env';

// Table definitions: whitelist of editable tables with their schema info
interface TableDef {
  pk: string;
  columns: string[]; // editable columns (excludes PK, recital_instance_id, generated cols)
  selectColumns?: string[]; // columns to return in GET (includes PK + editable); defaults to [pk, ...columns]
  orderBy?: string;
}

const TABLE_DEFS: Record<string, TableDef> = {
  dancers: {
    pk: 'id',
    columns: ['first_name', 'last_name', 'is_teacher'],
    selectColumns: ['id', 'first_name', 'last_name', 'dancer_name', 'is_teacher'],
    orderBy: 'UPPER(last_name), UPPER(first_name)',
  },
  classes: {
    pk: 'class_id',
    columns: ['csv_class_id', 'teacher', 'class_name', 'class_time'],
    orderBy: 'class_name',
  },
  dances: {
    pk: 'dance_id',
    columns: ['csv_dance_id', 'dance_style', 'dance_name', 'choreography', 'song', 'artist'],
    orderBy: 'dance_id',
  },
  dancer_classes: {
    pk: 'id',
    columns: ['class_id', 'dancer_name'],
    orderBy: 'dancer_name',
  },
  class_dances: {
    pk: 'id',
    columns: ['class_id', 'dance_id'],
    orderBy: 'class_id, dance_id',
  },
  shows: {
    pk: 'show_id',
    columns: ['csv_show_id', 'group_order', 'show_description', 'show_time'],
    orderBy: 'show_id',
  },
  recital_groups: {
    pk: 'id',
    columns: ['recital_group', 'show_order'],
    orderBy: 'recital_group',
  },
};

export async function handleTables(
  request: Request,
  env: Env,
  instanceId: number,
  tableName: string
): Promise<Response> {
  const def = TABLE_DEFS[tableName];
  if (!def) return Response.json({ error: `Unknown table: ${tableName}` }, { status: 404 });

  // GET — list all rows for this instance
  if (request.method === 'GET') {
    const cols = (def.selectColumns ?? [def.pk, ...def.columns]).join(', ');
    const order = def.orderBy ? ` ORDER BY ${def.orderBy}` : '';
    const result = await env.DB.prepare(
      `SELECT ${cols} FROM ${tableName} WHERE recital_instance_id = ?${order}`
    )
      .bind(instanceId)
      .all();
    return Response.json({
      rows: result.results,
      columns: def.selectColumns ?? [def.pk, ...def.columns],
      pk: def.pk,
      editableColumns: def.columns,
    });
  }

  // PUT — upsert a single row
  if (request.method === 'PUT') {
    const body = (await request.json()) as Record<string, any>;
    const pkValue = body[def.pk];

    if (pkValue != null) {
      // Update existing row — only update provided editable columns
      const setCols = def.columns.filter(c => c in body);
      if (setCols.length === 0)
        return Response.json({ error: 'No editable columns provided' }, { status: 400 });
      const setClause = setCols.map(c => `${c} = ?`).join(', ');
      const values = setCols.map(c => body[c] ?? null);
      await env.DB.prepare(
        `UPDATE ${tableName} SET ${setClause} WHERE ${def.pk} = ? AND recital_instance_id = ?`
      )
        .bind(...values, pkValue, instanceId)
        .run();
      return Response.json({ ok: true });
    } else {
      // Insert new row
      const insertCols = ['recital_instance_id', ...def.columns.filter(c => c in body)];
      const placeholders = insertCols.map(() => '?').join(', ');
      const values = [instanceId, ...def.columns.filter(c => c in body).map(c => body[c] ?? null)];
      const result = await env.DB.prepare(
        `INSERT INTO ${tableName} (${insertCols.join(', ')}) VALUES (${placeholders})`
      )
        .bind(...values)
        .run();
      return Response.json({ ok: true, id: result.meta.last_row_id }, { status: 201 });
    }
  }

  // DELETE — delete a single row by PK
  if (request.method === 'DELETE') {
    const url = new URL(request.url);
    const pkValue = url.searchParams.get('id');
    if (!pkValue) return Response.json({ error: 'id query param required' }, { status: 400 });
    await env.DB.prepare(`DELETE FROM ${tableName} WHERE ${def.pk} = ? AND recital_instance_id = ?`)
      .bind(pkValue, instanceId)
      .run();
    return Response.json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
