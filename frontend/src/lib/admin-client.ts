/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Admin Client — RBAC, Impersonation, Alerting, Fleet, Employee Mgmt
 * Worker API primary with localStorage fallback for offline resilience
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const API_BASE = '/api/admin-v2';
const LS_PREFIX = 'nexushr_admin_';

// ── Types ──────────────────────────────────────────────────────────────────

export type AdminRole = 'super_admin' | 'billing_admin' | 'support_admin' | 'readonly';

export interface AdminUser {
  id: string;
  userId: string;
  email: string;
  role: AdminRole;
  permissions: string[];
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface ImpersonationSession {
  id: string;
  adminUserId: string;
  targetUserId: string;
  targetEmail?: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  endedAt?: string;
  actionsPerformed: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'spike';
  threshold: number;
  windowMinutes: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  cooldownMinutes: number;
  notifyChannels: string[];
}

export interface Alert {
  id: string;
  name: string;
  description?: string;
  severity: string;
  status: 'firing' | 'acknowledged' | 'resolved' | 'silenced';
  source?: string;
  condition?: string;
  currentValue?: number;
  threshold?: number;
  firedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  silencedUntil?: string;
}

export interface FleetProvider {
  id: string;
  provider: string;
  model: string;
  apiKeyRef?: string;
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
}

export interface EmployeeConfig {
  id: string;
  employeeId: string;
  name: string;
  role?: string;
  systemPrompt: string;
  personalityParams: Record<string, any>;
  modelOverride?: string;
  temperatureOverride?: number;
  maxResponseTokens: number;
  toolsEnabled: string[];
  guardrailsProfile: string;
  abTestId?: string;
  active: boolean;
  version: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  components: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    latencyMs?: number;
    message?: string;
  }>;
  checkedAt: string;
}

export interface AdminDashboard {
  health: SystemHealth;
  activeAlerts: Alert[];
  recentAudit: AuditEntry[];
  fleetSummary: { total: number; enabled: number; providers: string[] };
  employeeSummary: { total: number; active: number };
  impersonationActive: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, value: any): void {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch {}
}

function lsPush<T>(key: string, item: T, maxItems = 500): void {
  const arr = lsGet<T[]>(key, []);
  arr.unshift(item);
  if (arr.length > maxItems) arr.length = maxItems;
  lsSet(key, arr);
}

async function api<T>(path: string, opts: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const token = localStorage.getItem('nexushr_token') || '';
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
    const json = await res.json() as any;
    if (!res.ok || !json.success) return { ok: false, error: json.error || `HTTP ${res.status}` };
    return { ok: true, data: json.data ?? json };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Network error' };
  }
}

// ── RBAC Client ─────────────────────────────────────────────────────────────

export const rbacClient = {
  async listAdmins(): Promise<AdminUser[]> {
    const res = await api<AdminUser[]>('/admins');
    if (res.ok) {
      lsSet('admins', res.data);
      return res.data;
    }
    return lsGet<AdminUser[]>('admins', []);
  },

  async createAdmin(data: { userId: string; email: string; role: AdminRole }): Promise<AdminUser | null> {
    const res = await api<AdminUser>('/admins', { method: 'POST', body: JSON.stringify(data) });
    if (res.ok) return res.data;

    // Offline fallback: queue locally
    const admin: AdminUser = {
      id: uid(), userId: data.userId, email: data.email, role: data.role,
      permissions: [], mfaEnabled: false, createdAt: new Date().toISOString(),
    };
    lsPush('admins_pending', admin);
    return admin;
  },

  async updateRole(userId: string, role: AdminRole): Promise<boolean> {
    const res = await api('/admins/' + userId + '/role', { method: 'PUT', body: JSON.stringify({ role }) });
    return res.ok;
  },

  async deleteAdmin(userId: string): Promise<boolean> {
    const res = await api('/admins/' + userId, { method: 'DELETE' });
    return res.ok;
  },

  async getAuditLog(limit = 100): Promise<AuditEntry[]> {
    const res = await api<AuditEntry[]>(`/audit?limit=${limit}`);
    if (res.ok) {
      lsSet('audit_log', res.data);
      return res.data;
    }
    return lsGet<AuditEntry[]>('audit_log', []);
  },

  /** Check if current user has a specific permission (local check from cached admin list) */
  hasPermission(userId: string, permission: string): boolean {
    const admins = lsGet<AdminUser[]>('admins', []);
    const admin = admins.find(a => a.userId === userId);
    if (!admin) return false;
    if (admin.role === 'super_admin') return true;
    return admin.permissions.includes(permission);
  },
};

