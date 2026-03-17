/**
 * Billing API Routes — Stripe subscriptions, usage metering, invoices, dunning
 */
import type { Env } from '../index';
import { json, parseBody } from '../lib/helpers';
import {
  StripeService, UsageMeteringEngine, DunningEngine, BILLING_SCHEMA,
  PLAN_CONFIGS, getPlanConfig, calculateProration, buildInvoice,
  formatCurrency, convertCurrency, CURRENCY_CONFIG,
  type BillingInterval, type Currency, type SubscriptionStatus,
} from '../lib/billing';

export async function handleBilling(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const method = request.method;

  // ── Schema init ──
  if (path === '/api/billing/init' && method === 'POST') return handleInitSchema(env);

  // ── Plans ──
  if (path === '/api/billing/plans' && method === 'GET') return handleListPlans(request);

  // ── Customer billing profile ──
  if (path === '/api/billing/profile' && method === 'GET') return handleGetProfile(env, userId);
  if (path === '/api/billing/profile' && method === 'POST') return handleCreateProfile(request, env, userId);
  if (path === '/api/billing/profile' && method === 'PUT') return handleUpdateProfile(request, env, userId);

  // ── Subscriptions ──
  if (path === '/api/billing/subscribe' && method === 'POST') return handleSubscribe(request, env, userId);
  if (path === '/api/billing/change-plan' && method === 'POST') return handleChangePlan(request, env, userId);
  if (path === '/api/billing/cancel' && method === 'POST') return handleCancel(request, env, userId);
  if (path === '/api/billing/reactivate' && method === 'POST') return handleReactivate(env, userId);
  if (path === '/api/billing/preview-change' && method === 'POST') return handlePreviewChange(request, env, userId);

  // ── Billing interval ──
  if (path === '/api/billing/switch-interval' && method === 'POST') return handleSwitchInterval(request, env, userId);

  // ── Payment methods ──
  if (path === '/api/billing/payment-methods' && method === 'GET') return handleListPaymentMethods(env, userId);
  if (path === '/api/billing/payment-methods' && method === 'POST') return handleAddPaymentMethod(request, env, userId);
  if (path.match(/^\/api\/billing\/payment-methods\/[^/]+$/) && method === 'DELETE') {
    return handleRemovePaymentMethod(env, userId, path.split('/').pop()!);
  }
  if (path.match(/^\/api\/billing\/payment-methods\/[^/]+\/default$/) && method === 'POST') {
    return handleSetDefaultPayment(env, userId, path.split('/')[4]);
  }

  // ── Invoices ──
  if (path === '/api/billing/invoices' && method === 'GET') return handleListInvoices(env, userId);
  if (path.match(/^\/api\/billing\/invoices\/[^/]+$/) && method === 'GET') {
    return handleGetInvoice(env, userId, path.split('/').pop()!);
  }

  // ── Usage metering ──
  if (path === '/api/billing/usage' && method === 'GET') return handleGetUsage(env, userId);
  if (path === '/api/billing/usage/record' && method === 'POST') return handleRecordUsage(request, env, userId);
  if (path === '/api/billing/usage/history' && method === 'GET') return handleUsageHistory(env, userId);
  if (path === '/api/billing/usage/limits' && method === 'GET') return handleCheckLimits(env, userId);

  // ── Dunning ──
  if (path === '/api/billing/dunning/status' && method === 'GET') return handleDunningStatus(env, userId);
  if (path === '/api/billing/dunning/process' && method === 'POST') return handleProcessDunning(env, userId);

  // ── Webhooks (no auth) ──
  if (path === '/api/billing/webhook' && method === 'POST') return handleStripeWebhook(request, env);

  // ── Dashboard ──
  if (path === '/api/billing/dashboard' && method === 'GET') return handleBillingDashboard(env, userId);

  return json({ error: 'Not found' }, 404);
}

// ── Schema Init ──
async function handleInitSchema(env: Env): Promise<Response> {
  const results: string[] = [];
  for (const sql of BILLING_SCHEMA) {
    try {
      await env.DB.prepare(sql).run();
      results.push(`OK: ${sql.slice(0, 60)}...`);
    } catch (err: any) { results.push(`WARN: ${err.message}`); }
  }
  return json({ success: true, results });
}

