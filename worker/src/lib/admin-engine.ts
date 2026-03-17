/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Admin Engine — RBAC, impersonation, alerting, fleet config, employee mgmt
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. RBAC with granular permissions: super_admin, billing_admin, support_admin, readonly
 * 2. Subscriber impersonation for debugging user issues
 * 3. Real-time metrics aggregation (error rates, latency, SLA)
 * 4. Alerting system for error spikes, SLA breaches, billing failures
 * 5. Fleet configuration: LLM provider settings, model routing, rate limits
 * 6. AI employee management: prompt editing, behavior tuning, per-employee A/B config
 */

import type { Env } from '../index';

// ══════════════════════════════════════════════════════
// 1. TYPES & INTERFACES
// ══════════════════════════════════════════════════════

export type AdminRole = 'super_admin' | 'billing_admin' | 'support_admin' | 'readonly';
export type Permission =
  | 'users.read' | 'users.write' | 'users.delete' | 'users.impersonate'
  | 'billing.read' | 'billing.write' | 'billing.refund'
  | 'employees.read' | 'employees.write' | 'employees.delete' | 'employees.prompts'
  | 'fleet.read' | 'fleet.write'
  | 'alerts.read' | 'alerts.write' | 'alerts.acknowledge'
  | 'metrics.read'
  | 'audit.read'
  | 'admin.manage';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertStatus = 'firing' | 'acknowledged' | 'resolved' | 'silenced';
export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface AdminUser {
  id: string;
  userId: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
  mfaEnabled: boolean;
  lastLogin?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImpersonationSession {
  id: string;
  adminUserId: string;
  targetUserId: string;
  targetEmail: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  endedAt?: string;
  actionsPerformed: number;
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  condition: string;
  currentValue: number;
  threshold: number;
  firedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  silencedUntil?: string;
  metadata: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'spike';
  threshold: number;
  windowMinutes: number;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMinutes: number;
  notifyChannels: string[];
  createdAt: string;
}

export interface SystemMetric {
  id: string;
  name: string;
  type: MetricType;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
}

export interface FleetConfig {
  id: string;
  provider: string;
  model: string;
  apiKeyRef: string;
  maxTokens: number;
  temperature: number;
  rateLimitRpm: number;
  rateLimitTpm: number;
  priority: number;
  enabled: boolean;
  fallbackProvider?: string;
  costPerInputToken: number;
  costPerOutputToken: number;
  regions: string[];
  updatedAt: string;
  updatedBy: string;
}

export interface EmployeeConfig {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  systemPrompt: string;
  personalityParams: Record<string, number>;
  modelOverride?: string;
  temperatureOverride?: number;
  maxResponseTokens: number;
  toolsEnabled: string[];
  guardrailsProfile: string;
  abTestId?: string;
  active: boolean;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export interface HealthStatus {
  overall: 'healthy' | 'degraded' | 'down';
  uptime: number;
  components: {
    name: string;
    status: 'up' | 'degraded' | 'down';
    latencyP50: number;
    latencyP95: number;
    latencyP99: number;
    errorRate: number;
    lastCheck: string;
  }[];
  activeAlerts: number;
  requestsPerMinute: number;
  errorRate: number;
}

// ══════════════════════════════════════════════════════
// 2. RBAC SYSTEM
// ══════════════════════════════════════════════════════

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    'users.read', 'users.write', 'users.delete', 'users.impersonate',
    'billing.read', 'billing.write', 'billing.refund',
    'employees.read', 'employees.write', 'employees.delete', 'employees.prompts',
    'fleet.read', 'fleet.write',
    'alerts.read', 'alerts.write', 'alerts.acknowledge',
    'metrics.read', 'audit.read', 'admin.manage',
  ],
  billing_admin: [
    'users.read', 'billing.read', 'billing.write', 'billing.refund',
    'metrics.read', 'audit.read',
  ],
  support_admin: [
    'users.read', 'users.impersonate',
    'billing.read',
    'employees.read', 'employees.write', 'employees.prompts',
    'alerts.read', 'alerts.acknowledge',
    'metrics.read', 'audit.read',
  ],
  readonly: [
    'users.read', 'billing.read', 'employees.read', 'fleet.read',
    'alerts.read', 'metrics.read', 'audit.read',
  ],
};

