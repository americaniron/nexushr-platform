/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Admin V2 API Routes — RBAC-protected admin operations
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Env } from '../index';
import {
  RBACService, ImpersonationService, AlertingService, FleetConfigService,
  EmployeeManagementService, SystemHealthService, ADMIN_ENGINE_SCHEMA,
  ROLE_PERMISSIONS, type AdminRole,
} from '../lib/admin-engine';

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handleAdminV2(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const method = request.method;
  const rbac = new RBACService(env);

  try {
    // ── Schema Init ──
    if (path === '/api/admin-v2/init' && method === 'POST') {
      for (const sql of ADMIN_ENGINE_SCHEMA) {
        await env.DB.prepare(sql).run();
      }
      return json({ success: true, message: 'Admin engine schema initialized' });
    }

    // ═══════════════════════════════════════════════════
    // RBAC ENDPOINTS
    // ═══════════════════════════════════════════════════

    // ── Check own permissions ──
    if (path === '/api/admin-v2/me' && method === 'GET') {
      const admin = await rbac.getAdminUser(userId);
      if (!admin) return json({ error: 'Not an admin user', code: 'NOT_ADMIN' }, 403);
      return json({ success: true, data: { admin } });
    }

    // ── List admin users (requires admin.manage) ──
    if (path === '/api/admin-v2/users' && method === 'GET') {
      await rbac.requirePermission(userId, 'admin.manage');
      const admins = await rbac.listAdminUsers();
      return json({ success: true, data: { admins } });
    }

    // ── Create admin user ──
    if (path === '/api/admin-v2/users' && method === 'POST') {
      await rbac.requirePermission(userId, 'admin.manage');
      const body = await request.json() as any;
      if (!body.userId || !body.email || !body.role) {
        return json({ error: 'userId, email, and role are required' }, 400);
      }
      if (!(body.role in ROLE_PERMISSIONS)) {
        return json({ error: `Invalid role. Must be one of: ${Object.keys(ROLE_PERMISSIONS).join(', ')}` }, 400);
      }
      const admin = await rbac.createAdminUser({ userId: body.userId, email: body.email, role: body.role, createdBy: userId });
      await rbac.logAudit(userId, 'admin_created', { targetUserId: body.userId, role: body.role });
      return json({ success: true, data: { admin } });
    }

    // ── Update admin role ──
    if (path.match(/^\/api\/admin-v2\/users\/[^/]+\/role$/) && method === 'PUT') {
      await rbac.requirePermission(userId, 'admin.manage');
      const targetId = path.split('/')[4];
      const body = await request.json() as any;
      const admin = await rbac.updateRole(targetId, body.role as AdminRole, userId);
      return json({ success: true, data: { admin } });
    }

    // ── Remove admin user ──
    if (path.match(/^\/api\/admin-v2\/users\/[^/]+$/) && method === 'DELETE') {
      await rbac.requirePermission(userId, 'admin.manage');
      const targetId = path.split('/')[4];
      await rbac.removeAdminUser(targetId, userId);
      return json({ success: true });
    }

    // ── Audit log ──
    if (path === '/api/admin-v2/audit' && method === 'GET') {
      await rbac.requirePermission(userId, 'audit.read');
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const rows = await env.DB.prepare('SELECT * FROM admin_audit_log ORDER BY timestamp DESC LIMIT ?').bind(limit).all();
      return json({ success: true, data: { entries: rows.results } });
    }

    // ═══════════════════════════════════════════════════
    // IMPERSONATION ENDPOINTS
    // ═══════════════════════════════════════════════════

    if (path === '/api/admin-v2/impersonate/start' && method === 'POST') {
      await rbac.requirePermission(userId, 'users.impersonate');
      const body = await request.json() as any;
      if (!body.targetUserId || !body.reason) return json({ error: 'targetUserId and reason required' }, 400);
      const imp = new ImpersonationService(env);
      const session = await imp.startSession({
        adminUserId: userId, targetUserId: body.targetUserId,
        targetEmail: body.targetEmail || '', reason: body.reason,
        durationMinutes: body.durationMinutes,
      });
      await rbac.logAudit(userId, 'impersonation_started', { targetUserId: body.targetUserId, sessionId: session.id });
      return json({ success: true, data: { session } });
    }

    if (path === '/api/admin-v2/impersonate/end' && method === 'POST') {
      const imp = new ImpersonationService(env);
      const session = await imp.getActiveSession(userId);
      if (!session) return json({ error: 'No active impersonation session' }, 404);
      await imp.endSession(session.id);
      await rbac.logAudit(userId, 'impersonation_ended', { sessionId: session.id, actionsPerformed: session.actionsPerformed });
      return json({ success: true });
    }

    if (path === '/api/admin-v2/impersonate/current' && method === 'GET') {
      const imp = new ImpersonationService(env);
      const session = await imp.getActiveSession(userId);
      return json({ success: true, data: { session } });
    }

    if (path === '/api/admin-v2/impersonate/history' && method === 'GET') {
      await rbac.requirePermission(userId, 'audit.read');
      const imp = new ImpersonationService(env);
      const sessions = await imp.getSessionHistory();
      return json({ success: true, data: { sessions } });
    }

    // ═══════════════════════════════════════════════════
    // ALERTING ENDPOINTS
    // ═══════════════════════════════════════════════════

    if (path === '/api/admin-v2/alerts/rules' && method === 'GET') {
      await rbac.requirePermission(userId, 'alerts.read');
      const rows = await env.DB.prepare('SELECT * FROM alert_rules ORDER BY created_at DESC').all();
      return json({ success: true, data: { rules: rows.results } });
    }

    if (path === '/api/admin-v2/alerts/rules' && method === 'POST') {
      await rbac.requirePermission(userId, 'alerts.write');
      const body = await request.json() as any;
      const alerting = new AlertingService(env);
      const rule = await alerting.createRule(body);
      return json({ success: true, data: { rule } });
    }

    if (path === '/api/admin-v2/alerts/active' && method === 'GET') {
      await rbac.requirePermission(userId, 'alerts.read');
      const alerting = new AlertingService(env);
      const alerts = await alerting.getActiveAlerts();
      return json({ success: true, data: { alerts } });
    }

    if (path === '/api/admin-v2/alerts/history' && method === 'GET') {
      await rbac.requirePermission(userId, 'alerts.read');
      const alerting = new AlertingService(env);
      const alerts = await alerting.getAlertHistory();
      return json({ success: true, data: { alerts } });
    }

    if (path.match(/^\/api\/admin-v2\/alerts\/[^/]+\/acknowledge$/) && method === 'POST') {
      await rbac.requirePermission(userId, 'alerts.acknowledge');
      const alertId = path.split('/')[4];
      const alerting = new AlertingService(env);
      await alerting.acknowledgeAlert(alertId, userId);
      return json({ success: true });
    }

    if (path.match(/^\/api\/admin-v2\/alerts\/[^/]+\/resolve$/) && method === 'POST') {
      await rbac.requirePermission(userId, 'alerts.acknowledge');
      const alertId = path.split('/')[4];
      const alerting = new AlertingService(env);
      await alerting.resolveAlert(alertId);
      return json({ success: true });
    }

    if (path.match(/^\/api\/admin-v2\/alerts\/[^/]+\/silence$/) && method === 'POST') {
      await rbac.requirePermission(userId, 'alerts.write');
      const alertId = path.split('/')[4];
      const body = await request.json() as any;
      const alerting = new AlertingService(env);
      await alerting.silenceAlert(alertId, body.durationMinutes || 60);
      return json({ success: true });
    }

    if (path === '/api/admin-v2/alerts/evaluate' && method === 'POST') {
      await rbac.requirePermission(userId, 'alerts.write');
      const alerting = new AlertingService(env);
      const newAlerts = await alerting.evaluateRules();
      return json({ success: true, data: { triggered: newAlerts.length, alerts: newAlerts } });
    }

    // ── Metrics ──
    if (path === '/api/admin-v2/metrics/record' && method === 'POST') {
      const body = await request.json() as any;
      const alerting = new AlertingService(env);
      await alerting.recordMetric(body.name, body.value, body.labels);
      return json({ success: true });
    }

    if (path === '/api/admin-v2/metrics/query' && method === 'GET') {
      await rbac.requirePermission(userId, 'metrics.read');
      const url = new URL(request.url);
      const name = url.searchParams.get('name') || '';
      const window = parseInt(url.searchParams.get('window') || '60');
      const alerting = new AlertingService(env);
      const series = await alerting.getMetricTimeseries(name, window);
      const current = await alerting.getMetricValue(name, 5);
      return json({ success: true, data: { name, current, series } });
    }

    // ═══════════════════════════════════════════════════
    // FLEET CONFIGURATION ENDPOINTS
    // ═══════════════════════════════════════════════════

    if (path === '/api/admin-v2/fleet' && method === 'GET') {
      await rbac.requirePermission(userId, 'fleet.read');
      const fleet = new FleetConfigService(env);
      const providers = await fleet.getProviders();
      return json({ success: true, data: { providers } });
    }

    if (path === '/api/admin-v2/fleet' && method === 'POST') {
      await rbac.requirePermission(userId, 'fleet.write');
      const body = await request.json() as any;
      const fleet = new FleetConfigService(env);
      const provider = await fleet.upsertProvider({ ...body, updatedBy: userId });
      await rbac.logAudit(userId, 'fleet_config_changed', { providerId: provider.id, model: provider.model });
      return json({ success: true, data: { provider } });
    }

    if (path.match(/^\/api\/admin-v2\/fleet\/[^/]+$/) && method === 'DELETE') {
      await rbac.requirePermission(userId, 'fleet.write');
      const id = path.split('/')[4];
      const fleet = new FleetConfigService(env);
      await fleet.deleteProvider(id);
      return json({ success: true });
    }

    // ═══════════════════════════════════════════════════
    // AI EMPLOYEE MANAGEMENT ENDPOINTS
    // ═══════════════════════════════════════════════════

    if (path === '/api/admin-v2/employees' && method === 'GET') {
      await rbac.requirePermission(userId, 'employees.read');
      const empMgmt = new EmployeeManagementService(env);
      const configs = await empMgmt.getEmployeeConfigs();
      return json({ success: true, data: { employees: configs } });
    }

    if (path.match(/^\/api\/admin-v2\/employees\/[^/]+$/) && method === 'GET') {
      await rbac.requirePermission(userId, 'employees.read');
      const empId = path.split('/')[4];
      const empMgmt = new EmployeeManagementService(env);
      const config = await empMgmt.getEmployeeConfig(empId);
      if (!config) return json({ error: 'Employee config not found' }, 404);
      return json({ success: true, data: { employee: config } });
    }

    if (path === '/api/admin-v2/employees' && method === 'POST') {
      await rbac.requirePermission(userId, 'employees.write');
      const body = await request.json() as any;
      if (!body.employeeId) return json({ error: 'employeeId required' }, 400);
      const empMgmt = new EmployeeManagementService(env);
      const config = await empMgmt.upsertEmployeeConfig({ ...body, updatedBy: userId });
      await rbac.logAudit(userId, 'employee_config_changed', { employeeId: body.employeeId, version: config.version });
      return json({ success: true, data: { employee: config } });
    }

    if (path.match(/^\/api\/admin-v2\/employees\/[^/]+\/prompt$/) && method === 'PUT') {
      await rbac.requirePermission(userId, 'employees.prompts');
      const empId = path.split('/')[4];
      const body = await request.json() as any;
      const empMgmt = new EmployeeManagementService(env);
      const config = await empMgmt.upsertEmployeeConfig({
        employeeId: empId,
        systemPrompt: body.systemPrompt,
        personalityParams: body.personalityParams,
        temperatureOverride: body.temperatureOverride,
        updatedBy: userId,
      });
      await rbac.logAudit(userId, 'employee_prompt_edited', { employeeId: empId });
      return json({ success: true, data: { employee: config } });
    }

    if (path.match(/^\/api\/admin-v2\/employees\/[^/]+\/history$/) && method === 'GET') {
      await rbac.requirePermission(userId, 'employees.read');
      const empId = path.split('/')[4];
      const empMgmt = new EmployeeManagementService(env);
      const history = await empMgmt.getConfigHistory(empId);
      return json({ success: true, data: { history } });
    }

    if (path.match(/^\/api\/admin-v2\/employees\/[^/]+\/rollback$/) && method === 'POST') {
      await rbac.requirePermission(userId, 'employees.write');
      const empId = path.split('/')[4];
      const body = await request.json() as any;
      const empMgmt = new EmployeeManagementService(env);
      const config = await empMgmt.rollbackConfig(empId, body.targetVersion, userId);
      if (!config) return json({ error: 'Version not found' }, 404);
      await rbac.logAudit(userId, 'employee_config_rollback', { employeeId: empId, toVersion: body.targetVersion });
      return json({ success: true, data: { employee: config } });
    }

    // ═══════════════════════════════════════════════════
    // SYSTEM HEALTH DASHBOARD
    // ═══════════════════════════════════════════════════

    if (path === '/api/admin-v2/health' && method === 'GET') {
      await rbac.requirePermission(userId, 'metrics.read');
      const health = new SystemHealthService(env);
      const status = await health.getHealth();
      return json({ success: true, data: status });
    }

    // ── Admin Dashboard (comprehensive) ──
    if (path === '/api/admin-v2/dashboard' && method === 'GET') {
      await rbac.requirePermission(userId, 'metrics.read');

      const [health, activeAlerts, admins] = await Promise.all([
        new SystemHealthService(env).getHealth(),
        new AlertingService(env).getActiveAlerts(),
        rbac.listAdminUsers(),
      ]);

      // Subscriber stats
      const userStats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_users,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subs
        FROM customer_billing
      `).first();

      // Trial stats
      const trialStats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_trials,
          SUM(CASE WHEN status = 'active' OR status = 'extended' THEN 1 ELSE 0 END) as active_trials,
          SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted
        FROM trial_accounts
      `).first();

      // Fleet status
      const fleetProviders = await new FleetConfigService(env).getProviders();

      // Employee count
      const empCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM employee_configs WHERE active = 1').first<{ cnt: number }>();

      return json({
        success: true,
        data: {
          health,
          activeAlerts,
          adminCount: admins.length,
          subscribers: {
            total: (userStats?.total_users as number) || 0,
            active: (userStats?.active_subs as number) || 0,
          },
          trials: {
            total: (trialStats?.total_trials as number) || 0,
            active: (trialStats?.active_trials as number) || 0,
            converted: (trialStats?.converted as number) || 0,
          },
          fleet: {
            providers: fleetProviders.length,
            enabled: fleetProviders.filter(p => p.enabled).length,
          },
          employees: {
            active: empCount?.cnt || 0,
          },
        },
      });
    }

    return json({ error: 'Not Found', code: 'ADMIN_V2_NOT_FOUND' }, 404);
  } catch (err: any) {
    if (err.message?.includes('Permission denied') || err.message?.includes('Not an admin')) {
      return json({ error: err.message, code: 'PERMISSION_DENIED' }, 403);
    }
    console.error('Admin V2 error:', err);
    return json({ error: err.message || 'Internal error', code: 'ADMIN_ERROR' }, 500);
  }
}
