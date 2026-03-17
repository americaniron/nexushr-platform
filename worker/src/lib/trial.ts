/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Trial & Conversion Engine — Server-side trial management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. Server-side trial tracking with email-verified accounts
 * 2. Abuse detection: device fingerprinting, email domain validation, rate limiting
 * 3. Automated email drip campaign (Day 1 welcome, Day 3 tip, Day 5 nudge, Day 7 expiry)
 * 4. Trial extension workflow for sales-assisted conversion
 * 5. Behavioral cohort tracking to identify conversion predictors
 * 6. A/B testing framework for trial length, feature limits, conversion messaging
 */

import type { Env } from '../index';

// ══════════════════════════════════════════════════════
// 1. TYPES & INTERFACES
// ══════════════════════════════════════════════════════

export type TrialStatus = 'pending_verification' | 'active' | 'extended' | 'converted' | 'expired' | 'suspended';
export type EmailCampaignStep = 'welcome' | 'tip' | 'nudge' | 'expiry_warning' | 'expired' | 'extension_offer';
export type ABTestVariant = 'control' | 'variant_a' | 'variant_b' | 'variant_c';
export type CohortLabel = 'power_user' | 'explorer' | 'passive' | 'at_risk' | 'champion';

export interface TrialAccount {
  id: string;
  userId: string;
  email: string;
  emailVerified: boolean;
  verificationToken?: string;
  status: TrialStatus;
  trialDays: number;                // default 7 from requirements
  startedAt: string;
  expiresAt: string;
  extendedUntil?: string;
  extensionReason?: string;
  extensionApprovedBy?: string;
  convertedAt?: string;
  convertedToPlan?: string;
  deviceFingerprint: string;
  ipAddress: string;
  emailDomain: string;
  userAgent: string;
  referralSource?: string;
  abTestAssignments: Record<string, ABTestVariant>;
  createdAt: string;
  updatedAt: string;
}

export interface TrialEmailRecord {
  id: string;
  trialId: string;
  step: EmailCampaignStep;
  scheduledAt: string;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  subject: string;
  templateId: string;
  status: 'scheduled' | 'sent' | 'opened' | 'clicked' | 'failed' | 'skipped';
}

export interface BehavioralEvent {
  id: string;
  trialId: string;
  userId: string;
  event: string;                    // e.g., 'employee_created', 'task_executed', 'integration_added'
  category: 'activation' | 'engagement' | 'feature_discovery' | 'collaboration' | 'configuration';
  properties: Record<string, any>;
  sessionId: string;
  timestamp: string;
}

export interface CohortAssignment {
  id: string;
  trialId: string;
  userId: string;
  cohort: CohortLabel;
  score: number;                    // 0-100 conversion likelihood
  factors: CohortFactor[];
  assignedAt: string;
  updatedAt: string;
}

export interface CohortFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  parameter: string;                // e.g., 'trial_length', 'feature_gate', 'cta_message'
  variants: ABTestVariantConfig[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  trafficPercent: number;           // 0-100
  startDate: string;
  endDate?: string;
  winnerVariant?: string;
  createdAt: string;
}

export interface ABTestVariantConfig {
  id: ABTestVariant;
  name: string;
  value: any;                       // the actual parameter value
  trafficWeight: number;            // relative weight
  conversions: number;
  impressions: number;
  revenue: number;
}

export interface DeviceFingerprint {
  hash: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  colorDepth: number;
  plugins: string[];
  canvasHash?: string;
  webglHash?: string;
}

export interface AbuseSignal {
  type: 'duplicate_fingerprint' | 'disposable_email' | 'rate_limit' | 'vpn_detected' | 'suspicious_pattern';
  severity: 'low' | 'medium' | 'high';
  details: string;
  detectedAt: string;
}

// ══════════════════════════════════════════════════════
// 2. CONFIGURATION
// ══════════════════════════════════════════════════════

export const TRIAL_CONFIG = {
  defaultTrialDays: 7,
  maxExtensionDays: 14,
  maxExtensions: 2,
  verificationExpiryHours: 48,
  maxTrialsPerFingerprint: 2,
  maxTrialsPerIP24h: 3,
  emailCampaignSchedule: [
    { step: 'welcome' as EmailCampaignStep, dayOffset: 0, subject: 'Welcome to NexusHR — Your AI workforce awaits!', templateId: 'trial_welcome' },
    { step: 'tip' as EmailCampaignStep, dayOffset: 3, subject: 'Pro tip: Get the most from your AI employees', templateId: 'trial_tip_day3' },
    { step: 'nudge' as EmailCampaignStep, dayOffset: 5, subject: 'Your trial is halfway through — see what you\'ve built', templateId: 'trial_nudge_day5' },
    { step: 'expiry_warning' as EmailCampaignStep, dayOffset: 7, subject: 'Your NexusHR trial expires today — don\'t lose your progress', templateId: 'trial_expiry_day7' },
    { step: 'expired' as EmailCampaignStep, dayOffset: 8, subject: 'Your trial has ended — but your data is safe for 30 days', templateId: 'trial_expired' },
  ],
};

// Disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'trashmail.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com', '10minutemail.com',
  'temp-mail.org', 'tempail.com', 'getnada.com', 'emailondeck.com',
  'mailnesia.com', 'burnermail.io', 'inboxbear.com',
]);

// Free email providers (not blocked, but flagged for B2B)
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com',
]);

// ══════════════════════════════════════════════════════
// 3. ABUSE DETECTION ENGINE
// ══════════════════════════════════════════════════════

export class AbuseDetector {
  constructor(private env: Env) {}

  async checkEmail(email: string): Promise<AbuseSignal[]> {
    const signals: AbuseSignal[] = [];
    const domain = email.split('@')[1]?.toLowerCase() || '';

    // Check disposable email
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      signals.push({
        type: 'disposable_email',
        severity: 'high',
        details: `Disposable email domain detected: ${domain}`,
        detectedAt: new Date().toISOString(),
      });
    }

    // Check for plus-addressing abuse (user+tag@domain.com)
    const localPart = email.split('@')[0];
    if (localPart.includes('+')) {
      // Check if base email already has a trial
      const baseEmail = `${localPart.split('+')[0]}@${domain}`;
      const existing = await this.env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM trial_accounts WHERE email = ? OR email = ?'
      ).bind(baseEmail, email).first<{ cnt: number }>();
      if (existing && existing.cnt > 0) {
        signals.push({
          type: 'suspicious_pattern',
          severity: 'medium',
          details: `Plus-addressing detected; base email ${baseEmail} may already have an account`,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return signals;
  }

  async checkFingerprint(fingerprint: string): Promise<AbuseSignal[]> {
    const signals: AbuseSignal[] = [];

    const count = await this.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM trial_accounts WHERE device_fingerprint = ?'
    ).bind(fingerprint).first<{ cnt: number }>();

    if (count && count.cnt >= TRIAL_CONFIG.maxTrialsPerFingerprint) {
      signals.push({
        type: 'duplicate_fingerprint',
        severity: 'high',
        details: `Device fingerprint has ${count.cnt} existing trial(s), limit is ${TRIAL_CONFIG.maxTrialsPerFingerprint}`,
        detectedAt: new Date().toISOString(),
      });
    }

    return signals;
  }

  async checkIPRate(ip: string): Promise<AbuseSignal[]> {
    const signals: AbuseSignal[] = [];
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const count = await this.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM trial_accounts WHERE ip_address = ? AND created_at > ?'
    ).bind(ip, since).first<{ cnt: number }>();

    if (count && count.cnt >= TRIAL_CONFIG.maxTrialsPerIP24h) {
      signals.push({
        type: 'rate_limit',
        severity: 'high',
        details: `IP ${ip} has ${count.cnt} trial signups in last 24h, limit is ${TRIAL_CONFIG.maxTrialsPerIP24h}`,
        detectedAt: new Date().toISOString(),
      });
    }

    return signals;
  }

  async runFullCheck(email: string, fingerprint: string, ip: string): Promise<{
    allowed: boolean;
    signals: AbuseSignal[];
    riskScore: number;
  }> {
    const [emailSignals, fpSignals, ipSignals] = await Promise.all([
      this.checkEmail(email),
      this.checkFingerprint(fingerprint),
      this.checkIPRate(ip),
    ]);

    const signals = [...emailSignals, ...fpSignals, ...ipSignals];
    const riskScore = signals.reduce((sum, s) => {
      return sum + (s.severity === 'high' ? 40 : s.severity === 'medium' ? 20 : 10);
    }, 0);

    // Block if any high-severity signal or risk score > 50
    const hasHighSeverity = signals.some(s => s.severity === 'high');
    const allowed = !hasHighSeverity && riskScore <= 50;

    // Store signals for review
    if (signals.length > 0) {
      await this.env.DB.prepare(
        'INSERT INTO abuse_signals (id, email, fingerprint, ip, signals, risk_score, blocked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        `abuse_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        email, fingerprint, ip, JSON.stringify(signals), riskScore, allowed ? 0 : 1, new Date().toISOString()
      ).run();
    }

    return { allowed, signals, riskScore };
  }
}

// ══════════════════════════════════════════════════════
// 4. TRIAL MANAGEMENT SERVICE
// ══════════════════════════════════════════════════════

export class TrialService {
  private abuseDetector: AbuseDetector;

  constructor(private env: Env) {
    this.abuseDetector = new AbuseDetector(env);
  }

