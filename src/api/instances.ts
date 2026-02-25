import type { Env } from '../env';

export async function handleInstances(request: Request, env: Env): Promise<Response> {
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT id, name, year, is_archived, created_at, config FROM recital_instances ORDER BY year DESC'
    ).all();
    return Response.json(results);
  }

  if (request.method === 'POST') {
    const body = (await request.json()) as { name: string; year: number; config?: string };
    if (!body.name || !body.year) {
      return Response.json({ error: 'name and year are required' }, { status: 400 });
    }
    const result = await env.DB.prepare(
      'INSERT INTO recital_instances (name, year, config) VALUES (?, ?, ?) RETURNING id, name, year, is_archived, created_at, config'
    )
      .bind(body.name, body.year, body.config ?? null)
      .first();
    return Response.json(result, { status: 201 });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