// ── Impersonation Client ────────────────────────────────────────────────────

export const impersonationClient = {
  async start(targetUserId: string, targetEmail: string, reason: string): Promise<ImpersonationSession | null> {
    const res = await api<ImpersonationSession>('/impersonation/start', {
      method: 'POST', body: JSON.stringify({ targetUserId, targetEmail, reason }),
    });
    if (res.ok) {
      lsSet('active_impersonation', res.data);
      return res.data;
    }
    return null;
  },

  async end(): Promise<boolean> {
    const res = await api('/impersonation/end', { method: 'POST' });
    if (res.ok) localStorage.removeItem(LS_PREFIX + 'active_impersonation');
    return res.ok;
  },

  async getCurrent(): Promise<ImpersonationSession | null> {
    const res = await api<ImpersonationSession | null>('/impersonation/current');
    if (res.ok) return res.data;
    return lsGet<ImpersonationSession | null>('active_impersonation', null);
  },

  async getHistory(limit = 50): Promise<ImpersonationSession[]> {
    const res = await api<ImpersonationSession[]>(`/impersonation/history?limit=${limit}`);
    if (res.ok) {
      lsSet('impersonation_history', res.data);
      return res.data;
    }
    return lsGet<ImpersonationSession[]>('impersonation_history', []);
  },

  isActive(): boolean {
    return lsGet<ImpersonationSession | null>('active_impersonation', null) !== null;
  },
};

// ── Alerting Client ─────────────────────────────────────────────────────────

export const alertingClient = {
  // ── Alert Rules ──
  async listRules(): Promise<AlertRule[]> {
    const res = await api<AlertRule[]>('/alerts/rules');
    if (res.ok) {
      lsSet('alert_rules', res.data);
      return res.data;
    }
    return lsGet<AlertRule[]>('alert_rules', []);
  },

  async createRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule | null> {
    const res = await api<AlertRule>('/alerts/rules', { method: 'POST', body: JSON.stringify(rule) });
    if (res.ok) return res.data;

    const local: AlertRule = { ...rule, id: uid() } as AlertRule;
    lsPush('alert_rules_pending', local);
    return local;
  },

  async updateRule(ruleId: string, updates: Partial<AlertRule>): Promise<boolean> {
    const res = await api('/alerts/rules/' + ruleId, { method: 'PUT', body: JSON.stringify(updates) });
    return res.ok;
  },

  async deleteRule(ruleId: string): Promise<boolean> {
    const res = await api('/alerts/rules/' + ruleId, { method: 'DELETE' });
    return res.ok;
  },

  // ── Active Alerts ──
  async listActive(): Promise<Alert[]> {
    const res = await api<Alert[]>('/alerts/active');
    if (res.ok) {
      lsSet('active_alerts', res.data);
      return res.data;
    }
    return lsGet<Alert[]>('active_alerts', []);
  },

  async acknowledge(alertId: string): Promise<boolean> {
    const res = await api('/alerts/' + alertId + '/acknowledge', { method: 'POST' });
    return res.ok;
  },

  async resolve(alertId: string): Promise<boolean> {
    const res = await api('/alerts/' + alertId + '/resolve', { method: 'POST' });
    return res.ok;
  },

  async silence(alertId: string, durationMinutes: number): Promise<boolean> {
    const res = await api('/alerts/' + alertId + '/silence', {
      method: 'POST', body: JSON.stringify({ durationMinutes }),
    });
    return res.ok;
  },

  async evaluateRules(): Promise<{ alertsCreated: number }> {
    const res = await api<{ alertsCreated: number }>('/alerts/evaluate', { method: 'POST' });
    return res.ok ? res.data : { alertsCreated: 0 };
  },

  // ── Metrics ──
  async recordMetric(name: string, value: number, labels: Record<string, string> = {}): Promise<boolean> {
    const res = await api('/metrics', { method: 'POST', body: JSON.stringify({ name, value, labels }) });
    if (!res.ok) {
      lsPush('metrics_queue', { name, value, labels, timestamp: new Date().toISOString() });
    }
    return res.ok;
  },

  async queryMetrics(name: string, minutes = 60): Promise<Array<{ value: number; timestamp: string }>> {
    const res = await api<Array<{ value: number; timestamp: string }>>(`/metrics?name=${name}&minutes=${minutes}`);
    return res.ok ? res.data : [];
  },

  /** Get count of firing alerts from cache */
  getFiringCount(): number {
    return lsGet<Alert[]>('active_alerts', []).filter(a => a.status === 'firing').length;
  },
};

