/**
 * NexusHR Memory System Client — AI Employee Memory Management
 *
 * Dual-mode: Worker API when online, localStorage fallback when offline.
 *
 * Features:
 * 1. Unified memory retrieval (context for LLM injection)
 * 2. Manual memory CRUD (user-confirmed facts)
 * 3. Session memory tracking (auto-extract facts from turns)
 * 4. Workflow pattern management
 * 5. Memory consolidation triggers
 * 6. Statistics and analytics
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API = '/api/memory';

// ══════════════════════════════════════════════════════
// 1. TYPES
// ══════════════════════════════════════════════════════

export type MemoryCategory =
  | 'user_preference' | 'user_identity' | 'company_operation' | 'company_knowledge'
  | 'conversation_context' | 'task_record' | 'project_progress' | 'instruction'
  | 'workflow_pattern' | 'relationship' | 'feedback' | 'entity';

export type MemoryAccessLevel = 'private' | 'employee' | 'org_shared';
export type MemoryStatus = 'active' | 'archived' | 'decayed' | 'consolidated';

export interface MemoryRecord {
  id: string;
  org_id: string;
  employee_id: string;
  user_id: string | null;
  category: MemoryCategory;
  subcategory: string;
  content: string;
  structured_data: Record<string, any> | null;
  source: { type: string; reference_id: string; extraction_method: string; timestamp: string };
  importance: number;
  confidence: number;
  access_level: MemoryAccessLevel;
  status: MemoryStatus;
  access_count: number;
  last_accessed: string;
  decay_rate: number;
  tags: string[];
  related_memories: string[];
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface ScoredMemory extends MemoryRecord {
  relevance_score: number;
  recency_score: number;
  importance_score: number;
  final_score: number;
  match_reason: string;
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
  name: string;
  description: string;
  trigger_phrases: string[];
  steps: { order: number; action: string; tool: string | null; expected_output: string }[];
  execution_count: number;
  avg_duration_ms: number;
  success_rate: number;
  confidence: number;
  last_executed: string;
}

export interface MemoryStats {
  total_memories: number;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
  avg_importance: number;
  avg_confidence: number;
  total_retrievals: number;
  workflow_patterns: number;
  storage_estimate_kb: number;
}

export interface RetrievalResult {
  context_text: string;
  memories: ScoredMemory[];
  workflow_match: WorkflowPattern | null;
  session_context: { recent_topics: string[]; active_tasks: string[]; session_facts: SessionFact[] } | null;
  retrieval_time_ms: number;
}

export interface ConsolidationResult {
  memories_processed: number;
  memories_merged: number;
  memories_archived: number;
  memories_decayed: number;
  new_patterns_detected: number;
  duration_ms: number;
}

// ══════════════════════════════════════════════════════
// 2. API CLIENT
// ══════════════════════════════════════════════════════

async function api<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

export const memoryClient = {
  // Unified retrieval
  async retrieve(params: {
    employee_id: string; org_id: string; query: string; user_id?: string;
    session_id?: string; categories?: MemoryCategory[];
    min_importance?: number; max_results?: number; include_org_shared?: boolean;
  }) {
    return api<RetrievalResult>('/retrieve', { method: 'POST', body: JSON.stringify(params) });
  },

  // Record a conversation turn
  async recordTurn(params: {
    session_id: string; role: 'user' | 'assistant'; content: string;
    employee_id: string; org_id: string;
  }) {
    return api<{ new_facts: SessionFact[] }>('/turn', { method: 'POST', body: JSON.stringify(params) });
  },

  // End session (promote facts + consolidate)
  async endSession(params: { session_id: string; employee_id: string; org_id: string }) {
    return api<{ promoted_count: number; consolidation: ConsolidationResult }>('/session/end', { method: 'POST', body: JSON.stringify(params) });
  },

  // Manual memory CRUD
  async store(params: {
    employee_id: string; org_id: string; user_id?: string;
    category: MemoryCategory; content: string;
    access_level?: MemoryAccessLevel; tags?: string[];
  }) {
    return api<MemoryRecord>('/store', { method: 'POST', body: JSON.stringify(params) });
  },

  async get(memoryId: string) {
    return api<MemoryRecord>(`/${memoryId}`);
  },

  async update(memoryId: string, updates: { content?: string; importance?: number; confidence?: number; status?: MemoryStatus; tags?: string[] }) {
    return api<{ success: boolean }>(`/${memoryId}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },

  async delete(memoryId: string) {
    return api<{ success: boolean }>(`/${memoryId}`, { method: 'DELETE' });
  },

  // Direct search
  async search(params: {
    employee_id: string; org_id: string; query: string;
    user_id?: string; categories?: MemoryCategory[];
    min_importance?: number; max_results?: number;
  }) {
    return api<{ memories: ScoredMemory[]; query_tokens: string[]; total_searched: number; retrieval_time_ms: number }>(
      '/search', { method: 'POST', body: JSON.stringify(params) }
    );
  },

  // Session
  async getSessionSummary(sessionId: string) {
    return api<{ duration_ms: number; turn_count: number; topics: string[]; facts_extracted: number; active_tasks: string[] }>(
      `/session/${sessionId}/summary`
    );
  },

  async setSessionContext(sessionId: string, key: string, value: any) {
    return api<{ success: boolean }>(`/session/${sessionId}/context`, { method: 'PUT', body: JSON.stringify({ key, value }) });
  },

  // Workflows
  async listWorkflows(orgId: string, employeeId: string) {
    return api<{ patterns: WorkflowPattern[] }>(`/workflows?org_id=${orgId}&employee_id=${employeeId}`);
  },

  async matchWorkflow(orgId: string, employeeId: string, request: string) {
    return api<{ match: WorkflowPattern | null }>('/workflows/match', { method: 'POST', body: JSON.stringify({ org_id: orgId, employee_id: employeeId, request }) });
  },

  async detectWorkflows(orgId: string, employeeId: string) {
    return api<{ patterns: WorkflowPattern[]; count: number }>('/workflows/detect', { method: 'POST', body: JSON.stringify({ org_id: orgId, employee_id: employeeId }) });
  },

  // Consolidation
  async consolidate(orgId: string, employeeId: string) {
    return api<ConsolidationResult>('/consolidate', { method: 'POST', body: JSON.stringify({ org_id: orgId, employee_id: employeeId }) });
  },

  // Stats
  async getStats(orgId: string, employeeId: string) {
    return api<MemoryStats>(`/stats?org_id=${orgId}&employee_id=${employeeId}`);
  },

  // Architecture docs
  async getArchitecture() {
    return api<any>('/architecture');
  },
};

// ══════════════════════════════════════════════════════
// 3. LOCAL STORAGE FALLBACK
// ══════════════════════════════════════════════════════

const LOCAL_MEMORY_KEY = 'nexushr_memory_store';

function getLocalMemories(): MemoryRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_MEMORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLocalMemory(memory: MemoryRecord): void {
  try {
    const all = getLocalMemories();
    all.push(memory);
    // Keep max 500 local memories
    const trimmed = all.slice(-500);
    localStorage.setItem(LOCAL_MEMORY_KEY, JSON.stringify(trimmed));
  } catch { /* storage full — silently fail */ }
}

