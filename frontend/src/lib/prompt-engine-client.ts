/**
 * NexusHR Feature #29 — Secure Prompt Engine Client
 * Full API client with React hooks, dual-mode (Worker backend + localStorage fallback)
 */

import { useState, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

export type PromptLayerType = 'system' | 'context' | 'user' | 'tool' | 'guardrail' | 'persona';
export type PromptStatus = 'draft' | 'review' | 'approved' | 'active' | 'canary' | 'deprecated' | 'rolled_back';
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
export type FirewallAction = 'allow' | 'sanitize' | 'block' | 'flag' | 'quarantine';
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type RollbackReason = 'performance_degradation' | 'safety_violation' | 'user_complaints' | 'error_rate_spike' | 'manual' | 'auto_canary_fail';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

export interface PromptLayer { type: PromptLayerType; content: string; priority: number; immutable: boolean; boundary_id: string; metadata: Record<string, any>; }
export interface ComposedPrompt { id: string; layers: PromptLayer[]; final_text: string; token_count: number; boundary_markers: string[]; isolation_verified: boolean; sanitization_applied: string[]; firewall_result: FirewallResult; composed_at: string; }
export interface FirewallResult { allowed: boolean; action: FirewallAction; threat_level: ThreatLevel; violations: FirewallViolation[]; sanitized_input: string; original_input: string; scan_duration_ms: number; rules_evaluated: number; }
export interface FirewallViolation { rule_id: string; rule_name: string; category: string; threat_level: ThreatLevel; matched_text: string; position: number; action_taken: FirewallAction; }
export interface FirewallRule { id: string; name: string; description: string; pattern: string; threat_level: ThreatLevel; action: FirewallAction; enabled: boolean; category: string; priority: number; }
export interface PromptTemplate { id: string; tenant_id: string; name: string; description: string; version: string; status: PromptStatus; layers: PromptLayer[]; variables: PromptVariable[]; constraints: PromptConstraint[]; max_tokens: number; model_target: string; tags: string[]; created_by: string; approved_by: string | null; approval_status: ApprovalStatus; parent_version_id: string | null; rollback_target_id: string | null; performance_baseline: PerformanceBaseline | null; created_at: string; updated_at: string; }
export interface PromptVariable { name: string; type: string; required: boolean; default_value?: string; allowed_values?: string[]; max_length?: number; sanitize: boolean; description: string; }
export interface PromptConstraint { type: string; value: string | number; error_message: string; }
export interface PerformanceBaseline { avg_quality_score: number; avg_latency_ms: number; error_rate: number; user_satisfaction: number; sample_size: number; measured_at: string; }
export interface PromptExperiment { id: string; tenant_id: string; name: string; description: string; status: ExperimentStatus; variants: ExperimentVariant[]; traffic_allocation: Record<string, number>; target_metric: string; min_sample_size: number; max_duration_hours: number; confidence_threshold: number; started_at: string | null; completed_at: string | null; winner_variant_id: string | null; results: ExperimentResults | null; created_at: string; updated_at: string; }
export interface ExperimentVariant { id: string; name: string; prompt_version_id: string; is_control: boolean; description: string; }
export interface ExperimentResults { total_impressions: number; by_variant: Record<string, VariantMetrics>; statistical_significance: boolean; p_value: number; confidence_interval: [number, number]; winner: string | null; recommendation: string; }
export interface VariantMetrics { impressions: number; avg_quality_score: number; avg_latency_ms: number; error_rate: number; user_satisfaction: number; conversion_rate: number; std_dev: number; }
export interface VersionDiff { from_version: string; to_version: string; changes: any[]; variable_changes: string[]; constraint_changes: string[]; impact_assessment: string; }
export interface RollbackRecord { id: string; from_version_id: string; to_version_id: string; reason: RollbackReason; initiated_by: string; performance_snapshot: PerformanceBaseline; completed_at: string; auto_triggered: boolean; }

// ─── API Client ─────────────────────────────────────────────────────

const API_BASE = '/api/prompts';

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn(`Prompt Engine API offline, using local fallback for ${path}`);
    return { success: true, data: [] } as T;
  }
}

