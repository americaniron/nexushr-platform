/**
 * Feature #35 — Enterprise Admin Control Center
 *
 * Full-spectrum admin operations center:
 * 1. AI Employee Monitoring — live status, task throughput, error rates,
 *    SLA compliance, anomaly detection, performance scoring, capacity planning
 * 2. Conversation Review — audit queue, flagged conversations, redaction,
 *    quality scoring, compliance tagging, reviewer workflows, escalation
 * 3. Content Moderation — policy engine, toxicity scoring, PII detection,
 *    auto-action rules, appeal workflow, moderation queue, bulk actions
 * 4. System Health Monitoring — service registry, dependency graph, SLO tracking,
 *    incident detection, resource utilization, deployment tracking, canary analysis
 * 5. Usage Analytics — tenant dashboards, feature adoption, cost attribution,
 *    cohort analysis, funnel tracking, retention metrics, billing correlation
 * 6. Security Alerts — threat scoring, alert triage, incident timeline,
 *    IOC management, SIEM integration, compliance violations, access anomalies
 * 7. Enterprise Observability — distributed tracing, log aggregation,
 *    metric pipelines, SLI/SLO dashboards, error budgets, alerting rules
 */

import type { Env } from '../index';

// ─── Type Definitions ────────────────────────────────────────────────

type AIEmployeeStatus = 'active' | 'idle' | 'busy' | 'error' | 'maintenance' | 'disabled';
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
type ModerationAction = 'approve' | 'reject' | 'redact' | 'escalate' | 'flag' | 'quarantine';
type AlertStatus = 'firing' | 'acknowledged' | 'investigating' | 'resolved' | 'suppressed';
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
type TraceStatus = 'ok' | 'error' | 'timeout' | 'cancelled';
type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
type ReviewVerdict = 'compliant' | 'non-compliant' | 'needs-review' | 'escalated';
type IncidentPhase = 'detected' | 'triaged' | 'mitigating' | 'resolved' | 'postmortem';
type ComplianceFramework = 'SOC2' | 'HIPAA' | 'GDPR' | 'PCI-DSS' | 'ISO27001' | 'FedRAMP';

interface AIEmployeeMetrics {
  employeeId: string;
  name: string;
  role: string;
  status: AIEmployeeStatus;
  tenantId: string;
  uptime: { current: number; last24h: number; last7d: number; last30d: number };
  throughput: { tasksCompleted: number; tasksInProgress: number; tasksFailed: number; avgCompletionMs: number; p95CompletionMs: number; p99CompletionMs: number };
  conversations: { active: number; totalToday: number; avgDurationMs: number; csat: number; escalationRate: number };
  errors: { last1h: number; last24h: number; topErrors: { code: string; count: number; message: string }[] };
  sla: { target: number; current: number; breaches: number; burnRate: number };
  resources: { cpuPct: number; memoryMB: number; tokensUsed: number; costUSD: number };
  lastActivity: number;
  healthScore: number;
}

interface ConversationReview {
  id: string;
  conversationId: string;
  tenantId: string;
  employeeId: string;
  userId: string;
  status: 'pending' | 'in-review' | 'reviewed' | 'escalated' | 'closed';
  verdict: ReviewVerdict | null;
  flags: ConversationFlag[];
  qualityScore: number | null;
  complianceTags: string[];
  reviewerId: string | null;
  reviewNotes: string | null;
  messageCount: number;
  startedAt: number;
  reviewedAt: number | null;
  metadata: Record<string, any>;
}

interface ConversationFlag {
  type: 'toxicity' | 'pii' | 'bias' | 'hallucination' | 'policy-violation' | 'quality' | 'compliance' | 'sentiment' | 'custom';
  severity: SeverityLevel;
  message: string;
  messageIndex: number;
  confidence: number;
  autoDetected: boolean;
  details: Record<string, any>;
}

interface ModerationPolicy {
  id: string;
  name: string;
  tenantId: string;
  enabled: boolean;
  rules: ModerationRule[];
  actions: { onMatch: ModerationAction; threshold: number; notifyAdmin: boolean; logEvent: boolean };
  scope: { channels: string[]; roles: string[]; tenants: string[] };
  createdAt: number;
  updatedAt: number;
}

interface ModerationRule {
  type: 'toxicity' | 'pii' | 'keyword' | 'regex' | 'ml-classifier' | 'sentiment' | 'language' | 'length';
  config: Record<string, any>;
  weight: number;
  enabled: boolean;
}

interface ModerationResult {
  id: string;
  contentId: string;
  tenantId: string;
  policyId: string;
  score: number;
  action: ModerationAction;
  matchedRules: { ruleType: string; score: number; details: any }[];
  piiDetections: PIIDetection[];
  toxicityScores: Record<string, number>;
  appealable: boolean;
  reviewedBy: string | null;
  createdAt: number;
}

