/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Billing Client — Frontend billing management with local fallback
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. Worker-backed billing API when connected
 * 2. Local billing state in localStorage when offline
 * 3. Plan catalog with currency conversion
 * 4. Usage tracking and limit checks
 * 5. Invoice history and payment method management
 */

import { isWorkerConnected } from './worker-api';

// ══════════════════════════════════════════════════════
// Types (mirror Worker billing types)
// ══════════════════════════════════════════════════════

export type BillingInterval = 'monthly' | 'annual';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused' | 'incomplete';
export type PaymentMethodType = 'card' | 'us_bank_account' | 'sepa_debit';
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
export type Currency = 'usd' | 'eur' | 'gbp' | 'cad' | 'aud' | 'jpy';

export interface PlanConfig {
  id: string;
  slug: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  annualDiscount: number;
  maxEmployees: number;
  maxTasksPerMonth: number;
  maxComputeHours: number;
  overagePerTask: number;
  overagePerMinute: number;
  features: string[];
}

export interface CustomerBilling {
  id: string;
  userId: string;
  stripeCustomerId?: string;
  planId: string;
  interval: BillingInterval;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  currency: Currency;
  paymentMethods: PaymentMethod[];
  defaultPaymentMethodId?: string;
  taxId?: string;
  billingEmail?: string;
  billingAddress?: BillingAddress;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  last4: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  bankName?: string;
  isDefault: boolean;
  stripePaymentMethodId?: string;
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Invoice {
  id: string;
  userId: string;
  stripeInvoiceId?: string;
  number: string;
  status: InvoiceStatus;
  currency: Currency;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  periodStart: string;
  periodEnd: string;
  lineItems: InvoiceLineItem[];
  paidAt?: string;
  dueDate?: string;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  createdAt: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  type: 'subscription' | 'metered' | 'one_time' | 'credit' | 'proration';
}

export interface UsageMeter {
  userId: string;
  periodStart: string;
  periodEnd: string;
  tasksUsed: number;
  computeMinutesUsed: number;
  employeesActive: number;
  apiCallsMade: number;
  llmTokensUsed: number;
  storageUsedMb: number;
  lastUpdated: string;
}

export interface UsageLimits {
  tasksUsed: number;
  tasksLimit: number;
  tasksRemaining: number;
  computeMinutesUsed: number;
  computeMinutesLimit: number;
  computeMinutesRemaining: number;
  employeesActive: number;
  employeesLimit: number;
  employeesRemaining: number;
  overageEstimate: number;
}

export interface BillingDashboard {
  profile: CustomerBilling;
  plan: PlanConfig;
  usage: UsageMeter;
  limits: UsageLimits;
  currentInvoice?: Invoice;
  recentInvoices: Invoice[];
  dunningStatus?: { hasPastDue: boolean; nextRetry?: string; attemptCount: number };
  monthlySpend: number;
  projectedSpend: number;
}

// ══════════════════════════════════════════════════════
// Plan Catalog (local copy for offline display)
// ══════════════════════════════════════════════════════

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: 'plan_starter',
    slug: 'starter',
    name: 'Starter',
    monthlyPrice: 4900,
    annualPrice: 47040,
    annualDiscount: 20,
    maxEmployees: 3,
    maxTasksPerMonth: 10000,
    maxComputeHours: 25,
    overagePerTask: 1,
    overagePerMinute: 2,
    features: ['Up to 3 AI Employees', '10,000 tasks/month', '25h compute', 'Standard response time', 'Email support', 'Basic analytics'],
  },
  {
    id: 'plan_growth',
    slug: 'growth',
    name: 'Growth',
    monthlyPrice: 19900,
    annualPrice: 191040,
    annualDiscount: 20,
    maxEmployees: 15,
    maxTasksPerMonth: 100000,
    maxComputeHours: 166,
    overagePerTask: 0.5,
    overagePerMinute: 1,
    features: ['Up to 15 AI Employees', '100K tasks/month', '166h compute', 'Priority response', 'Slack support', 'Advanced analytics', 'Custom config', 'API access'],
  },
  {
    id: 'plan_enterprise',
    slug: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 59900,
    annualPrice: 575040,
    annualDiscount: 20,
    maxEmployees: 999,
    maxTasksPerMonth: 0,
    maxComputeHours: 0,
    overagePerTask: 0,
    overagePerMinute: 0,
    features: ['Unlimited AI Employees', 'Unlimited tasks', 'Unlimited compute', 'Fastest response', 'Dedicated CSM', 'Custom AI training', 'SSO & SLA', 'Priority API'],
  },
];

