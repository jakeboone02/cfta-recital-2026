import type { Env } from '../env';

const COOKIE_NAME = 'cfta_auth';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export function checkAuth(request: Request, env: Env): Response | null {
  const cookie = request.headers.get('Cookie') ?? '';
  const token = cookie
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1];

  if (token && token === String(env.RECITAL_PASSWORD ?? '')) return null; // authenticated
  return new Response('Unauthorized', { status: 401 });
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as { password?: string };
  const expected = String(env.RECITAL_PASSWORD ?? '');
  if (!body.password || !expected || body.password !== expected) {
    return Response.json({ error: 'Invalid password' }, { status: 401 });
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': `${COOKIE_NAME}=${env.RECITAL_PASSWORD}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}; Secure`,
      },
    }
  );
}