// ── Plans ──
async function handleListPlans(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const currency = (url.searchParams.get('currency') || 'usd') as Currency;

  const plans = PLAN_CONFIGS.map(p => ({
    ...p,
    monthlyPriceDisplay: formatCurrency(convertCurrency(p.monthlyPrice, currency), currency),
    annualPriceDisplay: formatCurrency(convertCurrency(p.annualPrice, currency), currency),
    annualMonthlyDisplay: formatCurrency(convertCurrency(Math.round(p.annualPrice / 12), currency), currency),
    currency,
  }));

  return json({ success: true, data: { plans, currencies: Object.keys(CURRENCY_CONFIG) } });
}

// ── Customer Profile ──
async function handleGetProfile(env: Env, userId: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM customer_billing WHERE user_id = ?').bind(userId).first<any>();
  if (!row) return json({ success: true, data: { profile: null } });

  return json({
    success: true,
    data: {
      profile: {
        id: row.id, userId: row.user_id, stripeCustomerId: row.stripe_customer_id,
        planId: row.plan_id, interval: row.billing_interval, status: row.status,
        stripeSubscriptionId: row.stripe_subscription_id,
        currentPeriodStart: row.current_period_start, currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: !!row.cancel_at_period_end, currency: row.currency,
        defaultPaymentMethodId: row.default_payment_method_id,
        billingEmail: row.billing_email,
        billingAddress: row.billing_address ? JSON.parse(row.billing_address) : null,
        createdAt: row.created_at, updatedAt: row.updated_at,
      },
    },
  });
}

async function handleCreateProfile(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<any>(request);
  const planSlug = body.planId || 'starter';
  const interval: BillingInterval = body.interval || 'monthly';
  const currency: Currency = body.currency || 'usd';

  const stripe = new StripeService();
  await stripe.init(env, userId);

  let stripeCustomerId: string | undefined;

  if (stripe.isConfigured) {
    try {
      const customer = await stripe.createCustomer(
        body.email || `${userId}@nexushr.ai`, body.name || userId,
        { nexushr_user_id: userId, plan: planSlug }
      );
      stripeCustomerId = customer.id;
    } catch { /* Stripe not available, continue without */ }
  }

  const id = `bill_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date();
  const periodStart = now.toISOString();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

  await env.DB.prepare(`
    INSERT INTO customer_billing (id, user_id, stripe_customer_id, plan_id, billing_interval, status,
      current_period_start, current_period_end, currency, billing_email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, userId, stripeCustomerId || null, planSlug, interval, 'trialing',
    periodStart, periodEnd, currency, body.email || null, periodStart, periodStart
  ).run();

  return json({ success: true, data: { profileId: id, stripeCustomerId } });
}

async function handleUpdateProfile(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<any>(request);
  const updates: string[] = [];
  const values: any[] = [];

  if (body.currency) { updates.push('currency = ?'); values.push(body.currency); }
  if (body.billingEmail) { updates.push('billing_email = ?'); values.push(body.billingEmail); }
  if (body.billingAddress) { updates.push('billing_address = ?'); values.push(JSON.stringify(body.billingAddress)); }
  if (body.taxId) { updates.push('tax_id = ?'); values.push(body.taxId); }

  updates.push('updated_at = ?'); values.push(new Date().toISOString());

  await env.DB.prepare(`UPDATE customer_billing SET ${updates.join(', ')} WHERE user_id = ?`)
    .bind(...values, userId).run();

  return json({ success: true });
}