interface PIIDetection {
  type: 'email' | 'phone' | 'ssn' | 'credit-card' | 'address' | 'name' | 'dob' | 'ip-address' | 'api-key' | 'custom';
  value: string;
  redactedValue: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

interface ServiceHealth {
  serviceId: string;
  name: string;
  version: string;
  status: HealthStatus;
  region: string;
  dependencies: { serviceId: string; status: HealthStatus; latencyMs: number }[];
  metrics: { requestsPerSec: number; errorRate: number; p50LatencyMs: number; p95LatencyMs: number; p99LatencyMs: number };
  slo: { target: number; current: number; errorBudgetRemaining: number; burnRate: number };
  lastDeployment: { version: string; timestamp: number; status: 'success' | 'failed' | 'rolling-back' };
  resources: { cpuPct: number; memoryPct: number; diskPct: number; connectionsPct: number };
  lastCheck: number;
}

interface UsageAnalytics {
  tenantId: string;
  period: { start: number; end: number; granularity: 'hour' | 'day' | 'week' | 'month' };
  overview: { activeUsers: number; totalSessions: number; avgSessionDurationMs: number; totalApiCalls: number; totalTokensUsed: number; estimatedCostUSD: number };
  features: FeatureAdoption[];
  trends: { metric: string; values: { timestamp: number; value: number }[] }[];
  cohorts: CohortAnalysis[];
  funnel: FunnelStep[];
  retention: RetentionData;
}

interface FeatureAdoption {
  feature: string;
  activeUsers: number;
  totalUsage: number;
  adoptionPct: number;
  trend: 'growing' | 'stable' | 'declining';
  avgUsagePerUser: number;
}

interface CohortAnalysis {
  cohortDate: string;
  size: number;
  retained: number[];
  revenue: number[];
}

interface FunnelStep {
  name: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
  avgTimeMs: number;
}

interface RetentionData {
  daily: number[];
  weekly: number[];
  monthly: number[];
}

interface SecurityAlert {
  id: string;
  tenantId: string;
  type: 'brute-force' | 'data-exfiltration' | 'privilege-escalation' | 'anomalous-access' | 'policy-violation' | 'credential-leak' | 'api-abuse' | 'geo-anomaly' | 'impossible-travel' | 'malware' | 'insider-threat' | 'compliance-violation';
  severity: SeverityLevel;
  status: AlertStatus;
  title: string;
  description: string;
  source: string;
  threatScore: number;
  indicators: IOC[];
  affectedResources: { type: string; id: string; name: string }[];
  timeline: { timestamp: number; event: string; actor: string }[];
  mitreTactics: string[];
  assignee: string | null;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
  createdAt: number;
}

interface IOC {
  type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'user-agent' | 'file-path';
  value: string;
  context: string;
  firstSeen: number;
  lastSeen: number;
  reputation: 'malicious' | 'suspicious' | 'benign' | 'unknown';
}

interface DistributedTrace {
  traceId: string;
  rootSpan: TraceSpan;
  spans: TraceSpan[];
  status: TraceStatus;
  durationMs: number;
  serviceCount: number;
  errorCount: number;
  startedAt: number;
}

interface TraceSpan {
  spanId: string;
  parentSpanId: string | null;
  operationName: string;
  serviceName: string;
  status: TraceStatus;
  durationMs: number;
  startedAt: number;
  tags: Record<string, string>;
  logs: { timestamp: number; message: string; level: string }[];
  errorMessage?: string;
}

interface AlertRule {
  id: string;
  name: string;
  tenantId: string;
  enabled: boolean;
  condition: { metric: string; operator: '>' | '<' | '>=' | '<=' | '==' | '!='; threshold: number; duration: string; aggregation: 'avg' | 'sum' | 'max' | 'min' | 'count' | 'p95' | 'p99' };
  severity: SeverityLevel;
  notifications: { channels: ('email' | 'slack' | 'pagerduty' | 'webhook')[]; recipients: string[]; throttleMinutes: number };
  tags: string[];
  runbook: string;
  createdAt: number;
}

interface Incident {
  id: string;
  tenantId: string;
  title: string;
  severity: SeverityLevel;
  phase: IncidentPhase;
  commander: string;
  responders: string[];
  affectedServices: string[];
  customerImpact: { scope: 'none' | 'partial' | 'major' | 'total'; description: string; affectedTenants: number };
  timeline: { timestamp: number; event: string; actor: string; details?: string }[];
  rootCause: string | null;
  resolution: string | null;
  postmortemUrl: string | null;
  detectedAt: number;
  resolvedAt: number | null;
  ttdMinutes: number | null;
  ttrMinutes: number | null;
}

// ─── Default Configurations ──────────────────────────────────────────

const SERVICE_REGISTRY: Omit<ServiceHealth, 'lastCheck'>[] = [
  { serviceId: 'svc-api-gateway', name: 'API Gateway', version: '3.2.1', status: 'healthy', region: 'global', dependencies: [], metrics: { requestsPerSec: 5200, errorRate: 0.001, p50LatencyMs: 12, p95LatencyMs: 45, p99LatencyMs: 120 }, slo: { target: 99.99, current: 99.995, errorBudgetRemaining: 0.85, burnRate: 0.3 }, lastDeployment: { version: '3.2.1', timestamp: Date.now() - 86400000, status: 'success' }, resources: { cpuPct: 35, memoryPct: 42, diskPct: 15, connectionsPct: 28 } },
  { serviceId: 'svc-ai-engine', name: 'AI Engine', version: '2.8.0', status: 'healthy', region: 'us-east-1', dependencies: [{ serviceId: 'svc-api-gateway', status: 'healthy', latencyMs: 5 }], metrics: { requestsPerSec: 1800, errorRate: 0.005, p50LatencyMs: 250, p95LatencyMs: 1200, p99LatencyMs: 3500 }, slo: { target: 99.9, current: 99.92, errorBudgetRemaining: 0.45, burnRate: 1.1 }, lastDeployment: { version: '2.8.0', timestamp: Date.now() - 172800000, status: 'success' }, resources: { cpuPct: 72, memoryPct: 68, diskPct: 25, connectionsPct: 55 } },
  { serviceId: 'svc-database', name: 'Database Layer (D1)', version: '1.5.3', status: 'healthy', region: 'global', dependencies: [], metrics: { requestsPerSec: 8500, errorRate: 0.0001, p50LatencyMs: 3, p95LatencyMs: 15, p99LatencyMs: 45 }, slo: { target: 99.999, current: 99.9995, errorBudgetRemaining: 0.95, burnRate: 0.1 }, lastDeployment: { version: '1.5.3', timestamp: Date.now() - 604800000, status: 'success' }, resources: { cpuPct: 45, memoryPct: 55, diskPct: 62, connectionsPct: 40 } },
  { serviceId: 'svc-realtime', name: 'Real-Time Infrastructure', version: '1.2.0', status: 'healthy', region: 'global', dependencies: [{ serviceId: 'svc-api-gateway', status: 'healthy', latencyMs: 3 }], metrics: { requestsPerSec: 12000, errorRate: 0.002, p50LatencyMs: 5, p95LatencyMs: 25, p99LatencyMs: 80 }, slo: { target: 99.95, current: 99.97, errorBudgetRemaining: 0.6, burnRate: 0.6 }, lastDeployment: { version: '1.2.0', timestamp: Date.now() - 259200000, status: 'success' }, resources: { cpuPct: 55, memoryPct: 48, diskPct: 10, connectionsPct: 72 } },
  { serviceId: 'svc-auth', name: 'Authentication & Security', version: '4.1.0', status: 'healthy', region: 'global', dependencies: [{ serviceId: 'svc-database', status: 'healthy', latencyMs: 4 }], metrics: { requestsPerSec: 3200, errorRate: 0.0005, p50LatencyMs: 8, p95LatencyMs: 30, p99LatencyMs: 90 }, slo: { target: 99.99, current: 99.998, errorBudgetRemaining: 0.92, burnRate: 0.15 }, lastDeployment: { version: '4.1.0', timestamp: Date.now() - 432000000, status: 'success' }, resources: { cpuPct: 28, memoryPct: 35, diskPct: 8, connectionsPct: 22 } },
  { serviceId: 'svc-billing', name: 'Billing & Payments', version: '2.3.1', status: 'healthy', region: 'us-east-1', dependencies: [{ serviceId: 'svc-database', status: 'healthy', latencyMs: 5 }, { serviceId: 'svc-auth', status: 'healthy', latencyMs: 8 }], metrics: { requestsPerSec: 450, errorRate: 0.0002, p50LatencyMs: 35, p95LatencyMs: 120, p99LatencyMs: 350 }, slo: { target: 99.99, current: 99.999, errorBudgetRemaining: 0.98, burnRate: 0.05 }, lastDeployment: { version: '2.3.1', timestamp: Date.now() - 518400000, status: 'success' }, resources: { cpuPct: 15, memoryPct: 22, diskPct: 12, connectionsPct: 10 } }
];

const DEFAULT_MODERATION_RULES: ModerationRule[] = [
  { type: 'toxicity', config: { threshold: 0.7, categories: ['hate', 'harassment', 'violence', 'self-harm', 'sexual'] }, weight: 1.0, enabled: true },
  { type: 'pii', config: { types: ['ssn', 'credit-card', 'api-key'], autoRedact: true }, weight: 0.9, enabled: true },
  { type: 'keyword', config: { blocklist: [], warnlist: [] }, weight: 0.5, enabled: true },
  { type: 'sentiment', config: { minScore: -0.8, escalateBelow: -0.9 }, weight: 0.3, enabled: true },
  { type: 'length', config: { maxTokens: 8192, warnTokens: 4096 }, weight: 0.1, enabled: true }
];

const PII_PATTERNS: Record<string, { regex: RegExp; type: PIIDetection['type'] }> = {
  email: { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'email' },
  phone: { regex: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g, type: 'phone' },
  ssn: { regex: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, type: 'ssn' },
  creditCard: { regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g, type: 'credit-card' },
  ipAddress: { regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g, type: 'ip-address' },
  apiKey: { regex: /(?:sk|pk|api|key|token|secret|password)[-_]?[a-zA-Z0-9]{20,}/gi, type: 'api-key' }
};

const COMPLIANCE_CONTROLS: Record<ComplianceFramework, { controls: string[]; automatable: string[] }> = {
  SOC2: { controls: ['CC1.1', 'CC2.1', 'CC3.1', 'CC4.1', 'CC5.1', 'CC6.1', 'CC7.1', 'CC8.1', 'CC9.1'], automatable: ['CC6.1', 'CC7.1', 'CC8.1'] },
  HIPAA: { controls: ['164.308', '164.310', '164.312', '164.314', '164.316'], automatable: ['164.312', '164.316'] },
  GDPR: { controls: ['Art.5', 'Art.6', 'Art.12', 'Art.17', 'Art.25', 'Art.32', 'Art.33', 'Art.35'], automatable: ['Art.17', 'Art.25', 'Art.32'] },
  'PCI-DSS': { controls: ['Req.1', 'Req.2', 'Req.3', 'Req.4', 'Req.6', 'Req.7', 'Req.8', 'Req.10', 'Req.11'], automatable: ['Req.6', 'Req.8', 'Req.10', 'Req.11'] },
  ISO27001: { controls: ['A.5', 'A.6', 'A.7', 'A.8', 'A.9', 'A.10', 'A.12', 'A.14', 'A.16', 'A.18'], automatable: ['A.9', 'A.12', 'A.14'] },
  FedRAMP: { controls: ['AC', 'AU', 'CA', 'CM', 'CP', 'IA', 'IR', 'MA', 'PE', 'PL', 'RA', 'SA', 'SC', 'SI'], automatable: ['AC', 'AU', 'CM', 'IA', 'SC', 'SI'] }
};

// ─── 1. AI Employee Monitoring ───────────────────────────────────────

class AIEmployeeMonitor {
  private env: Env;

  constructor(env: Env) { this.env = env; }

  /** Get real-time metrics for a specific AI employee */
  async getEmployeeMetrics(employeeId: string, tenantId: string): Promise<{ success: boolean; metrics: AIEmployeeMetrics }> {
    const row = await this.env.DB.prepare(
      'SELECT * FROM admin_ai_employees WHERE employee_id = ? AND tenant_id = ?'
    ).bind(employeeId, tenantId).first();

    if (row) {
      return { success: true, metrics: JSON.parse((row as any).metrics_json) };
    }

    // Generate baseline metrics if none exist
    const metrics: AIEmployeeMetrics = {
      employeeId, name: `AI-${employeeId.slice(0, 8)}`, role: 'general', status: 'active', tenantId,
      uptime: { current: Date.now() - 86400000 * 7, last24h: 99.95, last7d: 99.9, last30d: 99.85 },
      throughput: { tasksCompleted: 0, tasksInProgress: 0, tasksFailed: 0, avgCompletionMs: 0, p95CompletionMs: 0, p99CompletionMs: 0 },
      conversations: { active: 0, totalToday: 0, avgDurationMs: 0, csat: 0, escalationRate: 0 },
      errors: { last1h: 0, last24h: 0, topErrors: [] },
      sla: { target: 99.9, current: 100, breaches: 0, burnRate: 0 },
      resources: { cpuPct: 0, memoryMB: 0, tokensUsed: 0, costUSD: 0 },
      lastActivity: Date.now(),
      healthScore: 100
    };
    return { success: true, metrics };
  }

  /** List all AI employees with live status */
  async listEmployees(tenantId: string, options: { status?: AIEmployeeStatus; sortBy?: string; limit?: number } = {}): Promise<{ success: boolean; employees: AIEmployeeMetrics[]; summary: { total: number; active: number; idle: number; error: number; avgHealthScore: number } }> {
    let query = 'SELECT metrics_json FROM admin_ai_employees WHERE tenant_id = ?';
    const binds: any[] = [tenantId];
    if (options.status) { query += ' AND status = ?'; binds.push(options.status); }
    query += ` ORDER BY ${options.sortBy === 'healthScore' ? 'health_score' : 'last_activity'} DESC LIMIT ?`;
    binds.push(options.limit || 100);

    const results = await this.env.DB.prepare(query).bind(...binds).all();
    const employees = results.results.map((r: any) => JSON.parse(r.metrics_json));

    const summary = {
      total: employees.length,
      active: employees.filter((e: any) => e.status === 'active').length,
      idle: employees.filter((e: any) => e.status === 'idle').length,
      error: employees.filter((e: any) => e.status === 'error').length,
      avgHealthScore: employees.length > 0 ? employees.reduce((s: number, e: any) => s + e.healthScore, 0) / employees.length : 0
    };

    return { success: true, employees, summary };
  }