function searchLocalMemories(query: string, categories?: MemoryCategory[]): ScoredMemory[] {
  const all = getLocalMemories();
  const tokens = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  return all
    .filter(m => !categories || categories.includes(m.category))
    .map(m => {
      const contentLower = m.content.toLowerCase();
      const matchCount = tokens.filter(t => contentLower.includes(t)).length;
      const relevance = tokens.length > 0 ? matchCount / tokens.length : 0;
      return {
        ...m,
        relevance_score: relevance,
        recency_score: 0.5,
        importance_score: m.importance,
        final_score: relevance * 0.5 + m.importance * 0.5,
        match_reason: `Local: ${matchCount} token matches`,
      };
    })
    .filter(m => m.final_score > 0.1)
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, 20);
}

// ══════════════════════════════════════════════════════
// 4. REACT HOOKS
// ══════════════════════════════════════════════════════

/** Main hook: unified memory retrieval for AI conversation context */
export function useMemoryRetrieval(employeeId: string, orgId: string) {
  const [result, setResult] = useState<RetrievalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const retrieve = useCallback(async (query: string, options?: {
    userId?: string; sessionId?: string; categories?: MemoryCategory[];
    minImportance?: number; maxResults?: number;
  }) => {
    setLoading(true);
    setError(null);

    const data = await memoryClient.retrieve({
      employee_id: employeeId,
      org_id: orgId,
      query,
      user_id: options?.userId,
      session_id: options?.sessionId,
      categories: options?.categories,
      min_importance: options?.minImportance,
      max_results: options?.maxResults || 20,
    });

    if (data) {
      setResult(data);
    } else {
      // Offline fallback
      const localResults = searchLocalMemories(query, options?.categories);
      setResult({
        context_text: localResults.map(m => `- [${m.category}] ${m.content}`).join('\n'),
        memories: localResults,
        workflow_match: null,
        session_context: null,
        retrieval_time_ms: 0,
      });
    }

    setLoading(false);
  }, [employeeId, orgId]);

  return { result, loading, error, retrieve };
}

