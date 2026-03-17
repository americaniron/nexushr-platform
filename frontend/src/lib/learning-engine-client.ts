/**
 * NexusHR Continuous Learning Engine — Frontend Client
 * Dual-mode: Worker backend primary, localStorage fallback.
 */

import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'star_rating' | 'correction' | 'regenerate' | 'accept' | 'edit_accepted' | 'ignore' | 'escalate';
export type LearningDomain = 'prompt_quality' | 'tool_selection' | 'workflow_efficiency' | 'delegation_accuracy' | 'response_quality' | 'compliance' | 'speed';
export type SkillLevel = 'novice' | 'competent' | 'proficient' | 'expert' | 'master';

export interface FeedbackEvent {
  id: string; org_id: string; user_id: string; role_id: string; task_id: string;
  conversation_id: string; feedback_type: FeedbackType; signal_source: string;
  score: number; dimensions: FeedbackDimension[]; correction_text: string | null;
  context: FeedbackContext; created_at: string;
}
export interface FeedbackDimension { domain: LearningDomain; score: number; weight: number; }
export interface FeedbackContext { prompt_variant_id: string | null; tool_chain: string[]; workflow_id: string | null; response_length: number; latency_ms: number; token_count: number; delegated_from: string | null; }

export interface PerformanceScore {
  role_id: string; org_id: string; period: string; overall_score: number;
  dimensions: Record<LearningDomain, DimensionScore>;
  task_count: number; feedback_count: number; trend: string; percentile_rank: number;
}
export interface DimensionScore { score: number; sample_count: number; trend: number; confidence: number; }

export interface PromptVariant {
  id: string; role_id: string; org_id: string; version: number; system_prompt: string;
  calibration_notes: string; status: string; scores: PromptVariantScores;
  traffic_percentage: number; created_at: string; retired_at: string | null;
}
export interface PromptVariantScores { total_uses: number; avg_score: number; thumbs_up_rate: number; correction_rate: number; regeneration_rate: number; avg_latency_ms: number; confidence_interval: { lower: number; upper: number }; }

export interface CalibrationExperiment {
  id: string; role_id: string; org_id: string; variants: string[];
  status: string; winner_id: string | null; min_samples: number;
  significance_level: number; started_at: string; completed_at: string | null;
  results: ExperimentResult[];
}
export interface ExperimentResult { variant_id: string; samples: number; avg_score: number; std_dev: number; confidence_interval: { lower: number; upper: number }; p_value: number | null; }

export interface WorkflowPattern {
  id: string; org_id: string; name: string; description: string;
  task_sequence: PatternStep[]; frequency: number; avg_score: number;
  success_rate: number; discovered_at: string; last_seen_at: string; status: string;
}
export interface PatternStep { order: number; role_id: string; action: string; tool: string; avg_duration_ms: number; }

export interface ToolPerformance { tool_id: string; role_id: string; org_id: string; total_uses: number; success_rate: number; avg_latency_ms: number; avg_user_score: number; error_rate: number; optimal_contexts: string[]; anti_patterns: string[]; }
export interface ToolRecommendation { task_type: string; recommended_tools: { tool_id: string; confidence: number; reason: string }[]; avoid_tools: { tool_id: string; reason: string }[]; }

export interface DelegationScore { role_id: string; task_type: string; org_id: string; score: number; sample_count: number; avg_quality: number; avg_speed_ms: number; success_rate: number; last_updated: string; }
export interface DelegationRecommendation { task_type: string; input_summary: string; rankings: { role_id: string; score: number; reason: string }[]; }

export interface SkillProfile {
  role_id: string; org_id: string; level: SkillLevel; experience_points: number;
  level_thresholds: Record<SkillLevel, number>;
  domain_skills: Record<LearningDomain, DomainSkill>;
  achievements: Achievement[]; evolution_history: EvolutionEvent[]; last_updated: string;
}
export interface DomainSkill { domain: LearningDomain; level: SkillLevel; xp: number; recent_trend: number; }
export interface Achievement { id: string; name: string; description: string; earned_at: string; }
export interface EvolutionEvent { from_level: SkillLevel; to_level: SkillLevel; domain: string; triggered_by: string; occurred_at: string; }

export interface FeedbackSummary { total: number; avg_score: number; by_type: Record<string, number>; trend: number; top_corrections: string[]; }
export interface LearningAnalytics { org_id: string; period: string; total_feedback_events: number; avg_satisfaction: number; top_improving_roles: { role_id: string; improvement: number }[]; top_declining_roles: { role_id: string; decline: number }[]; active_experiments: number; patterns_discovered: number; prompt_calibrations: number; skill_evolutions: number; }

// ══════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════