// ── Subscriptions ──
async function handleSubscribe(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ planSlug: string; interval?: BillingInterval; paymentMethodId?: string }>(request);
  const plan = getPlanConfig(body.planSlug);
  if (!plan) return json({ error: 'Invalid plan' }, 400);

  const interval = body.interval || 'monthly';
  const profile = await env.DB.prepare('SELECT * FROM customer_billing WHERE user_id = ?').bind(userId).first<any>();

  const stripe = new StripeService();
  await stripe.init(env, userId);

  let stripeSubId: string | undefined;
  let clientSecret: string | undefined;

  if (stripe.isConfigured && profile?.stripe_customer_id) {
    try {
      const priceId = interval === 'annual' ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;
      if (priceId) {
        const sub = await stripe.createSubscription({
          customer: profile.stripe_customer_id,
          priceId,
          metadata: { nexushr_user_id: userId, plan: plan.slug },
        });
        stripeSubId = sub.id;
        clientSecret = sub.latest_invoice?.payment_intent?.client_secret;
      }
    } catch { /* continue without Stripe */ }
  }

  const now = new Date();
  const periodEnd = interval === 'annual'
    ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
    : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

  // Generate local invoice
  const invoice = buildInvoice({
    userId, planConfig: plan, interval, currency: (profile?.currency || 'usd') as Currency,
  });

  await env.DB.prepare(`
    INSERT INTO invoices (id, user_id, number, status, currency, subtotal, tax, total, amount_paid, amount_due,
      period_start, period_end, line_items, due_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    invoice.id, userId, invoice.number, 'open', invoice.currency,
    invoice.subtotal, invoice.tax, invoice.total, 0, invoice.total,
    invoice.periodStart, invoice.periodEnd, JSON.stringify(invoice.lineItems),
    invoice.dueDate || null, invoice.createdAt
  ).run();

  await env.DB.prepare(`
    UPDATE customer_billing SET plan_id = ?, billing_interval = ?, status = ?,
      stripe_subscription_id = ?, current_period_start = ?, current_period_end = ?,
      updated_at = ? WHERE user_id = ?
  `).bind(plan.slug, interval, 'active', stripeSubId || null,
    now.toISOString(), periodEnd, now.toISOString(), userId
  ).run();

  return json({
    success: true,
    data: {
      subscriptionId: stripeSubId, clientSecret, invoice,
      plan: plan.slug, interval, periodEnd,
    },
  });
}

async function handleChangePlan(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ newPlanSlug: string; prorate?: boolean }>(request);
  const newPlan = getPlanConfig(body.newPlanSlug);
  if (!newPlan) return json({ error: 'Invalid plan' }, 400);

  const profile = await env.DB.prepare('SELECT * FROM customer_billing WHERE user_id = ?').bind(userId).first<any>();
  if (!profile) return json({ error: 'No billing profile' }, 404);

  const currentPlan = getPlanConfig(profile.plan_id);
  if (!currentPlan) return json({ error: 'Current plan not found' }, 500);

  const interval = profile.billing_interval as BillingInterval;
  const currentPrice = interval === 'annual' ? Math.round(currentPlan.annualPrice / 12) : currentPlan.monthlyPrice;
  const newPrice = interval === 'annual' ? Math.round(newPlan.annualPrice / 12) : newPlan.monthlyPrice;

  // Calculate proration
  const proration = calculateProration({
    currentPlanPrice: currentPrice,
    newPlanPrice: newPrice,
    periodStart: profile.current_period_start,
    periodEnd: profile.current_period_end,
  });

  // Try Stripe plan change
  const stripe = new StripeService();
  await stripe.init(env, userId);

  if (stripe.isConfigured && profile.stripe_subscription_id) {
    try {
      const priceId = interval === 'annual' ? newPlan.stripePriceIdAnnual : newPlan.stripePriceIdMonthly;
      if (priceId) {
        await stripe.changePlan(profile.stripe_subscription_id, priceId, body.prorate !== false);
      }
    } catch { /* continue without Stripe */ }
  }

  // Update local profile
  await env.DB.prepare(
    'UPDATE customer_billing SET plan_id = ?, updated_at = ? WHERE user_id = ?'
  ).bind(newPlan.slug, new Date().toISOString(), userId).run();

  // Generate proration invoice if needed
  if (proration.netAmount !== 0) {
    const prorationInvoice = buildInvoice({
      userId, planConfig: newPlan, interval,
      currency: (profile.currency || 'usd') as Currency,
      prorationCredit: proration.credit > 0 ? proration.credit : undefined,
    });

    await env.DB.prepare(`
      INSERT INTO invoices (id, user_id, number, status, currency, subtotal, tax, total, amount_paid, amount_due,
        period_start, period_end, line_items, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      prorationInvoice.id, userId, prorationInvoice.number, 'open', prorationInvoice.currency,
      prorationInvoice.subtotal, prorationInvoice.tax, prorationInvoice.total, 0, prorationInvoice.total,
      prorationInvoice.periodStart, prorationInvoice.periodEnd, JSON.stringify(prorationInvoice.lineItems),
      prorationInvoice.createdAt
    ).run();
  }

  return json({
    success: true,
    data: {
      previousPlan: currentPlan.slug,
      newPlan: newPlan.slug,
      proration,
      prorationFormatted: formatCurrency(Math.abs(proration.netAmount), (profile.currency || 'usd') as Currency),
      isUpgrade: newPrice > currentPrice,
    },
  });
}

