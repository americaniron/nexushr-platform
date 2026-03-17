/**
 * NexusHR Feature #29 — Secure Prompt Engine
 *
 * Replaces basic prompt handling with enterprise-grade prompt architecture:
 * - Prompt isolation layers (system/context/user/tool boundaries)
 * - Context sanitization (injection detection, PII scrubbing, token limit enforcement)
 * - System prompt boundaries (immutable system instructions, boundary markers)
 * - Prompt versioning (semantic versioning, diff tracking, approval workflow)
 * - A/B testing (experiment framework, traffic splitting, statistical significance)
 * - Rollback capability (instant rollback, canary deployments, audit trail)
 * - Prompt firewall (injection detection, override prevention, content policy enforcement)
 */

import type { Env } from '../index';

// ─── Enums & Constants ──────────────────────────────────────────────

export type PromptLayerType = 'system' | 'context' | 'user' | 'tool' | 'guardrail' | 'persona';
export type PromptStatus = 'draft' | 'review' | 'approved' | 'active' | 'canary' | 'deprecated' | 'rolled_back';
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
export type FirewallAction = 'allow' | 'sanitize' | 'block' | 'flag' | 'quarantine';
export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type RollbackReason = 'performance_degradation' | 'safety_violation' | 'user_complaints' | 'error_rate_spike' | 'manual' | 'auto_canary_fail';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';
export type SanitizationRule = 'strip_injection' | 'mask_pii' | 'truncate' | 'normalize_whitespace' | 'remove_control_chars' | 'encode_special' | 'block_override';

// ─── Prompt Layer Architecture ──────────────────────────────────────

export interface PromptLayer {
  type: PromptLayerType;
  content: string;
  priority: number;
  immutable: boolean;
  boundary_id: string;
  metadata: Record<string, any>;
}

export interface ComposedPrompt {
  id: string;
  layers: PromptLayer[];
  final_text: string;
  token_count: number;
  boundary_markers: string[];
  isolation_verified: boolean;
  sanitization_applied: string[];
  firewall_result: FirewallResult;
  composed_at: string;
}

export interface PromptTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  version: string;
  status: PromptStatus;
  layers: PromptLayer[];
  variables: PromptVariable[];
  constraints: PromptConstraint[];
  max_tokens: number;
  model_target: string;
  tags: string[];
  created_by: string;
  approved_by: string | null;
  approval_status: ApprovalStatus;
  parent_version_id: string | null;
  rollback_target_id: string | null;
  performance_baseline: PerformanceBaseline | null;
  created_at: string;
  updated_at: string;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'template';
  required: boolean;
  default_value?: string;
  allowed_values?: string[];
  max_length?: number;
  sanitize: boolean;
  description: string;
}

export interface PromptConstraint {
  type: 'max_tokens' | 'required_layer' | 'forbidden_pattern' | 'required_pattern' | 'min_layers' | 'max_layers';
  value: string | number;
  error_message: string;
}

export interface PerformanceBaseline {
  avg_quality_score: number;
  avg_latency_ms: number;
  error_rate: number;
  user_satisfaction: number;
  sample_size: number;
  measured_at: string;
}

// ─── Prompt Firewall ────────────────────────────────────────────────

export interface FirewallRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  threat_level: ThreatLevel;
  action: FirewallAction;
  enabled: boolean;
  category: string;
  priority: number;
}

export interface FirewallResult {
  allowed: boolean;
  action: FirewallAction;
  threat_level: ThreatLevel;
  violations: FirewallViolation[];
  sanitized_input: string;
  original_input: string;
  scan_duration_ms: number;
  rules_evaluated: number;
}

export interface FirewallViolation {
  rule_id: string;
  rule_name: string;
  category: string;
  threat_level: ThreatLevel;
  matched_text: string;
  position: number;
  action_taken: FirewallAction;
}

// ─── Experiment Framework ───────────────────────────────────────────

export interface PromptExperiment {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  traffic_allocation: Record<string, number>;
  target_metric: string;
  min_sample_size: number;
  max_duration_hours: number;
  confidence_threshold: number;
  started_at: string | null;
  completed_at: string | null;
  winner_variant_id: string | null;
  results: ExperimentResults | null;
  created_at: string;
  updated_at: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  prompt_version_id: string;
  is_control: boolean;
  description: string;
}

export interface ExperimentResults {
  total_impressions: number;
  by_variant: Record<string, VariantMetrics>;
  statistical_significance: boolean;
  p_value: number;
  confidence_interval: [number, number];
  winner: string | null;
  recommendation: string;
}

export interface VariantMetrics {
  impressions: number;
  avg_quality_score: number;
  avg_latency_ms: number;
  error_rate: number;
  user_satisfaction: number;
  conversion_rate: number;
  std_dev: number;
}

// ─── Version & Rollback ─────────────────────────────────────────────

export interface VersionDiff {
  from_version: string;
  to_version: string;
  changes: LayerChange[];
  variable_changes: string[];
  constraint_changes: string[];
  impact_assessment: string;
}

export interface LayerChange {
  layer_type: PromptLayerType;
  action: 'added' | 'modified' | 'removed';
  old_content?: string;
  new_content?: string;
  diff_summary: string;
}

export interface RollbackRecord {
  id: string;
  tenant_id: string;
  from_version_id: string;
  to_version_id: string;
  reason: RollbackReason;
  initiated_by: string;
  performance_snapshot: PerformanceBaseline;
  completed_at: string;
  auto_triggered: boolean;
}

// ─── Default Firewall Rules ─────────────────────────────────────────