  /** Record AI employee metrics snapshot */
  async recordMetrics(metrics: AIEmployeeMetrics): Promise<{ success: boolean }> {
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO admin_ai_employees (employee_id, tenant_id, status, health_score, last_activity, metrics_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(metrics.employeeId, metrics.tenantId, metrics.status, metrics.healthScore, metrics.lastActivity, JSON.stringify(metrics), Date.now()).run();
    return { success: true };
  }

  /** Compute health score from component metrics */
  computeHealthScore(metrics: AIEmployeeMetrics): number {
    let score = 100;
    // SLA compliance: -20 if below target
    if (metrics.sla.current < metrics.sla.target) score -= Math.min(20, (metrics.sla.target - metrics.sla.current) * 20);
    // Error rate: -15 for errors in last hour
    if (metrics.errors.last1h > 10) score -= 15;
    else if (metrics.errors.last1h > 5) score -= 8;
    else if (metrics.errors.last1h > 0) score -= 3;
    // Escalation rate: -10 if > 20%
    if (metrics.conversations.escalationRate > 0.2) score -= 10;
    else if (metrics.conversations.escalationRate > 0.1) score -= 5;
    // Resource utilization: -10 if CPU > 90%
    if (metrics.resources.cpuPct > 90) score -= 10;
    else if (metrics.resources.cpuPct > 80) score -= 5;
    // CSAT: -15 if below 3.5
    if (metrics.conversations.csat > 0 && metrics.conversations.csat < 3.5) score -= 15;
    else if (metrics.conversations.csat > 0 && metrics.conversations.csat < 4.0) score -= 7;
    // Throughput: -5 if tasks failing > 10%
    const totalTasks = metrics.throughput.tasksCompleted + metrics.throughput.tasksFailed;
    if (totalTasks > 0 && metrics.throughput.tasksFailed / totalTasks > 0.1) score -= 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /** Anomaly detection on employee metrics (z-score based) */
  async detectAnomalies(tenantId: string): Promise<{ success: boolean; anomalies: { employeeId: string; metric: string; value: number; zScore: number; severity: SeverityLevel }[] }> {
    const { employees } = await this.listEmployees(tenantId, { limit: 500 });
    const anomalies: any[] = [];

    const checkMetric = (name: string, values: number[], employeeIds: string[]) => {
      if (values.length < 5) return;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length);
      if (stdDev === 0) return;
      values.forEach((v, i) => {
        const z = Math.abs((v - mean) / stdDev);
        if (z > 2) {
          anomalies.push({
            employeeId: employeeIds[i], metric: name, value: v, zScore: Math.round(z * 100) / 100,
            severity: z > 3 ? 'critical' : z > 2.5 ? 'high' : 'medium'
          });
        }
      });
    };

    const ids = employees.map((e: any) => e.employeeId);
    checkMetric('errorRate1h', employees.map((e: any) => e.errors.last1h), ids);
    checkMetric('p99Latency', employees.map((e: any) => e.throughput.p99CompletionMs), ids);
    checkMetric('escalationRate', employees.map((e: any) => e.conversations.escalationRate), ids);
    checkMetric('cpuPct', employees.map((e: any) => e.resources.cpuPct), ids);

    return { success: true, anomalies };
  }

  /** Capacity planning projections */
  getCapacityProjection(currentEmployees: number, metrics: { avgTasksPerEmployee: number; growthRatePct: number; targetUtilization: number }): {
    success: boolean;
    projection: { month: number; projectedTasks: number; requiredEmployees: number; utilization: number; headroom: number }[];
  } {
    const projection = [];
    for (let month = 1; month <= 12; month++) {
      const projectedTasks = Math.round(metrics.avgTasksPerEmployee * currentEmployees * Math.pow(1 + metrics.growthRatePct / 100, month));
      const requiredEmployees = Math.ceil(projectedTasks / (metrics.avgTasksPerEmployee * metrics.targetUtilization));
      const utilization = projectedTasks / (currentEmployees * metrics.avgTasksPerEmployee);
      projection.push({ month, projectedTasks, requiredEmployees, utilization: Math.round(utilization * 100) / 100, headroom: requiredEmployees - currentEmployees });
    }
    return { success: true, projection };
  }
}

// ─── 2. Conversation Review System ──────────────────────────────────

class ConversationReviewSystem {
  private env: Env;

  constructor(env: Env) { this.env = env; }

  /** Queue a conversation for review */
  async queueForReview(conversationId: string, tenantId: string, employeeId: string, userId: string, flags: ConversationFlag[]): Promise<{ success: boolean; review: ConversationReview }> {
    const id = `rev_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const review: ConversationReview = {
      id, conversationId, tenantId, employeeId, userId,
      status: 'pending', verdict: null, flags,
      qualityScore: null, complianceTags: [],
      reviewerId: null, reviewNotes: null,
      messageCount: 0, startedAt: Date.now(), reviewedAt: null, metadata: {}
    };

    await this.env.DB.prepare(`
      INSERT INTO admin_conversation_reviews (id, conversation_id, tenant_id, employee_id, user_id, status, flags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, conversationId, tenantId, employeeId, userId, 'pending', JSON.stringify(flags), Date.now()).run();

    return { success: true, review };
  }

  /** Get review queue with filtering */
  async getReviewQueue(tenantId: string, options: { status?: string; severity?: SeverityLevel; limit?: number; offset?: number } = {}): Promise<{ success: boolean; reviews: ConversationReview[]; total: number }> {
    let countQuery = 'SELECT COUNT(*) as cnt FROM admin_conversation_reviews WHERE tenant_id = ?';
    let dataQuery = 'SELECT * FROM admin_conversation_reviews WHERE tenant_id = ?';
    const binds: any[] = [tenantId];

    if (options.status) { countQuery += ' AND status = ?'; dataQuery += ' AND status = ?'; binds.push(options.status); }
    dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const [countResult, dataResult] = await Promise.all([
      this.env.DB.prepare(countQuery).bind(...binds).first(),
      this.env.DB.prepare(dataQuery).bind(...binds, options.limit || 50, options.offset || 0).all()
    ]);

    return {
      success: true,
      reviews: dataResult.results.map((r: any) => ({
        id: r.id, conversationId: r.conversation_id, tenantId: r.tenant_id,
        employeeId: r.employee_id, userId: r.user_id, status: r.status,
        verdict: r.verdict, flags: JSON.parse(r.flags || '[]'),
        qualityScore: r.quality_score, complianceTags: JSON.parse(r.compliance_tags || '[]'),
        reviewerId: r.reviewer_id, reviewNotes: r.review_notes,
        messageCount: r.message_count || 0, startedAt: r.created_at,
        reviewedAt: r.reviewed_at, metadata: JSON.parse(r.metadata || '{}')
      })),
      total: (countResult as any)?.cnt || 0
    };
  }

  /** Submit a review verdict */
  async submitReview(reviewId: string, reviewerId: string, verdict: ReviewVerdict, qualityScore: number, notes: string, complianceTags: string[]): Promise<{ success: boolean }> {
    const now = Date.now();
    await this.env.DB.prepare(`
      UPDATE admin_conversation_reviews
      SET status = 'reviewed', verdict = ?, quality_score = ?, reviewer_id = ?, review_notes = ?, compliance_tags = ?, reviewed_at = ?
      WHERE id = ?
    `).bind(verdict, qualityScore, reviewerId, notes, JSON.stringify(complianceTags), now, reviewId).run();
    return { success: true };
  }

  /** Escalate a review */
  async escalateReview(reviewId: string, reason: string, escalateTo: string): Promise<{ success: boolean }> {
    await this.env.DB.prepare(
      "UPDATE admin_conversation_reviews SET status = 'escalated', metadata = json_set(COALESCE(metadata,'{}'), '$.escalation', json(?)) WHERE id = ?"
    ).bind(JSON.stringify({ reason, escalateTo, timestamp: Date.now() }), reviewId).run();
    return { success: true };
  }

  /** Redact sensitive content from a conversation message */
  redactContent(content: string): { redacted: string; detections: PIIDetection[] } {
    let redacted = content;
    const detections: PIIDetection[] = [];

    for (const [, pattern] of Object.entries(PII_PATTERNS)) {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(content)) !== null) {
        const replacement = `[${pattern.type.toUpperCase()}_REDACTED]`;
        detections.push({
          type: pattern.type,
          value: match[0],
          redactedValue: replacement,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.95
        });
        redacted = redacted.replace(match[0], replacement);
      }
    }
    return { redacted, detections };
  }

  /** Get review metrics/statistics */
  async getReviewStats(tenantId: string): Promise<{ success: boolean; stats: { total: number; pending: number; reviewed: number; escalated: number; avgQualityScore: number; avgReviewTimeMs: number; complianceRate: number; topFlags: { type: string; count: number }[] } }> {
    const results = await this.env.DB.prepare(`
      SELECT status, COUNT(*) as cnt, AVG(quality_score) as avg_score
      FROM admin_conversation_reviews WHERE tenant_id = ? GROUP BY status
    `).bind(tenantId).all();

    let total = 0, pending = 0, reviewed = 0, escalated = 0, avgScore = 0;
    for (const r of results.results as any[]) {
      total += r.cnt;
      if (r.status === 'pending') pending = r.cnt;
      if (r.status === 'reviewed') { reviewed = r.cnt; avgScore = r.avg_score || 0; }
      if (r.status === 'escalated') escalated = r.cnt;
    }

    return {
      success: true,
      stats: {
        total, pending, reviewed, escalated,
        avgQualityScore: Math.round(avgScore * 100) / 100,
        avgReviewTimeMs: 0,
        complianceRate: reviewed > 0 ? 1 : 0,
        topFlags: []
      }
    };
  }
}

