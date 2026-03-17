/**
 * NexusHR Advanced Pipeline Engine — Frontend Client
 * Dual-mode: Worker backend primary, localStorage fallback.
 */

import { useState, useEffect, useCallback } from 'react';

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

export type NodeStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled' | 'rolling_back' | 'rolled_back';
export type PipelineRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'rolling_back' | 'rolled_back';
export type BranchOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches' | 'exists' | 'truthy';

export interface DAGNode {
  id: string; name: string; action: string; tool: string;
  inputs: Record<string, string>; outputs: string[]; depends_on: string[];
  parallel_group?: string; condition?: BranchCondition;
  retry: RetryConfig; timeout_seconds: number;
  rollback_action?: string; rollback_tool?: string; metadata: Record<string, any>;
}

export interface BranchCondition {
  source: string; op: BranchOp; value: any;
  on_false: 'skip' | 'fail' | 'branch'; branch_target?: string;
}

export interface RetryConfig {
  max_attempts: number; backoff: string; base_delay_ms: number;
  max_delay_ms: number; retryable_errors: string[];
}

export interface AdvancedPipeline {
  id: string; name: string; description: string; version: number;
  nodes: DAGNode[]; inputs: PipelineInput[]; outputs: PipelineOutput[];
  max_concurrency: number; timeout_seconds: number;
  rollback_strategy: string; circuit_breaker: CircuitBreakerConfig;
  tags: string[]; created_at: string; updated_at: string;
}

export interface PipelineInput { key: string; type: string; required: boolean; default_value?: any; description: string; }
export interface PipelineOutput { key: string; source_node: string; source_output: string; description: string; }
export interface CircuitBreakerConfig { enabled: boolean; failure_threshold: number; reset_timeout_ms: number; half_open_max: number; }

export interface PipelineRun {
  id: string; pipeline_id: string; pipeline_version: number;
  user_id: string; org_id: string; status: PipelineRunStatus;
  inputs: Record<string, any>; outputs: Record<string, any>;
  node_states: Record<string, NodeState>;
  execution_order: string[][]; current_group_index: number;
  started_at: string; completed_at: string | null; duration_ms: number | null;
  error: string | null; checkpoints: Checkpoint[]; metrics: RunMetrics;
}

export interface NodeState {
  node_id: string; status: NodeStatus; attempt: number;
  outputs: Record<string, any>; started_at: string | null;
  completed_at: string | null; duration_ms: number | null;
  error: string | null; retry_history: RetryAttempt[];
  rollback_status: string;
}

export interface RetryAttempt { attempt: number; started_at: string; error: string; delay_ms: number; }
export interface Checkpoint { id: string; group_index: number; node_states: Record<string, NodeState>; created_at: string; }

export interface RunMetrics {
  total_nodes: number; completed_nodes: number; failed_nodes: number;
  skipped_nodes: number; total_retries: number; parallel_efficiency: number;
  critical_path_ms: number; wall_clock_ms: number; cpu_time_ms: number;
}

export interface DeadLetterEntry {
  id: string; run_id: string; node_id: string; error: string;
  inputs: Record<string, any>; attempts: number;
  created_at: string; resolved: boolean; resolved_at: string | null;
}

export interface GanttEvent {
  node_id: string; name: string; group: string;
  start_ms: number; end_ms: number; status: NodeStatus;
}

export interface PerformanceStats {
  avg_duration_ms: number; p50_duration_ms: number;
  p95_duration_ms: number; p99_duration_ms: number;
  success_rate: number; avg_parallel_efficiency: number;
  bottleneck_nodes: { node_id: string; avg_duration_ms: number }[];
  runs_last_24h: number; runs_last_7d: number;
}

export interface DAGValidation {
  valid: boolean; cycle: string[] | null;
  execution_order: string[][] | null;
  critical_path: { path: string[]; total_seconds: number } | null;
}

// ══════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════