// ── Fleet Config Client ─────────────────────────────────────────────────────

export const fleetClient = {
  async list(): Promise<FleetProvider[]> {
    const res = await api<FleetProvider[]>('/fleet');
    if (res.ok) {
      lsSet('fleet_config', res.data);
      return res.data;
    }
    return lsGet<FleetProvider[]>('fleet_config', defaultFleet());
  },

  async get(id: string): Promise<FleetProvider | null> {
    const res = await api<FleetProvider>('/fleet/' + id);
    return res.ok ? res.data : null;
  },

  async create(config: Omit<FleetProvider, 'id'>): Promise<FleetProvider | null> {
    const res = await api<FleetProvider>('/fleet', { method: 'POST', body: JSON.stringify(config) });
    if (res.ok) return res.data;

    const local: FleetProvider = { ...config, id: uid() } as FleetProvider;
    const fleet = lsGet<FleetProvider[]>('fleet_config', []);
    fleet.push(local);
    lsSet('fleet_config', fleet);
    return local;
  },

  async update(id: string, updates: Partial<FleetProvider>): Promise<boolean> {
    const res = await api('/fleet/' + id, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) {
      // Apply locally
      const fleet = lsGet<FleetProvider[]>('fleet_config', []);
      const idx = fleet.findIndex(f => f.id === id);
      if (idx >= 0) {
        fleet[idx] = { ...fleet[idx], ...updates };
        lsSet('fleet_config', fleet);
      }
    }
    return res.ok;
  },

  async delete(id: string): Promise<boolean> {
    const res = await api('/fleet/' + id, { method: 'DELETE' });
    if (res.ok) {
      const fleet = lsGet<FleetProvider[]>('fleet_config', []).filter(f => f.id !== id);
      lsSet('fleet_config', fleet);
    }
    return res.ok;
  },

  /** Get the active primary provider from cache */
  getPrimary(): FleetProvider | null {
    const fleet = lsGet<FleetProvider[]>('fleet_config', defaultFleet());
    const enabled = fleet.filter(f => f.enabled).sort((a, b) => a.priority - b.priority);
    return enabled[0] || null;
  },

  /** Estimate monthly cost from cache */
  estimateMonthlyCost(inputTokens: number, outputTokens: number): number {
    const fleet = lsGet<FleetProvider[]>('fleet_config', []);
    const primary = fleet.filter(f => f.enabled).sort((a, b) => a.priority - b.priority)[0];
    if (!primary) return 0;
    return (inputTokens * primary.costPerInputToken) + (outputTokens * primary.costPerOutputToken);
  },
};

