import Papa from 'papaparse';
import type { Env } from '../env';

interface CsvTable {
  name: string;
  requiredColumns: string[];
  insert: (env: Env, instanceId: number, rows: Record<string, any>[]) => Promise<void>;
}

const CSV_TABLES: CsvTable[] = [
  {
    name: 'dancers',
    requiredColumns: ['first_name', 'last_name', 'is_teacher'],
    insert: async (env, instanceId, rows) => {
      const stmt = env.DB.prepare(
        'INSERT INTO dancers (recital_instance_id, first_name, last_name, is_teacher) VALUES (?, ?, ?, ?)'
      );
      await env.DB.batch(
        rows.map(r => stmt.bind(instanceId, r.first_name, r.last_name, r.is_teacher ?? 0))
      );
    },
  },
  {
    name: 'classes',
    requiredColumns: ['class_id', 'teacher', 'class_name', 'class_time'],
    insert: async (env, instanceId, rows) => {
      const stmt = env.DB.prepare(
        'INSERT INTO classes (recital_instance_id, csv_class_id, teacher, class_name, class_time) VALUES (?, ?, ?, ?, ?)'
      );
      await env.DB.batch(
        rows.map(r => stmt.bind(instanceId, r.class_id, r.teacher, r.class_name, r.class_time))
      );
    },
  },
  {
    name: 'dances',
    requiredColumns: ['dance_id', 'dance_style', 'dance_name'],
    insert: async (env, instanceId, rows) => {
      const stmt = env.DB.prepare(
        'INSERT INTO dances (recital_instance_id, csv_dance_id, dance_style, dance_name, choreography, song, artist) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      await env.DB.batch(
        rows.map(r =>
          stmt.bind(
            instanceId,
            r.dance_id,
            r.dance_style,
            r.dance_name,
            r.choreography ?? null,
            r.song ?? null,
            r.artist ?? null
          )
        )
      );
    },
  },
  {
    name: 'class_dances',
    requiredColumns: ['class_id', 'dance_id'],
    insert: async (env, instanceId, rows) => {
      // Map CSV IDs to D1 auto-generated IDs
      const classes = await env.DB.prepare(
        'SELECT class_id, csv_class_id FROM classes WHERE recital_instance_id = ?'
      )
        .bind(instanceId)
        .all();
      const dances = await env.DB.prepare(
        'SELECT dance_id, csv_dance_id FROM dances WHERE recital_instance_id = ?'
      )
        .bind(instanceId)
        .all();
      const classMap = new Map(classes.results.map((c: any) => [c.csv_class_id, c.class_id]));
      const danceMap = new Map(dances.results.map((d: any) => [d.csv_dance_id, d.dance_id]));

      const stmt = env.DB.prepare(
        'INSERT INTO class_dances (recital_instance_id, class_id, dance_id) VALUES (?, ?, ?)'
      );
      const bindings = rows
        .map(r => {
          const classId = classMap.get(r.class_id);
          const danceId = danceMap.get(r.dance_id);
          return classId != null && danceId != null
            ? stmt.bind(instanceId, classId, danceId)
            : null;
        })
        .filter(Boolean) as D1PreparedStatement[];
      if (bindings.length) await env.DB.batch(bindings);
    },
  },
  {
    name: 'dancer_classes',
    requiredColumns: ['class_id', 'dancer_name'],
    insert: async (env, instanceId, rows) => {
      const classes = await env.DB.prepare(
        'SELECT class_id, csv_class_id FROM classes WHERE recital_instance_id = ?'
      )
        .bind(instanceId)
        .all();
      const classMap = new Map(classes.results.map((c: any) => [c.csv_class_id, c.class_id]));

      const stmt = env.DB.prepare(
        'INSERT INTO dancer_classes (recital_instance_id, class_id, dancer_name) VALUES (?, ?, ?)'
      );
      const bindings = rows
        .map(r => {
          const classId = classMap.get(r.class_id);
          return classId != null ? stmt.bind(instanceId, classId, r.dancer_name) : null;
        })
        .filter(Boolean) as D1PreparedStatement[];
      if (bindings.length) await env.DB.batch(bindings);
    },
  },
  {
    name: 'recitals',
    requiredColumns: ['recital_id', 'recital_description', 'recital_time'],
    insert: async (env, instanceId, rows) => {
      const stmt = env.DB.prepare(
        'INSERT INTO recitals (recital_instance_id, csv_recital_id, recital_group_part_1, recital_group_part_2, recital_description, recital_time) VALUES (?, ?, ?, ?, ?, ?)'
      );
      await env.DB.batch(
        rows.map(r =>
          stmt.bind(
            instanceId,
            r.recital_id,
            r.recital_group_part_1 ?? null,
            r.recital_group_part_2 ?? null,
            r.recital_description,
            r.recital_time
          )
        )
      );
    },
  },
  {
    name: 'recital_groups',
    requiredColumns: ['recital_group', 'show_order'],
    insert: async (env, instanceId, rows) => {
      // show_order contains CSV dance_ids — remap to D1 dance_ids
      const dances = await env.DB.prepare(
        'SELECT dance_id, csv_dance_id FROM dances WHERE recital_instance_id = ?'
      )
        .bind(instanceId)
        .all();
      const danceMap = new Map(dances.results.map((d: any) => [d.csv_dance_id, d.dance_id]));

      const stmt = env.DB.prepare(
        'INSERT INTO recital_groups (recital_instance_id, recital_group, show_order) VALUES (?, ?, ?)'
      );
      await env.DB.batch(
        rows.map(r => {
          const order: (number | string)[] = JSON.parse(r.show_order);
          const remapped = order.map(id =>
            id === 'PRE' ? 'PRE' : (danceMap.get(id as number) ?? id)
          );
          return stmt.bind(instanceId, r.recital_group, JSON.stringify(remapped));
        })
      );
    },
  },
];