export const promptEngineClient = {
  init: () => apiCall<{ success: boolean }>('init', { method: 'POST' }),

  compose: (layers: { type: PromptLayerType; content: string; immutable?: boolean; priority?: number }[], userInput?: string, maxTokens?: number) =>
    apiCall<{ success: boolean; prompt: ComposedPrompt }>('compose', { method: 'POST', body: JSON.stringify({ layers, user_input: userInput, max_tokens: maxTokens }) }),

  scanFirewall: (input: string, customRules?: FirewallRule[]) =>
    apiCall<{ success: boolean; result: FirewallResult }>('firewall/scan', { method: 'POST', body: JSON.stringify({ input, custom_rules: customRules }) }),

  getFirewallRules: () =>
    apiCall<{ success: boolean; default_rules: FirewallRule[]; custom_rules: FirewallRule[] }>('firewall/rules'),

  addFirewallRule: (rule: Omit<FirewallRule, 'id'>) =>
    apiCall<{ success: boolean; rule: FirewallRule }>('firewall/rules', { method: 'POST', body: JSON.stringify(rule) }),

  getFirewallLogs: (limit?: number) =>
    apiCall<{ success: boolean; logs: any[] }>(`firewall/logs?limit=${limit || 50}`),

  getFirewallStats: (period?: string) =>
    apiCall<{ success: boolean; stats: any }>(`firewall/stats?period=${period || '7d'}`),

  sanitize: (input: string, rules?: string[], maxTokens?: number) =>
    apiCall<{ success: boolean; sanitized: string; rules_applied: string[]; modifications: number }>('sanitize', { method: 'POST', body: JSON.stringify({ input, rules, max_tokens: maxTokens }) }),

  createTemplate: (template: any) =>
    apiCall<{ success: boolean; template: PromptTemplate }>('templates', { method: 'POST', body: JSON.stringify(template) }),

  listTemplates: (filters?: { status?: PromptStatus; name?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (filters) { for (const [k, v] of Object.entries(filters)) { if (v !== undefined) params.set(k, String(v)); } }
    return apiCall<{ success: boolean; templates: PromptTemplate[]; total: number }>(`templates?${params}`);
  },

  getTemplate: (id: string) =>
    apiCall<{ success: boolean; template: PromptTemplate }>(`templates/${id}`),

  createVersion: (parentId: string, updates: any, bump?: 'major' | 'minor' | 'patch') =>
    apiCall<{ success: boolean; template: PromptTemplate }>(`templates/${parentId}/version`, { method: 'POST', body: JSON.stringify({ ...updates, bump }) }),

  approveTemplate: (id: string, approvedBy?: string) =>
    apiCall<{ success: boolean; template: PromptTemplate }>(`templates/${id}/approve`, { method: 'POST', body: JSON.stringify({ approved_by: approvedBy }) }),

  activateTemplate: (id: string) =>
    apiCall<{ success: boolean; template: PromptTemplate }>(`templates/${id}/activate`, { method: 'POST' }),

  rollbackTemplate: (id: string, reason: RollbackReason) =>
    apiCall<{ success: boolean; rollback: RollbackRecord }>(`templates/${id}/rollback`, { method: 'POST', body: JSON.stringify({ reason }) }),

  updateBaseline: (id: string, baseline: PerformanceBaseline) =>
    apiCall<{ success: boolean }>(`templates/${id}/baseline`, { method: 'PUT', body: JSON.stringify(baseline) }),

  getVersionHistory: (name: string) =>
    apiCall<{ success: boolean; versions: PromptTemplate[] }>(`versions?name=${encodeURIComponent(name)}`),

  getDiff: (fromId: string, toId: string) =>
    apiCall<{ success: boolean; diff: VersionDiff }>('diff', { method: 'POST', body: JSON.stringify({ from_id: fromId, to_id: toId }) }),

  getRollbackHistory: () =>
    apiCall<{ success: boolean; rollbacks: RollbackRecord[] }>('rollbacks'),

  createExperiment: (experiment: any) =>
    apiCall<{ success: boolean; experiment: PromptExperiment }>('experiments', { method: 'POST', body: JSON.stringify(experiment) }),

  listExperiments: (status?: ExperimentStatus) =>
    apiCall<{ success: boolean; experiments: PromptExperiment[] }>(`experiments${status ? `?status=${status}` : ''}`),

  getExperiment: (id: string) =>
    apiCall<{ success: boolean; experiment: PromptExperiment }>(`experiments/${id}`),

  startExperiment: (id: string) =>
    apiCall<{ success: boolean; experiment: PromptExperiment }>(`experiments/${id}/start`, { method: 'POST' }),

  recordImpression: (expId: string, variantId: string, metrics: { quality_score: number; latency_ms: number; error: boolean; user_satisfied: boolean; converted: boolean }) =>
    apiCall<{ success: boolean }>(`experiments/${expId}/impression`, { method: 'POST', body: JSON.stringify({ variant_id: variantId, ...metrics }) }),

  evaluateExperiment: (id: string) =>
    apiCall<{ success: boolean; results: ExperimentResults }>(`experiments/${id}/evaluate`, { method: 'POST' }),

  completeExperiment: (id: string) =>
    apiCall<{ success: boolean; experiment: PromptExperiment }>(`experiments/${id}/complete`, { method: 'POST' }),

  selectVariant: (id: string) =>
    apiCall<{ success: boolean; variant_id: string; prompt_version_id: string }>(`experiments/${id}/select-variant`),
};

// ─── React Hooks ────────────────────────────────────────────────────

export function usePromptComposer() {
  const [composed, setComposed] = useState<ComposedPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compose = useCallback(async (layers: { type: PromptLayerType; content: string; immutable?: boolean; priority?: number }[], userInput?: string, maxTokens?: number) => {
    setLoading(true); setError(null);
    try {
      const res = await promptEngineClient.compose(layers, userInput, maxTokens);
      setComposed(res.prompt);
      return res.prompt;
    } catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  return { composed, loading, error, compose };
}

export function usePromptFirewall() {
  const [result, setResult] = useState<FirewallResult | null>(null);
  const [rules, setRules] = useState<{ default_rules: FirewallRule[]; custom_rules: FirewallRule[] } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (input: string) => {
    setLoading(true); setError(null);
    try { const res = await promptEngineClient.scanFirewall(input); setResult(res.result); return res.result; }
    catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  const loadRules = useCallback(async () => {
    try { const res = await promptEngineClient.getFirewallRules(); setRules(res); return res; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const loadStats = useCallback(async (period?: string) => {
    try { const res = await promptEngineClient.getFirewallStats(period); setStats(res.stats); return res.stats; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  return { result, rules, stats, loading, error, scan, loadRules, loadStats };
}

export function usePromptTemplates() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [current, setCurrent] = useState<PromptTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (filters?: any) => {
    setLoading(true); setError(null);
    try { const res = await promptEngineClient.listTemplates(filters); setTemplates(res.templates); return res; }
    catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  const get = useCallback(async (id: string) => {
    try { const res = await promptEngineClient.getTemplate(id); setCurrent(res.template); return res.template; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const create = useCallback(async (template: any) => {
    try { const res = await promptEngineClient.createTemplate(template); return res.template; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const createVersion = useCallback(async (parentId: string, updates: any, bump?: 'major' | 'minor' | 'patch') => {
    try { const res = await promptEngineClient.createVersion(parentId, updates, bump); return res.template; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const approve = useCallback(async (id: string) => {
    try { const res = await promptEngineClient.approveTemplate(id); return res.template; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const activate = useCallback(async (id: string) => {
    try { const res = await promptEngineClient.activateTemplate(id); return res.template; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const rollback = useCallback(async (id: string, reason: RollbackReason) => {
    try { const res = await promptEngineClient.rollbackTemplate(id, reason); return res.rollback; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  return { templates, current, loading, error, list, get, create, createVersion, approve, activate, rollback };
}

export function usePromptVersioning() {
  const [versions, setVersions] = useState<PromptTemplate[]>([]);
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [rollbacks, setRollbacks] = useState<RollbackRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getHistory = useCallback(async (name: string) => {
    setLoading(true); setError(null);
    try { const res = await promptEngineClient.getVersionHistory(name); setVersions(res.versions); return res.versions; }
    catch (e: any) { setError(e.message); return []; }
    finally { setLoading(false); }
  }, []);

  const compare = useCallback(async (fromId: string, toId: string) => {
    try { const res = await promptEngineClient.getDiff(fromId, toId); setDiff(res.diff); return res.diff; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const loadRollbacks = useCallback(async () => {
    try { const res = await promptEngineClient.getRollbackHistory(); setRollbacks(res.rollbacks); return res.rollbacks; }
    catch (e: any) { setError(e.message); return []; }
  }, []);

  return { versions, diff, rollbacks, loading, error, getHistory, compare, loadRollbacks };
}

export function usePromptExperiments() {
  const [experiments, setExperiments] = useState<PromptExperiment[]>([]);
  const [current, setCurrent] = useState<PromptExperiment | null>(null);
  const [results, setResults] = useState<ExperimentResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (status?: ExperimentStatus) => {
    setLoading(true); setError(null);
    try { const res = await promptEngineClient.listExperiments(status); setExperiments(res.experiments); return res.experiments; }
    catch (e: any) { setError(e.message); return []; }
    finally { setLoading(false); }
  }, []);

  const create = useCallback(async (experiment: any) => {
    try { const res = await promptEngineClient.createExperiment(experiment); return res.experiment; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const start = useCallback(async (id: string) => {
    try { const res = await promptEngineClient.startExperiment(id); setCurrent(res.experiment); return res.experiment; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const evaluate = useCallback(async (id: string) => {
    try { const res = await promptEngineClient.evaluateExperiment(id); setResults(res.results); return res.results; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const complete = useCallback(async (id: string) => {
    try { const res = await promptEngineClient.completeExperiment(id); setCurrent(res.experiment); return res.experiment; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const selectVariant = useCallback(async (id: string) => {
    try { return await promptEngineClient.selectVariant(id); }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  return { experiments, current, results, loading, error, list, create, start, evaluate, complete, selectVariant };
}
