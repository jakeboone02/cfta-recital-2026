import { Database, SQLQueryBindings } from 'bun:sqlite';
import indexHTML from './src/index.html';
import { RecitalDanceInstance, DanceRow, RecitalGroupRow } from './src/types';

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

const getDances = () =>
  db.query<DanceRow, SQLQueryBindings[]>('SELECT * FROM dances').all();

const getGroups = () =>
  db
    .query<RecitalGroupRow, SQLQueryBindings[]>('SELECT * FROM recital_groups')
    .all()
    .map(g => ({ ...g, show_order: JSON.parse(g.show_order as unknown as string) }));

const server = Bun.serve({
  routes: {
    '/': indexHTML,
  },
  fetch(req) {
    const path = new URL(req.url).pathname;

    if (path === '/api/data') return Response.json(getRecitalOrderData());
    if (path === '/api/dances') return Response.json(getDances());
    if (path === '/api/groups') return Response.json(getGroups());

    return new Response('Page not found', { status: 404 });
  },
});

console.log(`Listening on ${server.url}`);