export class RBACService {
  constructor(private env: Env) {}

  async getAdminUser(userId: string): Promise<AdminUser | null> {
    const row = await this.env.DB.prepare(
      'SELECT * FROM admin_users WHERE user_id = ?'
    ).bind(userId).first();
    if (!row) return null;
    return this.rowToAdmin(row);
  }

  async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    const admin = await this.getAdminUser(userId);
    if (!admin) return false;
    return admin.permissions.includes(permission);
  }

  async requirePermission(userId: string, permission: Permission): Promise<AdminUser> {
    const admin = await this.getAdminUser(userId);
    if (!admin) throw new Error('Not an admin user');
    if (!admin.permissions.includes(permission)) {
      throw new Error(`Permission denied: requires ${permission}`);
    }
    return admin;
  }

  async createAdminUser(params: {
    userId: string;
    email: string;
    role: AdminRole;
    createdBy: string;
  }): Promise<AdminUser> {
    const permissions = ROLE_PERMISSIONS[params.role];
    const now = new Date().toISOString();
    const id = `admin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    await this.env.DB.prepare(`
      INSERT INTO admin_users (id, user_id, email, role, permissions, mfa_enabled, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).bind(id, params.userId, params.email, params.role, JSON.stringify(permissions), params.createdBy, now, now).run();

    return { id, userId: params.userId, email: params.email, role: params.role, permissions, mfaEnabled: false, createdBy: params.createdBy, createdAt: now, updatedAt: now };
  }

  async updateRole(userId: string, newRole: AdminRole, updatedBy: string): Promise<AdminUser> {
    const permissions = ROLE_PERMISSIONS[newRole];
    const now = new Date().toISOString();
    await this.env.DB.prepare(
      'UPDATE admin_users SET role = ?, permissions = ?, updated_at = ? WHERE user_id = ?'
    ).bind(newRole, JSON.stringify(permissions), now, userId).run();

    await this.logAudit(updatedBy, 'role_change', { targetUserId: userId, oldRole: 'unknown', newRole });
    const admin = await this.getAdminUser(userId);
    return admin!;
  }

  async removeAdminUser(userId: string, removedBy: string): Promise<void> {
    await this.env.DB.prepare('DELETE FROM admin_users WHERE user_id = ?').bind(userId).run();
    await this.logAudit(removedBy, 'admin_removed', { targetUserId: userId });
  }

  async listAdminUsers(): Promise<AdminUser[]> {
    const rows = await this.env.DB.prepare('SELECT * FROM admin_users ORDER BY created_at').all();
    return rows.results.map(r => this.rowToAdmin(r));
  }

  async logAudit(userId: string, action: string, details: Record<string, any>): Promise<void> {
    await this.env.DB.prepare(
      'INSERT INTO admin_audit_log (id, user_id, action, details, timestamp) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      userId, action, JSON.stringify(details), new Date().toISOString()
    ).run();
  }

  private rowToAdmin(row: Record<string, unknown>): AdminUser {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      email: row.email as string,
      role: row.role as AdminRole,
      permissions: JSON.parse((row.permissions as string) || '[]'),
      mfaEnabled: !!(row.mfa_enabled as number),
      lastLogin: row.last_login as string | undefined,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}

// ══════════════════════════════════════════════════════
// 3. IMPERSONATION SERVICE
// ══════════════════════════════════════════════════════

export class ImpersonationService {
  constructor(private env: Env) {}

  async startSession(params: {
    adminUserId: string;
    targetUserId: string;
    targetEmail: string;
    reason: string;
    durationMinutes?: number;
  }): Promise<ImpersonationSession> {
    const duration = params.durationMinutes || 60;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + duration * 60 * 1000);

    // Check for existing active session
    const existing = await this.env.DB.prepare(
      "SELECT id FROM impersonation_sessions WHERE admin_user_id = ? AND ended_at IS NULL AND expires_at > ?"
    ).bind(params.adminUserId, now.toISOString()).first();
    if (existing) throw new Error('Already impersonating a user. End current session first.');

