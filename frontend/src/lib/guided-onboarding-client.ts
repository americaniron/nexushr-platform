/**
 * NexusHR Guided Onboarding System — Frontend Client
 *
 * Dual-mode: Worker backend primary, localStorage fallback for offline.
 */

import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════
// TYPES (mirrored from Worker)
// ══════════════════════════════════════════════════════

export type OnboardingStepId =
  | 'welcome'
  | 'company_profile'
  | 'industry_select'
  | 'team_setup'
  | 'ai_employees'
  | 'integrations'
  | 'first_task'
  | 'dashboard_customize'
  | 'completed';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned';
export type CompanySize = 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
export type OnboardingGoal = 'automate_hr' | 'reduce_costs' | 'scale_operations' | 'compliance' | 'improve_hiring' | 'employee_engagement';

export interface OnboardingSession {
  id: string;
  user_id: string;
  org_id: string;
  status: OnboardingStatus;
  current_step: OnboardingStepId;
  steps_completed: OnboardingStepId[];
  company_profile: CompanyProfile | null;
  selected_vertical: string | null;
  selected_employees: string[];
  selected_integrations: string[];
  team_invites: TeamInvite[];
  first_task_completed: boolean;
  dashboard_configured: boolean;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  time_spent_seconds: number;
  drop_off_alerts: DropOffAlert[];
  metadata: Record<string, any>;
}

export interface CompanyProfile {
  name: string;
  industry: string;
  industry_sub: string;
  size: CompanySize;
  employee_count: number;
  goals: OnboardingGoal[];
  pain_points: string[];
  current_tools: string[];
  budget_range: string;
  timezone: string;
  country: string;
}

export interface TeamInvite {
  email: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  name: string;
  sent_at: string;
  accepted: boolean;
}

export interface DropOffAlert {
  step: OnboardingStepId;
  idle_seconds: number;
  triggered_at: string;
  action_taken: string;
}

export interface OnboardingRecommendation {
  vertical_id: string;
  confidence: number;
  reasons: string[];
  recommended_employees: RecommendedEmployee[];
  recommended_integrations: RecommendedIntegration[];
  estimated_time_savings_hours: number;
  estimated_cost_savings_monthly: number;
}

export interface RecommendedEmployee {
  employee_id: string;
  role: string;
  title: string;
  match_score: number;
  reason: string;
  priority: 'essential' | 'recommended' | 'optional';
}

export interface RecommendedIntegration {
  integration_id: string;
  name: string;
  icon: string;
  match_score: number;
  reason: string;
  auth_type: string;
  setup_time_minutes: number;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  subtitle: string;
  description: string;
  estimated_minutes: number;
  required: boolean;
  tips: string[];
  progress_weight: number;
}

export interface FirstTaskTemplate {
  id: string;
  vertical: string;
  title: string;
  description: string;
  estimated_minutes: number;
  employee_id: string;
  prompt_template: string;
  expected_outcome: string;
  success_criteria: string[];
  demo_mode: boolean;
}

export interface OnboardingMilestone {
  id: string;
  title: string;
  description: string;
  reward: string;
  achieved: boolean;
  achieved_at: string | null;
}

export interface OnboardingProgress {
  percentage: number;
  current_step: OnboardingStep | null;
  steps_remaining: number;
  estimated_minutes_remaining: number;
}

export interface OnboardingAnalytics {
  total_sessions: number;
  completion_rate: number;
  avg_completion_time_seconds: number;
  median_completion_time_seconds: number;
  drop_off_by_step: Record<OnboardingStepId, number>;
  most_selected_vertical: string;
  most_selected_employees: string[];
  conversion_to_paid: number;
  nps_score: number;
}

export interface DashboardConfig {
  layout: 'default' | 'compact' | 'wide';
  pinned_employees: string[];
  visible_widgets: string[];
  theme: 'light' | 'dark' | 'system';
  notifications: { email: boolean; in_app: boolean; slack: boolean };
}

// ══════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════

const API_BASE = '/api/onboarding';
const STORAGE_PREFIX = 'nexushr_onboarding_';

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
    console.warn('Onboarding API unavailable, using local fallback:', err);
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

