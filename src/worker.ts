import { handleApiRequest } from './api/router';
import type { Env } from './env';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }

    // For non-API routes, serve static assets (handled by Cloudflare assets binding)
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