/** Hook: manual memory management (CRUD) */
export function useMemoryStore(employeeId: string, orgId: string) {
  const [memories, setMemories] = useState<ScoredMemory[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string, categories?: MemoryCategory[]) => {
    setLoading(true);
    const result = await memoryClient.search({ employee_id: employeeId, org_id: orgId, query, categories });
    if (result) {
      setMemories(result.memories);
    } else {
      setMemories(searchLocalMemories(query, categories));
    }
    setLoading(false);
  }, [employeeId, orgId]);

  const store = useCallback(async (category: MemoryCategory, content: string, options?: {
    userId?: string; accessLevel?: MemoryAccessLevel; tags?: string[];
  }) => {
    const record = await memoryClient.store({
      employee_id: employeeId, org_id: orgId,
      category, content,
      user_id: options?.userId,
      access_level: options?.accessLevel,
      tags: options?.tags,
    });

    if (!record) {
      // Offline: save locally
      const local: MemoryRecord = {
        id: `local-${Date.now()}`, org_id: orgId, employee_id: employeeId,
        user_id: options?.userId || null, category, subcategory: 'manual',
        content, structured_data: null,
        source: { type: 'manual', reference_id: '', extraction_method: 'user_confirmed', timestamp: new Date().toISOString() },
        importance: 0.85, confidence: 1.0, access_level: options?.accessLevel || 'employee',
        status: 'active', access_count: 0, last_accessed: new Date().toISOString(),
        decay_rate: 0.003, tags: options?.tags || [], related_memories: [],
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(), expires_at: null,
      };
      saveLocalMemory(local);
      return local;
    }

    return record;
  }, [employeeId, orgId]);

  const remove = useCallback(async (memoryId: string) => {
    await memoryClient.delete(memoryId);
    setMemories(prev => prev.filter(m => m.id !== memoryId));
  }, []);

  const update = useCallback(async (memoryId: string, updates: { content?: string; importance?: number; tags?: string[] }) => {
    await memoryClient.update(memoryId, updates);
  }, []);

  return { memories, loading, search, store, remove, update };
}

/** Hook: session memory tracking (auto-extracts facts from conversation turns) */
export function useSessionMemory(sessionId: string, employeeId: string, orgId: string) {
  const [facts, setFacts] = useState<SessionFact[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const recordTurn = useCallback(async (role: 'user' | 'assistant', content: string) => {
    const result = await memoryClient.recordTurn({
      session_id: sessionId, role, content,
      employee_id: employeeId, org_id: orgId,
    });
    if (result && result.new_facts.length > 0) {
      setFacts(prev => [...prev, ...result.new_facts]);
    }
    return result?.new_facts || [];
  }, [sessionId, employeeId, orgId]);

  const endSession = useCallback(async () => {
    const result = await memoryClient.endSession({
      session_id: sessionId, employee_id: employeeId, org_id: orgId,
    });
    return result;
  }, [sessionId, employeeId, orgId]);

  const loadSummary = useCallback(async () => {
    const data = await memoryClient.getSessionSummary(sessionId);
    if (data) setSummary(data);
  }, [sessionId]);

  return { facts, summary, recordTurn, endSession, loadSummary };
}

/** Hook: workflow pattern management */
export function useWorkflowPatterns(employeeId: string, orgId: string) {
  const [patterns, setPatterns] = useState<WorkflowPattern[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPatterns = useCallback(async () => {
    setLoading(true);
    const result = await memoryClient.listWorkflows(orgId, employeeId);
    if (result) setPatterns(result.patterns);
    setLoading(false);
  }, [employeeId, orgId]);

  const matchRequest = useCallback(async (request: string) => {
    const result = await memoryClient.matchWorkflow(orgId, employeeId, request);
    return result?.match || null;
  }, [employeeId, orgId]);

  const detectNew = useCallback(async () => {
    setLoading(true);
    const result = await memoryClient.detectWorkflows(orgId, employeeId);
    if (result) {
      setPatterns(prev => [...prev, ...result.patterns]);
    }
    setLoading(false);
    return result?.count || 0;
  }, [employeeId, orgId]);

  useEffect(() => { loadPatterns(); }, [loadPatterns]);

  return { patterns, loading, matchRequest, detectNew, refresh: loadPatterns };
}

/** Hook: memory statistics and health */
export function useMemoryStats(employeeId: string, orgId: string) {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await memoryClient.getStats(orgId, employeeId);
    if (data) setStats(data);
    setLoading(false);
  }, [employeeId, orgId]);

  const consolidate = useCallback(async () => {
    const result = await memoryClient.consolidate(orgId, employeeId);
    await load(); // Refresh stats after consolidation
    return result;
  }, [employeeId, orgId, load]);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, consolidate, refresh: load };
}