const API = '/api/pipelines';

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = localStorage.getItem('nexushr_token');
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const pipelineEngineClient = {
  // Pipelines
  async create(pipeline: any): Promise<{ pipeline: AdvancedPipeline }> {
    return api('/create', { method: 'POST', body: JSON.stringify(pipeline) });
  },
  async list(limit = 50, offset = 0): Promise<{ pipelines: AdvancedPipeline[]; total: number }> {
    try { return await api(`/list?limit=${limit}&offset=${offset}`); }
    catch { return { pipelines: [], total: 0 }; }
  },
  async get(id: string): Promise<{ pipeline: AdvancedPipeline | null }> {
    try { return await api(`/${id}`); } catch { return { pipeline: null }; }
  },
  async getExamples(): Promise<{ pipelines: AdvancedPipeline[] }> {
    try { return await api('/examples'); } catch { return { pipelines: [] }; }
  },

  // DAG Analysis
  async validate(nodes: DAGNode[]): Promise<DAGValidation> {
    return api('/validate', { method: 'POST', body: JSON.stringify({ nodes }) });
  },
  async criticalPath(nodes: DAGNode[]): Promise<{ critical_path: { path: string[]; total_seconds: number } }> {
    return api('/critical-path', { method: 'POST', body: JSON.stringify({ nodes }) });
  },

  // Runs
  async startRun(pipelineId: string, inputs: Record<string, any>, orgId?: string): Promise<{ run: PipelineRun }> {
    return api('/run', { method: 'POST', body: JSON.stringify({ pipeline_id: pipelineId, inputs, org_id: orgId }) });
  },
  async listRuns(pipelineId?: string, status?: string, limit = 20, offset = 0): Promise<{ runs: PipelineRun[]; total: number }> {
    const params = new URLSearchParams();
    if (pipelineId) params.set('pipeline_id', pipelineId);
    if (status) params.set('status', status);
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    try { return await api(`/runs?${params}`); } catch { return { runs: [], total: 0 }; }
  },
  async getRun(id: string): Promise<{ run: PipelineRun | null }> {
    try { return await api(`/runs/${id}`); } catch { return { run: null }; }
  },
  async cancelRun(id: string): Promise<{ run: PipelineRun }> {
    return api(`/runs/${id}/cancel`, { method: 'POST' });
  },
  async getGantt(runId: string): Promise<{ gantt: GanttEvent[] }> {
    try { return await api(`/runs/${runId}/gantt`); } catch { return { gantt: [] }; }
  },
  async restoreCheckpoint(runId: string, checkpointId: string): Promise<{ run: PipelineRun }> {
    return api(`/runs/${runId}/restore`, { method: 'POST', body: JSON.stringify({ checkpoint_id: checkpointId }) });
  },

  // Dead-Letter Queue
  async getDeadLetters(limit = 50): Promise<{ dead_letters: DeadLetterEntry[] }> {
    try { return await api(`/dead-letters?limit=${limit}`); } catch { return { dead_letters: [] }; }
  },
  async resolveDeadLetter(id: string): Promise<{ success: boolean }> {
    return api(`/dead-letters/${id}/resolve`, { method: 'POST' });
  },

  // Performance
  async getPerformance(pipelineId: string): Promise<{ performance: PerformanceStats }> {
    try { return await api(`/${pipelineId}/performance`); }
    catch { return { performance: { avg_duration_ms: 0, p50_duration_ms: 0, p95_duration_ms: 0, p99_duration_ms: 0, success_rate: 0, avg_parallel_efficiency: 0, bottleneck_nodes: [], runs_last_24h: 0, runs_last_7d: 0 } }; }
  },

  // Schema
  async initSchema(): Promise<{ success: boolean }> {
    return api('/schema', { method: 'POST' });
  },
};

// ══════════════════════════════════════════════════════
// REACT HOOKS
// ══════════════════════════════════════════════════════

export function usePipelines(limit = 50) {
  const [pipelines, setPipelines] = useState<AdvancedPipeline[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const d = await pipelineEngineClient.list(limit); setPipelines(d.pipelines); setTotal(d.total); } catch {}
    setLoading(false);
  }, [limit]);
  useEffect(() => { refresh(); }, [refresh]);
  return { pipelines, total, loading, refresh };
}

export function usePipeline(id: string) {
  const [pipeline, setPipeline] = useState<AdvancedPipeline | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const { pipeline: p } = await pipelineEngineClient.get(id); setPipeline(p); } catch {}
      setLoading(false);
    })();
  }, [id]);
  return { pipeline, loading };
}

export function useExamplePipelines() {
  const [pipelines, setPipelines] = useState<AdvancedPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try { const { pipelines: p } = await pipelineEngineClient.getExamples(); setPipelines(p); } catch {}
      setLoading(false);
    })();
  }, []);
  return { pipelines, loading };
}

export function usePipelineRuns(pipelineId?: string, status?: string, limit = 20) {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const d = await pipelineEngineClient.listRuns(pipelineId, status, limit); setRuns(d.runs); setTotal(d.total); } catch {}
    setLoading(false);
  }, [pipelineId, status, limit]);
  useEffect(() => { refresh(); }, [refresh]);
  return { runs, total, loading, refresh };
}

export function usePipelineRun(runId: string) {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const { run: r } = await pipelineEngineClient.getRun(runId); setRun(r); } catch {}
    setLoading(false);
  }, [runId]);
  useEffect(() => { refresh(); }, [refresh]);
  return { run, loading, refresh };
}

export function useGantt(runId: string) {
  const [gantt, setGantt] = useState<GanttEvent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const { gantt: g } = await pipelineEngineClient.getGantt(runId); setGantt(g); } catch {}
      setLoading(false);
    })();
  }, [runId]);
  return { gantt, loading };
}

export function useDeadLetters(limit = 50) {
  const [deadLetters, setDeadLetters] = useState<DeadLetterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { const { dead_letters } = await pipelineEngineClient.getDeadLetters(limit); setDeadLetters(dead_letters); } catch {}
    setLoading(false);
  }, [limit]);
  useEffect(() => { refresh(); }, [refresh]);
  return { deadLetters, loading, refresh };
}

export function usePipelinePerformance(pipelineId: string) {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const { performance } = await pipelineEngineClient.getPerformance(pipelineId); setStats(performance); } catch {}
      setLoading(false);
    })();
  }, [pipelineId]);
  return { stats, loading };
}

export function useDAGValidation() {
  const [result, setResult] = useState<DAGValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const validate = useCallback(async (nodes: DAGNode[]) => {
    setLoading(true);
    try { const r = await pipelineEngineClient.validate(nodes); setResult(r); } catch {}
    setLoading(false);
  }, []);
  return { result, loading, validate };
}
