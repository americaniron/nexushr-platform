/**
 * Feature #35 — Enterprise Admin Control Center Client
 *
 * Frontend API client + React hooks for:
 * 1. AI Employee Monitoring
 * 2. Conversation Review
 * 3. Content Moderation
 * 4. System Health Monitoring
 * 5. Usage Analytics
 * 6. Security Alerts
 * 7. Enterprise Observability
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api/admin-center';

// ─── Types ───────────────────────────────────────────────────────────

type AIEmployeeStatus = 'active' | 'idle' | 'busy' | 'error' | 'maintenance' | 'disabled';
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
type ModerationAction = 'approve' | 'reject' | 'redact' | 'escalate' | 'flag' | 'quarantine';
type AlertStatus = 'firing' | 'acknowledged' | 'investigating' | 'resolved' | 'suppressed';
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
type TraceStatus = 'ok' | 'error' | 'timeout' | 'cancelled';
type ReviewVerdict = 'compliant' | 'non-compliant' | 'needs-review' | 'escalated';
type IncidentPhase = 'detected' | 'triaged' | 'mitigating' | 'resolved' | 'postmortem';
type ComplianceFramework = 'SOC2' | 'HIPAA' | 'GDPR' | 'PCI-DSS' | 'ISO27001' | 'FedRAMP';

interface AIEmployeeMetrics {
  employeeId: string; name: string; role: string; status: AIEmployeeStatus; tenantId: string;
  uptime: { current: number; last24h: number; last7d: number; last30d: number };
  throughput: { tasksCompleted: number; tasksInProgress: number; tasksFailed: number; avgCompletionMs: number; p95CompletionMs: number; p99CompletionMs: number };
  conversations: { active: number; totalToday: number; avgDurationMs: number; csat: number; escalationRate: number };
  errors: { last1h: number; last24h: number; topErrors: { code: string; count: number; message: string }[] };
  sla: { target: number; current: number; breaches: number; burnRate: number };
  resources: { cpuPct: number; memoryMB: number; tokensUsed: number; costUSD: number };
  lastActivity: number; healthScore: number;
}

interface ConversationReview {
  id: string; conversationId: string; tenantId: string; employeeId: string; userId: string;
  status: string; verdict: ReviewVerdict | null; flags: any[]; qualityScore: number | null;
  complianceTags: string[]; reviewerId: string | null; reviewNotes: string | null;
  messageCount: number; startedAt: number; reviewedAt: number | null; metadata: Record<string, any>;
}

interface ModerationPolicy { id: string; name: string; tenantId: string; enabled: boolean; rules: any[]; actions: any; scope: any; createdAt: number; updatedAt: number; }
interface ModerationResult { id: string; contentId: string; score: number; action: ModerationAction; matchedRules: any[]; piiDetections: any[]; toxicityScores: Record<string, number>; }
interface ServiceHealth { serviceId: string; name: string; version: string; status: HealthStatus; region: string; dependencies: any[]; metrics: any; slo: any; lastDeployment: any; resources: any; }
interface SecurityAlert { id: string; tenantId: string; type: string; severity: SeverityLevel; status: AlertStatus; title: string; description: string; threatScore: number; indicators: any[]; timeline: any[]; assignee: string | null; createdAt: number; }
interface Incident { id: string; title: string; severity: SeverityLevel; phase: IncidentPhase; commander: string; affectedServices: string[]; timeline: any[]; detectedAt: number; resolvedAt: number | null; }
interface AlertRule { id: string; name: string; enabled: boolean; condition: any; severity: SeverityLevel; notifications: any; }

// ─── API Client ──────────────────────────────────────────────────────

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error((err as any).error || res.statusText); }
  return res.json() as Promise<T>;
}

export const adminCenterClient = {
  initSchema: () => apiCall<{ success: boolean; tables: number; indexes: number }>('/schema/init', { method: 'POST' }),

  // ── AI Employee Monitoring ──
  listEmployees: (tenantId: string, status?: AIEmployeeStatus) =>
    apiCall<{ success: boolean; employees: AIEmployeeMetrics[]; summary: any }>(`/employees?tenantId=${tenantId}${status ? `&status=${status}` : ''}`),
  getEmployeeMetrics: (employeeId: string, tenantId: string) =>
    apiCall<{ success: boolean; metrics: AIEmployeeMetrics }>(`/employees/${employeeId}/metrics?tenantId=${tenantId}`),
  recordEmployeeMetrics: (metrics: AIEmployeeMetrics) =>
    apiCall<{ success: boolean }>('/employees/metrics', { method: 'POST', body: JSON.stringify(metrics) }),
  detectAnomalies: (tenantId: string) =>
    apiCall<{ success: boolean; anomalies: any[] }>(`/employees/anomalies?tenantId=${tenantId}`),
  getCapacityProjection: (currentEmployees: number, metrics: any) =>
    apiCall<{ success: boolean; projection: any[] }>('/employees/capacity', { method: 'POST', body: JSON.stringify({ currentEmployees, metrics }) }),
  computeHealthScore: (metrics: AIEmployeeMetrics) =>
    apiCall<{ success: boolean; healthScore: number }>('/employees/health-score', { method: 'POST', body: JSON.stringify(metrics) }),

  // ── Conversation Review ──
  queueForReview: (conversationId: string, tenantId: string, employeeId: string, flags?: any[]) =>
    apiCall<{ success: boolean; review: ConversationReview }>('/reviews', { method: 'POST', body: JSON.stringify({ conversationId, tenantId, employeeId, flags }) }),
  getReviewQueue: (tenantId: string, options?: { status?: string; limit?: number }) =>
    apiCall<{ success: boolean; reviews: ConversationReview[]; total: number }>(`/reviews?tenantId=${tenantId}${options?.status ? `&status=${options.status}` : ''}${options?.limit ? `&limit=${options.limit}` : ''}`),
  submitReview: (reviewId: string, verdict: ReviewVerdict, qualityScore: number, notes: string, complianceTags?: string[]) =>
    apiCall<{ success: boolean }>(`/reviews/${reviewId}/submit`, { method: 'POST', body: JSON.stringify({ verdict, qualityScore, notes, complianceTags }) }),
  escalateReview: (reviewId: string, reason: string, escalateTo: string) =>
    apiCall<{ success: boolean }>(`/reviews/${reviewId}/escalate`, { method: 'POST', body: JSON.stringify({ reason, escalateTo }) }),
  redactContent: (content: string) =>
    apiCall<{ success: boolean; redacted: string; detections: any[] }>('/reviews/redact', { method: 'POST', body: JSON.stringify({ content }) }),
  getReviewStats: (tenantId: string) =>
    apiCall<{ success: boolean; stats: any }>(`/reviews/stats?tenantId=${tenantId}`),

  // ── Content Moderation ──
  createModerationPolicy: (tenantId: string, policy: Partial<ModerationPolicy> & { name: string }) =>
    apiCall<{ success: boolean; policy: ModerationPolicy }>('/moderation/policies', { method: 'POST', body: JSON.stringify({ tenantId, ...policy }) }),
  getModerationPolicies: (tenantId: string) =>
    apiCall<{ success: boolean; policies: ModerationPolicy[] }>(`/moderation/policies?tenantId=${tenantId}`),
  moderateContent: (tenantId: string, contentId: string, content: string, policyId?: string) =>
    apiCall<{ success: boolean; result: ModerationResult }>('/moderation/moderate', { method: 'POST', body: JSON.stringify({ tenantId, contentId, content, policyId }) }),
  getModerationQueue: (tenantId: string) =>
    apiCall<{ success: boolean; results: ModerationResult[]; total: number }>(`/moderation/queue?tenantId=${tenantId}`),
  detectPII: (content: string) =>
    apiCall<{ success: boolean; detections: any[] }>('/moderation/detect-pii', { method: 'POST', body: JSON.stringify({ content }) }),

  // ── System Health ──
  getServiceRegistry: () =>
    apiCall<{ success: boolean; services: ServiceHealth[] }>('/health/services'),
  getDependencyGraph: () =>
    apiCall<{ success: boolean; graph: { nodes: any[]; edges: any[] } }>('/health/dependencies'),
  getAggregateSLO: () =>
    apiCall<{ success: boolean; slo: any }>('/health/slo'),
  getResourceUtilization: () =>
    apiCall<{ success: boolean; resources: any[] }>('/health/resources'),
  createIncident: (tenantId: string, incident: Partial<Incident> & { title: string; severity: SeverityLevel; commander: string }) =>
    apiCall<{ success: boolean; incident: Incident }>('/incidents', { method: 'POST', body: JSON.stringify({ tenantId, ...incident }) }),
  listIncidents: (tenantId: string, options?: { phase?: IncidentPhase; severity?: SeverityLevel }) =>
    apiCall<{ success: boolean; incidents: Incident[] }>(`/incidents?tenantId=${tenantId}${options?.phase ? `&phase=${options.phase}` : ''}${options?.severity ? `&severity=${options.severity}` : ''}`),
  updateIncidentPhase: (incidentId: string, phase: IncidentPhase, details?: string) =>
    apiCall<{ success: boolean; incident: Incident }>(`/incidents/${incidentId}/phase`, { method: 'POST', body: JSON.stringify({ phase, details }) }),

  // ── Usage Analytics ──
  recordUsageEvent: (tenantId: string, event: { userId: string; feature: string; action: string; metadata?: any }) =>
    apiCall<{ success: boolean }>('/analytics/events', { method: 'POST', body: JSON.stringify({ tenantId, ...event }) }),
  getTenantAnalytics: (tenantId: string, days?: number) =>
    apiCall<{ success: boolean; analytics: any }>(`/analytics/tenant?tenantId=${tenantId}${days ? `&days=${days}` : ''}`),
  getFeatureAdoption: (tenantId: string) =>
    apiCall<{ success: boolean; features: any[] }>(`/analytics/features?tenantId=${tenantId}`),
  getCostAttribution: (tenantId: string) =>
    apiCall<{ success: boolean; costs: any[] }>(`/analytics/costs?tenantId=${tenantId}`),

  // ── Security Alerts ──
  createSecurityAlert: (tenantId: string, alert: { type: string; severity: SeverityLevel; title: string; description: string }) =>
    apiCall<{ success: boolean; alert: SecurityAlert }>('/security/alerts', { method: 'POST', body: JSON.stringify({ tenantId, ...alert }) }),
  listSecurityAlerts: (tenantId: string, options?: { status?: AlertStatus; severity?: SeverityLevel; type?: string }) =>
    apiCall<{ success: boolean; alerts: SecurityAlert[] }>(`/security/alerts?tenantId=${tenantId}${options?.status ? `&status=${options.status}` : ''}${options?.severity ? `&severity=${options.severity}` : ''}${options?.type ? `&type=${options.type}` : ''}`),
  getSecurityDashboard: (tenantId: string) =>
    apiCall<{ success: boolean; dashboard: any }>(`/security/dashboard?tenantId=${tenantId}`),
  acknowledgeAlert: (alertId: string) =>
    apiCall<{ success: boolean }>(`/security/alerts/${alertId}/acknowledge`, { method: 'POST' }),
  resolveAlert: (alertId: string, resolution: string) =>
    apiCall<{ success: boolean }>(`/security/alerts/${alertId}/resolve`, { method: 'POST', body: JSON.stringify({ resolution }) }),
  addIOC: (tenantId: string, ioc: any) =>
    apiCall<{ success: boolean }>('/security/iocs', { method: 'POST', body: JSON.stringify({ tenantId, ...ioc }) }),
  checkIOC: (tenantId: string, type: string, value: string) =>
    apiCall<{ success: boolean; match: boolean; ioc: any }>('/security/iocs/check', { method: 'POST', body: JSON.stringify({ tenantId, type, value }) }),
  getComplianceStatus: (frameworks?: ComplianceFramework[]) =>
    apiCall<{ success: boolean; compliance: any[] }>(`/security/compliance${frameworks ? `?frameworks=${frameworks.join(',')}` : ''}`),

  // ── Observability ──
  recordTrace: (trace: any) =>
    apiCall<{ success: boolean }>('/traces', { method: 'POST', body: JSON.stringify(trace) }),
  getTrace: (traceId: string) =>
    apiCall<{ success: boolean; trace: any }>(`/traces/${traceId}`),
  searchTraces: (options?: { status?: TraceStatus; minDuration?: number; limit?: number }) =>
    apiCall<{ success: boolean; traces: any[] }>(`/traces?${new URLSearchParams(Object.entries(options || {}).filter(([,v]) => v !== undefined).map(([k,v]) => [k, String(v)])).toString()}`),
  createAlertRule: (tenantId: string, rule: Partial<AlertRule> & { name: string; condition: any }) =>
    apiCall<{ success: boolean; rule: AlertRule }>('/alert-rules', { method: 'POST', body: JSON.stringify({ tenantId, ...rule }) }),
  getAlertRules: (tenantId: string) =>
    apiCall<{ success: boolean; rules: AlertRule[] }>(`/alert-rules?tenantId=${tenantId}`),
  recordMetric: (name: string, value: number, type: string, tags?: Record<string, string>) =>
    apiCall<{ success: boolean }>('/metrics', { method: 'POST', body: JSON.stringify({ name, value, type, tags }) }),
  queryMetrics: (name: string, aggregation?: string, bucketMs?: number) =>
    apiCall<{ success: boolean; series: { timestamp: number; value: number }[] }>(`/metrics/query?name=${name}${aggregation ? `&aggregation=${aggregation}` : ''}${bucketMs ? `&bucket=${bucketMs}` : ''}`),
  getErrorBudgets: () =>
    apiCall<{ success: boolean; budgets: any[] }>('/error-budgets'),
  recordLog: (entry: { level: string; service: string; message: string; traceId?: string; metadata?: any }) =>
    apiCall<{ success: boolean }>('/logs', { method: 'POST', body: JSON.stringify(entry) }),
  searchLogs: (options?: { level?: string; service?: string; query?: string; traceId?: string; limit?: number }) =>
    apiCall<{ success: boolean; logs: any[] }>(`/logs?${new URLSearchParams(Object.entries({ ...options, q: options?.query }).filter(([k, v]) => v !== undefined && k !== 'query').map(([k,v]) => [k, String(v)])).toString()}`)
};

// ─── React Hooks ─────────────────────────────────────────────────────

/** AI Employee monitoring dashboard */
export function useAIEmployeeMonitor(tenantId: string, pollInterval: number = 15000) {
  const [employees, setEmployees] = useState<AIEmployeeMetrics[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [empResult, anomResult] = await Promise.all([
        adminCenterClient.listEmployees(tenantId),
        adminCenterClient.detectAnomalies(tenantId)
      ]);
      setEmployees(empResult.employees);
      setSummary(empResult.summary);
      setAnomalies(anomResult.anomalies);
    } finally { setLoading(false); }
  }, [tenantId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
  }, [refresh, pollInterval]);

  return { employees, summary, anomalies, loading, refresh };
}