    const session: ImpersonationSession = {
      id: `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      adminUserId: params.adminUserId,
      targetUserId: params.targetUserId,
      targetEmail: params.targetEmail,
      reason: params.reason,
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      actionsPerformed: 0,
    };

    await this.env.DB.prepare(`
      INSERT INTO impersonation_sessions (id, admin_user_id, target_user_id, target_email, reason, started_at, expires_at, actions_performed)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(session.id, session.adminUserId, session.targetUserId, session.targetEmail, session.reason, session.startedAt, session.expiresAt).run();

    return session;
  }

  async endSession(sessionId: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE impersonation_sessions SET ended_at = ? WHERE id = ?'
    ).bind(new Date().toISOString(), sessionId).run();
  }

  async getActiveSession(adminUserId: string): Promise<ImpersonationSession | null> {
    const row = await this.env.DB.prepare(
      "SELECT * FROM impersonation_sessions WHERE admin_user_id = ? AND ended_at IS NULL AND expires_at > ? ORDER BY started_at DESC LIMIT 1"
    ).bind(adminUserId, new Date().toISOString()).first();
    if (!row) return null;
    return this.rowToSession(row);
  }

  async recordAction(sessionId: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE impersonation_sessions SET actions_performed = actions_performed + 1 WHERE id = ?'
    ).bind(sessionId).run();
  }

  async getSessionHistory(limit = 50): Promise<ImpersonationSession[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM impersonation_sessions ORDER BY started_at DESC LIMIT ?'
    ).bind(limit).all();
    return rows.results.map(r => this.rowToSession(r));
  }

  private rowToSession(row: Record<string, unknown>): ImpersonationSession {
    return {
      id: row.id as string,
      adminUserId: row.admin_user_id as string,
      targetUserId: row.target_user_id as string,
      targetEmail: row.target_email as string,
      reason: row.reason as string,
      startedAt: row.started_at as string,
      expiresAt: row.expires_at as string,
      endedAt: row.ended_at as string | undefined,
      actionsPerformed: row.actions_performed as number,
    };
  }
}

// ══════════════════════════════════════════════════════
// 4. ALERTING SYSTEM
// ══════════════════════════════════════════════════════

export class AlertingService {
  constructor(private env: Env) {}

