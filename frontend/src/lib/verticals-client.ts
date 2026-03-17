/**
 * NexusHR Industry Vertical AI Employee Packs — Frontend Client
 *
 * Dual-mode: Worker backend primary, localStorage fallback for offline.
 */

import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════
// TYPES (mirrored from Worker)
// ══════════════════════════════════════════════════════

export type VerticalId = 'healthcare' | 'legal' | 'real_estate' | 'construction' | 'financial_services';
export type PackStatus = 'available' | 'installed' | 'trial' | 'deprecated';
export type EmployeeTier = 'core' | 'advanced' | 'specialist';

export interface VerticalPack {
  id: VerticalId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  employees: VerticalEmployee[];
  workflows: VerticalWorkflow[];
  compliance: VerticalCompliance;
  integrations: VerticalIntegration[];
  knowledge_domains: KnowledgeDomain[];
  pricing: { monthly_addon: number; annual_addon: number; per_employee: number };
  stats: { companies_using: number; avg_time_saved_hours: number; satisfaction: number };
}

export interface VerticalEmployee {
  id: string;
  vertical: VerticalId;
  role: string;
  title: string;
  description: string;
  tier: EmployeeTier;
  expertise: string[];
  tools: string[];
  personality: { tone: string; formality: number; verbosity: number; domain_confidence: number; empathy: number };
  system_prompt_additions: string;
  training_topics: string[];
  example_tasks: string[];
  compliance_awareness: string[];
  kpis: string[];
}

export interface VerticalWorkflow {
  id: string;
  vertical: VerticalId;
  name: string;
  description: string;
  trigger: string;
  category: string;
  steps: VerticalWorkflowStep[];
  estimated_time_minutes: number;
  employees_involved: string[];
}

export interface VerticalWorkflowStep {
  order: number;
  name: string;
  employee_id: string;
  action: string;
  inputs: string[];
  outputs: string[];
  timeout_minutes: number;
}

export interface VerticalCompliance {
  vertical: VerticalId;
  frameworks: string[];
  regulations: ComplianceRegulation[];
  data_handling: DataHandlingRule[];
  ai_guardrails: string[];
}

export interface ComplianceRegulation {
  id: string;
  name: string;
  description: string;
  requirements: string[];
  penalties: string;
  audit_frequency: string;
  automated_checks: string[];
}

export interface DataHandlingRule {
  data_type: string;
  classification: string;
  encryption: string;
  retention_days: number;
  access_roles: string[];
  audit_required: boolean;
  anonymization: string;
}

export interface VerticalIntegration {
  id: string;
  name: string;
  category: string;
  description: string;
  auth_type: string;
  endpoints: string[];
  data_sync: string[];
}

export interface KnowledgeDomain {
  id: string;
  name: string;
  description: string;
  entry_count: number;
  categories: string[];
  update_frequency: string;
  sources: string[];
}

export interface InstalledPack {
  id: string;
  org_id: string;
  vertical_id: VerticalId;
  installed_at: string;
  installed_by: string;
  status: PackStatus;
  customizations: Record<string, any>;
  active_employees: string[];
  active_workflows: string[];
  billing_status: string;
}

export interface MarketplaceListing {
  id: string;
  vertical_id: string;
  name: string;
  publisher: string;
  description: string;
  rating: number;
  reviews: number;
  installs: number;
  price_monthly: number;
  featured: boolean;
  tags: string[];
  last_updated: string;
  compatibility: string[];
}

// ══════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════

const API_BASE = '/api/verticals';
const STORAGE_PREFIX = 'nexushr_verticals_';

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    const token = localStorage.getItem('nexushr_token');
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn('Verticals API unavailable, using local fallback:', err);
    throw err;
  }
}

function getLocal<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

function setLocal(key: string, value: any): void {
  try { localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value)); } catch {}
}