/** Conversation review queue */
export function useConversationReview(tenantId: string) {
  const [reviews, setReviews] = useState<ConversationReview[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadQueue = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const [queueResult, statsResult] = await Promise.all([
        adminCenterClient.getReviewQueue(tenantId, { status }),
        adminCenterClient.getReviewStats(tenantId)
      ]);
      setReviews(queueResult.reviews);
      setTotal(queueResult.total);
      setStats(statsResult.stats);
    } finally { setLoading(false); }
  }, [tenantId]);

  const submit = useCallback(async (reviewId: string, verdict: ReviewVerdict, score: number, notes: string) => {
    await adminCenterClient.submitReview(reviewId, verdict, score, notes);
    await loadQueue();
  }, [loadQueue]);

  const escalate = useCallback(async (reviewId: string, reason: string, to: string) => {
    await adminCenterClient.escalateReview(reviewId, reason, to);
    await loadQueue();
  }, [loadQueue]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  return { reviews, stats, total, loading, loadQueue, submit, escalate };
}

/** Content moderation */
export function useContentModeration(tenantId: string) {
  const [policies, setPolicies] = useState<ModerationPolicy[]>([]);
  const [queue, setQueue] = useState<ModerationResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [policiesResult, queueResult] = await Promise.all([
        adminCenterClient.getModerationPolicies(tenantId),
        adminCenterClient.getModerationQueue(tenantId)
      ]);
      setPolicies(policiesResult.policies);
      setQueue(queueResult.results);
    } finally { setLoading(false); }
  }, [tenantId]);

  const moderate = useCallback(async (contentId: string, content: string, policyId?: string) => {
    const result = await adminCenterClient.moderateContent(tenantId, contentId, content, policyId);
    await loadAll();
    return result.result;
  }, [tenantId, loadAll]);

  useEffect(() => { loadAll(); }, [loadAll]);

  return { policies, queue, loading, moderate, refresh: loadAll };
}