  async createRule(params: Omit<AlertRule, 'id' | 'createdAt'>): Promise<AlertRule> {
    const now = new Date().toISOString();
    const rule: AlertRule = {
      ...params,
      id: `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
    };

    await this.env.DB.prepare(`
      INSERT INTO alert_rules (id, name, description, metric, condition, threshold, window_minutes, severity, enabled, cooldown_minutes, notify_channels, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(rule.id, rule.name, rule.description, rule.metric, rule.condition, rule.threshold, rule.windowMinutes, rule.severity, rule.enabled ? 1 : 0, rule.cooldownMinutes, JSON.stringify(rule.notifyChannels), now).run();

    return rule;
  }

  async evaluateRules(): Promise<Alert[]> {
    const rules = await this.env.DB.prepare("SELECT * FROM alert_rules WHERE enabled = 1").all();
    const newAlerts: Alert[] = [];

    for (const row of rules.results) {
      const rule = this.rowToRule(row);
      const currentValue = await this.getMetricValue(rule.metric, rule.windowMinutes);

      let triggered = false;
      switch (rule.condition) {
        case 'gt': triggered = currentValue > rule.threshold; break;
        case 'lt': triggered = currentValue < rule.threshold; break;
        case 'gte': triggered = currentValue >= rule.threshold; break;
        case 'lte': triggered = currentValue <= rule.threshold; break;
        case 'eq': triggered = currentValue === rule.threshold; break;
        case 'spike': {
          const baseline = await this.getMetricValue(rule.metric, rule.windowMinutes * 4);
          triggered = baseline > 0 && (currentValue / baseline) > rule.threshold;
          break;
        }
      }

      if (triggered) {
        // Check cooldown
        const lastAlert = await this.env.DB.prepare(
          "SELECT fired_at FROM alerts WHERE name = ? AND status != 'resolved' ORDER BY fired_at DESC LIMIT 1"
        ).bind(rule.name).first();

        if (lastAlert) {
          const cooldownMs = rule.cooldownMinutes * 60 * 1000;
          const lastFired = new Date(lastAlert.fired_at as string).getTime();
          if (Date.now() - lastFired < cooldownMs) continue;
        }

        const alert = await this.fireAlert({
          name: rule.name,
          description: rule.description,
          severity: rule.severity,
          source: rule.metric,
          condition: `${rule.metric} ${rule.condition} ${rule.threshold}`,
          currentValue,
          threshold: rule.threshold,
        });
        newAlerts.push(alert);
      }
    }

    return newAlerts;
  }

  async fireAlert(params: {
    name: string;
    description: string;
    severity: AlertSeverity;
    source: string;
    condition: string;
    currentValue: number;
    threshold: number;
    metadata?: Record<string, any>;
  }): Promise<Alert> {
    const now = new Date().toISOString();
    const alert: Alert = {
      id: `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      ...params,
      status: 'firing',
      firedAt: now,
      metadata: params.metadata || {},
    };

    await this.env.DB.prepare(`
      INSERT INTO alerts (id, name, description, severity, status, source, condition, current_value, threshold, fired_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(alert.id, alert.name, alert.description, alert.severity, alert.status, alert.source, alert.condition, alert.currentValue, alert.threshold, now, JSON.stringify(alert.metadata)).run();

    return alert;
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE alerts SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by = ? WHERE id = ?"
    ).bind(new Date().toISOString(), userId, alertId).run();
  }

  async resolveAlert(alertId: string): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE alerts SET status = 'resolved', resolved_at = ? WHERE id = ?"
    ).bind(new Date().toISOString(), alertId).run();
  }

  async silenceAlert(alertId: string, durationMinutes: number): Promise<void> {
    const until = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
    await this.env.DB.prepare(
      "UPDATE alerts SET status = 'silenced', silenced_until = ? WHERE id = ?"
    ).bind(until, alertId).run();
  }

  async getActiveAlerts(): Promise<Alert[]> {
    const rows = await this.env.DB.prepare(
      "SELECT * FROM alerts WHERE status IN ('firing', 'acknowledged') ORDER BY fired_at DESC"
    ).all();
    return rows.results.map(r => this.rowToAlert(r));
  }

  async getAlertHistory(limit = 100): Promise<Alert[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM alerts ORDER BY fired_at DESC LIMIT ?'
    ).bind(limit).all();
    return rows.results.map(r => this.rowToAlert(r));
  }

  // ── Metrics Ingestion ──

  async recordMetric(name: string, value: number, labels: Record<string, string> = {}): Promise<void> {
    await this.env.DB.prepare(
      'INSERT INTO system_metrics (id, name, type, value, labels, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name, 'gauge', value, JSON.stringify(labels), new Date().toISOString()
    ).run();
  }

