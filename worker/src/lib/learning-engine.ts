/**
 * NexusHR Continuous Learning Engine — Feature #27
 *
 * Enables AI employees to improve over time through:
 * 1. Performance Scoring — multi-dimensional scoring per task, role, user
 * 2. Reinforcement Feedback Loops — thumbs up/down, star ratings, corrections, implicit signals
 * 3. Workflow Pattern Learning — identifies successful task sequences, builds pattern library
 * 4. Prompt Calibration — A/B tests prompt variants, evolves system prompts via scored generations
 * 5. Tool Usage Optimization — tracks tool success rates, recommends optimal tool chains
 * 6. Skill Evolution Model — levels up AI employees through experience thresholds
 * 7. Delegation Scoring — learns which AI employee handles which task type best
 *
 * Architecture:
 * - Feedback ingestion → scoring → pattern extraction → prompt tuning → skill evolution
 * - All learning is org-scoped (tenant isolation) with global anonymized aggregates
 * - Backward-compatible: existing roles/pipelines work unchanged; learning overlays on top
 */

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

export type FeedbackType = 'thumbs_up' | 'thumbs_down' | 'star_rating' | 'correction' | 'regenerate' | 'accept' | 'edit_accepted' | 'ignore' | 'escalate';
export type SignalSource = 'explicit' | 'implicit' | 'system' | 'peer_review';
export type LearningDomain = 'prompt_quality' | 'tool_selection' | 'workflow_efficiency' | 'delegation_accuracy' | 'response_quality' | 'compliance' | 'speed';
export type SkillLevel = 'novice' | 'competent' | 'proficient' | 'expert' | 'master';
export type CalibrationStatus = 'candidate' | 'testing' | 'winning' | 'retired' | 'baseline';

// ── Feedback ──

export interface FeedbackEvent {
  id: string;
  org_id: string;
  user_id: string;
  role_id: string;
  task_id: string;
  conversation_id: string;
  feedback_type: FeedbackType;
  signal_source: SignalSource;
  score: number;                    // normalized 0-1
  dimensions: FeedbackDimension[];
  correction_text: string | null;   // user-provided correction
  context: FeedbackContext;
  created_at: string;
}

export interface FeedbackDimension {
  domain: LearningDomain;
  score: number;     // 0-1
  weight: number;    // importance multiplier
}

export interface FeedbackContext {
  prompt_variant_id: string | null;
  tool_chain: string[];
  workflow_id: string | null;
  response_length: number;
  latency_ms: number;
  token_count: number;
  delegated_from: string | null;
}

// ── Performance Scoring ──

export interface PerformanceScore {
  role_id: string;
  org_id: string;
  period: string;               // YYYY-MM or YYYY-WW
  overall_score: number;        // 0-100
  dimensions: Record<LearningDomain, DimensionScore>;
  task_count: number;
  feedback_count: number;
  trend: 'improving' | 'stable' | 'declining';
  percentile_rank: number;      // vs other orgs (anonymized)
}

export interface DimensionScore {
  score: number;
  sample_count: number;
  trend: number;       // delta from previous period
  confidence: number;  // 0-1 based on sample size
}

// ── Prompt Calibration ──

export interface PromptVariant {
  id: string;
  role_id: string;
  org_id: string;
  version: number;
  system_prompt: string;
  calibration_notes: string;
  status: CalibrationStatus;
  scores: PromptVariantScores;
  traffic_percentage: number;    // 0-100
  created_at: string;
  retired_at: string | null;
}

export interface PromptVariantScores {
  total_uses: number;
  avg_score: number;
  thumbs_up_rate: number;
  correction_rate: number;
  regeneration_rate: number;
  avg_latency_ms: number;
  confidence_interval: { lower: number; upper: number };
}

export interface CalibrationExperiment {
  id: string;
  role_id: string;
  org_id: string;
  variants: string[];            // variant IDs
  status: 'running' | 'completed' | 'cancelled';
  winner_id: string | null;
  min_samples: number;
  significance_level: number;    // e.g., 0.95
  started_at: string;
  completed_at: string | null;
  results: ExperimentResult[];
}

export interface ExperimentResult {
  variant_id: string;
  samples: number;
  avg_score: number;
  std_dev: number;
  confidence_interval: { lower: number; upper: number };
  p_value: number | null;
}

// ── Workflow Pattern Learning ──

export interface WorkflowPattern {
  id: string;
  org_id: string;
  name: string;
  description: string;
  task_sequence: PatternStep[];
  frequency: number;
  avg_score: number;
  success_rate: number;
  discovered_at: string;
  last_seen_at: string;
  status: 'discovered' | 'validated' | 'promoted' | 'deprecated';
}

export interface PatternStep {
  order: number;
  role_id: string;
  action: string;
  tool: string;
  avg_duration_ms: number;
}

// ── Tool Usage Optimization ──

export interface ToolPerformance {
  tool_id: string;
  role_id: string;
  org_id: string;
  total_uses: number;
  success_rate: number;
  avg_latency_ms: number;
  avg_user_score: number;
  error_rate: number;
  optimal_contexts: string[];
  anti_patterns: string[];
}

export interface ToolRecommendation {
  task_type: string;
  recommended_tools: { tool_id: string; confidence: number; reason: string }[];
  avoid_tools: { tool_id: string; reason: string }[];
}

// ── Delegation Scoring ──

export interface DelegationScore {
  role_id: string;
  task_type: string;
  org_id: string;
  score: number;           // 0-1 affinity
  sample_count: number;
  avg_quality: number;
  avg_speed_ms: number;
  success_rate: number;
  last_updated: string;
}

export interface DelegationRecommendation {
  task_type: string;
  input_summary: string;
  rankings: { role_id: string; score: number; reason: string }[];
}

// ── Skill Evolution ──

export interface SkillProfile {
  role_id: string;
  org_id: string;
  level: SkillLevel;
  experience_points: number;
  level_thresholds: Record<SkillLevel, number>;
  domain_skills: Record<LearningDomain, DomainSkill>;
  achievements: Achievement[];
  evolution_history: EvolutionEvent[];
  last_updated: string;
}

export interface DomainSkill {
  domain: LearningDomain;
  level: SkillLevel;
  xp: number;
  recent_trend: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  earned_at: string;
}

