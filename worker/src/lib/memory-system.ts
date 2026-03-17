/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR AI Employee Memory System — Enterprise-Grade Memory Architecture
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Three-layer memory architecture enabling AI employees to:
 * - Recall previous instructions and client preferences
 * - Track ongoing tasks and project progress
 * - Learn from repeated workflows and adapt over time
 *
 * Memory Layers:
 *   1. SHORT-TERM MEMORY — In-request working memory (current turn context)
 *   2. SESSION MEMORY — KV-backed per-conversation memory (active session)
 *   3. LONG-TERM MEMORY — D1-persisted organizational knowledge (permanent)
 *
 * Retrieval:
 *   - Relevance-scored retrieval with recency, importance, and semantic weighting
 *   - Category-based filtering (user prefs, company ops, tasks, workflows, facts)
 *   - Cross-employee knowledge sharing within an organization
 *   - Automatic memory consolidation (session → long-term) and decay
 */

import type { Env } from '../index';

// ══════════════════════════════════════════════════════
// 1. TYPES
// ══════════════════════════════════════════════════════

export type MemoryLayer = 'short_term' | 'session' | 'long_term';
export type MemoryCategory =
  | 'user_preference'      // How the user likes things done
  | 'user_identity'        // Name, role, department, contact info
  | 'company_operation'    // Business processes, policies, org structure
  | 'company_knowledge'    // Domain-specific facts, product info
  | 'conversation_context' // Key points from past conversations
  | 'task_record'          // Completed and ongoing tasks
  | 'project_progress'     // Milestones, deliverables, status
  | 'instruction'          // Standing orders and recurring directives
  | 'workflow_pattern'     // Learned sequences of actions
  | 'relationship'         // Connections between people, teams, accounts
  | 'feedback'             // User corrections and quality signals
  | 'entity';              // Named entities: people, companies, products

export type MemoryAccessLevel = 'private' | 'employee' | 'org_shared';
export type MemoryStatus = 'active' | 'archived' | 'decayed' | 'consolidated';
export type ConsolidationStrategy = 'merge' | 'supersede' | 'summarize';

export interface MemoryRecord {
  id: string;
  org_id: string;
  employee_id: string;
  user_id: string | null;        // null = org-wide memory
  category: MemoryCategory;
  subcategory: string;            // e.g. "communication_style", "meeting_schedule"
  content: string;                // The actual memory content
  structured_data: Record<string, any> | null; // Optional structured payload
  source: MemorySource;
  importance: number;             // 0.0–1.0
  confidence: number;             // 0.0–1.0 how certain we are this is accurate
  access_level: MemoryAccessLevel;
  status: MemoryStatus;
  access_count: number;           // Times retrieved
  last_accessed: string;
  decay_rate: number;             // 0.0–1.0 per day (0 = never decays)
  tags: string[];
  related_memories: string[];     // IDs of linked memories
  created_at: string;
  updated_at: string;
  expires_at: string | null;      // null = permanent
}

export interface MemorySource {
  type: 'conversation' | 'task' | 'document' | 'manual' | 'inferred' | 'integration' | 'feedback';
  reference_id: string;           // conversation_id, task_id, etc.
  extraction_method: 'explicit' | 'pattern' | 'nlp' | 'user_confirmed';
  timestamp: string;
}

export interface MemoryQuery {
  org_id: string;
  employee_id: string;
  user_id?: string;
  query_text: string;
  categories?: MemoryCategory[];
  min_importance?: number;
  min_confidence?: number;
  max_results?: number;
  include_org_shared?: boolean;
  include_expired?: boolean;
  recency_weight?: number;        // 0.0–1.0 how much to weight recency
  importance_weight?: number;     // 0.0–1.0 how much to weight importance
  relevance_weight?: number;      // 0.0–1.0 how much to weight text relevance
}

export interface MemoryRetrievalResult {
  memories: ScoredMemory[];
  query_tokens: string[];
  total_searched: number;
  retrieval_time_ms: number;
  layers_searched: MemoryLayer[];
}

export interface ScoredMemory extends MemoryRecord {
  relevance_score: number;
  recency_score: number;
  importance_score: number;
  final_score: number;
  match_reason: string;
}

export interface ShortTermEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  extracted_entities: string[];
  detected_intent: string;
  emotional_tone: string;
}

export interface SessionMemoryState {
  session_id: string;
  employee_id: string;
  org_id: string;
  user_id: string;
  started_at: string;
  last_activity: string;
  short_term: ShortTermEntry[];       // Current turn context (last N messages)
  session_facts: SessionFact[];       // Facts extracted during this session
  active_tasks: string[];             // Task IDs being discussed
  user_context: Record<string, any>;  // Temporary user-specific context
  topic_stack: string[];              // Current conversation topics
  pending_extractions: string[];      // Memories to extract at session end
}

export interface SessionFact {
  id: string;
  content: string;
  category: MemoryCategory;
  confidence: number;
  source_turn: number;
  promoted_to_long_term: boolean;
}

export interface WorkflowPattern {
  id: string;
  org_id: string;
  employee_id: string;
  name: string;
  description: string;
  trigger_phrases: string[];
  steps: WorkflowStep[];
  execution_count: number;
  avg_duration_ms: number;
  success_rate: number;
  last_executed: string;
  learned_from: string[];      // Source task/conversation IDs
  confidence: number;
}

export interface WorkflowStep {
  order: number;
  action: string;
  tool: string | null;
  parameters: Record<string, any>;
  expected_output: string;
  fallback_action: string | null;
}

export interface ConsolidationResult {
  memories_processed: number;
  memories_merged: number;
  memories_archived: number;
  memories_decayed: number;
  new_patterns_detected: number;
  duration_ms: number;
}

export interface MemoryStats {
  org_id: string;
  employee_id: string;
  total_memories: number;
  by_category: Record<MemoryCategory, number>;
  by_status: Record<MemoryStatus, number>;
  by_access_level: Record<MemoryAccessLevel, number>;
  avg_importance: number;
  avg_confidence: number;
  total_retrievals: number;
  workflow_patterns: number;
  oldest_memory: string;
  newest_memory: string;
  storage_estimate_kb: number;
}

// ══════════════════════════════════════════════════════
// 2. SHORT-TERM MEMORY (in-request working memory)
// ══════════════════════════════════════════════════════

export class ShortTermMemory {
  private entries: ShortTermEntry[] = [];
  private maxEntries: number;

  constructor(maxEntries = 30) {
    this.maxEntries = maxEntries;
  }

  /** Add a turn to short-term memory with NLP extraction */
  addTurn(role: 'user' | 'assistant' | 'system', content: string): void {
    const entry: ShortTermEntry = {
      role,
      content,
      timestamp: new Date().toISOString(),
      extracted_entities: this.extractEntities(content),
      detected_intent: this.detectIntent(content),
      emotional_tone: this.detectTone(content),
    };

    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  /** Get recent turns formatted for LLM context injection */
  getContextWindow(maxTurns = 15): string {
    const recent = this.entries.slice(-maxTurns);
    return recent.map(e => {
      const prefix = e.role === 'user' ? 'User' : e.role === 'assistant' ? 'AI' : 'System';
      return `${prefix}: ${e.content}`;
    }).join('\n');
  }

  /** Get all entities mentioned in the current context */
  getCurrentEntities(): string[] {
    const all = this.entries.flatMap(e => e.extracted_entities);
    return [...new Set(all)];
  }

  /** Get the dominant conversation topic */
  getCurrentTopic(): string {
    const intents = this.entries.slice(-5).map(e => e.detected_intent);
    const counts: Record<string, number> = {};
    for (const intent of intents) {
      counts[intent] = (counts[intent] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
  }

  /** Extract named entities from text */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    // Proper nouns (capitalized multi-word sequences)
    const nameMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
    entities.push(...nameMatches);

    // Email addresses
    const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
    entities.push(...emails);

    // Dates
    const dates = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4}\b/gi) || [];
    entities.push(...dates);

    // Currency amounts
    const amounts = text.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
    entities.push(...amounts);

    // Company-like patterns (Inc., Corp., LLC, Ltd.)
    const companies = text.match(/\b[\w\s]+(?:Inc|Corp|LLC|Ltd|Co)\b\.?/g) || [];
    entities.push(...companies.map(c => c.trim()));

    // Project/ticket references
    const tickets = text.match(/\b[A-Z]{2,6}-\d{1,6}\b/g) || [];
    entities.push(...tickets);

    return [...new Set(entities)];
  }