  async getMetricValue(name: string, windowMinutes: number): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const row = await this.env.DB.prepare(
      'SELECT AVG(value) as avg_val FROM system_metrics WHERE name = ? AND timestamp > ?'
    ).bind(name, since).first<{ avg_val: number }>();
    return row?.avg_val || 0;
  }

  async getMetricTimeseries(name: string, windowMinutes: number, buckets = 30): Promise<{ time: string; value: number }[]> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
    const rows = await this.env.DB.prepare(
      'SELECT value, timestamp FROM system_metrics WHERE name = ? AND timestamp > ? ORDER BY timestamp'
    ).bind(name, since).all();

    if (rows.results.length === 0) return [];

    // Bucket into time intervals
    const bucketMs = (windowMinutes * 60 * 1000) / buckets;
    const start = Date.now() - windowMinutes * 60 * 1000;
    const result: { time: string; value: number }[] = [];

    for (let i = 0; i < buckets; i++) {
      const bucketStart = start + i * bucketMs;
      const bucketEnd = bucketStart + bucketMs;
      const bucketValues = rows.results.filter(r => {
        const t = new Date(r.timestamp as string).getTime();
        return t >= bucketStart && t < bucketEnd;
      });
      const avg = bucketValues.length > 0
        ? bucketValues.reduce((s, r) => s + (r.value as number), 0) / bucketValues.length
        : 0;
      result.push({ time: new Date(bucketStart).toISOString(), value: Math.round(avg * 100) / 100 });
    }

    return result;
  }

  private rowToRule(row: Record<string, unknown>): AlertRule {
    return {
      id: row.id as string, name: row.name as string, description: row.description as string,
      metric: row.metric as string, condition: row.condition as AlertRule['condition'],
      threshold: row.threshold as number, windowMinutes: row.window_minutes as number,
      severity: row.severity as AlertSeverity, enabled: !!(row.enabled as number),
      cooldownMinutes: row.cooldown_minutes as number,
      notifyChannels: JSON.parse((row.notify_channels as string) || '[]'),
      createdAt: row.created_at as string,
    };
  }

  private rowToAlert(row: Record<string, unknown>): Alert {
    return {
      id: row.id as string, name: row.name as string, description: row.description as string,
      severity: row.severity as AlertSeverity, status: row.status as AlertStatus,
      source: row.source as string, condition: row.condition as string,
      currentValue: row.current_value as number, threshold: row.threshold as number,
      firedAt: row.fired_at as string, acknowledgedAt: row.acknowledged_at as string | undefined,
      acknowledgedBy: row.acknowledged_by as string | undefined,
      resolvedAt: row.resolved_at as string | undefined,
      silencedUntil: row.silenced_until as string | undefined,
      metadata: JSON.parse((row.metadata as string) || '{}'),
    };
  }
}

// ══════════════════════════════════════════════════════
// 5. FLEET CONFIGURATION SERVICE
// ══════════════════════════════════════════════════════

export class FleetConfigService {
  constructor(private env: Env) {}

  async getProviders(): Promise<FleetConfig[]> {
    const rows = await this.env.DB.prepare('SELECT * FROM fleet_config ORDER BY priority').all();
    return rows.results.map(r => this.rowToFleet(r));
  }

  async getProvider(id: string): Promise<FleetConfig | null> {
    const row = await this.env.DB.prepare('SELECT * FROM fleet_config WHERE id = ?').bind(id).first();
    return row ? this.rowToFleet(row) : null;
  }