export interface EvolutionEvent {
  from_level: SkillLevel;
  to_level: SkillLevel;
  domain: LearningDomain | 'overall';
  triggered_by: string;
  occurred_at: string;
}

// ── Learning Analytics ──

export interface LearningAnalytics {
  org_id: string;
  period: string;
  total_feedback_events: number;
  avg_satisfaction: number;
  top_improving_roles: { role_id: string; improvement: number }[];
  top_declining_roles: { role_id: string; decline: number }[];
  active_experiments: number;
  patterns_discovered: number;
  prompt_calibrations: number;
  skill_evolutions: number;
}

// ══════════════════════════════════════════════════════
// SCORING CONSTANTS
// ══════════════════════════════════════════════════════

const FEEDBACK_SCORES: Record<FeedbackType, number> = {
  thumbs_up: 1.0,
  accept: 0.9,
  edit_accepted: 0.7,
  star_rating: 0,    // uses actual rating
  correction: 0.3,
  regenerate: 0.2,
  ignore: 0.1,
  thumbs_down: 0.0,
  escalate: 0.0,
};

const DOMAIN_WEIGHTS: Record<LearningDomain, number> = {
  response_quality: 0.25,
  prompt_quality: 0.20,
  tool_selection: 0.15,
  workflow_efficiency: 0.15,
  delegation_accuracy: 0.10,
  compliance: 0.10,
  speed: 0.05,
};

const SKILL_THRESHOLDS: Record<SkillLevel, number> = {
  novice: 0,
  competent: 100,
  proficient: 500,
  expert: 2000,
  master: 10000,
};

const XP_PER_FEEDBACK: Record<FeedbackType, number> = {
  thumbs_up: 10,
  accept: 8,
  edit_accepted: 5,
  star_rating: 6,
  correction: 2,
  regenerate: 1,
  ignore: 0,
  thumbs_down: -3,
  escalate: -5,
};

// ══════════════════════════════════════════════════════
// FEEDBACK INGESTION SYSTEM
// ══════════════════════════════════════════════════════

export class FeedbackIngestionSystem {
  constructor(private db: any, private kv: any) {}