  /** Detect user intent from message */
  private detectIntent(text: string): string {
    const lower = text.toLowerCase();
    if (lower.match(/\b(schedule|meeting|calendar|book)\b/)) return 'scheduling';
    if (lower.match(/\b(email|send|draft|message|write to)\b/)) return 'communication';
    if (lower.match(/\b(task|todo|assign|complete|deadline)\b/)) return 'task_management';
    if (lower.match(/\b(report|analyze|data|chart|metric|number)\b/)) return 'analysis';
    if (lower.match(/\b(find|search|look up|where|locate)\b/)) return 'search';
    if (lower.match(/\b(help|how|what|explain|can you)\b/)) return 'question';
    if (lower.match(/\b(remember|don't forget|always|prefer|like when)\b/)) return 'instruction';
    if (lower.match(/\b(status|progress|update|how's|where are we)\b/)) return 'status_check';
    if (lower.match(/\b(hire|onboard|candidate|interview|resume)\b/)) return 'hr_process';
    if (lower.match(/\b(invoice|payment|budget|expense|cost)\b/)) return 'financial';
    return 'general';
  }

  /** Detect emotional tone */
  private detectTone(text: string): string {
    const lower = text.toLowerCase();
    if (lower.match(/\b(urgent|asap|immediately|critical|now)\b/)) return 'urgent';
    if (lower.match(/\b(thanks|great|awesome|perfect|love)\b/)) return 'positive';
    if (lower.match(/\b(frustrated|angry|annoyed|terrible|wrong)\b/)) return 'negative';
    if (lower.match(/\b(confused|not sure|don't understand|unclear)\b/)) return 'confused';
    return 'neutral';
  }

  getEntries(): ShortTermEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

// ══════════════════════════════════════════════════════
// 3. SESSION MEMORY (KV-backed per-conversation)
// ══════════════════════════════════════════════════════

export class SessionMemory {
  constructor(private env: Env) {}

  /** Initialize or resume a session */
  async getOrCreate(sessionId: string, employeeId: string, orgId: string, userId: string): Promise<SessionMemoryState> {
    const key = `session-mem:${sessionId}`;
    const raw = await this.env.CACHE.get(key);

    if (raw) {
      const state = JSON.parse(raw) as SessionMemoryState;
      state.last_activity = new Date().toISOString();
      return state;
    }

    const state: SessionMemoryState = {
      session_id: sessionId,
      employee_id: employeeId,
      org_id: orgId,
      user_id: userId,
      started_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      short_term: [],
      session_facts: [],
      active_tasks: [],
      user_context: {},
      topic_stack: [],
      pending_extractions: [],
    };

    await this.save(state);
    return state;
  }

  /** Record a turn and extract session-level facts */
  async recordTurn(sessionId: string, role: 'user' | 'assistant', content: string): Promise<SessionFact[]> {
    const state = await this.load(sessionId);
    if (!state) return [];

    const turnNumber = state.short_term.length;
    const stm = new ShortTermMemory();
    // Re-hydrate short-term from session state
    for (const entry of state.short_term) {
      stm.addTurn(entry.role as any, entry.content);
    }
    stm.addTurn(role, content);

    state.short_term = stm.getEntries().slice(-30);

    // Extract session facts from user messages
    const newFacts: SessionFact[] = [];
    if (role === 'user') {
      const extracted = this.extractSessionFacts(content, turnNumber);
      newFacts.push(...extracted);
      state.session_facts.push(...extracted);

      // Update topic stack
      const topic = stm.getCurrentTopic();
      if (state.topic_stack[state.topic_stack.length - 1] !== topic) {
        state.topic_stack.push(topic);
        if (state.topic_stack.length > 20) state.topic_stack = state.topic_stack.slice(-20);
      }
    }

    state.last_activity = new Date().toISOString();
    await this.save(state);
    return newFacts;
  }

  /** Extract memory-worthy facts from a user message */
  private extractSessionFacts(content: string, turnNumber: number): SessionFact[] {
    const facts: SessionFact[] = [];
    const lower = content.toLowerCase();
    const mkFact = (text: string, cat: MemoryCategory, conf: number): SessionFact => ({
      id: `sf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      content: text, category: cat, confidence: conf,
      source_turn: turnNumber, promoted_to_long_term: false,
    });

    // User preferences: "I prefer...", "I like...", "always...", "never..."
    const prefPatterns: { regex: RegExp; confidence: number }[] = [
      { regex: /i (?:prefer|like|want)\s+(.+?)(?:\.|$)/i, confidence: 0.85 },
      { regex: /(?:please )?always\s+(.+?)(?:\.|$)/i, confidence: 0.90 },
      { regex: /(?:please )?never\s+(.+?)(?:\.|$)/i, confidence: 0.90 },
      { regex: /(?:please )?don't\s+(.+?)(?:\.|$)/i, confidence: 0.80 },
      { regex: /my (?:preferred|favorite)\s+(\w+)\s+is\s+(.+?)(?:\.|$)/i, confidence: 0.90 },
    ];
    for (const { regex, confidence } of prefPatterns) {
      const match = content.match(regex);
      if (match) facts.push(mkFact(match[0].trim(), 'user_preference', confidence));
    }

    // User identity: "my name is...", "I'm the...", "I work in..."
    const identityPatterns = [
      /my name is\s+(\w[\w\s]*)/i,
      /i(?:'m| am) (?:the |a )?(\w[\w\s]*?)\s+(?:at|in|for|of)\b/i,
      /i work (?:in|at|for)\s+(.+?)(?:\.|$)/i,
      /my (?:email|phone|extension) is\s+(.+?)(?:\.|$)/i,
      /i(?:'m| am) (?:based|located) in\s+(.+?)(?:\.|$)/i,
    ];
    for (const regex of identityPatterns) {
      const match = content.match(regex);
      if (match) facts.push(mkFact(match[0].trim(), 'user_identity', 0.90));
    }

    // Instructions: "remember that...", "keep in mind...", "note that..."
    const instructionPatterns = [
      /(?:remember|note|keep in mind)\s+(?:that\s+)?(.+?)(?:\.|$)/i,
      /(?:from now on|going forward)\s*,?\s*(.+?)(?:\.|$)/i,
      /(?:whenever|every time)\s+(.+?)(?:\.|$)/i,
    ];
    for (const regex of instructionPatterns) {
      const match = content.match(regex);
      if (match) facts.push(mkFact(match[0].trim(), 'instruction', 0.85));
    }

    // Company operations: mentions of processes, policies, tools
    if (lower.match(/\b(our (?:process|policy|procedure|system|tool|platform))\b/)) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
      for (const s of sentences) {
        if (s.toLowerCase().match(/\b(our|we|the company|the team)\b/)) {
          facts.push(mkFact(s.trim(), 'company_operation', 0.70));
        }
      }
    }

    // Task references
    if (lower.match(/\b(task|project|deadline|milestone|deliverable)\b/)) {
      facts.push(mkFact(content.slice(0, 300), 'task_record', 0.65));
    }

    // Relationship mentions
    const relationshipPattern = /(\w+)\s+(?:is|works as|manages|reports to|leads)\s+(.+?)(?:\.|$)/i;
    const relMatch = content.match(relationshipPattern);
    if (relMatch) facts.push(mkFact(relMatch[0].trim(), 'relationship', 0.75));

    return facts;
  }

  /** Add user context data to session (e.g., current project, active deal) */
  async setUserContext(sessionId: string, key: string, value: any): Promise<void> {
    const state = await this.load(sessionId);
    if (!state) return;
    state.user_context[key] = value;
    await this.save(state);
  }

  /** Track a task being discussed in this session */
  async trackTask(sessionId: string, taskId: string): Promise<void> {
    const state = await this.load(sessionId);
    if (!state) return;
    if (!state.active_tasks.includes(taskId)) {
      state.active_tasks.push(taskId);
    }
    await this.save(state);
  }

  /** Get conversation summary for this session */
  async getSessionSummary(sessionId: string): Promise<{
    duration_ms: number;
    turn_count: number;
    topics: string[];
    facts_extracted: number;
    active_tasks: string[];
    user_sentiment: string;
  } | null> {
    const state = await this.load(sessionId);
    if (!state) return null;

    const started = new Date(state.started_at).getTime();
    const lastActive = new Date(state.last_activity).getTime();

    // Compute dominant sentiment
    const tones = state.short_term.map(e => e.emotional_tone);
    const toneCounts: Record<string, number> = {};
    for (const t of tones) toneCounts[t] = (toneCounts[t] || 0) + 1;
    const dominantTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    return {
      duration_ms: lastActive - started,
      turn_count: state.short_term.length,
      topics: [...new Set(state.topic_stack)],
      facts_extracted: state.session_facts.length,
      active_tasks: state.active_tasks,
      user_sentiment: dominantTone,
    };
  }

  private async load(sessionId: string): Promise<SessionMemoryState | null> {
    const raw = await this.env.CACHE.get(`session-mem:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  }

  private async save(state: SessionMemoryState): Promise<void> {
    await this.env.CACHE.put(`session-mem:${state.session_id}`, JSON.stringify(state), { expirationTtl: 86400 }); // 24h TTL
  }
}

// ══════════════════════════════════════════════════════
// 4. LONG-TERM MEMORY (D1-persisted)
// ══════════════════════════════════════════════════════

export class LongTermMemory {
  constructor(private env: Env) {}

  /** Store a new memory */
  async store(memory: Omit<MemoryRecord, 'id' | 'access_count' | 'last_accessed' | 'created_at' | 'updated_at'>): Promise<MemoryRecord> {
    const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const record: MemoryRecord = {
      ...memory,
      id,
      access_count: 0,
      last_accessed: now,
      created_at: now,
      updated_at: now,
    };

    await this.env.DB.prepare(`
      INSERT INTO employee_memories (
        id, org_id, employee_id, user_id, category, subcategory, content,
        structured_data, source_type, source_ref, extraction_method, source_timestamp,
        importance, confidence, access_level, status,
        access_count, last_accessed, decay_rate, tags, related_memories,
        created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, record.org_id, record.employee_id, record.user_id,
      record.category, record.subcategory, record.content,
      record.structured_data ? JSON.stringify(record.structured_data) : null,
      record.source.type, record.source.reference_id,
      record.source.extraction_method, record.source.timestamp,
      record.importance, record.confidence, record.access_level, record.status,
      0, now, record.decay_rate,
      JSON.stringify(record.tags), JSON.stringify(record.related_memories),
      now, now, record.expires_at
    ).run();

    return record;
  }

  /** Update an existing memory */
  async update(id: string, updates: { content?: string; importance?: number; confidence?: number; status?: MemoryStatus; structured_data?: Record<string, any>; tags?: string[] }): Promise<void> {
    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];

    if (updates.content !== undefined) { setClauses.push('content = ?'); values.push(updates.content); }
    if (updates.importance !== undefined) { setClauses.push('importance = ?'); values.push(updates.importance); }
    if (updates.confidence !== undefined) { setClauses.push('confidence = ?'); values.push(updates.confidence); }
    if (updates.status !== undefined) { setClauses.push('status = ?'); values.push(updates.status); }
    if (updates.structured_data !== undefined) { setClauses.push('structured_data = ?'); values.push(JSON.stringify(updates.structured_data)); }
    if (updates.tags !== undefined) { setClauses.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }

    values.push(id);
    await this.env.DB.prepare(`UPDATE employee_memories SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  /** Delete a memory */
  async delete(id: string): Promise<void> {
    await this.env.DB.prepare('DELETE FROM employee_memories WHERE id = ?').bind(id).run();
  }

  /** Retrieve a single memory by ID and increment access count */
  async get(id: string): Promise<MemoryRecord | null> {
    const row = await this.env.DB.prepare('SELECT * FROM employee_memories WHERE id = ?').bind(id).first<any>();
    if (!row) return null;

    // Increment access count
    await this.env.DB.prepare('UPDATE employee_memories SET access_count = access_count + 1, last_accessed = ? WHERE id = ?')
      .bind(new Date().toISOString(), id).run();

    return this.rowToRecord(row);
  }

  /** Full-text relevance search across memories */
  async search(query: MemoryQuery): Promise<MemoryRetrievalResult> {
    const startTime = Date.now();
    const queryTokens = this.tokenize(query.query_text);

    // Build SQL query with filters
    const conditions: string[] = ['m.org_id = ?', 'm.status = ?'];
    const params: any[] = [query.org_id, 'active'];

    // Access scope: employee's own + optionally org-shared
    if (query.include_org_shared) {
      conditions.push('(m.employee_id = ? OR m.access_level = ?)');
      params.push(query.employee_id, 'org_shared');
    } else {
      conditions.push('m.employee_id = ?');
      params.push(query.employee_id);
    }

    if (query.user_id) {
      conditions.push('(m.user_id = ? OR m.user_id IS NULL)');
      params.push(query.user_id);
    }

    if (query.categories && query.categories.length > 0) {
      conditions.push(`m.category IN (${query.categories.map(() => '?').join(',')})`);
      params.push(...query.categories);
    }

    if (query.min_importance) {
      conditions.push('m.importance >= ?');
      params.push(query.min_importance);
    }

    if (query.min_confidence) {
      conditions.push('m.confidence >= ?');
      params.push(query.min_confidence);
    }

    if (!query.include_expired) {
      conditions.push('(m.expires_at IS NULL OR m.expires_at > ?)');
      params.push(new Date().toISOString());
    }

    const limit = Math.min(query.max_results || 50, 200);

    const sql = `
      SELECT * FROM employee_memories m
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.importance DESC, m.updated_at DESC
      LIMIT ?
    `;
    params.push(limit * 3); // Fetch more than needed for scoring

    const result = await this.env.DB.prepare(sql).bind(...params).all();
    const rows = (result.results || []) as any[];

    // Score and rank results
    const recencyWeight = query.recency_weight ?? 0.3;
    const importanceWeight = query.importance_weight ?? 0.3;
    const relevanceWeight = query.relevance_weight ?? 0.4;

    const scored: ScoredMemory[] = rows.map(row => {
      const record = this.rowToRecord(row);

      // Relevance: token overlap between query and memory content
      const contentTokens = this.tokenize(record.content + ' ' + record.subcategory + ' ' + record.tags.join(' '));
      const matchingTokens = queryTokens.filter(t => contentTokens.some(ct => ct.includes(t) || t.includes(ct)));
      const relevanceScore = queryTokens.length > 0 ? matchingTokens.length / queryTokens.length : 0;

      // Recency: exponential decay based on age
      const ageMs = Date.now() - new Date(record.updated_at).getTime();
      const ageDays = ageMs / (86400 * 1000);
      const recencyScore = Math.exp(-ageDays / 30); // Half-life of ~21 days

      // Importance: direct from record
      const importanceScore = record.importance;

      // Combined score
      const finalScore = (relevanceScore * relevanceWeight) + (recencyScore * recencyWeight) + (importanceScore * importanceWeight);

      const matchReason = matchingTokens.length > 0
        ? `Matched: ${matchingTokens.slice(0, 5).join(', ')}`
        : 'Importance/recency match';

      return {
        ...record,
        relevance_score: Math.round(relevanceScore * 100) / 100,
        recency_score: Math.round(recencyScore * 100) / 100,
        importance_score: importanceScore,
        final_score: Math.round(finalScore * 1000) / 1000,
        match_reason: matchReason,
      };
    });

    // Sort by final score and trim to requested limit
    scored.sort((a, b) => b.final_score - a.final_score);
    const topResults = scored.slice(0, limit);

    // Update access counts for returned memories
    if (topResults.length > 0) {
      const now = new Date().toISOString();
      const ids = topResults.slice(0, 10).map(m => m.id);
      for (const id of ids) {
        await this.env.DB.prepare('UPDATE employee_memories SET access_count = access_count + 1, last_accessed = ? WHERE id = ?')
          .bind(now, id).run();
      }
    }

    return {
      memories: topResults,
      query_tokens: queryTokens,
      total_searched: rows.length,
      retrieval_time_ms: Date.now() - startTime,
      layers_searched: ['long_term'],
    };
  }

  /** Promote session facts to long-term memory */
  async promoteSessionFacts(
    sessionFacts: SessionFact[],
    employeeId: string,
    orgId: string,
    userId: string,
    sessionId: string
  ): Promise<number> {
    let promoted = 0;

    for (const fact of sessionFacts) {
      if (fact.promoted_to_long_term) continue;
      if (fact.confidence < 0.6) continue; // Only promote reasonably confident facts

      // Check for duplicates
      const existing = await this.search({
        org_id: orgId,
        employee_id: employeeId,
        query_text: fact.content,
        categories: [fact.category],
        max_results: 3,
      });

      const isDuplicate = existing.memories.some(m => m.relevance_score > 0.85);
      if (isDuplicate) {
        // Update existing memory instead
        const existing_mem = existing.memories[0];
        await this.update(existing_mem.id, {
          confidence: Math.min(1.0, existing_mem.confidence + 0.05), // Reinforce
          importance: Math.min(1.0, existing_mem.importance + 0.02),
        });
        continue;
      }

      // Determine decay rate and importance based on category
      const decayMap: Record<MemoryCategory, number> = {
        user_preference: 0.005,      // Very slow decay
        user_identity: 0.001,        // Almost never decays
        company_operation: 0.008,
        company_knowledge: 0.01,
        conversation_context: 0.03,  // Faster decay for convo details
        task_record: 0.02,
        project_progress: 0.015,
        instruction: 0.003,          // Instructions persist
        workflow_pattern: 0.005,
        relationship: 0.005,
        feedback: 0.02,
        entity: 0.01,
      };

      const importanceMap: Record<MemoryCategory, number> = {
        user_preference: 0.80,
        user_identity: 0.90,
        company_operation: 0.70,
        company_knowledge: 0.65,
        conversation_context: 0.40,
        task_record: 0.60,
        project_progress: 0.65,
        instruction: 0.85,
        workflow_pattern: 0.75,
        relationship: 0.60,
        feedback: 0.70,
        entity: 0.50,
      };

      await this.store({
        org_id: orgId,
        employee_id: employeeId,
        user_id: userId,
        category: fact.category,
        subcategory: this.inferSubcategory(fact.content, fact.category),
        content: fact.content,
        structured_data: null,
        source: {
          type: 'conversation',
          reference_id: sessionId,
          extraction_method: 'pattern',
          timestamp: new Date().toISOString(),
        },
        importance: importanceMap[fact.category] || 0.5,
        confidence: fact.confidence,
        access_level: fact.category === 'company_operation' ? 'org_shared' : 'employee',
        status: 'active',
        decay_rate: decayMap[fact.category] || 0.01,
        tags: this.autoTag(fact.content),
        related_memories: [],
        expires_at: null,
      });

      promoted++;
    }

    return promoted;
  }

  /** Get memory statistics for an employee */
  async getStats(orgId: string, employeeId: string): Promise<MemoryStats> {
    const [total, byCategory, byStatus, byAccess, avgScores, retrievals, oldest, newest] = await Promise.all([
      this.env.DB.prepare('SELECT COUNT(*) as cnt FROM employee_memories WHERE org_id = ? AND employee_id = ?').bind(orgId, employeeId).first<{ cnt: number }>(),
      this.env.DB.prepare('SELECT category, COUNT(*) as cnt FROM employee_memories WHERE org_id = ? AND employee_id = ? GROUP BY category').bind(orgId, employeeId).all(),
      this.env.DB.prepare('SELECT status, COUNT(*) as cnt FROM employee_memories WHERE org_id = ? AND employee_id = ? GROUP BY status').bind(orgId, employeeId).all(),
      this.env.DB.prepare('SELECT access_level, COUNT(*) as cnt FROM employee_memories WHERE org_id = ? AND employee_id = ? GROUP BY access_level').bind(orgId, employeeId).all(),
      this.env.DB.prepare('SELECT AVG(importance) as avg_imp, AVG(confidence) as avg_conf FROM employee_memories WHERE org_id = ? AND employee_id = ? AND status = ?').bind(orgId, employeeId, 'active').first<{ avg_imp: number; avg_conf: number }>(),
      this.env.DB.prepare('SELECT SUM(access_count) as total FROM employee_memories WHERE org_id = ? AND employee_id = ?').bind(orgId, employeeId).first<{ total: number }>(),
      this.env.DB.prepare('SELECT MIN(created_at) as oldest FROM employee_memories WHERE org_id = ? AND employee_id = ?').bind(orgId, employeeId).first<{ oldest: string }>(),
      this.env.DB.prepare('SELECT MAX(created_at) as newest FROM employee_memories WHERE org_id = ? AND employee_id = ?').bind(orgId, employeeId).first<{ newest: string }>(),
    ]);

    const catMap: Record<string, number> = {};
    for (const r of (byCategory.results || []) as any[]) catMap[r.category] = r.cnt;
    const statusMap: Record<string, number> = {};
    for (const r of (byStatus.results || []) as any[]) statusMap[r.status] = r.cnt;
    const accessMap: Record<string, number> = {};
    for (const r of (byAccess.results || []) as any[]) accessMap[r.access_level] = r.cnt;

    const wfCount = await this.env.DB.prepare('SELECT COUNT(*) as cnt FROM workflow_patterns WHERE org_id = ? AND employee_id = ?').bind(orgId, employeeId).first<{ cnt: number }>();

    return {
      org_id: orgId,
      employee_id: employeeId,
      total_memories: total?.cnt || 0,
      by_category: catMap as any,
      by_status: statusMap as any,
      by_access_level: accessMap as any,
      avg_importance: Math.round((avgScores?.avg_imp || 0) * 100) / 100,
      avg_confidence: Math.round((avgScores?.avg_conf || 0) * 100) / 100,
      total_retrievals: retrievals?.total || 0,
      workflow_patterns: wfCount?.cnt || 0,
      oldest_memory: oldest?.oldest || '',
      newest_memory: newest?.newest || '',
      storage_estimate_kb: Math.round((total?.cnt || 0) * 0.5), // ~0.5KB avg per memory
    };
  }

  private tokenize(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about',
      'that', 'this', 'it', 'its', 'my', 'your', 'his', 'her', 'our', 'their', 'and', 'or', 'but', 'not',
      'i', 'me', 'we', 'you', 'he', 'she', 'they', 'them', 'what', 'which', 'who', 'when', 'where', 'how']);

    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }

  private inferSubcategory(content: string, category: MemoryCategory): string {
    const lower = content.toLowerCase();
    if (category === 'user_preference') {
      if (lower.includes('format') || lower.includes('style')) return 'communication_style';
      if (lower.includes('time') || lower.includes('schedule')) return 'scheduling_preference';
      if (lower.includes('tool') || lower.includes('app')) return 'tool_preference';
      return 'general_preference';
    }
    if (category === 'user_identity') {
      if (lower.includes('name')) return 'name';
      if (lower.includes('role') || lower.includes('title')) return 'role';
      if (lower.includes('email') || lower.includes('phone')) return 'contact_info';
      if (lower.includes('department') || lower.includes('team')) return 'department';
      return 'identity';
    }
    if (category === 'instruction') return 'standing_order';
    if (category === 'task_record') return lower.includes('complet') ? 'completed_task' : 'active_task';
    return 'general';
  }

  private autoTag(content: string): string[] {
    const tags: string[] = [];
    const lower = content.toLowerCase();
    if (lower.includes('email')) tags.push('email');
    if (lower.includes('meeting') || lower.includes('schedule')) tags.push('calendar');
    if (lower.includes('report') || lower.includes('data')) tags.push('analytics');
    if (lower.includes('hire') || lower.includes('onboard')) tags.push('hr');
    if (lower.includes('invoice') || lower.includes('budget')) tags.push('finance');
    if (lower.includes('client') || lower.includes('customer')) tags.push('client');
    if (lower.includes('deadline') || lower.includes('urgent')) tags.push('priority');
    return tags;
  }

  private rowToRecord(row: any): MemoryRecord {
    return {
      id: row.id,
      org_id: row.org_id,
      employee_id: row.employee_id,
      user_id: row.user_id,
      category: row.category,
      subcategory: row.subcategory,
      content: row.content,
      structured_data: row.structured_data ? JSON.parse(row.structured_data) : null,
      source: {
        type: row.source_type,
        reference_id: row.source_ref,
        extraction_method: row.extraction_method,
        timestamp: row.source_timestamp,
      },
      importance: row.importance,
      confidence: row.confidence,
      access_level: row.access_level,
      status: row.status,
      access_count: row.access_count,
      last_accessed: row.last_accessed,
      decay_rate: row.decay_rate,
      tags: row.tags ? JSON.parse(row.tags) : [],
      related_memories: row.related_memories ? JSON.parse(row.related_memories) : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
    };
  }
}

// ══════════════════════════════════════════════════════
// 5. WORKFLOW PATTERN LEARNING ENGINE
// ══════════════════════════════════════════════════════

export class WorkflowLearningEngine {
  constructor(private env: Env) {}

  /** Detect patterns in completed tasks and store as reusable workflows */
  async detectPatterns(orgId: string, employeeId: string): Promise<WorkflowPattern[]> {
    // Fetch recent completed tasks
    const tasks = await this.env.DB.prepare(`
      SELECT id, title, description, subtasks, execution_time_ms, started_at
      FROM ai_tasks WHERE org_id = ? AND employee_id = ? AND status = 'completed'
      ORDER BY started_at DESC LIMIT 100
    `).bind(orgId, employeeId).all();

    const taskRows = (tasks.results || []) as any[];
    if (taskRows.length < 3) return []; // Need at least 3 tasks to detect patterns

    // Group tasks by similarity
    const groups: Map<string, any[]> = new Map();
    for (const task of taskRows) {
      const key = this.normalizeTaskKey(task.title, task.description);
      const existing = groups.get(key) || [];
      existing.push(task);
      groups.set(key, existing);
    }

    const newPatterns: WorkflowPattern[] = [];

    for (const [key, groupTasks] of groups) {
      if (groupTasks.length < 2) continue; // Need at least 2 similar tasks

      // Check if pattern already exists
      const existing = await this.env.DB.prepare(
        'SELECT id FROM workflow_patterns WHERE org_id = ? AND employee_id = ? AND name = ?'
      ).bind(orgId, employeeId, key).first();

      if (existing) {
        // Update execution count
        await this.env.DB.prepare(
          'UPDATE workflow_patterns SET execution_count = ?, last_executed = ?, updated_at = ? WHERE id = ?'
        ).bind(groupTasks.length, new Date().toISOString(), new Date().toISOString(), (existing as any).id).run();
        continue;
      }

      // Create new pattern from the most recent execution
      const latest = groupTasks[0];
      const subtasks = JSON.parse(latest.subtasks || '[]');
      const avgDuration = Math.round(groupTasks.reduce((s: number, t: any) => s + (t.execution_time_ms || 0), 0) / groupTasks.length);

      const pattern: WorkflowPattern = {
        id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        org_id: orgId,
        employee_id: employeeId,
        name: key,
        description: `Auto-detected pattern from ${groupTasks.length} similar tasks: ${latest.title}`,
        trigger_phrases: this.generateTriggerPhrases(latest.title, latest.description),
        steps: subtasks.map((s: any, i: number) => ({
          order: i + 1,
          action: s.title,
          tool: s.tool_used,
          parameters: {},
          expected_output: s.output || '',
          fallback_action: null,
        })),
        execution_count: groupTasks.length,
        avg_duration_ms: avgDuration,
        success_rate: 1.0, // All completed tasks
        last_executed: latest.started_at,
        learned_from: groupTasks.map((t: any) => t.id),
        confidence: Math.min(0.5 + groupTasks.length * 0.1, 0.95),
      };

      // Persist
      await this.env.DB.prepare(`
        INSERT INTO workflow_patterns (id, org_id, employee_id, name, description, trigger_phrases, steps,
          execution_count, avg_duration_ms, success_rate, last_executed, learned_from, confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        pattern.id, orgId, employeeId, pattern.name, pattern.description,
        JSON.stringify(pattern.trigger_phrases), JSON.stringify(pattern.steps),
        pattern.execution_count, pattern.avg_duration_ms, pattern.success_rate,
        pattern.last_executed, JSON.stringify(pattern.learned_from), pattern.confidence,
        new Date().toISOString(), new Date().toISOString()
      ).run();

      newPatterns.push(pattern);
    }

    return newPatterns;
  }

  /** Match a user request against known workflow patterns */
  async matchWorkflow(orgId: string, employeeId: string, userRequest: string): Promise<WorkflowPattern | null> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM workflow_patterns WHERE org_id = ? AND employee_id = ?
      ORDER BY execution_count DESC, confidence DESC LIMIT 50
    `).bind(orgId, employeeId).all();

    const patterns = (result.results || []) as any[];
    const requestTokens = userRequest.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    let bestMatch: { pattern: WorkflowPattern; score: number } | null = null;

    for (const row of patterns) {
      const triggers: string[] = JSON.parse(row.trigger_phrases || '[]');
      let score = 0;

      // Check trigger phrase matches
      for (const trigger of triggers) {
        const triggerTokens = trigger.toLowerCase().split(/\s+/);
        const overlap = requestTokens.filter(t => triggerTokens.some((tt: string) => tt.includes(t) || t.includes(tt)));
        score = Math.max(score, overlap.length / Math.max(requestTokens.length, 1));
      }

      // Boost by confidence and execution count
      score *= (0.5 + row.confidence * 0.5);
      score *= (1.0 + Math.log2(row.execution_count + 1) * 0.1);

      if (score > 0.3 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          pattern: {
            ...row,
            trigger_phrases: JSON.parse(row.trigger_phrases || '[]'),
            steps: JSON.parse(row.steps || '[]'),
            learned_from: JSON.parse(row.learned_from || '[]'),
          },
          score,
        };
      }
    }

    return bestMatch?.pattern || null;
  }

  /** Get all workflow patterns for an employee */
  async listPatterns(orgId: string, employeeId: string): Promise<WorkflowPattern[]> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM workflow_patterns WHERE org_id = ? AND employee_id = ?
      ORDER BY execution_count DESC LIMIT 100
    `).bind(orgId, employeeId).all();

    return (result.results || []).map((row: any) => ({
      ...row,
      trigger_phrases: JSON.parse(row.trigger_phrases || '[]'),
      steps: JSON.parse(row.steps || '[]'),
      learned_from: JSON.parse(row.learned_from || '[]'),
    }));
  }

  private normalizeTaskKey(title: string, description: string): string {
    // Normalize task to a pattern key by removing specifics
    const text = (title + ' ' + (description || '')).toLowerCase();
    return text
      .replace(/\b\d+\b/g, 'N')           // Numbers → N
      .replace(/\b[A-Z]{2,}-\d+\b/gi, 'TICKET') // Ticket IDs
      .replace(/\b[\w.-]+@[\w.-]+\b/g, 'EMAIL')   // Emails
      .replace(/\b\w{20,}\b/g, '')          // Very long tokens
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100);
  }

  private generateTriggerPhrases(title: string, description: string): string[] {
    const phrases = [title.toLowerCase()];
    const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    // Generate partial phrases
    if (words.length >= 3) {
      phrases.push(words.slice(0, 3).join(' '));
    }
    if (description) {
      const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5);
      if (descWords.length >= 2) phrases.push(descWords.join(' '));
    }

    return [...new Set(phrases)];
  }
}

// ══════════════════════════════════════════════════════
// 6. MEMORY CONSOLIDATION ENGINE
// ══════════════════════════════════════════════════════

export class MemoryConsolidationEngine {
  constructor(private env: Env) {}

  /** Run consolidation: merge duplicates, apply decay, archive stale memories */
  async consolidate(orgId: string, employeeId: string): Promise<ConsolidationResult> {
    const startTime = Date.now();
    let merged = 0;
    let archived = 0;
    let decayed = 0;
    let patternsDetected = 0;

    // 1. Apply time-based decay
    decayed = await this.applyDecay(orgId, employeeId);

    // 2. Merge near-duplicate memories
    merged = await this.mergeDuplicates(orgId, employeeId);

    // 3. Archive rarely-accessed old memories
    archived = await this.archiveStale(orgId, employeeId);

    // 4. Detect new workflow patterns
    const wfEngine = new WorkflowLearningEngine(this.env);
    const patterns = await wfEngine.detectPatterns(orgId, employeeId);
    patternsDetected = patterns.length;

    // 5. Clean expired memories
    await this.env.DB.prepare(
      'DELETE FROM employee_memories WHERE org_id = ? AND employee_id = ? AND expires_at IS NOT NULL AND expires_at < ?'
    ).bind(orgId, employeeId, new Date().toISOString()).run();

    const totalProcessed = merged + archived + decayed;

    return {
      memories_processed: totalProcessed,
      memories_merged: merged,
      memories_archived: archived,
      memories_decayed: decayed,
      new_patterns_detected: patternsDetected,
      duration_ms: Date.now() - startTime,
    };
  }

  /** Apply decay: reduce importance of memories based on their decay_rate and age */
  private async applyDecay(orgId: string, employeeId: string): Promise<number> {
    const result = await this.env.DB.prepare(`
      SELECT id, importance, decay_rate, updated_at FROM employee_memories
      WHERE org_id = ? AND employee_id = ? AND status = 'active' AND decay_rate > 0
    `).bind(orgId, employeeId).all();

    const rows = (result.results || []) as any[];
    let decayed = 0;
    const now = Date.now();

    for (const row of rows) {
      const ageDays = (now - new Date(row.updated_at).getTime()) / (86400 * 1000);
      const decayFactor = Math.exp(-row.decay_rate * ageDays);
      const newImportance = Math.round(row.importance * decayFactor * 100) / 100;

      if (newImportance < 0.1) {
        // Memory has decayed below threshold — mark as decayed
        await this.env.DB.prepare(
          'UPDATE employee_memories SET status = ?, importance = ?, updated_at = ? WHERE id = ?'
        ).bind('decayed', newImportance, new Date().toISOString(), row.id).run();
        decayed++;
      } else if (Math.abs(newImportance - row.importance) > 0.02) {
        // Significant decay — update importance
        await this.env.DB.prepare(
          'UPDATE employee_memories SET importance = ?, updated_at = ? WHERE id = ?'
        ).bind(newImportance, new Date().toISOString(), row.id).run();
        decayed++;
      }
    }

    return decayed;
  }

  /** Merge near-duplicate memories by content similarity */
  private async mergeDuplicates(orgId: string, employeeId: string): Promise<number> {
    const result = await this.env.DB.prepare(`
      SELECT * FROM employee_memories
      WHERE org_id = ? AND employee_id = ? AND status = 'active'
      ORDER BY category, importance DESC
    `).bind(orgId, employeeId).all();

    const rows = (result.results || []) as any[];
    const merged: Set<string> = new Set();
    let mergeCount = 0;

    // Group by category for comparison
    const byCategory: Map<string, any[]> = new Map();
    for (const row of rows) {
      const list = byCategory.get(row.category) || [];
      list.push(row);
      byCategory.set(row.category, list);
    }

    for (const [, catRows] of byCategory) {
      for (let i = 0; i < catRows.length; i++) {
        if (merged.has(catRows[i].id)) continue;

        for (let j = i + 1; j < catRows.length; j++) {
          if (merged.has(catRows[j].id)) continue;

          const similarity = this.textSimilarity(catRows[i].content, catRows[j].content);
          if (similarity > 0.75) {
            // Merge: keep the higher-importance one, update it
            const keeper = catRows[i].importance >= catRows[j].importance ? catRows[i] : catRows[j];
            const discard = keeper === catRows[i] ? catRows[j] : catRows[i];

            await this.env.DB.prepare(
              'UPDATE employee_memories SET importance = ?, confidence = ?, access_count = ?, updated_at = ? WHERE id = ?'
            ).bind(
              Math.min(1.0, keeper.importance + 0.05),
              Math.min(1.0, Math.max(keeper.confidence, discard.confidence)),
              keeper.access_count + discard.access_count,
              new Date().toISOString(),
              keeper.id
            ).run();

            await this.env.DB.prepare(
              'UPDATE employee_memories SET status = ? WHERE id = ?'
            ).bind('consolidated', discard.id).run();

            merged.add(discard.id);
            mergeCount++;
          }
        }
      }
    }

    return mergeCount;
  }

  /** Archive old, rarely-accessed memories */
  private async archiveStale(orgId: string, employeeId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();

    const result = await this.env.DB.prepare(`
      UPDATE employee_memories SET status = 'archived', updated_at = ?
      WHERE org_id = ? AND employee_id = ? AND status = 'active'
        AND last_accessed < ? AND access_count < 3 AND importance < 0.3
    `).bind(new Date().toISOString(), orgId, employeeId, thirtyDaysAgo).run();

    return result.meta?.changes || 0;
  }

  private textSimilarity(a: string, b: string): number {
    const tokensA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const tokensB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) {
      if (tokensB.has(t)) intersection++;
    }

    return (2 * intersection) / (tokensA.size + tokensB.size); // Dice coefficient
  }
}

// ══════════════════════════════════════════════════════
// 7. UNIFIED MEMORY RETRIEVAL ENGINE
// ══════════════════════════════════════════════════════

export class MemoryRetrievalEngine {
  private shortTerm: ShortTermMemory;
  private session: SessionMemory;
  private longTerm: LongTermMemory;
  private workflows: WorkflowLearningEngine;

  constructor(private env: Env) {
    this.shortTerm = new ShortTermMemory();
    this.session = new SessionMemory(env);
    this.longTerm = new LongTermMemory(env);
    this.workflows = new WorkflowLearningEngine(env);
  }

  /**
   * Unified retrieval: searches all three memory layers and merges results
   * into a single ranked list for LLM context injection.
   */
  async retrieve(query: MemoryQuery, sessionId?: string): Promise<{
    context_text: string;         // Formatted for LLM system prompt injection
    memories: ScoredMemory[];     // Ranked memory records
    workflow_match: WorkflowPattern | null;
    session_context: {
      recent_topics: string[];
      active_tasks: string[];
      session_facts: SessionFact[];
    } | null;
    retrieval_time_ms: number;
  }> {
    const startTime = Date.now();

    // 1. Short-term: already in context window (no retrieval needed, just include)
    const shortTermContext = this.shortTerm.getContextWindow(10);

    // 2. Session memory retrieval
    let sessionContext: { recent_topics: string[]; active_tasks: string[]; session_facts: SessionFact[] } | null = null;
    if (sessionId) {
      const sessionState = await this.session.getOrCreate(sessionId, query.employee_id, query.org_id, query.user_id || '');
      sessionContext = {
        recent_topics: [...new Set(sessionState.topic_stack.slice(-5))],
        active_tasks: sessionState.active_tasks,
        session_facts: sessionState.session_facts.slice(-10),
      };
    }

    // 3. Long-term memory retrieval
    const longTermResults = await this.longTerm.search(query);

    // 4. Workflow pattern matching
    const workflowMatch = await this.workflows.matchWorkflow(query.org_id, query.employee_id, query.query_text);

    // 5. Build unified context text for LLM injection
    const contextSections: string[] = [];

    // User-specific memories
    const userMemories = longTermResults.memories.filter(m =>
      m.category === 'user_preference' || m.category === 'user_identity' || m.category === 'instruction'
    ).slice(0, 8);
    if (userMemories.length > 0) {
      contextSections.push('## User Context\n' + userMemories.map(m =>
        `- [${m.category}] ${m.content} (confidence: ${m.confidence})`
      ).join('\n'));
    }

    // Company knowledge
    const companyMemories = longTermResults.memories.filter(m =>
      m.category === 'company_operation' || m.category === 'company_knowledge'
    ).slice(0, 5);
    if (companyMemories.length > 0) {
      contextSections.push('## Company Context\n' + companyMemories.map(m =>
        `- ${m.content}`
      ).join('\n'));
    }

    // Relevant past interactions
    const pastContext = longTermResults.memories.filter(m =>
      m.category === 'conversation_context' || m.category === 'task_record' || m.category === 'project_progress'
    ).slice(0, 5);
    if (pastContext.length > 0) {
      contextSections.push('## Relevant History\n' + pastContext.map(m =>
        `- [${m.category}] ${m.content}`
      ).join('\n'));
    }

    // Relationships
    const relationships = longTermResults.memories.filter(m => m.category === 'relationship').slice(0, 3);
    if (relationships.length > 0) {
      contextSections.push('## Known Relationships\n' + relationships.map(m => `- ${m.content}`).join('\n'));
    }

    // Session facts
    if (sessionContext && sessionContext.session_facts.length > 0) {
      contextSections.push('## This Session\n' + sessionContext.session_facts.slice(-5).map(f =>
        `- ${f.content}`
      ).join('\n'));
    }

    // Workflow suggestion
    if (workflowMatch) {
      contextSections.push(`## Suggested Workflow\nI've done "${workflowMatch.name}" ${workflowMatch.execution_count} times before. Steps: ${
        workflowMatch.steps.map(s => s.action).join(' → ')
      }`);
    }

    const contextText = contextSections.join('\n\n');

    return {
      context_text: contextText,
      memories: longTermResults.memories,
      workflow_match: workflowMatch,
      session_context: sessionContext,
      retrieval_time_ms: Date.now() - startTime,
    };
  }

  /** Record a conversation turn across all layers */
  async recordTurn(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    employeeId: string,
    orgId: string,
    userId: string
  ): Promise<{ new_facts: SessionFact[] }> {
    // Short-term
    this.shortTerm.addTurn(role, content);

    // Session
    const newFacts = await this.session.recordTurn(sessionId, role, content);

    return { new_facts: newFacts };
  }

  /** End a session: promote valuable session facts to long-term memory */
  async endSession(sessionId: string, employeeId: string, orgId: string, userId: string): Promise<{
    promoted_count: number;
    consolidation: ConsolidationResult;
  }> {
    // Get session state
    const key = `session-mem:${sessionId}`;
    const raw = await this.env.CACHE.get(key);
    if (!raw) return { promoted_count: 0, consolidation: { memories_processed: 0, memories_merged: 0, memories_archived: 0, memories_decayed: 0, new_patterns_detected: 0, duration_ms: 0 } };

    const state = JSON.parse(raw) as SessionMemoryState;

    // Promote session facts to long-term
    const promoted = await this.longTerm.promoteSessionFacts(
      state.session_facts, employeeId, orgId, userId, sessionId
    );

    // Run consolidation
    const consolidation = await new MemoryConsolidationEngine(this.env).consolidate(orgId, employeeId);

    return { promoted_count: promoted, consolidation };
  }

  /** Manually add a memory (user-confirmed fact) */
  async addManualMemory(params: {
    org_id: string;
    employee_id: string;
    user_id: string;
    category: MemoryCategory;
    content: string;
    access_level?: MemoryAccessLevel;
    tags?: string[];
  }): Promise<MemoryRecord> {
    return this.longTerm.store({
      org_id: params.org_id,
      employee_id: params.employee_id,
      user_id: params.user_id,
      category: params.category,
      subcategory: 'manual',
      content: params.content,
      structured_data: null,
      source: {
        type: 'manual',
        reference_id: `manual-${Date.now()}`,
        extraction_method: 'user_confirmed',
        timestamp: new Date().toISOString(),
      },
      importance: 0.85, // Manual memories are high-importance
      confidence: 1.0,  // User-confirmed = max confidence
      access_level: params.access_level || 'employee',
      status: 'active',
      decay_rate: 0.003, // Slow decay for manual entries
      tags: params.tags || [],
      related_memories: [],
      expires_at: null,
    });
  }
}

// ══════════════════════════════════════════════════════
// 8. MEMORY ARCHITECTURE DOCUMENTATION
// ══════════════════════════════════════════════════════

export const MEMORY_ARCHITECTURE = {
  title: 'NexusHR AI Employee Memory System',
  version: '1.0.0',

  overview: 'Three-layer memory architecture enabling AI employees to maintain persistent, context-aware knowledge across conversations, tasks, and organizational workflows.',

  layers: {
    short_term: {
      description: 'In-request working memory holding the current conversation context',
      storage: 'JavaScript object (in Worker request lifecycle)',
      capacity: '30 most recent turns',
      ttl: 'Single request / WebSocket connection',
      features: [
        'Real-time entity extraction (names, emails, dates, companies, ticket IDs)',
        'Intent detection per turn (scheduling, communication, analysis, etc.)',
        'Emotional tone tracking for adaptive responses',
        'Topic stack management for conversation flow awareness',
      ],
      retrieval_latency: '<1ms (in-memory)',
    },
    session: {
      description: 'Per-conversation memory tracking facts, tasks, and context discovered during an active session',
      storage: 'Cloudflare KV (edge-global)',
      capacity: '30 turns + unlimited session facts',
      ttl: '24 hours',
      features: [
        'Automatic fact extraction from user messages (preferences, identity, instructions)',
        'Active task tracking across the conversation',
        'User context dictionary for temporary state',
        'Topic history for conversation flow awareness',
        'Session summary generation with sentiment analysis',
      ],
      retrieval_latency: '<10ms (KV edge read)',
    },
    long_term: {
      description: 'Permanent organizational knowledge persisted in D1 with relevance-scored retrieval',
      storage: 'Cloudflare D1 (SQLite)',
      capacity: 'Unlimited (per D1 limits)',
      ttl: 'Permanent (with configurable decay and expiration)',
      features: [
        '12 memory categories: user_preference, user_identity, company_operation, company_knowledge, conversation_context, task_record, project_progress, instruction, workflow_pattern, relationship, feedback, entity',
        '3 access levels: private (single AI), employee (AI + user), org_shared (all employees)',
        'Importance scoring (0.0–1.0) with time-based exponential decay',
        'Confidence tracking (0.0–1.0) with reinforcement on re-encounter',
        'Source provenance (conversation, task, document, manual, inferred, integration, feedback)',
        'Automatic duplicate detection and merging',
        'Cross-employee knowledge sharing within organizations',
      ],
      retrieval_latency: '<50ms (D1 query + scoring)',
    },
  },

  retrieval: {
    description: 'How the AI retrieves relevant memories during conversations',
    process: [
      '1. User sends a message',
      '2. Short-term memory records the turn and extracts entities/intent/tone',
      '3. Session memory extracts persistent facts (preferences, instructions, identity)',
      '4. Retrieval engine queries long-term memory with weighted scoring:',
      '   - Relevance weight (40%): token overlap between query and memory content',
      '   - Recency weight (30%): exponential decay favoring recent memories (~21-day half-life)',
      '   - Importance weight (30%): stored importance score adjusted by decay',
      '5. Workflow pattern matcher checks for known task sequences',
      '6. Results are assembled into categorized context sections:',
      '   - User Context (preferences, identity, instructions)',
      '   - Company Context (operations, knowledge)',
      '   - Relevant History (past conversations, tasks, projects)',
      '   - Known Relationships (people, teams)',
      '   - This Session (session-extracted facts)',
      '   - Suggested Workflow (if a pattern matches)',
      '7. Context text is injected into the LLM system prompt before generation',
    ],
  },

  consolidation: {
    description: 'Background process that maintains memory health',
    operations: [
      'Decay: Reduce importance of old memories based on per-category decay rates',
      'Merge: Detect near-duplicate memories (>75% Dice similarity) and combine them',
      'Archive: Move rarely-accessed, low-importance memories to archived status',
      'Expire: Delete memories past their expiration date',
      'Pattern detection: Identify repeated task sequences and create reusable workflows',
    ],
    trigger: 'Runs at session end and can be triggered manually',
  },

  learning: {
    description: 'How AI employees learn and adapt over time',
    mechanisms: [
      'Preference learning: Extracts "I prefer...", "always...", "never..." statements',
      'Instruction retention: Stores "remember that...", "from now on..." directives with slow decay',
      'Workflow pattern detection: Groups similar completed tasks into reusable step sequences',
      'Confidence reinforcement: Re-encountered facts get confidence boosts (+0.05 per occurrence)',
      'Feedback integration: User corrections increase memory importance and accuracy',
      'Cross-employee sharing: Company knowledge marked org_shared is accessible to all AI employees',
    ],
  },

  enterprise_features: {
    multi_tenancy: 'All memories are org_id-scoped; complete data isolation between organizations',
    access_control: 'Three-tier: private (AI-only), employee (AI+user), org_shared (organization-wide)',
    data_governance: 'Source provenance on every memory; configurable decay and expiration',
    scalability: 'D1 per-org database; KV for session data; no single point of contention',
    compliance: 'Memory deletion API for GDPR/CCPA right-to-erasure; full audit trail via source tracking',
  },
};

// ══════════════════════════════════════════════════════
// 9. D1 SCHEMA
// ══════════════════════════════════════════════════════

export const MEMORY_SYSTEM_SCHEMA = `
  CREATE TABLE IF NOT EXISTS employee_memories (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    user_id TEXT,
    category TEXT NOT NULL,
    subcategory TEXT DEFAULT 'general',
    content TEXT NOT NULL,
    structured_data TEXT,
    source_type TEXT NOT NULL,
    source_ref TEXT,
    extraction_method TEXT DEFAULT 'pattern',
    source_timestamp TEXT,
    importance REAL DEFAULT 0.5,
    confidence REAL DEFAULT 0.5,
    access_level TEXT DEFAULT 'employee',
    status TEXT DEFAULT 'active',
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    decay_rate REAL DEFAULT 0.01,
    tags TEXT DEFAULT '[]',
    related_memories TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_mem_org_emp ON employee_memories(org_id, employee_id);
  CREATE INDEX IF NOT EXISTS idx_mem_org_user ON employee_memories(org_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_mem_category ON employee_memories(org_id, employee_id, category);
  CREATE INDEX IF NOT EXISTS idx_mem_status ON employee_memories(org_id, employee_id, status);
  CREATE INDEX IF NOT EXISTS idx_mem_importance ON employee_memories(org_id, employee_id, importance DESC);
  CREATE INDEX IF NOT EXISTS idx_mem_access ON employee_memories(access_level);
  CREATE INDEX IF NOT EXISTS idx_mem_updated ON employee_memories(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_mem_expires ON employee_memories(expires_at);

  CREATE TABLE IF NOT EXISTS workflow_patterns (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    trigger_phrases TEXT DEFAULT '[]',
    steps TEXT DEFAULT '[]',
    execution_count INTEGER DEFAULT 0,
    avg_duration_ms INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 1.0,
    last_executed TEXT,
    learned_from TEXT DEFAULT '[]',
    confidence REAL DEFAULT 0.5,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_wf_org_emp ON workflow_patterns(org_id, employee_id);
  CREATE INDEX IF NOT EXISTS idx_wf_name ON workflow_patterns(org_id, employee_id, name);
  CREATE INDEX IF NOT EXISTS idx_wf_confidence ON workflow_patterns(confidence DESC);
`;

// ══════════════════════════════════════════════════════
// 10. ROUTE HANDLER
// ══════════════════════════════════════════════════════

export async function handleMemorySystem(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const method = request.method;
  const subPath = path.replace('/api/memory/', '');

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const retrieval = new MemoryRetrievalEngine(env);
    const longTerm = new LongTermMemory(env);
    const session = new SessionMemory(env);
    const workflows = new WorkflowLearningEngine(env);
    const consolidation = new MemoryConsolidationEngine(env);

    // ── Unified Retrieval ──
    if (subPath === 'retrieve' && method === 'POST') {
      const body = await request.json() as any;
      const query: MemoryQuery = {
        org_id: body.org_id || 'default-org',
        employee_id: body.employee_id,
        user_id: body.user_id,
        query_text: body.query,
        categories: body.categories,
        min_importance: body.min_importance,
        min_confidence: body.min_confidence,
        max_results: body.max_results || 20,
        include_org_shared: body.include_org_shared !== false,
        recency_weight: body.recency_weight,
        importance_weight: body.importance_weight,
        relevance_weight: body.relevance_weight,
      };
      const result = await retrieval.retrieve(query, body.session_id);
      return json(result);
    }

    // ── Record Turn (for memory extraction) ──
    if (subPath === 'turn' && method === 'POST') {
      const body = await request.json() as any;
      const result = await retrieval.recordTurn(
        body.session_id, body.role, body.content,
        body.employee_id, body.org_id || 'default-org', userId
      );
      return json(result);
    }

    // ── End Session (promote facts + consolidate) ──
    if (subPath === 'session/end' && method === 'POST') {
      const body = await request.json() as any;
      const result = await retrieval.endSession(
        body.session_id, body.employee_id, body.org_id || 'default-org', userId
      );
      return json(result);
    }

    // ── Manual Memory CRUD ──
    if (subPath === 'store' && method === 'POST') {
      const body = await request.json() as any;
      const record = await retrieval.addManualMemory({
        org_id: body.org_id || 'default-org',
        employee_id: body.employee_id,
        user_id: body.user_id || userId,
        category: body.category,
        content: body.content,
        access_level: body.access_level,
        tags: body.tags,
      });
      return json(record, 201);
    }

    if (subPath.match(/^[^/]+$/) && method === 'GET') {
      const memId = subPath;
      const record = await longTerm.get(memId);
      if (!record) return json({ error: 'Memory not found' }, 404);
      return json(record);
    }

    if (subPath.match(/^[^/]+$/) && method === 'PATCH') {
      const memId = subPath;
      const body = await request.json() as any;
      await longTerm.update(memId, body);
      return json({ success: true });
    }

    if (subPath.match(/^[^/]+$/) && method === 'DELETE') {
      const memId = subPath;
      await longTerm.delete(memId);
      return json({ success: true });
    }

    // ── Search (direct long-term search) ──
    if (subPath === 'search' && method === 'POST') {
      const body = await request.json() as any;
      const result = await longTerm.search({
        org_id: body.org_id || 'default-org',
        employee_id: body.employee_id,
        user_id: body.user_id,
        query_text: body.query,
        categories: body.categories,
        min_importance: body.min_importance,
        max_results: body.max_results || 20,
        include_org_shared: body.include_org_shared !== false,
      });
      return json(result);
    }

    // ── Session Memory ──
    if (subPath.startsWith('session/') && subPath.endsWith('/summary') && method === 'GET') {
      const sessionId = subPath.replace('session/', '').replace('/summary', '');
      const summary = await session.getSessionSummary(sessionId);
      if (!summary) return json({ error: 'Session not found' }, 404);
      return json(summary);
    }

    if (subPath.startsWith('session/') && subPath.endsWith('/context') && method === 'PUT') {
      const sessionId = subPath.replace('session/', '').replace('/context', '');
      const body = await request.json() as any;
      await session.setUserContext(sessionId, body.key, body.value);
      return json({ success: true });
    }

    // ── Workflow Patterns ──
    if (subPath === 'workflows' && method === 'GET') {
      const orgId = new URL(request.url).searchParams.get('org_id') || 'default-org';
      const employeeId = new URL(request.url).searchParams.get('employee_id') || '';
      const patterns = await workflows.listPatterns(orgId, employeeId);
      return json({ patterns });
    }

    if (subPath === 'workflows/match' && method === 'POST') {
      const body = await request.json() as any;
      const match = await workflows.matchWorkflow(body.org_id || 'default-org', body.employee_id, body.request);
      return json({ match });
    }

    if (subPath === 'workflows/detect' && method === 'POST') {
      const body = await request.json() as any;
      const patterns = await workflows.detectPatterns(body.org_id || 'default-org', body.employee_id);
      return json({ patterns, count: patterns.length });
    }

    // ── Consolidation ──
    if (subPath === 'consolidate' && method === 'POST') {
      const body = await request.json() as any;
      const result = await consolidation.consolidate(body.org_id || 'default-org', body.employee_id);
      return json(result);
    }

    // ── Stats ──
    if (subPath === 'stats' && method === 'GET') {
      const orgId = new URL(request.url).searchParams.get('org_id') || 'default-org';
      const employeeId = new URL(request.url).searchParams.get('employee_id') || '';
      const stats = await longTerm.getStats(orgId, employeeId);
      return json(stats);
    }

    // ── Architecture Documentation ──
    if (subPath === 'architecture' && method === 'GET') {
      return json(MEMORY_ARCHITECTURE);
    }

    return json({ error: 'Not Found', code: 'MEMORY_NOT_FOUND' }, 404);
  } catch (err: any) {
    return json({ error: err.message, code: 'MEMORY_ERROR' }, 500);
  }
}
