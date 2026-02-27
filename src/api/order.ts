import type { Env } from '../env';

export async function handleOrder(
  request: Request,
  env: Env,
  instanceId: number
): Promise<Response> {
  if (request.method === 'GET') {
    const order = await env.DB.prepare(
      'SELECT group_orders FROM saved_orders WHERE recital_instance_id = ?'
    )
      .bind(instanceId)
      .first();
    const bookmarks = await env.DB.prepare(
      'SELECT name, group_orders, saved_at FROM bookmarks WHERE recital_instance_id = ? ORDER BY saved_at'
    )
      .bind(instanceId)
      .all();
    return Response.json({
      groupOrders: order ? JSON.parse(order.group_orders as string) : null,
      bookmarks: bookmarks.results.map((b: any) => ({
        name: b.name,
        groups: JSON.parse(b.group_orders),
        savedAt: b.saved_at,
      })),
    });
  }

  if (request.method === 'PUT') {
    const body = (await request.json()) as { groupOrders: Record<string, any> };
    const json = JSON.stringify(body.groupOrders);
    await env.DB.prepare(
      `INSERT INTO saved_orders (recital_instance_id, group_orders, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT (recital_instance_id) DO UPDATE SET group_orders = excluded.group_orders, updated_at = excluded.updated_at`
    )
      .bind(instanceId, json)
      .run();
    return Response.json({ ok: true });
  }

  // Bookmark operations via POST/DELETE
  if (request.method === 'POST') {
    const body = (await request.json()) as { name: string; groupOrders: Record<string, any> };
    if (!body.name) return Response.json({ error: 'name required' }, { status: 400 });
    try {
      await env.DB.prepare(
        'INSERT INTO bookmarks (recital_instance_id, name, group_orders) VALUES (?, ?, ?)'
      )
        .bind(instanceId, body.name, JSON.stringify(body.groupOrders))
        .run();
      return Response.json({ ok: true }, { status: 201 });
    } catch {
      return Response.json({ error: 'Bookmark name already exists' }, { status: 409 });
    }
  }

  if (request.method === 'PATCH') {
    const body = (await request.json()) as { oldName: string; newName: string };
    if (!body.oldName || !body.newName)
      return Response.json({ error: 'oldName and newName required' }, { status: 400 });
    try {
      await env.DB.prepare(
        'UPDATE bookmarks SET name = ? WHERE recital_instance_id = ? AND name = ?'
      )
        .bind(body.newName, instanceId, body.oldName)
        .run();
      return Response.json({ ok: true });
    } catch {
      return Response.json({ error: 'Bookmark name already exists' }, { status: 409 });
    }
  }

  if (request.method === 'DELETE') {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (!name) return Response.json({ error: 'name query param required' }, { status: 400 });
    await env.DB.prepare('DELETE FROM bookmarks WHERE recital_instance_id = ? AND name = ?')
      .bind(instanceId, name)
      .run();
    return Response.json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