async function handleCancel(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ immediate?: boolean; reason?: string }>(request);
  const profile = await env.DB.prepare('SELECT * FROM customer_billing WHERE user_id = ?').bind(userId).first<any>();
  if (!profile) return json({ error: 'No billing profile' }, 404);

  const stripe = new StripeService();
  await stripe.init(env, userId);

  if (stripe.isConfigured && profile.stripe_subscription_id) {
    try {
      await stripe.cancelSubscription(profile.stripe_subscription_id, !body.immediate);
    } catch { /* continue */ }
  }

  if (body.immediate) {
    await env.DB.prepare('UPDATE customer_billing SET status = ?, updated_at = ? WHERE user_id = ?')
      .bind('canceled', new Date().toISOString(), userId).run();
  } else {
    await env.DB.prepare('UPDATE customer_billing SET cancel_at_period_end = 1, updated_at = ? WHERE user_id = ?')
      .bind(new Date().toISOString(), userId).run();
  }

  return json({ success: true, data: { cancelAtPeriodEnd: !body.immediate, periodEnd: profile.current_period_end } });
}

async function handleReactivate(env: Env, userId: string): Promise<Response> {
  await env.DB.prepare('UPDATE customer_billing SET cancel_at_period_end = 0, status = ?, updated_at = ? WHERE user_id = ?')
    .bind('active', new Date().toISOString(), userId).run();
  return json({ success: true });
}

async function handlePreviewChange(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ newPlanSlug: string }>(request);
  const newPlan = getPlanConfig(body.newPlanSlug);
  if (!newPlan) return json({ error: 'Invalid plan' }, 400);

  const profile = await env.DB.prepare('SELECT * FROM customer_billing WHERE user_id = ?').bind(userId).first<any>();
  if (!profile) return json({ error: 'No billing profile' }, 404);

  const currentPlan = getPlanConfig(profile.plan_id);
  if (!currentPlan) return json({ error: 'Current plan not found' }, 500);

  const interval = profile.billing_interval as BillingInterval;
  const currentPrice = interval === 'annual' ? Math.round(currentPlan.annualPrice / 12) : currentPlan.monthlyPrice;
  const newPrice = interval === 'annual' ? Math.round(newPlan.annualPrice / 12) : newPlan.monthlyPrice;

  const proration = calculateProration({
    currentPlanPrice: currentPrice, newPlanPrice: newPrice,
    periodStart: profile.current_period_start, periodEnd: profile.current_period_end,
  });

  const currency = (profile.currency || 'usd') as Currency;
  return json({
    success: true,
    data: {
      currentPlan: currentPlan.slug, newPlan: newPlan.slug,
      proration, isUpgrade: newPrice > currentPrice,
      summary: {
        credit: formatCurrency(proration.credit, currency),
        charge: formatCurrency(proration.charge, currency),
        net: formatCurrency(Math.abs(proration.netAmount), currency),
        direction: proration.netAmount > 0 ? 'charge' : 'credit',
        daysRemaining: proration.daysRemaining,
      },
    },
  });
}

