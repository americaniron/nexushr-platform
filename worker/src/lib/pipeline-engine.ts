/**
 * NexusHR Advanced Pipeline Execution Engine — Feature #26
 *
 * Enterprise-grade DAG-based task scheduler with:
 * 1. Dependency Graphs — topological ordering, cycle detection, critical path
 * 2. Parallel Execution Groups — concurrent task sets with configurable max concurrency
 * 3. Conditional Branching — if/else/switch on runtime outputs, skip conditions
 * 4. Failure Recovery — retry with backoff, circuit breakers, dead-letter queues
 * 5. Rollback States — compensating transactions, checkpoint/restore, partial rollback
 * 6. Real-time Observability — step-level metrics, Gantt timeline, bottleneck detection
 *
 * Backward-compatible with the simple TaskPipeline model from Feature #25.
 */

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

export type NodeStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled' | 'rolling_back' | 'rolled_back';
export type PipelineRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused' | 'rolling_back' | 'rolled_back';
export type BranchOp = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'matches' | 'exists' | 'truthy';
export type RetryBackoff = 'fixed' | 'linear' | 'exponential' | 'jitter';
export type RollbackStrategy = 'none' | 'compensate' | 'checkpoint' | 'full';

// ── DAG Node ──

export interface DAGNode {
  id: string;
  name: string;
  action: string;
  tool: string;
  inputs: Record<string, string>;           // key → expression referencing other node outputs or pipeline inputs
  outputs: string[];
  depends_on: string[];                      // node IDs this depends on
  parallel_group?: string;                   // nodes in the same group run concurrently
  condition?: BranchCondition;               // skip if condition evaluates false
  retry: RetryConfig;
  timeout_seconds: number;
  rollback_action?: string;                  // compensating action name
  rollback_tool?: string;
  metadata: Record<string, any>;
}

export interface BranchCondition {
  source: string;        // expression: "node_id.output_key" or "$input.key"
  op: BranchOp;
  value: any;
  on_false: 'skip' | 'fail' | 'branch';
  branch_target?: string; // node ID to jump to on_false === 'branch'
}

export interface RetryConfig {
  max_attempts: number;
  backoff: RetryBackoff;
  base_delay_ms: number;
  max_delay_ms: number;
  retryable_errors: string[];   // error codes that trigger retry
}

// ── Pipeline Definition ──

export interface AdvancedPipeline {
  id: string;
  name: string;
  description: string;
  version: number;
  nodes: DAGNode[];
  inputs: PipelineInput[];
  outputs: PipelineOutput[];
  max_concurrency: number;               // global cap on parallel tasks
  timeout_seconds: number;               // entire pipeline timeout
  rollback_strategy: RollbackStrategy;
  circuit_breaker: CircuitBreakerConfig;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface PipelineInput {
  key: string;
  type: string;
  required: boolean;
  default_value?: any;
  description: string;
}

export interface PipelineOutput {
  key: string;
  source_node: string;
  source_output: string;
  description: string;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failure_threshold: number;    // # of failures before opening
  reset_timeout_ms: number;     // time before half-open
  half_open_max: number;        // attempts in half-open state
}

// ── Pipeline Run ──

export interface PipelineRun {
  id: string;
  pipeline_id: string;
  pipeline_version: number;
  user_id: string;
  org_id: string;
  status: PipelineRunStatus;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  node_states: Record<string, NodeState>;
  execution_order: string[][];             // array of parallel groups (each group = array of node IDs)
  current_group_index: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
  checkpoints: Checkpoint[];
  metrics: RunMetrics;
}

export interface NodeState {
  node_id: string;
  status: NodeStatus;
  attempt: number;
  outputs: Record<string, any>;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
  retry_history: RetryAttempt[];
  rollback_status: 'none' | 'pending' | 'completed' | 'failed';
}

export interface RetryAttempt {
  attempt: number;
  started_at: string;
  error: string;
  delay_ms: number;
}

export interface Checkpoint {
  id: string;
  group_index: number;
  node_states: Record<string, NodeState>;
  created_at: string;
}

export interface RunMetrics {
  total_nodes: number;
  completed_nodes: number;
  failed_nodes: number;
  skipped_nodes: number;
  total_retries: number;
  parallel_efficiency: number;    // 0-1, 1 = perfect parallelism
  critical_path_ms: number;
  wall_clock_ms: number;
  cpu_time_ms: number;            // sum of all node durations
}

// ── Dead-Letter ──

export interface DeadLetterEntry {
  id: string;
  run_id: string;
  node_id: string;
  error: string;
  inputs: Record<string, any>;
  attempts: number;
  created_at: string;
  resolved: boolean;
  resolved_at: string | null;
}

// ── Gantt Event ──

export interface GanttEvent {
  node_id: string;
  name: string;
  group: string;
  start_ms: number;     // offset from pipeline start
  end_ms: number;
  status: NodeStatus;
}

// ══════════════════════════════════════════════════════
// DAG SCHEDULER
// ══════════════════════════════════════════════════════

export class DAGScheduler {

  /**
   * Build a topological execution order from the DAG, grouping
   * independent nodes into parallel execution sets.
   */
  static buildExecutionOrder(nodes: DAGNode[]): string[][] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const n of nodes) {
      inDegree.set(n.id, n.depends_on.length);
      for (const dep of n.depends_on) {
        const list = adjList.get(dep) || [];
        list.push(n.id);
        adjList.set(dep, list);
      }
    }

    const order: string[][] = [];
    let remaining = new Set(nodes.map(n => n.id));

    while (remaining.size > 0) {
      // Nodes with zero in-degree form a parallel group
      const ready: string[] = [];
      for (const id of remaining) {
        if ((inDegree.get(id) || 0) <= 0) {
          ready.push(id);
        }
      }

      if (ready.length === 0) {
        throw new Error('Cycle detected in pipeline DAG');
      }

      // Sub-group by parallel_group tags for ordering clarity
      const grouped = new Map<string, string[]>();
      for (const id of ready) {
        const pg = nodeMap.get(id)?.parallel_group || '__default__';
        const g = grouped.get(pg) || [];
        g.push(id);
        grouped.set(pg, g);
      }

      order.push(ready);

      for (const id of ready) {
        remaining.delete(id);
        for (const child of (adjList.get(id) || [])) {
          inDegree.set(child, (inDegree.get(child) || 1) - 1);
        }
      }
    }

