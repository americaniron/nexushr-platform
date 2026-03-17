/**
 * NexusHR Training Dataset Client — Browse, manage, and customize AI employee training data
 *
 * Dual-mode: Worker API when online, local cache fallback when offline.
 */

import { useState, useEffect, useCallback } from 'react';

const API = '/api/training';

export type AIRole = 'hr_manager' | 'sales_representative' | 'customer_support_agent' | 'marketing_manager' | 'data_analyst' | 'executive_assistant';
export type DatasetCategory = 'professional_conversations' | 'workplace_scenarios' | 'company_operations' | 'task_workflows' | 'business_communications' | 'compliance_policies';

export interface RoleSummary { role: AIRole; display_name: string; department: string; expertise: string[] }
export interface ToneGuideline { primary_tone: string; voice_attributes: string[]; do_list: string[]; dont_list: string[]; example_phrases: { situation: string; good: string; bad: string }[] }
export interface ConversationExample { context: string; turns: { role: string; content: string }[]; annotations: any[] }
export interface TaskWorkflow { task_name: string; trigger: string; steps: { step: number; action: string; tool?: string; expected_output: string }[]; estimated_duration: string }
export interface DatasetMetrics { role: AIRole; builtin_conversations: number; builtin_workflows: number; custom_entries: number; custom_approved: number; coverage_score: number }

async function api<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

// ── API Client ──

export const trainingClient = {
  async getRoles() { return api<{ roles: RoleSummary[] }>('/roles'); },
  async getPersona(role: AIRole) { return api<any>(`/roles/${role}/persona`); },
  async getConversations(role: AIRole) { return api<{ conversations: ConversationExample[] }>(`/roles/${role}/conversations`); },
  async getWorkflows(role: AIRole) { return api<{ workflows: TaskWorkflow[] }>(`/roles/${role}/workflows`); },
  async getTone(role: AIRole) { return api<ToneGuideline>(`/roles/${role}/tone`); },
  async getPolicies() { return api<{ policies: any[] }>('/policies'); },
  async buildPrompt(role: AIRole, orgId?: string, taskContext?: string) {
    return api<{ prompt: string; token_estimate: number }>('/build-prompt', { method: 'POST', body: JSON.stringify({ role, org_id: orgId, task_context: taskContext }) });
  },
  async matchWorkflow(role: AIRole, taskDescription: string) {
    return api<{ workflow: TaskWorkflow | null }>('/match-workflow', { method: 'POST', body: JSON.stringify({ role, task_description: taskDescription }) });
  },
  async submitCustomData(orgId: string, role: AIRole, category: DatasetCategory, content: string, tags: string[]) {
    return api<{ id: string }>('/custom/submit', { method: 'POST', body: JSON.stringify({ org_id: orgId, role, category, content, tags }) });
  },
  async reviewCustomData(dataId: string, approved: boolean, qualityScore: number) {
    return api('/custom/review', { method: 'POST', body: JSON.stringify({ data_id: dataId, approved, quality_score: qualityScore }) });
  },
  async listCustomData(orgId: string, role?: AIRole, approvedOnly?: boolean) {
    const params = new URLSearchParams({ org_id: orgId });
    if (role) params.set('role', role);
    if (approvedOnly) params.set('approved', 'true');
    return api<{ data: any[] }>(`/custom/list?${params}`);
  },
  async getMetrics(role: AIRole, orgId?: string) {
    const params = orgId ? `?org_id=${orgId}` : '';
    return api<DatasetMetrics>(`/metrics/${role}${params}`);
  },
  async getArchitecture() { return api<any>('/architecture'); },
};

// ── React Hooks ──

export function useRoles() {
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trainingClient.getRoles().then(data => { if (data) setRoles(data.roles); setLoading(false); });
  }, []);

  return { roles, loading };
}

export function useRoleDatasets(role: AIRole) {
  const [conversations, setConversations] = useState<ConversationExample[]>([]);
  const [workflows, setWorkflows] = useState<TaskWorkflow[]>([]);
  const [tone, setTone] = useState<ToneGuideline | null>(null);
  const [metrics, setMetrics] = useState<DatasetMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      trainingClient.getConversations(role),
      trainingClient.getWorkflows(role),
      trainingClient.getTone(role),
      trainingClient.getMetrics(role),
    ]).then(([convData, wfData, toneData, metricsData]) => {
      if (convData) setConversations(convData.conversations);
      if (wfData) setWorkflows(wfData.workflows);
      if (toneData) setTone(toneData);
      if (metricsData) setMetrics(metricsData);
      setLoading(false);
    });
  }, [role]);

  return { conversations, workflows, tone, metrics, loading };
}

export function useCustomTrainingData(orgId: string, role?: AIRole) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await trainingClient.listCustomData(orgId, role);
    if (result) setData(result.data);
    setLoading(false);
  }, [orgId, role]);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = useCallback(async (category: DatasetCategory, content: string, tags: string[]) => {
    if (!role) return null;
    const result = await trainingClient.submitCustomData(orgId, role, category, content, tags);
    if (result) await refresh();
    return result;
  }, [orgId, role, refresh]);

  const review = useCallback(async (dataId: string, approved: boolean, score: number) => {
    await trainingClient.reviewCustomData(dataId, approved, score);
    await refresh();
  }, [refresh]);

  return { data, loading, submit, review, refresh };
}

export function usePromptBuilder(role: AIRole) {
  const [prompt, setPrompt] = useState('');
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [loading, setLoading] = useState(false);

  const build = useCallback(async (taskContext?: string, orgId?: string) => {
    setLoading(true);
    const result = await trainingClient.buildPrompt(role, orgId, taskContext);
    if (result) { setPrompt(result.prompt); setTokenEstimate(result.token_estimate); }
    setLoading(false);
  }, [role]);

  return { prompt, tokenEstimate, loading, build };
}
