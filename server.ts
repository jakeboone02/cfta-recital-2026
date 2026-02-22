import { Database, SQLQueryBindings } from 'bun:sqlite';
import indexHTML from './src/index.html';
import { RecitalDanceInstance } from './src/types';

const db = new Database(`./build/database.db`);

const getRecitalOrderData = async () =>
  db
    .query<RecitalDanceInstance, SQLQueryBindings[]>('SELECT * FROM consecutive_dances_tracker')
    .all()
    .map(d => ({
      ...d,
      dancer_list: JSON.parse(d.dancer_list as unknown as string),
      common_with_next: JSON.parse(d.common_with_next as unknown as string),
      common_with_next2: JSON.parse(d.common_with_next2 as unknown as string),
    }));

const server = Bun.serve({
  routes: {
    '/': indexHTML,
  },
  async fetch(req) {
    const path = new URL(req.url).pathname;

    if (path === '/api/data') return Response.json(await getRecitalOrderData());

    if (req.method === 'POST' && path === '/api/sort') {
      const data = await req.json();
      console.log('Received JSON:', data);
      // updateOrder(data);
      return Response.json({ success: true, data });
    }

    return new Response('Page not found', { status: 404 });
  },
});

console.log(`Listening on ${server.url}`);