// Required upload order (dependencies must come first)
const UPLOAD_ORDER = [
  'dancers',
  'classes',
  'dances',
  'class_dances',
  'dancer_classes',
  'recitals',
  'recital_groups',
];

export async function handleCsvUpload(
  request: Request,
  env: Env,
  instanceId: number
): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const body = (await request.json()) as
    | { table: string; csv: string }
    | { tables: Record<string, string> };

  // Single table upload
  if ('table' in body && 'csv' in body) {
    return uploadSingleTable(env, instanceId, body.table, body.csv);
  }

  // Bulk upload (all tables at once)
  if ('tables' in body) {
    const errors: Record<string, string> = {};
    for (const tableName of UPLOAD_ORDER) {
      const csv = body.tables[tableName];
      if (!csv) continue;
      const result = await uploadSingleTable(env, instanceId, tableName, csv);
      if (!result.ok) {
        const err = (await result.json()) as { error: string };
        errors[tableName] = err.error;
      }
    }
    if (Object.keys(errors).length > 0) {
      return Response.json({ errors }, { status: 400 });
    }
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Invalid request body' }, { status: 400 });
}

async function uploadSingleTable(
  env: Env,
  instanceId: number,
  tableName: string,
  csv: string
): Promise<Response> {
  const tableConfig = CSV_TABLES.find(t => t.name === tableName);
  if (!tableConfig) {
    return Response.json({ error: `Unknown table: ${tableName}` }, { status: 400 });
  }

  const parsed = Papa.parse<Record<string, any>>(csv.trim(), {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    return Response.json(
      { error: `CSV parse errors: ${parsed.errors.map(e => e.message).join('; ')}` },
      { status: 400 }
    );
  }

  // Validate required columns
  const missing = tableConfig.requiredColumns.filter(c => !parsed.meta.fields?.includes(c));
  if (missing.length > 0) {
    return Response.json({ error: `Missing columns: ${missing.join(', ')}` }, { status: 400 });
  }

  try {
    await tableConfig.insert(env, instanceId, parsed.data);
    return Response.json({ ok: true, rows: parsed.data.length });
  } catch (e: any) {
    return Response.json({ error: e.message ?? 'Insert failed' }, { status: 500 });
  }
}
