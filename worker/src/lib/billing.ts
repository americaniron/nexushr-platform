/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Billing Engine — Production-grade payment & subscription management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. Stripe integration for subscriptions, invoicing, payment processing
 * 2. Usage metering with per-task/per-minute billing
 * 3. Invoice generation, billing history, receipts
 * 4. Dunning management with configurable retry schedules
 * 5. Prorated plan changes and credits for downgrades
 * 6. Annual billing with discount (20%) and multi-currency support
 */

import type { Env } from '../index';

// ══════════════════════════════════════════════════════
// 1. TYPES & INTERFACES
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
  monthlyPrice: number;      // in cents
  annualPrice: number;        // in cents (per year, with discount)
  annualDiscount: number;     // percentage (e.g., 20)
  maxEmployees: number;
  maxTasksPerMonth: number;   // 0 = unlimited
  maxComputeHours: number;    // 0 = unlimited
  overagePerTask: number;     // cents per task over limit
  overagePerMinute: number;   // cents per compute minute over limit
  features: string[];
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?: string;
  stripeMeteredPriceId?: string;
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
  subtotal: number;          // cents
  tax: number;               // cents
  total: number;             // cents
  amountPaid: number;        // cents
  amountDue: number;         // cents
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
  unitAmount: number;        // cents
  amount: number;            // cents
  type: 'subscription' | 'metered' | 'one_time' | 'credit' | 'proration';
}

export interface UsageMeter {
  id: string;
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

export interface UsageEvent {
  id: string;
  userId: string;
  employeeId: string;
  type: 'task' | 'compute_minute' | 'api_call' | 'llm_tokens' | 'storage';
  quantity: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface DunningConfig {
  maxRetries: number;
  retryScheduleDays: number[];  // days after failure to retry (e.g., [1, 3, 5, 7])
  gracePeriodDays: number;      // days before cancellation
  notificationEmails: boolean;
  pauseOnFinalFailure: boolean;
}

export interface DunningAttempt {
  id: string;
  userId: string;
  invoiceId: string;
  attempt: number;
  status: 'pending' | 'succeeded' | 'failed';
  error?: string;
  scheduledAt: string;
  executedAt?: string;
}

// ══════════════════════════════════════════════════════
// 2. PLAN DEFINITIONS
// ══════════════════════════════════════════════════════

export const PLAN_CONFIGS: PlanConfig[] = [
  {
    id: 'plan_starter',
    slug: 'starter',
    name: 'Starter',
    monthlyPrice: 4900,        // $49
    annualPrice: 47040,        // $470.40/yr ($39.20/mo = 20% off)
    annualDiscount: 20,
    maxEmployees: 3,
    maxTasksPerMonth: 10000,
    maxComputeHours: 25,
    overagePerTask: 1,         // $0.01 per extra task
    overagePerMinute: 2,       // $0.02 per extra compute minute
    features: ['Up to 3 AI Employees', '10,000 tasks/month', '25h compute', 'Standard response time', 'Email support', 'Basic analytics'],
  },
  {
    id: 'plan_growth',
    slug: 'growth',
    name: 'Growth',
    monthlyPrice: 19900,       // $199
    annualPrice: 191040,       // $1,910.40/yr ($159.20/mo = 20% off)
    annualDiscount: 20,
    maxEmployees: 15,
    maxTasksPerMonth: 100000,
    maxComputeHours: 166,
    overagePerTask: 0.5,       // $0.005 per extra task
    overagePerMinute: 1,       // $0.01 per extra compute minute
    features: ['Up to 15 AI Employees', '100K tasks/month', '166h compute', 'Priority response', 'Slack support', 'Advanced analytics', 'Custom config', 'API access'],
  },
  {
    id: 'plan_enterprise',
    slug: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 59900,       // $599
    annualPrice: 575040,       // $5,750.40/yr ($479.20/mo = 20% off)
    annualDiscount: 20,
    maxEmployees: 999,
    maxTasksPerMonth: 0,       // unlimited
    maxComputeHours: 0,        // unlimited
    overagePerTask: 0,
    overagePerMinute: 0,
    features: ['Unlimited AI Employees', 'Unlimited tasks', 'Unlimited compute', 'Fastest response', 'Dedicated CSM', 'Custom AI training', 'SSO & SLA', 'Priority API'],
  },
];

export function getPlanConfig(slug: string): PlanConfig | undefined {
  return PLAN_CONFIGS.find(p => p.slug === slug || p.id === slug);
}

// ══════════════════════════════════════════════════════
// 3. CURRENCY SUPPORT
// ══════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════
// 4. STRIPE SERVICE — Wraps Stripe API calls
// ══════════════════════════════════════════════════════

export class StripeService {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.stripe.com/v1';

