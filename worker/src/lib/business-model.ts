/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Business Model Engine — Revenue, Pricing, Unit Economics & Growth
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. Pricing Engine — base subscription + usage-based (per-task & per-compute-hour)
 * 2. Unit Economics — cost per AI interaction (LLM + compute + storage) vs. revenue
 * 3. Expansion Playbook — land-and-expand, cross-sell, upsell, seat expansion
 * 4. Enterprise Sales — ROI calculator, case studies, security whitepaper metadata
 * 5. Partner Program — agency/consultant reseller tiers, commissions, deal registration
 * 6. Break-Even Analysis — margin analysis, path to profitability modeling
 */

import type { Env } from '../index';

// ══════════════════════════════════════════════════════
// 1. TYPES & INTERFACES
// ══════════════════════════════════════════════════════

export type PricingTier = 'starter' | 'professional' | 'enterprise' | 'custom';
export type BillingCycle = 'monthly' | 'annual';
export type UsageType = 'task' | 'compute_hour' | 'storage_gb' | 'api_call';
export type PartnerTier = 'registered' | 'silver' | 'gold' | 'platinum';
export type ExpansionType = 'upsell' | 'cross_sell' | 'seat_expansion' | 'usage_increase';
export type DealStage = 'prospect' | 'discovery' | 'demo' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type SalesMaterialType = 'roi_calculator' | 'case_study' | 'security_whitepaper' | 'comparison_sheet' | 'pitch_deck';

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

export interface CostStructure {
  llm_cost_per_1k_tokens_input: number;
  llm_cost_per_1k_tokens_output: number;
  avg_tokens_per_task_input: number;
  avg_tokens_per_task_output: number;
  compute_cost_per_hour: number;
  storage_cost_per_gb_month: number;
  bandwidth_cost_per_gb: number;
  infrastructure_fixed_monthly: number;
  support_cost_per_customer: number;
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

export interface ExpansionOpportunity {
  id: string;
  org_id: string;
  type: ExpansionType;
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

export interface PartnerProfile {
  id: string;
  name: string;
  tier: PartnerTier;
  commission_rate: number;
  deal_registration_discount: number;
  total_revenue_generated: number;
  active_customers_referred: number;
  certified_consultants: number;
  specializations: string[];
  joined_at: string;
}

export interface EnterpriseDeal {
  id: string;
  org_id: string;
  company_name: string;
  stage: DealStage;
  deal_value: number;
  annual_contract_value: number;
  employee_count: number;
  champion_name: string;
  champion_email: string;
  decision_makers: string[];
  next_step: string;
  close_date: string;
  materials_sent: SalesMaterialType[];
  created_at: string;
  updated_at: string;
}

export interface BreakEvenModel {
  fixed_costs_monthly: number;
  variable_cost_per_customer: number;
  avg_revenue_per_customer: number;
  contribution_margin: number;
  break_even_customers: number;
  current_customers: number;
  months_to_break_even: number;
  growth_rate_monthly: number;
  projected_profitability_date: string;
  scenarios: BreakEvenScenario[];
}

export interface BreakEvenScenario {
  name: string;
  growth_rate: number;
  churn_rate: number;
  avg_arpu: number;
  months_to_profit: number;
  year1_revenue: number;
  year1_costs: number;
  year1_net: number;
}

// ══════════════════════════════════════════════════════
// 2. PRICING ENGINE
// ══════════════════════════════════════════════════════

export const PRICING_PLANS: Record<PricingTier, PricingPlan> = {
  starter: {
    tier: 'starter',
    name: 'Starter',
    base_price_monthly: 49,
    base_price_annual: 470,  // ~20% discount
    included_employees: 3,
    included_tasks_per_month: 500,
    included_compute_hours: 10,
    included_storage_gb: 5,
    overage_per_task: 0.08,
    overage_per_compute_hour: 2.50,
    overage_per_storage_gb: 0.50,
    overage_per_api_call: 0.005,
    features: ['basic_ai_employees', 'email_support', 'standard_templates', 'basic_analytics'],
    max_employees: 5,
    sla_uptime: 99.5,
    support_level: 'email',
  },
  professional: {
    tier: 'professional',
    name: 'Professional',
    base_price_monthly: 149,
    base_price_annual: 1430, // ~20% discount
    included_employees: 10,
    included_tasks_per_month: 2000,
    included_compute_hours: 50,
    included_storage_gb: 25,
    overage_per_task: 0.06,
    overage_per_compute_hour: 2.00,
    overage_per_storage_gb: 0.40,
    overage_per_api_call: 0.004,
    features: ['advanced_ai_employees', 'priority_support', 'custom_templates', 'advanced_analytics', 'integrations', 'team_collaboration'],
    max_employees: 25,
    sla_uptime: 99.9,
    support_level: 'priority_email_chat',
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    base_price_monthly: 499,
    base_price_annual: 4790, // ~20% discount
    included_employees: 50,
    included_tasks_per_month: 10000,
    included_compute_hours: 200,
    included_storage_gb: 100,
    overage_per_task: 0.04,
    overage_per_compute_hour: 1.50,
    overage_per_storage_gb: 0.30,
    overage_per_api_call: 0.003,
    features: ['unlimited_ai_employees', 'dedicated_support', 'custom_models', 'enterprise_analytics', 'sso_saml', 'audit_logs', 'custom_integrations', 'sla_guarantee', 'dedicated_account_manager'],
    max_employees: 500,
    sla_uptime: 99.99,
    support_level: 'dedicated_account_manager',
  },
  custom: {
    tier: 'custom',
    name: 'Custom',
    base_price_monthly: 0, // negotiated
    base_price_annual: 0,
    included_employees: 0,
    included_tasks_per_month: 0,
    included_compute_hours: 0,
    included_storage_gb: 0,
    overage_per_task: 0,
    overage_per_compute_hour: 0,
    overage_per_storage_gb: 0,
    overage_per_api_call: 0,
    features: ['everything_in_enterprise', 'custom_deployment', 'on_premise_option', 'custom_sla', 'dedicated_infrastructure'],
    max_employees: -1,
    sla_uptime: 99.99,
    support_level: 'white_glove',
  },
};

export class PricingEngine {
  constructor(private env: Env) {}

  getPlan(tier: PricingTier): PricingPlan {
    return PRICING_PLANS[tier];
  }

  getAllPlans(): PricingPlan[] {
    return Object.values(PRICING_PLANS);
  }