  async ingestFeedback(event: Omit<FeedbackEvent, 'id' | 'created_at'>): Promise<FeedbackEvent> {
    const full: FeedbackEvent = {
      ...event,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    // Normalize score
    if (event.feedback_type === 'star_rating') {
      full.score = event.score; // already 0-1 (1-5 stars mapped)
    } else {
      full.score = FEEDBACK_SCORES[event.feedback_type];
    }

    // Auto-generate dimensions from context if not provided
    if (full.dimensions.length === 0) {
      full.dimensions = this.inferDimensions(full);
    }

    // Persist
    await this.db.prepare(`
      INSERT INTO learning_feedback (id, org_id, user_id, role_id, task_id, conversation_id,
        feedback_type, signal_source, score, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      full.id, full.org_id, full.user_id, full.role_id, full.task_id,
      full.conversation_id, full.feedback_type, full.signal_source,
      full.score, JSON.stringify(full), full.created_at
    ).run();

    // Async side effects (non-blocking)
    this.processFeedbackEffects(full).catch(console.error);

    return full;
  }

  private inferDimensions(event: FeedbackEvent): FeedbackDimension[] {
    const dims: FeedbackDimension[] = [];
    dims.push({ domain: 'response_quality', score: event.score, weight: DOMAIN_WEIGHTS.response_quality });

    if (event.context.latency_ms > 0) {
      // Speed score: < 2s = 1.0, > 10s = 0.2, linear between
      const speedScore = Math.max(0.2, Math.min(1.0, 1.0 - (event.context.latency_ms - 2000) / 8000));
      dims.push({ domain: 'speed', score: speedScore, weight: DOMAIN_WEIGHTS.speed });
    }
    if (event.context.tool_chain.length > 0) {
      dims.push({ domain: 'tool_selection', score: event.score, weight: DOMAIN_WEIGHTS.tool_selection });
    }
    if (event.context.delegated_from) {
      dims.push({ domain: 'delegation_accuracy', score: event.score, weight: DOMAIN_WEIGHTS.delegation_accuracy });
    }
    dims.push({ domain: 'prompt_quality', score: event.score, weight: DOMAIN_WEIGHTS.prompt_quality });

    return dims;
  }

  private async processFeedbackEffects(event: FeedbackEvent): Promise<void> {
    const scoring = new PerformanceScoringEngine(this.db, this.kv);
    const skills = new SkillEvolutionEngine(this.db, this.kv);

    // Update performance scores
    await scoring.updateFromFeedback(event);

    // Award XP and check for level-ups
    await skills.awardXP(event.role_id, event.org_id, event.feedback_type, event.dimensions);

    // Update delegation scores
    if (event.context.delegated_from || event.task_id) {
      const delegation = new DelegationScoringEngine(this.db, this.kv);
      await delegation.updateFromFeedback(event);
    }

    // Update tool performance
    if (event.context.tool_chain.length > 0) {
      const tools = new ToolOptimizationEngine(this.db, this.kv);
      await tools.updateFromFeedback(event);
    }

    // Feed into prompt calibration
    if (event.context.prompt_variant_id) {
      const calibration = new PromptCalibrationEngine(this.db, this.kv);
      await calibration.recordVariantFeedback(event.context.prompt_variant_id, event.score, event.feedback_type);
    }
  }

  async getFeedbackHistory(roleId: string, orgId: string, limit = 50): Promise<FeedbackEvent[]> {
    const rows = await this.db.prepare(`
      SELECT data FROM learning_feedback WHERE role_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT ?
    `).bind(roleId, orgId, limit).all();
    return (rows.results || []).map((r: any) => JSON.parse(r.data));
  }

  async getFeedbackSummary(roleId: string, orgId: string, days = 30): Promise<{
    total: number; avg_score: number; by_type: Record<string, number>;
    trend: number; top_corrections: string[];
  }> {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const rows = await this.db.prepare(`
      SELECT data FROM learning_feedback WHERE role_id = ? AND org_id = ? AND created_at > ? ORDER BY created_at DESC
    `).bind(roleId, orgId, cutoff).all();

    const events: FeedbackEvent[] = (rows.results || []).map((r: any) => JSON.parse(r.data));
    if (events.length === 0) return { total: 0, avg_score: 0, by_type: {}, trend: 0, top_corrections: [] };

    const byType: Record<string, number> = {};
    let totalScore = 0;
    const corrections: string[] = [];

    for (const e of events) {
      byType[e.feedback_type] = (byType[e.feedback_type] || 0) + 1;
      totalScore += e.score;
      if (e.correction_text) corrections.push(e.correction_text);
    }

    // Trend: compare first half vs second half
    const mid = Math.floor(events.length / 2);
    const firstHalf = events.slice(mid).reduce((a, e) => a + e.score, 0) / Math.max(1, events.length - mid);
    const secondHalf = events.slice(0, mid).reduce((a, e) => a + e.score, 0) / Math.max(1, mid);
    const trend = secondHalf - firstHalf;

    return {
      total: events.length,
      avg_score: totalScore / events.length,
      by_type: byType,
      trend: Math.round(trend * 100) / 100,
      top_corrections: corrections.slice(0, 10),
    };
  }
}

// ══════════════════════════════════════════════════════
// PERFORMANCE SCORING ENGINE
// ══════════════════════════════════════════════════════

export class PerformanceScoringEngine {
  constructor(private db: any, private kv: any) {}

  async updateFromFeedback(event: FeedbackEvent): Promise<void> {
    const period = this.getCurrentPeriod();
    const cacheKey = `perf:${event.role_id}:${event.org_id}:${period}`;

    let score = await this.getScore(event.role_id, event.org_id, period);
    if (!score) {
      score = this.initScore(event.role_id, event.org_id, period);
    }

    // Update dimension scores with exponential moving average
    const alpha = 0.1; // smoothing factor
    for (const dim of event.dimensions) {
      const ds = score.dimensions[dim.domain];
      ds.score = ds.sample_count === 0 ? dim.score : ds.score * (1 - alpha) + dim.score * alpha;
      ds.sample_count++;
      ds.confidence = Math.min(1, ds.sample_count / 50); // 50 samples = full confidence
    }

    // Recalculate overall score
    let weighted = 0;
    let totalWeight = 0;
    for (const [domain, ds] of Object.entries(score.dimensions)) {
      const w = DOMAIN_WEIGHTS[domain as LearningDomain] * ds.confidence;
      weighted += ds.score * w;
      totalWeight += w;
    }
    score.overall_score = totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) : 50;
    score.task_count++;
    score.feedback_count++;

    // Persist
    await this.db.prepare(`
      INSERT OR REPLACE INTO learning_performance (role_id, org_id, period, data, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(event.role_id, event.org_id, period, JSON.stringify(score), new Date().toISOString()).run();

    await this.kv.put(cacheKey, JSON.stringify(score), { expirationTtl: 3600 });
  }

  async getScore(roleId: string, orgId: string, period?: string): Promise<PerformanceScore | null> {
    const p = period || this.getCurrentPeriod();
    const cached = await this.kv.get(`perf:${roleId}:${orgId}:${p}`);
    if (cached) return JSON.parse(cached);

    const row = await this.db.prepare(`SELECT data FROM learning_performance WHERE role_id = ? AND org_id = ? AND period = ?`)
      .bind(roleId, orgId, p).first();
    return row ? JSON.parse(row.data as string) : null;
  }

  async getScoreHistory(roleId: string, orgId: string, periods = 12): Promise<PerformanceScore[]> {
    const rows = await this.db.prepare(`
      SELECT data FROM learning_performance WHERE role_id = ? AND org_id = ? ORDER BY period DESC LIMIT ?
    `).bind(roleId, orgId, periods).all();
    return (rows.results || []).map((r: any) => JSON.parse(r.data));
  }

  async getLeaderboard(orgId: string, period?: string): Promise<PerformanceScore[]> {
    const p = period || this.getCurrentPeriod();
    const rows = await this.db.prepare(`
      SELECT data FROM learning_performance WHERE org_id = ? AND period = ? ORDER BY json_extract(data, '$.overall_score') DESC LIMIT 50
    `).bind(orgId, p).all();
    return (rows.results || []).map((r: any) => JSON.parse(r.data));
  }

  private initScore(roleId: string, orgId: string, period: string): PerformanceScore {
    const dims: Record<LearningDomain, DimensionScore> = {} as any;
    for (const domain of Object.keys(DOMAIN_WEIGHTS) as LearningDomain[]) {
      dims[domain] = { score: 0.5, sample_count: 0, trend: 0, confidence: 0 };
    }
    return {
      role_id: roleId, org_id: orgId, period, overall_score: 50,
      dimensions: dims, task_count: 0, feedback_count: 0,
      trend: 'stable', percentile_rank: 50,
    };
  }

  private getCurrentPeriod(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}

// ══════════════════════════════════════════════════════
// PROMPT CALIBRATION ENGINE
// ══════════════════════════════════════════════════════

export class PromptCalibrationEngine {
  constructor(private db: any, private kv: any) {}

  async createVariant(roleId: string, orgId: string, systemPrompt: string, notes: string): Promise<PromptVariant> {
    const existing = await this.getVariants(roleId, orgId);
    const version = existing.length + 1;

    const variant: PromptVariant = {
      id: crypto.randomUUID(),
      role_id: roleId,
      org_id: orgId,
      version,
      system_prompt: systemPrompt,
      calibration_notes: notes,
      status: 'candidate',
      scores: { total_uses: 0, avg_score: 0, thumbs_up_rate: 0, correction_rate: 0, regeneration_rate: 0, avg_latency_ms: 0, confidence_interval: { lower: 0, upper: 1 } },
      traffic_percentage: 0,
      created_at: new Date().toISOString(),
      retired_at: null,
    };

    await this.db.prepare(`
      INSERT INTO prompt_variants (id, role_id, org_id, version, status, data, created_at)
      VALUES (?, ?, ?, ?, 'candidate', ?, ?)
    `).bind(variant.id, roleId, orgId, version, JSON.stringify(variant), variant.created_at).run();

    return variant;
  }

  async recordVariantFeedback(variantId: string, score: number, feedbackType: FeedbackType): Promise<void> {
    const row = await this.db.prepare(`SELECT data FROM prompt_variants WHERE id = ?`).bind(variantId).first();
    if (!row) return;

    const variant: PromptVariant = JSON.parse(row.data as string);
    const s = variant.scores;
    s.total_uses++;

    // Incremental mean update
    s.avg_score = s.avg_score + (score - s.avg_score) / s.total_uses;

    if (feedbackType === 'thumbs_up') s.thumbs_up_rate = (s.thumbs_up_rate * (s.total_uses - 1) + 1) / s.total_uses;
    else s.thumbs_up_rate = (s.thumbs_up_rate * (s.total_uses - 1)) / s.total_uses;

    if (feedbackType === 'correction') s.correction_rate = (s.correction_rate * (s.total_uses - 1) + 1) / s.total_uses;
    else s.correction_rate = (s.correction_rate * (s.total_uses - 1)) / s.total_uses;

    if (feedbackType === 'regenerate') s.regeneration_rate = (s.regeneration_rate * (s.total_uses - 1) + 1) / s.total_uses;
    else s.regeneration_rate = (s.regeneration_rate * (s.total_uses - 1)) / s.total_uses;

    // Wilson score confidence interval
    const n = s.total_uses;
    const z = 1.96; // 95% CI
    const phat = s.avg_score;
    const denom = 1 + z * z / n;
    s.confidence_interval = {
      lower: Math.max(0, (phat + z * z / (2 * n) - z * Math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)) / denom),
      upper: Math.min(1, (phat + z * z / (2 * n) + z * Math.sqrt((phat * (1 - phat) + z * z / (4 * n)) / n)) / denom),
    };

    await this.db.prepare(`UPDATE prompt_variants SET data = ? WHERE id = ?`).bind(JSON.stringify(variant), variantId).run();
  }

  async startExperiment(roleId: string, orgId: string, variantIds: string[], minSamples = 100): Promise<CalibrationExperiment> {
    // Set traffic split
    const split = Math.floor(100 / variantIds.length);
    for (const vid of variantIds) {
      const row = await this.db.prepare(`SELECT data FROM prompt_variants WHERE id = ?`).bind(vid).first();
      if (row) {
        const v: PromptVariant = JSON.parse(row.data as string);
        v.status = 'testing';
        v.traffic_percentage = split;
        await this.db.prepare(`UPDATE prompt_variants SET status = 'testing', data = ? WHERE id = ?`).bind(JSON.stringify(v), vid).run();
      }
    }

    const experiment: CalibrationExperiment = {
      id: crypto.randomUUID(),
      role_id: roleId,
      org_id: orgId,
      variants: variantIds,
      status: 'running',
      winner_id: null,
      min_samples: minSamples,
      significance_level: 0.95,
      started_at: new Date().toISOString(),
      completed_at: null,
      results: [],
    };

    await this.db.prepare(`
      INSERT INTO calibration_experiments (id, role_id, org_id, status, data, started_at)
      VALUES (?, ?, ?, 'running', ?, ?)
    `).bind(experiment.id, roleId, orgId, JSON.stringify(experiment), experiment.started_at).run();

    return experiment;
  }

  async evaluateExperiment(experimentId: string): Promise<CalibrationExperiment> {
    const row = await this.db.prepare(`SELECT data FROM calibration_experiments WHERE id = ?`).bind(experimentId).first();
    if (!row) throw new Error('Experiment not found');

    const exp: CalibrationExperiment = JSON.parse(row.data as string);
    exp.results = [];

    // Gather scores for each variant
    for (const vid of exp.variants) {
      const vRow = await this.db.prepare(`SELECT data FROM prompt_variants WHERE id = ?`).bind(vid).first();
      if (!vRow) continue;
      const v: PromptVariant = JSON.parse(vRow.data as string);

      exp.results.push({
        variant_id: vid,
        samples: v.scores.total_uses,
        avg_score: v.scores.avg_score,
        std_dev: 0, // would need raw data for exact std dev
        confidence_interval: v.scores.confidence_interval,
        p_value: null,
      });
    }

    // Check if we have enough samples
    const allReady = exp.results.every(r => r.samples >= exp.min_samples);
    if (allReady && exp.results.length >= 2) {
      // Simple winner: highest lower CI bound (conservative)
      const sorted = [...exp.results].sort((a, b) => b.confidence_interval.lower - a.confidence_interval.lower);
      const winner = sorted[0];

      // Check non-overlap of CIs
      const runnerUp = sorted[1];
      if (winner.confidence_interval.lower > runnerUp.confidence_interval.upper) {
        exp.winner_id = winner.variant_id;
        exp.status = 'completed';
        exp.completed_at = new Date().toISOString();

        // Promote winner, retire losers
        for (const r of exp.results) {
          const status = r.variant_id === exp.winner_id ? 'winning' : 'retired';
          await this.db.prepare(`
            UPDATE prompt_variants SET status = ? WHERE id = ?
          `).bind(status, r.variant_id).run();
        }
      }
    }

    await this.db.prepare(`UPDATE calibration_experiments SET data = ?, status = ? WHERE id = ?`)
      .bind(JSON.stringify(exp), exp.status, experimentId).run();

    return exp;
  }

  async getVariants(roleId: string, orgId: string): Promise<PromptVariant[]> {
    const rows = await this.db.prepare(`SELECT data FROM prompt_variants WHERE role_id = ? AND org_id = ? ORDER BY version DESC`)
      .bind(roleId, orgId).all();
    return (rows.results || []).map((r: any) => JSON.parse(r.data));
  }

  async getActiveVariant(roleId: string, orgId: string): Promise<PromptVariant | null> {
    // Return winning variant, or highest-traffic testing variant, or baseline
    const rows = await this.db.prepare(`
      SELECT data FROM prompt_variants WHERE role_id = ? AND org_id = ? AND status IN ('winning', 'testing', 'baseline')
      ORDER BY CASE status WHEN 'winning' THEN 1 WHEN 'testing' THEN 2 ELSE 3 END LIMIT 1
    `).bind(roleId, orgId).all();

    if ((rows.results || []).length > 0) return JSON.parse((rows.results as any)[0].data);
    return null;
  }

  async selectVariantForRequest(roleId: string, orgId: string): Promise<PromptVariant | null> {
    const variants = await this.getVariants(roleId, orgId);
    const testing = variants.filter(v => v.status === 'testing');

    if (testing.length === 0) {
      return variants.find(v => v.status === 'winning') || variants.find(v => v.status === 'baseline') || null;
    }

    // Weighted random selection by traffic_percentage
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const v of testing) {
      cumulative += v.traffic_percentage;
      if (roll <= cumulative) return v;
    }

    return testing[testing.length - 1];
  }
}

// ══════════════════════════════════════════════════════
// WORKFLOW PATTERN LEARNING ENGINE
// ══════════════════════════════════════════════════════

export class WorkflowPatternEngine {
  constructor(private db: any, private kv: any) {}

  async recordTaskSequence(orgId: string, sequence: PatternStep[], score: number): Promise<void> {
    if (sequence.length < 2) return; // need at least 2 steps for a pattern

    const fingerprint = sequence.map(s => `${s.role_id}:${s.action}:${s.tool}`).join('→');
    const existing = await this.findPattern(orgId, fingerprint);

    if (existing) {
      // Update existing pattern
      existing.frequency++;
      existing.avg_score = existing.avg_score + (score - existing.avg_score) / existing.frequency;
      existing.success_rate = score >= 0.7 ? existing.success_rate + (1 - existing.success_rate) / existing.frequency : existing.success_rate - existing.success_rate / existing.frequency;
      existing.last_seen_at = new Date().toISOString();

      // Auto-promote patterns with high frequency and score
      if (existing.frequency >= 20 && existing.avg_score >= 0.8 && existing.status === 'discovered') {
        existing.status = 'validated';
      }
      if (existing.frequency >= 100 && existing.avg_score >= 0.85 && existing.status === 'validated') {
        existing.status = 'promoted';
      }

      await this.db.prepare(`UPDATE workflow_patterns SET data = ? WHERE id = ?`)
        .bind(JSON.stringify(existing), existing.id).run();
    } else {
      // New pattern
      const pattern: WorkflowPattern = {
        id: crypto.randomUUID(),
        org_id: orgId,
        name: `Pattern: ${sequence.map(s => s.action).join(' → ')}`,
        description: `Discovered sequence of ${sequence.length} steps`,
        task_sequence: sequence,
        frequency: 1,
        avg_score: score,
        success_rate: score >= 0.7 ? 1 : 0,
        discovered_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        status: 'discovered',
      };

      await this.db.prepare(`
        INSERT INTO workflow_patterns (id, org_id, fingerprint, data, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(pattern.id, orgId, fingerprint, JSON.stringify(pattern), pattern.discovered_at).run();
    }
  }

  private async findPattern(orgId: string, fingerprint: string): Promise<WorkflowPattern | null> {
    const row = await this.db.prepare(`SELECT data FROM workflow_patterns WHERE org_id = ? AND fingerprint = ?`)
      .bind(orgId, fingerprint).first();
    return row ? JSON.parse(row.data as string) : null;
  }

  async getTopPatterns(orgId: string, limit = 20): Promise<WorkflowPattern[]> {
    const rows = await this.db.prepare(`
      SELECT data FROM workflow_patterns WHERE org_id = ? ORDER BY json_extract(data, '$.frequency') DESC LIMIT ?
    `).bind(orgId, limit).all();
    return (rows.results || []).map((r: any) => JSON.parse(r.data));
  }

  async getPromotedPatterns(orgId: string): Promise<WorkflowPattern[]> {
    const rows = await this.db.prepare(`
      SELECT data FROM workflow_patterns WHERE org_id = ? AND json_extract(data, '$.status') = 'promoted'
    `).bind(orgId).all();
    return (rows.results || []).map((r: any) => JSON.parse(r.data));
  }

  async suggestWorkflow(orgId: string, taskType: string): Promise<WorkflowPattern[]> {
    // Find patterns that contain the task type in their steps
    const rows = await this.db.prepare(`
      SELECT data FROM workflow_patterns WHERE org_id = ? AND json_extract(data, '$.status') IN ('validated', 'promoted')
      ORDER BY json_extract(data, '$.avg_score') DESC LIMIT 5
    `).bind(orgId).all();

    return (rows.results || []).map((r: any) => JSON.parse(r.data))
      .filter((p: WorkflowPattern) => p.task_sequence.some(s => s.action.includes(taskType)));
  }
}

// ══════════════════════════════════════════════════════
// TOOL USAGE OPTIMIZATION ENGINE
// ══════════════════════════════════════════════════════

export class ToolOptimizationEngine {
  constructor(private db: any, private kv: any) {}

  async updateFromFeedback(event: FeedbackEvent): Promise<void> {
    for (const toolId of event.context.tool_chain) {
      const key = `${toolId}:${event.role_id}:${event.org_id}`;
      let perf = await this.getToolPerformance(toolId, event.role_id, event.org_id);

      if (!perf) {
        perf = {
          tool_id: toolId, role_id: event.role_id, org_id: event.org_id,
          total_uses: 0, success_rate: 0.5, avg_latency_ms: 0,
          avg_user_score: 0.5, error_rate: 0, optimal_contexts: [], anti_patterns: [],
        };
      }

      perf.total_uses++;
      const alpha = 0.05;
      perf.avg_user_score = perf.avg_user_score * (1 - alpha) + event.score * alpha;
      perf.success_rate = perf.avg_user_score >= 0.6 ? perf.success_rate * (1 - alpha) + alpha : perf.success_rate * (1 - alpha);

      if (event.context.latency_ms > 0) {
        perf.avg_latency_ms = perf.avg_latency_ms * (1 - alpha) + event.context.latency_ms * alpha;
      }

      await this.db.prepare(`
        INSERT OR REPLACE INTO tool_performance (key, tool_id, role_id, org_id, data, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(key, toolId, event.role_id, event.org_id, JSON.stringify(perf), new Date().toISOString()).run();
    }
  }

  async getToolPerformance(toolId: string, roleId: string, orgId: string): Promise<ToolPerformance | null> {
    const row = await this.db.prepare(`SELECT data FROM tool_performance WHERE key = ?`)
      .bind(`${toolId}:${roleId}:${orgId}`).first();
    return row ? JSON.parse(row.data as string) : null;
  }

  async getToolRecommendations(roleId: string, orgId: string): Promise<ToolRecommendation[]> {
    const rows = await this.db.prepare(`SELECT data FROM tool_performance WHERE role_id = ? AND org_id = ?`)
      .bind(roleId, orgId).all();

    const tools: ToolPerformance[] = (rows.results || []).map((r: any) => JSON.parse(r.data));
    const byScore = [...tools].sort((a, b) => b.avg_user_score - a.avg_user_score);

    return [{
      task_type: 'general',
      recommended_tools: byScore.filter(t => t.avg_user_score >= 0.6).slice(0, 5)
        .map(t => ({ tool_id: t.tool_id, confidence: t.avg_user_score, reason: `${Math.round(t.success_rate * 100)}% success rate, ${t.total_uses} uses` })),
      avoid_tools: byScore.filter(t => t.avg_user_score < 0.4 && t.total_uses >= 10)
        .map(t => ({ tool_id: t.tool_id, reason: `Low score (${Math.round(t.avg_user_score * 100)}%) over ${t.total_uses} uses` })),
    }];
  }
}

// ══════════════════════════════════════════════════════
// DELEGATION SCORING ENGINE
// ══════════════════════════════════════════════════════

export class DelegationScoringEngine {
  constructor(private db: any, private kv: any) {}

  async updateFromFeedback(event: FeedbackEvent): Promise<void> {
    const taskType = event.task_id.split('_')[0] || 'general';
    const key = `${event.role_id}:${taskType}:${event.org_id}`;

    let ds = await this.getScore(event.role_id, taskType, event.org_id);
    if (!ds) {
      ds = {
        role_id: event.role_id, task_type: taskType, org_id: event.org_id,
        score: 0.5, sample_count: 0, avg_quality: 0.5, avg_speed_ms: 0,
        success_rate: 0.5, last_updated: '',
      };
    }

    ds.sample_count++;
    const alpha = Math.max(0.01, 1 / ds.sample_count);
    ds.avg_quality = ds.avg_quality * (1 - alpha) + event.score * alpha;
    ds.success_rate = event.score >= 0.7 ? ds.success_rate * (1 - alpha) + alpha : ds.success_rate * (1 - alpha);

    if (event.context.latency_ms > 0) {
      ds.avg_speed_ms = ds.avg_speed_ms * (1 - alpha) + event.context.latency_ms * alpha;
    }

    // Composite delegation score: 60% quality, 30% success, 10% speed
    const speedScore = Math.max(0, 1 - ds.avg_speed_ms / 15000); // 15s = 0
    ds.score = ds.avg_quality * 0.6 + ds.success_rate * 0.3 + speedScore * 0.1;
    ds.last_updated = new Date().toISOString();

    await this.db.prepare(`
      INSERT OR REPLACE INTO delegation_scores (key, role_id, task_type, org_id, data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(key, event.role_id, taskType, event.org_id, JSON.stringify(ds), ds.last_updated).run();
  }

  async getScore(roleId: string, taskType: string, orgId: string): Promise<DelegationScore | null> {
    const row = await this.db.prepare(`SELECT data FROM delegation_scores WHERE key = ?`)
      .bind(`${roleId}:${taskType}:${orgId}`).first();
    return row ? JSON.parse(row.data as string) : null;
  }

  async recommend(taskType: string, orgId: string): Promise<DelegationRecommendation> {
    const rows = await this.db.prepare(`SELECT data FROM delegation_scores WHERE task_type = ? AND org_id = ? ORDER BY json_extract(data, '$.score') DESC LIMIT 10`)
      .bind(taskType, orgId).all();

    const scores: DelegationScore[] = (rows.results || []).map((r: any) => JSON.parse(r.data));

    return {
      task_type: taskType,
      input_summary: '',
      rankings: scores.map(s => ({
        role_id: s.role_id,
        score: Math.round(s.score * 100) / 100,
        reason: `Quality: ${Math.round(s.avg_quality * 100)}%, Success: ${Math.round(s.success_rate * 100)}%, Samples: ${s.sample_count}`,
      })),
    };
  }
}

// ══════════════════════════════════════════════════════
// SKILL EVOLUTION ENGINE
// ══════════════════════════════════════════════════════

export class SkillEvolutionEngine {
  constructor(private db: any, private kv: any) {}

  async awardXP(roleId: string, orgId: string, feedbackType: FeedbackType, dimensions: FeedbackDimension[]): Promise<SkillProfile> {
    let profile = await this.getProfile(roleId, orgId);
    if (!profile) {
      profile = this.initProfile(roleId, orgId);
    }

    const baseXP = XP_PER_FEEDBACK[feedbackType];
    profile.experience_points += baseXP;

    // Award domain-specific XP
    for (const dim of dimensions) {
      const ds = profile.domain_skills[dim.domain];
      if (ds) {
        ds.xp += Math.max(0, baseXP * dim.weight);
        ds.recent_trend = baseXP > 0 ? 0.1 : -0.1;

        // Check domain level-up
        const newLevel = this.calculateLevel(ds.xp);
        if (newLevel !== ds.level) {
          profile.evolution_history.push({
            from_level: ds.level, to_level: newLevel,
            domain: dim.domain, triggered_by: feedbackType,
            occurred_at: new Date().toISOString(),
          });
          ds.level = newLevel;
        }
      }
    }

    // Check overall level-up
    const newOverall = this.calculateLevel(profile.experience_points);
    if (newOverall !== profile.level) {
      profile.evolution_history.push({
        from_level: profile.level, to_level: newOverall,
        domain: 'overall', triggered_by: feedbackType,
        occurred_at: new Date().toISOString(),
      });
      profile.level = newOverall;

      // Check achievements
      this.checkAchievements(profile);
    }

    profile.last_updated = new Date().toISOString();

    await this.db.prepare(`
      INSERT OR REPLACE INTO skill_profiles (role_id, org_id, data, updated_at)
      VALUES (?, ?, ?, ?)
    `).bind(roleId, orgId, JSON.stringify(profile), profile.last_updated).run();

    return profile;
  }

  async getProfile(roleId: string, orgId: string): Promise<SkillProfile | null> {
    const row = await this.db.prepare(`SELECT data FROM skill_profiles WHERE role_id = ? AND org_id = ?`)
      .bind(roleId, orgId).first();
    return row ? JSON.parse(row.data as string) : null;
  }

  async getOrgProfiles(orgId: string): Promise<SkillProfile[]> {
    const rows = await this.db.prepare(`SELECT data FROM skill_profiles WHERE org_id = ? ORDER BY json_extract(data, '$.experience_points') DESC`)
      .bind(orgId).all();
    return (rows.results || []).map((r: any) => JSON.parse(r.data));
  }

  private initProfile(roleId: string, orgId: string): SkillProfile {
    const domainSkills: Record<LearningDomain, DomainSkill> = {} as any;
    for (const domain of Object.keys(DOMAIN_WEIGHTS) as LearningDomain[]) {
      domainSkills[domain] = { domain, level: 'novice', xp: 0, recent_trend: 0 };
    }
    return {
      role_id: roleId, org_id: orgId, level: 'novice',
      experience_points: 0, level_thresholds: { ...SKILL_THRESHOLDS },
      domain_skills: domainSkills, achievements: [],
      evolution_history: [], last_updated: new Date().toISOString(),
    };
  }

  private calculateLevel(xp: number): SkillLevel {
    if (xp >= SKILL_THRESHOLDS.master) return 'master';
    if (xp >= SKILL_THRESHOLDS.expert) return 'expert';
    if (xp >= SKILL_THRESHOLDS.proficient) return 'proficient';
    if (xp >= SKILL_THRESHOLDS.competent) return 'competent';
    return 'novice';
  }

  private checkAchievements(profile: SkillProfile): void {
    const earned = new Set(profile.achievements.map(a => a.id));
    const now = new Date().toISOString();

    if (!earned.has('first_levelup') && profile.evolution_history.length > 0) {
      profile.achievements.push({ id: 'first_levelup', name: 'First Level Up', description: 'Earned first skill level increase', earned_at: now });
    }
    if (!earned.has('expert_domain') && Object.values(profile.domain_skills).some(d => d.level === 'expert')) {
      profile.achievements.push({ id: 'expert_domain', name: 'Domain Expert', description: 'Reached Expert level in a domain', earned_at: now });
    }
    if (!earned.has('master_overall') && profile.level === 'master') {
      profile.achievements.push({ id: 'master_overall', name: 'Grand Master', description: 'Reached Master level overall', earned_at: now });
    }
    if (!earned.has('well_rounded') && Object.values(profile.domain_skills).every(d => d.level !== 'novice')) {
      profile.achievements.push({ id: 'well_rounded', name: 'Well-Rounded', description: 'No domain skills at Novice level', earned_at: now });
    }
    if (!earned.has('century') && profile.experience_points >= 1000) {
      profile.achievements.push({ id: 'century', name: 'Centurion', description: 'Earned 1000+ experience points', earned_at: now });
    }
  }
}

// ══════════════════════════════════════════════════════
// LEARNING ANALYTICS
// ══════════════════════════════════════════════════════

export class LearningAnalyticsEngine {
  constructor(private db: any, private kv: any) {}

  async getAnalytics(orgId: string, days = 30): Promise<LearningAnalytics> {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const period = new Date().toISOString().slice(0, 7);

    const feedbackCount = await this.db.prepare(`SELECT COUNT(*) as cnt FROM learning_feedback WHERE org_id = ? AND created_at > ?`).bind(orgId, cutoff).first();
    const avgScore = await this.db.prepare(`SELECT AVG(score) as avg FROM learning_feedback WHERE org_id = ? AND created_at > ?`).bind(orgId, cutoff).first();

    const perfRows = await this.db.prepare(`SELECT data FROM learning_performance WHERE org_id = ? AND period = ?`).bind(orgId, period).all();
    const scores: PerformanceScore[] = (perfRows.results || []).map((r: any) => JSON.parse(r.data));
    const sorted = [...scores].sort((a, b) => (b.trend === 'improving' ? 1 : 0) - (a.trend === 'improving' ? 1 : 0));

    const experiments = await this.db.prepare(`SELECT COUNT(*) as cnt FROM calibration_experiments WHERE org_id = ? AND status = 'running'`).bind(orgId).first();
    const patterns = await this.db.prepare(`SELECT COUNT(*) as cnt FROM workflow_patterns WHERE org_id = ? AND created_at > ?`).bind(orgId, cutoff).first();

    return {
      org_id: orgId,
      period,
      total_feedback_events: (feedbackCount as any)?.cnt || 0,
      avg_satisfaction: (avgScore as any)?.avg || 0,
      top_improving_roles: sorted.filter(s => s.trend === 'improving').slice(0, 5).map(s => ({ role_id: s.role_id, improvement: s.overall_score })),
      top_declining_roles: sorted.filter(s => s.trend === 'declining').slice(0, 5).map(s => ({ role_id: s.role_id, decline: s.overall_score })),
      active_experiments: (experiments as any)?.cnt || 0,
      patterns_discovered: (patterns as any)?.cnt || 0,
      prompt_calibrations: 0,
      skill_evolutions: 0,
    };
  }
}

// ══════════════════════════════════════════════════════
// DATABASE SCHEMA
// ══════════════════════════════════════════════════════

export const LEARNING_ENGINE_SCHEMA = `
CREATE TABLE IF NOT EXISTS learning_feedback (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  signal_source TEXT NOT NULL,
  score REAL NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lfb_org ON learning_feedback(org_id);
CREATE INDEX IF NOT EXISTS idx_lfb_role ON learning_feedback(role_id);
CREATE INDEX IF NOT EXISTS idx_lfb_user ON learning_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_lfb_created ON learning_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_lfb_type ON learning_feedback(feedback_type);

CREATE TABLE IF NOT EXISTS learning_performance (
  role_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  period TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (role_id, org_id, period)
);
CREATE INDEX IF NOT EXISTS idx_lp_org ON learning_performance(org_id);

CREATE TABLE IF NOT EXISTS prompt_variants (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'candidate',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pv_role ON prompt_variants(role_id, org_id);
CREATE INDEX IF NOT EXISTS idx_pv_status ON prompt_variants(status);

CREATE TABLE IF NOT EXISTS calibration_experiments (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  data TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ce_org ON calibration_experiments(org_id);
CREATE INDEX IF NOT EXISTS idx_ce_status ON calibration_experiments(status);

CREATE TABLE IF NOT EXISTS workflow_patterns (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wp_org ON workflow_patterns(org_id);
CREATE INDEX IF NOT EXISTS idx_wp_fp ON workflow_patterns(org_id, fingerprint);

CREATE TABLE IF NOT EXISTS tool_performance (
  key TEXT PRIMARY KEY,
  tool_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tp_role ON tool_performance(role_id, org_id);

CREATE TABLE IF NOT EXISTS delegation_scores (
  key TEXT PRIMARY KEY,
  role_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  org_id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ds_task ON delegation_scores(task_type, org_id);

CREATE TABLE IF NOT EXISTS skill_profiles (
  role_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (role_id, org_id)
);
CREATE INDEX IF NOT EXISTS idx_sp_org ON skill_profiles(org_id);
`;

// ══════════════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════════════

export async function handleLearningEngine(request: Request, env: any, userId: string, path: string): Promise<Response> {
  const feedback = new FeedbackIngestionSystem(env.DB, env.CACHE);
  const scoring = new PerformanceScoringEngine(env.DB, env.CACHE);
  const calibration = new PromptCalibrationEngine(env.DB, env.CACHE);
  const patterns = new WorkflowPatternEngine(env.DB, env.CACHE);
  const tools = new ToolOptimizationEngine(env.DB, env.CACHE);
  const delegation = new DelegationScoringEngine(env.DB, env.CACHE);
  const skills = new SkillEvolutionEngine(env.DB, env.CACHE);
  const analytics = new LearningAnalyticsEngine(env.DB, env.CACHE);

  const url = new URL(request.url);
  const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    // ── Feedback ──
    if (path === '/api/learning/feedback' && request.method === 'POST') {
      const body = await request.json() as any;
      const event = await feedback.ingestFeedback({ ...body, user_id: userId });
      return json({ event });
    }
    if (path === '/api/learning/feedback/history' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      const limit = parseInt(url.searchParams.get('limit') || '50');
      return json({ history: await feedback.getFeedbackHistory(roleId, orgId, limit) });
    }
    if (path === '/api/learning/feedback/summary' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      const days = parseInt(url.searchParams.get('days') || '30');
      return json({ summary: await feedback.getFeedbackSummary(roleId, orgId, days) });
    }

    // ── Performance Scoring ──
    if (path === '/api/learning/performance' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      const period = url.searchParams.get('period') || undefined;
      const score = await scoring.getScore(roleId, orgId, period);
      return json({ score });
    }
    if (path === '/api/learning/performance/history' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ history: await scoring.getScoreHistory(roleId, orgId) });
    }
    if (path === '/api/learning/performance/leaderboard' && request.method === 'GET') {
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ leaderboard: await scoring.getLeaderboard(orgId) });
    }

    // ── Prompt Calibration ──
    if (path === '/api/learning/prompts/variants' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ variants: await calibration.getVariants(roleId, orgId) });
    }
    if (path === '/api/learning/prompts/variants' && request.method === 'POST') {
      const body = await request.json() as any;
      const variant = await calibration.createVariant(body.role_id, body.org_id || userId, body.system_prompt, body.notes || '');
      return json({ variant });
    }
    if (path === '/api/learning/prompts/active' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ variant: await calibration.getActiveVariant(roleId, orgId) });
    }
    if (path === '/api/learning/prompts/select' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ variant: await calibration.selectVariantForRequest(roleId, orgId) });
    }
    if (path === '/api/learning/experiments' && request.method === 'POST') {
      const body = await request.json() as any;
      const exp = await calibration.startExperiment(body.role_id, body.org_id || userId, body.variant_ids, body.min_samples);
      return json({ experiment: exp });
    }
    if (path.match(/^\/api\/learning\/experiments\/[^/]+\/evaluate$/) && request.method === 'POST') {
      const expId = path.split('/')[4];
      const exp = await calibration.evaluateExperiment(expId);
      return json({ experiment: exp });
    }

    // ── Workflow Patterns ──
    if (path === '/api/learning/patterns' && request.method === 'GET') {
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ patterns: await patterns.getTopPatterns(orgId) });
    }
    if (path === '/api/learning/patterns/promoted' && request.method === 'GET') {
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ patterns: await patterns.getPromotedPatterns(orgId) });
    }
    if (path === '/api/learning/patterns/record' && request.method === 'POST') {
      const body = await request.json() as any;
      await patterns.recordTaskSequence(body.org_id || userId, body.sequence, body.score);
      return json({ success: true });
    }
    if (path === '/api/learning/patterns/suggest' && request.method === 'GET') {
      const orgId = url.searchParams.get('org_id') || userId;
      const taskType = url.searchParams.get('task_type') || '';
      return json({ suggestions: await patterns.suggestWorkflow(orgId, taskType) });
    }

    // ── Tool Optimization ──
    if (path === '/api/learning/tools/performance' && request.method === 'GET') {
      const toolId = url.searchParams.get('tool_id') || '';
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ performance: await tools.getToolPerformance(toolId, roleId, orgId) });
    }
    if (path === '/api/learning/tools/recommendations' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ recommendations: await tools.getToolRecommendations(roleId, orgId) });
    }

    // ── Delegation ──
    if (path === '/api/learning/delegation/recommend' && request.method === 'GET') {
      const taskType = url.searchParams.get('task_type') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ recommendation: await delegation.recommend(taskType, orgId) });
    }
    if (path === '/api/learning/delegation/score' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const taskType = url.searchParams.get('task_type') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ score: await delegation.getScore(roleId, taskType, orgId) });
    }

    // ── Skill Evolution ──
    if (path === '/api/learning/skills/profile' && request.method === 'GET') {
      const roleId = url.searchParams.get('role_id') || '';
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ profile: await skills.getProfile(roleId, orgId) });
    }
    if (path === '/api/learning/skills/org' && request.method === 'GET') {
      const orgId = url.searchParams.get('org_id') || userId;
      return json({ profiles: await skills.getOrgProfiles(orgId) });
    }

    // ── Analytics ──
    if (path === '/api/learning/analytics' && request.method === 'GET') {
      const orgId = url.searchParams.get('org_id') || userId;
      const days = parseInt(url.searchParams.get('days') || '30');
      return json({ analytics: await analytics.getAnalytics(orgId, days) });
    }

    // ── Schema ──
    if (path === '/api/learning/schema' && request.method === 'POST') {
      const stmts = LEARNING_ENGINE_SCHEMA.split(';').filter(s => s.trim());
      for (const s of stmts) { await env.DB.prepare(s).run(); }
      return json({ success: true, tables: 8 });
    }

    return json({ error: 'Not Found' }, 404);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
}