export const verticalsClient = {
  // ── Packs ──

  async listPacks(): Promise<{ packs: VerticalPack[] }> {
    try {
      const data = await apiCall<{ packs: VerticalPack[] }>('/packs');
      setLocal('packs', data.packs);
      return data;
    } catch {
      return { packs: getLocal('packs', []) };
    }
  },

  async getPack(verticalId: VerticalId): Promise<{ pack: VerticalPack }> {
    try {
      const data = await apiCall<{ pack: VerticalPack }>(`/packs/${verticalId}`);
      setLocal(`pack_${verticalId}`, data.pack);
      return data;
    } catch {
      return { pack: getLocal(`pack_${verticalId}`, null as any) };
    }
  },

  async getPackEmployees(verticalId: VerticalId): Promise<{ employees: VerticalEmployee[] }> {
    try {
      const data = await apiCall<{ employees: VerticalEmployee[] }>(`/packs/${verticalId}/employees`);
      setLocal(`employees_${verticalId}`, data.employees);
      return data;
    } catch {
      return { employees: getLocal(`employees_${verticalId}`, []) };
    }
  },

  async getPackWorkflows(verticalId: VerticalId): Promise<{ workflows: VerticalWorkflow[] }> {
    try {
      const data = await apiCall<{ workflows: VerticalWorkflow[] }>(`/packs/${verticalId}/workflows`);
      return data;
    } catch {
      return { workflows: [] };
    }
  },

  async getPackCompliance(verticalId: VerticalId): Promise<{ compliance: VerticalCompliance }> {
    try {
      return await apiCall<{ compliance: VerticalCompliance }>(`/packs/${verticalId}/compliance`);
    } catch {
      return { compliance: getLocal(`compliance_${verticalId}`, null as any) };
    }
  },

  async searchEmployees(query: string, vertical?: VerticalId): Promise<{ employees: VerticalEmployee[] }> {
    const params = new URLSearchParams({ q: query });
    if (vertical) params.set('vertical', vertical);
    try {
      return await apiCall<{ employees: VerticalEmployee[] }>(`/employees/search?${params}`);
    } catch {
      return { employees: [] };
    }
  },

  // ── Install / Manage ──

  async installPack(verticalId: VerticalId, orgId: string): Promise<{ installation: InstalledPack }> {
    return apiCall('/install', { method: 'POST', body: JSON.stringify({ vertical_id: verticalId, org_id: orgId }) });
  },

  async uninstallPack(verticalId: VerticalId, orgId: string): Promise<{ success: boolean }> {
    return apiCall('/uninstall', { method: 'POST', body: JSON.stringify({ vertical_id: verticalId, org_id: orgId }) });
  },

  async getInstalledPacks(orgId: string): Promise<{ installed: InstalledPack[] }> {
    try {
      const data = await apiCall<{ installed: InstalledPack[] }>(`/installed?org_id=${orgId}`);
      setLocal('installed', data.installed);
      return data;
    } catch {
      return { installed: getLocal('installed', []) };
    }
  },

  async customizePack(verticalId: VerticalId, orgId: string, customizations: Record<string, any>): Promise<{ success: boolean }> {
    return apiCall('/customize', { method: 'POST', body: JSON.stringify({ vertical_id: verticalId, org_id: orgId, customizations }) });
  },

  // ── Marketplace ──

  async getMarketplace(): Promise<{ listings: MarketplaceListing[] }> {
    try {
      const data = await apiCall<{ listings: MarketplaceListing[] }>('/marketplace');
      setLocal('marketplace', data.listings);
      return data;
    } catch {
      return { listings: getLocal('marketplace', []) };
    }
  },

  async getExpansionStrategy(): Promise<{ strategy: any }> {
    try {
      return await apiCall('/expansion-strategy');
    } catch {
      return { strategy: null };
    }
  },

  // ── Schema ──
  async initSchema(): Promise<{ success: boolean }> {
    return apiCall('/schema', { method: 'POST' });
  },
};

// ══════════════════════════════════════════════════════
// REACT HOOKS
// ══════════════════════════════════════════════════════

export function useVerticalPacks() {
  const [packs, setPacks] = useState<VerticalPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { packs: data } = await verticalsClient.listPacks();
      setPacks(data);
      setError(null);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { packs, loading, error, refresh };
}

export function useVerticalPack(verticalId: VerticalId) {
  const [pack, setPack] = useState<VerticalPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { pack: data } = await verticalsClient.getPack(verticalId);
        if (!cancelled) { setPack(data); setError(null); }
      } catch (e: any) { if (!cancelled) setError(e.message); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [verticalId]);

  return { pack, loading, error };
}

export function useVerticalEmployees(verticalId: VerticalId) {
  const [employees, setEmployees] = useState<VerticalEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { employees: data } = await verticalsClient.getPackEmployees(verticalId);
        if (!cancelled) setEmployees(data);
      } catch {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [verticalId]);

  return { employees, loading };
}

export function useInstalledPacks(orgId: string) {
  const [installed, setInstalled] = useState<InstalledPack[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { installed: data } = await verticalsClient.getInstalledPacks(orgId);
      setInstalled(data);
    } catch {}
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { installed, loading, refresh };
}

export function useMarketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { listings: data } = await verticalsClient.getMarketplace();
        setListings(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return { listings, loading };
}

export function useEmployeeSearch() {
  const [results, setResults] = useState<VerticalEmployee[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, vertical?: VerticalId) => {
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const { employees } = await verticalsClient.searchEmployees(query, vertical);
      setResults(employees);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  return { results, loading, search };
}