export const CURRENCY_CONFIG: Record<Currency, { symbol: string; name: string; decimalPlaces: number; exchangeRate: number }> = {
  usd: { symbol: '$', name: 'US Dollar', decimalPlaces: 2, exchangeRate: 1 },
  eur: { symbol: '€', name: 'Euro', decimalPlaces: 2, exchangeRate: 0.92 },
  gbp: { symbol: '£', name: 'British Pound', decimalPlaces: 2, exchangeRate: 0.79 },
  cad: { symbol: 'C$', name: 'Canadian Dollar', decimalPlaces: 2, exchangeRate: 1.36 },
  aud: { symbol: 'A$', name: 'Australian Dollar', decimalPlaces: 2, exchangeRate: 1.53 },
  jpy: { symbol: '¥', name: 'Japanese Yen', decimalPlaces: 0, exchangeRate: 149 },
};

export function convertCurrency(amountCentsUSD: number, toCurrency: Currency): number {
  const rate = CURRENCY_CONFIG[toCurrency].exchangeRate;
  return Math.round(amountCentsUSD * rate);
}

export function formatCurrency(amountCents: number, currency: Currency = 'usd'): string {
  const config = CURRENCY_CONFIG[currency];
  const amount = amountCents / Math.pow(10, config.decimalPlaces);
  return `${config.symbol}${amount.toFixed(config.decimalPlaces)}`;
}

export function getPlanConfig(slug: string): PlanConfig | undefined {
  return PLAN_CONFIGS.find(p => p.slug === slug || p.id === slug);
}

// ══════════════════════════════════════════════════════
// Local Storage Fallback
// ══════════════════════════════════════════════════════

const LOCAL_BILLING_KEY = 'nexushr_billing_profile';
const LOCAL_INVOICES_KEY = 'nexushr_invoices';
const LOCAL_USAGE_KEY = 'nexushr_usage';

function getLocalProfile(): CustomerBilling | null {
  try {
    const raw = localStorage.getItem(LOCAL_BILLING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLocalProfile(profile: CustomerBilling): void {
  localStorage.setItem(LOCAL_BILLING_KEY, JSON.stringify(profile));
}

function getLocalInvoices(): Invoice[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_INVOICES_KEY) || '[]'); } catch { return []; }
}

function saveLocalInvoices(invoices: Invoice[]): void {
  localStorage.setItem(LOCAL_INVOICES_KEY, JSON.stringify(invoices.slice(-50)));
}

