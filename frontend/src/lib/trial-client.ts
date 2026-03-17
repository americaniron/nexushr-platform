/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Trial & Conversion Client — Frontend with local fallback
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. Worker API when connected, localStorage fallback when offline
 * 2. Device fingerprint generation for abuse detection
 * 3. Behavioral event tracking
 * 4. Trial status with countdown
 * 5. A/B test variant retrieval
 * 6. Cohort display for admin dashboards
 */

import { isWorkerConnected } from './worker-api';

// ══════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════

export type TrialStatus = 'pending_verification' | 'active' | 'extended' | 'converted' | 'expired' | 'suspended';
export type CohortLabel = 'power_user' | 'explorer' | 'passive' | 'at_risk' | 'champion';
export type ABTestVariant = 'control' | 'variant_a' | 'variant_b' | 'variant_c';

export interface TrialAccount {
  id: string;
  userId: string;
  email: string;
  emailVerified: boolean;
  status: TrialStatus;
  trialDays: number;
  startedAt: string;
  expiresAt: string;
  extendedUntil?: string;
  extensionReason?: string;
  convertedAt?: string;
  convertedToPlan?: string;
  deviceFingerprint: string;
  emailDomain: string;
  referralSource?: string;
  abTestAssignments: Record<string, ABTestVariant>;
  createdAt: string;
  updatedAt: string;
}

export interface TrialStatusResponse {
  trial: TrialAccount | null;
  daysRemaining: number;
  hoursRemaining: number;
  isExpired: boolean;
  cohort?: { cohort: CohortLabel; score: number };
  abTests: Record<string, ABTestVariant>;
}

export interface TrialEmailRecord {
  id: string;
  step: string;
  scheduledAt: string;
  sentAt?: string;
  openedAt?: string;
  clickedAt?: string;
  subject: string;
  status: string;
}

export interface ABTestResult {
  variant: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
}

export interface TrialDashboard {
  overview: {
    totalTrials: number;
    active: number;
    extended: number;
    converted: number;
    expired: number;
    suspended: number;
    pendingVerification: number;
  };
  funnel: {
    started: number;
    verified: number;
    verificationRate: number;
    converted: number;
    conversionRate: number;
  };
  cohorts: Record<CohortLabel, { count: number; conversionRate: number }>;
  emailPerformance: { step: string; total: number; deliveredRate: number; openRate: number; clickRate: number }[];
  abTests: { id: string; name: string; parameter: string; variantCount: number; totalImpressions: number }[];
}

// ══════════════════════════════════════════════════════
// Local Storage Fallback
// ══════════════════════════════════════════════════════

const LOCAL_TRIAL_KEY = 'nexushr_trial';
const LOCAL_BEHAVIOR_KEY = 'nexushr_trial_behavior';
const LOCAL_SESSION_KEY = 'nexushr_session_id';

function getSessionId(): string {
  let sid = sessionStorage.getItem(LOCAL_SESSION_KEY);
  if (!sid) {
    sid = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(LOCAL_SESSION_KEY, sid);
  }
  return sid;
}

function getLocalTrial(): TrialAccount | null {
  try {
    const raw = localStorage.getItem(LOCAL_TRIAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLocalTrial(trial: TrialAccount): void {
  localStorage.setItem(LOCAL_TRIAL_KEY, JSON.stringify(trial));
}

function getLocalBehavior(): { event: string; category: string; timestamp: string }[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_BEHAVIOR_KEY) || '[]'); } catch { return []; }
}

function appendLocalBehavior(event: string, category: string): void {
  const events = getLocalBehavior();
  events.push({ event, category, timestamp: new Date().toISOString() });
  // Keep last 200 events locally
  localStorage.setItem(LOCAL_BEHAVIOR_KEY, JSON.stringify(events.slice(-200)));
}