  calculateMonthlyBill(tier: PricingTier, cycle: BillingCycle, usage: {
    tasks: number;
    compute_hours: number;
    storage_gb: number;
    api_calls: number;
  }): { base: number; overages: Record<string, number>; total: number; savings_vs_monthly: number } {
    const plan = PRICING_PLANS[tier];
    const base = cycle === 'annual' ? plan.base_price_annual / 12 : plan.base_price_monthly;

    const overages: Record<string, number> = {};
    const taskOverage = Math.max(0, usage.tasks - plan.included_tasks_per_month);
    const computeOverage = Math.max(0, usage.compute_hours - plan.included_compute_hours);
    const storageOverage = Math.max(0, usage.storage_gb - plan.included_storage_gb);
    const apiOverage = Math.max(0, usage.api_calls - (plan.included_tasks_per_month * 10));

    overages.tasks = taskOverage * plan.overage_per_task;
    overages.compute = computeOverage * plan.overage_per_compute_hour;
    overages.storage = storageOverage * plan.overage_per_storage_gb;
    overages.api_calls = apiOverage * plan.overage_per_api_call;

    const total = base + Object.values(overages).reduce((s, v) => s + v, 0);
    const monthlyCost = plan.base_price_monthly + Object.values(overages).reduce((s, v) => s + v, 0);
    const savings_vs_monthly = cycle === 'annual' ? monthlyCost - total : 0;

    return { base: Math.round(base * 100) / 100, overages, total: Math.round(total * 100) / 100, savings_vs_monthly: Math.round(savings_vs_monthly * 100) / 100 };
  }

  recommendPlan(usage: {
    employees_needed: number;
    estimated_tasks_per_month: number;
    needs_sso: boolean;
    needs_custom_models: boolean;
    team_size: number;
  }): { recommended: PricingTier; reason: string; estimated_monthly_cost: number; alternatives: { tier: PricingTier; cost: number; tradeoff: string }[] } {
    const tiers: PricingTier[] = ['starter', 'professional', 'enterprise'];
    let recommended: PricingTier = 'starter';
    let reason = '';

    if (usage.needs_sso || usage.needs_custom_models || usage.employees_needed > 25) {
      recommended = 'enterprise';
      reason = usage.needs_sso ? 'SSO/SAML is only available on Enterprise' :
               usage.needs_custom_models ? 'Custom models require Enterprise' :
               `${usage.employees_needed} employees exceeds Professional limit of 25`;
    } else if (usage.employees_needed > 5 || usage.estimated_tasks_per_month > 500 || usage.team_size > 5) {
      recommended = 'professional';
      reason = usage.employees_needed > 5 ? `${usage.employees_needed} employees exceeds Starter limit of 5` :
               usage.estimated_tasks_per_month > 500 ? 'Task volume is better served by Professional' :
               'Team collaboration features require Professional';
    } else {
      recommended = 'starter';
      reason = 'Usage fits within Starter plan limits';
    }

    const recPlan = PRICING_PLANS[recommended];
    const estCost = this.calculateMonthlyBill(recommended, 'monthly', {
      tasks: usage.estimated_tasks_per_month,
      compute_hours: usage.employees_needed * 5,
      storage_gb: usage.employees_needed * 2,
      api_calls: usage.estimated_tasks_per_month * 5,
    });

    const alternatives = tiers.filter(t => t !== recommended).map(t => {
      const alt = this.calculateMonthlyBill(t, 'monthly', {
        tasks: usage.estimated_tasks_per_month,
        compute_hours: usage.employees_needed * 5,
        storage_gb: usage.employees_needed * 2,
        api_calls: usage.estimated_tasks_per_month * 5,
      });
      const plan = PRICING_PLANS[t];
      const tradeoff = t === 'starter' ? `Limited to ${plan.max_employees} employees, ${plan.included_tasks_per_month} tasks` :
                       t === 'enterprise' ? 'Higher base cost but better overages and SLA' :
                       `Up to ${plan.max_employees} employees with priority support`;
      return { tier: t, cost: alt.total, tradeoff };
    });

    return { recommended, reason, estimated_monthly_cost: estCost.total, alternatives };
  }
}

// ══════════════════════════════════════════════════════
// 3. UNIT ECONOMICS ENGINE
// ══════════════════════════════════════════════════════

export const DEFAULT_COST_STRUCTURE: CostStructure = {
  llm_cost_per_1k_tokens_input: 0.003,     // Claude Sonnet-tier pricing
  llm_cost_per_1k_tokens_output: 0.015,
  avg_tokens_per_task_input: 1500,
  avg_tokens_per_task_output: 800,
  compute_cost_per_hour: 0.50,              // Cloudflare Workers compute
  storage_cost_per_gb_month: 0.023,         // R2/D1 storage
  bandwidth_cost_per_gb: 0.00,              // Cloudflare free egress
  infrastructure_fixed_monthly: 2500,       // DNS, monitoring, CI/CD, etc.
  support_cost_per_customer: 15,            // Blended support cost
};

export class UnitEconomicsEngine {
  private costs: CostStructure;

  constructor(private env: Env, costs?: Partial<CostStructure>) {
    this.costs = { ...DEFAULT_COST_STRUCTURE, ...costs };
  }

  calculateCostPerTask(): number {
    const inputCost = (this.costs.avg_tokens_per_task_input / 1000) * this.costs.llm_cost_per_1k_tokens_input;
    const outputCost = (this.costs.avg_tokens_per_task_output / 1000) * this.costs.llm_cost_per_1k_tokens_output;
    const computeCost = 0.002; // ~7 seconds of compute per task at $0.50/hr
    return Math.round((inputCost + outputCost + computeCost) * 10000) / 10000;
  }

  calculateCostPerEmployee(avgTasksPerMonth: number = 150): number {
    const taskCosts = this.calculateCostPerTask() * avgTasksPerMonth;
    const storageCost = 0.5 * this.costs.storage_cost_per_gb_month; // ~0.5 GB per employee
    return Math.round((taskCosts + storageCost) * 100) / 100;
  }