function getLocalUsage(): UsageMeter {
  try {
    const raw = localStorage.getItem(LOCAL_USAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fallthrough */ }
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  return {
    userId: 'local',
    periodStart,
    periodEnd,
    tasksUsed: 0,
    computeMinutesUsed: 0,
    employeesActive: 0,
    apiCallsMade: 0,
    llmTokensUsed: 0,
    storageUsedMb: 0,
    lastUpdated: now.toISOString(),
  };
}

function saveLocalUsage(usage: UsageMeter): void {
  localStorage.setItem(LOCAL_USAGE_KEY, JSON.stringify(usage));
}

function generateLocalId(prefix: string): string {
  return `${prefix}_local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ══════════════════════════════════════════════════════
// Worker API fetch helper
// ══════════════════════════════════════════════════════

async function billingFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

// ══════════════════════════════════════════════════════
// Billing Client API
// ══════════════════════════════════════════════════════

export const BillingClient = {

  // ── Schema init ──
  async initSchema(): Promise<void> {
    if (!isWorkerConnected()) return;
    await billingFetch('/api/billing/init', { method: 'POST' });
  },

  // ── Plans ──
  async getPlans(currency: Currency = 'usd'): Promise<PlanConfig[]> {
    if (isWorkerConnected()) {
      const res = await billingFetch(`/api/billing/plans?currency=${currency}`);
      if (res.success) return res.data.plans;
    }
    // Local fallback — return plans with currency conversion
    if (currency === 'usd') return PLAN_CONFIGS;
    return PLAN_CONFIGS.map(p => ({
      ...p,
      monthlyPrice: convertCurrency(p.monthlyPrice, currency),
      annualPrice: convertCurrency(p.annualPrice, currency),
      overagePerTask: convertCurrency(p.overagePerTask, currency),
      overagePerMinute: convertCurrency(p.overagePerMinute, currency),
    }));
  },

  // ── Billing Profile ──
  async getProfile(): Promise<CustomerBilling | null> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/profile');
      if (res.success) return res.data.profile;
    }
    return getLocalProfile();
  },

  async createProfile(params: {
    planId: string;
    interval?: BillingInterval;
    currency?: Currency;
    billingEmail?: string;
  }): Promise<CustomerBilling> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/profile', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.success) return res.data.profile;
    }

    // Local fallback
    const plan = getPlanConfig(params.planId) || PLAN_CONFIGS[0];
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + (params.interval === 'annual' ? 12 : 1));
    const profile: CustomerBilling = {
      id: generateLocalId('billing'),
      userId: 'local',
      planId: plan.id,
      interval: params.interval || 'monthly',
      status: 'trialing',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      currency: params.currency || 'usd',
      paymentMethods: [],
      billingEmail: params.billingEmail,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    saveLocalProfile(profile);
    return profile;
  },

  async updateProfile(params: Partial<{
    billingEmail: string;
    currency: Currency;
    taxId: string;
    billingAddress: BillingAddress;
  }>): Promise<CustomerBilling> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/profile', {
        method: 'PUT',
        body: JSON.stringify(params),
      });
      if (res.success) return res.data.profile;
    }

    const profile = getLocalProfile();
    if (!profile) throw new Error('No billing profile found');
    Object.assign(profile, params, { updatedAt: new Date().toISOString() });
    saveLocalProfile(profile);
    return profile;
  },

  // ── Subscriptions ──
  async subscribe(params: {
    planId: string;
    interval?: BillingInterval;
    paymentMethodId?: string;
  }): Promise<{ profile: CustomerBilling; clientSecret?: string }> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.success) return res.data;
    }

    // Local fallback — simulate subscription
    const profile = getLocalProfile() || await this.createProfile({ planId: params.planId, interval: params.interval });
    profile.planId = params.planId;
    profile.status = 'active';
    profile.interval = params.interval || 'monthly';
    profile.updatedAt = new Date().toISOString();
    saveLocalProfile(profile);

    // Generate a local invoice
    const plan = getPlanConfig(params.planId) || PLAN_CONFIGS[0];
    const price = params.interval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
    const invoice: Invoice = {
      id: generateLocalId('inv'),
      userId: 'local',
      number: `INV-${Date.now().toString(36).toUpperCase()}`,
      status: 'paid',
      currency: profile.currency,
      subtotal: price,
      tax: 0,
      total: price,
      amountPaid: price,
      amountDue: 0,
      periodStart: profile.currentPeriodStart,
      periodEnd: profile.currentPeriodEnd,
      lineItems: [{
        description: `${plan.name} Plan (${params.interval || 'monthly'})`,
        quantity: 1,
        unitAmount: price,
        amount: price,
        type: 'subscription',
      }],
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    const invoices = getLocalInvoices();
    invoices.push(invoice);
    saveLocalInvoices(invoices);

    return { profile };
  },

  async changePlan(params: {
    newPlanId: string;
    immediate?: boolean;
  }): Promise<{ profile: CustomerBilling; proration?: any }> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/change-plan', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.success) return res.data;
    }

    const profile = getLocalProfile();
    if (!profile) throw new Error('No billing profile found');
    const oldPlanId = profile.planId;
    profile.planId = params.newPlanId;
    profile.updatedAt = new Date().toISOString();
    saveLocalProfile(profile);
    return {
      profile,
      proration: { oldPlanId, newPlanId: params.newPlanId, applied: params.immediate ?? true },
    };
  },

  async previewPlanChange(newPlanId: string): Promise<{
    credit: number;
    charge: number;
    netAmount: number;
    effectiveDate: string;
    description: string;
  }> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/preview-change', {
        method: 'POST',
        body: JSON.stringify({ newPlanId }),
      });
      if (res.success) return res.data;
    }

    // Local estimation
    const profile = getLocalProfile();
    if (!profile) throw new Error('No billing profile found');
    const oldPlan = getPlanConfig(profile.planId);
    const newPlan = getPlanConfig(newPlanId);
    if (!oldPlan || !newPlan) throw new Error('Invalid plan');

    const now = new Date();
    const periodEnd = new Date(profile.currentPeriodEnd);
    const periodStart = new Date(profile.currentPeriodStart);
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000);
    const remaining = Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000);
    const fraction = remaining / totalDays;

    const oldPrice = profile.interval === 'annual' ? oldPlan.annualPrice / 12 : oldPlan.monthlyPrice;
    const newPrice = profile.interval === 'annual' ? newPlan.annualPrice / 12 : newPlan.monthlyPrice;

    const credit = Math.round(oldPrice * fraction);
    const charge = Math.round(newPrice * fraction);
    const net = charge - credit;

    return {
      credit,
      charge,
      netAmount: net,
      effectiveDate: now.toISOString(),
      description: net > 0
        ? `Upgrade from ${oldPlan.name} to ${newPlan.name}: ${formatCurrency(net, profile.currency)} charge`
        : `Downgrade from ${oldPlan.name} to ${newPlan.name}: ${formatCurrency(Math.abs(net), profile.currency)} credit`,
    };
  },

  async cancelSubscription(params?: { immediate?: boolean }): Promise<CustomerBilling> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/cancel', {
        method: 'POST',
        body: JSON.stringify(params || {}),
      });
      if (res.success) return res.data.profile;
    }

    const profile = getLocalProfile();
    if (!profile) throw new Error('No billing profile found');
    if (params?.immediate) {
      profile.status = 'canceled';
    } else {
      profile.cancelAtPeriodEnd = true;
    }
    profile.updatedAt = new Date().toISOString();
    saveLocalProfile(profile);
    return profile;
  },

  async reactivateSubscription(): Promise<CustomerBilling> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/reactivate', { method: 'POST' });
      if (res.success) return res.data.profile;
    }

    const profile = getLocalProfile();
    if (!profile) throw new Error('No billing profile found');
    profile.cancelAtPeriodEnd = false;
    profile.status = 'active';
    profile.updatedAt = new Date().toISOString();
    saveLocalProfile(profile);
    return profile;
  },

  async switchInterval(newInterval: BillingInterval): Promise<CustomerBilling> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/switch-interval', {
        method: 'POST',
        body: JSON.stringify({ interval: newInterval }),
      });
      if (res.success) return res.data.profile;
    }

    const profile = getLocalProfile();
    if (!profile) throw new Error('No billing profile found');
    profile.interval = newInterval;
    profile.updatedAt = new Date().toISOString();
    saveLocalProfile(profile);
    return profile;
  },

  // ── Payment Methods ──
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/payment-methods');
      if (res.success) return res.data.paymentMethods;
    }
    return getLocalProfile()?.paymentMethods || [];
  },

  async addPaymentMethod(params: {
    type: PaymentMethodType;
    last4: string;
    brand?: string;
    expMonth?: number;
    expYear?: number;
    bankName?: string;
    setDefault?: boolean;
  }): Promise<PaymentMethod> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/payment-methods', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.success) return res.data.paymentMethod;
    }

    // Local fallback
    const profile = getLocalProfile();
    if (!profile) throw new Error('No billing profile found');
    const pm: PaymentMethod = {
      id: generateLocalId('pm'),
      type: params.type,
      last4: params.last4,
      brand: params.brand,
      expMonth: params.expMonth,
      expYear: params.expYear,
      bankName: params.bankName,
      isDefault: params.setDefault || profile.paymentMethods.length === 0,
    };
    if (pm.isDefault) {
      profile.paymentMethods.forEach(p => p.isDefault = false);
      profile.defaultPaymentMethodId = pm.id;
    }
    profile.paymentMethods.push(pm);
    profile.updatedAt = new Date().toISOString();
    saveLocalProfile(profile);
    return pm;
  },

  async removePaymentMethod(paymentMethodId: string): Promise<void> {
    if (isWorkerConnected()) {
      await billingFetch(`/api/billing/payment-methods/${paymentMethodId}`, { method: 'DELETE' });
      return;
    }
    const profile = getLocalProfile();
    if (!profile) return;
    profile.paymentMethods = profile.paymentMethods.filter(pm => pm.id !== paymentMethodId);
    saveLocalProfile(profile);
  },

  // ── Invoices ──
  async getInvoices(limit = 20): Promise<Invoice[]> {
    if (isWorkerConnected()) {
      const res = await billingFetch(`/api/billing/invoices?limit=${limit}`);
      if (res.success) return res.data.invoices;
    }
    return getLocalInvoices().slice(-limit).reverse();
  },

  // ── Usage ──
  async getUsage(): Promise<UsageMeter> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/usage');
      if (res.success) return res.data.usage;
    }
    return getLocalUsage();
  },

  async recordUsage(params: {
    employeeId: string;
    type: 'task' | 'compute_minute' | 'api_call' | 'llm_tokens' | 'storage';
    quantity: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (isWorkerConnected()) {
      await billingFetch('/api/billing/usage', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      return;
    }

    // Local fallback — update meter
    const usage = getLocalUsage();
    switch (params.type) {
      case 'task': usage.tasksUsed += params.quantity; break;
      case 'compute_minute': usage.computeMinutesUsed += params.quantity; break;
      case 'api_call': usage.apiCallsMade += params.quantity; break;
      case 'llm_tokens': usage.llmTokensUsed += params.quantity; break;
      case 'storage': usage.storageUsedMb += params.quantity; break;
    }
    usage.lastUpdated = new Date().toISOString();
    saveLocalUsage(usage);
  },

  async getUsageLimits(): Promise<UsageLimits> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/usage/limits');
      if (res.success) return res.data;
    }

    // Local computation
    const profile = getLocalProfile();
    const plan = getPlanConfig(profile?.planId || 'starter') || PLAN_CONFIGS[0];
    const usage = getLocalUsage();

    const tasksLimit = plan.maxTasksPerMonth || Infinity;
    const computeLimit = (plan.maxComputeHours || Infinity) * 60;
    const empLimit = plan.maxEmployees;

    const tasksOver = Math.max(0, usage.tasksUsed - tasksLimit);
    const computeOver = Math.max(0, usage.computeMinutesUsed - computeLimit);
    const overageEstimate = (tasksOver * plan.overagePerTask) + (computeOver * plan.overagePerMinute);

    return {
      tasksUsed: usage.tasksUsed,
      tasksLimit: plan.maxTasksPerMonth,
      tasksRemaining: Math.max(0, tasksLimit - usage.tasksUsed),
      computeMinutesUsed: usage.computeMinutesUsed,
      computeMinutesLimit: (plan.maxComputeHours || 0) * 60,
      computeMinutesRemaining: Math.max(0, computeLimit - usage.computeMinutesUsed),
      employeesActive: usage.employeesActive,
      employeesLimit: empLimit,
      employeesRemaining: Math.max(0, empLimit - usage.employeesActive),
      overageEstimate: Math.round(overageEstimate),
    };
  },

  // ── Dunning ──
  async getDunningStatus(): Promise<{ hasPastDue: boolean; nextRetry?: string; attemptCount: number }> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/dunning/status');
      if (res.success) return res.data;
    }
    return { hasPastDue: false, attemptCount: 0 };
  },

  // ── Dashboard ──
  async getDashboard(): Promise<BillingDashboard | null> {
    if (isWorkerConnected()) {
      const res = await billingFetch('/api/billing/dashboard');
      if (res.success) return res.data;
    }

    // Local dashboard assembly
    const profile = getLocalProfile();
    if (!profile) return null;

    const plan = getPlanConfig(profile.planId) || PLAN_CONFIGS[0];
    const usage = getLocalUsage();
    const limits = await this.getUsageLimits();
    const invoices = getLocalInvoices();
    const price = profile.interval === 'annual' ? plan.annualPrice / 12 : plan.monthlyPrice;

    // Project monthly spend based on usage rate
    const now = new Date();
    const periodStart = new Date(profile.currentPeriodStart);
    const periodEnd = new Date(profile.currentPeriodEnd);
    const elapsed = now.getTime() - periodStart.getTime();
    const total = periodEnd.getTime() - periodStart.getTime();
    const fraction = elapsed / total;
    const projectedTasks = fraction > 0 ? usage.tasksUsed / fraction : 0;
    const projectedOverage = Math.max(0, projectedTasks - (plan.maxTasksPerMonth || Infinity)) * plan.overagePerTask;

    return {
      profile,
      plan,
      usage,
      limits,
      currentInvoice: invoices.filter(i => i.status === 'open')[0],
      recentInvoices: invoices.slice(-5).reverse(),
      dunningStatus: { hasPastDue: false, attemptCount: 0 },
      monthlySpend: convertCurrency(price, profile.currency),
      projectedSpend: convertCurrency(price + Math.round(projectedOverage), profile.currency),
    };
  },
};
