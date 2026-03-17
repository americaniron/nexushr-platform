/**
 * NexusHR Enterprise Security Client
 *
 * Dual-mode: Worker API when online, localStorage fallback offline.
 *
 * Covers: threat detection, audit trail, DLP, rate limiting,
 * IP intelligence, session security, secrets, incidents,
 * compliance, security scoring.
 */

import { useState, useEffect, useCallback } from 'react';

const API = '/api/security';

// ══════════════════════════════════════════════════════
// TYPES (mirrors server)
// ══════════════════════════════════════════════════════

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type ThreatCategory = 'brute_force' | 'credential_stuffing' | 'api_abuse' | 'data_exfiltration'
  | 'privilege_escalation' | 'injection' | 'xss' | 'csrf' | 'session_hijack' | 'insider_threat'
  | 'geo_anomaly' | 'rate_limit' | 'bot_detection' | 'unknown';
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export'
  | 'import' | 'grant_access' | 'revoke_access' | 'config_change' | 'api_call' | 'data_access'
  | 'escalation' | 'mfa_verify' | 'password_change' | 'key_rotate';
export type ComplianceFramework = 'soc2' | 'gdpr' | 'hipaa' | 'ccpa' | 'iso27001' | 'pci_dss';
export type DLPAction = 'block' | 'mask' | 'warn' | 'log' | 'encrypt' | 'quarantine';
export type IncidentStatus = 'detected' | 'investigating' | 'contained' | 'eradicated' | 'recovered' | 'closed';

export interface SecurityEvent {
  id: string; org_id: string; timestamp: string;
  category: ThreatCategory; severity: ThreatSeverity;
  source_ip: string; user_id: string | null;
  endpoint: string; method: string; user_agent: string;
  description: string; indicators: Record<string, any>;
  action_taken: string; blocked: boolean;
  false_positive: boolean; related_events: string[];
}

export interface AuditEntry {
  id: string; org_id: string; timestamp: string;
  actor_id: string; actor_type: string;
  action: AuditAction; resource_type: string; resource_id: string;
  changes: { field: string; old_value: any; new_value: any }[];
  metadata: Record<string, any>; source_ip: string;
  user_agent: string; session_id: string;
  result: string; risk_score: number;
  compliance_tags: ComplianceFramework[];
}

export interface DLPPolicy {
  id: string; org_id: string; name: string; description: string;
  enabled: boolean; patterns: any[]; action: DLPAction;
  severity: ThreatSeverity; applies_to: string[];
  exceptions: string[]; notification_channels: string[];
  created_at: string;
}

export interface DLPScanResult {
  scanned: boolean; violations: DLPViolation[];
  risk_level: ThreatSeverity; action_taken: DLPAction;
  scan_time_ms: number;
}

export interface DLPViolation {
  policy_id: string; policy_name: string; pattern_label: string;
  matched_text: string; masked_text: string;
  location: { field: string; start: number; end: number };
  confidence: number;
}

export interface RateLimitResult {
  allowed: boolean; remaining: number; reset_at: string;
  retry_after_ms: number; current_rate: number; limit: number;
}

export interface IPIntelligence {
  ip: string; status: string; country: string; region: string; city: string;
  is_vpn: boolean; is_proxy: boolean; is_tor: boolean; is_datacenter: boolean;
  threat_score: number; organization: string;
  last_seen: string; total_requests: number; block_reason: string | null;
}

export interface SecurityIncident {
  id: string; org_id: string; title: string; description: string;
  severity: ThreatSeverity; status: IncidentStatus;
  category: ThreatCategory; affected_users: string[];
  affected_resources: string[]; timeline: { timestamp: string; action: string; actor: string; details: string }[];
  playbook_id: string | null; assigned_to: string;
  evidence: Record<string, any>[]; root_cause: string | null;
  remediation_steps: string[]; created_at: string;
  resolved_at: string | null; post_mortem: string | null;
}

export interface ComplianceCheck {
  framework: ComplianceFramework; control_id: string; control_name: string;
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  evidence: string[]; last_assessed: string; next_review: string;
  risk_level: ThreatSeverity; remediation: string | null;
}