const DEFAULT_FIREWALL_RULES: FirewallRule[] = [
  { id: 'fw-001', name: 'System prompt override', description: 'Detects attempts to override system instructions', pattern: '(?:ignore|disregard|forget|override|bypass)\\s+(?:all\\s+)?(?:previous|above|prior|system|initial)\\s+(?:instructions?|prompts?|rules?|guidelines?|directions?)', threat_level: 'critical', action: 'block', enabled: true, category: 'injection', priority: 1 },
  { id: 'fw-002', name: 'Role assumption attack', description: 'Detects attempts to assume a different role', pattern: '(?:you\\s+are\\s+now|act\\s+as|pretend\\s+(?:to\\s+be|you\\s*(?:are|\'re))|from\\s+now\\s+on\\s+you|your\\s+new\\s+(?:role|identity|persona)\\s+is)', threat_level: 'high', action: 'block', enabled: true, category: 'injection', priority: 2 },
  { id: 'fw-003', name: 'Instruction delimiter injection', description: 'Detects fake instruction delimiters', pattern: '(?:\\[\\/?(?:SYSTEM|INST|SYS)\\]|<\\/?(?:system|instruction|admin)>|###\\s*(?:SYSTEM|INSTRUCTION)|\\{\\{(?:SYSTEM|ADMIN)\\}\\})', threat_level: 'critical', action: 'block', enabled: true, category: 'injection', priority: 1 },
  { id: 'fw-004', name: 'Prompt leak attempt', description: 'Detects attempts to extract system prompts', pattern: '(?:(?:show|reveal|display|print|output|repeat|echo)\\s+(?:your|the|full|complete|entire)?\\s*(?:system\\s+)?(?:prompt|instructions?|rules?|guidelines?))|(?:what\\s+(?:are|were)\\s+your\\s+(?:initial|original|system)\\s+(?:instructions?|prompts?))', threat_level: 'high', action: 'sanitize', enabled: true, category: 'exfiltration', priority: 3 },
  { id: 'fw-005', name: 'Jailbreak keywords', description: 'Detects common jailbreak terminology', pattern: '(?:DAN|do\\s+anything\\s+now|jailbreak|uncensored\\s+mode|developer\\s+mode|unrestricted\\s+mode|god\\s+mode|sudo\\s+mode|admin\\s+override)', threat_level: 'critical', action: 'block', enabled: true, category: 'jailbreak', priority: 1 },
  { id: 'fw-006', name: 'Encoded injection', description: 'Detects base64/hex encoded injection attempts', pattern: '(?:(?:eval|execute|run)\\s*\\(|base64[_\\s]*(?:decode|encode)|\\\\x[0-9a-fA-F]{2,}|\\\\u[0-9a-fA-F]{4,}|%[0-9a-fA-F]{2}(?:%[0-9a-fA-F]{2}){3,})', threat_level: 'high', action: 'block', enabled: true, category: 'injection', priority: 2 },
  { id: 'fw-007', name: 'Context window manipulation', description: 'Detects attempts to fill context window', pattern: '(?:repeat\\s+(?:the\\s+(?:following|above|word)\\s+)?(?:\\d{3,}|many|million|billion|thousand)\\s+times|write\\s+(?:a\\s+)?(?:\\d{4,}|million|thousand)\\s+(?:words|characters|tokens))', threat_level: 'medium', action: 'sanitize', enabled: true, category: 'dos', priority: 4 },
  { id: 'fw-008', name: 'Multi-turn manipulation', description: 'Detects gradual instruction shifting', pattern: '(?:(?:now|ok|good)\\s*,?\\s*(?:let\'?s?|we\\s+can)\\s+(?:change|modify|adjust|update)\\s+(?:the|your)\\s+(?:rules?|behavior|instructions?|guidelines?))', threat_level: 'medium', action: 'flag', enabled: true, category: 'manipulation', priority: 5 },
  { id: 'fw-009', name: 'SSN pattern', description: 'Detects Social Security Numbers', pattern: '\\b\\d{3}[\\s-]?\\d{2}[\\s-]?\\d{4}\\b', threat_level: 'high', action: 'sanitize', enabled: true, category: 'pii', priority: 3 },
  { id: 'fw-010', name: 'Credit card pattern', description: 'Detects credit card numbers', pattern: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b', threat_level: 'high', action: 'sanitize', enabled: true, category: 'pii', priority: 3 },
  { id: 'fw-011', name: 'Harmful content request', description: 'Detects requests for harmful content generation', pattern: '(?:(?:generate|create|write|produce)\\s+(?:malware|ransomware|exploit|phishing|virus|trojan|keylogger))', threat_level: 'critical', action: 'block', enabled: true, category: 'policy', priority: 1 },
  { id: 'fw-012', name: 'Data exfiltration pattern', description: 'Detects attempts to exfiltrate data via prompt', pattern: '(?:send\\s+(?:all|the|my|this)\\s+(?:data|information|records|files)\\s+to|(?:upload|transmit|forward|email)\\s+(?:everything|all\\s+data|the\\s+database))', threat_level: 'high', action: 'block', enabled: true, category: 'exfiltration', priority: 2 }
];

// ─── Boundary Markers ───────────────────────────────────────────────

const BOUNDARY_PREFIX = '═══NXH';
const BOUNDARY_SUFFIX = 'NXH═══';

function generateBoundaryId(layerType: PromptLayerType): string {
  const nonce = crypto.randomUUID().substring(0, 8);
  return `${BOUNDARY_PREFIX}:${layerType.toUpperCase()}:${nonce}:${BOUNDARY_SUFFIX}`;
}

function createBoundaryMarker(boundaryId: string, position: 'start' | 'end'): string {
  return `[${position === 'start' ? 'BEGIN' : 'END'}:${boundaryId}]`;
}

// ─── Context Sanitization Engine ────────────────────────────────────

class ContextSanitizer {
  private rules: SanitizationRule[];

  constructor(rules?: SanitizationRule[]) {
    this.rules = rules || ['strip_injection', 'mask_pii', 'normalize_whitespace', 'remove_control_chars', 'block_override'];
  }

  sanitize(input: string, maxTokens: number = 4096): { sanitized: string; rules_applied: string[]; modifications: number } {
    let result = input;
    const applied: string[] = [];
    let mods = 0;

    for (const rule of this.rules) {
      const before = result;
      switch (rule) {
        case 'strip_injection': result = this.stripInjectionPatterns(result); break;
        case 'mask_pii': result = this.maskPII(result); break;
        case 'truncate': result = this.truncateToTokenLimit(result, maxTokens); break;
        case 'normalize_whitespace': result = this.normalizeWhitespace(result); break;
        case 'remove_control_chars': result = this.removeControlChars(result); break;
        case 'encode_special': result = this.encodeSpecialTokens(result); break;
        case 'block_override': result = this.blockOverrideAttempts(result); break;
      }
      if (result !== before) { applied.push(rule); mods++; }
    }

    return { sanitized: result, rules_applied: applied, modifications: mods };
  }

  private stripInjectionPatterns(text: string): string {
    let cleaned = text.replace(/\[\/?(SYSTEM|INST|SYS|ADMIN)\]/gi, '[BLOCKED]');
    cleaned = cleaned.replace(/<\/?(system|instruction|admin|prompt)[^>]*>/gi, '[BLOCKED]');
    cleaned = cleaned.replace(/###\s*(SYSTEM|INSTRUCTION|ADMIN)/gi, '### [BLOCKED]');
    cleaned = cleaned.replace(/\{\{(SYSTEM|ADMIN|OVERRIDE)\}\}/gi, '{{BLOCKED}}');
    return cleaned;
  }

  private maskPII(text: string): string {
    let masked = text.replace(/\b(\d{3})[\s-]?(\d{2})[\s-]?(\d{4})\b/g, '***-**-$3');
    masked = masked.replace(/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
      (match) => '****-****-****-' + match.slice(-4));
    masked = masked.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      (_, local, domain) => local.substring(0, 2) + '***@' + domain);
    masked = masked.replace(/\b(\+?1?\s*[-.]?\s*)?(\(?\d{3}\)?[\s.-]?)(\d{3}[\s.-]?)(\d{4})\b/g,
      (_, prefix, _area, _mid, last) => (prefix || '') + '(***) ***-' + last);
    return masked;
  }

  private truncateToTokenLimit(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length > maxChars) return text.substring(0, maxChars) + '\n[TRUNCATED: exceeded token limit]';
    return text;
  }

  private normalizeWhitespace(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\t/g, '  ').replace(/ {3,}/g, '  ').replace(/\n{4,}/g, '\n\n\n');
  }

  private removeControlChars(text: string): string {
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private encodeSpecialTokens(text: string): string {
    return text.replace(/\u200B/g, '').replace(/\u200C/g, '').replace(/\u200D/g, '').replace(/\uFEFF/g, '');
  }

  private blockOverrideAttempts(text: string): string {
    const overridePatterns = [
      /(?:ignore|disregard|forget|override|bypass)\s+(?:all\s+)?(?:previous|above|prior|system|initial)\s+(?:instructions?|prompts?|rules?|guidelines?|directions?)/gi,
      /(?:you\s+are\s+now|act\s+as|pretend\s+(?:to\s+be|you\s*(?:are|'re)))\s+/gi,
      /(?:from\s+now\s+on|henceforth|going\s+forward)\s+(?:you\s+(?:are|will|should|must))\s+/gi,
      /(?:new\s+(?:system\s+)?(?:prompt|instruction|rule|persona))\s*[:=]/gi,
    ];
    let cleaned = text;
    for (const pattern of overridePatterns) {
      cleaned = cleaned.replace(pattern, '[OVERRIDE BLOCKED] ');
    }
    return cleaned;
  }
}

// ─── Prompt Firewall Engine ─────────────────────────────────────────

class PromptFirewall {
  private rules: FirewallRule[];

  constructor(customRules?: FirewallRule[]) {
    this.rules = customRules || [...DEFAULT_FIREWALL_RULES];
    this.rules.sort((a, b) => a.priority - b.priority);
  }

  scan(input: string): FirewallResult {
    const startTime = Date.now();
    const violations: FirewallViolation[] = [];
    let worstThreat: ThreatLevel = 'none';
    let worstAction: FirewallAction = 'allow';
    let sanitizedInput = input;

    const threatOrder: ThreatLevel[] = ['none', 'low', 'medium', 'high', 'critical'];
    const actionOrder: FirewallAction[] = ['allow', 'flag', 'sanitize', 'quarantine', 'block'];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      try {
        const regex = new RegExp(rule.pattern, 'gi');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(input)) !== null) {
          violations.push({
            rule_id: rule.id, rule_name: rule.name, category: rule.category,
            threat_level: rule.threat_level, matched_text: match[0].substring(0, 100),
            position: match.index, action_taken: rule.action
          });
          if (threatOrder.indexOf(rule.threat_level) > threatOrder.indexOf(worstThreat)) worstThreat = rule.threat_level;
          if (actionOrder.indexOf(rule.action) > actionOrder.indexOf(worstAction)) worstAction = rule.action;
          if (rule.action === 'sanitize') {
            sanitizedInput = sanitizedInput.replace(match[0], `[${rule.category.toUpperCase()}_REDACTED]`);
          }
        }
      } catch (_e) { /* skip invalid regex */ }
    }

    return {
      allowed: worstAction !== 'block' && worstAction !== 'quarantine',
      action: violations.length > 0 ? worstAction : 'allow',
      threat_level: worstThreat, violations, sanitized_input: sanitizedInput,
      original_input: input, scan_duration_ms: Date.now() - startTime,
      rules_evaluated: this.rules.filter(r => r.enabled).length
    };
  }

  getRules(): FirewallRule[] { return [...this.rules]; }
}