function defaultFleet(): FleetProvider[] {
  return [
    {
      id: 'default-claude', provider: 'anthropic', model: 'claude-sonnet-4-20250514',
      maxTokens: 4096, temperature: 0.7, rateLimitRpm: 60, rateLimitTpm: 100000,
      priority: 1, enabled: true, costPerInputToken: 0.000003, costPerOutputToken: 0.000015,
      regions: ['us-east-1'], apiKeyRef: undefined, fallbackProvider: undefined,
    },
    {
      id: 'default-gpt4', provider: 'openai', model: 'gpt-4o',
      maxTokens: 4096, temperature: 0.7, rateLimitRpm: 60, rateLimitTpm: 100000,
      priority: 2, enabled: true, costPerInputToken: 0.000005, costPerOutputToken: 0.000015,
      regions: ['us-east-1'], apiKeyRef: undefined, fallbackProvider: undefined,
    },
  ];
}

// ── Employee Management Client ──────────────────────────────────────────────

export const employeeClient = {
  async list(): Promise<EmployeeConfig[]> {
    const res = await api<EmployeeConfig[]>('/employees');
    if (res.ok) {
      lsSet('employee_configs', res.data);
      return res.data;
    }
    return lsGet<EmployeeConfig[]>('employee_configs', defaultEmployees());
  },

  async get(id: string): Promise<EmployeeConfig | null> {
    const res = await api<EmployeeConfig>('/employees/' + id);
    return res.ok ? res.data : null;
  },

  async create(config: Omit<EmployeeConfig, 'id' | 'version'>): Promise<EmployeeConfig | null> {
    const res = await api<EmployeeConfig>('/employees', { method: 'POST', body: JSON.stringify(config) });
    if (res.ok) return res.data;

    const local: EmployeeConfig = { ...config, id: uid(), version: 1 } as EmployeeConfig;
    const list = lsGet<EmployeeConfig[]>('employee_configs', []);
    list.push(local);
    lsSet('employee_configs', list);
    return local;
  },

  async update(id: string, updates: Partial<EmployeeConfig>): Promise<boolean> {
    const res = await api('/employees/' + id, { method: 'PUT', body: JSON.stringify(updates) });
    if (!res.ok) {
      const list = lsGet<EmployeeConfig[]>('employee_configs', []);
      const idx = list.findIndex(e => e.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...updates, version: list[idx].version + 1 };
        lsSet('employee_configs', list);
      }
    }
    return res.ok;
  },

  async updatePrompt(id: string, systemPrompt: string): Promise<boolean> {
    const res = await api('/employees/' + id + '/prompt', {
      method: 'PUT', body: JSON.stringify({ systemPrompt }),
    });
    return res.ok;
  },

  async getHistory(employeeId: string): Promise<Array<{ version: number; data: any; archivedAt: string }>> {
    const res = await api<any[]>('/employees/' + employeeId + '/history');
    return res.ok ? res.data : [];
  },

  async rollback(employeeId: string, version: number): Promise<boolean> {
    const res = await api('/employees/' + employeeId + '/rollback', {
      method: 'POST', body: JSON.stringify({ version }),
    });
    return res.ok;
  },

  async delete(id: string): Promise<boolean> {
    const res = await api('/employees/' + id, { method: 'DELETE' });
    return res.ok;
  },

  /** Get active employee count from cache */
  getActiveCount(): number {
    return lsGet<EmployeeConfig[]>('employee_configs', []).filter(e => e.active).length;
  },
};

function defaultEmployees(): EmployeeConfig[] {
  return [
    {
      id: 'emp-sarah', employeeId: 'sarah', name: 'Sarah Chen', role: 'hr_generalist',
      systemPrompt: 'You are Sarah Chen, a friendly and knowledgeable HR Generalist...',
      personalityParams: { warmth: 0.85, formality: 0.5, humor: 0.3 },
      maxResponseTokens: 4096, toolsEnabled: ['email', 'calendar', 'directory'],
      guardrailsProfile: 'standard', active: true, version: 1,
    },
    {
      id: 'emp-marcus', employeeId: 'marcus', name: 'Marcus Rodriguez', role: 'benefits_specialist',
      systemPrompt: 'You are Marcus Rodriguez, a detail-oriented Benefits Specialist...',
      personalityParams: { warmth: 0.7, formality: 0.6, humor: 0.2 },
      maxResponseTokens: 4096, toolsEnabled: ['benefits_db', 'calculator', 'email'],
      guardrailsProfile: 'strict', active: true, version: 1,
    },
    {
      id: 'emp-priya', employeeId: 'priya', name: 'Priya Sharma', role: 'payroll_manager',
      systemPrompt: 'You are Priya Sharma, a precise and trustworthy Payroll Manager...',
      personalityParams: { warmth: 0.6, formality: 0.8, humor: 0.1 },
      maxResponseTokens: 4096, toolsEnabled: ['payroll_system', 'tax_calculator', 'email'],
      guardrailsProfile: 'strict', active: true, version: 1,
    },
  ];
}