/** System health dashboard */
export function useSystemHealth(pollInterval: number = 10000) {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [slo, setSlo] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [dependencyGraph, setDependencyGraph] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [svcResult, sloResult, resResult, depResult] = await Promise.all([
        adminCenterClient.getServiceRegistry(),
        adminCenterClient.getAggregateSLO(),
        adminCenterClient.getResourceUtilization(),
        adminCenterClient.getDependencyGraph()
      ]);
      setServices(svcResult.services);
      setSlo(sloResult.slo);
      setResources(resResult.resources);
      setDependencyGraph(depResult.graph);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
  }, [refresh, pollInterval]);

  return { services, slo, resources, dependencyGraph, loading, refresh };
}

/** Security alert center */
export function useSecurityAlerts(tenantId: string, pollInterval: number = 10000) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [dashResult, alertsResult, compResult] = await Promise.all([
        adminCenterClient.getSecurityDashboard(tenantId),
        adminCenterClient.listSecurityAlerts(tenantId, { status: 'firing' }),
        adminCenterClient.getComplianceStatus()
      ]);
      setDashboard(dashResult.dashboard);
      setAlerts(alertsResult.alerts);
      setCompliance(compResult.compliance);
    } finally { setLoading(false); }
  }, [tenantId]);

  const acknowledge = useCallback(async (alertId: string) => {
    await adminCenterClient.acknowledgeAlert(alertId);
    await refresh();
  }, [refresh]);

  const resolve = useCallback(async (alertId: string, resolution: string) => {
    await adminCenterClient.resolveAlert(alertId, resolution);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollInterval);
    return () => clearInterval(interval);
  }, [refresh, pollInterval]);

  return { dashboard, alerts, compliance, loading, acknowledge, resolve, refresh };
}