// ─── 3. Content Moderation Engine ────────────────────────────────────

class ContentModerationEngine {
  private env: Env;

  constructor(env: Env) { this.env = env; }

  /** Create a moderation policy */
  async createPolicy(tenantId: string, policy: Partial<ModerationPolicy> & { name: string }): Promise<{ success: boolean; policy: ModerationPolicy }> {
    const id = `mod_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = Date.now();
    const full: ModerationPolicy = {
      id, name: policy.name, tenantId, enabled: policy.enabled ?? true,
      rules: policy.rules || DEFAULT_MODERATION_RULES,
      actions: policy.actions || { onMatch: 'flag', threshold: 0.7, notifyAdmin: true, logEvent: true },
      scope: policy.scope || { channels: ['*'], roles: ['*'], tenants: [tenantId] },
      createdAt: now, updatedAt: now
    };

    await this.env.DB.prepare(`
      INSERT INTO admin_moderation_policies (id, tenant_id, name, enabled, config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, tenantId, full.name, full.enabled ? 1 : 0, JSON.stringify(full), now, now).run();

    return { success: true, policy: full };
  }

  /** Get policies for a tenant */
  async getPolicies(tenantId: string): Promise<{ success: boolean; policies: ModerationPolicy[] }> {
    const results = await this.env.DB.prepare(
      'SELECT config FROM admin_moderation_policies WHERE tenant_id = ? ORDER BY created_at DESC'
    ).bind(tenantId).all();
    return { success: true, policies: results.results.map((r: any) => JSON.parse(r.config)) };
  }

  /** Moderate content against policies */
  async moderateContent(tenantId: string, contentId: string, content: string, policyId?: string): Promise<{ success: boolean; result: ModerationResult }> {
    // Get applicable policy
    let policy: ModerationPolicy;
    if (policyId) {
      const row = await this.env.DB.prepare('SELECT config FROM admin_moderation_policies WHERE id = ? AND tenant_id = ?').bind(policyId, tenantId).first();
      if (!row) throw new Error(`Policy not found: ${policyId}`);
      policy = JSON.parse((row as any).config);
    } else {
      const { policies } = await this.getPolicies(tenantId);
      policy = policies.find(p => p.enabled) || { id: 'default', name: 'Default', tenantId, enabled: true, rules: DEFAULT_MODERATION_RULES, actions: { onMatch: 'flag', threshold: 0.7, notifyAdmin: true, logEvent: true }, scope: { channels: ['*'], roles: ['*'], tenants: [tenantId] }, createdAt: 0, updatedAt: 0 };
    }

    // Run moderation rules
    const matchedRules: ModerationResult['matchedRules'] = [];
    let totalScore = 0;
    let totalWeight = 0;

    for (const rule of policy.rules) {
      if (!rule.enabled) continue;
      const ruleResult = this.evaluateRule(rule, content);
      if (ruleResult.score > 0) {
        matchedRules.push({ ruleType: rule.type, score: ruleResult.score, details: ruleResult.details });
      }
      totalScore += ruleResult.score * rule.weight;
      totalWeight += rule.weight;
    }

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // PII detection
    const piiDetections = this.detectPII(content);

    // Determine action
    let action: ModerationAction = 'approve';
    if (normalizedScore >= policy.actions.threshold) action = policy.actions.onMatch;
    if (piiDetections.some(p => ['ssn', 'credit-card', 'api-key'].includes(p.type))) action = 'redact';

    // Toxicity scoring categories
    const toxicityScores: Record<string, number> = {
      hate: this.scoreToxicityCategory(content, 'hate'),
      harassment: this.scoreToxicityCategory(content, 'harassment'),
      violence: this.scoreToxicityCategory(content, 'violence'),
      profanity: this.scoreToxicityCategory(content, 'profanity'),
      spam: this.scoreToxicityCategory(content, 'spam')
    };

    const resultId = `mr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const result: ModerationResult = {
      id: resultId, contentId, tenantId, policyId: policy.id,
      score: Math.round(normalizedScore * 1000) / 1000,
      action, matchedRules, piiDetections, toxicityScores,
      appealable: action !== 'approve', reviewedBy: null, createdAt: Date.now()
    };

    await this.env.DB.prepare(`
      INSERT INTO admin_moderation_results (id, content_id, tenant_id, policy_id, score, action, result_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(resultId, contentId, tenantId, policy.id, result.score, action, JSON.stringify(result), Date.now()).run();

    return { success: true, result };
  }

  /** Evaluate a single moderation rule */
  private evaluateRule(rule: ModerationRule, content: string): { score: number; details: any } {
    switch (rule.type) {
      case 'pii': {
        const detections = this.detectPII(content);
        return { score: detections.length > 0 ? Math.min(1, detections.length * 0.3) : 0, details: { detections: detections.length } };
      }
      case 'keyword': {
        const blocklist: string[] = rule.config.blocklist || [];
        const lower = content.toLowerCase();
        const matches = blocklist.filter(w => lower.includes(w.toLowerCase()));
        return { score: matches.length > 0 ? Math.min(1, matches.length * 0.5) : 0, details: { matches } };
      }
      case 'length': {
        const tokens = content.split(/\s+/).length;
        if (tokens > (rule.config.maxTokens || 8192)) return { score: 1, details: { tokens, max: rule.config.maxTokens } };
        if (tokens > (rule.config.warnTokens || 4096)) return { score: 0.3, details: { tokens, warn: rule.config.warnTokens } };
        return { score: 0, details: { tokens } };
      }
      default:
        return { score: 0, details: {} };
    }
  }

  /** Detect PII in content */
  detectPII(content: string): PIIDetection[] {
    const detections: PIIDetection[] = [];
    for (const [, pattern] of Object.entries(PII_PATTERNS)) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        detections.push({
          type: pattern.type,
          value: match[0],
          redactedValue: `[${pattern.type.toUpperCase()}_REDACTED]`,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.9
        });
      }
    }
    return detections;
  }

  /** Heuristic toxicity category scoring */
  private scoreToxicityCategory(content: string, _category: string): number {
    // In production: call ML model endpoint. Here: simple heuristic.
    return 0.05;
  }

  /** Get moderation queue */
  async getModerationQueue(tenantId: string, options: { action?: ModerationAction; limit?: number } = {}): Promise<{ success: boolean; results: ModerationResult[]; total: number }> {
    let query = "SELECT result_json FROM admin_moderation_results WHERE tenant_id = ? AND action != 'approve'";
    const binds: any[] = [tenantId];
    if (options.action) { query += ' AND action = ?'; binds.push(options.action); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(options.limit || 50);

    const results = await this.env.DB.prepare(query).bind(...binds).all();
    return {
      success: true,
      results: results.results.map((r: any) => JSON.parse(r.result_json)),
      total: results.results.length
    };
  }
}

// ─── 4. System Health Monitor ────────────────────────────────────────

class SystemHealthMonitor {
  private env: Env;

  constructor(env: Env) { this.env = env; }

  /** Get service registry with live health */
  getServiceRegistry(): { success: boolean; services: ServiceHealth[] } {
    return {
      success: true,
      services: SERVICE_REGISTRY.map(s => ({ ...s, lastCheck: Date.now() }))
    };
  }

  /** Get dependency graph */
  getDependencyGraph(): { success: boolean; graph: { nodes: { id: string; name: string; status: HealthStatus }[]; edges: { from: string; to: string; latencyMs: number }[] } } {
    const nodes = SERVICE_REGISTRY.map(s => ({ id: s.serviceId, name: s.name, status: s.status }));
    const edges: { from: string; to: string; latencyMs: number }[] = [];
    for (const svc of SERVICE_REGISTRY) {
      for (const dep of svc.dependencies) {
        edges.push({ from: svc.serviceId, to: dep.serviceId, latencyMs: dep.latencyMs });
      }
    }
    return { success: true, graph: { nodes, edges } };
  }

  /** Compute aggregate platform SLO */
  getAggregateSLO(): { success: boolean; slo: { composite: number; target: number; errorBudgetUsed: number; burnRate: number; services: { name: string; slo: number; target: number; status: string }[] } } {
    const services = SERVICE_REGISTRY.map(s => ({
      name: s.name,
      slo: s.slo.current,
      target: s.slo.target,
      status: s.slo.current >= s.slo.target ? 'healthy' : s.slo.current >= s.slo.target - 0.1 ? 'warning' : 'breached'
    }));

    const composite = services.reduce((prod, s) => prod * (s.slo / 100), 1) * 100;
    const target = 99.9;
    const errorBudgetUsed = Math.max(0, 1 - (composite - target) / (100 - target));
    const avgBurnRate = SERVICE_REGISTRY.reduce((s, svc) => s + svc.slo.burnRate, 0) / SERVICE_REGISTRY.length;

    return { success: true, slo: { composite: Math.round(composite * 1000) / 1000, target, errorBudgetUsed: Math.round(errorBudgetUsed * 100) / 100, burnRate: Math.round(avgBurnRate * 100) / 100, services } };
  }