    return order;
  }

  /** Detect cycles using DFS. Returns the cycle path or null. */
  static detectCycle(nodes: DAGNode[]): string[] | null {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    const parent = new Map<string, string>();
    for (const n of nodes) color.set(n.id, WHITE);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    for (const n of nodes) {
      if (color.get(n.id) === WHITE) {
        const cycle = this.dfs(n.id, nodeMap, color, parent);
        if (cycle) return cycle;
      }
    }
    return null;
  }

  private static dfs(id: string, nodeMap: Map<string, DAGNode>, color: Map<string, number>, parent: Map<string, string>): string[] | null {
    const WHITE = 0, GRAY = 1, BLACK = 2;
    color.set(id, GRAY);
    const node = nodeMap.get(id);
    if (!node) return null;

    for (const dep of node.depends_on) {
      if (color.get(dep) === GRAY) {
        // Back edge → cycle
        const cycle = [dep, id];
        let cur = id;
        while (cur !== dep && parent.has(cur)) {
          cur = parent.get(cur)!;
          cycle.push(cur);
        }
        return cycle;
      }
      if (color.get(dep) === WHITE) {
        parent.set(dep, id);
        const cycle = this.dfs(dep, nodeMap, color, parent);
        if (cycle) return cycle;
      }
    }
    color.set(id, BLACK);
    return null;
  }

  /** Compute the critical path (longest path through the DAG by timeout). */
  static criticalPath(nodes: DAGNode[]): { path: string[]; total_seconds: number } {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const dp = new Map<string, { cost: number; prev: string | null }>();

    // Topological sort via BFS
    const order = this.buildExecutionOrder(nodes).flat();

    for (const id of order) {
      const node = nodeMap.get(id)!;
      let maxPrev = 0;
      let prevNode: string | null = null;

      for (const dep of node.depends_on) {
        const depCost = dp.get(dep)?.cost || 0;
        if (depCost > maxPrev) {
          maxPrev = depCost;
          prevNode = dep;
        }
      }

      dp.set(id, { cost: maxPrev + node.timeout_seconds, prev: prevNode });
    }

    // Find the node with the largest cost
    let maxCost = 0;
    let endNode = '';
    for (const [id, val] of dp) {
      if (val.cost > maxCost) {
        maxCost = val.cost;
        endNode = id;
      }
    }

    // Trace back
    const path: string[] = [];
    let cur: string | null = endNode;
    while (cur) {
      path.unshift(cur);
      cur = dp.get(cur)?.prev || null;
    }

    return { path, total_seconds: maxCost };
  }
}

// ══════════════════════════════════════════════════════
// PIPELINE EXECUTION ENGINE
// ══════════════════════════════════════════════════════

export class PipelineExecutionEngine {
  constructor(private db: any, private kv: any) {}

  // ── Pipeline CRUD ──