  calculateUnitEconomics(tier: PricingTier, avgTasksPerMonth: number = 150, avgEmployees: number = 5): UnitEconomics {
    const plan = PRICING_PLANS[tier];
    const costPerTask = this.calculateCostPerTask();
    const revenuePerTask = plan.base_price_monthly / Math.max(avgTasksPerMonth * avgEmployees, 1);
    const grossMarginPerTask = revenuePerTask - costPerTask;

    const costPerEmployeeMonth = this.calculateCostPerEmployee(avgTasksPerMonth);
    const revenuePerEmployeeMonth = plan.base_price_monthly / Math.max(avgEmployees, 1);
    const grossMarginPerEmployee = revenuePerEmployeeMonth - costPerEmployeeMonth;

    const totalRevenue = plan.base_price_monthly;
    const totalCost = costPerEmployeeMonth * avgEmployees + this.costs.support_cost_per_customer;
    const blendedGrossMarginPct = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    const avgLifetimeMonths = 24;
    const ltv = totalRevenue * avgLifetimeMonths;
    const cac = tier === 'starter' ? 150 : tier === 'professional' ? 500 : 2500;
    const ltvCacRatio = cac > 0 ? ltv / cac : 0;
    const paybackMonths = totalRevenue > 0 ? Math.ceil(cac / (totalRevenue - totalCost)) : 0;

    return {
      cost_per_task: costPerTask,
      revenue_per_task: Math.round(revenuePerTask * 10000) / 10000,
      gross_margin_per_task: Math.round(grossMarginPerTask * 10000) / 10000,
      cost_per_employee_month: costPerEmployeeMonth,
      revenue_per_employee_month: Math.round(revenuePerEmployeeMonth * 100) / 100,
      gross_margin_per_employee: Math.round(grossMarginPerEmployee * 100) / 100,
      blended_gross_margin_pct: Math.round(blendedGrossMarginPct * 10) / 10,
      ltv: Math.round(ltv),
      cac,
      ltv_cac_ratio: Math.round(ltvCacRatio * 10) / 10,
      payback_months: paybackMonths,
      avg_tasks_per_employee_month: avgTasksPerMonth,
    };
  }

  async getMarginAnalysis(orgId: string): Promise<{
    org_id: string;
    tier: PricingTier;
    monthly_revenue: number;
    monthly_cost: number;
    gross_margin: number;
    gross_margin_pct: number;
    cost_breakdown: Record<string, number>;
    optimization_suggestions: string[];
  }> {
    // Fetch org usage from D1
    const usageResult = await this.env.DB.prepare(
      `SELECT COUNT(*) as task_count, SUM(compute_seconds) as total_compute
       FROM usage_records WHERE org_id = ? AND period_start >= datetime('now', '-30 days')`
    ).bind(orgId).first<{ task_count: number; total_compute: number }>();

    const taskCount = usageResult?.task_count || 0;
    const computeHours = (usageResult?.total_compute || 0) / 3600;

    const subResult = await this.env.DB.prepare(
      `SELECT plan_id, base_amount FROM subscriptions WHERE org_id = ? AND status = 'active' LIMIT 1`
    ).bind(orgId).first<{ plan_id: string; base_amount: number }>();

    const tier = (subResult?.plan_id as PricingTier) || 'starter';
    const monthlyRevenue = subResult?.base_amount || PRICING_PLANS[tier].base_price_monthly;

    const llmCost = taskCount * this.calculateCostPerTask();
    const computeCost = computeHours * this.costs.compute_cost_per_hour;
    const storageCost = 5 * this.costs.storage_cost_per_gb_month;
    const supportCost = this.costs.support_cost_per_customer;
    const totalCost = llmCost + computeCost + storageCost + supportCost;

    const grossMargin = monthlyRevenue - totalCost;
    const grossMarginPct = monthlyRevenue > 0 ? (grossMargin / monthlyRevenue) * 100 : 0;

    const suggestions: string[] = [];
    if (grossMarginPct < 50) suggestions.push('Consider prompt optimization to reduce token usage');
    if (grossMarginPct < 30) suggestions.push('Review plan pricing — costs exceed healthy margin threshold');
    if (taskCount > PRICING_PLANS[tier].included_tasks_per_month * 1.5) suggestions.push('High usage customer — consider upsell to next tier');
    if (computeHours > PRICING_PLANS[tier].included_compute_hours * 2) suggestions.push('Compute-heavy customer — add compute overage charges');

    return {
      org_id: orgId,
      tier,
      monthly_revenue: Math.round(monthlyRevenue * 100) / 100,
      monthly_cost: Math.round(totalCost * 100) / 100,
      gross_margin: Math.round(grossMargin * 100) / 100,
      gross_margin_pct: Math.round(grossMarginPct * 10) / 10,
      cost_breakdown: {
        llm_api: Math.round(llmCost * 100) / 100,
        compute: Math.round(computeCost * 100) / 100,
        storage: Math.round(storageCost * 100) / 100,
        support: supportCost,
      },
      optimization_suggestions: suggestions,
    };
  }
}

// ══════════════════════════════════════════════════════
// 4. EXPANSION PLAYBOOK
// ══════════════════════════════════════════════════════

export class ExpansionEngine {
  constructor(private env: Env) {}

  async detectOpportunities(orgId: string): Promise<ExpansionOpportunity[]> {
    const opportunities: ExpansionOpportunity[] = [];
    const now = new Date().toISOString();

    // Check current subscription
    const sub = await this.env.DB.prepare(
      `SELECT plan_id, base_amount FROM subscriptions WHERE org_id = ? AND status = 'active' LIMIT 1`
    ).bind(orgId).first<{ plan_id: string; base_amount: number }>();

    const currentTier = (sub?.plan_id as PricingTier) || 'starter';
    const currentMrr = sub?.base_amount || PRICING_PLANS[currentTier].base_price_monthly;

    // Check employee count vs plan limit
    const empCount = await this.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM employees WHERE org_id = ?`
    ).bind(orgId).first<{ cnt: number }>();

    const plan = PRICING_PLANS[currentTier];
    const employeeUtilization = (empCount?.cnt || 0) / plan.max_employees;

    if (employeeUtilization > 0.8 && currentTier !== 'enterprise') {
      const nextTier: PricingTier = currentTier === 'starter' ? 'professional' : 'enterprise';
      const nextPlan = PRICING_PLANS[nextTier];
      opportunities.push({
        id: `exp-seat-${orgId}-${Date.now()}`,
        org_id: orgId,
        type: 'seat_expansion',
        current_plan: currentTier,
        recommended_plan: nextTier,
        current_mrr: currentMrr,
        projected_mrr: nextPlan.base_price_monthly,
        expansion_mrr: nextPlan.base_price_monthly - currentMrr,
        trigger_reason: `Using ${Math.round(employeeUtilization * 100)}% of employee capacity (${empCount?.cnt}/${plan.max_employees})`,
        confidence_score: Math.min(0.95, employeeUtilization),
        suggested_action: `Propose upgrade to ${nextPlan.name} — ${nextPlan.max_employees} employees, better overages`,
        created_at: now,
      });
    }

    // Check task usage vs included
    const taskUsage = await this.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM usage_records WHERE org_id = ? AND period_start >= datetime('now', '-30 days')`
    ).bind(orgId).first<{ cnt: number }>();