export interface SecurityScore {
  overall: number;
  categories: {
    authentication: number; authorization: number; data_protection: number;
    network_security: number; incident_response: number; compliance: number;
    monitoring: number; vulnerability_mgmt: number;
  };
  findings: { id: string; category: string; severity: ThreatSeverity; title: string;
    description: string; recommendation: string; affected_component: string;
    status: string }[];
  last_assessed: string;
}

export interface ThreatSummary {
  total_events_24h: number; critical_count: number; high_count: number;
  top_categories: { category: string; count: number }[];
  top_ips: { ip: string; count: number }[];
  blocked_count: number;
}

// ══════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════

async function api<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

export const securityClient = {
  // Threat Detection
  async analyzeRequest(orgId: string, userId?: string) {
    return api<{ threat: SecurityEvent | null }>('/threats/analyze', { method: 'POST', body: JSON.stringify({ org_id: orgId, user_id: userId }) });
  },
  async getThreatEvents(orgId: string, filters?: { severity?: string; category?: string; from?: string; to?: string; limit?: number }) {
    const params = new URLSearchParams({ org_id: orgId });
    if (filters?.severity) params.set('severity', filters.severity);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    if (filters?.limit) params.set('limit', String(filters.limit));
    return api<{ events: SecurityEvent[] }>(`/threats/events?${params}`);
  },
  async getThreatSummary(orgId: string) {
    return api<ThreatSummary>(`/threats/summary?org_id=${orgId}`);
  },
  async recordFailedLogin(ip: string, userId: string, orgId: string) {
    return api('/threats/failed-login', { method: 'POST', body: JSON.stringify({ ip, user_id: userId, org_id: orgId }) });
  },

  // Audit Trail
  async logAudit(entry: any) {
    return api<{ entry: AuditEntry }>('/audit/log', { method: 'POST', body: JSON.stringify(entry) });
  },
  async queryAudit(orgId: string, filters: any) {
    return api<{ entries: AuditEntry[]; total: number }>('/audit/query', { method: 'POST', body: JSON.stringify({ org_id: orgId, ...filters }) });
  },
  async getComplianceAuditReport(orgId: string, framework: ComplianceFramework, from: string, to: string) {
    return api('/audit/compliance-report', { method: 'POST', body: JSON.stringify({ org_id: orgId, framework, from, to }) });
  },

  // DLP
  async scanContent(content: string, orgId: string, context?: any) {
    return api<DLPScanResult>('/dlp/scan', { method: 'POST', body: JSON.stringify({ content, org_id: orgId, context }) });
  },
  async maskContent(content: string, orgId: string) {
    return api<{ masked: string }>('/dlp/mask', { method: 'POST', body: JSON.stringify({ content, org_id: orgId }) });
  },
  async getDLPPolicies(orgId: string) {
    return api<{ policies: DLPPolicy[] }>(`/dlp/policies?org_id=${orgId}`);
  },
  async createDLPPolicy(policy: any) {
    return api<{ policy: DLPPolicy }>('/dlp/policies', { method: 'POST', body: JSON.stringify(policy) });
  },
  async updateDLPPolicy(policyId: string, updates: any) {
    return api(`/dlp/policies/${policyId}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },
  async deleteDLPPolicy(policyId: string) {
    return api(`/dlp/policies/${policyId}`, { method: 'DELETE' });
  },

  // Rate Limiting
  async checkRateLimit(key: string, config: any) {
    return api<RateLimitResult>('/ratelimit/check', { method: 'POST', body: JSON.stringify({ key, config }) });
  },

  // IP Intelligence
  async checkIP(ip: string, orgId: string) {
    return api<IPIntelligence>(`/ip/check?ip=${ip}&org_id=${orgId}`);
  },
  async blockIP(ip: string, orgId: string, reason: string, durationMs?: number) {
    return api('/ip/block', { method: 'POST', body: JSON.stringify({ ip, org_id: orgId, reason, duration_ms: durationMs }) });
  },
  async allowIP(ip: string, orgId: string, note?: string) {
    return api('/ip/allow', { method: 'POST', body: JSON.stringify({ ip, org_id: orgId, note }) });
  },
  async unblockIP(ip: string, orgId: string) {
    return api('/ip/unblock', { method: 'POST', body: JSON.stringify({ ip, org_id: orgId }) });
  },
  async getIPRules(orgId: string) {
    return api<{ rules: any[] }>(`/ip/rules?org_id=${orgId}`);
  },

  // Sessions
  async createSession(orgId: string, userId?: string) {
    return api('/sessions/create', { method: 'POST', body: JSON.stringify({ org_id: orgId, user_id: userId }) });
  },
  async validateSession(sessionId: string) {
    return api<{ valid: boolean; session?: any }>('/sessions/validate', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) });
  },
  async getActiveSessions(userId: string) {
    return api<{ sessions: any[] }>(`/sessions/active?user_id=${userId}`);
  },
  async revokeSession(sessionId: string) {
    return api('/sessions/revoke', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) });
  },
  async revokeAllSessions(userId: string, exceptSessionId?: string) {
    return api<{ revoked_count: number }>('/sessions/revoke-all', { method: 'POST', body: JSON.stringify({ user_id: userId, except_session_id: exceptSessionId }) });
  },

  // Secrets
  async storeSecret(orgId: string, name: string, value: string, metadata?: any) {
    return api('/secrets', { method: 'POST', body: JSON.stringify({ org_id: orgId, name, value, metadata }) });
  },
  async getSecret(orgId: string, name: string, version?: number) {
    return api<{ value: string | null }>('/secrets/get', { method: 'POST', body: JSON.stringify({ org_id: orgId, name, version }) });
  },
  async rotateSecret(orgId: string, name: string, newValue: string) {
    return api('/secrets/rotate', { method: 'POST', body: JSON.stringify({ org_id: orgId, name, new_value: newValue }) });
  },
  async listSecrets(orgId: string) {
    return api<{ secrets: any[] }>(`/secrets/list?org_id=${orgId}`);
  },
  async getRotationStatus(orgId: string) {
    return api(`/secrets/rotation-status?org_id=${orgId}`);
  },

  // Incidents
  async createIncident(orgId: string, params: any) {
    return api<{ incident: SecurityIncident }>('/incidents', { method: 'POST', body: JSON.stringify({ org_id: orgId, ...params }) });
  },
  async listIncidents(orgId: string, status?: string) {
    const params = new URLSearchParams({ org_id: orgId });
    if (status) params.set('status', status);
    return api<{ incidents: SecurityIncident[] }>(`/incidents?${params}`);
  },
  async getIncident(incidentId: string) {
    return api<{ incident: SecurityIncident }>(`/incidents/${incidentId}`);
  },
  async updateIncident(incidentId: string, updates: any) {
    return api(`/incidents/${incidentId}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },
  async addTimelineEntry(incidentId: string, action: string, actor: string, details: string) {
    return api(`/incidents/${incidentId}/timeline`, { method: 'POST', body: JSON.stringify({ action, actor, details }) });
  },
  async resolveIncident(incidentId: string, rootCause: string, postMortem?: string) {
    return api(`/incidents/${incidentId}/resolve`, { method: 'POST', body: JSON.stringify({ root_cause: rootCause, post_mortem: postMortem }) });
  },
  async getPlaybooks() {
    return api<{ playbooks: any }>('/incidents/playbooks');
  },

  // Compliance
  async assessCompliance(orgId: string, framework: ComplianceFramework) {
    return api('/compliance/assess', { method: 'POST', body: JSON.stringify({ org_id: orgId, framework }) });
  },
  async updateControlStatus(orgId: string, framework: ComplianceFramework, controlId: string, update: any) {
    return api('/compliance/update-control', { method: 'POST', body: JSON.stringify({ org_id: orgId, framework, control_id: controlId, ...update }) });
  },
  async getComplianceFrameworks() {
    return api<{ frameworks: any[] }>('/compliance/frameworks');
  },
  async generateComplianceReport(orgId: string, framework: ComplianceFramework, from: string, to: string) {
    return api('/compliance/report', { method: 'POST', body: JSON.stringify({ org_id: orgId, framework, from, to }) });
  },

  // Security Score
  async getSecurityScore(orgId: string) {
    return api<SecurityScore>(`/score?org_id=${orgId}`);
  },

  // Architecture
  async getArchitecture() {
    return api<any>('/architecture');
  },
};

// ══════════════════════════════════════════════════════
// REACT HOOKS
// ══════════════════════════════════════════════════════

/** Hook: threat detection dashboard */
export function useThreatDetection(orgId: string) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [summary, setSummary] = useState<ThreatSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (filters?: { severity?: string; category?: string; from?: string; to?: string }) => {
    setLoading(true);
    const [eventsResult, summaryResult] = await Promise.all([
      securityClient.getThreatEvents(orgId, filters),
      securityClient.getThreatSummary(orgId),
    ]);
    if (eventsResult) setEvents(eventsResult.events);
    if (summaryResult) setSummary(summaryResult);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { events, summary, loading, refresh };
}

/** Hook: audit trail viewer */
export function useAuditTrail(orgId: string) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const query = useCallback(async (filters?: {
    actor_id?: string; action?: string; resource_type?: string;
    from?: string; to?: string; min_risk?: number; limit?: number; offset?: number;
  }) => {
    setLoading(true);
    const result = await securityClient.queryAudit(orgId, filters || {});
    if (result) {
      setEntries(result.entries);
      setTotal(result.total);
    }
    setLoading(false);
  }, [orgId]);

  const logAction = useCallback(async (action: AuditAction, resourceType: string, resourceId: string,
    changes?: any[], metadata?: any) => {
    return securityClient.logAudit({
      org_id: orgId, actor_id: 'current_user', actor_type: 'user',
      action, resource_type: resourceType, resource_id: resourceId,
      changes: changes || [], metadata: metadata || {},
      source_ip: 'client', user_agent: navigator.userAgent,
      session_id: '', result: 'success', compliance_tags: [],
    });
  }, [orgId]);

  useEffect(() => { query(); }, [query]);
  return { entries, total, loading, query, logAction };
}