async function handleSwitchInterval(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ interval: BillingInterval }>(request);
  const profile = await env.DB.prepare('SELECT * FROM customer_billing WHERE user_id = ?').bind(userId).first<any>();
  if (!profile) return json({ error: 'No billing profile' }, 404);

  const plan = getPlanConfig(profile.plan_id);
  if (!plan) return json({ error: 'Plan not found' }, 500);

  const now = new Date();
  const periodEnd = body.interval === 'annual'
    ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
    : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString();

  const newPrice = body.interval === 'annual' ? plan.annualPrice : plan.monthlyPrice * 12;
  const currency = (profile.currency || 'usd') as Currency;

  await env.DB.prepare(
    'UPDATE customer_billing SET billing_interval = ?, current_period_end = ?, updated_at = ? WHERE user_id = ?'
  ).bind(body.interval, periodEnd, now.toISOString(), userId).run();

  return json({
    success: true,
    data: {
      interval: body.interval,
      annualSavings: body.interval === 'annual'
        ? formatCurrency(convertCurrency(plan.monthlyPrice * 12 - plan.annualPrice, currency), currency)
        : null,
      nextBillingDate: periodEnd,
    },
  });
}

// ── Payment Methods ──
async function handleListPaymentMethods(env: Env, userId: string): Promise<Response> {
  const rows = await env.DB.prepare('SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC')
    .bind(userId).all();
  const methods = (rows.results || []).map((r: any) => ({
    id: r.id, type: r.type, last4: r.last4, brand: r.brand,
    expMonth: r.exp_month, expYear: r.exp_year, bankName: r.bank_name,
    isDefault: !!r.is_default,
  }));
  return json({ success: true, data: { paymentMethods: methods } });
}

async function handleAddPaymentMethod(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<any>(request);
  const id = `pm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  // If Stripe payment method ID provided, attach it
  const stripe = new StripeService();
  await stripe.init(env, userId);

  if (stripe.isConfigured && body.stripePaymentMethodId) {
    const profile = await env.DB.prepare('SELECT stripe_customer_id FROM customer_billing WHERE user_id = ?').bind(userId).first<any>();
    if (profile?.stripe_customer_id) {
      try {
        await stripe.attachPaymentMethod(body.stripePaymentMethodId, profile.stripe_customer_id);
        if (body.setDefault) {
          await stripe.setDefaultPaymentMethod(profile.stripe_customer_id, body.stripePaymentMethodId);
        }
      } catch { /* continue */ }
    }
  }

  await env.DB.prepare(`
    INSERT INTO payment_methods (id, user_id, type, last4, brand, exp_month, exp_year, bank_name,
      is_default, stripe_payment_method_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, userId, body.type || 'card', body.last4, body.brand || null,
    body.expMonth || null, body.expYear || null, body.bankName || null,
    body.setDefault ? 1 : 0, body.stripePaymentMethodId || null, new Date().toISOString()
  ).run();

  if (body.setDefault) {
    await env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ? AND id != ?')
      .bind(userId, id).run();
    await env.DB.prepare('UPDATE customer_billing SET default_payment_method_id = ? WHERE user_id = ?')
      .bind(id, userId).run();
  }

  return json({ success: true, data: { paymentMethodId: id } });
}

async function handleRemovePaymentMethod(env: Env, userId: string, pmId: string): Promise<Response> {
  await env.DB.prepare('DELETE FROM payment_methods WHERE id = ? AND user_id = ?').bind(pmId, userId).run();
  return json({ success: true });
}

async function handleSetDefaultPayment(env: Env, userId: string, pmId: string): Promise<Response> {
  await env.DB.prepare('UPDATE payment_methods SET is_default = 0 WHERE user_id = ?').bind(userId).run();
  await env.DB.prepare('UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?').bind(pmId, userId).run();
  await env.DB.prepare('UPDATE customer_billing SET default_payment_method_id = ? WHERE user_id = ?').bind(pmId, userId).run();
  return json({ success: true });
}