    const taskUtilization = (taskUsage?.cnt || 0) / plan.included_tasks_per_month;

    if (taskUtilization > 1.2 && currentTier !== 'enterprise') {
      const nextTier: PricingTier = currentTier === 'starter' ? 'professional' : 'enterprise';
      const nextPlan = PRICING_PLANS[nextTier];
      const overageSavings = ((taskUsage?.cnt || 0) - plan.included_tasks_per_month) * plan.overage_per_task;
      opportunities.push({
        id: `exp-usage-${orgId}-${Date.now()}`,
        org_id: orgId,
        type: 'usage_increase',
        current_plan: currentTier,
        recommended_plan: nextTier,
        current_mrr: currentMrr + overageSavings,
        projected_mrr: nextPlan.base_price_monthly,
        expansion_mrr: nextPlan.base_price_monthly - currentMrr,
        trigger_reason: `Task usage ${taskUsage?.cnt || 0} exceeds included ${plan.included_tasks_per_month} by ${Math.round((taskUtilization - 1) * 100)}%`,
        confidence_score: Math.min(0.9, taskUtilization - 0.2),
        suggested_action: `Upgrading saves ~$${overageSavings.toFixed(2)}/mo in overage charges`,
        created_at: now,
      });
    }

    // Cross-sell: check if they're missing key features
    if (currentTier === 'starter' || currentTier === 'professional') {
      const hasIntegrations = await this.env.DB.prepare(
        `SELECT COUNT(*) as cnt FROM integrations WHERE org_id = ?`
      ).bind(orgId).first<{ cnt: number }>();

      if ((hasIntegrations?.cnt || 0) === 0 && currentTier === 'starter') {
        opportunities.push({
          id: `exp-cross-${orgId}-${Date.now()}`,
          org_id: orgId,
          type: 'cross_sell',
          current_plan: currentTier,
          recommended_plan: 'professional',
          current_mrr: currentMrr,
          projected_mrr: PRICING_PLANS.professional.base_price_monthly,
          expansion_mrr: PRICING_PLANS.professional.base_price_monthly - currentMrr,
          trigger_reason: 'No integrations configured — Professional includes CRM, email, and calendar integrations',
          confidence_score: 0.6,
          suggested_action: 'Offer integration setup assistance with Professional trial',
          created_at: now,
        });
      }
    }

    // Persist opportunities
    for (const opp of opportunities) {
      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO expansion_opportunities (id, org_id, type, current_plan, recommended_plan,
         current_mrr, projected_mrr, expansion_mrr, trigger_reason, confidence_score, suggested_action, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(opp.id, opp.org_id, opp.type, opp.current_plan, opp.recommended_plan,
        opp.current_mrr, opp.projected_mrr, opp.expansion_mrr, opp.trigger_reason,
        opp.confidence_score, opp.suggested_action, opp.created_at).run();
    }

    return opportunities;
  }

  async getPlaybook(currentTier: PricingTier): Promise<{
    stage: string;
    goals: string[];
    actions: string[];
    metrics: string[];
    timeline: string;
  }[]> {
    type PlaybookStage = { stage: string; goals: string[]; actions: string[]; metrics: string[]; timeline: string };
    const playbooks: Record<PricingTier, PlaybookStage[]> = {
      starter: [
        {
          stage: 'Onboarding (Week 1-2)',
          goals: ['Activate first AI employee', 'Complete 10 tasks', 'Invite 1 team member'],
          actions: ['Guided setup wizard', 'Template gallery showcase', 'Daily tips email sequence'],
          metrics: ['Time to first task', 'Tasks completed in first week', 'Feature adoption rate'],
          timeline: '14 days',
        },
        {
          stage: 'Adoption (Week 3-8)',
          goals: ['3+ active AI employees', '50+ tasks/week', '3+ team members'],
          actions: ['Usage milestone celebrations', 'Feature discovery prompts', 'ROI snapshot email'],
          metrics: ['Weekly active users', 'Tasks per employee', 'Feature breadth score'],
          timeline: '6 weeks',
        },
        {
          stage: 'Expansion Trigger (Month 3+)',
          goals: ['Hit 80% of plan limits', 'Request advanced features', 'Need integrations'],
          actions: ['Proactive upgrade outreach', 'Professional plan trial offer', 'Integration demo'],
          metrics: ['Plan utilization %', 'Feature request frequency', 'Overage spend'],
          timeline: '1-3 months',
        },
      ],
      professional: [
        {
          stage: 'Team Rollout (Week 1-4)',
          goals: ['Configure integrations', '5+ team members active', 'Set up workflows'],
          actions: ['Integration setup calls', 'Team onboarding webinar', 'Custom template creation'],
          metrics: ['Integration count', 'Team adoption rate', 'Workflow automation rate'],
          timeline: '4 weeks',
        },
        {
          stage: 'Departmental Expansion (Month 2-6)',
          goals: ['10+ employees across departments', 'Cross-team workflows', 'Manager analytics adoption'],
          actions: ['Department head demos', 'Cross-functional workflow templates', 'Analytics training'],
          metrics: ['Department penetration', 'Cross-team task flow', 'Analytics engagement'],
          timeline: '5 months',
        },
        {
          stage: 'Enterprise Trigger (Month 6+)',
          goals: ['SSO/compliance needs', '20+ employees', 'Custom model requests'],
          actions: ['Security review assistance', 'Enterprise trial activation', 'Executive sponsor meeting'],
          metrics: ['Compliance feature requests', 'Employee growth rate', 'Enterprise feature interest'],
          timeline: '3-6 months',
        },
      ],
      enterprise: [
        {
          stage: 'Strategic Deployment (Month 1-3)',
          goals: ['SSO configured', 'Custom models trained', 'Org-wide rollout plan'],
          actions: ['Dedicated onboarding manager', 'Custom model workshop', 'Executive alignment call'],
          metrics: ['SSO adoption rate', 'Custom model accuracy', 'Exec NPS'],
          timeline: '3 months',
        },
        {
          stage: 'Value Realization (Month 4-12)',
          goals: ['50%+ org adoption', 'Measurable ROI demonstrated', 'Renewal secured'],
          actions: ['Quarterly business reviews', 'ROI dashboard', 'Success story development'],
          metrics: ['Org adoption %', 'Hours saved per employee', 'Customer health score'],
          timeline: '9 months',
        },
      ],
      custom: [],
    };

    const result = playbooks[currentTier] || playbooks.starter;
    return result;
  }
}

// ══════════════════════════════════════════════════════
// 5. ENTERPRISE SALES ENGINE
// ══════════════════════════════════════════════════════

export class EnterpriseSalesEngine {
  constructor(private env: Env) {}

