/**
 * NexusHR Enterprise AI Employee System — Frontend Client
 * Dual-mode: Worker backend primary, localStorage fallback.
 */

import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

export type RoleCategory = 'executive' | 'operations' | 'sales' | 'marketing' | 'finance' | 'legal' | 'hr' | 'it' | 'customer_success' | 'compliance';

export interface PersonalityConfig {
  tone: string; formality: number; verbosity: number; assertiveness: number;
  empathy: number; creativity: number; risk_tolerance: number; domain_confidence: number;
  communication_style: string; decision_framework: string;
}

export interface TaskPipeline {
  id: string; name: string; trigger: string; steps: PipelineStep[];
  timeout_minutes: number; retry_policy: { max_retries: number; backoff: string }; output_format: string;
}

export interface PipelineStep {
  order: number; action: string; tool: string; inputs: string[]; outputs: string[]; timeout_minutes: number;
}

export interface ToolAccess {
  tool_id: string; name: string; permission: string; rate_limit: number; audit_required: boolean;
}

export interface TrainingDataset {
  id: string; name: string; description: string; entry_count: number; categories: string[];
}

export interface CollaborationCap {
  role_id: string; mode: string; can_delegate: boolean; can_escalate: boolean;
  escalation_targets: string[]; handoff_roles: string[];
}

export interface EnterpriseRole {
  id: string; category: RoleCategory; title: string; description: string; system_prompt: string;
  personality: PersonalityConfig; pipelines: TaskPipeline[]; tools: ToolAccess[];
  training: TrainingDataset[]; collaboration: CollaborationCap;
  kpis: string[]; compliance_tags: string[]; tier: string;
}

export interface RoleTemplate {
  id: string; name: string; base_category: RoleCategory; base_personality: Partial<PersonalityConfig>;
  required_tools: string[]; pipeline_templates: string[]; extension_points: string[]; created_at: string;
}

export interface RoleExtension {
  id: string; base_role_id: string; org_id: string; overrides: Partial<EnterpriseRole>;
  custom_pipelines: TaskPipeline[]; custom_tools: ToolAccess[]; active: boolean; created_at: string;
}

export interface PipelineExecution {
  id: string; pipeline_id: string; role_id: string; user_id: string; status: string;
  current_step: number; results: Record<string, any>; started_at: string; completed_at: string | null; error: string | null;
}

export interface CategoryInfo { id: RoleCategory; name: string; count: number; }

// ══════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════

const API = '/api/roles';
const PFX = 'nexushr_roles_';

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('nexushr_token');
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function gl<T>(k: string, f: T): T { try { const s = localStorage.getItem(`${PFX}${k}`); return s ? JSON.parse(s) : f; } catch { return f; } }
function sl(k: string, v: any) { try { localStorage.setItem(`${PFX}${k}`, JSON.stringify(v)); } catch {} }