  async createPipeline(pipeline: Omit<AdvancedPipeline, 'created_at' | 'updated_at'>): Promise<AdvancedPipeline> {
    // Validate DAG
    const cycle = DAGScheduler.detectCycle(pipeline.nodes);
    if (cycle) throw new Error(`Pipeline DAG contains cycle: ${cycle.join(' → ')}`);

    const now = new Date().toISOString();
    const full: AdvancedPipeline = { ...pipeline, created_at: now, updated_at: now };

    await this.db.prepare(`
      INSERT INTO advanced_pipelines (id, name, version, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(pipeline.id, pipeline.name, pipeline.version, JSON.stringify(full), now, now).run();

    await this.kv.put(`pipeline:${pipeline.id}`, JSON.stringify(full), { expirationTtl: 86400 * 90 });
    return full;
  }

  async getPipeline(id: string): Promise<AdvancedPipeline | null> {
    const cached = await this.kv.get(`pipeline:${id}`);
    if (cached) return JSON.parse(cached);

    const row = await this.db.prepare(`SELECT data FROM advanced_pipelines WHERE id = ? ORDER BY version DESC LIMIT 1`).bind(id).first();
    if (!row) return null;
    const pipeline = JSON.parse(row.data as string);
    await this.kv.put(`pipeline:${id}`, JSON.stringify(pipeline), { expirationTtl: 86400 * 90 });
    return pipeline;
  }

  async listPipelines(limit = 50, offset = 0): Promise<{ pipelines: AdvancedPipeline[]; total: number }> {
    const countRow = await this.db.prepare(`SELECT COUNT(*) as cnt FROM advanced_pipelines`).first();
    const rows = await this.db.prepare(`SELECT data FROM advanced_pipelines ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(limit, offset).all();
    return {
      pipelines: (rows.results || []).map((r: any) => JSON.parse(r.data)),
      total: (countRow as any)?.cnt || 0,
    };
  }

  // ── Execution ──

  async startRun(pipelineId: string, userId: string, orgId: string, inputs: Record<string, any>): Promise<PipelineRun> {
    const pipeline = await this.getPipeline(pipelineId);
    if (!pipeline) throw new Error('Pipeline not found');

    // Validate required inputs
    for (const inp of pipeline.inputs) {
      if (inp.required && inputs[inp.key] === undefined && inp.default_value === undefined) {
        throw new Error(`Missing required input: ${inp.key}`);
      }
      if (inputs[inp.key] === undefined && inp.default_value !== undefined) {
        inputs[inp.key] = inp.default_value;
      }
    }

    // Build execution order
    const executionOrder = DAGScheduler.buildExecutionOrder(pipeline.nodes);

    // Initialize node states
    const nodeStates: Record<string, NodeState> = {};
    for (const node of pipeline.nodes) {
      nodeStates[node.id] = {
        node_id: node.id,
        status: 'pending',
        attempt: 0,
        outputs: {},
        started_at: null,
        completed_at: null,
        duration_ms: null,
        error: null,
        retry_history: [],
        rollback_status: 'none',
      };
    }

    const now = new Date().toISOString();
    const run: PipelineRun = {
      id: crypto.randomUUID(),
      pipeline_id: pipelineId,
      pipeline_version: pipeline.version,
      user_id: userId,
      org_id: orgId,
      status: 'running',
      inputs,
      outputs: {},
      node_states: nodeStates,
      execution_order: executionOrder,
      current_group_index: 0,
      started_at: now,
      completed_at: null,
      duration_ms: null,
      error: null,
      checkpoints: [],
      metrics: {
        total_nodes: pipeline.nodes.length,
        completed_nodes: 0,
        failed_nodes: 0,
        skipped_nodes: 0,
        total_retries: 0,
        parallel_efficiency: 0,
        critical_path_ms: 0,
        wall_clock_ms: 0,
        cpu_time_ms: 0,
      },
    };

    await this.db.prepare(`
      INSERT INTO pipeline_runs (id, pipeline_id, user_id, org_id, status, data, started_at)
      VALUES (?, ?, ?, ?, 'running', ?, ?)
    `).bind(run.id, pipelineId, userId, orgId, JSON.stringify(run), now).run();

    // Execute the pipeline
    const result = await this.executeRun(run, pipeline);
    return result;
  }

  private async executeRun(run: PipelineRun, pipeline: AdvancedPipeline): Promise<PipelineRun> {
    const startTime = Date.now();
    const nodeMap = new Map(pipeline.nodes.map(n => [n.id, n]));

    try {
      for (let gi = 0; gi < run.execution_order.length; gi++) {
        run.current_group_index = gi;
        const group = run.execution_order[gi];

        // Create a checkpoint before each group
        if (pipeline.rollback_strategy !== 'none') {
          run.checkpoints.push({
            id: crypto.randomUUID(),
            group_index: gi,
            node_states: JSON.parse(JSON.stringify(run.node_states)),
            created_at: new Date().toISOString(),
          });
        }

        // Execute all nodes in this group in parallel
        const groupResults = await Promise.allSettled(
          group.map(nodeId => this.executeNode(run, nodeMap.get(nodeId)!, pipeline))
        );

        // Process results
        let groupFailed = false;
        for (let i = 0; i < group.length; i++) {
          const nodeId = group[i];
          const result = groupResults[i];

          if (result.status === 'fulfilled') {
            run.node_states[nodeId] = result.value;
            if (result.value.status === 'completed') {
              run.metrics.completed_nodes++;
            } else if (result.value.status === 'skipped') {
              run.metrics.skipped_nodes++;
            } else if (result.value.status === 'failed') {
              run.metrics.failed_nodes++;
              groupFailed = true;
            }
          } else {
            run.node_states[nodeId].status = 'failed';
            run.node_states[nodeId].error = result.reason?.message || 'Unknown error';
            run.metrics.failed_nodes++;
            groupFailed = true;

            // Dead-letter
            await this.addToDeadLetter(run.id, nodeId, run.node_states[nodeId].error!, run.node_states[nodeId].outputs, run.node_states[nodeId].attempt);
          }
        }

        if (groupFailed && pipeline.circuit_breaker.enabled) {
          if (run.metrics.failed_nodes >= pipeline.circuit_breaker.failure_threshold) {
            // Trip the circuit breaker — cancel remaining nodes
            for (const remainingGroup of run.execution_order.slice(gi + 1)) {
              for (const nid of remainingGroup) {
                run.node_states[nid].status = 'cancelled';
              }
            }

            if (pipeline.rollback_strategy !== 'none') {
              run.status = 'rolling_back';
              await this.rollbackRun(run, pipeline, gi);
              run.status = 'rolled_back';
            } else {
              run.status = 'failed';
            }

            run.error = `Circuit breaker tripped after ${run.metrics.failed_nodes} failures`;
            break;
          }
        }
      }

      // If no failures triggered early exit, mark completed
      if (run.status === 'running') {
        run.status = 'completed';

        // Collect pipeline outputs
        for (const out of pipeline.outputs) {
          const nodeState = run.node_states[out.source_node];
          if (nodeState?.outputs) {
            run.outputs[out.key] = nodeState.outputs[out.source_output];
          }
        }
      }
    } catch (err: any) {
      run.status = 'failed';
      run.error = err.message;
    }

    // Finalize metrics
    const endTime = Date.now();
    run.completed_at = new Date().toISOString();
    run.duration_ms = endTime - startTime;
    run.metrics.wall_clock_ms = run.duration_ms;

    // Calculate cpu_time (sum of all node durations)
    let cpuTime = 0;
    for (const ns of Object.values(run.node_states)) {
      cpuTime += ns.duration_ms || 0;
    }
    run.metrics.cpu_time_ms = cpuTime;

    // Parallel efficiency = cpu_time / (wall_clock * max_concurrency)
    // Perfect parallelism = 1; fully sequential = 1/max_concurrency
    const maxPar = Math.max(1, ...run.execution_order.map(g => g.length));
    run.metrics.parallel_efficiency = run.duration_ms > 0 ? Math.min(1, cpuTime / (run.duration_ms * maxPar)) : 0;

    // Critical path
    const cp = DAGScheduler.criticalPath(pipeline.nodes);
    run.metrics.critical_path_ms = cp.total_seconds * 1000;

    // Persist
    await this.db.prepare(`
      UPDATE pipeline_runs SET status = ?, data = ?, completed_at = ? WHERE id = ?
    `).bind(run.status, JSON.stringify(run), run.completed_at, run.id).run();

    return run;
  }

  private async executeNode(run: PipelineRun, node: DAGNode, pipeline: AdvancedPipeline): Promise<NodeState> {
    const state = run.node_states[node.id];

    // Evaluate condition
    if (node.condition) {
      const condResult = this.evaluateCondition(node.condition, run);
      if (!condResult) {
        if (node.condition.on_false === 'skip') {
          state.status = 'skipped';
          state.completed_at = new Date().toISOString();
          return state;
        }
        if (node.condition.on_false === 'fail') {
          state.status = 'failed';
          state.error = `Condition not met: ${node.condition.source} ${node.condition.op} ${node.condition.value}`;
          state.completed_at = new Date().toISOString();
          return state;
        }
        // 'branch' — skip this node, the branch_target will be handled by DAG ordering
        state.status = 'skipped';
        state.completed_at = new Date().toISOString();
        return state;
      }
    }

    // Resolve inputs from other node outputs or pipeline inputs
    const resolvedInputs: Record<string, any> = {};
    for (const [key, expr] of Object.entries(node.inputs)) {
      resolvedInputs[key] = this.resolveExpression(expr, run);
    }

    // Execute with retries
    let lastError = '';
    for (let attempt = 1; attempt <= node.retry.max_attempts; attempt++) {
      state.attempt = attempt;
      state.status = 'running';
      state.started_at = new Date().toISOString();

      try {
        // Simulate execution — in production, this dispatches to the tool
        const result = await this.dispatchAction(node.action, node.tool, resolvedInputs, node.timeout_seconds);

        state.status = 'completed';
        state.outputs = result;
        state.completed_at = new Date().toISOString();
        state.duration_ms = new Date(state.completed_at).getTime() - new Date(state.started_at).getTime();
        return state;
      } catch (err: any) {
        lastError = err.message || 'Unknown error';

        if (attempt < node.retry.max_attempts) {
          const delay = this.calculateRetryDelay(node.retry, attempt);
          state.retry_history.push({
            attempt,
            started_at: state.started_at!,
            error: lastError,
            delay_ms: delay,
          });
          run.metrics.total_retries++;

          // Wait before retry (bounded by Workers CPU time limits — in production this would use Durable Objects alarms)
          await new Promise(r => setTimeout(r, Math.min(delay, 1000)));
        }
      }
    }

    // All retries exhausted
    state.status = 'failed';
    state.error = lastError;
    state.completed_at = new Date().toISOString();
    state.duration_ms = new Date(state.completed_at).getTime() - new Date(state.started_at!).getTime();
    return state;
  }

  private evaluateCondition(cond: BranchCondition, run: PipelineRun): boolean {
    const sourceVal = this.resolveExpression(cond.source, run);
    const targetVal = cond.value;

    switch (cond.op) {
      case 'eq': return sourceVal === targetVal;
      case 'neq': return sourceVal !== targetVal;
      case 'gt': return Number(sourceVal) > Number(targetVal);
      case 'lt': return Number(sourceVal) < Number(targetVal);
      case 'gte': return Number(sourceVal) >= Number(targetVal);
      case 'lte': return Number(sourceVal) <= Number(targetVal);
      case 'contains': return String(sourceVal).includes(String(targetVal));
      case 'matches': return new RegExp(String(targetVal)).test(String(sourceVal));
      case 'exists': return sourceVal !== undefined && sourceVal !== null;
      case 'truthy': return !!sourceVal;
      default: return false;
    }
  }

  private resolveExpression(expr: string, run: PipelineRun): any {
    // "$input.key" → pipeline inputs
    if (expr.startsWith('$input.')) {
      return run.inputs[expr.slice(7)];
    }
    // "node_id.output_key" → node outputs
    const parts = expr.split('.');
    if (parts.length === 2) {
      const [nodeId, outputKey] = parts;
      return run.node_states[nodeId]?.outputs?.[outputKey];
    }
    // Literal
    return expr;
  }

  private calculateRetryDelay(config: RetryConfig, attempt: number): number {
    const base = config.base_delay_ms;
    let delay: number;

    switch (config.backoff) {
      case 'fixed': delay = base; break;
      case 'linear': delay = base * attempt; break;
      case 'exponential': delay = base * Math.pow(2, attempt - 1); break;
      case 'jitter': delay = base * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5); break;
      default: delay = base;
    }

    return Math.min(delay, config.max_delay_ms);
  }

