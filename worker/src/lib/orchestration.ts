/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR AI Orchestration Engine — Production-grade task management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. Priority task queue with async execution and scheduling
 * 2. Agent orchestration for multi-employee workflows
 * 3. Full task lifecycle: created → assigned → in_progress → review → completed/failed
 * 4. Circuit breaker + exponential backoff retry for LLM API calls
 * 5. Inter-agent messaging protocol for collaborative tasks
 * 6. Real-time event system for WebSocket push
 */

import type { Env } from '../index';

// ══════════════════════════════════════════════════════
// 1. TYPES & INTERFACES
// ══════════════════════════════════════════════════════

export type TaskStatus = 'created' | 'assigned' | 'queued' | 'in_progress' | 'review' | 'completed' | 'failed' | 'cancelled' | 'retrying';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
export type WorkflowType = 'sequential' | 'parallel' | 'debate' | 'review_chain' | 'swarm' | 'fan_out_fan_in';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  employeeId: string;
  status: TaskStatus;
  priority: TaskPriority;
  parentTaskId?: string;       // for sub-tasks
  workflowId?: string;         // which workflow this belongs to
  dependencies: string[];      // task IDs that must complete first
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  deadline?: string;           // ISO date
  tags: string[];
  stepsTotal: number;
  stepsCompleted: number;
  executionTimeMs?: number;
  createdAt: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: WorkflowType;
  status: TaskStatus;
  taskIds: string[];
  employeeIds: string[];
  config: Record<string, any>;
  result?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
}

export interface AgentMessage {
  id: string;
  workflowId: string;
  fromEmployeeId: string;
  toEmployeeId: string | '*';  // '*' = broadcast
  type: 'handoff' | 'request' | 'response' | 'status' | 'review' | 'escalation' | 'data_share';
  subject: string;
  payload: Record<string, any>;
  replyToId?: string;
  priority: TaskPriority;
  read: boolean;
  createdAt: string;
}

export interface OrchestratorEvent {
  id: string;
  type: 'task_created' | 'task_assigned' | 'task_started' | 'task_progress' | 'task_review'
    | 'task_completed' | 'task_failed' | 'task_retrying' | 'task_cancelled'
    | 'workflow_started' | 'workflow_step' | 'workflow_completed' | 'workflow_failed'
    | 'agent_message' | 'circuit_breaker_open' | 'circuit_breaker_close';
  taskId?: string;
  workflowId?: string;
  userId: string;
  employeeId?: string;
  data: Record<string, any>;
  timestamp: string;
}

// ══════════════════════════════════════════════════════
// 2. CIRCUIT BREAKER — Protects LLM API calls
// ══════════════════════════════════════════════════════

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  failureThreshold: number;   // failures before opening
  resetTimeoutMs: number;     // how long to stay open before half-open
  halfOpenMaxCalls: number;   // max calls in half-open to test
  successThreshold: number;   // successes in half-open to close
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxCalls: 3,
  successThreshold: 2,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number = 0;
  private successes: number = 0;
  private halfOpenCalls: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;
  private name: string;

  constructor(name: string, config?: Partial<CircuitBreakerConfig>) {
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  getState(): CircuitState { return this.state; }
  getName(): string { return this.name; }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if reset timeout has elapsed
      if (Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs) {
        this.state = 'half_open';
        this.halfOpenCalls = 0;
        this.successes = 0;
      } else {
        throw new CircuitBreakerError(this.name, 'Circuit breaker is OPEN — request rejected');
      }
    }

    if (this.state === 'half_open' && this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new CircuitBreakerError(this.name, 'Circuit breaker HALF-OPEN — max test calls reached');
    }

    try {
      if (this.state === 'half_open') this.halfOpenCalls++;
      const result = await fn();

      // Success handling
      if (this.state === 'half_open') {
        this.successes++;
        if (this.successes >= this.config.successThreshold) {
          this.state = 'closed';
          this.failures = 0;
        }
      } else {
        this.failures = Math.max(0, this.failures - 1); // gradual recovery
      }

      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.state === 'half_open') {
        this.state = 'open'; // back to open on any failure in half-open
      } else if (this.failures >= this.config.failureThreshold) {
        this.state = 'open';
      }

      throw err;
    }
  }
}