export const onboardingClient = {
  // ── Steps ──

  async getSteps(): Promise<{ steps: OnboardingStep[] }> {
    try {
      const data = await apiCall<{ steps: OnboardingStep[] }>('/steps');
      setLocal('steps', data.steps);
      return data;
    } catch {
      return { steps: getLocal('steps', []) };
    }
  },

  async getStep(stepId: OnboardingStepId): Promise<{ step: OnboardingStep }> {
    try {
      return await apiCall<{ step: OnboardingStep }>(`/steps/${stepId}`);
    } catch {
      return { step: null as any };
    }
  },

  // ── Session ──

  async startOnboarding(orgId?: string): Promise<{ session: OnboardingSession }> {
    const data = await apiCall<{ session: OnboardingSession }>('/start', {
      method: 'POST',
      body: JSON.stringify({ org_id: orgId }),
    });
    setLocal('session', data.session);
    return data;
  },

  async getSession(): Promise<{ session: OnboardingSession | null }> {
    try {
      const data = await apiCall<{ session: OnboardingSession }>('/session');
      setLocal('session', data.session);
      return data;
    } catch {
      return { session: getLocal('session', null) };
    }
  },

  async getProgress(): Promise<{ progress: OnboardingProgress; milestones: OnboardingMilestone[] }> {
    try {
      const data = await apiCall<{ progress: OnboardingProgress; milestones: OnboardingMilestone[] }>('/progress');
      setLocal('progress', data);
      return data;
    } catch {
      return getLocal('progress', { progress: { percentage: 0, current_step: null, steps_remaining: 8, estimated_minutes_remaining: 10 }, milestones: [] });
    }
  },

  // ── Step Navigation ──

  async completeStep(stepId: OnboardingStepId, data?: Record<string, any>): Promise<{ session: OnboardingSession; progress: OnboardingProgress }> {
    const result = await apiCall<{ session: OnboardingSession; progress: OnboardingProgress }>('/complete-step', {
      method: 'POST',
      body: JSON.stringify({ step_id: stepId, data }),
    });
    setLocal('session', result.session);
    return result;
  },

  async skipStep(stepId: OnboardingStepId): Promise<{ session: OnboardingSession; progress: OnboardingProgress }> {
    const result = await apiCall<{ session: OnboardingSession; progress: OnboardingProgress }>('/skip-step', {
      method: 'POST',
      body: JSON.stringify({ step_id: stepId }),
    });
    setLocal('session', result.session);
    return result;
  },

  // ── Recommendations ──

  async detectIndustry(profile: CompanyProfile): Promise<{ recommendations: OnboardingRecommendation[] }> {
    try {
      const data = await apiCall<{ recommendations: OnboardingRecommendation[] }>('/detect-industry', {
        method: 'POST',
        body: JSON.stringify({ profile }),
      });
      setLocal('recommendations', data.recommendations);
      return data;
    } catch {
      return { recommendations: getLocal('recommendations', []) };
    }
  },

  // ── First Task ──

  async getFirstTasks(): Promise<{ templates: FirstTaskTemplate[] }> {
    try {
      const data = await apiCall<{ templates: FirstTaskTemplate[] }>('/first-tasks');
      setLocal('first_tasks', data.templates);
      return data;
    } catch {
      return { templates: getLocal('first_tasks', []) };
    }
  },

  async completeFirstTask(taskId: string, result: Record<string, any>): Promise<{ success: boolean; feedback: string; nextSteps: string[] }> {
    return apiCall('/first-tasks/complete', {
      method: 'POST',
      body: JSON.stringify({ task_id: taskId, result }),
    });
  },

  // ── Provisioning ──

  async provisionEmployees(employeeIds: string[], vertical: string, orgId?: string): Promise<{ provisioned: string[]; failed: string[]; message: string }> {
    return apiCall('/provision-employees', {
      method: 'POST',
      body: JSON.stringify({ employee_ids: employeeIds, vertical, org_id: orgId }),
    });
  },

  // ── Team ──

  async inviteTeam(invites: Omit<TeamInvite, 'sent_at' | 'accepted'>[]): Promise<{ sent: number; failed: number }> {
    return apiCall('/invite-team', {
      method: 'POST',
      body: JSON.stringify({ invites }),
    });
  },

  // ── Dashboard ──

  async configureDashboard(config: DashboardConfig): Promise<{ success: boolean }> {
    return apiCall('/dashboard', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  },

  // ── Milestones ──

  async getMilestones(): Promise<{ milestones: OnboardingMilestone[] }> {
    try {
      const data = await apiCall<{ milestones: OnboardingMilestone[] }>('/milestones');
      setLocal('milestones', data.milestones);
      return data;
    } catch {
      return { milestones: getLocal('milestones', []) };
    }
  },

  // ── Re-engagement ──

  async checkDropOff(): Promise<{ needs_reengagement: boolean; drip_message: any }> {
    try {
      return await apiCall('/check-dropoff');
    } catch {
      return { needs_reengagement: false, drip_message: null };
    }
  },

  // ── Analytics ──

  async getAnalytics(orgId?: string): Promise<{ analytics: OnboardingAnalytics }> {
    const params = orgId ? `?org_id=${orgId}` : '';
    try {
      return await apiCall(`/analytics${params}`);
    } catch {
      return { analytics: getLocal('analytics', null as any) };
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

export function useOnboardingSession() {
  const [session, setSession] = useState<OnboardingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { session: data } = await onboardingClient.getSession();
      setSession(data);
      setError(null);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, []);

  const start = useCallback(async (orgId?: string) => {
    try {
      const { session: data } = await onboardingClient.startOnboarding(orgId);
      setSession(data);
      return data;
    } catch (e: any) { setError(e.message); return null; }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { session, loading, error, refresh, start };
}

export function useOnboardingProgress() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [milestones, setMilestones] = useState<OnboardingMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await onboardingClient.getProgress();
      setProgress(data.progress);
      setMilestones(data.milestones);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { progress, milestones, loading, refresh };
}

export function useOnboardingSteps() {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { steps: data } = await onboardingClient.getSteps();
        setSteps(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return { steps, loading };
}

export function useStepNavigation() {
  const [navigating, setNavigating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeStep = useCallback(async (stepId: OnboardingStepId, data?: Record<string, any>) => {
    setNavigating(true);
    setError(null);
    try {
      const result = await onboardingClient.completeStep(stepId, data);
      setNavigating(false);
      return result;
    } catch (e: any) {
      setError(e.message);
      setNavigating(false);
      return null;
    }
  }, []);

  const skipStep = useCallback(async (stepId: OnboardingStepId) => {
    setNavigating(true);
    setError(null);
    try {
      const result = await onboardingClient.skipStep(stepId);
      setNavigating(false);
      return result;
    } catch (e: any) {
      setError(e.message);
      setNavigating(false);
      return null;
    }
  }, []);

  return { completeStep, skipStep, navigating, error };
}

export function useIndustryDetection() {
  const [recommendations, setRecommendations] = useState<OnboardingRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const detect = useCallback(async (profile: CompanyProfile) => {
    setLoading(true);
    try {
      const { recommendations: data } = await onboardingClient.detectIndustry(profile);
      setRecommendations(data);
    } catch {}
    setLoading(false);
  }, []);

  return { recommendations, loading, detect };
}

export function useFirstTask() {
  const [templates, setTemplates] = useState<FirstTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { templates: data } = await onboardingClient.getFirstTasks();
        setTemplates(data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const complete = useCallback(async (taskId: string, result: Record<string, any>) => {
    setCompleting(true);
    try {
      const feedback = await onboardingClient.completeFirstTask(taskId, result);
      setCompleting(false);
      return feedback;
    } catch (e: any) {
      setCompleting(false);
      return null;
    }
  }, []);

  return { templates, loading, completing, complete };
}

export function useTeamInvites() {
  const [sending, setSending] = useState(false);

  const invite = useCallback(async (invites: Omit<TeamInvite, 'sent_at' | 'accepted'>[]) => {
    setSending(true);
    try {
      const result = await onboardingClient.inviteTeam(invites);
      setSending(false);
      return result;
    } catch {
      setSending(false);
      return null;
    }
  }, []);

  return { invite, sending };
}

export function useOnboardingAnalytics(orgId?: string) {
  const [analytics, setAnalytics] = useState<OnboardingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { analytics: data } = await onboardingClient.getAnalytics(orgId);
        setAnalytics(data);
      } catch {}
      setLoading(false);
    })();
  }, [orgId]);

  return { analytics, loading };
}

export function useDropOffCheck() {
  const [needsReengagement, setNeedsReengagement] = useState(false);
  const [dripMessage, setDripMessage] = useState<any>(null);

  const check = useCallback(async () => {
    try {
      const data = await onboardingClient.checkDropOff();
      setNeedsReengagement(data.needs_reengagement);
      setDripMessage(data.drip_message);
    } catch {}
  }, []);

  useEffect(() => { check(); }, [check]);
  return { needsReengagement, dripMessage, check };
}