  async createTrial(params: {
    userId: string;
    email: string;
    fingerprint: string;
    ip: string;
    userAgent: string;
    referralSource?: string;
  }): Promise<{ trial?: TrialAccount; blocked?: boolean; signals?: AbuseSignal[]; verificationToken?: string }> {
    // Run abuse detection
    const abuseCheck = await this.abuseDetector.runFullCheck(params.email, params.fingerprint, params.ip);
    if (!abuseCheck.allowed) {
      return { blocked: true, signals: abuseCheck.signals };
    }

    // Assign A/B tests
    const abAssignments = await this.assignABTests(params.userId);

    // Determine trial length from A/B test or default
    const trialDays = abAssignments['trial_length']
      ? this.getTrialLengthFromVariant(abAssignments['trial_length'])
      : TRIAL_CONFIG.defaultTrialDays;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + trialDays);

    const verificationToken = this.generateToken();
    const domain = params.email.split('@')[1]?.toLowerCase() || '';

    const trial: TrialAccount = {
      id: `trial_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      userId: params.userId,
      email: params.email,
      emailVerified: false,
      verificationToken,
      status: 'pending_verification',
      trialDays,
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      deviceFingerprint: params.fingerprint,
      ipAddress: params.ip,
      emailDomain: domain,
      userAgent: params.userAgent,
      referralSource: params.referralSource,
      abTestAssignments: abAssignments,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Insert trial record
    await this.env.DB.prepare(`
      INSERT INTO trial_accounts (
        id, user_id, email, email_verified, verification_token, status, trial_days,
        started_at, expires_at, device_fingerprint, ip_address, email_domain, user_agent,
        referral_source, ab_test_assignments, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      trial.id, trial.userId, trial.email, 0, verificationToken, trial.status, trial.trialDays,
      trial.startedAt, trial.expiresAt, trial.deviceFingerprint, trial.ipAddress, trial.emailDomain,
      trial.userAgent, params.referralSource || null, JSON.stringify(abAssignments),
      trial.createdAt, trial.updatedAt
    ).run();

    // Schedule email drip campaign
    await this.scheduleEmailCampaign(trial);

    return { trial, verificationToken };
  }

  async verifyEmail(token: string): Promise<TrialAccount | null> {
    const row = await this.env.DB.prepare(
      'SELECT * FROM trial_accounts WHERE verification_token = ? AND status = ?'
    ).bind(token, 'pending_verification').first();
    if (!row) return null;

    // Check verification expiry
    const createdAt = new Date(row.created_at as string);
    const expiryMs = TRIAL_CONFIG.verificationExpiryHours * 60 * 60 * 1000;
    if (Date.now() - createdAt.getTime() > expiryMs) return null;

    const now = new Date().toISOString();
    await this.env.DB.prepare(
      'UPDATE trial_accounts SET email_verified = 1, status = ?, verification_token = NULL, started_at = ?, updated_at = ? WHERE id = ?'
    ).bind('active', now, now, row.id).run();

    // Recalculate expiry from verification time
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (row.trial_days as number));
    await this.env.DB.prepare(
      'UPDATE trial_accounts SET expires_at = ? WHERE id = ?'
    ).bind(expiresAt.toISOString(), row.id).run();