  async upsertProvider(config: Omit<FleetConfig, 'id'> & { id?: string }): Promise<FleetConfig> {
    const now = new Date().toISOString();
    const id = config.id || `fleet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    await this.env.DB.prepare(`
      INSERT INTO fleet_config (id, provider, model, api_key_ref, max_tokens, temperature, rate_limit_rpm, rate_limit_tpm, priority, enabled, fallback_provider, cost_per_input_token, cost_per_output_token, regions, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider=?, model=?, api_key_ref=?, max_tokens=?, temperature=?, rate_limit_rpm=?, rate_limit_tpm=?, priority=?, enabled=?, fallback_provider=?, cost_per_input_token=?, cost_per_output_token=?, regions=?, updated_at=?, updated_by=?
    `).bind(
      id, config.provider, config.model, config.apiKeyRef, config.maxTokens, config.temperature,
      config.rateLimitRpm, config.rateLimitTpm, config.priority, config.enabled ? 1 : 0,
      config.fallbackProvider || null, config.costPerInputToken, config.costPerOutputToken,
      JSON.stringify(config.regions), now, config.updatedBy,
      config.provider, config.model, config.apiKeyRef, config.maxTokens, config.temperature,
      config.rateLimitRpm, config.rateLimitTpm, config.priority, config.enabled ? 1 : 0,
      config.fallbackProvider || null, config.costPerInputToken, config.costPerOutputToken,
      JSON.stringify(config.regions), now, config.updatedBy,
    ).run();

    return { ...config, id, updatedAt: now } as FleetConfig;
  }

  async deleteProvider(id: string): Promise<void> {
    await this.env.DB.prepare('DELETE FROM fleet_config WHERE id = ?').bind(id).run();
  }

  async getActiveProvider(preferredModel?: string): Promise<FleetConfig | null> {
    let query = 'SELECT * FROM fleet_config WHERE enabled = 1';
    if (preferredModel) query += ` AND model = '${preferredModel}'`;
    query += ' ORDER BY priority LIMIT 1';
    const row = await this.env.DB.prepare(query).first();
    return row ? this.rowToFleet(row) : null;
  }

  private rowToFleet(row: Record<string, unknown>): FleetConfig {
    return {
      id: row.id as string, provider: row.provider as string, model: row.model as string,
      apiKeyRef: row.api_key_ref as string, maxTokens: row.max_tokens as number,
      temperature: row.temperature as number, rateLimitRpm: row.rate_limit_rpm as number,
      rateLimitTpm: row.rate_limit_tpm as number, priority: row.priority as number,
      enabled: !!(row.enabled as number), fallbackProvider: row.fallback_provider as string | undefined,
      costPerInputToken: row.cost_per_input_token as number,
      costPerOutputToken: row.cost_per_output_token as number,
      regions: JSON.parse((row.regions as string) || '[]'),
      updatedAt: row.updated_at as string, updatedBy: row.updated_by as string,
    };
  }
}

// ══════════════════════════════════════════════════════
// 6. AI EMPLOYEE MANAGEMENT SERVICE
// ══════════════════════════════════════════════════════

export class EmployeeManagementService {
  constructor(private env: Env) {}

  async getEmployeeConfigs(): Promise<EmployeeConfig[]> {
    const rows = await this.env.DB.prepare('SELECT * FROM employee_configs ORDER BY name').all();
    return rows.results.map(r => this.rowToConfig(r));
  }

  async getEmployeeConfig(employeeId: string): Promise<EmployeeConfig | null> {
    const row = await this.env.DB.prepare('SELECT * FROM employee_configs WHERE employee_id = ?').bind(employeeId).first();
    return row ? this.rowToConfig(row) : null;
  }

  async upsertEmployeeConfig(config: Partial<EmployeeConfig> & { employeeId: string; updatedBy: string }): Promise<EmployeeConfig> {
    const existing = await this.getEmployeeConfig(config.employeeId);
    const now = new Date().toISOString();
    const id = existing?.id || `empconf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const version = (existing?.version || 0) + 1;

    // Archive old version before overwriting
    if (existing) {
      await this.env.DB.prepare(
        'INSERT INTO employee_config_history (id, config_id, employee_id, version, data, archived_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        `hist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        id, config.employeeId, existing.version, JSON.stringify(existing), now
      ).run();
    }

    const merged: EmployeeConfig = {
      id,
      employeeId: config.employeeId,
      name: config.name || existing?.name || config.employeeId,
      role: config.role || existing?.role || 'general',
      systemPrompt: config.systemPrompt || existing?.systemPrompt || '',
      personalityParams: config.personalityParams || existing?.personalityParams || {},
      modelOverride: config.modelOverride ?? existing?.modelOverride,
      temperatureOverride: config.temperatureOverride ?? existing?.temperatureOverride,
      maxResponseTokens: config.maxResponseTokens || existing?.maxResponseTokens || 4096,
      toolsEnabled: config.toolsEnabled || existing?.toolsEnabled || [],
      guardrailsProfile: config.guardrailsProfile || existing?.guardrailsProfile || 'standard',
      abTestId: config.abTestId ?? existing?.abTestId,
      active: config.active ?? existing?.active ?? true,
      version,
      updatedAt: now,
      updatedBy: config.updatedBy,
    };

    await this.env.DB.prepare(`
      INSERT INTO employee_configs (id, employee_id, name, role, system_prompt, personality_params, model_override, temperature_override, max_response_tokens, tools_enabled, guardrails_profile, ab_test_id, active, version, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(employee_id) DO UPDATE SET
        name=?, role=?, system_prompt=?, personality_params=?, model_override=?, temperature_override=?, max_response_tokens=?, tools_enabled=?, guardrails_profile=?, ab_test_id=?, active=?, version=?, updated_at=?, updated_by=?
    `).bind(
      merged.id, merged.employeeId, merged.name, merged.role, merged.systemPrompt,
      JSON.stringify(merged.personalityParams), merged.modelOverride || null,
      merged.temperatureOverride ?? null, merged.maxResponseTokens,
      JSON.stringify(merged.toolsEnabled), merged.guardrailsProfile, merged.abTestId || null,
      merged.active ? 1 : 0, merged.version, now, merged.updatedBy,
      merged.name, merged.role, merged.systemPrompt, JSON.stringify(merged.personalityParams),
      merged.modelOverride || null, merged.temperatureOverride ?? null, merged.maxResponseTokens,
      JSON.stringify(merged.toolsEnabled), merged.guardrailsProfile, merged.abTestId || null,
      merged.active ? 1 : 0, merged.version, now, merged.updatedBy,
    ).run();

    return merged;
  }

  async getConfigHistory(employeeId: string, limit = 20): Promise<{ version: number; data: EmployeeConfig; archivedAt: string }[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM employee_config_history WHERE employee_id = ? ORDER BY version DESC LIMIT ?'
    ).bind(employeeId, limit).all();
    return rows.results.map(r => ({
      version: r.version as number,
      data: JSON.parse(r.data as string),
      archivedAt: r.archived_at as string,
    }));
  }

