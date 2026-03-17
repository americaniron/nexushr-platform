import type { Env } from '../index';

export function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCORS(request: Request, env: Env): Response {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}