// ── System Health Client ────────────────────────────────────────────────────

export const healthClient = {
  async check(): Promise<SystemHealth> {
    const res = await api<SystemHealth>('/health');
    if (res.ok) {
      lsSet('system_health', res.data);
      return res.data;
    }
    return lsGet<SystemHealth>('system_health', {
      status: 'down', components: [], checkedAt: new Date().toISOString(),
    });
  },

  /** Get cached health status without a network call */
  getCached(): SystemHealth {
    return lsGet<SystemHealth>('system_health', {
      status: 'down', components: [], checkedAt: '',
    });
  },

  isHealthy(): boolean {
    return this.getCached().status === 'healthy';
  },
};

// ── Dashboard Client (aggregated) ───────────────────────────────────────────

export const dashboardClient = {
  async load(): Promise<AdminDashboard> {
    const res = await api<AdminDashboard>('/dashboard');
    if (res.ok) {
      lsSet('admin_dashboard', res.data);
      return res.data;
    }

    // Offline: assemble from cached pieces
    return {
      health: healthClient.getCached(),
      activeAlerts: lsGet<Alert[]>('active_alerts', []),
      recentAudit: lsGet<AuditEntry[]>('audit_log', []).slice(0, 20),
      fleetSummary: buildFleetSummary(),
      employeeSummary: buildEmployeeSummary(),
      impersonationActive: impersonationClient.isActive(),
    };
  },

  /** Quick refresh of just health + alerts (lightweight poll) */
  async refreshCritical(): Promise<{ health: SystemHealth; firingAlerts: number }> {
    const [health, alerts] = await Promise.all([
      healthClient.check(),
      alertingClient.listActive(),
    ]);
    return {
      health,
      firingAlerts: alerts.filter(a => a.status === 'firing').length,
    };
  },
};

function buildFleetSummary() {
  const fleet = lsGet<FleetProvider[]>('fleet_config', []);
  const enabled = fleet.filter(f => f.enabled);
  return {
    total: fleet.length,
    enabled: enabled.length,
    providers: [...new Set(enabled.map(f => f.provider))],
  };
}

function buildEmployeeSummary() {
  const emps = lsGet<EmployeeConfig[]>('employee_configs', []);
  return { total: emps.length, active: emps.filter(e => e.active).length };
}

// ── Sync Engine ─────────────────────────────────────────────────────────────

export const adminSync = {
  /** Flush any queued offline actions to the Worker */
  async flush(): Promise<{ synced: number; failed: number }> {
    let synced = 0, failed = 0;

    // Flush pending metrics
    const metricsQueue = lsGet<any[]>('metrics_queue', []);
    for (const m of metricsQueue) {
      const ok = await alertingClient.recordMetric(m.name, m.value, m.labels);
      ok ? synced++ : failed++;
    }
    if (synced > 0) lsSet('metrics_queue', metricsQueue.slice(synced));

    // Flush pending admin creates
    const pendingAdmins = lsGet<any[]>('admins_pending', []);
    for (const a of pendingAdmins) {
      const res = await api('/admins', { method: 'POST', body: JSON.stringify(a) });
      res.ok ? synced++ : failed++;
    }
    if (pendingAdmins.length > 0) lsSet('admins_pending', []);

    // Flush pending alert rules
    const pendingRules = lsGet<any[]>('alert_rules_pending', []);
    for (const r of pendingRules) {
      const res = await api('/alerts/rules', { method: 'POST', body: JSON.stringify(r) });
      res.ok ? synced++ : failed++;
    }
    if (pendingRules.length > 0) lsSet('alert_rules_pending', []);

    return { synced, failed };
  },

  /** Full refresh of all admin data from Worker */
  async fullRefresh(): Promise<void> {
    await Promise.allSettled([
      rbacClient.listAdmins(),
      rbacClient.getAuditLog(),
      alertingClient.listRules(),
      alertingClient.listActive(),
      fleetClient.list(),
      employeeClient.list(),
      healthClient.check(),
    ]);
  },
};

