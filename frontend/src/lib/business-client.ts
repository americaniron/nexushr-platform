/**
 * NexusHR Business Model Client — Pricing, Economics, Sales & Growth
 *
 * Dual-mode: Worker API when online, localStorage fallback when offline.
 * React hooks for pricing calculator, ROI tool, expansion, partners, and financial dashboard.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

const API_BASE = '/api/business';

// ══════════════════════════════════════════════════════
// 1. TYPES
// ══════════════════════════════════════════════════════

export type PricingTier = 'starter' | 'professional' | 'enterprise' | 'custom';
export type BillingCycle = 'monthly' | 'annual';
export type DealStage = 'prospect' | 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type PartnerTier = 'registered' | 'silver' | 'gold' | 'platinum';

export interface PricingPlan {
  tier: PricingTier;
  name: string;
  base_price_monthly: number;
  base_price_annual: number;
  included_employees: number;
  included_tasks_per_month: number;
  included_compute_hours: number;
  included_storage_gb: number;
  overage_per_task: number;
  overage_per_compute_hour: number;
  overage_per_storage_gb: number;
  overage_per_api_call: number;
  features: string[];
  max_employees: number;
  sla_uptime: number;
  support_level: string;
}

export interface BillEstimate {
  base: number;
  overages: Record<string, number>;
  total: number;
  savings_vs_monthly: number;
}

export interface UnitEconomics {
  cost_per_task: number;
  revenue_per_task: number;
  gross_margin_per_task: number;
  cost_per_employee_month: number;
  revenue_per_employee_month: number;
  gross_margin_per_employee: number;
  blended_gross_margin_pct: number;
  ltv: number;
  cac: number;
  ltv_cac_ratio: number;
  payback_months: number;
  avg_tasks_per_employee_month: number;
}

export interface ROIResult {
  annual_labor_cost_saved: number;
  nexushr_annual_cost: number;
  net_savings: number;
  roi_percentage: number;
  payback_days: number;
  productivity_gain_pct: number;
  equivalent_fte_freed: number;
}

export interface ExpansionOpportunity {
  id: string;
  org_id: string;
  type: string;
  current_plan: PricingTier;
  recommended_plan: PricingTier;
  current_mrr: number;
  projected_mrr: number;
  expansion_mrr: number;
  trigger_reason: string;
  confidence_score: number;
  suggested_action: string;
  created_at: string;
}

export interface FinancialDashboard {
  mrr: number;
  arr: number;
  total_customers: number;
  avg_arpu: number;
  gross_margin_pct: number;
  net_revenue_retention: number;
  ltv_cac_ratio: number;
  runway_months: number;
}

export interface BreakEvenResult {
  fixed_costs_monthly: number;
  variable_cost_per_customer: number;
  avg_revenue_per_customer: number;
  contribution_margin: number;
  break_even_customers: number;
  current_customers: number;
  months_to_break_even: number;
  projected_profitability_date: string;
  scenarios: { name: string; growth_rate: number; churn_rate: number; months_to_profit: number; year1_revenue: number; year1_costs: number; year1_net: number }[];
}

// ══════════════════════════════════════════════════════
// 2. LOCAL PRICING DATA (offline fallback)
// ══════════════════════════════════════════════════════

const LOCAL_PLANS: Record<PricingTier, PricingPlan> = {
  starter: {
    tier: 'starter', name: 'Starter', base_price_monthly: 49, base_price_annual: 470,
    included_employees: 3, included_tasks_per_month: 500, included_compute_hours: 10,
    included_storage_gb: 5, overage_per_task: 0.08, overage_per_compute_hour: 2.50,
    overage_per_storage_gb: 0.50, overage_per_api_call: 0.005,
    features: ['basic_ai_employees', 'email_support', 'standard_templates', 'basic_analytics'],
    max_employees: 5, sla_uptime: 99.5, support_level: 'email',
  },
  professional: {
    tier: 'professional', name: 'Professional', base_price_monthly: 149, base_price_annual: 1430,
    included_employees: 10, included_tasks_per_month: 2000, included_compute_hours: 50,
    included_storage_gb: 25, overage_per_task: 0.06, overage_per_compute_hour: 2.00,
    overage_per_storage_gb: 0.40, overage_per_api_call: 0.004,
    features: ['advanced_ai_employees', 'priority_support', 'custom_templates', 'advanced_analytics', 'integrations', 'team_collaboration'],
    max_employees: 25, sla_uptime: 99.9, support_level: 'priority_email_chat',
  },
  enterprise: {
    tier: 'enterprise', name: 'Enterprise', base_price_monthly: 499, base_price_annual: 4790,
    included_employees: 50, included_tasks_per_month: 10000, included_compute_hours: 200,
    included_storage_gb: 100, overage_per_task: 0.04, overage_per_compute_hour: 1.50,
    overage_per_storage_gb: 0.30, overage_per_api_call: 0.003,
    features: ['unlimited_ai_employees', 'dedicated_support', 'custom_models', 'enterprise_analytics', 'sso_saml', 'audit_logs', 'custom_integrations', 'sla_guarantee', 'dedicated_account_manager'],
    max_employees: 500, sla_uptime: 99.99, support_level: 'dedicated_account_manager',
  },
  custom: {
    tier: 'custom', name: 'Custom', base_price_monthly: 0, base_price_annual: 0,
    included_employees: 0, included_tasks_per_month: 0, included_compute_hours: 0,
    included_storage_gb: 0, overage_per_task: 0, overage_per_compute_hour: 0,
    overage_per_storage_gb: 0, overage_per_api_call: 0,
    features: ['everything_in_enterprise', 'custom_deployment', 'on_premise_option', 'custom_sla', 'dedicated_infrastructure'],
    max_employees: -1, sla_uptime: 99.99, support_level: 'white_glove',
  },
};

// ══════════════════════════════════════════════════════
// 3. API CLIENT
// ══════════════════════════════════════════════════════

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch {
    return null;
  }
}

// ── Pricing Client ──

export const pricingClient = {
  async getPlans(): Promise<PricingPlan[]> {
    const data = await apiFetch<{ plans: PricingPlan[] }>('/pricing/plans');
    return data?.plans || Object.values(LOCAL_PLANS);
  },

  async calculateBill(tier: PricingTier, cycle: BillingCycle, usage: { tasks: number; compute_hours: number; storage_gb: number; api_calls: number }): Promise<BillEstimate> {
    const data = await apiFetch<BillEstimate>('/pricing/calculate', {
      method: 'POST', body: JSON.stringify({ tier, cycle, usage }),
    });
    if (data) return data;

    // Offline calculation
    const plan = LOCAL_PLANS[tier];
    const base = cycle === 'annual' ? plan.base_price_annual / 12 : plan.base_price_monthly;
    const overages: Record<string, number> = {
      tasks: Math.max(0, usage.tasks - plan.included_tasks_per_month) * plan.overage_per_task,
      compute: Math.max(0, usage.compute_hours - plan.included_compute_hours) * plan.overage_per_compute_hour,
      storage: Math.max(0, usage.storage_gb - plan.included_storage_gb) * plan.overage_per_storage_gb,
      api_calls: Math.max(0, usage.api_calls - plan.included_tasks_per_month * 10) * plan.overage_per_api_call,
    };
    const total = base + Object.values(overages).reduce((s, v) => s + v, 0);
    return { base: Math.round(base * 100) / 100, overages, total: Math.round(total * 100) / 100, savings_vs_monthly: cycle === 'annual' ? Math.round((plan.base_price_monthly - base) * 100) / 100 : 0 };
  },

  async recommend(params: { employees_needed: number; estimated_tasks_per_month: number; needs_sso: boolean; needs_custom_models: boolean; team_size: number }): Promise<{ recommended: PricingTier; reason: string; estimated_monthly_cost: number }> {
    const data = await apiFetch<any>('/pricing/recommend', { method: 'POST', body: JSON.stringify(params) });
    if (data) return data;
    // Simple offline recommendation
    const tier: PricingTier = params.needs_sso || params.employees_needed > 25 ? 'enterprise' :
                               params.employees_needed > 5 || params.estimated_tasks_per_month > 500 ? 'professional' : 'starter';
    return { recommended: tier, reason: 'Offline recommendation based on employee count', estimated_monthly_cost: LOCAL_PLANS[tier].base_price_monthly };
  },
};

// ── Economics Client ──

export const economicsClient = {
  async getUnitEconomics(tier: PricingTier, tasks?: number, employees?: number): Promise<UnitEconomics | null> {
    const params = new URLSearchParams({ tier });
    if (tasks) params.set('tasks', String(tasks));
    if (employees) params.set('employees', String(employees));
    return apiFetch<UnitEconomics>(`/economics/unit?${params}`);
  },

  async getMarginAnalysis(orgId: string) {
    return apiFetch<any>(`/economics/margin/${orgId}`);
  },
};

// ── Sales Client ──

export const salesClient = {
  async calculateROI(params: { current_headcount: number; avg_salary: number; hours_per_week_on_repetitive_tasks: number; ai_employees_planned: number }): Promise<ROIResult> {
    const data = await apiFetch<ROIResult>('/sales/roi', { method: 'POST', body: JSON.stringify(params) });
    if (data) return data;

    // Offline ROI calculation
    const hoursPerYear = params.hours_per_week_on_repetitive_tasks * 52;
    const hourlyRate = params.avg_salary / 2080;
    const hoursSaved = hoursPerYear * 0.65 * params.current_headcount;
    const annualSaved = hoursSaved * hourlyRate;
    const tier = params.ai_employees_planned <= 5 ? 'starter' : params.ai_employees_planned <= 25 ? 'professional' : 'enterprise';
    const annualCost = LOCAL_PLANS[tier].base_price_annual || LOCAL_PLANS[tier].base_price_monthly * 12;
    const netSavings = annualSaved - annualCost;
    return {
      annual_labor_cost_saved: Math.round(annualSaved),
      nexushr_annual_cost: annualCost,
      net_savings: Math.round(netSavings),
      roi_percentage: Math.round((netSavings / annualCost) * 100),
      payback_days: Math.ceil((annualCost / annualSaved) * 365),
      productivity_gain_pct: Math.round((hoursSaved / (params.current_headcount * 2080)) * 1000) / 10,
      equivalent_fte_freed: Math.round((hoursSaved / 2080) * 10) / 10,
    };
  },

  async getMaterials() {
    return apiFetch<{ materials: any[] }>('/sales/materials');
  },

  async getDemoFlow() {
    return apiFetch<{ demo_flow: any[] }>('/sales/demo-flow');
  },

  async trackDeal(deal: any) {
    return apiFetch<any>('/sales/deals', { method: 'POST', body: JSON.stringify(deal) });
  },

  async updateDealStage(dealId: string, stage: DealStage, nextStep: string) {
    return apiFetch<any>(`/sales/deals/${dealId}/stage`, { method: 'PATCH', body: JSON.stringify({ stage, next_step: nextStep }) });
  },

  async getPipeline(orgId?: string) {
    const params = orgId ? `?org_id=${orgId}` : '';
    return apiFetch<any>(`/sales/pipeline${params}`);
  },
};

// ── Expansion Client ──

export const expansionClient = {
  async detect(orgId: string): Promise<ExpansionOpportunity[]> {
    const data = await apiFetch<{ opportunities: ExpansionOpportunity[] }>(`/expansion/detect/${orgId}`, { method: 'POST' });
    return data?.opportunities || [];
  },

  async getPlaybook(tier: PricingTier) {
    return apiFetch<{ playbook: any[] }>(`/expansion/playbook/${tier}`);
  },
};

// ── Partner Client ──

export const partnerClient = {
  async getTiers() {
    return apiFetch<{ tiers: any }>('/partners/tiers');
  },

  async register(data: { name: string; certified_consultants: number; specializations: string[] }) {
    return apiFetch<any>('/partners/register', { method: 'POST', body: JSON.stringify(data) });
  },

  async evaluateUpgrade(partnerId: string) {
    return apiFetch<any>(`/partners/${partnerId}/evaluate`);
  },

  async calculateCommission(partnerId: string, dealValue: number, tier: PartnerTier) {
    return apiFetch<any>('/partners/commission', { method: 'POST', body: JSON.stringify({ partner_id: partnerId, deal_value: dealValue, tier }) });
  },
};

// ── Break-Even Client ──

export const breakEvenClient = {
  async calculate(params: {
    fixed_costs_monthly: number;
    current_customers: number;
    avg_revenue_per_customer: number;
    variable_cost_per_customer: number;
    monthly_growth_rate: number;
    monthly_churn_rate: number;
  }): Promise<BreakEvenResult | null> {
    return apiFetch<BreakEvenResult>('/breakeven/calculate', { method: 'POST', body: JSON.stringify(params) });
  },

  async getDashboard(): Promise<FinancialDashboard | null> {
    return apiFetch<FinancialDashboard>('/breakeven/dashboard');
  },
};

// ══════════════════════════════════════════════════════
// 4. REACT HOOKS
// ══════════════════════════════════════════════════════

export function usePricingPlans() {
  const [plans, setPlans] = useState<PricingPlan[]>(Object.values(LOCAL_PLANS));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pricingClient.getPlans().then(p => { setPlans(p); setLoading(false); });
  }, []);

  return { plans, loading };
}

export function usePricingCalculator() {
  const [tier, setTier] = useState<PricingTier>('professional');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [usage, setUsage] = useState({ tasks: 1000, compute_hours: 20, storage_gb: 10, api_calls: 5000 });
  const [estimate, setEstimate] = useState<BillEstimate | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    const result = await pricingClient.calculateBill(tier, cycle, usage);
    setEstimate(result);
    setLoading(false);
  }, [tier, cycle, usage]);

  useEffect(() => { calculate(); }, [calculate]);

  return { tier, setTier, cycle, setCycle, usage, setUsage, estimate, loading };
}

export function useROICalculator() {
  const [params, setParams] = useState({
    current_headcount: 50,
    avg_salary: 60000,
    hours_per_week_on_repetitive_tasks: 10,
    ai_employees_planned: 5,
  });
  const [result, setResult] = useState<ROIResult | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    const roi = await salesClient.calculateROI(params);
    setResult(roi);
    setLoading(false);
  }, [params]);

  useEffect(() => { calculate(); }, [calculate]);

  return { params, setParams, result, loading };
}

export function useUnitEconomics(tier: PricingTier = 'professional') {
  const [economics, setEconomics] = useState<UnitEconomics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    economicsClient.getUnitEconomics(tier).then(e => { setEconomics(e); setLoading(false); });
  }, [tier]);

  return { economics, loading };
}

export function useExpansionOpportunities(orgId: string) {
  const [opportunities, setOpportunities] = useState<ExpansionOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const detect = useCallback(async () => {
    setLoading(true);
    const opps = await expansionClient.detect(orgId);
    setOpportunities(opps);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { detect(); }, [detect]);

  return { opportunities, loading, refresh: detect };
}

export function useFinancialDashboard() {
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    breakEvenClient.getDashboard().then(d => { setDashboard(d); setLoading(false); });
  }, []);

  return { dashboard, loading };
}

export function useSalesPipeline(orgId?: string) {
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await salesClient.getPipeline(orgId);
    setPipeline(data);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { pipeline, loading, refresh };
}

export function useBreakEvenAnalysis() {
  const [params, setParams] = useState({
    fixed_costs_monthly: 15000,
    current_customers: 20,
    avg_revenue_per_customer: 200,
    variable_cost_per_customer: 35,
    monthly_growth_rate: 0.15,
    monthly_churn_rate: 0.03,
  });
  const [result, setResult] = useState<BreakEvenResult | null>(null);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    setLoading(true);
    const data = await breakEvenClient.calculate(params);
    setResult(data);
    setLoading(false);
  }, [params]);

  useEffect(() => { calculate(); }, [calculate]);

  return { params, setParams, result, loading };
}