// ── Invoices ──
async function handleListInvoices(env: Env, userId: string): Promise<Response> {
  const rows = await env.DB.prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .bind(userId).all();

  const invoices = (rows.results || []).map((r: any) => ({
    id: r.id, number: r.number, status: r.status, currency: r.currency,
    subtotal: r.subtotal, tax: r.tax, total: r.total,
    amountPaid: r.amount_paid, amountDue: r.amount_due,
    periodStart: r.period_start, periodEnd: r.period_end,
    lineItems: JSON.parse(r.line_items || '[]'),
    paidAt: r.paid_at, dueDate: r.due_date,
    hostedInvoiceUrl: r.hosted_invoice_url, invoicePdf: r.invoice_pdf,
    createdAt: r.created_at,
    totalFormatted: formatCurrency(r.total, r.currency),
  }));

  return json({ success: true, data: { invoices } });
}

async function handleGetInvoice(env: Env, userId: string, invoiceId: string): Promise<Response> {
  const row = await env.DB.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').bind(invoiceId, userId).first<any>();
  if (!row) return json({ error: 'Invoice not found' }, 404);
  return json({ success: true, data: { invoice: { ...row, line_items: JSON.parse(row.line_items || '[]') } } });
}

// ── Usage ──
async function handleGetUsage(env: Env, userId: string): Promise<Response> {
  const metering = new UsageMeteringEngine(env);
  const usage = await metering.getCurrentUsage(userId);
  return json({ success: true, data: { usage } });
}

async function handleRecordUsage(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ employeeId: string; type: string; quantity: number; metadata?: any }>(request);
  const metering = new UsageMeteringEngine(env);
  await metering.recordUsage({
    userId, employeeId: body.employeeId,
    type: body.type as any, quantity: body.quantity,
    metadata: body.metadata, timestamp: new Date().toISOString(),
  });
  return json({ success: true });
}

async function handleUsageHistory(env: Env, userId: string): Promise<Response> {
  const metering = new UsageMeteringEngine(env);
  const history = await metering.getUsageHistory(userId);
  return json({ success: true, data: { history } });
}

async function handleCheckLimits(env: Env, userId: string): Promise<Response> {
  const profile = await env.DB.prepare('SELECT plan_id FROM customer_billing WHERE user_id = ?').bind(userId).first<any>();
  const metering = new UsageMeteringEngine(env);
  const limits = await metering.checkLimits(userId, profile?.plan_id || 'starter');
  return json({ success: true, data: { limits } });
}

// ── Dunning ──
async function handleDunningStatus(env: Env, userId: string): Promise<Response> {
  const dunning = new DunningEngine(env);
  const status = await dunning.getDunningStatus(userId);
  return json({ success: true, data: status });
}

async function handleProcessDunning(env: Env, userId: string): Promise<Response> {
  const stripe = new StripeService();
  await stripe.init(env, userId);
  const dunning = new DunningEngine(env);
  const results = await dunning.processPendingRetries(stripe);
  return json({ success: true, data: { processed: results.length, results } });
}

// ── Stripe Webhook ──
async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  // Process different webhook event types
  try {
    const event = JSON.parse(payload);

    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        // Update invoice status in DB
        await env.DB.prepare(
          'UPDATE invoices SET status = ?, amount_paid = ?, paid_at = ? WHERE stripe_invoice_id = ?'
        ).bind('paid', invoice.amount_paid, new Date().toISOString(), invoice.id).run();
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        // Schedule dunning retry
        const profile = await env.DB.prepare(
          'SELECT user_id FROM customer_billing WHERE stripe_customer_id = ?'
        ).bind(invoice.customer).first<any>();

        if (profile) {
          const dunning = new DunningEngine(env);
          await dunning.scheduleRetry(profile.user_id, invoice.id);

          // Update subscription status
          await env.DB.prepare(
            'UPDATE customer_billing SET status = ?, updated_at = ? WHERE user_id = ?'
          ).bind('past_due', new Date().toISOString(), profile.user_id).run();
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const profile = await env.DB.prepare(
          'SELECT user_id FROM customer_billing WHERE stripe_subscription_id = ?'
        ).bind(sub.id).first<any>();

        if (profile) {
          await env.DB.prepare(
            'UPDATE customer_billing SET status = ?, updated_at = ? WHERE user_id = ?'
          ).bind('canceled', new Date().toISOString(), profile.user_id).run();
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const profile = await env.DB.prepare(
          'SELECT user_id FROM customer_billing WHERE stripe_subscription_id = ?'
        ).bind(sub.id).first<any>();

        if (profile) {
          await env.DB.prepare(
            'UPDATE customer_billing SET status = ?, current_period_start = ?, current_period_end = ?, updated_at = ? WHERE user_id = ?'
          ).bind(
            sub.status, new Date(sub.current_period_start * 1000).toISOString(),
            new Date(sub.current_period_end * 1000).toISOString(),
            new Date().toISOString(), profile.user_id
          ).run();
        }
        break;
      }
    }
  } catch (err: any) {
    return json({ error: 'Webhook processing error' }, 400);
  }

  return json({ received: true });
}

