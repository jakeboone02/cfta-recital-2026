import type { Env } from '../env';
import { checkAuth, handleLogin } from './auth';
import { handleCsvUpload } from './csv-upload';
import { handleData } from './data';
import { handleInstances } from './instances';
import { handleOrder } from './order';
import { handleTables } from './tables';

export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Login endpoint is public
  if (path === '/api/auth' && request.method === 'POST') {
    return handleLogin(request, env);
  }

  // All other API routes require auth
  const authError = checkAuth(request, env);
  if (authError) return authError;

  // Route matching
  if (path === '/api/instances') return handleInstances(request, env);

  const instanceMatch = path.match(/^\/api\/instances\/(\d+)\/(.+)$/);
  if (instanceMatch) {
    const instanceId = parseInt(instanceMatch[1], 10);
    const sub = instanceMatch[2];
    if (sub === 'csv') return handleCsvUpload(request, env, instanceId);
    if (sub === 'data') return handleData(request, env, instanceId);
    if (sub === 'order') return handleOrder(request, env, instanceId);
    const tableMatch = sub.match(/^tables\/(.+)$/);
    if (tableMatch) return handleTables(request, env, instanceId, tableMatch[1]);
  }

  return new Response('Not Found', { status: 404 });
}