  calculateROI(params: {
    current_headcount: number;
    avg_salary: number;
    hours_per_week_on_repetitive_tasks: number;
    ai_employees_planned: number;
  }): {
    annual_labor_cost_saved: number;
    nexushr_annual_cost: number;
    net_savings: number;
    roi_percentage: number;
    payback_days: number;
    productivity_gain_pct: number;
    equivalent_fte_freed: number;
  } {
    const hoursPerYear = params.hours_per_week_on_repetitive_tasks * 52;
    const hourlyRate = params.avg_salary / 2080; // 40hr * 52 weeks
    const automationRate = 0.65; // Conservative: 65% of repetitive tasks automated

    const hoursSaved = hoursPerYear * automationRate * params.current_headcount;
    const annualLaborSaved = hoursSaved * hourlyRate;

    // Estimate plan tier based on employee count
    const tier: PricingTier = params.ai_employees_planned <= 5 ? 'starter' :
                               params.ai_employees_planned <= 25 ? 'professional' : 'enterprise';
    const plan = PRICING_PLANS[tier];
    const nexushrAnnualCost = plan.base_price_annual || plan.base_price_monthly * 12;

    const netSavings = annualLaborSaved - nexushrAnnualCost;
    const roiPercentage = nexushrAnnualCost > 0 ? (netSavings / nexushrAnnualCost) * 100 : 0;
    const paybackDays = annualLaborSaved > 0 ? Math.ceil((nexushrAnnualCost / annualLaborSaved) * 365) : 0;
    const productivityGain = (hoursSaved / (params.current_headcount * 2080)) * 100;
    const equivalentFte = hoursSaved / 2080;

    return {
      annual_labor_cost_saved: Math.round(annualLaborSaved),
      nexushr_annual_cost: nexushrAnnualCost,
      net_savings: Math.round(netSavings),
      roi_percentage: Math.round(roiPercentage),
      payback_days: paybackDays,
      productivity_gain_pct: Math.round(productivityGain * 10) / 10,
      equivalent_fte_freed: Math.round(equivalentFte * 10) / 10,
    };
  }

  getSalesMaterials(): { type: SalesMaterialType; title: string; description: string; audience: string; stage: DealStage[] }[] {
    return [
      {
        type: 'roi_calculator',
        title: 'NexusHR ROI Calculator',
        description: 'Interactive calculator showing labor savings, productivity gains, and payback period based on customer-specific inputs',
        audience: 'CFO, VP Operations, Department Heads',
        stage: ['discovery', 'demo', 'proposal'],
      },
      {
        type: 'case_study',
        title: 'Customer Success Stories',
        description: 'Real-world examples of companies using NexusHR AI employees to automate HR, support, and operations tasks',
        audience: 'All stakeholders',
        stage: ['discovery', 'demo', 'proposal', 'negotiation'],
      },
      {
        type: 'security_whitepaper',
        title: 'NexusHR Security & Compliance Whitepaper',
        description: 'Detailed security architecture: E2E encryption, SOC 2, GDPR compliance, data residency, audit logging',
        audience: 'CISO, IT Security, Legal/Compliance',
        stage: ['demo', 'proposal', 'negotiation'],
      },
      {
        type: 'comparison_sheet',
        title: 'NexusHR vs. Alternatives Comparison',
        description: 'Feature-by-feature comparison against manual processes, traditional automation, and competing AI platforms',
        audience: 'Evaluators, Technical Decision Makers',
        stage: ['discovery', 'demo'],
      },
      {
        type: 'pitch_deck',
        title: 'NexusHR Enterprise Pitch Deck',
        description: 'Executive-ready presentation covering vision, capabilities, security, pricing, and implementation timeline',
        audience: 'C-Suite, VP-level decision makers',
        stage: ['discovery', 'demo'],
      },
    ];
  }

  async trackDeal(deal: Omit<EnterpriseDeal, 'id' | 'created_at' | 'updated_at'>): Promise<EnterpriseDeal> {
    const id = `deal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const full: EnterpriseDeal = { ...deal, id, created_at: now, updated_at: now };

    await this.env.DB.prepare(
      `INSERT INTO enterprise_deals (id, org_id, company_name, stage, deal_value, annual_contract_value,
       employee_count, champion_name, champion_email, decision_makers, next_step, close_date,
       materials_sent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, full.org_id, full.company_name, full.stage, full.deal_value, full.annual_contract_value,
      full.employee_count, full.champion_name, full.champion_email, JSON.stringify(full.decision_makers),
      full.next_step, full.close_date, JSON.stringify(full.materials_sent), now, now).run();

    return full;
  }

  async updateDealStage(dealId: string, stage: DealStage, nextStep: string): Promise<void> {
    await this.env.DB.prepare(
      `UPDATE enterprise_deals SET stage = ?, next_step = ?, updated_at = ? WHERE id = ?`
    ).bind(stage, nextStep, new Date().toISOString(), dealId).run();
  }