export const enterpriseEmployeesClient = {
  async getCatalog(): Promise<{ roles: EnterpriseRole[]; total: number }> {
    try { const d = await api<{ roles: EnterpriseRole[]; total: number }>('/catalog'); sl('catalog', d.roles); return d; }
    catch { return { roles: gl('catalog', []), total: gl<EnterpriseRole[]>('catalog', []).length }; }
  },
  async getCategories(): Promise<{ categories: CategoryInfo[] }> {
    try { const d = await api<{ categories: CategoryInfo[] }>('/categories'); sl('cats', d.categories); return d; }
    catch { return { categories: gl('cats', []) }; }
  },
  async getRolesByCategory(cat: RoleCategory): Promise<{ roles: EnterpriseRole[] }> {
    try { return await api(`/category/${cat}`); } catch { return { roles: [] }; }
  },
  async getRole(id: string): Promise<{ role: EnterpriseRole }> {
    try { return await api(`/${id}`); } catch { return { role: null as any }; }
  },
  async searchRoles(q: string): Promise<{ roles: EnterpriseRole[] }> {
    try { return await api(`/search?q=${encodeURIComponent(q)}`); } catch { return { roles: [] }; }
  },
  async generateRole(template: any): Promise<{ role: EnterpriseRole }> {
    return api('/generate', { method: 'POST', body: JSON.stringify(template) });
  },
  async extendRole(baseRoleId: string, orgId: string, ext: any): Promise<{ extension: RoleExtension }> {
    return api('/extend', { method: 'POST', body: JSON.stringify({ base_role_id: baseRoleId, org_id: orgId, ...ext }) });
  },
  async getExtensions(orgId: string): Promise<{ extensions: RoleExtension[] }> {
    try { return await api(`/extensions?org_id=${orgId}`); } catch { return { extensions: [] }; }
  },
  async resolveRole(roleId: string, orgId: string): Promise<{ role: EnterpriseRole }> {
    return api('/resolve', { method: 'POST', body: JSON.stringify({ role_id: roleId, org_id: orgId }) });
  },
  async executePipeline(roleId: string, pipelineId: string, inputs?: Record<string, any>): Promise<{ execution: PipelineExecution }> {
    return api('/execute', { method: 'POST', body: JSON.stringify({ role_id: roleId, pipeline_id: pipelineId, inputs }) });
  },
  async getExecutions(limit?: number): Promise<{ executions: PipelineExecution[] }> {
    try { return await api(`/executions${limit ? `?limit=${limit}` : ''}`); } catch { return { executions: [] }; }
  },
  async saveTemplate(tpl: any): Promise<{ template: RoleTemplate }> {
    return api('/templates', { method: 'POST', body: JSON.stringify(tpl) });
  },
  async getTemplates(category?: RoleCategory): Promise<{ templates: RoleTemplate[] }> {
    try { return await api(`/templates${category ? `?category=${category}` : ''}`); } catch { return { templates: [] }; }
  },
  async initSchema(): Promise<{ success: boolean }> {
    return api('/schema', { method: 'POST' });
  },
};

// ══════════════════════════════════════════════════════
// REACT HOOKS
// ══════════════════════════════════════════════════════

export function useRoleCatalog() {
  const [roles, setRoles] = useState<EnterpriseRole[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const { roles: d } = await enterpriseEmployeesClient.getCatalog(); setRoles(d); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { roles, loading, refresh };
}

export function useRoleCategories() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { categories: c } = await enterpriseEmployeesClient.getCategories(); setCategories(c); } catch {}
    setLoading(false);
  })(); }, []);
  return { categories, loading };
}

export function useRolesByCategory(cat: RoleCategory) {
  const [roles, setRoles] = useState<EnterpriseRole[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    setLoading(true);
    try { const { roles: r } = await enterpriseEmployeesClient.getRolesByCategory(cat); setRoles(r); } catch {}
    setLoading(false);
  })(); }, [cat]);
  return { roles, loading };
}

export function useRole(id: string) {
  const [role, setRole] = useState<EnterpriseRole | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    setLoading(true);
    try { const { role: r } = await enterpriseEmployeesClient.getRole(id); setRole(r); } catch {}
    setLoading(false);
  })(); }, [id]);
  return { role, loading };
}

export function useRoleSearch() {
  const [results, setResults] = useState<EnterpriseRole[]>([]);
  const [loading, setLoading] = useState(false);
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try { const { roles } = await enterpriseEmployeesClient.searchRoles(q); setResults(roles); } catch {}
    setLoading(false);
  }, []);
  return { results, loading, search };
}

export function usePipelineExecutions(limit = 20) {
  const [executions, setExecutions] = useState<PipelineExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const { executions: e } = await enterpriseEmployeesClient.getExecutions(limit); setExecutions(e); } catch {}
    setLoading(false);
  }, [limit]);
  useEffect(() => { refresh(); }, [refresh]);
  return { executions, loading, refresh };
}

export function useRoleTemplates(category?: RoleCategory) {
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { templates: t } = await enterpriseEmployeesClient.getTemplates(category); setTemplates(t); } catch {}
    setLoading(false);
  })(); }, [category]);
  return { templates, loading };
}