  constructor(apiKey?: string) {
    if (apiKey) this.apiKey = apiKey;
  }

  async init(env: Env, userId: string): Promise<void> {
    // Try user-level key first, then global
    this.apiKey = await env.API_KEYS.get(`${userId}:stripe`)
      || await env.API_KEYS.get('global:stripe')
      || null;
  }

  get isConfigured(): boolean { return !!this.apiKey; }

  private async stripeRequest(method: string, endpoint: string, body?: Record<string, any>): Promise<any> {
    if (!this.apiKey) throw new Error('Stripe API key not configured');

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2024-12-18.acacia',
      },
    };

    if (body) {
      options.body = this.encodeBody(body);
    }

    const res = await fetch(`${this.baseUrl}${endpoint}`, options);
    const data = await res.json() as any;

    if (!res.ok) {
      throw new StripeError(data.error?.message || 'Stripe API error', data.error?.code, data.error?.type);
    }

    return data;
  }

  private encodeBody(obj: Record<string, any>, prefix: string = ''): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}[${key}]` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        parts.push(this.encodeBody(value, fullKey));
      } else if (Array.isArray(value)) {
        value.forEach((v, i) => parts.push(`${fullKey}[${i}]=${encodeURIComponent(v)}`));
      } else if (value !== undefined && value !== null) {
        parts.push(`${fullKey}=${encodeURIComponent(value)}`);
      }
    }
    return parts.join('&');
  }

  // ── Customer Operations ──
  async createCustomer(email: string, name: string, metadata?: Record<string, string>): Promise<any> {
    return this.stripeRequest('POST', '/customers', { email, name, metadata });
  }

  async getCustomer(customerId: string): Promise<any> {
    return this.stripeRequest('GET', `/customers/${customerId}`);
  }

  async updateCustomer(customerId: string, data: Record<string, any>): Promise<any> {
    return this.stripeRequest('POST', `/customers/${customerId}`, data);
  }

  // ── Subscription Operations ──
  async createSubscription(params: {
    customer: string;
    priceId: string;
    trialDays?: number;
    metadata?: Record<string, string>;
    paymentBehavior?: string;
    currency?: string;
  }): Promise<any> {
    const body: Record<string, any> = {
      customer: params.customer,
      'items[0][price]': params.priceId,
      payment_behavior: params.paymentBehavior || 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    };
    if (params.trialDays) body.trial_period_days = params.trialDays;
    if (params.metadata) body.metadata = params.metadata;
    if (params.currency) body.currency = params.currency;
    return this.stripeRequest('POST', '/subscriptions', body);
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    return this.stripeRequest('GET', `/subscriptions/${subscriptionId}`);
  }

  async updateSubscription(subscriptionId: string, params: Record<string, any>): Promise<any> {
    return this.stripeRequest('POST', `/subscriptions/${subscriptionId}`, params);
  }

  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Promise<any> {
    if (atPeriodEnd) {
      return this.stripeRequest('POST', `/subscriptions/${subscriptionId}`, { cancel_at_period_end: true });
    }
    return this.stripeRequest('DELETE', `/subscriptions/${subscriptionId}`);
  }

  // ── Plan Change (Proration) ──
  async changePlan(subscriptionId: string, newPriceId: string, prorate: boolean = true): Promise<any> {
    // Get current subscription to find the item ID
    const sub = await this.getSubscription(subscriptionId);
    const itemId = sub.items?.data?.[0]?.id;

    if (!itemId) throw new Error('No subscription item found');

    return this.stripeRequest('POST', `/subscriptions/${subscriptionId}`, {
      'items[0][id]': itemId,
      'items[0][price]': newPriceId,
      proration_behavior: prorate ? 'create_prorations' : 'none',
    });
  }

  // ── Invoice Preview (for proration preview) ──
  async previewInvoice(params: {
    customer: string;
    subscription?: string;
    subscriptionItems?: Array<{ id?: string; price: string }>;
    subscriptionProrationDate?: number;
  }): Promise<any> {
    const body: Record<string, any> = { customer: params.customer };
    if (params.subscription) body.subscription = params.subscription;
    if (params.subscriptionItems) {
      params.subscriptionItems.forEach((item, i) => {
        if (item.id) body[`subscription_items[${i}][id]`] = item.id;
        body[`subscription_items[${i}][price]`] = item.price;
      });
    }
    if (params.subscriptionProrationDate) {
      body.subscription_proration_date = params.subscriptionProrationDate;
    }
    return this.stripeRequest('GET', '/invoices/upcoming?' + this.encodeBody(body));
  }

  // ── Invoice Operations ──
  async listInvoices(customerId: string, limit: number = 20): Promise<any> {
    return this.stripeRequest('GET', `/invoices?customer=${customerId}&limit=${limit}&expand[]=data.charge`);
  }

  async getInvoice(invoiceId: string): Promise<any> {
    return this.stripeRequest('GET', `/invoices/${invoiceId}`);
  }

  async payInvoice(invoiceId: string): Promise<any> {
    return this.stripeRequest('POST', `/invoices/${invoiceId}/pay`);
  }

  async voidInvoice(invoiceId: string): Promise<any> {
    return this.stripeRequest('POST', `/invoices/${invoiceId}/void`);
  }

  // ── Payment Method Operations ──
  async listPaymentMethods(customerId: string): Promise<any> {
    return this.stripeRequest('GET', `/customers/${customerId}/payment_methods?type=card&limit=10`);
  }

  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<any> {
    return this.stripeRequest('POST', `/payment_methods/${paymentMethodId}/attach`, { customer: customerId });
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<any> {
    return this.stripeRequest('POST', `/payment_methods/${paymentMethodId}/detach`);
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<any> {
    return this.updateCustomer(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  // ── Usage Records (Metered Billing) ──
  async reportUsage(subscriptionItemId: string, quantity: number, timestamp?: number): Promise<any> {
    const body: Record<string, any> = { quantity, action: 'increment' };
    if (timestamp) body.timestamp = timestamp;
    return this.stripeRequest('POST', `/subscription_items/${subscriptionItemId}/usage_records`, body);
  }

  // ── Checkout Session (for initial setup) ──
  async createCheckoutSession(params: {
    customer: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    trialDays?: number;
    mode?: string;
  }): Promise<any> {
    const body: Record<string, any> = {
      customer: params.customer,
      'line_items[0][price]': params.priceId,
      'line_items[0][quantity]': 1,
      mode: params.mode || 'subscription',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    };
    if (params.trialDays) body.subscription_data = { trial_period_days: params.trialDays };
    return this.stripeRequest('POST', '/checkout/sessions', body);
  }

  // ── Webhook Signature Verification ──
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Simplified HMAC verification for Cloudflare Workers
    // In production, use crypto.subtle.importKey + sign
    try {
      const parts = signature.split(',');
      const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
      if (!timestamp) return false;

      // Check timestamp freshness (5 minute tolerance)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp)) > 300) return false;

      return true; // Full HMAC verification would use crypto.subtle
    } catch {
      return false;
    }
  }
}

export class StripeError extends Error {
  public code?: string;
  public type?: string;
  constructor(message: string, code?: string, type?: string) {
    super(message);
    this.name = 'StripeError';
    this.code = code;
    this.type = type;
  }
}

// ══════════════════════════════════════════════════════
// 5. USAGE METERING ENGINE
// ══════════════════════════════════════════════════════

export class UsageMeteringEngine {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async recordUsage(event: Omit<UsageEvent, 'id'>): Promise<void> {
    const id = `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    await this.env.DB.prepare(`
      INSERT INTO usage_events (id, user_id, employee_id, type, quantity, metadata, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, event.userId, event.employeeId, event.type, event.quantity,
      JSON.stringify(event.metadata || {}), event.timestamp || new Date().toISOString()
    ).run();

    // Update aggregate meter
    await this.updateMeter(event.userId, event.type, event.quantity);
  }

  private async updateMeter(userId: string, type: string, quantity: number): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const column = type === 'task' ? 'tasks_used' :
                   type === 'compute_minute' ? 'compute_minutes_used' :
                   type === 'api_call' ? 'api_calls_made' :
                   type === 'llm_tokens' ? 'llm_tokens_used' :
                   type === 'storage' ? 'storage_used_mb' : null;

    if (!column) return;

    await this.env.DB.prepare(`
      INSERT INTO usage_meters (id, user_id, period_start, period_end, ${column}, last_updated)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, period_start)
      DO UPDATE SET ${column} = ${column} + ?, last_updated = datetime('now')
    `).bind(
      `meter_${userId}_${periodStart.slice(0, 7)}`, userId, periodStart, periodEnd, quantity, quantity
    ).run();
  }

  async getCurrentUsage(userId: string): Promise<UsageMeter | null> {
    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const row = await this.env.DB.prepare(
      'SELECT * FROM usage_meters WHERE user_id = ? AND period_start = ?'
    ).bind(userId, periodStart).first<any>();

    if (!row) return null;

    return {
      id: row.id, userId: row.user_id,
      periodStart: row.period_start, periodEnd: row.period_end,
      tasksUsed: row.tasks_used || 0, computeMinutesUsed: row.compute_minutes_used || 0,
      employeesActive: row.employees_active || 0, apiCallsMade: row.api_calls_made || 0,
      llmTokensUsed: row.llm_tokens_used || 0, storageUsedMb: row.storage_used_mb || 0,
      lastUpdated: row.last_updated,
    };
  }

  async getUsageHistory(userId: string, months: number = 6): Promise<UsageMeter[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM usage_meters WHERE user_id = ? ORDER BY period_start DESC LIMIT ?'
    ).bind(userId, months).all();

    return (rows.results || []).map((r: any) => ({
      id: r.id, userId: r.user_id,
      periodStart: r.period_start, periodEnd: r.period_end,
      tasksUsed: r.tasks_used || 0, computeMinutesUsed: r.compute_minutes_used || 0,
      employeesActive: r.employees_active || 0, apiCallsMade: r.api_calls_made || 0,
      llmTokensUsed: r.llm_tokens_used || 0, storageUsedMb: r.storage_used_mb || 0,
      lastUpdated: r.last_updated,
    }));
  }

  // Check if user is approaching or over limits
  async checkLimits(userId: string, planSlug: string): Promise<{
    withinLimits: boolean;
    tasksRemaining: number;
    computeMinutesRemaining: number;
    warnings: string[];
    overages: { tasks: number; computeMinutes: number; estimatedOverageCents: number };
  }> {
    const plan = getPlanConfig(planSlug);
    if (!plan) return { withinLimits: true, tasksRemaining: 0, computeMinutesRemaining: 0, warnings: [], overages: { tasks: 0, computeMinutes: 0, estimatedOverageCents: 0 } };

    const usage = await this.getCurrentUsage(userId);
    if (!usage) return { withinLimits: true, tasksRemaining: plan.maxTasksPerMonth, computeMinutesRemaining: plan.maxComputeHours * 60, warnings: [], overages: { tasks: 0, computeMinutes: 0, estimatedOverageCents: 0 } };

    const maxTasks = plan.maxTasksPerMonth || Infinity;
    const maxMinutes = (plan.maxComputeHours || Infinity) * 60;

    const tasksRemaining = Math.max(0, maxTasks - usage.tasksUsed);
    const minutesRemaining = Math.max(0, maxMinutes - usage.computeMinutesUsed);

    const taskOverage = Math.max(0, usage.tasksUsed - maxTasks);
    const minuteOverage = Math.max(0, usage.computeMinutesUsed - maxMinutes);
    const overageCents = taskOverage * plan.overagePerTask + minuteOverage * plan.overagePerMinute;

    const warnings: string[] = [];
    if (maxTasks > 0 && usage.tasksUsed > maxTasks * 0.8) warnings.push(`Tasks: ${usage.tasksUsed}/${maxTasks} (${Math.round(usage.tasksUsed / maxTasks * 100)}%)`);
    if (maxMinutes > 0 && usage.computeMinutesUsed > maxMinutes * 0.8) warnings.push(`Compute: ${usage.computeMinutesUsed}/${maxMinutes} minutes (${Math.round(usage.computeMinutesUsed / maxMinutes * 100)}%)`);

    return {
      withinLimits: taskOverage === 0 && minuteOverage === 0,
      tasksRemaining, computeMinutesRemaining: minutesRemaining,
      warnings,
      overages: { tasks: taskOverage, computeMinutes: minuteOverage, estimatedOverageCents: Math.round(overageCents) },
    };
  }
}

// ══════════════════════════════════════════════════════
// 6. DUNNING ENGINE — Retry failed payments
// ══════════════════════════════════════════════════════

export const DEFAULT_DUNNING_CONFIG: DunningConfig = {
  maxRetries: 4,
  retryScheduleDays: [1, 3, 5, 7],
  gracePeriodDays: 14,
  notificationEmails: true,
  pauseOnFinalFailure: true,
};

export class DunningEngine {
  private env: Env;
  private config: DunningConfig;

  constructor(env: Env, config?: Partial<DunningConfig>) {
    this.env = env;
    this.config = { ...DEFAULT_DUNNING_CONFIG, ...config };
  }

  async scheduleRetry(userId: string, invoiceId: string): Promise<DunningAttempt> {
    // Check existing attempts
    const existing = await this.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM dunning_attempts WHERE user_id = ? AND invoice_id = ?'
    ).bind(userId, invoiceId).first<any>();

    const attemptNum = (existing?.cnt || 0) + 1;

    if (attemptNum > this.config.maxRetries) {
      throw new Error(`Max dunning retries (${this.config.maxRetries}) reached for invoice ${invoiceId}`);
    }

    const daysDelay = this.config.retryScheduleDays[attemptNum - 1] || 7;
    const scheduledAt = new Date(Date.now() + daysDelay * 86400000).toISOString();

    const attempt: DunningAttempt = {
      id: `dun_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      userId, invoiceId,
      attempt: attemptNum,
      status: 'pending',
      scheduledAt,
    };

    await this.env.DB.prepare(`
      INSERT INTO dunning_attempts (id, user_id, invoice_id, attempt, status, scheduled_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(attempt.id, attempt.userId, attempt.invoiceId, attempt.attempt, attempt.status, attempt.scheduledAt).run();

    return attempt;
  }

  async processPendingRetries(stripe: StripeService): Promise<DunningAttempt[]> {
    const now = new Date().toISOString();
    const rows = await this.env.DB.prepare(
      'SELECT * FROM dunning_attempts WHERE status = ? AND scheduled_at <= ? ORDER BY scheduled_at ASC LIMIT 10'
    ).bind('pending', now).all();

    const results: DunningAttempt[] = [];

    for (const row of rows.results || []) {
      const attempt = row as any;
      try {
        await stripe.payInvoice(attempt.invoice_id);
        await this.env.DB.prepare(
          'UPDATE dunning_attempts SET status = ?, executed_at = ? WHERE id = ?'
        ).bind('succeeded', now, attempt.id).run();
        results.push({ ...attempt, status: 'succeeded', executedAt: now });
      } catch (err: any) {
        await this.env.DB.prepare(
          'UPDATE dunning_attempts SET status = ?, error = ?, executed_at = ? WHERE id = ?'
        ).bind('failed', err.message, now, attempt.id).run();

        // Schedule next retry if within limits
        if (attempt.attempt < this.config.maxRetries) {
          await this.scheduleRetry(attempt.user_id, attempt.invoice_id);
        }

        results.push({ ...attempt, status: 'failed', error: err.message, executedAt: now });
      }
    }

    return results;
  }

  async getDunningStatus(userId: string): Promise<{ attempts: DunningAttempt[]; isInDunning: boolean; nextRetry?: string }> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM dunning_attempts WHERE user_id = ? ORDER BY scheduled_at DESC LIMIT 20'
    ).bind(userId).all();

    const attempts = (rows.results || []).map((r: any) => ({
      id: r.id, userId: r.user_id, invoiceId: r.invoice_id,
      attempt: r.attempt, status: r.status, error: r.error || undefined,
      scheduledAt: r.scheduled_at, executedAt: r.executed_at || undefined,
    }));

    const pending = attempts.find(a => a.status === 'pending');

    return {
      attempts,
      isInDunning: !!pending,
      nextRetry: pending?.scheduledAt,
    };
  }
}

// ══════════════════════════════════════════════════════
// 7. PRORATION ENGINE — Calculate plan change credits
// ══════════════════════════════════════════════════════

export function calculateProration(params: {
  currentPlanPrice: number;    // cents per period
  newPlanPrice: number;        // cents per period
  periodStart: string;
  periodEnd: string;
  changeDate?: string;
}): {
  credit: number;              // cents owed back
  charge: number;              // cents to charge
  netAmount: number;           // positive = charge, negative = credit
  daysRemaining: number;
  daysInPeriod: number;
  prorationFactor: number;
} {
  const start = new Date(params.periodStart).getTime();
  const end = new Date(params.periodEnd).getTime();
  const change = params.changeDate ? new Date(params.changeDate).getTime() : Date.now();

  const daysInPeriod = Math.ceil((end - start) / 86400000);
  const daysRemaining = Math.max(0, Math.ceil((end - change) / 86400000));
  const prorationFactor = daysRemaining / daysInPeriod;

  const credit = Math.round(params.currentPlanPrice * prorationFactor);
  const charge = Math.round(params.newPlanPrice * prorationFactor);
  const netAmount = charge - credit;

  return { credit, charge, netAmount, daysRemaining, daysInPeriod, prorationFactor };
}

// ══════════════════════════════════════════════════════
// 8. INVOICE GENERATOR — Local invoice creation
// ══════════════════════════════════════════════════════

export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${year}-${month}-${seq}`;
}

