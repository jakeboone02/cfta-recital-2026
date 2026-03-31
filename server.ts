import { Database, SQLQueryBindings } from 'bun:sqlite';
import indexHTML from './src/index.html';
import { anneal } from './src/optimizer/anneal';
import { buildScoringContext } from './src/optimizer/score';
import type { AnnealConfig, DanceData, ShowPart } from './src/optimizer/types';
import { DanceRow, GroupOrders, RecitalGroupRow, ShowDanceInstance, ShowRow } from './src/types';

const db = new Database(`./build/database.db`);

const getShowOrderData = () =>
  db
    .query<ShowDanceInstance, SQLQueryBindings[]>('SELECT * FROM consecutive_dances_tracker')
    .all()
    .map(d => ({
      ...d,
      dancer_list: JSON.parse(d.dancer_list as unknown as string),
      common_with_next: JSON.parse(d.common_with_next as unknown as string),
      common_with_next2: JSON.parse(d.common_with_next2 as unknown as string),
    }));

const getDances = () => db.query<DanceRow, SQLQueryBindings[]>('SELECT * FROM dances').all();

const getGroups = () =>
  db
    .query<RecitalGroupRow, SQLQueryBindings[]>('SELECT * FROM recital_groups')
    .all()
    .map(g => ({ ...g, show_order: JSON.parse(g.show_order as unknown as string) }));

const getShows = (): ShowRow[] =>
  db
    .query<
      {
        show_id: number;
        group_order: string;
        show_description: string;
        show_time: string;
      },
      SQLQueryBindings[]
    >('SELECT show_id, group_order, show_description, show_time FROM shows ORDER BY show_id')
    .all()
    .map(r => ({ ...r, group_order: JSON.parse(r.group_order) }));

const getComboPairs = () => {
  const fixedGroupDanceIds = new Set<number>();
  for (const g of db
    .query<{ show_order: string }, SQLQueryBindings[]>(
      'SELECT show_order FROM recital_groups WHERE has_fixed_order = 1'
    )
    .all()) {
    for (const id of JSON.parse(g.show_order)) {
      if (typeof id === 'number') fixedGroupDanceIds.add(id);
    }
  }
  return db
    .query<{ dance_id_1: number; dance_id_2: number }, SQLQueryBindings[]>(
      `SELECT a.dance_id AS dance_id_1, b.dance_id AS dance_id_2
         FROM class_dances a
         JOIN class_dances b ON a.class_id = b.class_id AND a.dance_id < b.dance_id`
    )
    .all()
    .filter(r => !fixedGroupDanceIds.has(r.dance_id_1) && !fixedGroupDanceIds.has(r.dance_id_2));
};

const getPlaceholderDances = (): number[] | null => {
  const row = db
    .query<{ dance_order: string }, SQLQueryBindings[]>(
      'SELECT dance_order FROM placeholder_dances LIMIT 1'
    )
    .get();
  return row ? JSON.parse(row.dance_order) : null;
};

// Precompute optimizer scoring context (read-only, reused across requests)
const optimizerDances: DanceData[] = db
  .query<
    {
      dance_id: number;
      dance_name: string;
      dance_style: string;
      choreography: string;
      skip_overlap_checks: number;
      exclude_teachers: number;
    },
    SQLQueryBindings[]
  >(
    'SELECT dance_id, dance_name, dance_style, choreography, skip_overlap_checks, exclude_teachers FROM dances'
  )
  .all()
  .map(r => ({
    danceId: r.dance_id,
    danceName: r.dance_name,
    danceStyle: r.dance_style,
    choreography: r.choreography,
    skipOverlapChecks: r.skip_overlap_checks,
    excludeTeachers: r.exclude_teachers,
  }));

const excludeTeacherDanceIds = new Set(
  optimizerDances.filter(d => d.excludeTeachers).map(d => d.danceId)
);
const teacherNames = new Set(
  db
    .query<{ dancer_name: string }, SQLQueryBindings[]>(
      'SELECT dancer_name FROM dancers WHERE is_teacher = 1'
    )
    .all()
    .map(r => r.dancer_name)
);

const optimizerDancersByDance = new Map<number, string[]>();
for (const r of db
  .query<{ dance_id: number; dancer_name: string }, SQLQueryBindings[]>(
    `SELECT DISTINCT d.dance_id, dc.dancer_name
     FROM dances d
     INNER JOIN class_dances cd ON d.dance_id = cd.dance_id
     INNER JOIN dancer_classes dc ON cd.class_id = dc.class_id`
  )
  .all()) {
  if (excludeTeacherDanceIds.has(r.dance_id) && teacherNames.has(r.dancer_name)) continue;
  if (!optimizerDancersByDance.has(r.dance_id)) optimizerDancersByDance.set(r.dance_id, []);
  optimizerDancersByDance.get(r.dance_id)!.push(r.dancer_name);
}

const showRows = getShows();
const optimizerShowParts: ShowPart[] = showRows.map(r => ({
  showId: r.show_id,
  groups: r.group_order,
}));
const optimizerGroupNames = [...new Set(optimizerShowParts.flatMap(s => s.groups))].sort();

const fixedOrderGroupNames = new Set(
  db
    .query<{ recital_group: string }, SQLQueryBindings[]>(
      'SELECT recital_group FROM recital_groups WHERE has_fixed_order = 1'
    )
    .all()
    .map(r => r.recital_group)
);

const comboPairsData = getComboPairs();
const comboPairsTuples: [number, number][] = comboPairsData.map(r => [r.dance_id_1, r.dance_id_2]);

const scoringCtx = buildScoringContext(
  optimizerDances,
  optimizerDancersByDance,
  optimizerGroupNames,
  optimizerShowParts,
  comboPairsTuples,
  fixedOrderGroupNames
);

const OPTIMIZE_CONFIG: AnnealConfig = {
  initialTemp: 5000,
  coolingRate: 0.9997,
  iterations: 200_000,
  restarts: 3,
};

const server = Bun.serve({
  routes: {
    '/': indexHTML,
  },
  async fetch(req) {
    const path = new URL(req.url).pathname;

    if (path === '/api/data') return Response.json(getShowOrderData());
    if (path === '/api/dances') return Response.json(getDances());
    if (path === '/api/groups') return Response.json(getGroups());
    if (path === '/api/shows') return Response.json(getShows());
    if (path === '/api/combo-pairs') return Response.json(getComboPairs());
    if (path === '/api/placeholder-dances') return Response.json(getPlaceholderDances());

    if (path === '/api/optimize' && req.method === 'POST') {
      const body = (await req.json()) as GroupOrders;
      const { topSolutions } = anneal(body, scoringCtx, OPTIMIZE_CONFIG, 1);
      if (topSolutions.length === 0) return Response.json(body);
      return Response.json(topSolutions[0].solution satisfies GroupOrders);
    }

    return new Response('Page not found', { status: 404 });
  },
});

console.log(`Listening on ${server.url}`);