    return this.rowToTrial({ ...row, email_verified: 1, status: 'active', started_at: now, expires_at: expiresAt.toISOString() });
  }

  async getTrial(userId: string): Promise<TrialAccount | null> {
    const row = await this.env.DB.prepare(
      'SELECT * FROM trial_accounts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(userId).first();
    if (!row) return null;
    return this.rowToTrial(row);
  }

  async getTrialStatus(userId: string): Promise<{
    trial: TrialAccount | null;
    daysRemaining: number;
    hoursRemaining: number;
    isExpired: boolean;
    cohort?: CohortAssignment;
    abTests: Record<string, ABTestVariant>;
  }> {
    const trial = await this.getTrial(userId);
    if (!trial) return { trial: null, daysRemaining: 0, hoursRemaining: 0, isExpired: true, abTests: {} };

    const now = Date.now();
    const expiry = new Date(trial.extendedUntil || trial.expiresAt).getTime();
    const msRemaining = Math.max(0, expiry - now);
    const hoursRemaining = Math.floor(msRemaining / (60 * 60 * 1000));
    const daysRemaining = Math.floor(hoursRemaining / 24);
    const isExpired = msRemaining <= 0;

    // Auto-expire if needed
    if (isExpired && trial.status === 'active') {
      await this.env.DB.prepare(
        'UPDATE trial_accounts SET status = ?, updated_at = ? WHERE id = ?'
      ).bind('expired', new Date().toISOString(), trial.id).run();
      trial.status = 'expired';
    }

    // Get cohort
    const cohortRow = await this.env.DB.prepare(
      'SELECT * FROM cohort_assignments WHERE trial_id = ? ORDER BY updated_at DESC LIMIT 1'
    ).bind(trial.id).first();
    const cohort = cohortRow ? this.rowToCohort(cohortRow) : undefined;

    return { trial, daysRemaining, hoursRemaining, isExpired, cohort, abTests: trial.abTestAssignments };
  }

  async extendTrial(params: {
    userId: string;
    additionalDays: number;
    reason: string;
    approvedBy: string;
  }): Promise<TrialAccount | null> {
    const trial = await this.getTrial(params.userId);
    if (!trial) return null;

    // Check extension limits
    const extensionCount = await this.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM trial_extensions WHERE trial_id = ?'
    ).bind(trial.id).first<{ cnt: number }>();

    if (extensionCount && extensionCount.cnt >= TRIAL_CONFIG.maxExtensions) {
      throw new Error(`Maximum ${TRIAL_CONFIG.maxExtensions} extensions allowed`);
    }

    const totalExtension = params.additionalDays;
    if (totalExtension > TRIAL_CONFIG.maxExtensionDays) {
      throw new Error(`Maximum extension is ${TRIAL_CONFIG.maxExtensionDays} days`);
    }

    const currentExpiry = new Date(trial.extendedUntil || trial.expiresAt);
    const newExpiry = new Date(currentExpiry);
    newExpiry.setDate(newExpiry.getDate() + params.additionalDays);
    const now = new Date().toISOString();

    await this.env.DB.prepare(
      'UPDATE trial_accounts SET status = ?, extended_until = ?, extension_reason = ?, extension_approved_by = ?, updated_at = ? WHERE id = ?'
    ).bind('extended', newExpiry.toISOString(), params.reason, params.approvedBy, now, trial.id).run();

    // Record extension
    await this.env.DB.prepare(
      'INSERT INTO trial_extensions (id, trial_id, additional_days, reason, approved_by, previous_expiry, new_expiry, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      `ext_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      trial.id, params.additionalDays, params.reason, params.approvedBy,
      currentExpiry.toISOString(), newExpiry.toISOString(), now
    ).run();

    // Schedule extension offer email
    await this.scheduleEmail(trial.id, 'extension_offer', new Date(), 'Your NexusHR trial has been extended!', 'trial_extension');

    trial.status = 'extended';
    trial.extendedUntil = newExpiry.toISOString();
    trial.extensionReason = params.reason;
    trial.extensionApprovedBy = params.approvedBy;
    return trial;
  }

  async convertTrial(userId: string, planId: string): Promise<TrialAccount | null> {
    const trial = await this.getTrial(userId);
    if (!trial) return null;

    const now = new Date().toISOString();
    await this.env.DB.prepare(
      'UPDATE trial_accounts SET status = ?, converted_at = ?, converted_to_plan = ?, updated_at = ? WHERE id = ?'
    ).bind('converted', now, planId, now, trial.id).run();

    // Record conversion event for A/B test tracking
    for (const [testParam, variant] of Object.entries(trial.abTestAssignments)) {
      await this.recordABConversion(testParam, variant, planId);
    }

    // Cancel remaining scheduled emails
    await this.env.DB.prepare(
      "UPDATE trial_emails SET status = 'skipped' WHERE trial_id = ? AND status = 'scheduled'"
    ).bind(trial.id).run();

    trial.status = 'converted';
    trial.convertedAt = now;
    trial.convertedToPlan = planId;
    return trial;
  }

  // ── Email Drip Campaign ──

  private async scheduleEmailCampaign(trial: TrialAccount): Promise<void> {
    const startDate = new Date(trial.startedAt);

    for (const step of TRIAL_CONFIG.emailCampaignSchedule) {
      const scheduledAt = new Date(startDate);
      scheduledAt.setDate(scheduledAt.getDate() + step.dayOffset);
      // Send morning emails at 9am UTC
      scheduledAt.setHours(9, 0, 0, 0);

      await this.scheduleEmail(trial.id, step.step, scheduledAt, step.subject, step.templateId);
    }
  }

  private async scheduleEmail(trialId: string, step: EmailCampaignStep, scheduledAt: Date, subject: string, templateId: string): Promise<void> {
    await this.env.DB.prepare(
      'INSERT INTO trial_emails (id, trial_id, step, scheduled_at, subject, template_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      `email_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      trialId, step, scheduledAt.toISOString(), subject, templateId, 'scheduled'
    ).run();
  }

  async processPendingEmails(): Promise<{ sent: number; failed: number }> {
    const now = new Date().toISOString();
    const pending = await this.env.DB.prepare(
      "SELECT e.*, t.email, t.status as trial_status FROM trial_emails e JOIN trial_accounts t ON e.trial_id = t.id WHERE e.status = 'scheduled' AND e.scheduled_at <= ? ORDER BY e.scheduled_at LIMIT 50"
    ).bind(now).all();

    let sent = 0, failed = 0;

    for (const row of pending.results) {
      // Skip if trial is converted or suspended
      if (row.trial_status === 'converted' || row.trial_status === 'suspended') {
        await this.env.DB.prepare("UPDATE trial_emails SET status = 'skipped' WHERE id = ?").bind(row.id).run();
        continue;
      }

      try {
        // In production, integrate with email service (SendGrid, SES, etc.)
        // For now, mark as sent and store the intent
        await this.env.DB.prepare(
          "UPDATE trial_emails SET status = 'sent', sent_at = ? WHERE id = ?"
        ).bind(now, row.id).run();
        sent++;
      } catch (err) {
        await this.env.DB.prepare(
          "UPDATE trial_emails SET status = 'failed' WHERE id = ?"
        ).bind(row.id).run();
        failed++;
      }
    }

    return { sent, failed };
  }

  async getEmailHistory(trialId: string): Promise<TrialEmailRecord[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM trial_emails WHERE trial_id = ? ORDER BY scheduled_at'
    ).bind(trialId).all();
    return rows.results.map(r => ({
      id: r.id as string,
      trialId: r.trial_id as string,
      step: r.step as EmailCampaignStep,
      scheduledAt: r.scheduled_at as string,
      sentAt: r.sent_at as string | undefined,
      openedAt: r.opened_at as string | undefined,
      clickedAt: r.clicked_at as string | undefined,
      subject: r.subject as string,
      templateId: r.template_id as string,
      status: r.status as TrialEmailRecord['status'],
    }));
  }

  async trackEmailOpen(emailId: string): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE trial_emails SET status = 'opened', opened_at = ? WHERE id = ? AND status = 'sent'"
    ).bind(new Date().toISOString(), emailId).run();
  }

  async trackEmailClick(emailId: string): Promise<void> {
    await this.env.DB.prepare(
      "UPDATE trial_emails SET status = 'clicked', clicked_at = ? WHERE id = ?"
    ).bind(new Date().toISOString(), emailId).run();
  }

  // ══════════════════════════════════════════════════════
  // 5. BEHAVIORAL COHORT TRACKING
  // ══════════════════════════════════════════════════════

  async recordBehavior(params: {
    trialId: string;
    userId: string;
    event: string;
    category: BehavioralEvent['category'];
    properties?: Record<string, any>;
    sessionId: string;
  }): Promise<void> {
    await this.env.DB.prepare(
      'INSERT INTO behavioral_events (id, trial_id, user_id, event, category, properties, session_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      params.trialId, params.userId, params.event, params.category,
      JSON.stringify(params.properties || {}), params.sessionId, new Date().toISOString()
    ).run();

    // Recalculate cohort after behavior
    await this.recalculateCohort(params.trialId, params.userId);
  }

  async recalculateCohort(trialId: string, userId: string): Promise<CohortAssignment> {
    // Gather behavioral metrics
    const metrics = await this.getBehavioralMetrics(trialId);

    const factors: CohortFactor[] = [
      {
        name: 'activation_events',
        weight: 0.25,
        value: Math.min(100, metrics.activationCount * 20),
        description: 'Key activation milestones completed',
      },
      {
        name: 'engagement_frequency',
        weight: 0.20,
        value: Math.min(100, metrics.sessionsCount * 15),
        description: 'Number of active sessions',
      },
      {
        name: 'feature_breadth',
        weight: 0.20,
        value: Math.min(100, metrics.uniqueFeatures * 12),
        description: 'Number of different features used',
      },
      {
        name: 'recency',
        weight: 0.15,
        value: metrics.hoursSinceLastActivity < 24 ? 100 : Math.max(0, 100 - (metrics.hoursSinceLastActivity - 24) * 5),
        description: 'How recently the user was active',
      },
      {
        name: 'depth',
        weight: 0.10,
        value: Math.min(100, metrics.totalEvents * 2),
        description: 'Total depth of engagement',
      },
      {
        name: 'collaboration',
        weight: 0.10,
        value: Math.min(100, metrics.collaborationEvents * 25),
        description: 'Multi-user or team-oriented actions',
      },
    ];

    const score = Math.round(factors.reduce((sum, f) => sum + f.value * f.weight, 0));

    let cohort: CohortLabel;
    if (score >= 80) cohort = 'champion';
    else if (score >= 60) cohort = 'power_user';
    else if (score >= 40) cohort = 'explorer';
    else if (score >= 20) cohort = 'passive';
    else cohort = 'at_risk';

    const now = new Date().toISOString();
    const id = `cohort_${trialId}`;

    // Upsert cohort assignment
    await this.env.DB.prepare(`
      INSERT INTO cohort_assignments (id, trial_id, user_id, cohort, score, factors, assigned_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(trial_id) DO UPDATE SET cohort = ?, score = ?, factors = ?, updated_at = ?
    `).bind(
      id, trialId, userId, cohort, score, JSON.stringify(factors), now, now,
      cohort, score, JSON.stringify(factors), now
    ).run();

    return { id, trialId, userId, cohort, score, factors, assignedAt: now, updatedAt: now };
  }

  private async getBehavioralMetrics(trialId: string): Promise<{
    activationCount: number;
    sessionsCount: number;
    uniqueFeatures: number;
    hoursSinceLastActivity: number;
    totalEvents: number;
    collaborationEvents: number;
  }> {
    const rows = await this.env.DB.prepare(
      'SELECT category, event, session_id, timestamp FROM behavioral_events WHERE trial_id = ? ORDER BY timestamp DESC'
    ).bind(trialId).all();

    const events = rows.results;
    const sessions = new Set(events.map(e => e.session_id as string));
    const features = new Set(events.map(e => e.event as string));
    const lastActivity = events[0]?.timestamp ? new Date(events[0].timestamp as string) : new Date(0);
    const hoursSince = (Date.now() - lastActivity.getTime()) / (60 * 60 * 1000);

    return {
      activationCount: events.filter(e => e.category === 'activation').length,
      sessionsCount: sessions.size,
      uniqueFeatures: features.size,
      hoursSinceLastActivity: hoursSince,
      totalEvents: events.length,
      collaborationEvents: events.filter(e => e.category === 'collaboration').length,
    };
  }

  async getCohortStats(): Promise<Record<CohortLabel, { count: number; conversionRate: number }>> {
    const rows = await this.env.DB.prepare(`
      SELECT c.cohort, COUNT(*) as cnt,
        SUM(CASE WHEN t.status = 'converted' THEN 1 ELSE 0 END) as converted
      FROM cohort_assignments c
      JOIN trial_accounts t ON c.trial_id = t.id
      GROUP BY c.cohort
    `).all();

    const stats: Record<string, { count: number; conversionRate: number }> = {};
    for (const r of rows.results) {
      const count = r.cnt as number;
      const converted = r.converted as number;
      stats[r.cohort as string] = {
        count,
        conversionRate: count > 0 ? Math.round((converted / count) * 100) : 0,
      };
    }

    return stats as Record<CohortLabel, { count: number; conversionRate: number }>;
  }

  // ══════════════════════════════════════════════════════
  // 6. A/B TESTING FRAMEWORK
  // ══════════════════════════════════════════════════════

  async createABTest(params: {
    name: string;
    description: string;
    parameter: string;
    variants: Omit<ABTestVariantConfig, 'conversions' | 'impressions' | 'revenue'>[];
    trafficPercent?: number;
  }): Promise<ABTest> {
    const now = new Date().toISOString();
    const test: ABTest = {
      id: `abtest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      name: params.name,
      description: params.description,
      parameter: params.parameter,
      variants: params.variants.map(v => ({ ...v, conversions: 0, impressions: 0, revenue: 0 })),
      status: 'running',
      trafficPercent: params.trafficPercent || 100,
      startDate: now,
      createdAt: now,
    };

    await this.env.DB.prepare(
      'INSERT INTO ab_tests (id, name, description, parameter, variants, status, traffic_percent, start_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(test.id, test.name, test.description, test.parameter, JSON.stringify(test.variants), test.status, test.trafficPercent, now, now).run();

    return test;
  }

  async getRunningTests(): Promise<ABTest[]> {
    const rows = await this.env.DB.prepare(
      "SELECT * FROM ab_tests WHERE status = 'running'"
    ).all();
    return rows.results.map(r => this.rowToABTest(r));
  }

  async getABTest(testId: string): Promise<ABTest | null> {
    const row = await this.env.DB.prepare('SELECT * FROM ab_tests WHERE id = ?').bind(testId).first();
    return row ? this.rowToABTest(row) : null;
  }

  private async assignABTests(userId: string): Promise<Record<string, ABTestVariant>> {
    const tests = await this.getRunningTests();
    const assignments: Record<string, ABTestVariant> = {};

    for (const test of tests) {
      // Deterministic assignment based on userId + test parameter
      const hash = this.simpleHash(`${userId}:${test.parameter}`);
      const inTraffic = (hash % 100) < test.trafficPercent;
      if (!inTraffic) continue;

      // Weighted variant selection
      const totalWeight = test.variants.reduce((sum, v) => sum + v.trafficWeight, 0);
      let roll = (hash % 1000) / 1000 * totalWeight;
      let selectedVariant: ABTestVariant = 'control';

      for (const variant of test.variants) {
        roll -= variant.trafficWeight;
        if (roll <= 0) {
          selectedVariant = variant.id;
          break;
        }
      }

      assignments[test.parameter] = selectedVariant;

      // Record impression
      await this.env.DB.prepare(
        'INSERT INTO ab_test_impressions (id, test_id, user_id, variant, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        test.id, userId, selectedVariant, new Date().toISOString()
      ).run();

      // Update variant impression count
      const updatedVariants = test.variants.map(v =>
        v.id === selectedVariant ? { ...v, impressions: v.impressions + 1 } : v
      );
      await this.env.DB.prepare(
        'UPDATE ab_tests SET variants = ? WHERE id = ?'
      ).bind(JSON.stringify(updatedVariants), test.id).run();
    }

    return assignments;
  }

  private async recordABConversion(testParameter: string, variant: ABTestVariant, planId: string): Promise<void> {
    const tests = await this.env.DB.prepare(
      "SELECT * FROM ab_tests WHERE parameter = ? AND status = 'running'"
    ).all();

    for (const row of tests.results) {
      const test = this.rowToABTest(row);
      const updatedVariants = test.variants.map(v =>
        v.id === variant ? { ...v, conversions: v.conversions + 1 } : v
      );
      await this.env.DB.prepare(
        'UPDATE ab_tests SET variants = ? WHERE id = ?'
      ).bind(JSON.stringify(updatedVariants), test.id).run();
    }
  }

  async getABTestResults(testId: string): Promise<{
    test: ABTest;
    results: { variant: string; impressions: number; conversions: number; conversionRate: number; confidence: number }[];
    winner?: string;
    significanceReached: boolean;
  }> {
    const test = await this.getABTest(testId);
    if (!test) throw new Error('Test not found');

    const results = test.variants.map(v => {
      const rate = v.impressions > 0 ? v.conversions / v.impressions : 0;
      return {
        variant: v.id,
        impressions: v.impressions,
        conversions: v.conversions,
        conversionRate: Math.round(rate * 10000) / 100,
        confidence: this.calculateConfidence(v.conversions, v.impressions, test.variants),
      };
    });

    // Check for statistical significance (simplified z-test)
    const significanceReached = results.some(r => r.confidence >= 95 && r.impressions >= 100);
    let winner: string | undefined;
    if (significanceReached) {
      const best = results.reduce((a, b) => a.conversionRate > b.conversionRate ? a : b);
      if (best.confidence >= 95) winner = best.variant;
    }

    return { test, results, winner, significanceReached };
  }

  private calculateConfidence(conversions: number, impressions: number, allVariants: ABTestVariantConfig[]): number {
    if (impressions < 30) return 0;
    const rate = conversions / impressions;
    const controlVariant = allVariants.find(v => v.id === 'control');
    if (!controlVariant || controlVariant.impressions < 30) return 0;

    const controlRate = controlVariant.conversions / controlVariant.impressions;
    const pooledSE = Math.sqrt(
      (rate * (1 - rate)) / impressions + (controlRate * (1 - controlRate)) / controlVariant.impressions
    );
    if (pooledSE === 0) return 0;

    const zScore = Math.abs(rate - controlRate) / pooledSE;
    // Approximate z-score to confidence
    if (zScore >= 2.576) return 99;
    if (zScore >= 1.96) return 95;
    if (zScore >= 1.645) return 90;
    if (zScore >= 1.282) return 80;
    return Math.round(zScore / 1.282 * 80);
  }

  async concludeABTest(testId: string, winnerVariant?: string): Promise<ABTest> {
    const now = new Date().toISOString();
    await this.env.DB.prepare(
      'UPDATE ab_tests SET status = ?, end_date = ?, winner_variant = ? WHERE id = ?'
    ).bind('completed', now, winnerVariant || null, testId).run();

    const test = await this.getABTest(testId);
    return test!;
  }

  // ── Helper: get trial length from A/B variant ──

  private getTrialLengthFromVariant(variant: ABTestVariant): number {
    switch (variant) {
      case 'control': return 7;
      case 'variant_a': return 14;
      case 'variant_b': return 3;
      case 'variant_c': return 10;
      default: return TRIAL_CONFIG.defaultTrialDays;
    }
  }

  // ── Utility Methods ──

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 48; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private rowToTrial(row: Record<string, unknown>): TrialAccount {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      email: row.email as string,
      emailVerified: !!(row.email_verified as number),
      verificationToken: row.verification_token as string | undefined,
      status: row.status as TrialStatus,
      trialDays: row.trial_days as number,
      startedAt: row.started_at as string,
      expiresAt: row.expires_at as string,
      extendedUntil: row.extended_until as string | undefined,
      extensionReason: row.extension_reason as string | undefined,
      extensionApprovedBy: row.extension_approved_by as string | undefined,
      convertedAt: row.converted_at as string | undefined,
      convertedToPlan: row.converted_to_plan as string | undefined,
      deviceFingerprint: row.device_fingerprint as string,
      ipAddress: row.ip_address as string,
      emailDomain: row.email_domain as string,
      userAgent: row.user_agent as string,
      referralSource: row.referral_source as string | undefined,
      abTestAssignments: JSON.parse((row.ab_test_assignments as string) || '{}'),
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private rowToCohort(row: Record<string, unknown>): CohortAssignment {
    return {
      id: row.id as string,
      trialId: row.trial_id as string,
      userId: row.user_id as string,
      cohort: row.cohort as CohortLabel,
      score: row.score as number,
      factors: JSON.parse((row.factors as string) || '[]'),
      assignedAt: row.assigned_at as string,
      updatedAt: row.updated_at as string,
    };
  }

  private rowToABTest(row: Record<string, unknown>): ABTest {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      parameter: row.parameter as string,
      variants: JSON.parse((row.variants as string) || '[]'),
      status: row.status as ABTest['status'],
      trafficPercent: row.traffic_percent as number,
      startDate: row.start_date as string,
      endDate: row.end_date as string | undefined,
      winnerVariant: row.winner_variant as string | undefined,
      createdAt: row.created_at as string,
    };
  }
}

// ══════════════════════════════════════════════════════
// 7. DATABASE SCHEMA
// ══════════════════════════════════════════════════════

export const TRIAL_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS trial_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    email_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    status TEXT NOT NULL DEFAULT 'pending_verification',
    trial_days INTEGER NOT NULL DEFAULT 7,
    started_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    extended_until TEXT,
    extension_reason TEXT,
    extension_approved_by TEXT,
    converted_at TEXT,
    converted_to_plan TEXT,
    device_fingerprint TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    email_domain TEXT NOT NULL,
    user_agent TEXT,
    referral_source TEXT,
    ab_test_assignments TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_trial_user ON trial_accounts(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_trial_email ON trial_accounts(email)`,
  `CREATE INDEX IF NOT EXISTS idx_trial_fp ON trial_accounts(device_fingerprint)`,
  `CREATE INDEX IF NOT EXISTS idx_trial_status ON trial_accounts(status)`,

  `CREATE TABLE IF NOT EXISTS trial_emails (
    id TEXT PRIMARY KEY,
    trial_id TEXT NOT NULL,
    step TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    sent_at TEXT,
    opened_at TEXT,
    clicked_at TEXT,
    subject TEXT NOT NULL,
    template_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_trial_email_pending ON trial_emails(status, scheduled_at)`,
  `CREATE INDEX IF NOT EXISTS idx_trial_email_trial ON trial_emails(trial_id)`,

  `CREATE TABLE IF NOT EXISTS trial_extensions (
    id TEXT PRIMARY KEY,
    trial_id TEXT NOT NULL,
    additional_days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    previous_expiry TEXT NOT NULL,
    new_expiry TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ext_trial ON trial_extensions(trial_id)`,

  `CREATE TABLE IF NOT EXISTS behavioral_events (
    id TEXT PRIMARY KEY,
    trial_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    event TEXT NOT NULL,
    category TEXT NOT NULL,
    properties TEXT DEFAULT '{}',
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_behavior_trial ON behavioral_events(trial_id)`,
  `CREATE INDEX IF NOT EXISTS idx_behavior_user ON behavioral_events(user_id, timestamp)`,

  `CREATE TABLE IF NOT EXISTS cohort_assignments (
    id TEXT PRIMARY KEY,
    trial_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    cohort TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    factors TEXT DEFAULT '[]',
    assigned_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cohort_user ON cohort_assignments(user_id)`,

  `CREATE TABLE IF NOT EXISTS ab_tests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parameter TEXT NOT NULL,
    variants TEXT DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    traffic_percent INTEGER DEFAULT 100,
    start_date TEXT,
    end_date TEXT,
    winner_variant TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_abtest_status ON ab_tests(status)`,
  `CREATE INDEX IF NOT EXISTS idx_abtest_param ON ab_tests(parameter)`,

  `CREATE TABLE IF NOT EXISTS ab_test_impressions (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    variant TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_abimp_test ON ab_test_impressions(test_id)`,

  `CREATE TABLE IF NOT EXISTS abuse_signals (
    id TEXT PRIMARY KEY,
    email TEXT,
    fingerprint TEXT,
    ip TEXT,
    signals TEXT DEFAULT '[]',
    risk_score INTEGER DEFAULT 0,
    blocked INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_abuse_email ON abuse_signals(email)`,
  `CREATE INDEX IF NOT EXISTS idx_abuse_ip ON abuse_signals(ip)`,
];