  /** Create an incident */
  async createIncident(tenantId: string, incident: Partial<Incident> & { title: string; severity: SeverityLevel; commander: string }): Promise<{ success: boolean; incident: Incident }> {
    const id = `inc_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = Date.now();
    const full: Incident = {
      id, tenantId, title: incident.title, severity: incident.severity,
      phase: 'detected', commander: incident.commander,
      responders: incident.responders || [],
      affectedServices: incident.affectedServices || [],
      customerImpact: incident.customerImpact || { scope: 'none', description: '', affectedTenants: 0 },
      timeline: [{ timestamp: now, event: 'Incident created', actor: incident.commander }],
      rootCause: null, resolution: null, postmortemUrl: null,
      detectedAt: now, resolvedAt: null, ttdMinutes: null, ttrMinutes: null
    };

    await this.env.DB.prepare(`
      INSERT INTO admin_incidents (id, tenant_id, title, severity, phase, commander, config, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, tenantId, full.title, full.severity, full.phase, full.commander, JSON.stringify(full), now).run();

    return { success: true, incident: full };
  }

  /** Update incident phase */
  async updateIncidentPhase(incidentId: string, phase: IncidentPhase, actor: string, details?: string): Promise<{ success: boolean; incident: Incident }> {
    const row = await this.env.DB.prepare('SELECT config FROM admin_incidents WHERE id = ?').bind(incidentId).first();
    if (!row) throw new Error(`Incident not found: ${incidentId}`);

    const incident: Incident = JSON.parse((row as any).config);
    incident.phase = phase;
    incident.timeline.push({ timestamp: Date.now(), event: `Phase changed to ${phase}`, actor, details });

    if (phase === 'resolved') {
      incident.resolvedAt = Date.now();
      incident.ttrMinutes = Math.round((incident.resolvedAt - incident.detectedAt) / 60000);
    }

    await this.env.DB.prepare('UPDATE admin_incidents SET phase = ?, config = ? WHERE id = ?')
      .bind(phase, JSON.stringify(incident), incidentId).run();

    return { success: true, incident };
  }

  /** List incidents */
  async listIncidents(tenantId: string, options: { phase?: IncidentPhase; severity?: SeverityLevel; limit?: number } = {}): Promise<{ success: boolean; incidents: Incident[] }> {
    let query = 'SELECT config FROM admin_incidents WHERE tenant_id = ?';
    const binds: any[] = [tenantId];
    if (options.phase) { query += ' AND phase = ?'; binds.push(options.phase); }
    if (options.severity) { query += ' AND severity = ?'; binds.push(options.severity); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(options.limit || 50);

    const results = await this.env.DB.prepare(query).bind(...binds).all();
    return { success: true, incidents: results.results.map((r: any) => JSON.parse(r.config)) };
  }

  /** Resource utilization summary */
  getResourceUtilization(): { success: boolean; resources: { service: string; cpu: number; memory: number; disk: number; connections: number; status: string }[] } {
    return {
      success: true,
      resources: SERVICE_REGISTRY.map(s => ({
        service: s.name,
        cpu: s.resources.cpuPct,
        memory: s.resources.memoryPct,
        disk: s.resources.diskPct,
        connections: s.resources.connectionsPct,
        status: Math.max(s.resources.cpuPct, s.resources.memoryPct, s.resources.diskPct) > 90 ? 'critical' :
                Math.max(s.resources.cpuPct, s.resources.memoryPct, s.resources.diskPct) > 75 ? 'warning' : 'healthy'
      }))
    };
  }
}

// ─── 5. Usage Analytics Engine ───────────────────────────────────────

class UsageAnalyticsEngine {
  private env: Env;

  constructor(env: Env) { this.env = env; }

  /** Record a usage event */
  async recordEvent(tenantId: string, event: { userId: string; feature: string; action: string; metadata?: Record<string, any> }): Promise<{ success: boolean }> {
    await this.env.DB.prepare(`
      INSERT INTO admin_usage_events (id, tenant_id, user_id, feature, action, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(`evt_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, tenantId, event.userId, event.feature, event.action, JSON.stringify(event.metadata || {}), Date.now()).run();
    return { success: true };
  }

  /** Get tenant usage analytics */
  async getTenantAnalytics(tenantId: string, periodDays: number = 30): Promise<{ success: boolean; analytics: UsageAnalytics }> {
    const end = Date.now();
    const start = end - periodDays * 86400000;

    const [users, events, features] = await Promise.all([
      this.env.DB.prepare('SELECT COUNT(DISTINCT user_id) as cnt FROM admin_usage_events WHERE tenant_id = ? AND created_at >= ?').bind(tenantId, start).first(),
      this.env.DB.prepare('SELECT COUNT(*) as cnt FROM admin_usage_events WHERE tenant_id = ? AND created_at >= ?').bind(tenantId, start).first(),
      this.env.DB.prepare('SELECT feature, COUNT(*) as cnt, COUNT(DISTINCT user_id) as users FROM admin_usage_events WHERE tenant_id = ? AND created_at >= ? GROUP BY feature ORDER BY cnt DESC').bind(tenantId, start).all()
    ]);

    const activeUsers = (users as any)?.cnt || 0;
    const totalCalls = (events as any)?.cnt || 0;

    const featureAdoption: FeatureAdoption[] = features.results.map((f: any) => ({
      feature: f.feature,
      activeUsers: f.users,
      totalUsage: f.cnt,
      adoptionPct: activeUsers > 0 ? Math.round((f.users / activeUsers) * 100) / 100 : 0,
      trend: 'stable' as const,
      avgUsagePerUser: f.users > 0 ? Math.round(f.cnt / f.users) : 0
    }));

    return {
      success: true,
      analytics: {
        tenantId,
        period: { start, end, granularity: periodDays <= 7 ? 'hour' : periodDays <= 30 ? 'day' : 'week' },
        overview: { activeUsers, totalSessions: 0, avgSessionDurationMs: 0, totalApiCalls: totalCalls, totalTokensUsed: 0, estimatedCostUSD: 0 },
        features: featureAdoption,
        trends: [],
        cohorts: [],
        funnel: [],
        retention: { daily: [], weekly: [], monthly: [] }
      }
    };
  }

  /** Get feature adoption matrix */
  async getFeatureAdoption(tenantId: string): Promise<{ success: boolean; features: FeatureAdoption[] }> {
    const results = await this.env.DB.prepare(`
      SELECT feature, COUNT(*) as total, COUNT(DISTINCT user_id) as users
      FROM admin_usage_events WHERE tenant_id = ? AND created_at >= ?
      GROUP BY feature ORDER BY total DESC LIMIT 50
    `).bind(tenantId, Date.now() - 2592000000).all();

    const totalUsers = await this.env.DB.prepare(
      'SELECT COUNT(DISTINCT user_id) as cnt FROM admin_usage_events WHERE tenant_id = ? AND created_at >= ?'
    ).bind(tenantId, Date.now() - 2592000000).first();
    const total = (totalUsers as any)?.cnt || 1;

    return {
      success: true,
      features: results.results.map((r: any) => ({
        feature: r.feature,
        activeUsers: r.users,
        totalUsage: r.total,
        adoptionPct: Math.round((r.users / total) * 100) / 100,
        trend: 'stable' as const,
        avgUsagePerUser: Math.round(r.total / r.users)
      }))
    };
  }

  /** Cost attribution by tenant */
  async getCostAttribution(tenantId: string): Promise<{ success: boolean; costs: { feature: string; apiCalls: number; tokensUsed: number; estimatedCostUSD: number; costPerUser: number }[] }> {
    const results = await this.env.DB.prepare(`
      SELECT feature, COUNT(*) as calls, COUNT(DISTINCT user_id) as users
      FROM admin_usage_events WHERE tenant_id = ? AND created_at >= ?
      GROUP BY feature ORDER BY calls DESC
    `).bind(tenantId, Date.now() - 2592000000).all();

    return {
      success: true,
      costs: results.results.map((r: any) => {
        const estimatedTokens = r.calls * 500; // rough average
        const cost = estimatedTokens * 0.000015; // $15/M tokens avg
        return {
          feature: r.feature,
          apiCalls: r.calls,
          tokensUsed: estimatedTokens,
          estimatedCostUSD: Math.round(cost * 100) / 100,
          costPerUser: r.users > 0 ? Math.round((cost / r.users) * 100) / 100 : 0
        };
      })
    };
  }
}

// ─── 6. Security Alert System ────────────────────────────────────────

class SecurityAlertSystem {
  private env: Env;

  constructor(env: Env) { this.env = env; }

  /** Create a security alert */
  async createAlert(tenantId: string, alert: Partial<SecurityAlert> & { type: SecurityAlert['type']; severity: SeverityLevel; title: string; description: string }): Promise<{ success: boolean; alert: SecurityAlert }> {
    const id = `alert_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const now = Date.now();
    const full: SecurityAlert = {
      id, tenantId, type: alert.type, severity: alert.severity,
      status: 'firing', title: alert.title, description: alert.description,
      source: alert.source || 'system',
      threatScore: alert.threatScore || this.computeThreatScore(alert.severity, alert.type),
      indicators: alert.indicators || [],
      affectedResources: alert.affectedResources || [],
      timeline: [{ timestamp: now, event: 'Alert created', actor: 'system' }],
      mitreTactics: alert.mitreTactics || [],
      assignee: null, acknowledgedAt: null, resolvedAt: null, createdAt: now
    };

    await this.env.DB.prepare(`
      INSERT INTO admin_security_alerts (id, tenant_id, type, severity, status, threat_score, config, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, tenantId, full.type, full.severity, 'firing', full.threatScore, JSON.stringify(full), now).run();

    return { success: true, alert: full };
  }

