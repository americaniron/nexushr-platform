/**
 * Admin API — Platform administration, analytics, and management
 */
import type { Env } from '../index';
import { json, generateId, parseBody } from '../lib/helpers';

export async function handleAdmin(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  // Verify admin role
  const session = await env.SESSIONS.get(request.headers.get('Authorization')?.replace('Bearer ', '') || request.headers.get('X-Session-Token') || '');
  if (session) {
    const parsed = JSON.parse(session);
    if (parsed.role !== 'super_admin') {
      return json({ error: 'Admin access required' }, 403);
    }
  }

  if (path === '/api/admin/stats' && request.method === 'GET') {
    return handleStats(env);
  }
  if (path === '/api/admin/users' && request.method === 'GET') {
    return handleListUsers(env);
  }
  if (path === '/api/admin/audit' && request.method === 'GET') {
    return handleAuditLog(request, env);
  }
  if (path === '/api/admin/usage' && request.method === 'GET') {
    return handleUsageStats(request, env);
  }
  if (path === '/api/admin/integrations' && request.method === 'GET') {
    return handleIntegrationStats(env);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleStats(env: Env): Promise<Response> {
  const [userCount, messageCount, toolCount, collabCount, integrationCount] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) as count FROM users').first<any>(),
    env.DB.prepare('SELECT COUNT(*) as count FROM chat_messages').first<any>(),
    env.DB.prepare('SELECT COUNT(*) as count FROM tool_executions').first<any>(),
    env.DB.prepare('SELECT COUNT(*) as count FROM agent_collaborations').first<any>(),
    env.DB.prepare('SELECT COUNT(*) as count FROM user_integrations WHERE status = ?').bind('connected').first<any>(),
  ]);

  return json({
    success: true,
    data: {
      users: userCount?.count || 0,
      messages: messageCount?.count || 0,
      toolExecutions: toolCount?.count || 0,
      collaborations: collabCount?.count || 0,
      activeIntegrations: integrationCount?.count || 0,
      timestamp: new Date().toISOString(),
    },
  });
}

async function handleListUsers(env: Env): Promise<Response> {
  const users = await env.DB.prepare(
    'SELECT id, name, email, role, system_role, plan_slug, subscription_status, created_at FROM users ORDER BY created_at DESC LIMIT 100'
  ).all<any>();

  return json({
    success: true,
    data: users.results || [],
  });
}

async function handleAuditLog(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const action = url.searchParams.get('action');

  let query = 'SELECT * FROM audit_log';
  const params: any[] = [];

  if (action) {
    query += ' WHERE action = ?';
    params.push(action);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const logs = await env.DB.prepare(query).bind(...params).all<any>();

  return json({
    success: true,
    data: logs.results || [],
  });
}

async function handleUsageStats(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '30');

  const usage = await env.DB.prepare(
    `SELECT date, SUM(tasks) as tasks, SUM(compute_hours) as compute, SUM(cost) as cost, SUM(llm_tokens) as tokens, SUM(tool_executions) as tools
     FROM usage_records
     WHERE date >= date('now', '-' || ? || ' days')
     GROUP BY date
     ORDER BY date ASC`
  ).bind(days).all<any>();

  return json({
    success: true,
    data: usage.results || [],
  });
}

async function handleIntegrationStats(env: Env): Promise<Response> {
  const stats = await env.DB.prepare(
    `SELECT i.name, i.category, COUNT(ui.id) as connected_users
     FROM integrations i
     LEFT JOIN user_integrations ui ON i.id = ui.integration_id AND ui.status = 'connected'
     GROUP BY i.id
     ORDER BY connected_users DESC`
  ).all<any>();

  return json({
    success: true,
    data: stats.results || [],
  });
}