/** Hook: DLP management */
export function useDLP(orgId: string) {
  const [policies, setPolicies] = useState<DLPPolicy[]>([]);
  const [scanResult, setScanResult] = useState<DLPScanResult | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPolicies = useCallback(async () => {
    setLoading(true);
    const result = await securityClient.getDLPPolicies(orgId);
    if (result) setPolicies(result.policies);
    setLoading(false);
  }, [orgId]);

  const scan = useCallback(async (content: string, context?: any) => {
    const result = await securityClient.scanContent(content, orgId, context);
    if (result) setScanResult(result);
    return result;
  }, [orgId]);

  const mask = useCallback(async (content: string) => {
    const result = await securityClient.maskContent(content, orgId);
    return result?.masked || content;
  }, [orgId]);

  const createPolicy = useCallback(async (policy: any) => {
    const result = await securityClient.createDLPPolicy({ ...policy, org_id: orgId });
    await loadPolicies();
    return result;
  }, [orgId, loadPolicies]);

  useEffect(() => { loadPolicies(); }, [loadPolicies]);
  return { policies, scanResult, loading, scan, mask, createPolicy, refresh: loadPolicies };
}

/** Hook: IP intelligence */
export function useIPIntelligence(orgId: string) {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRules = useCallback(async () => {
    setLoading(true);
    const result = await securityClient.getIPRules(orgId);
    if (result) setRules(result.rules);
    setLoading(false);
  }, [orgId]);

  const checkIP = useCallback(async (ip: string) => {
    return securityClient.checkIP(ip, orgId);
  }, [orgId]);

  const blockIP = useCallback(async (ip: string, reason: string, durationMs?: number) => {
    await securityClient.blockIP(ip, orgId, reason, durationMs);
    await loadRules();
  }, [orgId, loadRules]);

  const allowIP = useCallback(async (ip: string, note?: string) => {
    await securityClient.allowIP(ip, orgId, note);
    await loadRules();
  }, [orgId, loadRules]);

  const unblockIP = useCallback(async (ip: string) => {
    await securityClient.unblockIP(ip, orgId);
    await loadRules();
  }, [orgId, loadRules]);

  useEffect(() => { loadRules(); }, [loadRules]);
  return { rules, loading, checkIP, blockIP, allowIP, unblockIP, refresh: loadRules };
}