  async getPipeline(orgId?: string): Promise<{ stages: Record<DealStage, { count: number; total_value: number }>; deals: EnterpriseDeal[] }> {
    const query = orgId
      ? `SELECT * FROM enterprise_deals WHERE org_id = ? ORDER BY updated_at DESC`
      : `SELECT * FROM enterprise_deals ORDER BY updated_at DESC`;

    const result = orgId
      ? await this.env.DB.prepare(query).bind(orgId).all()
      : await this.env.DB.prepare(query).all();

    const deals = (result.results || []).map((r: any) => ({
      ...r,
      decision_makers: JSON.parse(r.decision_makers || '[]'),
      materials_sent: JSON.parse(r.materials_sent || '[]'),
    })) as EnterpriseDeal[];

    const stages: Record<string, { count: number; total_value: number }> = {};
    const allStages: DealStage[] = ['prospect', 'discovery', 'demo', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    for (const s of allStages) stages[s] = { count: 0, total_value: 0 };
    for (const d of deals) {
      stages[d.stage].count++;
      stages[d.stage].total_value += d.deal_value;
    }

    return { stages: stages as Record<DealStage, { count: number; total_value: number }>, deals };
  }

  getDemoFlow(): { step: number; title: string; duration_min: number; description: string; talking_points: string[] }[] {
    return [
      { step: 1, title: 'Opening & Discovery', duration_min: 10, description: 'Understand customer pain points and current workflow',
        talking_points: ['What tasks consume most of your team\'s time?', 'How many people work on repetitive/operational tasks?', 'What tools are you currently using?'] },
      { step: 2, title: 'Platform Overview', duration_min: 5, description: 'High-level walkthrough of NexusHR capabilities',
        talking_points: ['AI employees that work like real team members', 'Natural language task assignment', 'Enterprise security and compliance'] },
      { step: 3, title: 'Live Demo', duration_min: 15, description: 'Hands-on demonstration tailored to their use case',
        talking_points: ['Create an AI employee for their top use case', 'Show natural conversation and task execution', 'Demonstrate integrations relevant to their stack'] },
      { step: 4, title: 'ROI & Pricing', duration_min: 10, description: 'Walk through ROI calculator with their numbers',
        talking_points: ['Input their headcount, salary, and task volume', 'Show projected savings and payback period', 'Present recommended plan and pricing'] },
      { step: 5, title: 'Security & Compliance', duration_min: 5, description: 'Address security concerns proactively',
        talking_points: ['E2E encryption, SOC 2, GDPR', 'Data residency options', 'SSO/SAML integration'] },
      { step: 6, title: 'Next Steps', duration_min: 5, description: 'Define clear path forward',
        talking_points: ['Offer pilot program (14-day enterprise trial)', 'Identify decision makers for follow-up', 'Schedule technical deep-dive if needed'] },
    ];
  }
}

// ══════════════════════════════════════════════════════
// 6. PARTNER PROGRAM
// ══════════════════════════════════════════════════════

export const PARTNER_TIERS: Record<PartnerTier, {
  name: string;
  commission_rate: number;
  deal_registration_discount: number;
  requirements: { min_revenue: number; min_customers: number; min_certified: number };
  benefits: string[];
}> = {
  registered: {
    name: 'Registered Partner',
    commission_rate: 0.10,
    deal_registration_discount: 0.05,
    requirements: { min_revenue: 0, min_customers: 0, min_certified: 0 },
    benefits: ['Partner portal access', 'Sales collateral library', 'Deal registration', 'Basic training'],
  },
  silver: {
    name: 'Silver Partner',
    commission_rate: 0.15,
    deal_registration_discount: 0.08,
    requirements: { min_revenue: 10000, min_customers: 3, min_certified: 1 },
    benefits: ['Everything in Registered', 'Co-marketing funds ($500/quarter)', 'Priority support', 'Quarterly business review'],
  },
  gold: {
    name: 'Gold Partner',
    commission_rate: 0.20,
    deal_registration_discount: 0.10,
    requirements: { min_revenue: 50000, min_customers: 10, min_certified: 3 },
    benefits: ['Everything in Silver', 'Co-marketing funds ($2000/quarter)', 'Named partner manager', 'Joint case studies', 'Early access to features'],
  },
  platinum: {
    name: 'Platinum Partner',
    commission_rate: 0.25,
    deal_registration_discount: 0.15,
    requirements: { min_revenue: 200000, min_customers: 25, min_certified: 5 },
    benefits: ['Everything in Gold', 'Co-marketing funds ($5000/quarter)', 'Executive sponsor', 'Custom integrations', 'Revenue share on renewals', 'Partner advisory council seat'],
  },
};

export class PartnerEngine {
  constructor(private env: Env) {}

  async registerPartner(partner: Omit<PartnerProfile, 'id' | 'tier' | 'commission_rate' | 'deal_registration_discount' | 'total_revenue_generated' | 'active_customers_referred' | 'joined_at'>): Promise<PartnerProfile> {
    const id = `partner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tier: PartnerTier = 'registered';
    const tierConfig = PARTNER_TIERS[tier];
    const now = new Date().toISOString();

    const full: PartnerProfile = {
      ...partner,
      id,
      tier,
      commission_rate: tierConfig.commission_rate,
      deal_registration_discount: tierConfig.deal_registration_discount,
      total_revenue_generated: 0,
      active_customers_referred: 0,
      joined_at: now,
    };

    await this.env.DB.prepare(
      `INSERT INTO partners (id, name, tier, commission_rate, deal_registration_discount,
       total_revenue_generated, active_customers_referred, certified_consultants,
       specializations, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, full.name, full.tier, full.commission_rate, full.deal_registration_discount,
      0, 0, full.certified_consultants, JSON.stringify(full.specializations), now).run();

    return full;
  }

  async evaluateTierUpgrade(partnerId: string): Promise<{ current_tier: PartnerTier; eligible_tier: PartnerTier | null; gaps: string[] }> {
    const partner = await this.env.DB.prepare(
      `SELECT * FROM partners WHERE id = ?`
    ).bind(partnerId).first<any>();

    if (!partner) throw new Error('Partner not found');

    const currentTier = partner.tier as PartnerTier;
    const tiers: PartnerTier[] = ['registered', 'silver', 'gold', 'platinum'];
    const currentIdx = tiers.indexOf(currentTier);

    if (currentIdx >= tiers.length - 1) {
      return { current_tier: currentTier, eligible_tier: null, gaps: ['Already at highest tier'] };
    }

    const nextTier = tiers[currentIdx + 1];
    const reqs = PARTNER_TIERS[nextTier].requirements;
    const gaps: string[] = [];

    if (partner.total_revenue_generated < reqs.min_revenue) {
      gaps.push(`Revenue: $${partner.total_revenue_generated} / $${reqs.min_revenue} required`);
    }
    if (partner.active_customers_referred < reqs.min_customers) {
      gaps.push(`Customers: ${partner.active_customers_referred} / ${reqs.min_customers} required`);
    }
    if (partner.certified_consultants < reqs.min_certified) {
      gaps.push(`Certified consultants: ${partner.certified_consultants} / ${reqs.min_certified} required`);
    }

    return {
      current_tier: currentTier,
      eligible_tier: gaps.length === 0 ? nextTier : null,
      gaps,
    };
  }

  calculateCommission(partnerId: string, dealValue: number, tier: PartnerTier): {
    commission: number;
    rate: number;
    deal_registration_bonus: number;
    total_payout: number;
  } {
    const tierConfig = PARTNER_TIERS[tier];
    const commission = dealValue * tierConfig.commission_rate;
    const dealRegBonus = dealValue * tierConfig.deal_registration_discount * 0.5; // half of deal reg discount

    return {
      commission: Math.round(commission * 100) / 100,
      rate: tierConfig.commission_rate,
      deal_registration_bonus: Math.round(dealRegBonus * 100) / 100,
      total_payout: Math.round((commission + dealRegBonus) * 100) / 100,
    };
  }
}

// ══════════════════════════════════════════════════════
// 7. BREAK-EVEN ANALYSIS
// ══════════════════════════════════════════════════════

export class BreakEvenEngine {
  constructor(private env: Env) {}

