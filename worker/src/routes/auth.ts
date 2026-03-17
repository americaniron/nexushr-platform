import type { Env } from '../index';
import { json, generateId, parseBody } from '../lib/helpers';
import { createSession, hashPassword } from '../lib/auth';

export async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (path === '/api/auth/signup') {
    return handleSignup(request, env);
  }
  if (path === '/api/auth/login') {
    return handleLogin(request, env);
  }
  if (path === '/api/auth/demo') {
    return handleDemoLogin(request, env);
  }
  if (path === '/api/auth/logout') {
    return handleLogout(request, env);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleSignup(request: Request, env: Env): Promise<Response> {
  const { name, email, password } = await parseBody<{ name: string; email: string; password: string }>(request);

  if (!name || !email || !password) {
    return json({ error: 'Name, email, and password are required' }, 400);
  }
  if (password.length < 8) {
    return json({ error: 'Password must be at least 8 characters' }, 400);
  }

  // Check if user exists
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    return json({ error: 'Email already registered' }, 409);
  }

  const userId = generateId('usr');
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, system_role, trial_started_at, trial_days_remaining)
     VALUES (?, ?, ?, ?, 'owner', 'member', datetime('now'), 7)`
  ).bind(userId, name, email, passwordHash).run();

  // Create session
  const token = await createSession(env, userId, 'member');

  // Audit log
  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId('aud'), userId, 'signup', email, 'account', `New signup: ${name}`).run();

  return json({
    success: true,
    token,
    user: { id: userId, name, email, role: 'owner', systemRole: 'member' },
    trial: { startedAt: new Date().toISOString(), daysRemaining: 7, hoursUsed: 0, dailyLimit: 30 },
  });
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const { email, password } = await parseBody<{ email: string; password: string }>(request);

  if (!email || !password) {
    return json({ error: 'Email and password are required' }, 400);
  }

  // Rate limiting via KV
  const rateLimitKey = `rate_limit:login:${email}`;
  const rateLimitRaw = await env.SESSIONS.get(rateLimitKey);
  const rateLimit = rateLimitRaw ? JSON.parse(rateLimitRaw) : { attempts: 0, lockedUntil: null };

  if (rateLimit.lockedUntil && Date.now() < rateLimit.lockedUntil) {
    return json({ error: 'Too many login attempts. Try again later.', lockedUntil: new Date(rateLimit.lockedUntil).toISOString() }, 429);
  }

  const passwordHash = await hashPassword(password);
  const user = await env.DB.prepare(
    'SELECT id, name, email, role, system_role, plan_slug, trial_started_at, trial_days_remaining, subscription_status FROM users WHERE email = ? AND password_hash = ?'
  ).bind(email, passwordHash).first<any>();

  if (!user) {
    // Record failed attempt
    rateLimit.attempts += 1;
    if (rateLimit.attempts >= 5) {
      rateLimit.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 min lockout
    }
    await env.SESSIONS.put(rateLimitKey, JSON.stringify(rateLimit), { expirationTtl: 1800 });

    await env.DB.prepare(
      'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(generateId('aud'), null, 'login_failed', email, 'session', `Failed attempt (${5 - rateLimit.attempts} remaining)`).run();

    return json({ error: 'Invalid email or password', attemptsRemaining: Math.max(0, 5 - rateLimit.attempts) }, 401);
  }

  // Reset rate limit on success
  await env.SESSIONS.delete(rateLimitKey);

  const token = await createSession(env, user.id, user.system_role);

  // Get hired employees
  const hired = await env.DB.prepare('SELECT employee_id FROM hired_employees WHERE user_id = ?').bind(user.id).all<any>();

  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId('aud'), user.id, 'login', email, 'session', 'Credential login success').run();

  return json({
    success: true,
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, systemRole: user.system_role },
    trial: user.trial_started_at ? {
      startedAt: user.trial_started_at,
      daysRemaining: user.trial_days_remaining,
      hoursUsed: 0,
      dailyLimit: 30,
    } : null,
    subscription: user.subscription_status ? { status: user.subscription_status } : null,
    plan: user.plan_slug,
    hiredEmployees: hired.results?.map((r: any) => r.employee_id) || [],
  });
}

async function handleDemoLogin(request: Request, env: Env): Promise<Response> {
  const { mode } = await parseBody<{ mode: string }>(request);

  // Create or get demo user
  const demoId = `demo_${mode}`;
  const demoEmail = `${mode}@nexushr.ai`;

  let user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(demoId).first<any>();
  if (!user) {
    await env.DB.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, system_role, plan_slug, trial_started_at, trial_days_remaining, subscription_status)
       VALUES (?, ?, ?, ?, 'owner', ?, ?, datetime('now'), 7, ?)`
    ).bind(
      demoId,
      mode === 'admin' ? 'Platform Admin' : 'Ahmed',
      demoEmail,
      'demo_no_password',
      mode === 'admin' ? 'super_admin' : 'member',
      mode === 'subscribed' ? 'growth' : null,
      mode === 'subscribed' || mode === 'admin' ? 'active' : null,
    ).run();
  }

  const role = mode === 'admin' ? 'super_admin' : 'member';
  const token = await createSession(env, demoId, role);

  return json({
    success: true,
    token,
    mode,
    user: { id: demoId, name: mode === 'admin' ? 'Platform Admin' : 'Ahmed', email: demoEmail, role: 'owner', systemRole: role },
  });
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || request.headers.get('X-Session-Token');
  if (token) {
    await env.SESSIONS.delete(token);
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
  }
  return json({ success: true });
}