export class CircuitBreakerError extends Error {
  public circuitName: string;
  constructor(name: string, message: string) {
    super(message);
    this.circuitName = name;
    this.name = 'CircuitBreakerError';
  }
}

// ══════════════════════════════════════════════════════
// 3. RETRY ENGINE — Exponential backoff with jitter
// ══════════════════════════════════════════════════════

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryableErrors: string[];   // error codes/messages that trigger retry
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 500,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'rate_limit', '429', '503', '502', 'overloaded'],
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      if (attempt >= cfg.maxRetries) break;

      // Check if error is retryable
      const errStr = (err.message || err.code || '').toString().toLowerCase();
      const isRetryable = cfg.retryableErrors.some(code => errStr.includes(code.toLowerCase()));

      if (!isRetryable && attempt > 0) break; // non-retryable error after first attempt

      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(
        cfg.maxDelayMs,
        cfg.baseDelayMs * Math.pow(cfg.backoffMultiplier, attempt) + Math.random() * cfg.jitterMs
      );

      if (onRetry) onRetry(attempt + 1, err, delay);

      await sleep(delay);
    }
  }

  throw lastError || new Error('retryWithBackoff: all attempts failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ══════════════════════════════════════════════════════
// 4. TASK QUEUE — Priority-based with D1 persistence
// ══════════════════════════════════════════════════════

const PRIORITY_SCORES: Record<TaskPriority, number> = {
  critical: 4, high: 3, normal: 2, low: 1,
};

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export class TaskQueue {
  private env: Env;
  private eventBuffer: OrchestratorEvent[] = [];

  constructor(env: Env) {
    this.env = env;
  }

  // Create task in DB
  async createTask(params: {
    userId: string;
    title: string;
    description: string;
    employeeId: string;
    priority?: TaskPriority;
    parentTaskId?: string;
    workflowId?: string;
    dependencies?: string[];
    input?: Record<string, any>;
    deadline?: string;
    tags?: string[];
    maxRetries?: number;
    stepsTotal?: number;
  }): Promise<Task> {
    const task: Task = {
      id: generateId('task'),
      userId: params.userId,
      title: params.title,
      description: params.description,
      employeeId: params.employeeId,
      status: 'created',
      priority: params.priority || 'normal',
      parentTaskId: params.parentTaskId,
      workflowId: params.workflowId,
      dependencies: params.dependencies || [],
      input: params.input || {},
      retryCount: 0,
      maxRetries: params.maxRetries ?? 3,
      deadline: params.deadline,
      tags: params.tags || [],
      stepsTotal: params.stepsTotal || 1,
      stepsCompleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.env.DB.prepare(`
      INSERT INTO orchestration_tasks (id, user_id, title, description, employee_id, status, priority,
        parent_task_id, workflow_id, dependencies, input, retry_count, max_retries, deadline,
        tags, steps_total, steps_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      task.id, task.userId, task.title, task.description, task.employeeId,
      task.status, task.priority, task.parentTaskId || null, task.workflowId || null,
      JSON.stringify(task.dependencies), JSON.stringify(task.input),
      task.retryCount, task.maxRetries, task.deadline || null,
      JSON.stringify(task.tags), task.stepsTotal, task.stepsCompleted,
      task.createdAt, task.updatedAt
    ).run();

    this.emitEvent('task_created', task);
    return task;
  }

  // Transition task status with validation
  async transitionTask(taskId: string, newStatus: TaskStatus, data?: Record<string, any>): Promise<Task> {
    const row = await this.env.DB.prepare('SELECT * FROM orchestration_tasks WHERE id = ?')
      .bind(taskId).first<any>();

    if (!row) throw new Error(`Task not found: ${taskId}`);

    const currentStatus = row.status as TaskStatus;

    // Validate state transition
    if (!this.isValidTransition(currentStatus, newStatus)) {
      throw new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
    }

    const now = new Date().toISOString();
    const updates: Record<string, any> = { status: newStatus, updated_at: now };

    if (newStatus === 'assigned') updates.assigned_at = now;
    if (newStatus === 'in_progress') updates.started_at = now;
    if (newStatus === 'completed' || newStatus === 'failed') {
      updates.completed_at = now;
      if (row.started_at) {
        updates.execution_time_ms = Date.now() - new Date(row.started_at).getTime();
      }
    }
    if (newStatus === 'retrying') {
      updates.retry_count = row.retry_count + 1;
    }

    if (data?.output) updates.output = JSON.stringify(data.output);
    if (data?.error) updates.error = data.error;
    if (data?.stepsCompleted !== undefined) updates.steps_completed = data.stepsCompleted;

    // Build dynamic UPDATE
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    await this.env.DB.prepare(`UPDATE orchestration_tasks SET ${setClauses} WHERE id = ?`)
      .bind(...values, taskId).run();

    const updatedTask = this.rowToTask({ ...row, ...updates });
    this.emitEvent(`task_${newStatus}` as any, updatedTask);
    return updatedTask;
  }

  // Get next task from queue (highest priority, ready to execute)
  async dequeue(userId: string, employeeId?: string): Promise<Task | null> {
    let query = `
      SELECT * FROM orchestration_tasks
      WHERE user_id = ? AND status IN ('created', 'queued')
    `;
    const params: any[] = [userId];

    if (employeeId) {
      query += ' AND employee_id = ?';
      params.push(employeeId);
    }

    query += ` ORDER BY
      CASE priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC,
      created_at ASC
      LIMIT 1`;

    const row = await this.env.DB.prepare(query).bind(...params).first<any>();
    if (!row) return null;

    // Check dependencies
    if (row.dependencies && row.dependencies !== '[]') {
      const deps: string[] = JSON.parse(row.dependencies);
      if (deps.length > 0) {
        const depStatuses = await this.env.DB.prepare(
          `SELECT id, status FROM orchestration_tasks WHERE id IN (${deps.map(() => '?').join(',')})`
        ).bind(...deps).all();

        const allCompleted = depStatuses.results?.every((d: any) => d.status === 'completed');
        if (!allCompleted) return null; // dependencies not met
      }
    }

    return this.rowToTask(row);
  }

  // List tasks with filtering
  async listTasks(userId: string, filters?: {
    status?: TaskStatus | TaskStatus[];
    employeeId?: string;
    workflowId?: string;
    priority?: TaskPriority;
    limit?: number;
    offset?: number;
  }): Promise<{ tasks: Task[]; total: number }> {
    let where = 'WHERE user_id = ?';
    const params: any[] = [userId];

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      where += ` AND status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
    if (filters?.employeeId) { where += ' AND employee_id = ?'; params.push(filters.employeeId); }
    if (filters?.workflowId) { where += ' AND workflow_id = ?'; params.push(filters.workflowId); }
    if (filters?.priority) { where += ' AND priority = ?'; params.push(filters.priority); }

    const countResult = await this.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM orchestration_tasks ${where}`
    ).bind(...params).first<any>();

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const rows = await this.env.DB.prepare(
      `SELECT * FROM orchestration_tasks ${where} ORDER BY
        CASE priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'normal' THEN 2 ELSE 1 END DESC,
        created_at DESC
        LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return {
      tasks: (rows.results || []).map((r: any) => this.rowToTask(r)),
      total: countResult?.cnt || 0,
    };
  }

  // Get task by ID
  async getTask(taskId: string): Promise<Task | null> {
    const row = await this.env.DB.prepare('SELECT * FROM orchestration_tasks WHERE id = ?')
      .bind(taskId).first<any>();
    return row ? this.rowToTask(row) : null;
  }

  // Cancel task
  async cancelTask(taskId: string): Promise<Task> {
    return this.transitionTask(taskId, 'cancelled');
  }

  // Get event buffer and flush
  flushEvents(): OrchestratorEvent[] {
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    return events;
  }

  private emitEvent(type: OrchestratorEvent['type'], task: Task, extra?: Record<string, any>): void {
    this.eventBuffer.push({
      id: generateId('evt'),
      type,
      taskId: task.id,
      workflowId: task.workflowId,
      userId: task.userId,
      employeeId: task.employeeId,
      data: { taskTitle: task.title, status: task.status, priority: task.priority, ...extra },
      timestamp: new Date().toISOString(),
    });
  }

  private isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
    const transitions: Record<TaskStatus, TaskStatus[]> = {
      created:     ['assigned', 'queued', 'cancelled'],
      assigned:    ['queued', 'in_progress', 'cancelled'],
      queued:      ['in_progress', 'cancelled'],
      in_progress: ['review', 'completed', 'failed', 'cancelled'],
      review:      ['completed', 'in_progress', 'failed'],
      completed:   [],  // terminal
      failed:      ['retrying', 'cancelled'],
      cancelled:   [],  // terminal
      retrying:    ['queued', 'in_progress', 'failed', 'cancelled'],
    };
    return transitions[from]?.includes(to) || false;
  }

  private rowToTask(row: any): Task {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      employeeId: row.employee_id,
      status: row.status,
      priority: row.priority,
      parentTaskId: row.parent_task_id || undefined,
      workflowId: row.workflow_id || undefined,
      dependencies: row.dependencies ? JSON.parse(row.dependencies) : [],
      input: row.input ? JSON.parse(row.input) : {},
      output: row.output ? JSON.parse(row.output) : undefined,
      error: row.error || undefined,
      retryCount: row.retry_count || 0,
      maxRetries: row.max_retries || 3,
      deadline: row.deadline || undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      stepsTotal: row.steps_total || 1,
      stepsCompleted: row.steps_completed || 0,
      executionTimeMs: row.execution_time_ms || undefined,
      createdAt: row.created_at,
      assignedAt: row.assigned_at || undefined,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      updatedAt: row.updated_at,
    };
  }
}

// ══════════════════════════════════════════════════════
// 5. WORKFLOW ORCHESTRATOR — Multi-agent coordination
// ══════════════════════════════════════════════════════

export class WorkflowOrchestrator {
  private queue: TaskQueue;
  private env: Env;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(env: Env) {
    this.env = env;
    this.queue = new TaskQueue(env);
  }

  getQueue(): TaskQueue { return this.queue; }

  getCircuitBreaker(name: string): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name));
    }
    return this.circuitBreakers.get(name)!;
  }

  // Create a workflow with multiple agent tasks
  async createWorkflow(params: {
    userId: string;
    name: string;
    description: string;
    type: WorkflowType;
    employeeIds: string[];
    task: string;
    config?: Record<string, any>;
  }): Promise<{ workflow: Workflow; tasks: Task[] }> {
    const workflowId = generateId('wf');
    const tasks: Task[] = [];
    const { userId, name, description, type, employeeIds, task: taskDesc, config = {} } = params;

    // Create tasks based on workflow type
    switch (type) {
      case 'sequential': {
        for (let i = 0; i < employeeIds.length; i++) {
          const t = await this.queue.createTask({
            userId, title: `${name} — Step ${i + 1}`, description: taskDesc,
            employeeId: employeeIds[i], priority: 'normal',
            workflowId, dependencies: i > 0 ? [tasks[i - 1].id] : [],
            input: { step: i + 1, totalSteps: employeeIds.length, originalTask: taskDesc },
            stepsTotal: 1,
          });
          tasks.push(t);
        }
        break;
      }
      case 'parallel': {
        for (const empId of employeeIds) {
          const t = await this.queue.createTask({
            userId, title: `${name} — ${empId}`, description: taskDesc,
            employeeId: empId, priority: 'normal',
            workflowId, dependencies: [],
            input: { parallelMode: true, totalAgents: employeeIds.length, originalTask: taskDesc },
            stepsTotal: 1,
          });
          tasks.push(t);
        }
        break;
      }
      case 'fan_out_fan_in': {
        // Parallel execution then merge
        const parallelTasks: Task[] = [];
        for (const empId of employeeIds.slice(0, -1)) {
          const t = await this.queue.createTask({
            userId, title: `${name} — Fan-out ${empId}`, description: taskDesc,
            employeeId: empId, priority: 'normal',
            workflowId, dependencies: [],
            input: { fanOut: true, originalTask: taskDesc },
            stepsTotal: 1,
          });
          parallelTasks.push(t);
          tasks.push(t);
        }
        // Merge task depends on all parallel tasks
        const mergeTask = await this.queue.createTask({
          userId, title: `${name} — Merge`, description: `Synthesize results from ${parallelTasks.length} agents`,
          employeeId: employeeIds[employeeIds.length - 1], priority: 'normal',
          workflowId, dependencies: parallelTasks.map(t => t.id),
          input: { fanIn: true, sourceTaskIds: parallelTasks.map(t => t.id), originalTask: taskDesc },
          stepsTotal: 1,
        });
        tasks.push(mergeTask);
        break;
      }
      case 'review_chain': {
        for (let i = 0; i < employeeIds.length; i++) {
          const t = await this.queue.createTask({
            userId, title: i === 0 ? `${name} — Create` : `${name} — Review ${i}`,
            description: i === 0 ? taskDesc : `Review and improve output from step ${i}`,
            employeeId: employeeIds[i], priority: 'normal',
            workflowId, dependencies: i > 0 ? [tasks[i - 1].id] : [],
            input: { isReview: i > 0, reviewRound: i, originalTask: taskDesc },
            stepsTotal: 1,
          });
          tasks.push(t);
        }
        break;
      }
      case 'debate': {
        // All agents present perspectives in parallel
        const perspectives: Task[] = [];
        for (const empId of employeeIds) {
          const t = await this.queue.createTask({
            userId, title: `${name} — Perspective (${empId})`, description: `Present your perspective: ${taskDesc}`,
            employeeId: empId, priority: 'normal',
            workflowId, dependencies: [],
            input: { isDebate: true, role: 'perspectiveGiver', originalTask: taskDesc },
            stepsTotal: 1,
          });
          perspectives.push(t);
          tasks.push(t);
        }
        // Synthesis task
        const synthesis = await this.queue.createTask({
          userId, title: `${name} — Synthesis`,
          description: `Synthesize all perspectives into a balanced conclusion`,
          employeeId: employeeIds[0], priority: 'normal',
          workflowId, dependencies: perspectives.map(t => t.id),
          input: { isDebate: true, role: 'synthesizer', sourceTaskIds: perspectives.map(t => t.id), originalTask: taskDesc },
          stepsTotal: 1,
        });
        tasks.push(synthesis);
        break;
      }
      case 'swarm': {
        // Each agent self-selects sub-tasks
        for (const empId of employeeIds) {
          const t = await this.queue.createTask({
            userId, title: `${name} — Swarm Agent (${empId})`,
            description: `Self-select and complete the aspects of this task best suited to your role: ${taskDesc}`,
            employeeId: empId, priority: 'normal',
            workflowId, dependencies: [],
            input: { swarmMode: true, totalAgents: employeeIds.length, originalTask: taskDesc },
            stepsTotal: 1,
          });
          tasks.push(t);
        }
        break;
      }
    }

    // Save workflow to DB
    const workflow: Workflow = {
      id: workflowId, userId, name, description, type,
      status: 'created', taskIds: tasks.map(t => t.id),
      employeeIds, config, createdAt: new Date().toISOString(),
    };

    await this.env.DB.prepare(`
      INSERT INTO orchestration_workflows (id, user_id, name, description, type, status,
        task_ids, employee_ids, config, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      workflow.id, workflow.userId, workflow.name, workflow.description,
      workflow.type, workflow.status, JSON.stringify(workflow.taskIds),
      JSON.stringify(workflow.employeeIds), JSON.stringify(workflow.config),
      workflow.createdAt
    ).run();

    return { workflow, tasks };
  }

  // Execute a task with circuit breaker + retry
  async executeTask(task: Task, executor: (task: Task) => Promise<Record<string, any>>): Promise<Task> {
    const breaker = this.getCircuitBreaker(`llm_${task.employeeId}`);

    // Transition to in_progress
    await this.queue.transitionTask(task.id, 'in_progress');

    try {
      const result = await retryWithBackoff(
        () => breaker.execute(() => executor(task)),
        { maxRetries: task.maxRetries },
        (attempt, err, delay) => {
          // Log retry event
          this.queue.flushEvents(); // emit retry event
          console.log(`Task ${task.id} retry ${attempt}: ${err.message} (waiting ${delay}ms)`);
        }
      );

      return await this.queue.transitionTask(task.id, 'completed', { output: result, stepsCompleted: task.stepsTotal });
    } catch (err: any) {
      if (err instanceof CircuitBreakerError) {
        return await this.queue.transitionTask(task.id, 'failed', {
          error: `Circuit breaker OPEN for ${err.circuitName}: ${err.message}`,
        });
      }

      if (task.retryCount < task.maxRetries) {
        await this.queue.transitionTask(task.id, 'failed', { error: err.message });
        return await this.queue.transitionTask(task.id, 'retrying');
      }

      return await this.queue.transitionTask(task.id, 'failed', { error: err.message });
    }
  }

  // Get workflow status
  async getWorkflow(workflowId: string): Promise<{ workflow: Workflow; tasks: Task[] } | null> {
    const row = await this.env.DB.prepare('SELECT * FROM orchestration_workflows WHERE id = ?')
      .bind(workflowId).first<any>();
    if (!row) return null;

    const workflow: Workflow = {
      id: row.id, userId: row.user_id, name: row.name, description: row.description,
      type: row.type, status: row.status, taskIds: JSON.parse(row.task_ids),
      employeeIds: JSON.parse(row.employee_ids), config: JSON.parse(row.config || '{}'),
      result: row.result ? JSON.parse(row.result) : undefined,
      createdAt: row.created_at, completedAt: row.completed_at || undefined,
    };

    const { tasks } = await this.queue.listTasks(workflow.userId, { workflowId });
    return { workflow, tasks };
  }

  // List user workflows
  async listWorkflows(userId: string, limit: number = 20): Promise<Workflow[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM orchestration_workflows WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(userId, limit).all();

    return (rows.results || []).map((r: any) => ({
      id: r.id, userId: r.user_id, name: r.name, description: r.description,
      type: r.type, status: r.status, taskIds: JSON.parse(r.task_ids),
      employeeIds: JSON.parse(r.employee_ids), config: JSON.parse(r.config || '{}'),
      result: r.result ? JSON.parse(r.result) : undefined,
      createdAt: r.created_at, completedAt: r.completed_at || undefined,
    }));
  }

  // Get circuit breaker statuses
  getCircuitBreakerStatuses(): Record<string, CircuitState> {
    const statuses: Record<string, CircuitState> = {};
    for (const [name, breaker] of this.circuitBreakers) {
      statuses[name] = breaker.getState();
    }
    return statuses;
  }
}

// ══════════════════════════════════════════════════════
// 6. INTER-AGENT MESSAGING — Protocol for collaboration
// ══════════════════════════════════════════════════════

export class AgentMessaging {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async sendMessage(params: {
    workflowId: string;
    fromEmployeeId: string;
    toEmployeeId: string | '*';
    type: AgentMessage['type'];
    subject: string;
    payload: Record<string, any>;
    replyToId?: string;
    priority?: TaskPriority;
  }): Promise<AgentMessage> {
    const msg: AgentMessage = {
      id: generateId('msg'),
      workflowId: params.workflowId,
      fromEmployeeId: params.fromEmployeeId,
      toEmployeeId: params.toEmployeeId,
      type: params.type,
      subject: params.subject,
      payload: params.payload,
      replyToId: params.replyToId,
      priority: params.priority || 'normal',
      read: false,
      createdAt: new Date().toISOString(),
    };

    await this.env.DB.prepare(`
      INSERT INTO agent_messages (id, workflow_id, from_employee_id, to_employee_id, type,
        subject, payload, reply_to_id, priority, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      msg.id, msg.workflowId, msg.fromEmployeeId, msg.toEmployeeId, msg.type,
      msg.subject, JSON.stringify(msg.payload), msg.replyToId || null,
      msg.priority, 0, msg.createdAt
    ).run();

    return msg;
  }

  async getMessages(params: {
    workflowId?: string;
    employeeId?: string;
    unreadOnly?: boolean;
    limit?: number;
  }): Promise<AgentMessage[]> {
    let where = 'WHERE 1=1';
    const binds: any[] = [];

    if (params.workflowId) { where += ' AND workflow_id = ?'; binds.push(params.workflowId); }
    if (params.employeeId) {
      where += ' AND (to_employee_id = ? OR to_employee_id = ?)';
      binds.push(params.employeeId, '*');
    }
    if (params.unreadOnly) { where += ' AND read = 0'; }

    const limit = params.limit || 50;
    const rows = await this.env.DB.prepare(
      `SELECT * FROM agent_messages ${where} ORDER BY created_at DESC LIMIT ?`
    ).bind(...binds, limit).all();

    return (rows.results || []).map((r: any) => ({
      id: r.id, workflowId: r.workflow_id, fromEmployeeId: r.from_employee_id,
      toEmployeeId: r.to_employee_id, type: r.type, subject: r.subject,
      payload: JSON.parse(r.payload || '{}'), replyToId: r.reply_to_id || undefined,
      priority: r.priority, read: !!r.read, createdAt: r.created_at,
    }));
  }

  async markRead(messageId: string): Promise<void> {
    await this.env.DB.prepare('UPDATE agent_messages SET read = 1 WHERE id = ?')
      .bind(messageId).run();
  }

  async getConversation(workflowId: string, limit: number = 100): Promise<AgentMessage[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM agent_messages WHERE workflow_id = ? ORDER BY created_at ASC LIMIT ?'
    ).bind(workflowId, limit).all();

    return (rows.results || []).map((r: any) => ({
      id: r.id, workflowId: r.workflow_id, fromEmployeeId: r.from_employee_id,
      toEmployeeId: r.to_employee_id, type: r.type, subject: r.subject,
      payload: JSON.parse(r.payload || '{}'), replyToId: r.reply_to_id || undefined,
      priority: r.priority, read: !!r.read, createdAt: r.created_at,
    }));
  }
}