function generateLocalId(prefix: string): string {
  return `${prefix}_local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ══════════════════════════════════════════════════════
// Device Fingerprint Generation
// ══════════════════════════════════════════════════════

export async function generateFingerprint(): Promise<string> {
  const components: string[] = [];

  // Screen
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Language
  components.push(navigator.language);

  // Platform
  components.push(navigator.platform);

  // Hardware concurrency
  components.push(String(navigator.hardwareConcurrency || 0));

  // Device memory (if available)
  components.push(String((navigator as any).deviceMemory || 0));

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(50, 0, 100, 30);
      ctx.fillStyle = '#069';
      ctx.fillText('NexusHR fp', 2, 15);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch { /* canvas not available */ }

  // WebGL renderer
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }
    }
  } catch { /* webgl not available */ }

  // Hash components
  const str = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  if (crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

// ══════════════════════════════════════════════════════
// API Fetch Helper
// ══════════════════════════════════════════════════════

async function trialFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

// ══════════════════════════════════════════════════════
// Trial Client API
// ══════════════════════════════════════════════════════

export const TrialClient = {

  // ── Schema Init ──
  async initSchema(): Promise<void> {
    if (!isWorkerConnected()) return;
    await trialFetch('/api/trial/init', { method: 'POST' });
  },

  // ── Start Trial ──
  async startTrial(params: {
    email: string;
    referralSource?: string;
  }): Promise<{
    trial?: TrialAccount;
    blocked?: boolean;
    verificationRequired?: boolean;
    message?: string;
    signals?: { type: string; severity: string }[];
  }> {
    const fingerprint = await generateFingerprint();

    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/start', {
        method: 'POST',
        body: JSON.stringify({
          email: params.email,
          fingerprint,
          referralSource: params.referralSource,
        }),
      });
      if (res.success) return res.data;
      if (res.code === 'ABUSE_DETECTED') return { blocked: true, signals: res.signals };
      throw new Error(res.error);
    }

    // Local fallback — create trial locally (no abuse detection possible)
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 7);

    const trial: TrialAccount = {
      id: generateLocalId('trial'),
      userId: 'local',
      email: params.email,
      emailVerified: true, // skip verification locally
      status: 'active',
      trialDays: 7,
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      deviceFingerprint: fingerprint,
      emailDomain: params.email.split('@')[1] || '',
      referralSource: params.referralSource,
      abTestAssignments: {},
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    saveLocalTrial(trial);
    return { trial, verificationRequired: false, message: 'Trial started (local mode)' };
  },

  // ── Verify Email ──
  async verifyEmail(token: string): Promise<TrialAccount | null> {
    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      if (res.success) return res.data.trial;
      return null;
    }
    // Local mode — verification already skipped
    return getLocalTrial();
  },

  // ── Get Status ──
  async getStatus(): Promise<TrialStatusResponse> {
    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/status');
      if (res.success) return res.data;
    }

    // Local fallback
    const trial = getLocalTrial();
    if (!trial) {
      return { trial: null, daysRemaining: 0, hoursRemaining: 0, isExpired: true, abTests: {} };
    }

    const now = Date.now();
    const expiry = new Date(trial.extendedUntil || trial.expiresAt).getTime();
    const msRemaining = Math.max(0, expiry - now);
    const hoursRemaining = Math.floor(msRemaining / (60 * 60 * 1000));
    const daysRemaining = Math.floor(hoursRemaining / 24);
    const isExpired = msRemaining <= 0;

    if (isExpired && trial.status === 'active') {
      trial.status = 'expired';
      saveLocalTrial(trial);
    }

    // Local cohort estimation from behavior events
    const events = getLocalBehavior();
    const uniqueEvents = new Set(events.map(e => e.event)).size;
    let cohort: CohortLabel = 'passive';
    let score = Math.min(100, uniqueEvents * 10 + events.length * 2);
    if (score >= 80) cohort = 'champion';
    else if (score >= 60) cohort = 'power_user';
    else if (score >= 40) cohort = 'explorer';
    else if (score >= 20) cohort = 'passive';
    else cohort = 'at_risk';

    return {
      trial,
      daysRemaining,
      hoursRemaining,
      isExpired,
      cohort: { cohort, score },
      abTests: trial.abTestAssignments,
    };
  },

  // ── Convert Trial ──
  async convert(planId: string): Promise<TrialAccount | null> {
    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/convert', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      if (res.success) return res.data.trial;
      return null;
    }

    const trial = getLocalTrial();
    if (!trial) return null;
    trial.status = 'converted';
    trial.convertedAt = new Date().toISOString();
    trial.convertedToPlan = planId;
    saveLocalTrial(trial);
    return trial;
  },

  // ── Extend Trial (admin) ──
  async extend(params: {
    userId?: string;
    additionalDays: number;
    reason: string;
  }): Promise<TrialAccount | null> {
    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/extend', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.success) return res.data.trial;
      return null;
    }

    const trial = getLocalTrial();
    if (!trial) return null;
    const currentExpiry = new Date(trial.extendedUntil || trial.expiresAt);
    currentExpiry.setDate(currentExpiry.getDate() + params.additionalDays);
    trial.status = 'extended';
    trial.extendedUntil = currentExpiry.toISOString();
    trial.extensionReason = params.reason;
    trial.updatedAt = new Date().toISOString();
    saveLocalTrial(trial);
    return trial;
  },

  // ── Track Behavior ──
  async trackEvent(params: {
    event: string;
    category?: 'activation' | 'engagement' | 'feature_discovery' | 'collaboration' | 'configuration';
    properties?: Record<string, any>;
  }): Promise<void> {
    const category = params.category || 'engagement';

    if (isWorkerConnected()) {
      await trialFetch('/api/trial/behavior', {
        method: 'POST',
        body: JSON.stringify({
          event: params.event,
          category,
          properties: params.properties,
          sessionId: getSessionId(),
        }),
      }).catch(() => {
        // Fallback to local on network error
        appendLocalBehavior(params.event, category);
      });
      return;
    }

    appendLocalBehavior(params.event, category);
  },

  // ── Convenience: track activation milestones ──
  async trackActivation(milestone: string): Promise<void> {
    await this.trackEvent({ event: milestone, category: 'activation' });
  },

  async trackFeatureDiscovery(feature: string): Promise<void> {
    await this.trackEvent({ event: `discovered_${feature}`, category: 'feature_discovery' });
  },

  // ── Get Email Campaign History ──
  async getEmailHistory(): Promise<TrialEmailRecord[]> {
    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/emails');
      if (res.success) return res.data.emails;
    }
    // No local equivalent for email history
    return [];
  },

  // ── A/B Test Methods ──
  async getABTestVariant(parameter: string): Promise<ABTestVariant | null> {
    const status = await this.getStatus();
    return status.abTests[parameter] || null;
  },

  async getRunningTests(): Promise<any[]> {
    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/ab-tests');
      if (res.success) return res.data.tests;
    }
    return [];
  },

  async getTestResults(testId: string): Promise<{
    results: ABTestResult[];
    winner?: string;
    significanceReached: boolean;
  } | null> {
    if (isWorkerConnected()) {
      const res = await trialFetch(`/api/trial/ab-tests/${testId}/results`);
      if (res.success) return res.data;
    }
    return null;
  },

  async createABTest(params: {
    name: string;
    description: string;
    parameter: string;
    variants: { id: ABTestVariant; name: string; value: any; trafficWeight: number }[];
    trafficPercent?: number;
  }): Promise<any> {
    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/ab-tests', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.success) return res.data.test;
    }
    return null;
  },

  // ── Cohort Stats (admin) ──
  async getCohortStats(): Promise<Record<CohortLabel, { count: number; conversionRate: number }> | null> {
    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/cohorts');
      if (res.success) return res.data.cohorts;
    }
    return null;
  },

  // ── Dashboard (admin) ──
  async getDashboard(): Promise<TrialDashboard | null> {
    if (isWorkerConnected()) {
      const res = await trialFetch('/api/trial/dashboard');
      if (res.success) return res.data;
    }
    return null;
  },

  // ── Sync local behavior to server ──
  async syncLocalBehavior(): Promise<number> {
    if (!isWorkerConnected()) return 0;
    const events = getLocalBehavior();
    if (events.length === 0) return 0;

    let synced = 0;
    for (const evt of events) {
      try {
        await trialFetch('/api/trial/behavior', {
          method: 'POST',
          body: JSON.stringify({
            event: evt.event,
            category: evt.category,
            sessionId: getSessionId(),
          }),
        });
        synced++;
      } catch { break; }
    }

    if (synced > 0) {
      // Remove synced events
      const remaining = events.slice(synced);
      localStorage.setItem(LOCAL_BEHAVIOR_KEY, JSON.stringify(remaining));
    }

    return synced;
  },
};

// ══════════════════════════════════════════════════════
// Trial Countdown Hook Helper
// ══════════════════════════════════════════════════════

export function formatTrialCountdown(hoursRemaining: number): string {
  if (hoursRemaining <= 0) return 'Expired';
  const days = Math.floor(hoursRemaining / 24);
  const hours = hoursRemaining % 24;
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export function getTrialUrgencyLevel(daysRemaining: number): 'relaxed' | 'attention' | 'urgent' | 'critical' {
  if (daysRemaining > 5) return 'relaxed';
  if (daysRemaining > 3) return 'attention';
  if (daysRemaining > 1) return 'urgent';
  return 'critical';
}

export function getTrialCTAMessage(daysRemaining: number, variant?: ABTestVariant): string {
  // A/B testable CTA messages
  if (variant === 'variant_a') {
    if (daysRemaining <= 1) return 'Last chance — upgrade now and keep everything you\'ve built';
    if (daysRemaining <= 3) return 'Your AI workforce is just getting started — lock in your plan';
    return 'Loving NexusHR? Upgrade anytime to unlock full power';
  }

  if (variant === 'variant_b') {
    if (daysRemaining <= 1) return `Only ${daysRemaining * 24} hours left! Don't lose your progress`;
    if (daysRemaining <= 3) return `${daysRemaining} days left — your team is counting on you`;
    return 'Ready to go pro? Plans start at $49/mo';
  }

  // Control
  if (daysRemaining <= 1) return 'Your trial ends today — upgrade to keep your AI employees working';
  if (daysRemaining <= 3) return `${daysRemaining} days left in your trial — explore upgrade options`;
  if (daysRemaining <= 5) return 'Your trial is halfway through — see our plans';
  return 'Enjoying your trial? Explore plans when you\'re ready';
}