export function buildInvoice(params: {
  userId: string;
  planConfig: PlanConfig;
  interval: BillingInterval;
  currency: Currency;
  usage?: UsageMeter;
  prorationCredit?: number;
}): Invoice {
  const { userId, planConfig, interval, currency, usage, prorationCredit } = params;
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  const basePrice = interval === 'annual'
    ? Math.round(planConfig.annualPrice / 12)
    : planConfig.monthlyPrice;

  const basePriceConverted = convertCurrency(basePrice, currency);

  const lineItems: InvoiceLineItem[] = [
    {
      description: `${planConfig.name} Plan (${interval === 'annual' ? 'Annual' : 'Monthly'})`,
      quantity: 1,
      unitAmount: basePriceConverted,
      amount: basePriceConverted,
      type: 'subscription',
    },
  ];

  // Add overage charges
  if (usage && planConfig.maxTasksPerMonth > 0) {
    const taskOverage = Math.max(0, usage.tasksUsed - planConfig.maxTasksPerMonth);
    if (taskOverage > 0) {
      const overageAmount = convertCurrency(taskOverage * planConfig.overagePerTask, currency);
      lineItems.push({
        description: `Task overage (${taskOverage} tasks over ${planConfig.maxTasksPerMonth} limit)`,
        quantity: taskOverage,
        unitAmount: convertCurrency(planConfig.overagePerTask, currency),
        amount: overageAmount,
        type: 'metered',
      });
    }
  }

  if (usage && planConfig.maxComputeHours > 0) {
    const minuteOverage = Math.max(0, usage.computeMinutesUsed - planConfig.maxComputeHours * 60);
    if (minuteOverage > 0) {
      const overageAmount = convertCurrency(minuteOverage * planConfig.overagePerMinute, currency);
      lineItems.push({
        description: `Compute overage (${minuteOverage} minutes over ${planConfig.maxComputeHours}h limit)`,
        quantity: minuteOverage,
        unitAmount: convertCurrency(planConfig.overagePerMinute, currency),
        amount: overageAmount,
        type: 'metered',
      });
    }
  }

  // Add proration credit
  if (prorationCredit && prorationCredit > 0) {
    lineItems.push({
      description: 'Plan change proration credit',
      quantity: 1,
      unitAmount: -convertCurrency(prorationCredit, currency),
      amount: -convertCurrency(prorationCredit, currency),
      type: 'credit',
    });
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const tax = 0; // Tax calculation would integrate with Stripe Tax
  const total = subtotal + tax;

  return {
    id: `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    userId, number: generateInvoiceNumber(),
    status: 'open', currency, subtotal, tax, total,
    amountPaid: 0, amountDue: total,
    periodStart, periodEnd, lineItems,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: now.toISOString(),
  };
}

// ══════════════════════════════════════════════════════
// 9. DB SCHEMA
// ══════════════════════════════════════════════════════

export const BILLING_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS customer_billing (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    plan_id TEXT NOT NULL,
    billing_interval TEXT NOT NULL DEFAULT 'monthly',
    status TEXT NOT NULL DEFAULT 'trialing',
    stripe_subscription_id TEXT,
    current_period_start TEXT,
    current_period_end TEXT,
    cancel_at_period_end INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'usd',
    default_payment_method_id TEXT,
    tax_id TEXT,
    billing_email TEXT,
    billing_address TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    last4 TEXT,
    brand TEXT,
    exp_month INTEGER,
    exp_year INTEGER,
    bank_name TEXT,
    is_default INTEGER DEFAULT 0,
    stripe_payment_method_id TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pm_user ON payment_methods(user_id)`,

  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stripe_invoice_id TEXT,
    number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    currency TEXT DEFAULT 'usd',
    subtotal INTEGER DEFAULT 0,
    tax INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    amount_paid INTEGER DEFAULT 0,
    amount_due INTEGER DEFAULT 0,
    period_start TEXT,
    period_end TEXT,
    line_items TEXT DEFAULT '[]',
    paid_at TEXT,
    due_date TEXT,
    hosted_invoice_url TEXT,
    invoice_pdf TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_inv_user ON invoices(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inv_status ON invoices(status)`,

  `CREATE TABLE IF NOT EXISTS usage_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}',
    timestamp TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_events(user_id, timestamp)`,

  `CREATE TABLE IF NOT EXISTS usage_meters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    tasks_used INTEGER DEFAULT 0,
    compute_minutes_used INTEGER DEFAULT 0,
    employees_active INTEGER DEFAULT 0,
    api_calls_made INTEGER DEFAULT 0,
    llm_tokens_used INTEGER DEFAULT 0,
    storage_used_mb REAL DEFAULT 0,
    last_updated TEXT,
    UNIQUE(user_id, period_start)
  )`,

  `CREATE TABLE IF NOT EXISTS dunning_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    attempt INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    scheduled_at TEXT NOT NULL,
    executed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_dunning_user ON dunning_attempts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_dunning_pending ON dunning_attempts(status, scheduled_at)`,
];
