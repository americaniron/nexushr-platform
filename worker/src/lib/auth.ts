import type { Env } from '../index';

interface AuthResult {
  authenticated: boolean;
  userId?: string;
  role?: string;
}

export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  const sessionToken = request.headers.get('X-Session-Token');
  const token = authHeader?.replace('Bearer ', '') || sessionToken;

  if (!token) {
    return { authenticated: false };
  }

  // Look up session in KV
  const sessionData = await env.SESSIONS.get(token);
  if (!sessionData) {
    return { authenticated: false };
  }

  try {
    const session = JSON.parse(sessionData);
    if (new Date(session.expiresAt) < new Date()) {
      await env.SESSIONS.delete(token);
      return { authenticated: false };
    }
    return { authenticated: true, userId: session.userId, role: session.role };
  } catch {
    return { authenticated: false };
  }
}

export async function createSession(env: Env, userId: string, role: string): Promise<string> {
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  await env.SESSIONS.put(token, JSON.stringify({ userId, role, expiresAt }), {
    expirationTtl: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  // Also store in D1
  await env.DB.prepare(
    'INSERT OR REPLACE INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime("now"), ?)'
  ).bind(token, userId, expiresAt).run();

  return token;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_nexushr_salt_v2');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