// ── React Hooks ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';

/** Hook for admin dashboard with auto-refresh */
export function useAdminDashboard(refreshIntervalMs = 30000) {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const refresh = useCallback(async () => {
    try {
      const data = await dashboardClient.load();
      setDashboard(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(() => {
      dashboardClient.refreshCritical().then(({ health, firingAlerts }) => {
        setDashboard(prev => prev ? {
          ...prev,
          health,
          activeAlerts: prev.activeAlerts.map(a => a), // trigger re-render
        } : prev);
      }).catch(() => {});
    }, refreshIntervalMs);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refresh, refreshIntervalMs]);

  return { dashboard, loading, refresh };
}

/** Hook for fleet configuration management */
export function useFleetConfig() {
  const [fleet, setFleet] = useState<FleetProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fleetClient.list();
    setFleet(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateProvider = useCallback(async (id: string, updates: Partial<FleetProvider>) => {
    await fleetClient.update(id, updates);
    await refresh();
  }, [refresh]);

  const addProvider = useCallback(async (config: Omit<FleetProvider, 'id'>) => {
    await fleetClient.create(config);
    await refresh();
  }, [refresh]);

  const removeProvider = useCallback(async (id: string) => {
    await fleetClient.delete(id);
    await refresh();
  }, [refresh]);

  return { fleet, loading, refresh, updateProvider, addProvider, removeProvider };
}

/** Hook for employee configuration management */
export function useEmployeeConfigs() {
  const [employees, setEmployees] = useState<EmployeeConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await employeeClient.list();
    setEmployees(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateEmployee = useCallback(async (id: string, updates: Partial<EmployeeConfig>) => {
    await employeeClient.update(id, updates);
    await refresh();
  }, [refresh]);

  const updatePrompt = useCallback(async (id: string, prompt: string) => {
    await employeeClient.updatePrompt(id, prompt);
    await refresh();
  }, [refresh]);

  const rollbackEmployee = useCallback(async (employeeId: string, version: number) => {
    await employeeClient.rollback(employeeId, version);
    await refresh();
  }, [refresh]);

  return { employees, loading, refresh, updateEmployee, updatePrompt, rollbackEmployee };
}

/** Hook for active alerts with polling */
export function useAlerts(pollIntervalMs = 15000) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [a, r] = await Promise.all([
      alertingClient.listActive(),
      alertingClient.listRules(),
    ]);
    setAlerts(a);
    setRules(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return {
    alerts, rules, loading, refresh,
    firingCount: alerts.filter(a => a.status === 'firing').length,
    acknowledge: async (id: string) => { await alertingClient.acknowledge(id); await refresh(); },
    resolve: async (id: string) => { await alertingClient.resolve(id); await refresh(); },
    silence: async (id: string, mins: number) => { await alertingClient.silence(id, mins); await refresh(); },
  };
}

/** Hook for impersonation state */
export function useImpersonation() {
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    impersonationClient.getCurrent().then(s => { setSession(s); setLoading(false); });
  }, []);

  const start = useCallback(async (targetUserId: string, targetEmail: string, reason: string) => {
    const s = await impersonationClient.start(targetUserId, targetEmail, reason);
    setSession(s);
    return s;
  }, []);

  const end = useCallback(async () => {
    await impersonationClient.end();
    setSession(null);
  }, []);

  return { session, loading, isActive: !!session, start, end };
}