// ══════════════════════════════════════════════════════
// 7. DB SCHEMA — Table creation queries
// ══════════════════════════════════════════════════════

export const ORCHESTRATION_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS orchestration_tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    employee_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    priority TEXT NOT NULL DEFAULT 'normal',
    parent_task_id TEXT,
    workflow_id TEXT,
    dependencies TEXT DEFAULT '[]',
    input TEXT DEFAULT '{}',
    output TEXT,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    deadline TEXT,
    tags TEXT DEFAULT '[]',
    steps_total INTEGER DEFAULT 1,
    steps_completed INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    created_at TEXT NOT NULL,
    assigned_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON orchestration_tasks(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON orchestration_tasks(workflow_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_employee ON orchestration_tasks(employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_priority ON orchestration_tasks(priority, created_at)`,

  `CREATE TABLE IF NOT EXISTS orchestration_workflows (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    task_ids TEXT DEFAULT '[]',
    employee_ids TEXT DEFAULT '[]',
    config TEXT DEFAULT '{}',
    result TEXT,
    created_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_workflows_user ON orchestration_workflows(user_id)`,

  `CREATE TABLE IF NOT EXISTS agent_messages (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    from_employee_id TEXT NOT NULL,
    to_employee_id TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    reply_to_id TEXT,
    priority TEXT DEFAULT 'normal',
    read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_workflow ON agent_messages(workflow_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_to ON agent_messages(to_employee_id, read)`,

  // Also create tables from Phase 2 that were missing
  `CREATE TABLE IF NOT EXISTS task_executions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    pipeline_id TEXT,
    task_description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    steps_total INTEGER DEFAULT 1,
    steps_completed INTEGER DEFAULT 0,
    output TEXT,
    execution_time_ms INTEGER,
    created_at TEXT NOT NULL,
    completed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS personality_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, employee_id)
  )`,
];