  async rollbackConfig(employeeId: string, targetVersion: number, rolledBackBy: string): Promise<EmployeeConfig | null> {
    const history = await this.env.DB.prepare(
      'SELECT data FROM employee_config_history WHERE employee_id = ? AND version = ?'
    ).bind(employeeId, targetVersion).first();
    if (!history) return null;

    const oldConfig = JSON.parse(history.data as string) as EmployeeConfig;
    return this.upsertEmployeeConfig({ ...oldConfig, employeeId, updatedBy: rolledBackBy });
  }

  private rowToConfig(row: Record<string, unknown>): EmployeeConfig {
    return {
      id: row.id as string, employeeId: row.employee_id as string, name: row.name as string,
      role: row.role as string, systemPrompt: row.system_prompt as string,
      personalityParams: JSON.parse((row.personality_params as string) || '{}'),
      modelOverride: row.model_override as string | undefined,
      temperatureOverride: row.temperature_override as number | undefined,
      maxResponseTokens: row.max_response_tokens as number,
      toolsEnabled: JSON.parse((row.tools_enabled as string) || '[]'),
      guardrailsProfile: row.guardrails_profile as string,
      abTestId: row.ab_test_id as string | undefined,
      active: !!(row.active as number), version: row.version as number,
      updatedAt: row.updated_at as string, updatedBy: row.updated_by as string,
    };
  }
}

// ══════════════════════════════════════════════════════
// 7. SYSTEM HEALTH SERVICE
// ══════════════════════════════════════════════════════

export class SystemHealthService {
  constructor(private env: Env) {}

  async getHealth(): Promise<HealthStatus> {
    const alerting = new AlertingService(this.env);

    // Component health checks
    const components = [
      { name: 'database', check: () => this.checkD1() },
      { name: 'kv_sessions', check: () => this.checkKV(this.env.SESSIONS) },
      { name: 'kv_cache', check: () => this.checkKV(this.env.CACHE) },
    ];

    const componentResults = await Promise.all(
      components.map(async c => {
        const start = Date.now();
        try {
          await c.check();
          const latency = Date.now() - start;
          const status: 'up' | 'degraded' | 'down' = latency > 2000 ? 'degraded' : 'up';
          return { name: c.name, status, latencyP50: latency, latencyP95: latency * 1.5, latencyP99: latency * 2, errorRate: 0, lastCheck: new Date().toISOString() };
        } catch {
          const status: 'up' | 'degraded' | 'down' = 'down';
          return { name: c.name, status, latencyP50: 0, latencyP95: 0, latencyP99: 0, errorRate: 100, lastCheck: new Date().toISOString() };
        }
      })
    );

    const activeAlerts = await alerting.getActiveAlerts();
    const errorRate = await alerting.getMetricValue('error_rate', 5);
    const rpm = await alerting.getMetricValue('requests_per_minute', 1);

    const downCount = componentResults.filter(c => c.status === 'down').length;
    const degradedCount = componentResults.filter(c => c.status === 'degraded').length;
    const overall = downCount > 0 ? 'down' : degradedCount > 0 ? 'degraded' : 'healthy';

    return {
      overall,
      uptime: Date.now(), // Would track actual start time in production
      components: componentResults,
      activeAlerts: activeAlerts.length,
      requestsPerMinute: rpm,
      errorRate,
    };
  }