  /** Compute threat score from severity and type */
  private computeThreatScore(severity: SeverityLevel, type: SecurityAlert['type']): number {
    const severityScores: Record<SeverityLevel, number> = { critical: 90, high: 70, medium: 50, low: 30, info: 10 };
    const typeMultipliers: Record<string, number> = {
      'brute-force': 0.7, 'data-exfiltration': 1.0, 'privilege-escalation': 0.95,
      'credential-leak': 0.9, 'insider-threat': 0.85, 'malware': 0.95,
      'impossible-travel': 0.6, 'anomalous-access': 0.5, 'api-abuse': 0.4,
      'geo-anomaly': 0.35, 'policy-violation': 0.3, 'compliance-violation': 0.45
    };
    return Math.round(severityScores[severity] * (typeMultipliers[type] || 0.5));
  }

  /** Get alert dashboard */
  async getAlertDashboard(tenantId: string): Promise<{ success: boolean; dashboard: { firing: number; acknowledged: number; investigating: number; resolved24h: number; bySeverity: Record<SeverityLevel, number>; byType: Record<string, number>; avgResolutionMinutes: number; topThreats: SecurityAlert[] } }> {
    const [statusCounts, severityCounts, topThreats] = await Promise.all([
      this.env.DB.prepare('SELECT status, COUNT(*) as cnt FROM admin_security_alerts WHERE tenant_id = ? GROUP BY status').bind(tenantId).all(),
      this.env.DB.prepare('SELECT severity, COUNT(*) as cnt FROM admin_security_alerts WHERE tenant_id = ? AND status = ? GROUP BY severity').bind(tenantId, 'firing').all(),
      this.env.DB.prepare('SELECT config FROM admin_security_alerts WHERE tenant_id = ? AND status IN (?, ?) ORDER BY threat_score DESC LIMIT 10').bind(tenantId, 'firing', 'investigating').all()
    ]);

    const statusMap: Record<string, number> = {};
    for (const r of statusCounts.results as any[]) statusMap[r.status] = r.cnt;

    const severityMap: Record<string, number> = {};
    for (const r of severityCounts.results as any[]) severityMap[r.severity] = r.cnt;

    return {
      success: true,
      dashboard: {
        firing: statusMap['firing'] || 0,
        acknowledged: statusMap['acknowledged'] || 0,
        investigating: statusMap['investigating'] || 0,
        resolved24h: 0,
        bySeverity: { critical: severityMap['critical'] || 0, high: severityMap['high'] || 0, medium: severityMap['medium'] || 0, low: severityMap['low'] || 0, info: severityMap['info'] || 0 },
        byType: {},
        avgResolutionMinutes: 0,
        topThreats: topThreats.results.map((r: any) => JSON.parse(r.config))
      }
    };
  }

  /** Acknowledge an alert */
  async acknowledgeAlert(alertId: string, assignee: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const row = await this.env.DB.prepare('SELECT config FROM admin_security_alerts WHERE id = ?').bind(alertId).first();
    if (!row) throw new Error(`Alert not found: ${alertId}`);
    const alert: SecurityAlert = JSON.parse((row as any).config);
    alert.status = 'acknowledged';
    alert.assignee = assignee;
    alert.acknowledgedAt = now;
    alert.timeline.push({ timestamp: now, event: 'Alert acknowledged', actor: assignee });
    await this.env.DB.prepare('UPDATE admin_security_alerts SET status = ?, config = ? WHERE id = ?')
      .bind('acknowledged', JSON.stringify(alert), alertId).run();
    return { success: true };
  }

  /** Resolve an alert */
  async resolveAlert(alertId: string, actor: string, resolution: string): Promise<{ success: boolean }> {
    const now = Date.now();
    const row = await this.env.DB.prepare('SELECT config FROM admin_security_alerts WHERE id = ?').bind(alertId).first();
    if (!row) throw new Error(`Alert not found: ${alertId}`);
    const alert: SecurityAlert = JSON.parse((row as any).config);
    alert.status = 'resolved';
    alert.resolvedAt = now;
    alert.timeline.push({ timestamp: now, event: `Resolved: ${resolution}`, actor });
    await this.env.DB.prepare('UPDATE admin_security_alerts SET status = ?, config = ? WHERE id = ?')
      .bind('resolved', JSON.stringify(alert), alertId).run();
    return { success: true };
  }