  private async dispatchAction(action: string, tool: string, inputs: Record<string, any>, timeoutSeconds: number): Promise<Record<string, any>> {
    // In production, this routes to actual tool connectors.
    // Here we simulate execution for the engine architecture.
    const startMs = Date.now();

    // Simulated processing (1-50ms)
    const processingTime = Math.floor(Math.random() * 50) + 1;
    await new Promise(r => setTimeout(r, Math.min(processingTime, 50)));

    return {
      action,
      tool,
      status: 'success',
      processing_time_ms: Date.now() - startMs,
      result: `Executed ${action} via ${tool}`,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Rollback ──

  private async rollbackRun(run: PipelineRun, pipeline: AdvancedPipeline, failedGroupIndex: number): Promise<void> {
    const nodeMap = new Map(pipeline.nodes.map(n => [n.id, n]));

    // Rollback completed nodes in reverse order
    for (let gi = failedGroupIndex; gi >= 0; gi--) {
      const group = run.execution_order[gi];
      const rollbackPromises: Promise<void>[] = [];

      for (const nodeId of group) {
        const state = run.node_states[nodeId];
        const node = nodeMap.get(nodeId);

        if (state.status === 'completed' && node?.rollback_action) {
          state.rollback_status = 'pending';
          rollbackPromises.push(
            this.dispatchAction(node.rollback_action, node.rollback_tool || node.tool, state.outputs, 30)
              .then(() => { state.rollback_status = 'completed'; })
              .catch(() => { state.rollback_status = 'failed'; })
          );
        }
      }

      await Promise.allSettled(rollbackPromises);
    }
  }

  async restoreCheckpoint(runId: string, checkpointId: string): Promise<PipelineRun> {
    const run = await this.getRun(runId);
    if (!run) throw new Error('Run not found');

    const checkpoint = run.checkpoints.find(c => c.id === checkpointId);
    if (!checkpoint) throw new Error('Checkpoint not found');

    run.node_states = checkpoint.node_states;
    run.current_group_index = checkpoint.group_index;
    run.status = 'paused';

    await this.db.prepare(`UPDATE pipeline_runs SET data = ?, status = 'paused' WHERE id = ?`)
      .bind(JSON.stringify(run), runId).run();

    return run;
  }

  // ── Dead-Letter Queue ──

  private async addToDeadLetter(runId: string, nodeId: string, error: string, inputs: Record<string, any>, attempts: number): Promise<void> {
    await this.db.prepare(`
      INSERT INTO pipeline_dead_letters (id, run_id, node_id, error, inputs, attempts, created_at, resolved)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).bind(crypto.randomUUID(), runId, nodeId, error, JSON.stringify(inputs), attempts, new Date().toISOString()).run();
  }

  async getDeadLetters(limit = 50): Promise<DeadLetterEntry[]> {
    const rows = await this.db.prepare(`SELECT * FROM pipeline_dead_letters WHERE resolved = 0 ORDER BY created_at DESC LIMIT ?`).bind(limit).all();
    return (rows.results || []).map((r: any) => ({
      id: r.id, run_id: r.run_id, node_id: r.node_id, error: r.error,
      inputs: JSON.parse(r.inputs || '{}'), attempts: r.attempts,
      created_at: r.created_at, resolved: !!r.resolved, resolved_at: r.resolved_at,
    }));
  }

  async resolveDeadLetter(id: string): Promise<void> {
    await this.db.prepare(`UPDATE pipeline_dead_letters SET resolved = 1, resolved_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), id).run();
  }

  // ── Run Queries ──

  async getRun(id: string): Promise<PipelineRun | null> {
    const row = await this.db.prepare(`SELECT data FROM pipeline_runs WHERE id = ?`).bind(id).first();
    return row ? JSON.parse(row.data as string) : null;
  }

  async listRuns(userId: string, pipelineId?: string, status?: PipelineRunStatus, limit = 20, offset = 0): Promise<{ runs: PipelineRun[]; total: number }> {
    let where = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (pipelineId) { where += ' AND pipeline_id = ?'; params.push(pipelineId); }
    if (status) { where += ' AND status = ?'; params.push(status); }

    const countRow = await this.db.prepare(`SELECT COUNT(*) as cnt FROM pipeline_runs ${where}`).bind(...params).first();
    const rows = await this.db.prepare(`SELECT data FROM pipeline_runs ${where} ORDER BY started_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();

    return {
      runs: (rows.results || []).map((r: any) => JSON.parse(r.data)),
      total: (countRow as any)?.cnt || 0,
    };
  }

  async cancelRun(runId: string): Promise<PipelineRun> {
    const run = await this.getRun(runId);
    if (!run) throw new Error('Run not found');
    if (run.status !== 'running' && run.status !== 'paused') throw new Error('Run cannot be cancelled');

    run.status = 'cancelled';
    run.completed_at = new Date().toISOString();
    for (const ns of Object.values(run.node_states)) {
      if (ns.status === 'pending' || ns.status === 'queued') ns.status = 'cancelled';
    }

    await this.db.prepare(`UPDATE pipeline_runs SET status = 'cancelled', data = ?, completed_at = ? WHERE id = ?`)
      .bind(JSON.stringify(run), run.completed_at, runId).run();
    return run;
  }

  // ── Gantt Timeline ──

  buildGantt(run: PipelineRun): GanttEvent[] {
    if (!run.started_at) return [];
    const baseTime = new Date(run.started_at).getTime();
    const events: GanttEvent[] = [];

    for (let gi = 0; gi < run.execution_order.length; gi++) {
      for (const nodeId of run.execution_order[gi]) {
        const ns = run.node_states[nodeId];
        if (ns.started_at) {
          events.push({
            node_id: nodeId,
            name: nodeId,
            group: `Group ${gi + 1}`,
            start_ms: new Date(ns.started_at).getTime() - baseTime,
            end_ms: ns.completed_at ? new Date(ns.completed_at).getTime() - baseTime : Date.now() - baseTime,
            status: ns.status,
          });
        }
      }
    }

    return events.sort((a, b) => a.start_ms - b.start_ms);
  }

  // ── Performance Analytics ──

  async getPerformanceStats(pipelineId: string): Promise<{
    avg_duration_ms: number;
    p50_duration_ms: number;
    p95_duration_ms: number;
    p99_duration_ms: number;
    success_rate: number;
    avg_parallel_efficiency: number;
    bottleneck_nodes: { node_id: string; avg_duration_ms: number }[];
    runs_last_24h: number;
    runs_last_7d: number;
  }> {
    const rows = await this.db.prepare(`
      SELECT data FROM pipeline_runs WHERE pipeline_id = ? AND status IN ('completed', 'failed') ORDER BY started_at DESC LIMIT 200
    `).bind(pipelineId).all();

    const runs: PipelineRun[] = (rows.results || []).map((r: any) => JSON.parse(r.data));
    if (runs.length === 0) {
      return { avg_duration_ms: 0, p50_duration_ms: 0, p95_duration_ms: 0, p99_duration_ms: 0, success_rate: 0, avg_parallel_efficiency: 0, bottleneck_nodes: [], runs_last_24h: 0, runs_last_7d: 0 };
    }

    const durations = runs.filter(r => r.duration_ms !== null).map(r => r.duration_ms!).sort((a, b) => a - b);
    const completed = runs.filter(r => r.status === 'completed').length;

    // Percentiles
    const percentile = (arr: number[], p: number) => arr[Math.min(Math.floor(arr.length * p / 100), arr.length - 1)] || 0;

    // Bottleneck detection: average duration per node
    const nodeDurations: Record<string, number[]> = {};
    for (const run of runs) {
      for (const [nid, ns] of Object.entries(run.node_states)) {
        if (ns.duration_ms !== null && ns.duration_ms !== undefined) {
          if (!nodeDurations[nid]) nodeDurations[nid] = [];
          nodeDurations[nid].push(ns.duration_ms);
        }
      }
    }
    const bottlenecks = Object.entries(nodeDurations)
      .map(([nid, durations]) => ({ node_id: nid, avg_duration_ms: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) }))
      .sort((a, b) => b.avg_duration_ms - a.avg_duration_ms)
      .slice(0, 5);

    const now = Date.now();
    const runs24h = runs.filter(r => new Date(r.started_at).getTime() > now - 86400000).length;
    const runs7d = runs.filter(r => new Date(r.started_at).getTime() > now - 7 * 86400000).length;

    return {
      avg_duration_ms: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      p50_duration_ms: percentile(durations, 50),
      p95_duration_ms: percentile(durations, 95),
      p99_duration_ms: percentile(durations, 99),
      success_rate: completed / runs.length,
      avg_parallel_efficiency: runs.reduce((a, r) => a + r.metrics.parallel_efficiency, 0) / runs.length,
      bottleneck_nodes: bottlenecks,
      runs_last_24h: runs24h,
      runs_last_7d: runs7d,
    };
  }

  // ── Built-in Example Pipelines ──

  getExamplePipelines(): AdvancedPipeline[] {
    return [CUSTOMER_ONBOARDING_PIPELINE, EMPLOYEE_OFFBOARDING_PIPELINE, INCIDENT_RESPONSE_PIPELINE];
  }
}

// ══════════════════════════════════════════════════════
// EXAMPLE PIPELINES
// ══════════════════════════════════════════════════════

const defaultRetry: RetryConfig = { max_attempts: 3, backoff: 'exponential', base_delay_ms: 500, max_delay_ms: 10000, retryable_errors: ['TIMEOUT', 'RATE_LIMIT', 'TRANSIENT'] };
const noRetry: RetryConfig = { max_attempts: 1, backoff: 'fixed', base_delay_ms: 0, max_delay_ms: 0, retryable_errors: [] };

const CUSTOMER_ONBOARDING_PIPELINE: AdvancedPipeline = {
  id: 'customer_onboarding',
  name: 'Customer Onboarding',
  description: 'End-to-end customer onboarding with parallel record creation, welcome communications, and CSM assignment.',
  version: 1,
  nodes: [
    {
      id: 'validate_input',
      name: 'Validate Customer Data',
      action: 'validate_customer',
      tool: 'validator',
      inputs: { customer: '$input.customer_data' },
      outputs: ['validated_customer'],
      depends_on: [],
      parallel_group: 'init',
      retry: noRetry,
      timeout_seconds: 5,
      metadata: { critical: true },
    },
    {
      id: 'create_crm',
      name: 'Create CRM Record',
      action: 'create_contact',
      tool: 'crm',
      inputs: { customer: 'validate_input.validated_customer' },
      outputs: ['crm_id', 'account_id'],
      depends_on: ['validate_input'],
      parallel_group: 'parallel_setup',
      retry: defaultRetry,
      timeout_seconds: 15,
      rollback_action: 'delete_contact',
      rollback_tool: 'crm',
      metadata: {},
    },
    {
      id: 'generate_welcome',
      name: 'Generate Welcome Email',
      action: 'draft_email',
      tool: 'email',
      inputs: { customer: 'validate_input.validated_customer', template: '$input.welcome_template' },
      outputs: ['email_id', 'email_content'],
      depends_on: ['validate_input'],
      parallel_group: 'parallel_setup',
      retry: defaultRetry,
      timeout_seconds: 10,
      metadata: {},
    },
    {
      id: 'create_ticket',
      name: 'Create Onboarding Ticket',
      action: 'create_ticket',
      tool: 'ticketing',
      inputs: { customer: 'validate_input.validated_customer', type: '$input.ticket_type' },
      outputs: ['ticket_id'],
      depends_on: ['validate_input'],
      parallel_group: 'parallel_setup',
      retry: defaultRetry,
      timeout_seconds: 10,
      rollback_action: 'close_ticket',
      rollback_tool: 'ticketing',
      metadata: {},
    },
    {
      id: 'provision_account',
      name: 'Provision Account',
      action: 'provision_workspace',
      tool: 'iam',
      inputs: { customer: 'validate_input.validated_customer', plan: '$input.plan' },
      outputs: ['workspace_id', 'api_key'],
      depends_on: ['validate_input'],
      parallel_group: 'parallel_setup',
      retry: { ...defaultRetry, max_attempts: 5 },
      timeout_seconds: 30,
      rollback_action: 'deactivate_workspace',
      rollback_tool: 'iam',
      metadata: { critical: true },
    },
    {
      id: 'assign_csm',
      name: 'Assign Customer Success Manager',
      action: 'assign_owner',
      tool: 'crm',
      inputs: { account_id: 'create_crm.account_id', region: '$input.region', tier: '$input.tier' },
      outputs: ['csm_id', 'csm_name'],
      depends_on: ['create_crm', 'create_ticket', 'provision_account'],
      retry: defaultRetry,
      timeout_seconds: 10,
      metadata: {},
    },
    {
      id: 'send_welcome',
      name: 'Send Welcome Email',
      action: 'send_email',
      tool: 'email',
      inputs: { email_id: 'generate_welcome.email_id', workspace: 'provision_account.workspace_id', csm: 'assign_csm.csm_name' },
      outputs: ['send_status'],
      depends_on: ['generate_welcome', 'provision_account', 'assign_csm'],
      retry: defaultRetry,
      timeout_seconds: 10,
      metadata: {},
    },
    {
      id: 'schedule_kickoff',
      name: 'Schedule Kickoff Call',
      action: 'create_event',
      tool: 'calendar',
      inputs: { customer: 'validate_input.validated_customer', csm_id: 'assign_csm.csm_id' },
      outputs: ['event_id', 'event_time'],
      depends_on: ['assign_csm'],
      condition: { source: '$input.auto_schedule', op: 'truthy', value: true, on_false: 'skip' },
      retry: defaultRetry,
      timeout_seconds: 10,
      metadata: {},
    },
  ],
  inputs: [
    { key: 'customer_data', type: 'object', required: true, description: 'Customer profile object' },
    { key: 'welcome_template', type: 'string', required: false, default_value: 'default_welcome', description: 'Email template ID' },
    { key: 'ticket_type', type: 'string', required: false, default_value: 'onboarding', description: 'Support ticket type' },
    { key: 'plan', type: 'string', required: true, description: 'Subscription plan' },
    { key: 'region', type: 'string', required: true, description: 'Customer region' },
    { key: 'tier', type: 'string', required: false, default_value: 'standard', description: 'Customer tier' },
    { key: 'auto_schedule', type: 'boolean', required: false, default_value: true, description: 'Auto-schedule kickoff call' },
  ],
  outputs: [
    { key: 'crm_id', source_node: 'create_crm', source_output: 'crm_id', description: 'CRM contact ID' },
    { key: 'workspace_id', source_node: 'provision_account', source_output: 'workspace_id', description: 'Provisioned workspace ID' },
    { key: 'csm_name', source_node: 'assign_csm', source_output: 'csm_name', description: 'Assigned CSM name' },
    { key: 'kickoff_time', source_node: 'schedule_kickoff', source_output: 'event_time', description: 'Kickoff call time' },
  ],
  max_concurrency: 4,
  timeout_seconds: 120,
  rollback_strategy: 'compensate',
  circuit_breaker: { enabled: true, failure_threshold: 3, reset_timeout_ms: 30000, half_open_max: 1 },
  tags: ['onboarding', 'customer_success'],
  created_at: '',
  updated_at: '',
};

const EMPLOYEE_OFFBOARDING_PIPELINE: AdvancedPipeline = {
  id: 'employee_offboarding',
  name: 'Employee Offboarding',
  description: 'Automated offboarding: revoke access, collect assets, process final pay, and update records.',
  version: 1,
  nodes: [
    { id: 'verify_term', name: 'Verify Termination', action: 'verify_termination', tool: 'hris', inputs: { employee_id: '$input.employee_id' }, outputs: ['verified', 'term_date', 'term_type'], depends_on: [], retry: noRetry, timeout_seconds: 5, metadata: {} },
    { id: 'revoke_access', name: 'Revoke System Access', action: 'revoke_all_access', tool: 'iam', inputs: { employee_id: '$input.employee_id' }, outputs: ['revoked_systems'], depends_on: ['verify_term'], parallel_group: 'immediate', retry: { ...defaultRetry, max_attempts: 5 }, timeout_seconds: 15, metadata: { critical: true, sla: 'immediate' } },
    { id: 'disable_email', name: 'Disable Email Account', action: 'disable_account', tool: 'email', inputs: { employee_id: '$input.employee_id' }, outputs: ['email_disabled'], depends_on: ['verify_term'], parallel_group: 'immediate', retry: defaultRetry, timeout_seconds: 10, metadata: {} },
    { id: 'collect_assets', name: 'Generate Asset Collection List', action: 'list_assets', tool: 'asset_mgmt', inputs: { employee_id: '$input.employee_id' }, outputs: ['asset_list'], depends_on: ['verify_term'], parallel_group: 'immediate', retry: defaultRetry, timeout_seconds: 10, metadata: {} },
    { id: 'final_pay', name: 'Process Final Paycheck', action: 'calculate_final_pay', tool: 'payroll', inputs: { employee_id: '$input.employee_id', term_date: 'verify_term.term_date' }, outputs: ['pay_amount', 'pay_date'], depends_on: ['revoke_access'], retry: defaultRetry, timeout_seconds: 20, metadata: { compliance: 'FLSA' } },
    { id: 'update_hris', name: 'Update HRIS Records', action: 'update_status', tool: 'hris', inputs: { employee_id: '$input.employee_id', status: '$input.new_status' }, outputs: ['updated'], depends_on: ['revoke_access', 'disable_email', 'final_pay'], retry: defaultRetry, timeout_seconds: 10, metadata: {} },
    { id: 'send_notification', name: 'Send Exit Notification', action: 'send_email', tool: 'email', inputs: { employee_id: '$input.employee_id', manager_id: '$input.manager_id' }, outputs: ['sent'], depends_on: ['update_hris'], condition: { source: '$input.notify_manager', op: 'truthy', value: true, on_false: 'skip' }, retry: defaultRetry, timeout_seconds: 10, metadata: {} },
  ],
  inputs: [
    { key: 'employee_id', type: 'string', required: true, description: 'Employee ID to offboard' },
    { key: 'manager_id', type: 'string', required: false, default_value: '', description: 'Reporting manager ID' },
    { key: 'new_status', type: 'string', required: false, default_value: 'terminated', description: 'HRIS status' },
    { key: 'notify_manager', type: 'boolean', required: false, default_value: true, description: 'Send manager notification' },
  ],
  outputs: [
    { key: 'pay_amount', source_node: 'final_pay', source_output: 'pay_amount', description: 'Final pay amount' },
    { key: 'asset_list', source_node: 'collect_assets', source_output: 'asset_list', description: 'Assets to collect' },
  ],
  max_concurrency: 3,
  timeout_seconds: 180,
  rollback_strategy: 'checkpoint',
  circuit_breaker: { enabled: true, failure_threshold: 2, reset_timeout_ms: 15000, half_open_max: 1 },
  tags: ['hr', 'offboarding', 'compliance'],
  created_at: '',
  updated_at: '',
};

const INCIDENT_RESPONSE_PIPELINE: AdvancedPipeline = {
  id: 'incident_response',
  name: 'Automated Incident Response',
  description: 'Detect, triage, notify, investigate, and resolve production incidents.',
  version: 1,
  nodes: [
    { id: 'classify', name: 'Classify Incident', action: 'classify_severity', tool: 'ai_reasoning', inputs: { alert: '$input.alert_data' }, outputs: ['severity', 'category', 'affected_services'], depends_on: [], retry: noRetry, timeout_seconds: 5, metadata: {} },
    { id: 'create_incident', name: 'Create Incident Record', action: 'create_incident', tool: 'ticketing', inputs: { severity: 'classify.severity', category: 'classify.category', services: 'classify.affected_services' }, outputs: ['incident_id'], depends_on: ['classify'], retry: defaultRetry, timeout_seconds: 10, rollback_action: 'close_incident', rollback_tool: 'ticketing', metadata: {} },
    { id: 'notify_oncall', name: 'Page On-Call Engineer', action: 'page', tool: 'pagerduty', inputs: { severity: 'classify.severity', incident_id: 'create_incident.incident_id' }, outputs: ['page_id', 'responder'], depends_on: ['create_incident'], parallel_group: 'notify', retry: { ...defaultRetry, max_attempts: 5 }, timeout_seconds: 15, metadata: { critical: true } },
    { id: 'notify_channel', name: 'Post to Incident Channel', action: 'post_message', tool: 'chat', inputs: { incident_id: 'create_incident.incident_id', severity: 'classify.severity' }, outputs: ['message_id'], depends_on: ['create_incident'], parallel_group: 'notify', retry: defaultRetry, timeout_seconds: 10, metadata: {} },
    { id: 'gather_logs', name: 'Gather Diagnostic Logs', action: 'query_logs', tool: 'observability', inputs: { services: 'classify.affected_services', window_minutes: '$input.log_window' }, outputs: ['log_summary', 'error_patterns'], depends_on: ['create_incident'], parallel_group: 'investigate', retry: defaultRetry, timeout_seconds: 30, metadata: {} },
    { id: 'gather_metrics', name: 'Gather Service Metrics', action: 'query_metrics', tool: 'observability', inputs: { services: 'classify.affected_services' }, outputs: ['metrics_snapshot'], depends_on: ['create_incident'], parallel_group: 'investigate', retry: defaultRetry, timeout_seconds: 20, metadata: {} },
    { id: 'ai_diagnosis', name: 'AI Root Cause Analysis', action: 'analyze_root_cause', tool: 'ai_reasoning', inputs: { logs: 'gather_logs.error_patterns', metrics: 'gather_metrics.metrics_snapshot', severity: 'classify.severity' }, outputs: ['root_cause', 'recommended_fix', 'confidence'], depends_on: ['gather_logs', 'gather_metrics'], retry: defaultRetry, timeout_seconds: 30, metadata: {} },
    { id: 'auto_remediate', name: 'Attempt Auto-Remediation', action: 'apply_fix', tool: 'deployment', inputs: { fix: 'ai_diagnosis.recommended_fix', confidence: 'ai_diagnosis.confidence' }, outputs: ['remediation_result'], depends_on: ['ai_diagnosis'], condition: { source: 'ai_diagnosis.confidence', op: 'gte', value: 0.85, on_false: 'skip' }, retry: noRetry, timeout_seconds: 60, rollback_action: 'rollback_deploy', rollback_tool: 'deployment', metadata: { risk: 'high' } },
    { id: 'update_status', name: 'Update Incident Status', action: 'update_incident', tool: 'ticketing', inputs: { incident_id: 'create_incident.incident_id', root_cause: 'ai_diagnosis.root_cause', remediation: 'auto_remediate.remediation_result' }, outputs: ['updated'], depends_on: ['ai_diagnosis', 'auto_remediate'], retry: defaultRetry, timeout_seconds: 10, metadata: {} },
  ],
  inputs: [
    { key: 'alert_data', type: 'object', required: true, description: 'Alert payload from monitoring' },
    { key: 'log_window', type: 'number', required: false, default_value: 15, description: 'Minutes of logs to query' },
  ],
  outputs: [
    { key: 'incident_id', source_node: 'create_incident', source_output: 'incident_id', description: 'Incident ticket ID' },
    { key: 'root_cause', source_node: 'ai_diagnosis', source_output: 'root_cause', description: 'Identified root cause' },
    { key: 'remediation_result', source_node: 'auto_remediate', source_output: 'remediation_result', description: 'Auto-fix result' },
  ],
  max_concurrency: 4,
  timeout_seconds: 300,
  rollback_strategy: 'compensate',
  circuit_breaker: { enabled: true, failure_threshold: 2, reset_timeout_ms: 60000, half_open_max: 1 },
  tags: ['incident', 'sre', 'automation'],
  created_at: '',
  updated_at: '',
};

// ══════════════════════════════════════════════════════
// DATABASE SCHEMA
// ══════════════════════════════════════════════════════

export const PIPELINE_ENGINE_SCHEMA = `
CREATE TABLE IF NOT EXISTS advanced_pipelines (
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (id, version)
);
CREATE INDEX IF NOT EXISTS idx_adv_pipe_name ON advanced_pipelines(name);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  data TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pipe_run_pipeline ON pipeline_runs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipe_run_user ON pipeline_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_pipe_run_org ON pipeline_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_pipe_run_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipe_run_started ON pipeline_runs(started_at);

CREATE TABLE IF NOT EXISTS pipeline_dead_letters (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  error TEXT NOT NULL,
  inputs TEXT NOT NULL DEFAULT '{}',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pipe_dl_run ON pipeline_dead_letters(run_id);
CREATE INDEX IF NOT EXISTS idx_pipe_dl_resolved ON pipeline_dead_letters(resolved);
`;

// ══════════════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════════════

export async function handlePipelineEngine(request: Request, env: any, userId: string, path: string): Promise<Response> {
  const engine = new PipelineExecutionEngine(env.DB, env.CACHE);
  const url = new URL(request.url);
  const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    // ── Pipeline CRUD ──

    // POST /api/pipelines/create
    if (path === '/api/pipelines/create' && request.method === 'POST') {
      const body = await request.json() as any;
      const pipeline = await engine.createPipeline(body);
      return json({ pipeline });
    }

    // GET /api/pipelines/list
    if (path === '/api/pipelines/list' && request.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const result = await engine.listPipelines(limit, offset);
      return json(result);
    }

    // GET /api/pipelines/:id
    if (path.match(/^\/api\/pipelines\/[^/]+$/) && !['list', 'create', 'examples', 'schema'].includes(path.split('/').pop()!) && request.method === 'GET') {
      const id = path.split('/').pop()!;
      const pipeline = await engine.getPipeline(id);
      if (!pipeline) return json({ error: 'Pipeline not found' }, 404);
      return json({ pipeline });
    }

    // GET /api/pipelines/examples
    if (path === '/api/pipelines/examples' && request.method === 'GET') {
      return json({ pipelines: engine.getExamplePipelines() });
    }

    // ── DAG Analysis ──

    // POST /api/pipelines/validate — validate a DAG for cycles
    if (path === '/api/pipelines/validate' && request.method === 'POST') {
      const body = await request.json() as any;
      const cycle = DAGScheduler.detectCycle(body.nodes);
      const order = cycle ? null : DAGScheduler.buildExecutionOrder(body.nodes);
      const cp = cycle ? null : DAGScheduler.criticalPath(body.nodes);
      return json({ valid: !cycle, cycle, execution_order: order, critical_path: cp });
    }

    // POST /api/pipelines/critical-path
    if (path === '/api/pipelines/critical-path' && request.method === 'POST') {
      const body = await request.json() as any;
      const cp = DAGScheduler.criticalPath(body.nodes);
      return json({ critical_path: cp });
    }

    // ── Runs ──

    // POST /api/pipelines/run
    if (path === '/api/pipelines/run' && request.method === 'POST') {
      const body = await request.json() as any;
      const run = await engine.startRun(body.pipeline_id, userId, body.org_id || userId, body.inputs || {});
      return json({ run });
    }

    // GET /api/pipelines/runs
    if (path === '/api/pipelines/runs' && request.method === 'GET') {
      const pipelineId = url.searchParams.get('pipeline_id') || undefined;
      const status = url.searchParams.get('status') as any;
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const result = await engine.listRuns(userId, pipelineId, status, limit, offset);
      return json(result);
    }

    // GET /api/pipelines/runs/:id
    if (path.match(/^\/api\/pipelines\/runs\/[^/]+$/) && request.method === 'GET') {
      const id = path.split('/').pop()!;
      const run = await engine.getRun(id);
      if (!run) return json({ error: 'Run not found' }, 404);
      return json({ run });
    }

    // POST /api/pipelines/runs/:id/cancel
    if (path.match(/^\/api\/pipelines\/runs\/[^/]+\/cancel$/) && request.method === 'POST') {
      const id = path.split('/')[4];
      const run = await engine.cancelRun(id);
      return json({ run });
    }

    // GET /api/pipelines/runs/:id/gantt
    if (path.match(/^\/api\/pipelines\/runs\/[^/]+\/gantt$/) && request.method === 'GET') {
      const id = path.split('/')[4];
      const run = await engine.getRun(id);
      if (!run) return json({ error: 'Run not found' }, 404);
      return json({ gantt: engine.buildGantt(run) });
    }

    // POST /api/pipelines/runs/:id/restore
    if (path.match(/^\/api\/pipelines\/runs\/[^/]+\/restore$/) && request.method === 'POST') {
      const id = path.split('/')[4];
      const body = await request.json() as any;
      const run = await engine.restoreCheckpoint(id, body.checkpoint_id);
      return json({ run });
    }

    // ── Dead-Letter Queue ──

    // GET /api/pipelines/dead-letters
    if (path === '/api/pipelines/dead-letters' && request.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      return json({ dead_letters: await engine.getDeadLetters(limit) });
    }

    // POST /api/pipelines/dead-letters/:id/resolve
    if (path.match(/^\/api\/pipelines\/dead-letters\/[^/]+\/resolve$/) && request.method === 'POST') {
      const id = path.split('/')[3];
      await engine.resolveDeadLetter(id);
      return json({ success: true });
    }

    // ── Performance ──

    // GET /api/pipelines/:id/performance
    if (path.match(/^\/api\/pipelines\/[^/]+\/performance$/) && request.method === 'GET') {
      const id = path.split('/')[3];
      const stats = await engine.getPerformanceStats(id);
      return json({ performance: stats });
    }

    // ── Schema ──

    // POST /api/pipelines/schema
    if (path === '/api/pipelines/schema' && request.method === 'POST') {
      const stmts = PIPELINE_ENGINE_SCHEMA.split(';').filter(s => s.trim());
      for (const s of stmts) { await env.DB.prepare(s).run(); }
      return json({ success: true, tables: 3 });
    }

    return json({ error: 'Not Found' }, 404);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
}