  private async checkD1(): Promise<void> {
    await this.env.DB.prepare('SELECT 1').first();
  }

  private async checkKV(kv: KVNamespace): Promise<void> {
    await kv.get('__health_check__');
  }
}

// ══════════════════════════════════════════════════════
// 8. DATABASE SCHEMA
// ══════════════════════════════════════════════════════

export const ADMIN_ENGINE_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    permissions TEXT DEFAULT '[]',
    mfa_enabled INTEGER DEFAULT 0,
    last_login TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_admin_role ON admin_users(role)`,

  `CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT DEFAULT '{}',
    timestamp TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_user ON admin_audit_log(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_time ON admin_audit_log(timestamp)`,

  `CREATE TABLE IF NOT EXISTS impersonation_sessions (
    id TEXT PRIMARY KEY,
    admin_user_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    target_email TEXT,
    reason TEXT NOT NULL,
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ended_at TEXT,
    actions_performed INTEGER DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_imp_admin ON impersonation_sessions(admin_user_id)`,

  `CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    metric TEXT NOT NULL,
    condition TEXT NOT NULL,
    threshold REAL NOT NULL,
    window_minutes INTEGER NOT NULL,
    severity TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    cooldown_minutes INTEGER DEFAULT 30,
    notify_channels TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'firing',
    source TEXT,
    condition TEXT,
    current_value REAL,
    threshold REAL,
    fired_at TEXT NOT NULL,
    acknowledged_at TEXT,
    acknowledged_by TEXT,
    resolved_at TEXT,
    silenced_until TEXT,
    metadata TEXT DEFAULT '{}'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_alert_status ON alerts(status)`,
  `CREATE INDEX IF NOT EXISTS idx_alert_sev ON alerts(severity, status)`,

  `CREATE TABLE IF NOT EXISTS system_metrics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'gauge',
    value REAL NOT NULL,
    labels TEXT DEFAULT '{}',
    timestamp TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_metric_name ON system_metrics(name, timestamp)`,

  `CREATE TABLE IF NOT EXISTS fleet_config (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    api_key_ref TEXT,
    max_tokens INTEGER DEFAULT 4096,
    temperature REAL DEFAULT 0.7,
    rate_limit_rpm INTEGER DEFAULT 60,
    rate_limit_tpm INTEGER DEFAULT 100000,
    priority INTEGER DEFAULT 10,
    enabled INTEGER DEFAULT 1,
    fallback_provider TEXT,
    cost_per_input_token REAL DEFAULT 0,
    cost_per_output_token REAL DEFAULT 0,
    regions TEXT DEFAULT '[]',
    updated_at TEXT,
    updated_by TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS employee_configs (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT,
    system_prompt TEXT DEFAULT '',
    personality_params TEXT DEFAULT '{}',
    model_override TEXT,
    temperature_override REAL,
    max_response_tokens INTEGER DEFAULT 4096,
    tools_enabled TEXT DEFAULT '[]',
    guardrails_profile TEXT DEFAULT 'standard',
    ab_test_id TEXT,
    active INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    updated_at TEXT,
    updated_by TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_empconf_active ON employee_configs(active)`,

  `CREATE TABLE IF NOT EXISTS employee_config_history (
    id TEXT PRIMARY KEY,
    config_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    data TEXT NOT NULL,
    archived_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_emphistory ON employee_config_history(employee_id, version)`,
];