/** Hook: security incidents */
export function useSecurityIncidents(orgId: string) {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (status?: string) => {
    setLoading(true);
    const result = await securityClient.listIncidents(orgId, status);
    if (result) setIncidents(result.incidents);
    setLoading(false);
  }, [orgId]);

  const create = useCallback(async (params: {
    title: string; description: string; severity: ThreatSeverity;
    category: ThreatCategory; affected_users?: string[];
  }) => {
    const result = await securityClient.createIncident(orgId, params);
    await refresh();
    return result?.incident;
  }, [orgId, refresh]);

  const resolve = useCallback(async (incidentId: string, rootCause: string, postMortem?: string) => {
    await securityClient.resolveIncident(incidentId, rootCause, postMortem);
    await refresh();
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);
  return { incidents, loading, create, resolve, refresh };
}

/** Hook: compliance management */
export function useCompliance(orgId: string) {
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadFrameworks = useCallback(async () => {
    setLoading(true);
    const result = await securityClient.getComplianceFrameworks();
    if (result) setFrameworks(result.frameworks);
    setLoading(false);
  }, []);

  const assess = useCallback(async (framework: ComplianceFramework) => {
    setLoading(true);
    const result = await securityClient.assessCompliance(orgId, framework);
    if (result) setAssessment(result);
    setLoading(false);
    return result;
  }, [orgId]);

  const updateControl = useCallback(async (framework: ComplianceFramework, controlId: string, update: any) => {
    await securityClient.updateControlStatus(orgId, framework, controlId, update);
  }, [orgId]);

  const generateReport = useCallback(async (framework: ComplianceFramework, from: string, to: string) => {
    return securityClient.generateComplianceReport(orgId, framework, from, to);
  }, [orgId]);

  useEffect(() => { loadFrameworks(); }, [loadFrameworks]);
  return { frameworks, assessment, loading, assess, updateControl, generateReport };
}