const API = '/api/learning';

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('nexushr_token');
  const res = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const learningClient = {
  // Feedback
  async submitFeedback(event: Partial<FeedbackEvent>): Promise<{ event: FeedbackEvent }> {
    return api('/feedback', { method: 'POST', body: JSON.stringify(event) });
  },
  async getFeedbackHistory(roleId: string, orgId?: string, limit = 50): Promise<{ history: FeedbackEvent[] }> {
    try { return await api(`/feedback/history?role_id=${roleId}${orgId ? `&org_id=${orgId}` : ''}&limit=${limit}`); } catch { return { history: [] }; }
  },
  async getFeedbackSummary(roleId: string, orgId?: string, days = 30): Promise<{ summary: FeedbackSummary }> {
    try { return await api(`/feedback/summary?role_id=${roleId}${orgId ? `&org_id=${orgId}` : ''}&days=${days}`); }
    catch { return { summary: { total: 0, avg_score: 0, by_type: {}, trend: 0, top_corrections: [] } }; }
  },

  // Performance
  async getPerformance(roleId: string, orgId?: string, period?: string): Promise<{ score: PerformanceScore | null }> {
    const params = new URLSearchParams({ role_id: roleId }); if (orgId) params.set('org_id', orgId); if (period) params.set('period', period);
    try { return await api(`/performance?${params}`); } catch { return { score: null }; }
  },
  async getPerformanceHistory(roleId: string, orgId?: string): Promise<{ history: PerformanceScore[] }> {
    try { return await api(`/performance/history?role_id=${roleId}${orgId ? `&org_id=${orgId}` : ''}`); } catch { return { history: [] }; }
  },
  async getLeaderboard(orgId?: string): Promise<{ leaderboard: PerformanceScore[] }> {
    try { return await api(`/performance/leaderboard${orgId ? `?org_id=${orgId}` : ''}`); } catch { return { leaderboard: [] }; }
  },

  // Prompt Calibration
  async getVariants(roleId: string, orgId?: string): Promise<{ variants: PromptVariant[] }> {
    try { return await api(`/prompts/variants?role_id=${roleId}${orgId ? `&org_id=${orgId}` : ''}`); } catch { return { variants: [] }; }
  },
  async createVariant(roleId: string, systemPrompt: string, notes?: string, orgId?: string): Promise<{ variant: PromptVariant }> {
    return api('/prompts/variants', { method: 'POST', body: JSON.stringify({ role_id: roleId, system_prompt: systemPrompt, notes, org_id: orgId }) });
  },
  async getActiveVariant(roleId: string, orgId?: string): Promise<{ variant: PromptVariant | null }> {
    try { return await api(`/prompts/active?role_id=${roleId}${orgId ? `&org_id=${orgId}` : ''}`); } catch { return { variant: null }; }
  },
  async startExperiment(roleId: string, variantIds: string[], minSamples = 100, orgId?: string): Promise<{ experiment: CalibrationExperiment }> {
    return api('/experiments', { method: 'POST', body: JSON.stringify({ role_id: roleId, variant_ids: variantIds, min_samples: minSamples, org_id: orgId }) });
  },
  async evaluateExperiment(id: string): Promise<{ experiment: CalibrationExperiment }> {
    return api(`/experiments/${id}/evaluate`, { method: 'POST' });
  },

  // Patterns
  async getPatterns(orgId?: string): Promise<{ patterns: WorkflowPattern[] }> {
    try { return await api(`/patterns${orgId ? `?org_id=${orgId}` : ''}`); } catch { return { patterns: [] }; }
  },
  async getPromotedPatterns(orgId?: string): Promise<{ patterns: WorkflowPattern[] }> {
    try { return await api(`/patterns/promoted${orgId ? `?org_id=${orgId}` : ''}`); } catch { return { patterns: [] }; }
  },
  async suggestWorkflow(taskType: string, orgId?: string): Promise<{ suggestions: WorkflowPattern[] }> {
    try { return await api(`/patterns/suggest?task_type=${taskType}${orgId ? `&org_id=${orgId}` : ''}`); } catch { return { suggestions: [] }; }
  },

  // Tools
  async getToolPerformance(toolId: string, roleId: string, orgId?: string): Promise<{ performance: ToolPerformance | null }> {
    try { return await api(`/tools/performance?tool_id=${toolId}&role_id=${roleId}${orgId ? `&org_id=${orgId}` : ''}`); } catch { return { performance: null }; }
  },
  async getToolRecommendations(roleId: string, orgId?: string): Promise<{ recommendations: ToolRecommendation[] }> {
    try { return await api(`/tools/recommendations?role_id=${roleId}${orgId ? `&org_id=${orgId}` : ''}`); } catch { return { recommendations: [] }; }
  },

  // Delegation
  async getDelegationRecommendation(taskType: string, orgId?: string): Promise<{ recommendation: DelegationRecommendation }> {
    try { return await api(`/delegation/recommend?task_type=${taskType}${orgId ? `&org_id=${orgId}` : ''}`); } catch { return { recommendation: { task_type: taskType, input_summary: '', rankings: [] } }; }
  },

  // Skills
  async getSkillProfile(roleId: string, orgId?: string): Promise<{ profile: SkillProfile | null }> {
    try { return await api(`/skills/profile?role_id=${roleId}${orgId ? `&org_id=${orgId}` : ''}`); } catch { return { profile: null }; }
  },
  async getOrgSkillProfiles(orgId?: string): Promise<{ profiles: SkillProfile[] }> {
    try { return await api(`/skills/org${orgId ? `?org_id=${orgId}` : ''}`); } catch { return { profiles: [] }; }
  },

  // Analytics
  async getAnalytics(orgId?: string, days = 30): Promise<{ analytics: LearningAnalytics }> {
    try { return await api(`/analytics${orgId ? `?org_id=${orgId}` : ''}${orgId ? '&' : '?'}days=${days}`); }
    catch { return { analytics: { org_id: '', period: '', total_feedback_events: 0, avg_satisfaction: 0, top_improving_roles: [], top_declining_roles: [], active_experiments: 0, patterns_discovered: 0, prompt_calibrations: 0, skill_evolutions: 0 } }; }
  },

  // Schema
  async initSchema(): Promise<{ success: boolean }> { return api('/schema', { method: 'POST' }); },
};