// ── Dashboard ──
async function handleBillingDashboard(env: Env, userId: string): Promise<Response> {
  const profile = await env.DB.prepare('SELECT * FROM customer_billing WHERE user_id = ?').bind(userId).first<any>();
  const plan = profile ? getPlanConfig(profile.plan_id) : null;

  const metering = new UsageMeteringEngine(env);
  const usage = await metering.getCurrentUsage(userId);
  const limits = plan ? await metering.checkLimits(userId, profile!.plan_id) : null;

  const invoices = await env.DB.prepare(
    'SELECT id, number, status, total, currency, created_at FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
  ).bind(userId).all();

  const paymentMethods = await env.DB.prepare(
    'SELECT id, type, last4, brand, is_default FROM payment_methods WHERE user_id = ?'
  ).bind(userId).all();

  const dunning = new DunningEngine(env);
  const dunningStatus = await dunning.getDunningStatus(userId);

  const currency = (profile?.currency || 'usd') as Currency;

  return json({
    success: true,
    data: {
      profile: profile ? {
        planName: plan?.name || 'Unknown',
        planSlug: profile.plan_id,
        interval: profile.billing_interval,
        status: profile.status,
        cancelAtPeriodEnd: !!profile.cancel_at_period_end,
        currentPeriodEnd: profile.current_period_end,
        monthlyPrice: plan ? formatCurrency(convertCurrency(
          profile.billing_interval === 'annual' ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice, currency
        ), currency) : null,
        annualSavings: plan && profile.billing_interval === 'monthly'
          ? formatCurrency(convertCurrency(plan.monthlyPrice * 12 - plan.annualPrice, currency), currency)
          : null,
      } : null,
      usage: usage ? {
        tasks: { used: usage.tasksUsed, limit: plan?.maxTasksPerMonth || 0, percent: plan?.maxTasksPerMonth ? Math.round(usage.tasksUsed / plan.maxTasksPerMonth * 100) : 0 },
        compute: { used: usage.computeMinutesUsed, limit: plan ? plan.maxComputeHours * 60 : 0, percent: plan?.maxComputeHours ? Math.round(usage.computeMinutesUsed / (plan.maxComputeHours * 60) * 100) : 0 },
        apiCalls: usage.apiCallsMade,
        llmTokens: usage.llmTokensUsed,
      } : null,
      limits,
      recentInvoices: (invoices.results || []).map((r: any) => ({
        id: r.id, number: r.number, status: r.status,
        total: formatCurrency(r.total, r.currency), createdAt: r.created_at,
      })),
      paymentMethods: (paymentMethods.results || []).map((r: any) => ({
        id: r.id, type: r.type, last4: r.last4, brand: r.brand, isDefault: !!r.is_default,
      })),
      dunning: dunningStatus,
      availablePlans: PLAN_CONFIGS.map(p => ({
        slug: p.slug, name: p.name,
        monthlyPrice: formatCurrency(convertCurrency(p.monthlyPrice, currency), currency),
        annualPrice: formatCurrency(convertCurrency(Math.round(p.annualPrice / 12), currency), currency),
        annualDiscount: p.annualDiscount,
        isCurrent: profile?.plan_id === p.slug,
      })),
    },
  });
}