/** Hook: overall security score */
export function useSecurityScore(orgId: string) {
  const [score, setScore] = useState<SecurityScore | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await securityClient.getSecurityScore(orgId);
    if (result) setScore(result);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { score, loading, refresh };
}

/** Hook: session management */
export function useSessionSecurity(userId: string) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const result = await securityClient.getActiveSessions(userId);
    if (result) setSessions(result.sessions);
    setLoading(false);
  }, [userId]);

  const revokeSession = useCallback(async (sessionId: string) => {
    await securityClient.revokeSession(sessionId);
    await loadSessions();
  }, [loadSessions]);

  const revokeAll = useCallback(async (exceptSessionId?: string) => {
    const result = await securityClient.revokeAllSessions(userId, exceptSessionId);
    await loadSessions();
    return result;
  }, [userId, loadSessions]);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  return { sessions, loading, revokeSession, revokeAll, refresh: loadSessions };
}

/** Hook: secret management */
export function useSecretManager(orgId: string) {
  const [secrets, setSecrets] = useState<any[]>([]);
  const [rotationStatus, setRotationStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [secretsList, rotation] = await Promise.all([
      securityClient.listSecrets(orgId),
      securityClient.getRotationStatus(orgId),
    ]);
    if (secretsList) setSecrets(secretsList.secrets);
    if (rotation) setRotationStatus(rotation);
    setLoading(false);
  }, [orgId]);

  const store = useCallback(async (name: string, value: string, metadata?: any) => {
    await securityClient.storeSecret(orgId, name, value, metadata);
    await refresh();
  }, [orgId, refresh]);

  const rotate = useCallback(async (name: string, newValue: string) => {
    const result = await securityClient.rotateSecret(orgId, name, newValue);
    await refresh();
    return result;
  }, [orgId, refresh]);

  useEffect(() => { refresh(); }, [refresh]);
  return { secrets, rotationStatus, loading, store, rotate, refresh };
}