// ══════════════════════════════════════════════════════
// REACT HOOKS
// ══════════════════════════════════════════════════════

export function useFeedbackSummary(roleId: string, orgId?: string, days = 30) {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const { summary: s } = await learningClient.getFeedbackSummary(roleId, orgId, days); setSummary(s); } catch {}
    setLoading(false);
  }, [roleId, orgId, days]);
  useEffect(() => { refresh(); }, [refresh]);
  return { summary, loading, refresh };
}

export function usePerformanceScore(roleId: string, orgId?: string) {
  const [score, setScore] = useState<PerformanceScore | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    setLoading(true);
    try { const { score: s } = await learningClient.getPerformance(roleId, orgId); setScore(s); } catch {}
    setLoading(false);
  })(); }, [roleId, orgId]);
  return { score, loading };
}

export function usePerformanceHistory(roleId: string, orgId?: string) {
  const [history, setHistory] = useState<PerformanceScore[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { history: h } = await learningClient.getPerformanceHistory(roleId, orgId); setHistory(h); } catch {}
    setLoading(false);
  })(); }, [roleId, orgId]);
  return { history, loading };
}

export function useLeaderboard(orgId?: string) {
  const [leaderboard, setLeaderboard] = useState<PerformanceScore[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { leaderboard: l } = await learningClient.getLeaderboard(orgId); setLeaderboard(l); } catch {}
    setLoading(false);
  })(); }, [orgId]);
  return { leaderboard, loading };
}

export function usePromptVariants(roleId: string, orgId?: string) {
  const [variants, setVariants] = useState<PromptVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const { variants: v } = await learningClient.getVariants(roleId, orgId); setVariants(v); } catch {}
    setLoading(false);
  }, [roleId, orgId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { variants, loading, refresh };
}

export function useWorkflowPatterns(orgId?: string) {
  const [patterns, setPatterns] = useState<WorkflowPattern[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { patterns: p } = await learningClient.getPatterns(orgId); setPatterns(p); } catch {}
    setLoading(false);
  })(); }, [orgId]);
  return { patterns, loading };
}

export function useSkillProfile(roleId: string, orgId?: string) {
  const [profile, setProfile] = useState<SkillProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { profile: p } = await learningClient.getSkillProfile(roleId, orgId); setProfile(p); } catch {}
    setLoading(false);
  })(); }, [roleId, orgId]);
  return { profile, loading };
}

export function useDelegationRecommendation(taskType: string, orgId?: string) {
  const [recommendation, setRecommendation] = useState<DelegationRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    if (!taskType) return;
    try { const { recommendation: r } = await learningClient.getDelegationRecommendation(taskType, orgId); setRecommendation(r); } catch {}
    setLoading(false);
  })(); }, [taskType, orgId]);
  return { recommendation, loading };
}

export function useToolRecommendations(roleId: string, orgId?: string) {
  const [recommendations, setRecommendations] = useState<ToolRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { recommendations: r } = await learningClient.getToolRecommendations(roleId, orgId); setRecommendations(r); } catch {}
    setLoading(false);
  })(); }, [roleId, orgId]);
  return { recommendations, loading };
}

export function useLearningAnalytics(orgId?: string, days = 30) {
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { (async () => {
    try { const { analytics: a } = await learningClient.getAnalytics(orgId, days); setAnalytics(a); } catch {}
    setLoading(false);
  })(); }, [orgId, days]);
  return { analytics, loading };
}