  calculateBreakEven(params: {
    fixed_costs_monthly: number;
    current_customers: number;
    avg_revenue_per_customer: number;
    variable_cost_per_customer: number;
    monthly_growth_rate: number;
    monthly_churn_rate: number;
  }): BreakEvenModel {
    const contributionMargin = params.avg_revenue_per_customer - params.variable_cost_per_customer;
    const breakEvenCustomers = contributionMargin > 0 ? Math.ceil(params.fixed_costs_monthly / contributionMargin) : Infinity;

    // Project months to break-even
    let customers = params.current_customers;
    let monthsToBreakEven = 0;
    const maxMonths = 60;

    while (customers < breakEvenCustomers && monthsToBreakEven < maxMonths) {
      const newCustomers = Math.floor(customers * params.monthly_growth_rate);
      const churnedCustomers = Math.floor(customers * params.monthly_churn_rate);
      customers = customers + newCustomers - churnedCustomers;
      monthsToBreakEven++;
    }

    const profitDate = new Date();
    profitDate.setMonth(profitDate.getMonth() + monthsToBreakEven);

    // Model 3 scenarios
    const scenarios: BreakEvenScenario[] = [
      this.modelScenario('Conservative', params.monthly_growth_rate * 0.5, params.monthly_churn_rate * 1.5, params.avg_revenue_per_customer * 0.9, params),
      this.modelScenario('Base Case', params.monthly_growth_rate, params.monthly_churn_rate, params.avg_revenue_per_customer, params),
      this.modelScenario('Optimistic', params.monthly_growth_rate * 1.5, params.monthly_churn_rate * 0.5, params.avg_revenue_per_customer * 1.2, params),
    ];

    return {
      fixed_costs_monthly: params.fixed_costs_monthly,
      variable_cost_per_customer: params.variable_cost_per_customer,
      avg_revenue_per_customer: params.avg_revenue_per_customer,
      contribution_margin: Math.round(contributionMargin * 100) / 100,
      break_even_customers: breakEvenCustomers,
      current_customers: params.current_customers,
      months_to_break_even: monthsToBreakEven,
      growth_rate_monthly: params.monthly_growth_rate,
      projected_profitability_date: profitDate.toISOString().split('T')[0],
      scenarios,
    };
  }

  private modelScenario(
    name: string,
    growthRate: number,
    churnRate: number,
    arpu: number,
    base: { fixed_costs_monthly: number; current_customers: number; variable_cost_per_customer: number }
  ): BreakEvenScenario {
    let customers = base.current_customers;
    let year1Revenue = 0;
    let year1Costs = 0;
    let monthsToProfit = 0;
    let foundProfit = false;

    for (let m = 1; m <= 12; m++) {
      const newCustomers = Math.floor(customers * growthRate);
      const churned = Math.floor(customers * churnRate);
      customers = customers + newCustomers - churned;

      const monthRevenue = customers * arpu;
      const monthCost = base.fixed_costs_monthly + (customers * base.variable_cost_per_customer);

      year1Revenue += monthRevenue;
      year1Costs += monthCost;

      if (!foundProfit && monthRevenue >= monthCost) {
        monthsToProfit = m;
        foundProfit = true;
      }
    }

    if (!foundProfit) monthsToProfit = -1; // Not profitable within 12 months

    return {
      name,
      growth_rate: growthRate,
      churn_rate: churnRate,
      avg_arpu: arpu,
      months_to_profit: monthsToProfit,
      year1_revenue: Math.round(year1Revenue),
      year1_costs: Math.round(year1Costs),
      year1_net: Math.round(year1Revenue - year1Costs),
    };
  }

  async getFinancialDashboard(): Promise<{
    mrr: number;
    arr: number;
    total_customers: number;
    avg_arpu: number;
    gross_margin_pct: number;
    net_revenue_retention: number;
    ltv_cac_ratio: number;
    runway_months: number;
  }> {
    const subs = await this.env.DB.prepare(
      `SELECT COUNT(*) as cnt, SUM(base_amount) as total_mrr FROM subscriptions WHERE status = 'active'`
    ).first<{ cnt: number; total_mrr: number }>();

    const totalCustomers = subs?.cnt || 0;
    const mrr = subs?.total_mrr || 0;
    const arr = mrr * 12;
    const avgArpu = totalCustomers > 0 ? mrr / totalCustomers : 0;

    // Estimate margins from unit economics
    const economics = new UnitEconomicsEngine(this.env);
    const costPerCustomer = economics.calculateCostPerEmployee(150) * 5 + DEFAULT_COST_STRUCTURE.support_cost_per_customer;
    const totalCost = costPerCustomer * totalCustomers + DEFAULT_COST_STRUCTURE.infrastructure_fixed_monthly;
    const grossMarginPct = mrr > 0 ? ((mrr - totalCost) / mrr) * 100 : 0;

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(arr),
      total_customers: totalCustomers,
      avg_arpu: Math.round(avgArpu * 100) / 100,
      gross_margin_pct: Math.round(grossMarginPct * 10) / 10,
      net_revenue_retention: 115, // target benchmark
      ltv_cac_ratio: 3.5,        // target benchmark
      runway_months: 18,          // placeholder
    };
  }
}

// ══════════════════════════════════════════════════════
// 8. D1 SCHEMA
// ══════════════════════════════════════════════════════

export const BUSINESS_MODEL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS expansion_opportunities (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    type TEXT NOT NULL,
    current_plan TEXT NOT NULL,
    recommended_plan TEXT NOT NULL,
    current_mrr REAL DEFAULT 0,
    projected_mrr REAL DEFAULT 0,
    expansion_mrr REAL DEFAULT 0,
    trigger_reason TEXT,
    confidence_score REAL DEFAULT 0,
    suggested_action TEXT,
    status TEXT DEFAULT 'open',
    created_at TEXT NOT NULL,
    actioned_at TEXT
  );

