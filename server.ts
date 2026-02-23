import { Database, SQLQueryBindings } from 'bun:sqlite';
import indexHTML from './src/index.html';
import { anneal } from './src/optimizer/anneal';
import { buildScoringContext } from './src/optimizer/score';
import type { AnnealConfig, DanceData, Solution } from './src/optimizer/types';
import { DanceRow, GroupOrders, RecitalDanceInstance, RecitalGroupRow } from './src/types';

const db = new Database(`./build/database.db`);

const getRecitalOrderData = () =>
  db
    .query<RecitalDanceInstance, SQLQueryBindings[]>('SELECT * FROM consecutive_dances_tracker')
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

const getComboPairs = () =>
  db
    .query<{ dance_id_1: number; dance_id_2: number }, SQLQueryBindings[]>(
      `SELECT a.dance_id AS dance_id_1, b.dance_id AS dance_id_2
         FROM class_dances a
         JOIN class_dances b ON a.class_id = b.class_id AND a.dance_id < b.dance_id
         JOIN classes c ON a.class_id = c.class_id
        WHERE c.class_name LIKE '%Combo%'`
    )
    .all();

// Precompute optimizer scoring context (read-only, reused across requests)
const optimizerDances: DanceData[] = db
  .query<
    { dance_id: number; dance_name: string; dance_style: string; choreography: string },
    SQLQueryBindings[]
  >('SELECT dance_id, dance_name, dance_style, choreography FROM dances')
  .all()
  .map(r => ({
    danceId: r.dance_id,
    danceName: r.dance_name,
    danceStyle: r.dance_style,
    choreography: r.choreography,
  }));

const optimizerDancersByDance = new Map<number, string[]>();
for (const r of db
  .query<{ dance_id: number; dancer_name: string }, SQLQueryBindings[]>(
    `SELECT DISTINCT d.dance_id, dc.dancer_name
     FROM dances d
     INNER JOIN class_dances cd ON d.dance_id = cd.dance_id
     INNER JOIN dancer_classes dc ON cd.class_id = dc.class_id
    WHERE NOT (d.dance_name = 'SpecTAPular' AND dc.dancer_name IN (
      SELECT dancer_name FROM dancers WHERE is_teacher = 1
    ))`
  )
  .all()) {
  if (!optimizerDancersByDance.has(r.dance_id)) optimizerDancersByDance.set(r.dance_id, []);
  optimizerDancersByDance.get(r.dance_id)!.push(r.dancer_name);
}

const scoringCtx = buildScoringContext(optimizerDances, optimizerDancersByDance);

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

    if (path === '/api/data') return Response.json(getRecitalOrderData());
    if (path === '/api/dances') return Response.json(getDances());
    if (path === '/api/groups') return Response.json(getGroups());
    if (path === '/api/combo-pairs') return Response.json(getComboPairs());

    if (path === '/api/optimize' && req.method === 'POST') {
      const body = (await req.json()) as GroupOrders;
      const solution: Solution = { A: body.A, B: body.B, C: body.C };
      const { topSolutions } = anneal(solution, scoringCtx, OPTIMIZE_CONFIG, 1);
      if (topSolutions.length === 0) return Response.json(body);
      const best = topSolutions[0].solution;
      return Response.json({ A: best.A, B: best.B, C: best.C } satisfies GroupOrders);
    }

    return new Response('Page not found', { status: 404 });
  },
});

console.log(`Listening on ${server.url}`);