/** Usage analytics */
export function useUsageAnalytics(tenantId: string, periodDays: number = 30) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [costs, setCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsResult, featuresResult, costsResult] = await Promise.all([
        adminCenterClient.getTenantAnalytics(tenantId, periodDays),
        adminCenterClient.getFeatureAdoption(tenantId),
        adminCenterClient.getCostAttribution(tenantId)
      ]);
      setAnalytics(analyticsResult.analytics);
      setFeatures(featuresResult.features);
      setCosts(costsResult.costs);
    } finally { setLoading(false); }
  }, [tenantId, periodDays]);

  useEffect(() => { refresh(); }, [refresh]);

  return { analytics, features, costs, loading, refresh };
}

/** Observability / tracing */
export function useObservability(tenantId: string) {
  const [errorBudgets, setErrorBudgets] = useState<any[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetsResult, rulesResult] = await Promise.all([
        adminCenterClient.getErrorBudgets(),
        adminCenterClient.getAlertRules(tenantId)
      ]);
      setErrorBudgets(budgetsResult.budgets);
      setAlertRules(rulesResult.rules);
    } finally { setLoading(false); }
  }, [tenantId]);

  const createRule = useCallback(async (rule: Partial<AlertRule> & { name: string; condition: any }) => {
    const result = await adminCenterClient.createAlertRule(tenantId, rule);
    await loadAll();
    return result.rule;
  }, [tenantId, loadAll]);

  const searchTraces = useCallback(async (options?: any) => {
    return adminCenterClient.searchTraces(options);
  }, []);

  const queryMetrics = useCallback(async (name: string, aggregation?: string) => {
    return adminCenterClient.queryMetrics(name, aggregation);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return { errorBudgets, alertRules, loading, createRule, searchTraces, queryMetrics, refresh: loadAll };
}

/** Incident management */
export function useIncidentManagement(tenantId: string) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (options?: { phase?: IncidentPhase; severity?: SeverityLevel }) => {
    setLoading(true);
    try {
      const result = await adminCenterClient.listIncidents(tenantId, options);
      setIncidents(result.incidents);
    } finally { setLoading(false); }
  }, [tenantId]);

  const create = useCallback(async (incident: { title: string; severity: SeverityLevel; commander: string; affectedServices?: string[] }) => {
    const result = await adminCenterClient.createIncident(tenantId, incident);
    await refresh();
    return result.incident;
  }, [tenantId, refresh]);

  const updatePhase = useCallback(async (incidentId: string, phase: IncidentPhase, details?: string) => {
    const result = await adminCenterClient.updateIncidentPhase(incidentId, phase, details);
    await refresh();
    return result.incident;
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);

  return { incidents, loading, create, updatePhase, refresh };
}