// ─── Prompt Composer (Layer Isolation) ──────────────────────────────

class PromptComposer {
  private layers: PromptLayer[] = [];
  private sanitizer: ContextSanitizer;
  private firewall: PromptFirewall;

  constructor(sanitizer?: ContextSanitizer, firewall?: PromptFirewall) {
    this.sanitizer = sanitizer || new ContextSanitizer();
    this.firewall = firewall || new PromptFirewall();
  }

  addLayer(type: PromptLayerType, content: string, options?: { immutable?: boolean; priority?: number; metadata?: Record<string, any> }): string {
    const boundaryId = generateBoundaryId(type);
    this.layers.push({
      type, content,
      priority: options?.priority ?? this.getDefaultPriority(type),
      immutable: options?.immutable ?? (type === 'system' || type === 'guardrail'),
      boundary_id: boundaryId,
      metadata: options?.metadata || {}
    });
    return boundaryId;
  }

  compose(userInput?: string, maxTokens: number = 8192): ComposedPrompt {
    const id = crypto.randomUUID();
    const sanitizationApplied: string[] = [];
    const boundaryMarkers: string[] = [];
    const sortedLayers = [...this.layers].sort((a, b) => a.priority - b.priority);

    // Firewall scan on user input
    let firewallResult: FirewallResult;
    if (userInput) {
      firewallResult = this.firewall.scan(userInput);
    } else {
      firewallResult = { allowed: true, action: 'allow', threat_level: 'none', violations: [], sanitized_input: '', original_input: '', scan_duration_ms: 0, rules_evaluated: 0 };
    }

    const segments: string[] = [];

    for (const layer of sortedLayers) {
      const startMarker = createBoundaryMarker(layer.boundary_id, 'start');
      const endMarker = createBoundaryMarker(layer.boundary_id, 'end');
      boundaryMarkers.push(layer.boundary_id);

      let layerContent = layer.content;
      if (layer.type !== 'system' && layer.type !== 'guardrail') {
        const sanitized = this.sanitizer.sanitize(layerContent, maxTokens);
        layerContent = sanitized.sanitized;
        sanitizationApplied.push(...sanitized.rules_applied.map(r => `${layer.type}:${r}`));
      }

      segments.push(`${startMarker}\n${layerContent}\n${endMarker}`);
    }

    // Append sanitized user input (if allowed)
    if (userInput && firewallResult.allowed) {
      const userBoundaryId = generateBoundaryId('user');
      boundaryMarkers.push(userBoundaryId);
      const sanitizedUser = this.sanitizer.sanitize(firewallResult.sanitized_input, maxTokens);
      sanitizationApplied.push(...sanitizedUser.rules_applied.map(r => `user_input:${r}`));
      segments.push(`${createBoundaryMarker(userBoundaryId, 'start')}\n${sanitizedUser.sanitized}\n${createBoundaryMarker(userBoundaryId, 'end')}`);
    }

    const finalText = segments.join('\n\n');
    const isolationVerified = this.verifyIsolation(finalText, boundaryMarkers);

    return {
      id, layers: sortedLayers, final_text: finalText,
      token_count: Math.ceil(finalText.length / 4),
      boundary_markers: boundaryMarkers, isolation_verified: isolationVerified,
      sanitization_applied: [...new Set(sanitizationApplied)],
      firewall_result: firewallResult, composed_at: new Date().toISOString()
    };
  }

  clear(): void { this.layers = []; }