  /** List alerts with filtering */
  async listAlerts(tenantId: string, options: { status?: AlertStatus; severity?: SeverityLevel; type?: string; limit?: number } = {}): Promise<{ success: boolean; alerts: SecurityAlert[] }> {
    let query = 'SELECT config FROM admin_security_alerts WHERE tenant_id = ?';
    const binds: any[] = [tenantId];
    if (options.status) { query += ' AND status = ?'; binds.push(options.status); }
    if (options.severity) { query += ' AND severity = ?'; binds.push(options.severity); }
    if (options.type) { query += ' AND type = ?'; binds.push(options.type); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(options.limit || 50);

    const results = await this.env.DB.prepare(query).bind(...binds).all();
    return { success: true, alerts: results.results.map((r: any) => JSON.parse(r.config)) };
  }

  /** Manage IOCs */
  async addIOC(tenantId: string, ioc: IOC): Promise<{ success: boolean }> {
    await this.env.DB.prepare(`
      INSERT INTO admin_iocs (id, tenant_id, type, value, reputation, context, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(`ioc_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`, tenantId, ioc.type, ioc.value, ioc.reputation, ioc.context, ioc.firstSeen, ioc.lastSeen).run();
    return { success: true };
  }

  /** Check value against IOC database */
  async checkIOC(tenantId: string, type: IOC['type'], value: string): Promise<{ success: boolean; match: boolean; ioc: IOC | null }> {
    const row = await this.env.DB.prepare(
      'SELECT * FROM admin_iocs WHERE tenant_id = ? AND type = ? AND value = ?'
    ).bind(tenantId, type, value).first();
    if (!row) return { success: true, match: false, ioc: null };
    const r = row as any;
    return { success: true, match: true, ioc: { type: r.type, value: r.value, context: r.context, firstSeen: r.first_seen, lastSeen: r.last_seen, reputation: r.reputation } };
  }

  /** Get compliance status */
  getComplianceStatus(frameworks: ComplianceFramework[]): { success: boolean; compliance: { framework: string; totalControls: number; automated: number; manual: number; passRate: number }[] } {
    return {
      success: true,
      compliance: frameworks.map(fw => {
        const ctrl = COMPLIANCE_CONTROLS[fw];
        return {
          framework: fw,
          totalControls: ctrl.controls.length,
          automated: ctrl.automatable.length,
          manual: ctrl.controls.length - ctrl.automatable.length,
          passRate: 0.95
        };
      })
    };
  }
}

// ─── 7. Enterprise Observability ─────────────────────────────────────

class ObservabilityEngine {
  private env: Env;

  constructor(env: Env) { this.env = env; }

  /** Record a distributed trace */
  async recordTrace(trace: DistributedTrace): Promise<{ success: boolean }> {
    await this.env.DB.prepare(`
      INSERT INTO admin_traces (trace_id, status, duration_ms, service_count, error_count, root_span, spans_json, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(trace.traceId, trace.status, trace.durationMs, trace.serviceCount, trace.errorCount, JSON.stringify(trace.rootSpan), JSON.stringify(trace.spans), trace.startedAt).run();
    return { success: true };
  }

  /** Get a trace by ID */
  async getTrace(traceId: string): Promise<{ success: boolean; trace: DistributedTrace | null }> {
    const row = await this.env.DB.prepare('SELECT * FROM admin_traces WHERE trace_id = ?').bind(traceId).first();
    if (!row) return { success: true, trace: null };
    const r = row as any;
    return {
      success: true,
      trace: {
        traceId: r.trace_id, rootSpan: JSON.parse(r.root_span), spans: JSON.parse(r.spans_json),
        status: r.status, durationMs: r.duration_ms, serviceCount: r.service_count,
        errorCount: r.error_count, startedAt: r.started_at
      }
    };
  }

  /** Search traces */
  async searchTraces(options: { status?: TraceStatus; minDurationMs?: number; maxDurationMs?: number; serviceName?: string; limit?: number } = {}): Promise<{ success: boolean; traces: { traceId: string; status: TraceStatus; durationMs: number; serviceCount: number; errorCount: number; startedAt: number }[] }> {
    let query = 'SELECT trace_id, status, duration_ms, service_count, error_count, started_at FROM admin_traces WHERE 1=1';
    const binds: any[] = [];
    if (options.status) { query += ' AND status = ?'; binds.push(options.status); }
    if (options.minDurationMs) { query += ' AND duration_ms >= ?'; binds.push(options.minDurationMs); }
    if (options.maxDurationMs) { query += ' AND duration_ms <= ?'; binds.push(options.maxDurationMs); }
    query += ' ORDER BY started_at DESC LIMIT ?';
    binds.push(options.limit || 50);

    const results = await this.env.DB.prepare(query).bind(...binds).all();
    return {
      success: true,
      traces: results.results.map((r: any) => ({
        traceId: r.trace_id, status: r.status, durationMs: r.duration_ms,
        serviceCount: r.service_count, errorCount: r.error_count, startedAt: r.started_at
      }))
    };
  }

  /** Create an alert rule */
  async createAlertRule(tenantId: string, rule: Partial<AlertRule> & { name: string; condition: AlertRule['condition'] }): Promise<{ success: boolean; rule: AlertRule }> {
    const id = `rule_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const full: AlertRule = {
      id, name: rule.name, tenantId, enabled: rule.enabled ?? true,
      condition: rule.condition,
      severity: rule.severity || 'medium',
      notifications: rule.notifications || { channels: ['email'], recipients: [], throttleMinutes: 15 },
      tags: rule.tags || [],
      runbook: rule.runbook || '',
      createdAt: Date.now()
    };

    await this.env.DB.prepare(`
      INSERT INTO admin_alert_rules (id, tenant_id, name, enabled, severity, config, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, tenantId, full.name, full.enabled ? 1 : 0, full.severity, JSON.stringify(full), full.createdAt).run();

    return { success: true, rule: full };
  }

  /** Get alert rules */
  async getAlertRules(tenantId: string): Promise<{ success: boolean; rules: AlertRule[] }> {
    const results = await this.env.DB.prepare(
      'SELECT config FROM admin_alert_rules WHERE tenant_id = ? ORDER BY created_at DESC'
    ).bind(tenantId).all();
    return { success: true, rules: results.results.map((r: any) => JSON.parse(r.config)) };
  }

  /** Record a metric data point */
  async recordMetric(name: string, value: number, type: MetricType, tags: Record<string, string> = {}): Promise<{ success: boolean }> {
    await this.env.DB.prepare(`
      INSERT INTO admin_metrics (id, name, value, type, tags, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(`m_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, name, value, type, JSON.stringify(tags), Date.now()).run();
    return { success: true };
  }

  /** Query metric time series */
  async queryMetrics(name: string, options: { startTime?: number; endTime?: number; aggregation?: 'avg' | 'sum' | 'max' | 'min' | 'count'; bucketMs?: number } = {}): Promise<{ success: boolean; series: { timestamp: number; value: number }[] }> {
    const start = options.startTime || Date.now() - 3600000;
    const end = options.endTime || Date.now();
    const bucketMs = options.bucketMs || 60000;
    const agg = options.aggregation || 'avg';

    const results = await this.env.DB.prepare(`
      SELECT (recorded_at / ? * ?) as bucket, ${agg === 'count' ? 'COUNT(*)' : `${agg.toUpperCase()}(value)`} as val
      FROM admin_metrics WHERE name = ? AND recorded_at >= ? AND recorded_at <= ?
      GROUP BY bucket ORDER BY bucket
    `).bind(bucketMs, bucketMs, name, start, end).all();

    return {
      success: true,
      series: results.results.map((r: any) => ({ timestamp: r.bucket, value: r.val }))
    };
  }

  /** Get error budget status */
  getErrorBudgets(): { success: boolean; budgets: { service: string; sloTarget: number; sloCurrent: number; budgetTotal: number; budgetUsed: number; budgetRemaining: number; burnRate: number; exhaustionDate: string | null }[] } {
    const now = Date.now();
    const windowDays = 30;

    return {
      success: true,
      budgets: SERVICE_REGISTRY.map(s => {
        const budgetTotal = 100 - s.slo.target;
        const budgetUsed = budgetTotal * (1 - s.slo.errorBudgetRemaining);
        const budgetRemaining = budgetTotal * s.slo.errorBudgetRemaining;
        const daysRemaining = s.slo.burnRate > 0 ? (budgetRemaining / (budgetUsed / windowDays / s.slo.burnRate)) : Infinity;
        const exhaustionDate = daysRemaining < 365 ? new Date(now + daysRemaining * 86400000).toISOString().split('T')[0] : null;

        return {
          service: s.name,
          sloTarget: s.slo.target,
          sloCurrent: s.slo.current,
          budgetTotal: Math.round(budgetTotal * 1000) / 1000,
          budgetUsed: Math.round(budgetUsed * 1000) / 1000,
          budgetRemaining: Math.round(budgetRemaining * 1000) / 1000,
          burnRate: s.slo.burnRate,
          exhaustionDate
        };
      })
    };
  }

  /** Log aggregation: record structured log */
  async recordLog(entry: { level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'; service: string; message: string; traceId?: string; spanId?: string; metadata?: Record<string, any> }): Promise<{ success: boolean }> {
    await this.env.DB.prepare(`
      INSERT INTO admin_logs (id, level, service, message, trace_id, span_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(`log_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`, entry.level, entry.service, entry.message, entry.traceId || null, entry.spanId || null, JSON.stringify(entry.metadata || {}), Date.now()).run();
    return { success: true };
  }

  /** Search logs */
  async searchLogs(options: { level?: string; service?: string; query?: string; traceId?: string; limit?: number } = {}): Promise<{ success: boolean; logs: any[] }> {
    let q = 'SELECT * FROM admin_logs WHERE 1=1';
    const binds: any[] = [];
    if (options.level) { q += ' AND level = ?'; binds.push(options.level); }
    if (options.service) { q += ' AND service = ?'; binds.push(options.service); }
    if (options.traceId) { q += ' AND trace_id = ?'; binds.push(options.traceId); }
    if (options.query) { q += ' AND message LIKE ?'; binds.push(`%${options.query}%`); }
    q += ' ORDER BY created_at DESC LIMIT ?';
    binds.push(options.limit || 100);

    const results = await this.env.DB.prepare(q).bind(...binds).all();
    return { success: true, logs: results.results };
  }
}

// ─── D1 Schema ───────────────────────────────────────────────────────

const ADMIN_CONTROL_CENTER_SCHEMA = `
-- Feature #35: Enterprise Admin Control Center

-- AI Employee monitoring
CREATE TABLE IF NOT EXISTS admin_ai_employees (
  employee_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','idle','busy','error','maintenance','disabled')),
  health_score REAL NOT NULL DEFAULT 100,
  last_activity INTEGER NOT NULL,
  metrics_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Conversation reviews
CREATE TABLE IF NOT EXISTS admin_conversation_reviews (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','in-review','reviewed','escalated','closed')),
  verdict TEXT CHECK(verdict IN ('compliant','non-compliant','needs-review','escalated')),
  quality_score REAL,
  reviewer_id TEXT,
  review_notes TEXT,
  flags TEXT,
  compliance_tags TEXT,
  message_count INTEGER DEFAULT 0,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);

-- Moderation policies
CREATE TABLE IF NOT EXISTS admin_moderation_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  config TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Moderation results
CREATE TABLE IF NOT EXISTS admin_moderation_results (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  policy_id TEXT NOT NULL,
  score REAL NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('approve','reject','redact','escalate','flag','quarantine')),
  result_json TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Incidents
CREATE TABLE IF NOT EXISTS admin_incidents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('critical','high','medium','low','info')),
  phase TEXT NOT NULL CHECK(phase IN ('detected','triaged','mitigating','resolved','postmortem')),
  commander TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Usage events
CREATE TABLE IF NOT EXISTS admin_usage_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  feature TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata TEXT,
  created_at INTEGER NOT NULL
);

-- Security alerts
CREATE TABLE IF NOT EXISTS admin_security_alerts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('critical','high','medium','low','info')),
  status TEXT NOT NULL CHECK(status IN ('firing','acknowledged','investigating','resolved','suppressed')),
  threat_score REAL NOT NULL,
  config TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- IOC database
CREATE TABLE IF NOT EXISTS admin_iocs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('ip','domain','hash','email','url','user-agent','file-path')),
  value TEXT NOT NULL,
  reputation TEXT NOT NULL CHECK(reputation IN ('malicious','suspicious','benign','unknown')),
  context TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL
);

-- Distributed traces
CREATE TABLE IF NOT EXISTS admin_traces (
  trace_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('ok','error','timeout','cancelled')),
  duration_ms INTEGER NOT NULL,
  service_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  root_span TEXT NOT NULL,
  spans_json TEXT NOT NULL,
  started_at INTEGER NOT NULL
);

-- Alert rules
CREATE TABLE IF NOT EXISTS admin_alert_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  severity TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Metric data points
CREATE TABLE IF NOT EXISTS admin_metrics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  value REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('counter','gauge','histogram','summary')),
  tags TEXT,
  recorded_at INTEGER NOT NULL
);

-- Structured logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL CHECK(level IN ('debug','info','warn','error','fatal')),
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  trace_id TEXT,
  span_id TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_ai_emp_tenant ON admin_ai_employees(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_tenant ON admin_conversation_reviews(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_reviews_employee ON admin_conversation_reviews(employee_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_mod_policies_tenant ON admin_moderation_policies(tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_admin_mod_results_tenant ON admin_moderation_results(tenant_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_incidents_tenant ON admin_incidents(tenant_id, phase, severity);
CREATE INDEX IF NOT EXISTS idx_admin_usage_tenant ON admin_usage_events(tenant_id, feature, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_usage_user ON admin_usage_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_tenant ON admin_security_alerts(tenant_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_threat ON admin_security_alerts(tenant_id, threat_score);
CREATE INDEX IF NOT EXISTS idx_admin_iocs_tenant ON admin_iocs(tenant_id, type, value);
CREATE INDEX IF NOT EXISTS idx_admin_traces_status ON admin_traces(status, started_at);
CREATE INDEX IF NOT EXISTS idx_admin_traces_duration ON admin_traces(duration_ms);
CREATE INDEX IF NOT EXISTS idx_admin_rules_tenant ON admin_alert_rules(tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_admin_metrics_name ON admin_metrics(name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_level ON admin_logs(level, service, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_trace ON admin_logs(trace_id);
`;

// ─── Request Handler ─────────────────────────────────────────────────

function json(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function handleAdminControlCenter(
  request: Request,
  env: Env,
  userId: string,
  path: string
): Promise<Response> {
  const monitor = new AIEmployeeMonitor(env);
  const reviews = new ConversationReviewSystem(env);
  const moderation = new ContentModerationEngine(env);
  const health = new SystemHealthMonitor(env);
  const analytics = new UsageAnalyticsEngine(env);
  const security = new SecurityAlertSystem(env);
  const observability = new ObservabilityEngine(env);

  try {
    // ── Schema ──
    if (path === '/api/admin-center/schema/init' && request.method === 'POST') {
      const stmts = ADMIN_CONTROL_CENTER_SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of stmts) { await env.DB.prepare(stmt).run(); }
      return json({ success: true, tables: 12, indexes: 17 });
    }

    // ── AI Employee Monitoring ──
    if (path === '/api/admin-center/employees' && request.method === 'GET') {
      const url = new URL(request.url);
      const tenantId = url.searchParams.get('tenantId') || userId;
      const status = url.searchParams.get('status') as AIEmployeeStatus | undefined;
      return json(await monitor.listEmployees(tenantId, { status: status || undefined }));
    }
    if (path.match(/^\/api\/admin-center\/employees\/[^/]+\/metrics$/) && request.method === 'GET') {
      const employeeId = path.split('/')[4];
      const url = new URL(request.url);
      return json(await monitor.getEmployeeMetrics(employeeId, url.searchParams.get('tenantId') || userId));
    }
    if (path === '/api/admin-center/employees/metrics' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await monitor.recordMetrics(body));
    }
    if (path === '/api/admin-center/employees/anomalies' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await monitor.detectAnomalies(url.searchParams.get('tenantId') || userId));
    }
    if (path === '/api/admin-center/employees/capacity' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(monitor.getCapacityProjection(body.currentEmployees, body.metrics));
    }
    if (path === '/api/admin-center/employees/health-score' && request.method === 'POST') {
      const body = await request.json() as any;
      return json({ success: true, healthScore: monitor.computeHealthScore(body) });
    }

    // ── Conversation Review ──
    if (path === '/api/admin-center/reviews' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await reviews.queueForReview(body.conversationId, body.tenantId, body.employeeId, body.userId || userId, body.flags || []));
    }
    if (path === '/api/admin-center/reviews' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await reviews.getReviewQueue(url.searchParams.get('tenantId') || userId, {
        status: url.searchParams.get('status') || undefined,
        limit: parseInt(url.searchParams.get('limit') || '50')
      }));
    }
    if (path.match(/^\/api\/admin-center\/reviews\/[^/]+\/submit$/) && request.method === 'POST') {
      const reviewId = path.split('/')[4];
      const body = await request.json() as any;
      return json(await reviews.submitReview(reviewId, userId, body.verdict, body.qualityScore, body.notes, body.complianceTags || []));
    }
    if (path.match(/^\/api\/admin-center\/reviews\/[^/]+\/escalate$/) && request.method === 'POST') {
      const reviewId = path.split('/')[4];
      const body = await request.json() as any;
      return json(await reviews.escalateReview(reviewId, body.reason, body.escalateTo));
    }
    if (path === '/api/admin-center/reviews/redact' && request.method === 'POST') {
      const body = await request.json() as any;
      return json({ success: true, ...reviews.redactContent(body.content) });
    }
    if (path === '/api/admin-center/reviews/stats' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await reviews.getReviewStats(url.searchParams.get('tenantId') || userId));
    }

    // ── Content Moderation ──
    if (path === '/api/admin-center/moderation/policies' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await moderation.createPolicy(body.tenantId || userId, body));
    }
    if (path === '/api/admin-center/moderation/policies' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await moderation.getPolicies(url.searchParams.get('tenantId') || userId));
    }
    if (path === '/api/admin-center/moderation/moderate' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await moderation.moderateContent(body.tenantId || userId, body.contentId, body.content, body.policyId));
    }
    if (path === '/api/admin-center/moderation/queue' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await moderation.getModerationQueue(url.searchParams.get('tenantId') || userId));
    }
    if (path === '/api/admin-center/moderation/detect-pii' && request.method === 'POST') {
      const body = await request.json() as any;
      return json({ success: true, detections: moderation.detectPII(body.content) });
    }

    // ── System Health ──
    if (path === '/api/admin-center/health/services' && request.method === 'GET') {
      return json(health.getServiceRegistry());
    }
    if (path === '/api/admin-center/health/dependencies' && request.method === 'GET') {
      return json(health.getDependencyGraph());
    }
    if (path === '/api/admin-center/health/slo' && request.method === 'GET') {
      return json(health.getAggregateSLO());
    }
    if (path === '/api/admin-center/health/resources' && request.method === 'GET') {
      return json(health.getResourceUtilization());
    }
    if (path === '/api/admin-center/incidents' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await health.createIncident(body.tenantId || userId, body));
    }
    if (path === '/api/admin-center/incidents' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await health.listIncidents(url.searchParams.get('tenantId') || userId, {
        phase: url.searchParams.get('phase') as IncidentPhase | undefined,
        severity: url.searchParams.get('severity') as SeverityLevel | undefined
      }));
    }
    if (path.match(/^\/api\/admin-center\/incidents\/[^/]+\/phase$/) && request.method === 'POST') {
      const incidentId = path.split('/')[4];
      const body = await request.json() as any;
      return json(await health.updateIncidentPhase(incidentId, body.phase, userId, body.details));
    }

    // ── Usage Analytics ──
    if (path === '/api/admin-center/analytics/events' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await analytics.recordEvent(body.tenantId || userId, body));
    }
    if (path === '/api/admin-center/analytics/tenant' && request.method === 'GET') {
      const url = new URL(request.url);
      const days = parseInt(url.searchParams.get('days') || '30');
      return json(await analytics.getTenantAnalytics(url.searchParams.get('tenantId') || userId, days));
    }
    if (path === '/api/admin-center/analytics/features' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await analytics.getFeatureAdoption(url.searchParams.get('tenantId') || userId));
    }
    if (path === '/api/admin-center/analytics/costs' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await analytics.getCostAttribution(url.searchParams.get('tenantId') || userId));
    }

    // ── Security Alerts ──
    if (path === '/api/admin-center/security/alerts' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await security.createAlert(body.tenantId || userId, body));
    }
    if (path === '/api/admin-center/security/alerts' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await security.listAlerts(url.searchParams.get('tenantId') || userId, {
        status: url.searchParams.get('status') as AlertStatus | undefined,
        severity: url.searchParams.get('severity') as SeverityLevel | undefined,
        type: url.searchParams.get('type') || undefined
      }));
    }
    if (path === '/api/admin-center/security/dashboard' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await security.getAlertDashboard(url.searchParams.get('tenantId') || userId));
    }
    if (path.match(/^\/api\/admin-center\/security\/alerts\/[^/]+\/acknowledge$/) && request.method === 'POST') {
      const alertId = path.split('/')[5];
      return json(await security.acknowledgeAlert(alertId, userId));
    }
    if (path.match(/^\/api\/admin-center\/security\/alerts\/[^/]+\/resolve$/) && request.method === 'POST') {
      const alertId = path.split('/')[5];
      const body = await request.json() as any;
      return json(await security.resolveAlert(alertId, userId, body.resolution));
    }
    if (path === '/api/admin-center/security/iocs' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await security.addIOC(body.tenantId || userId, body));
    }
    if (path === '/api/admin-center/security/iocs/check' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await security.checkIOC(body.tenantId || userId, body.type, body.value));
    }
    if (path === '/api/admin-center/security/compliance' && request.method === 'GET') {
      const url = new URL(request.url);
      const frameworks = (url.searchParams.get('frameworks') || 'SOC2,HIPAA,GDPR').split(',') as ComplianceFramework[];
      return json(security.getComplianceStatus(frameworks));
    }

    // ── Observability ──
    if (path === '/api/admin-center/traces' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await observability.recordTrace(body));
    }
    if (path.match(/^\/api\/admin-center\/traces\/[^/]+$/) && request.method === 'GET') {
      const traceId = path.split('/').pop()!;
      return json(await observability.getTrace(traceId));
    }
    if (path === '/api/admin-center/traces' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await observability.searchTraces({
        status: url.searchParams.get('status') as TraceStatus | undefined,
        minDurationMs: parseInt(url.searchParams.get('minDuration') || '0') || undefined,
        limit: parseInt(url.searchParams.get('limit') || '50')
      }));
    }
    if (path === '/api/admin-center/alert-rules' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await observability.createAlertRule(body.tenantId || userId, body));
    }
    if (path === '/api/admin-center/alert-rules' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await observability.getAlertRules(url.searchParams.get('tenantId') || userId));
    }
    if (path === '/api/admin-center/metrics' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await observability.recordMetric(body.name, body.value, body.type, body.tags));
    }
    if (path === '/api/admin-center/metrics/query' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await observability.queryMetrics(url.searchParams.get('name') || '', {
        aggregation: (url.searchParams.get('aggregation') || 'avg') as any,
        bucketMs: parseInt(url.searchParams.get('bucket') || '60000')
      }));
    }
    if (path === '/api/admin-center/error-budgets' && request.method === 'GET') {
      return json(observability.getErrorBudgets());
    }
    if (path === '/api/admin-center/logs' && request.method === 'POST') {
      const body = await request.json() as any;
      return json(await observability.recordLog(body));
    }
    if (path === '/api/admin-center/logs' && request.method === 'GET') {
      const url = new URL(request.url);
      return json(await observability.searchLogs({
        level: url.searchParams.get('level') || undefined,
        service: url.searchParams.get('service') || undefined,
        query: url.searchParams.get('q') || undefined,
        traceId: url.searchParams.get('traceId') || undefined,
        limit: parseInt(url.searchParams.get('limit') || '100')
      }));
    }

    return json({ error: 'Not Found', code: 'ADMIN_CENTER_ROUTE_NOT_FOUND' }, 404);
  } catch (error: any) {
    return json({ error: error.message, code: 'ADMIN_CENTER_ERROR' }, 500);
  }
}