  CREATE TABLE IF NOT EXISTS enterprise_deals (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'prospect',
    deal_value REAL DEFAULT 0,
    annual_contract_value REAL DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    champion_name TEXT,
    champion_email TEXT,
    decision_makers TEXT DEFAULT '[]',
    next_step TEXT,
    close_date TEXT,
    materials_sent TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'registered',
    commission_rate REAL DEFAULT 0.10,
    deal_registration_discount REAL DEFAULT 0.05,
    total_revenue_generated REAL DEFAULT 0,
    active_customers_referred INTEGER DEFAULT 0,
    certified_consultants INTEGER DEFAULT 0,
    specializations TEXT DEFAULT '[]',
    joined_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS partner_deals (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL REFERENCES partners(id),
    deal_id TEXT REFERENCES enterprise_deals(id),
    customer_org_id TEXT,
    deal_value REAL DEFAULT 0,
    commission_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    paid_at TEXT
  );

  CREATE TABLE IF NOT EXISTS revenue_events (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'usd',
    description TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_expansion_org ON expansion_opportunities(org_id);
  CREATE INDEX IF NOT EXISTS idx_expansion_status ON expansion_opportunities(status);
  CREATE INDEX IF NOT EXISTS idx_deals_stage ON enterprise_deals(stage);
  CREATE INDEX IF NOT EXISTS idx_deals_org ON enterprise_deals(org_id);
  CREATE INDEX IF NOT EXISTS idx_partner_deals ON partner_deals(partner_id);
  CREATE INDEX IF NOT EXISTS idx_revenue_org ON revenue_events(org_id);
  CREATE INDEX IF NOT EXISTS idx_revenue_type ON revenue_events(event_type);
`;

// ══════════════════════════════════════════════════════
// 9. ROUTE HANDLER
// ══════════════════════════════════════════════════════

export async function handleBusinessModel(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const subPath = path.replace('/api/business/', '');

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    // ── Pricing ──
    if (subPath === 'pricing/plans' && method === 'GET') {
      const engine = new PricingEngine(env);
      return json({ plans: engine.getAllPlans() });
    }

    if (subPath === 'pricing/calculate' && method === 'POST') {
      const body = await request.json() as any;
      const engine = new PricingEngine(env);
      const result = engine.calculateMonthlyBill(body.tier, body.cycle || 'monthly', body.usage);
      return json(result);
    }

    if (subPath === 'pricing/recommend' && method === 'POST') {
      const body = await request.json() as any;
      const engine = new PricingEngine(env);
      const result = engine.recommendPlan(body);
      return json(result);
    }

    // ── Unit Economics ──
    if (subPath === 'economics/unit' && method === 'GET') {
      const tier = (url.searchParams.get('tier') as PricingTier) || 'professional';
      const tasks = parseInt(url.searchParams.get('tasks') || '150');
      const employees = parseInt(url.searchParams.get('employees') || '5');
      const engine = new UnitEconomicsEngine(env);
      return json(engine.calculateUnitEconomics(tier, tasks, employees));
    }

    if (subPath === 'economics/costs' && method === 'GET') {
      return json({ cost_structure: DEFAULT_COST_STRUCTURE });
    }

    if (subPath.startsWith('economics/margin/') && method === 'GET') {
      const orgId = subPath.replace('economics/margin/', '');
      const engine = new UnitEconomicsEngine(env);
      const result = await engine.getMarginAnalysis(orgId);
      return json(result);
    }

    // ── Expansion ──
    if (subPath.startsWith('expansion/detect/') && method === 'POST') {
      const orgId = subPath.replace('expansion/detect/', '');
      const engine = new ExpansionEngine(env);
      const opportunities = await engine.detectOpportunities(orgId);
      return json({ opportunities });
    }

    if (subPath.startsWith('expansion/playbook/') && method === 'GET') {
      const tier = subPath.replace('expansion/playbook/', '') as PricingTier;
      const engine = new ExpansionEngine(env);
      const playbook = await engine.getPlaybook(tier);
      return json({ playbook });
    }

    // ── Enterprise Sales ──
    if (subPath === 'sales/roi' && method === 'POST') {
      const body = await request.json() as any;
      const engine = new EnterpriseSalesEngine(env);
      const result = engine.calculateROI(body);
      return json(result);
    }

    if (subPath === 'sales/materials' && method === 'GET') {
      const engine = new EnterpriseSalesEngine(env);
      return json({ materials: engine.getSalesMaterials() });
    }

    if (subPath === 'sales/demo-flow' && method === 'GET') {
      const engine = new EnterpriseSalesEngine(env);
      return json({ demo_flow: engine.getDemoFlow() });
    }

    if (subPath === 'sales/deals' && method === 'POST') {
      const body = await request.json() as any;
      const engine = new EnterpriseSalesEngine(env);
      const deal = await engine.trackDeal(body);
      return json(deal, 201);
    }

    if (subPath.startsWith('sales/deals/') && subPath.endsWith('/stage') && method === 'PATCH') {
      const dealId = subPath.replace('sales/deals/', '').replace('/stage', '');
      const body = await request.json() as any;
      const engine = new EnterpriseSalesEngine(env);
      await engine.updateDealStage(dealId, body.stage, body.next_step);
      return json({ success: true });
    }

    if (subPath === 'sales/pipeline' && method === 'GET') {
      const orgId = url.searchParams.get('org_id') || undefined;
      const engine = new EnterpriseSalesEngine(env);
      const pipeline = await engine.getPipeline(orgId);
      return json(pipeline);
    }

    // ── Partner Program ──
    if (subPath === 'partners/tiers' && method === 'GET') {
      return json({ tiers: PARTNER_TIERS });
    }

    if (subPath === 'partners/register' && method === 'POST') {
      const body = await request.json() as any;
      const engine = new PartnerEngine(env);
      const partner = await engine.registerPartner(body);
      return json(partner, 201);
    }

    if (subPath.startsWith('partners/') && subPath.endsWith('/evaluate') && method === 'GET') {
      const partnerId = subPath.replace('partners/', '').replace('/evaluate', '');
      const engine = new PartnerEngine(env);
      const result = await engine.evaluateTierUpgrade(partnerId);
      return json(result);
    }

    if (subPath === 'partners/commission' && method === 'POST') {
      const body = await request.json() as any;
      const engine = new PartnerEngine(env);
      const result = engine.calculateCommission(body.partner_id, body.deal_value, body.tier);
      return json(result);
    }

    // ── Break-Even ──
    if (subPath === 'breakeven/calculate' && method === 'POST') {
      const body = await request.json() as any;
      const engine = new BreakEvenEngine(env);
      const result = engine.calculateBreakEven(body);
      return json(result);
    }

    if (subPath === 'breakeven/dashboard' && method === 'GET') {
      const engine = new BreakEvenEngine(env);
      const dashboard = await engine.getFinancialDashboard();
      return json(dashboard);
    }

    return json({ error: 'Not Found', code: 'BUSINESS_MODEL_NOT_FOUND' }, 404);
  } catch (err: any) {
    return json({ error: err.message, code: 'BUSINESS_MODEL_ERROR' }, 500);
  }
}