  private getDefaultPriority(type: PromptLayerType): number {
    return { guardrail: 0, system: 10, persona: 20, context: 30, tool: 40, user: 50 }[type];
  }

  private verifyIsolation(text: string, markers: string[]): boolean {
    for (const marker of markers) {
      const startIdx = text.indexOf(createBoundaryMarker(marker, 'start'));
      const endIdx = text.indexOf(createBoundaryMarker(marker, 'end'));
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return false;
    }
    return true;
  }
}

// ─── Version Manager ────────────────────────────────────────────────

class PromptVersionManager {
  private env: Env;
  private tenantId: string;

  constructor(env: Env, tenantId: string) {
    this.env = env;
    this.tenantId = tenantId;
  }

  async createTemplate(template: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at' | 'approved_by' | 'approval_status' | 'rollback_target_id' | 'performance_baseline'>): Promise<PromptTemplate> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const full: PromptTemplate = { ...template, id, approved_by: null, approval_status: 'pending', rollback_target_id: null, performance_baseline: null, created_at: now, updated_at: now };

    await this.env.DB.prepare(`INSERT INTO prompt_templates (id, tenant_id, name, description, version, status, layers, variables, constraints, max_tokens, model_target, tags, created_by, approved_by, approval_status, parent_version_id, rollback_target_id, performance_baseline, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, this.tenantId, full.name, full.description, full.version, full.status, JSON.stringify(full.layers), JSON.stringify(full.variables), JSON.stringify(full.constraints), full.max_tokens, full.model_target, JSON.stringify(full.tags), full.created_by, null, 'pending', full.parent_version_id, null, null, now, now)
      .run();

    return full;
  }

  async getTemplate(templateId: string): Promise<PromptTemplate | null> {
    const row = await this.env.DB.prepare(`SELECT * FROM prompt_templates WHERE id = ? AND tenant_id = ?`).bind(templateId, this.tenantId).first();
    return row ? this.parseTemplate(row) : null;
  }

  async listTemplates(filters?: { status?: PromptStatus; name?: string; tags?: string[]; limit?: number; offset?: number }): Promise<{ templates: PromptTemplate[]; total: number }> {
    let where = 'WHERE tenant_id = ?';
    const params: any[] = [this.tenantId];
    if (filters?.status) { where += ' AND status = ?'; params.push(filters.status); }
    if (filters?.name) { where += ' AND name LIKE ?'; params.push(`%${filters.name}%`); }

    const countResult = await this.env.DB.prepare(`SELECT COUNT(*) as cnt FROM prompt_templates ${where}`).bind(...params).first<{ cnt: number }>();
    const total = countResult?.cnt || 0;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const rows = await this.env.DB.prepare(`SELECT * FROM prompt_templates ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();

    let templates = (rows.results || []).map((r: any) => this.parseTemplate(r));
    if (filters?.tags && filters.tags.length > 0) {
      templates = templates.filter(t => filters.tags!.some(tag => t.tags.includes(tag)));
    }
    return { templates, total };
  }

  async createNewVersion(parentId: string, updates: { layers?: PromptLayer[]; variables?: PromptVariable[]; constraints?: PromptConstraint[]; description?: string }, bumpType: 'major' | 'minor' | 'patch' = 'minor'): Promise<PromptTemplate> {
    const parent = await this.getTemplate(parentId);
    if (!parent) throw new Error('Parent template not found');
    return this.createTemplate({
      tenant_id: this.tenantId, name: parent.name,
      description: updates.description || parent.description,
      version: this.bumpVersion(parent.version, bumpType),
      status: 'draft',
      layers: updates.layers || parent.layers,
      variables: updates.variables || parent.variables,
      constraints: updates.constraints || parent.constraints,
      max_tokens: parent.max_tokens, model_target: parent.model_target,
      tags: parent.tags, created_by: parent.created_by, parent_version_id: parentId
    });
  }

  async approveTemplate(templateId: string, approvedBy: string): Promise<PromptTemplate> {
    await this.env.DB.prepare(`UPDATE prompt_templates SET approval_status = 'approved', approved_by = ?, status = 'approved', updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(approvedBy, new Date().toISOString(), templateId, this.tenantId).run();
    return (await this.getTemplate(templateId))!;
  }

  async activateTemplate(templateId: string): Promise<PromptTemplate> {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');
    if (template.approval_status !== 'approved' && template.approval_status !== 'auto_approved') {
      throw new Error('Template must be approved before activation');
    }
    // Deactivate current active version of same name
    await this.env.DB.prepare(`UPDATE prompt_templates SET status = 'deprecated', updated_at = ? WHERE tenant_id = ? AND name = ? AND status = 'active'`)
      .bind(new Date().toISOString(), this.tenantId, template.name).run();
    await this.env.DB.prepare(`UPDATE prompt_templates SET status = 'active', updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(new Date().toISOString(), templateId, this.tenantId).run();
    return (await this.getTemplate(templateId))!;
  }

  async rollback(templateId: string, reason: RollbackReason, initiatedBy: string): Promise<RollbackRecord> {
    const current = await this.getTemplate(templateId);
    if (!current) throw new Error('Template not found');
    if (!current.parent_version_id) throw new Error('No parent version to rollback to');

    const parent = await this.getTemplate(current.parent_version_id);
    if (!parent) throw new Error('Parent version not found');

    await this.env.DB.prepare(`UPDATE prompt_templates SET status = 'rolled_back', rollback_target_id = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(parent.id, new Date().toISOString(), templateId, this.tenantId).run();
    await this.env.DB.prepare(`UPDATE prompt_templates SET status = 'active', updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(new Date().toISOString(), parent.id, this.tenantId).run();

    const record: RollbackRecord = {
      id: crypto.randomUUID(), tenant_id: this.tenantId,
      from_version_id: templateId, to_version_id: parent.id,
      reason, initiated_by: initiatedBy,
      performance_snapshot: current.performance_baseline || { avg_quality_score: 0, avg_latency_ms: 0, error_rate: 0, user_satisfaction: 0, sample_size: 0, measured_at: new Date().toISOString() },
      completed_at: new Date().toISOString(), auto_triggered: reason === 'auto_canary_fail'
    };

    await this.env.DB.prepare(`INSERT INTO prompt_rollbacks (id, tenant_id, from_version_id, to_version_id, reason, initiated_by, performance_snapshot, completed_at, auto_triggered) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(record.id, this.tenantId, record.from_version_id, record.to_version_id, record.reason, record.initiated_by, JSON.stringify(record.performance_snapshot), record.completed_at, record.auto_triggered ? 1 : 0)
      .run();
    return record;
  }

  async getVersionHistory(templateName: string): Promise<PromptTemplate[]> {
    const rows = await this.env.DB.prepare(`SELECT * FROM prompt_templates WHERE tenant_id = ? AND name = ? ORDER BY created_at DESC`).bind(this.tenantId, templateName).all();
    return (rows.results || []).map((r: any) => this.parseTemplate(r));
  }

  async getDiff(fromId: string, toId: string): Promise<VersionDiff> {
    const from = await this.getTemplate(fromId);
    const to = await this.getTemplate(toId);
    if (!from || !to) throw new Error('One or both versions not found');

    const layerChanges: LayerChange[] = [];
    const fromLayers = new Map(from.layers.map(l => [l.type, l]));
    const toLayers = new Map(to.layers.map(l => [l.type, l]));

    for (const [type, layer] of toLayers) {
      const fromLayer = fromLayers.get(type);
      if (!fromLayer) {
        layerChanges.push({ layer_type: type, action: 'added', new_content: layer.content, diff_summary: `Added ${type} layer` });
      } else if (fromLayer.content !== layer.content) {
        layerChanges.push({ layer_type: type, action: 'modified', old_content: fromLayer.content, new_content: layer.content, diff_summary: `Modified ${type} layer (${Math.abs(layer.content.length - fromLayer.content.length)} char delta)` });
      }
    }
    for (const [type] of fromLayers) {
      if (!toLayers.has(type)) {
        layerChanges.push({ layer_type: type, action: 'removed', old_content: fromLayers.get(type)!.content, diff_summary: `Removed ${type} layer` });
      }
    }

    const varChanges: string[] = [];
    const fromVars = new Set(from.variables.map(v => v.name));
    const toVars = new Set(to.variables.map(v => v.name));
    for (const v of toVars) { if (!fromVars.has(v)) varChanges.push(`Added variable: ${v}`); }
    for (const v of fromVars) { if (!toVars.has(v)) varChanges.push(`Removed variable: ${v}`); }

    const constraintChanges: string[] = [];
    if (from.constraints.length !== to.constraints.length) {
      constraintChanges.push(`Constraint count: ${from.constraints.length} → ${to.constraints.length}`);
    }

    return {
      from_version: from.version, to_version: to.version, changes: layerChanges,
      variable_changes: varChanges, constraint_changes: constraintChanges,
      impact_assessment: layerChanges.length > 2 ? 'High impact: multiple layer changes' :
        layerChanges.some(c => c.layer_type === 'system') ? 'Medium impact: system layer modified' : 'Low impact: minor changes'
    };
  }

  async getRollbackHistory(): Promise<RollbackRecord[]> {
    const rows = await this.env.DB.prepare(`SELECT * FROM prompt_rollbacks WHERE tenant_id = ? ORDER BY completed_at DESC LIMIT 50`).bind(this.tenantId).all();
    return (rows.results || []).map((r: any) => ({
      id: r.id, tenant_id: r.tenant_id, from_version_id: r.from_version_id,
      to_version_id: r.to_version_id, reason: r.reason, initiated_by: r.initiated_by,
      performance_snapshot: JSON.parse(r.performance_snapshot || '{}'),
      completed_at: r.completed_at, auto_triggered: !!r.auto_triggered
    }));
  }

  async updatePerformanceBaseline(templateId: string, baseline: PerformanceBaseline): Promise<void> {
    await this.env.DB.prepare(`UPDATE prompt_templates SET performance_baseline = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(JSON.stringify(baseline), new Date().toISOString(), templateId, this.tenantId).run();
  }

  private bumpVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const parts = version.split('.').map(Number);
    if (parts.length !== 3) return '1.0.0';
    if (type === 'major') return `${parts[0] + 1}.0.0`;
    if (type === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }

  private parseTemplate(row: any): PromptTemplate {
    return {
      id: row.id, tenant_id: row.tenant_id, name: row.name, description: row.description,
      version: row.version, status: row.status, layers: JSON.parse(row.layers || '[]'),
      variables: JSON.parse(row.variables || '[]'), constraints: JSON.parse(row.constraints || '[]'),
      max_tokens: row.max_tokens, model_target: row.model_target,
      tags: JSON.parse(row.tags || '[]'), created_by: row.created_by,
      approved_by: row.approved_by, approval_status: row.approval_status,
      parent_version_id: row.parent_version_id, rollback_target_id: row.rollback_target_id,
      performance_baseline: row.performance_baseline ? JSON.parse(row.performance_baseline) : null,
      created_at: row.created_at, updated_at: row.updated_at
    };
  }
}

// ─── Experiment Engine ──────────────────────────────────────────────

class PromptExperimentEngine {
  private env: Env;
  private tenantId: string;

  constructor(env: Env, tenantId: string) {
    this.env = env;
    this.tenantId = tenantId;
  }

  async createExperiment(experiment: Omit<PromptExperiment, 'id' | 'created_at' | 'updated_at' | 'started_at' | 'completed_at' | 'winner_variant_id' | 'results'>): Promise<PromptExperiment> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const totalTraffic = Object.values(experiment.traffic_allocation).reduce((s, v) => s + v, 0);
    if (Math.abs(totalTraffic - 100) > 0.01) throw new Error(`Traffic allocation must sum to 100, got ${totalTraffic}`);
    if (!experiment.variants.some(v => v.is_control)) throw new Error('At least one variant must be a control');

    const full: PromptExperiment = { ...experiment, id, started_at: null, completed_at: null, winner_variant_id: null, results: null, created_at: now, updated_at: now };

    await this.env.DB.prepare(`INSERT INTO prompt_experiments (id, tenant_id, name, description, status, variants, traffic_allocation, target_metric, min_sample_size, max_duration_hours, confidence_threshold, started_at, completed_at, winner_variant_id, results, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, this.tenantId, full.name, full.description, full.status, JSON.stringify(full.variants), JSON.stringify(full.traffic_allocation), full.target_metric, full.min_sample_size, full.max_duration_hours, full.confidence_threshold, null, null, null, null, now, now)
      .run();
    return full;
  }

  async startExperiment(experimentId: string): Promise<PromptExperiment> {
    const now = new Date().toISOString();
    await this.env.DB.prepare(`UPDATE prompt_experiments SET status = 'running', started_at = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(now, now, experimentId, this.tenantId).run();
    return (await this.getExperiment(experimentId))!;
  }

  async getExperiment(experimentId: string): Promise<PromptExperiment | null> {
    const row = await this.env.DB.prepare(`SELECT * FROM prompt_experiments WHERE id = ? AND tenant_id = ?`).bind(experimentId, this.tenantId).first();
    return row ? this.parseExperiment(row) : null;
  }

  async listExperiments(status?: ExperimentStatus): Promise<PromptExperiment[]> {
    let query = 'SELECT * FROM prompt_experiments WHERE tenant_id = ?';
    const params: any[] = [this.tenantId];
    if (status) { query += ' AND status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC';
    const rows = await this.env.DB.prepare(query).bind(...params).all();
    return (rows.results || []).map((r: any) => this.parseExperiment(r));
  }

  async recordImpression(experimentId: string, variantId: string, metrics: { quality_score: number; latency_ms: number; error: boolean; user_satisfied: boolean; converted: boolean }): Promise<void> {
    await this.env.DB.prepare(`INSERT INTO prompt_experiment_impressions (id, tenant_id, experiment_id, variant_id, quality_score, latency_ms, is_error, user_satisfied, converted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), this.tenantId, experimentId, variantId, metrics.quality_score, metrics.latency_ms, metrics.error ? 1 : 0, metrics.user_satisfied ? 1 : 0, metrics.converted ? 1 : 0, new Date().toISOString())
      .run();
  }

  async evaluateExperiment(experimentId: string): Promise<ExperimentResults> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) throw new Error('Experiment not found');

    const rows = await this.env.DB.prepare(`SELECT variant_id, COUNT(*) as impressions, AVG(quality_score) as avg_quality, AVG(latency_ms) as avg_latency, SUM(is_error) * 1.0 / COUNT(*) as error_rate, SUM(user_satisfied) * 1.0 / COUNT(*) as satisfaction_rate, SUM(converted) * 1.0 / COUNT(*) as conversion_rate FROM prompt_experiment_impressions WHERE tenant_id = ? AND experiment_id = ? GROUP BY variant_id`)
      .bind(this.tenantId, experimentId).all();

    const byVariant: Record<string, VariantMetrics> = {};
    let totalImpressions = 0;

    for (const row of (rows.results || []) as any[]) {
      totalImpressions += row.impressions;
      const stdDevResult = await this.env.DB.prepare(`SELECT AVG((quality_score - ?) * (quality_score - ?)) as variance FROM prompt_experiment_impressions WHERE tenant_id = ? AND experiment_id = ? AND variant_id = ?`)
        .bind(row.avg_quality, row.avg_quality, this.tenantId, experimentId, row.variant_id).first<{ variance: number }>();

      byVariant[row.variant_id] = {
        impressions: row.impressions,
        avg_quality_score: Math.round(row.avg_quality * 1000) / 1000,
        avg_latency_ms: Math.round(row.avg_latency * 100) / 100,
        error_rate: Math.round(row.error_rate * 10000) / 10000,
        user_satisfaction: Math.round(row.satisfaction_rate * 1000) / 1000,
        conversion_rate: Math.round(row.conversion_rate * 1000) / 1000,
        std_dev: Math.round(Math.sqrt(stdDevResult?.variance || 0) * 1000) / 1000
      };
    }

    // Z-test for statistical significance
    const variantEntries = Object.entries(byVariant);
    let statSig = false, pValue = 1, winner: string | null = null;
    let ci: [number, number] = [0, 0];

    if (variantEntries.length >= 2) {
      const [controlId, controlMetrics] = variantEntries.find(([vid]) => experiment.variants.find(v => v.id === vid)?.is_control) || variantEntries[0];
      const [treatmentId, treatmentMetrics] = variantEntries.find(([vid]) => vid !== controlId) || variantEntries[1];
      if (controlMetrics && treatmentMetrics) {
        const result = this.zTest(controlMetrics.conversion_rate, controlMetrics.impressions, treatmentMetrics.conversion_rate, treatmentMetrics.impressions, experiment.confidence_threshold);
        statSig = result.significant; pValue = result.p; ci = result.confidenceInterval;
        if (statSig) {
          const metric = experiment.target_metric as keyof VariantMetrics;
          const cVal = typeof controlMetrics[metric] === 'number' ? controlMetrics[metric] as number : 0;
          const tVal = typeof treatmentMetrics[metric] === 'number' ? treatmentMetrics[metric] as number : 0;
          winner = tVal > cVal ? treatmentId : controlId;
        }
      }
    }

    const meetsMinSample = totalImpressions >= experiment.min_sample_size;
    const recommendation = !meetsMinSample ? `Need ${experiment.min_sample_size - totalImpressions} more impressions` :
      statSig && winner ? `Promote variant "${experiment.variants.find(v => v.id === winner)?.name}" (p=${pValue.toFixed(4)})` :
      'No significant difference — continue or keep control';

    const results: ExperimentResults = {
      total_impressions: totalImpressions, by_variant: byVariant,
      statistical_significance: statSig, p_value: Math.round(pValue * 10000) / 10000,
      confidence_interval: ci, winner, recommendation
    };

    await this.env.DB.prepare(`UPDATE prompt_experiments SET results = ?, winner_variant_id = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(JSON.stringify(results), winner, new Date().toISOString(), experimentId, this.tenantId).run();
    return results;
  }

  async completeExperiment(experimentId: string): Promise<PromptExperiment> {
    const results = await this.evaluateExperiment(experimentId);
    const now = new Date().toISOString();
    await this.env.DB.prepare(`UPDATE prompt_experiments SET status = 'completed', completed_at = ?, results = ?, updated_at = ? WHERE id = ? AND tenant_id = ?`)
      .bind(now, JSON.stringify(results), now, experimentId, this.tenantId).run();
    return (await this.getExperiment(experimentId))!;
  }

  async selectVariant(experimentId: string): Promise<{ variant_id: string; prompt_version_id: string }> {
    const experiment = await this.getExperiment(experimentId);
    if (!experiment || experiment.status !== 'running') throw new Error('Experiment not running');
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += experiment.traffic_allocation[variant.id] || 0;
      if (rand <= cumulative) return { variant_id: variant.id, prompt_version_id: variant.prompt_version_id };
    }
    const control = experiment.variants.find(v => v.is_control) || experiment.variants[0];
    return { variant_id: control.id, prompt_version_id: control.prompt_version_id };
  }

  private zTest(p1: number, n1: number, p2: number, n2: number, confidenceThreshold: number): { significant: boolean; p: number; confidenceInterval: [number, number] } {
    if (n1 < 2 || n2 < 2) return { significant: false, p: 1, confidenceInterval: [0, 0] };
    const pPooled = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
    if (se === 0) return { significant: false, p: 1, confidenceInterval: [0, 0] };
    const z = (p2 - p1) / se;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    const zAlpha = 1.96;
    const seDiff = Math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2);
    const diff = p2 - p1;
    return {
      significant: pValue < (1 - confidenceThreshold), p: pValue,
      confidenceInterval: [Math.round((diff - zAlpha * seDiff) * 10000) / 10000, Math.round((diff + zAlpha * seDiff) * 10000) / 10000]
    };
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.SQRT2;
    const t = 1.0 / (1.0 + p * x);
    return 0.5 * (1.0 + sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)));
  }

  private parseExperiment(row: any): PromptExperiment {
    return {
      id: row.id, tenant_id: row.tenant_id, name: row.name, description: row.description,
      status: row.status, variants: JSON.parse(row.variants || '[]'),
      traffic_allocation: JSON.parse(row.traffic_allocation || '{}'),
      target_metric: row.target_metric, min_sample_size: row.min_sample_size,
      max_duration_hours: row.max_duration_hours, confidence_threshold: row.confidence_threshold,
      started_at: row.started_at, completed_at: row.completed_at,
      winner_variant_id: row.winner_variant_id,
      results: row.results ? JSON.parse(row.results) : null,
      created_at: row.created_at, updated_at: row.updated_at
    };
  }
}

// ─── Firewall Audit Logger ──────────────────────────────────────────

class FirewallAuditLogger {
  private env: Env;
  private tenantId: string;

  constructor(env: Env, tenantId: string) { this.env = env; this.tenantId = tenantId; }

  async logScan(userId: string, result: FirewallResult): Promise<void> {
    if (result.violations.length === 0) return;
    await this.env.DB.prepare(`INSERT INTO prompt_firewall_logs (id, tenant_id, user_id, action, threat_level, violation_count, categories, scan_duration_ms, input_length, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), this.tenantId, userId, result.action, result.threat_level, result.violations.length, JSON.stringify([...new Set(result.violations.map(v => v.category))]), result.scan_duration_ms, result.original_input.length, new Date().toISOString())
      .run();
  }

  async getRecentLogs(limit: number = 50): Promise<any[]> {
    const rows = await this.env.DB.prepare(`SELECT * FROM prompt_firewall_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`).bind(this.tenantId, limit).all();
    return (rows.results || []).map((r: any) => ({ ...r, categories: JSON.parse(r.categories || '[]') }));
  }

  async getStats(period: string = '7d'): Promise<Record<string, any>> {
    const days = period === '30d' ? 30 : period === '24h' ? 1 : 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const rows = await this.env.DB.prepare(`SELECT action, threat_level, COUNT(*) as cnt FROM prompt_firewall_logs WHERE tenant_id = ? AND created_at > ? GROUP BY action, threat_level`).bind(this.tenantId, since).all();
    const byAction: Record<string, number> = {};
    const byThreat: Record<string, number> = {};
    let total = 0;
    for (const r of (rows.results || []) as any[]) {
      byAction[r.action] = (byAction[r.action] || 0) + r.cnt;
      byThreat[r.threat_level] = (byThreat[r.threat_level] || 0) + r.cnt;
      total += r.cnt;
    }
    return { period, total_violations: total, by_action: byAction, by_threat_level: byThreat };
  }
}

// ─── Schema ─────────────────────────────────────────────────────────

export const PROMPT_ENGINE_SCHEMA = `
CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
  version TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', layers TEXT NOT NULL,
  variables TEXT, constraints TEXT, max_tokens INTEGER DEFAULT 4096, model_target TEXT,
  tags TEXT, created_by TEXT, approved_by TEXT, approval_status TEXT DEFAULT 'pending',
  parent_version_id TEXT, rollback_target_id TEXT, performance_baseline TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompt_tpl_tenant ON prompt_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tpl_name ON prompt_templates(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_prompt_tpl_status ON prompt_templates(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_prompt_tpl_version ON prompt_templates(tenant_id, name, version);
CREATE INDEX IF NOT EXISTS idx_prompt_tpl_approval ON prompt_templates(tenant_id, approval_status);

CREATE TABLE IF NOT EXISTS prompt_rollbacks (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, from_version_id TEXT NOT NULL,
  to_version_id TEXT NOT NULL, reason TEXT NOT NULL, initiated_by TEXT NOT NULL,
  performance_snapshot TEXT, completed_at TEXT NOT NULL, auto_triggered INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_prompt_rollback_tenant ON prompt_rollbacks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prompt_rollback_time ON prompt_rollbacks(tenant_id, completed_at);

CREATE TABLE IF NOT EXISTS prompt_experiments (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', variants TEXT NOT NULL, traffic_allocation TEXT NOT NULL,
  target_metric TEXT NOT NULL, min_sample_size INTEGER DEFAULT 1000,
  max_duration_hours INTEGER DEFAULT 168, confidence_threshold REAL DEFAULT 0.95,
  started_at TEXT, completed_at TEXT, winner_variant_id TEXT, results TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompt_exp_tenant ON prompt_experiments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prompt_exp_status ON prompt_experiments(tenant_id, status);

CREATE TABLE IF NOT EXISTS prompt_experiment_impressions (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, experiment_id TEXT NOT NULL,
  variant_id TEXT NOT NULL, quality_score REAL, latency_ms REAL,
  is_error INTEGER DEFAULT 0, user_satisfied INTEGER DEFAULT 0,
  converted INTEGER DEFAULT 0, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompt_imp_exp ON prompt_experiment_impressions(tenant_id, experiment_id);
CREATE INDEX IF NOT EXISTS idx_prompt_imp_variant ON prompt_experiment_impressions(tenant_id, experiment_id, variant_id);

CREATE TABLE IF NOT EXISTS prompt_firewall_logs (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT, action TEXT NOT NULL,
  threat_level TEXT NOT NULL, violation_count INTEGER DEFAULT 0, categories TEXT,
  scan_duration_ms INTEGER, input_length INTEGER, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompt_fw_tenant ON prompt_firewall_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prompt_fw_time ON prompt_firewall_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_fw_threat ON prompt_firewall_logs(tenant_id, threat_level);

CREATE TABLE IF NOT EXISTS prompt_firewall_rules (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT,
  pattern TEXT NOT NULL, threat_level TEXT NOT NULL, action TEXT NOT NULL,
  enabled INTEGER DEFAULT 1, category TEXT NOT NULL, priority INTEGER DEFAULT 10,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_prompt_fwr_tenant ON prompt_firewall_rules(tenant_id);
`;

// ─── Route Handler ──────────────────────────────────────────────────

export async function handlePromptEngine(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const tenantId = userId.split(':')[0] || userId;
  const versionManager = new PromptVersionManager(env, tenantId);
  const experimentEngine = new PromptExperimentEngine(env, tenantId);
  const auditLogger = new FirewallAuditLogger(env, tenantId);
  const method = request.method;
  const subPath = path.replace('/api/prompts/', '').replace(/\/$/, '');

  if (subPath === 'init' && method === 'POST') {
    const statements = PROMPT_ENGINE_SCHEMA.split(';').filter(s => s.trim());
    for (const stmt of statements) { await env.DB.prepare(stmt).run(); }
    return json({ success: true, tables: ['prompt_templates', 'prompt_rollbacks', 'prompt_experiments', 'prompt_experiment_impressions', 'prompt_firewall_logs', 'prompt_firewall_rules'] });
  }

  if (subPath === 'compose' && method === 'POST') {
    const body = await request.json() as any;
    const firewall = body.firewall_rules ? new PromptFirewall(body.firewall_rules) : new PromptFirewall();
    const composer = new PromptComposer(new ContextSanitizer(), firewall);
    for (const layer of body.layers) {
      composer.addLayer(layer.type, layer.content, { immutable: layer.immutable, priority: layer.priority, metadata: layer.metadata });
    }
    const result = composer.compose(body.user_input, body.max_tokens);
    if (result.firewall_result.violations.length > 0) await auditLogger.logScan(userId, result.firewall_result);
    return json({ success: true, prompt: result });
  }

  if (subPath === 'firewall/scan' && method === 'POST') {
    const body = await request.json() as { input: string; custom_rules?: FirewallRule[] };
    const firewall = new PromptFirewall(body.custom_rules);
    const result = firewall.scan(body.input);
    await auditLogger.logScan(userId, result);
    return json({ success: true, result });
  }

  if (subPath === 'firewall/rules' && method === 'GET') {
    const rows = await env.DB.prepare(`SELECT * FROM prompt_firewall_rules WHERE tenant_id = ?`).bind(tenantId).all();
    const custom = (rows.results || []).map((r: any) => ({
      id: r.id, name: r.name, description: r.description, pattern: r.pattern,
      threat_level: r.threat_level, action: r.action, enabled: !!r.enabled, category: r.category, priority: r.priority
    }));
    return json({ success: true, default_rules: DEFAULT_FIREWALL_RULES, custom_rules: custom });
  }

  if (subPath === 'firewall/rules' && method === 'POST') {
    const body = await request.json() as Omit<FirewallRule, 'id'>;
    const id = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO prompt_firewall_rules (id, tenant_id, name, description, pattern, threat_level, action, enabled, category, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, tenantId, body.name, body.description, body.pattern, body.threat_level, body.action, body.enabled ? 1 : 0, body.category, body.priority, new Date().toISOString()).run();
    return json({ success: true, rule: { id, ...body } });
  }

  if (subPath === 'firewall/logs' && method === 'GET') {
    const url = new URL(request.url);
    const logs = await auditLogger.getRecentLogs(parseInt(url.searchParams.get('limit') || '50'));
    return json({ success: true, logs });
  }

  if (subPath === 'firewall/stats' && method === 'GET') {
    const url = new URL(request.url);
    const stats = await auditLogger.getStats(url.searchParams.get('period') || '7d');
    return json({ success: true, stats });
  }

  if (subPath === 'sanitize' && method === 'POST') {
    const body = await request.json() as { input: string; rules?: SanitizationRule[]; max_tokens?: number };
    const sanitizer = new ContextSanitizer(body.rules);
    return json({ success: true, ...sanitizer.sanitize(body.input, body.max_tokens) });
  }

  if (subPath === 'templates' && method === 'POST') {
    const body = await request.json() as any;
    body.tenant_id = tenantId; body.created_by = body.created_by || userId;
    return json({ success: true, template: await versionManager.createTemplate(body) });
  }

  if (subPath === 'templates' && method === 'GET') {
    const url = new URL(request.url);
    const result = await versionManager.listTemplates({
      status: url.searchParams.get('status') as PromptStatus | undefined,
      name: url.searchParams.get('name') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    });
    return json({ success: true, ...result });
  }

  const templateMatch = subPath.match(/^templates\/([^/]+)(?:\/(.+))?$/);
  if (templateMatch) {
    const templateId = templateMatch[1];
    const action = templateMatch[2];
    if (!action && method === 'GET') {
      const template = await versionManager.getTemplate(templateId);
      return template ? json({ success: true, template }) : json({ error: 'Not found' }, 404);
    }
    if (action === 'version' && method === 'POST') {
      const body = await request.json() as any;
      return json({ success: true, template: await versionManager.createNewVersion(templateId, body, body.bump || 'minor') });
    }
    if (action === 'approve' && method === 'POST') {
      const body = await request.json() as any;
      return json({ success: true, template: await versionManager.approveTemplate(templateId, body.approved_by || userId) });
    }
    if (action === 'activate' && method === 'POST') {
      return json({ success: true, template: await versionManager.activateTemplate(templateId) });
    }
    if (action === 'rollback' && method === 'POST') {
      const body = await request.json() as { reason: RollbackReason };
      return json({ success: true, rollback: await versionManager.rollback(templateId, body.reason, userId) });
    }
    if (action === 'baseline' && method === 'PUT') {
      await versionManager.updatePerformanceBaseline(templateId, await request.json() as PerformanceBaseline);
      return json({ success: true });
    }
  }

  if (subPath === 'versions' && method === 'GET') {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (!name) return json({ error: 'name parameter required' }, 400);
    return json({ success: true, versions: await versionManager.getVersionHistory(name) });
  }

  if (subPath === 'diff' && method === 'POST') {
    const body = await request.json() as { from_id: string; to_id: string };
    return json({ success: true, diff: await versionManager.getDiff(body.from_id, body.to_id) });
  }

  if (subPath === 'rollbacks' && method === 'GET') {
    return json({ success: true, rollbacks: await versionManager.getRollbackHistory() });
  }

  if (subPath === 'experiments' && method === 'POST') {
    const body = await request.json() as any;
    body.tenant_id = tenantId;
    return json({ success: true, experiment: await experimentEngine.createExperiment(body) });
  }

  if (subPath === 'experiments' && method === 'GET') {
    const url = new URL(request.url);
    return json({ success: true, experiments: await experimentEngine.listExperiments(url.searchParams.get('status') as ExperimentStatus | undefined) });
  }

  const expMatch = subPath.match(/^experiments\/([^/]+)(?:\/(.+))?$/);
  if (expMatch) {
    const expId = expMatch[1];
    const action = expMatch[2];
    if (!action && method === 'GET') {
      const exp = await experimentEngine.getExperiment(expId);
      return exp ? json({ success: true, experiment: exp }) : json({ error: 'Not found' }, 404);
    }
    if (action === 'start' && method === 'POST') return json({ success: true, experiment: await experimentEngine.startExperiment(expId) });
    if (action === 'impression' && method === 'POST') {
      const body = await request.json() as any;
      await experimentEngine.recordImpression(expId, body.variant_id, body);
      return json({ success: true });
    }
    if (action === 'evaluate' && method === 'POST') return json({ success: true, results: await experimentEngine.evaluateExperiment(expId) });
    if (action === 'complete' && method === 'POST') return json({ success: true, experiment: await experimentEngine.completeExperiment(expId) });
    if (action === 'select-variant' && method === 'GET') return json({ success: true, ...(await experimentEngine.selectVariant(expId)) });
  }

  return json({ error: 'Not Found', available_endpoints: [
    'POST /compose', 'POST /sanitize', 'POST /firewall/scan', 'GET /firewall/rules',
    'POST /firewall/rules', 'GET /firewall/logs', 'GET /firewall/stats',
    'POST /templates', 'GET /templates', 'GET /templates/:id',
    'POST /templates/:id/version', 'POST /templates/:id/approve', 'POST /templates/:id/activate',
    'POST /templates/:id/rollback', 'PUT /templates/:id/baseline',
    'GET /versions?name=', 'POST /diff', 'GET /rollbacks',
    'POST /experiments', 'GET /experiments', 'GET /experiments/:id',
    'POST /experiments/:id/start', 'POST /experiments/:id/impression',
    'POST /experiments/:id/evaluate', 'POST /experiments/:id/complete',
    'GET /experiments/:id/select-variant', 'POST /init'
  ] }, 404);
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
