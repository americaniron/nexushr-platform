/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Multi-Agent Collaboration Protocol
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Enterprise coordination system enabling AI employees to work as a team:
 *
 * 1. TASK QUEUES — Priority-ordered work queues per employee with capacity limits
 * 2. INTER-AGENT MESSAGING — Typed message bus (request, inform, delegate, escalate)
 * 3. WORKFLOW ENGINE — DAG-based multi-step workflows with dependencies and gates
 * 4. DELEGATION PROTOCOL — Capability-matched task routing with load balancing
 * 5. STATUS TRACKING — Real-time progress with org-wide visibility
 * 6. EVENT BUS — Pub/sub event system triggering cross-agent reactions
 * 7. COLLABORATION SESSIONS — Shared context spaces for multi-agent tasks
 *
 * Example flow:
 *   Sales AI closes deal → event: "deal_closed"
 *     → Workflow engine triggers "new_customer_onboarding" workflow
 *       → Step 1: Executive Assistant schedules onboarding (delegated)
 *       → Step 2: Customer Support prepares docs (parallel with step 1)
 *       → Step 3: HR Manager creates employee access (after step 1 completes)
 *       → Step 4: Sales AI sends welcome email (after steps 1+2 complete)
 */

import type { Env } from '../index';

// ══════════════════════════════════════════════════════
// 1. TYPES
// ══════════════════════════════════════════════════════

// ── Task Queue Types ──

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
export type QueuedTaskStatus = 'queued' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'failed' | 'cancelled';

export interface QueuedTask {
  id: string;
  org_id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: QueuedTaskStatus;
  assigned_to: string;             // employee_id of the assignee
  created_by: string;              // employee_id or user_id of creator
  delegated_from: string | null;   // employee_id that delegated this
  workflow_id: string | null;      // parent workflow if part of one
  workflow_step_id: string | null;
  dependencies: string[];          // task IDs that must complete first
  blocked_by: string[];            // task IDs currently blocking this
  input_data: Record<string, any>; // data passed from upstream tasks
  output_data: Record<string, any> | null;
  deadline: string | null;
  estimated_duration_ms: number;
  actual_duration_ms: number;
  retry_count: number;
  max_retries: number;
  tags: string[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

// ── Inter-Agent Messaging Types ──

export type MessageType = 'request' | 'inform' | 'delegate' | 'escalate' | 'acknowledge' | 'query' | 'response' | 'broadcast';
export type MessagePriority = 'urgent' | 'high' | 'normal' | 'low';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'actioned' | 'expired';

export interface AgentMessage {
  id: string;
  org_id: string;
  from_employee: string;
  to_employee: string;            // '*' for broadcasts
  type: MessageType;
  priority: MessagePriority;
  subject: string;
  body: string;
  structured_payload: Record<string, any> | null;
  reference_id: string | null;   // task_id, workflow_id, or parent message_id
  requires_response: boolean;
  response_deadline: string | null;
  status: MessageStatus;
  thread_id: string;             // groups related messages
  created_at: string;
  read_at: string | null;
  actioned_at: string | null;
}

// ── Workflow Types ──

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type GateType = 'all' | 'any' | 'manual' | 'condition';

export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  status: WorkflowStatus;
  initiated_by: string;
  context: Record<string, any>;   // shared data across all steps
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface WorkflowTrigger {
  type: 'event' | 'manual' | 'schedule' | 'condition';
  event_name?: string;            // e.g., "deal_closed", "employee_hired"
  condition?: string;             // e.g., "deal.value > 10000"
  schedule?: string;              // cron expression
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  assigned_to: string;            // employee_id or role name
  status: StepStatus;
  depends_on: string[];           // step IDs that must complete first
  gate: GateType;                 // how to evaluate dependencies
  gate_condition?: string;        // for 'condition' gate type
  task_template: {
    title: string;
    description: string;
    priority: TaskPriority;
    estimated_duration_ms: number;
    input_mapping: Record<string, string>;  // maps workflow context → task input
    output_mapping: Record<string, string>; // maps task output → workflow context
  };
  timeout_ms: number;
  on_failure: 'retry' | 'skip' | 'abort' | 'escalate';
  max_retries: number;
  retry_count: number;
  task_id: string | null;         // created task ID when step starts
  started_at: string | null;
  completed_at: string | null;
  output: Record<string, any> | null;
}

// ── Event Bus Types ──

export type EventCategory = 'deal' | 'customer' | 'task' | 'hr' | 'support' | 'system' | 'workflow';

export interface CollaborationEvent {
  id: string;
  org_id: string;
  category: EventCategory;
  event_name: string;             // e.g., "deal_closed", "task_completed"
  emitted_by: string;             // employee_id
  payload: Record<string, any>;
  subscribers_notified: string[];
  workflows_triggered: string[];
  created_at: string;
}

export interface EventSubscription {
  id: string;
  org_id: string;
  employee_id: string;
  event_pattern: string;          // glob: "deal.*", "task.completed", "*"
  action: 'notify' | 'trigger_workflow' | 'execute_task';
  action_config: Record<string, any>;
  active: boolean;
  created_at: string;
}

// ── Employee Registry Types ──

export interface EmployeeCapability {
  employee_id: string;
  org_id: string;
  role: string;
  display_name: string;
  capabilities: string[];         // ["email_drafting", "scheduling", "data_analysis"]
  current_load: number;           // 0.0–1.0
  max_concurrent_tasks: number;
  status: 'available' | 'busy' | 'offline' | 'overloaded';
  specializations: Record<string, number>; // capability → proficiency 0.0–1.0
  avg_task_completion_ms: number;
  success_rate: number;
  last_active: string;
}

// ── Collaboration Session Types ──

export interface CollaborationSession {
  id: string;
  org_id: string;
  name: string;
  description: string;
  participants: string[];         // employee_ids
  owner: string;
  shared_context: Record<string, any>;
  messages: AgentMessage[];
  active_tasks: string[];
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

// ══════════════════════════════════════════════════════
// 2. TASK QUEUE ENGINE
// ══════════════════════════════════════════════════════

export class TaskQueueEngine {
  constructor(private env: Env) {}

  /** Enqueue a new task for an AI employee */
  async enqueue(params: {
    org_id: string;
    title: string;
    description: string;
    priority: TaskPriority;
    assigned_to: string;
    created_by: string;
    delegated_from?: string;
    workflow_id?: string;
    workflow_step_id?: string;
    dependencies?: string[];
    input_data?: Record<string, any>;
    deadline?: string;
    estimated_duration_ms?: number;
    tags?: string[];
  }): Promise<QueuedTask> {
    const id = `qtask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // Check if dependencies are met
    const deps = params.dependencies || [];
    const blockedBy: string[] = [];
    if (deps.length > 0) {
      for (const depId of deps) {
        const dep = await this.getTask(depId);
        if (dep && dep.status !== 'completed') {
          blockedBy.push(depId);
        }
      }
    }

    const status: QueuedTaskStatus = blockedBy.length > 0 ? 'blocked' : 'queued';

    const task: QueuedTask = {
      id, org_id: params.org_id, title: params.title, description: params.description,
      priority: params.priority, status,
      assigned_to: params.assigned_to, created_by: params.created_by,
      delegated_from: params.delegated_from || null,
      workflow_id: params.workflow_id || null,
      workflow_step_id: params.workflow_step_id || null,
      dependencies: deps, blocked_by: blockedBy,
      input_data: params.input_data || {},
      output_data: null,
      deadline: params.deadline || null,
      estimated_duration_ms: params.estimated_duration_ms || 0,
      actual_duration_ms: 0,
      retry_count: 0, max_retries: 3,
      tags: params.tags || [],
      created_at: now, started_at: null, completed_at: null, updated_at: now,
    };

    await this.env.DB.prepare(`
      INSERT INTO collaboration_tasks (
        id, org_id, title, description, priority, status,
        assigned_to, created_by, delegated_from,
        workflow_id, workflow_step_id,
        dependencies, blocked_by, input_data, output_data,
        deadline, estimated_duration_ms, actual_duration_ms,
        retry_count, max_retries, tags,
        created_at, started_at, completed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, params.org_id, params.title, params.description, params.priority, status,
      params.assigned_to, params.created_by, params.delegated_from || null,
      params.workflow_id || null, params.workflow_step_id || null,
      JSON.stringify(deps), JSON.stringify(blockedBy),
      JSON.stringify(params.input_data || {}), null,
      params.deadline || null, params.estimated_duration_ms || 0, 0,
      0, 3, JSON.stringify(params.tags || []),
      now, null, null, now
    ).run();

    // Notify assignee
    await this.notifyAssignment(task);

    return task;
  }

  /** Start working on the highest-priority queued task for an employee */
  async dequeue(employeeId: string, orgId: string): Promise<QueuedTask | null> {
    const priorityOrder = "CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END";

    const row = await this.env.DB.prepare(`
      SELECT * FROM collaboration_tasks
      WHERE org_id = ? AND assigned_to = ? AND status = 'queued'
      ORDER BY ${priorityOrder}, created_at ASC
      LIMIT 1
    `).bind(orgId, employeeId).first<any>();

    if (!row) return null;

    const now = new Date().toISOString();
    await this.env.DB.prepare(
      'UPDATE collaboration_tasks SET status = ?, started_at = ?, updated_at = ? WHERE id = ?'
    ).bind('in_progress', now, now, row.id).run();

    return this.rowToTask({ ...row, status: 'in_progress', started_at: now });
  }

  /** Complete a task and unblock dependents */
  async complete(taskId: string, output: Record<string, any>): Promise<{
    task: QueuedTask;
    unblocked: QueuedTask[];
  }> {
    const now = new Date().toISOString();
    const row = await this.env.DB.prepare('SELECT * FROM collaboration_tasks WHERE id = ?').bind(taskId).first<any>();
    if (!row) throw new Error('Task not found');

    const startedAt = row.started_at ? new Date(row.started_at).getTime() : Date.now();
    const actualDuration = Date.now() - startedAt;

    await this.env.DB.prepare(`
      UPDATE collaboration_tasks SET status = 'completed', output_data = ?, actual_duration_ms = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(output), actualDuration, now, now, taskId).run();

    const completedTask = this.rowToTask({ ...row, status: 'completed', output_data: JSON.stringify(output), actual_duration_ms: actualDuration, completed_at: now });

    // Unblock dependent tasks
    const unblocked = await this.unblockDependents(taskId, row.org_id);

    // Emit completion event
    const eventBus = new EventBus(this.env);
    await eventBus.emit({
      org_id: row.org_id,
      category: 'task',
      event_name: 'task.completed',
      emitted_by: row.assigned_to,
      payload: { task_id: taskId, title: row.title, output, workflow_id: row.workflow_id, workflow_step_id: row.workflow_step_id },
    });

    return { task: completedTask, unblocked };
  }

  /** Fail a task with optional retry */
  async fail(taskId: string, error: string): Promise<QueuedTask> {
    const row = await this.env.DB.prepare('SELECT * FROM collaboration_tasks WHERE id = ?').bind(taskId).first<any>();
    if (!row) throw new Error('Task not found');

    const now = new Date().toISOString();
    const retryCount = (row.retry_count || 0) + 1;

    if (retryCount <= row.max_retries) {
      // Retry: re-queue
      await this.env.DB.prepare(
        'UPDATE collaboration_tasks SET status = ?, retry_count = ?, updated_at = ? WHERE id = ?'
      ).bind('queued', retryCount, now, taskId).run();
      return this.rowToTask({ ...row, status: 'queued', retry_count: retryCount });
    }

    // Max retries exceeded → fail permanently
    await this.env.DB.prepare(
      'UPDATE collaboration_tasks SET status = ?, retry_count = ?, output_data = ?, completed_at = ?, updated_at = ? WHERE id = ?'
    ).bind('failed', retryCount, JSON.stringify({ error }), now, now, taskId).run();

    // Emit failure event
    const eventBus = new EventBus(this.env);
    await eventBus.emit({
      org_id: row.org_id,
      category: 'task',
      event_name: 'task.failed',
      emitted_by: row.assigned_to,
      payload: { task_id: taskId, title: row.title, error, workflow_id: row.workflow_id },
    });

    return this.rowToTask({ ...row, status: 'failed', retry_count: retryCount });
  }

  /** Get task by ID */
  async getTask(taskId: string): Promise<QueuedTask | null> {
    const row = await this.env.DB.prepare('SELECT * FROM collaboration_tasks WHERE id = ?').bind(taskId).first<any>();
    return row ? this.rowToTask(row) : null;
  }

  /** Get queue for an employee */
  async getQueue(employeeId: string, orgId: string, includeCompleted = false): Promise<QueuedTask[]> {
    const statusFilter = includeCompleted ? '' : "AND status IN ('queued', 'assigned', 'in_progress', 'blocked')";
    const rows = await this.env.DB.prepare(`
      SELECT * FROM collaboration_tasks
      WHERE org_id = ? AND assigned_to = ? ${statusFilter}
      ORDER BY
        CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 WHEN 'low' THEN 4 END,
        created_at ASC
      LIMIT 100
    `).bind(orgId, employeeId).all();

    return (rows.results || []).map((r: any) => this.rowToTask(r));
  }

  /** Get all tasks for an org (dashboard view) */
  async getOrgTasks(orgId: string, status?: QueuedTaskStatus): Promise<QueuedTask[]> {
    const statusFilter = status ? 'AND status = ?' : '';
    const params: any[] = [orgId];
    if (status) params.push(status);

    const rows = await this.env.DB.prepare(`
      SELECT * FROM collaboration_tasks WHERE org_id = ? ${statusFilter}
      ORDER BY updated_at DESC LIMIT 200
    `).bind(...params).all();

    return (rows.results || []).map((r: any) => this.rowToTask(r));
  }

  /** Unblock tasks that were waiting on the completed task */
  private async unblockDependents(completedTaskId: string, orgId: string): Promise<QueuedTask[]> {
    // Find tasks blocked by this one
    const rows = await this.env.DB.prepare(`
      SELECT * FROM collaboration_tasks
      WHERE org_id = ? AND status = 'blocked'
    `).bind(orgId).all();

    const unblocked: QueuedTask[] = [];
    const now = new Date().toISOString();

    for (const row of (rows.results || []) as any[]) {
      const blockedBy: string[] = JSON.parse(row.blocked_by || '[]');
      const remaining = blockedBy.filter(id => id !== completedTaskId);

      if (remaining.length === 0) {
        // All dependencies met → unblock
        await this.env.DB.prepare(
          'UPDATE collaboration_tasks SET status = ?, blocked_by = ?, updated_at = ? WHERE id = ?'
        ).bind('queued', '[]', now, row.id).run();
        unblocked.push(this.rowToTask({ ...row, status: 'queued', blocked_by: '[]' }));
      } else {
        // Still blocked by other tasks
        await this.env.DB.prepare(
          'UPDATE collaboration_tasks SET blocked_by = ?, updated_at = ? WHERE id = ?'
        ).bind(JSON.stringify(remaining), now, row.id).run();
      }
    }

    return unblocked;
  }

  private async notifyAssignment(task: QueuedTask): Promise<void> {
    const messaging = new InterAgentMessaging(this.env);
    await messaging.send({
      org_id: task.org_id,
      from_employee: task.created_by,
      to_employee: task.assigned_to,
      type: task.delegated_from ? 'delegate' : 'request',
      priority: task.priority === 'critical' ? 'urgent' : task.priority === 'high' ? 'high' : 'normal',
      subject: `New task: ${task.title}`,
      body: task.description,
      structured_payload: { task_id: task.id, input_data: task.input_data, deadline: task.deadline },
      reference_id: task.id,
      requires_response: false,
    });
  }

  private rowToTask(row: any): QueuedTask {
    return {
      id: row.id, org_id: row.org_id, title: row.title, description: row.description,
      priority: row.priority, status: row.status,
      assigned_to: row.assigned_to, created_by: row.created_by,
      delegated_from: row.delegated_from,
      workflow_id: row.workflow_id, workflow_step_id: row.workflow_step_id,
      dependencies: JSON.parse(row.dependencies || '[]'),
      blocked_by: JSON.parse(row.blocked_by || '[]'),
      input_data: JSON.parse(row.input_data || '{}'),
      output_data: row.output_data ? JSON.parse(row.output_data) : null,
      deadline: row.deadline,
      estimated_duration_ms: row.estimated_duration_ms || 0,
      actual_duration_ms: row.actual_duration_ms || 0,
      retry_count: row.retry_count || 0, max_retries: row.max_retries || 3,
      tags: JSON.parse(row.tags || '[]'),
      created_at: row.created_at, started_at: row.started_at,
      completed_at: row.completed_at, updated_at: row.updated_at,
    };
  }
}

// ══════════════════════════════════════════════════════
// 3. INTER-AGENT MESSAGING
// ══════════════════════════════════════════════════════

export class InterAgentMessaging {
  constructor(private env: Env) {}

  /** Send a message from one AI employee to another */
  async send(params: {
    org_id: string;
    from_employee: string;
    to_employee: string;
    type: MessageType;
    priority: MessagePriority;
    subject: string;
    body: string;
    structured_payload?: Record<string, any>;
    reference_id?: string;
    requires_response?: boolean;
    response_deadline?: string;
    thread_id?: string;
  }): Promise<AgentMessage> {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const threadId = params.thread_id || `thread-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const message: AgentMessage = {
      id, org_id: params.org_id,
      from_employee: params.from_employee,
      to_employee: params.to_employee,
      type: params.type, priority: params.priority,
      subject: params.subject, body: params.body,
      structured_payload: params.structured_payload || null,
      reference_id: params.reference_id || null,
      requires_response: params.requires_response || false,
      response_deadline: params.response_deadline || null,
      status: 'sent',
      thread_id: threadId,
      created_at: now, read_at: null, actioned_at: null,
    };

    await this.env.DB.prepare(`
      INSERT INTO agent_messages (
        id, org_id, from_employee, to_employee, type, priority,
        subject, body, structured_payload, reference_id,
        requires_response, response_deadline, status, thread_id,
        created_at, read_at, actioned_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, params.org_id, params.from_employee, params.to_employee,
      params.type, params.priority, params.subject, params.body,
      params.structured_payload ? JSON.stringify(params.structured_payload) : null,
      params.reference_id || null,
      params.requires_response ? 1 : 0, params.response_deadline || null,
      'sent', threadId, now, null, null
    ).run();

    // Store in KV for fast real-time access
    const inboxKey = `inbox:${params.org_id}:${params.to_employee}`;
    const existingRaw = await this.env.CACHE.get(inboxKey);
    const inbox: string[] = existingRaw ? JSON.parse(existingRaw) : [];
    inbox.push(id);
    // Keep last 100 message IDs in inbox
    const trimmed = inbox.slice(-100);
    await this.env.CACHE.put(inboxKey, JSON.stringify(trimmed), { expirationTtl: 86400 });

    return message;
  }

  /** Broadcast a message to all employees in an org */
  async broadcast(params: {
    org_id: string;
    from_employee: string;
    subject: string;
    body: string;
    structured_payload?: Record<string, any>;
    priority?: MessagePriority;
  }): Promise<AgentMessage> {
    return this.send({
      ...params,
      to_employee: '*',
      type: 'broadcast',
      priority: params.priority || 'normal',
    });
  }

  /** Get inbox for an employee */
  async getInbox(employeeId: string, orgId: string, unreadOnly = false): Promise<AgentMessage[]> {
    const statusFilter = unreadOnly ? "AND status = 'sent'" : '';
    const rows = await this.env.DB.prepare(`
      SELECT * FROM agent_messages
      WHERE org_id = ? AND (to_employee = ? OR to_employee = '*') ${statusFilter}
      ORDER BY created_at DESC LIMIT 50
    `).bind(orgId, employeeId).all();

    return (rows.results || []).map((r: any) => this.rowToMessage(r));
  }

  /** Get a conversation thread */
  async getThread(threadId: string): Promise<AgentMessage[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM agent_messages WHERE thread_id = ? ORDER BY created_at ASC'
    ).bind(threadId).all();
    return (rows.results || []).map((r: any) => this.rowToMessage(r));
  }

  /** Mark message as read */
  async markRead(messageId: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE agent_messages SET status = ?, read_at = ? WHERE id = ?'
    ).bind('read', new Date().toISOString(), messageId).run();
  }

  /** Mark message as actioned */
  async markActioned(messageId: string): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE agent_messages SET status = ?, actioned_at = ? WHERE id = ?'
    ).bind('actioned', new Date().toISOString(), messageId).run();
  }

  /** Reply to a message within the same thread */
  async reply(originalMessageId: string, params: {
    from_employee: string;
    body: string;
    type?: MessageType;
    structured_payload?: Record<string, any>;
  }): Promise<AgentMessage> {
    const original = await this.env.DB.prepare(
      'SELECT * FROM agent_messages WHERE id = ?'
    ).bind(originalMessageId).first<any>();

    if (!original) throw new Error('Original message not found');

    return this.send({
      org_id: original.org_id,
      from_employee: params.from_employee,
      to_employee: original.from_employee, // Reply goes back to sender
      type: params.type || 'response',
      priority: original.priority,
      subject: `Re: ${original.subject}`,
      body: params.body,
      structured_payload: params.structured_payload,
      reference_id: originalMessageId,
      thread_id: original.thread_id,
    });
  }

  private rowToMessage(row: any): AgentMessage {
    return {
      id: row.id, org_id: row.org_id,
      from_employee: row.from_employee, to_employee: row.to_employee,
      type: row.type, priority: row.priority,
      subject: row.subject, body: row.body,
      structured_payload: row.structured_payload ? JSON.parse(row.structured_payload) : null,
      reference_id: row.reference_id,
      requires_response: !!row.requires_response,
      response_deadline: row.response_deadline,
      status: row.status, thread_id: row.thread_id,
      created_at: row.created_at, read_at: row.read_at, actioned_at: row.actioned_at,
    };
  }
}

// ══════════════════════════════════════════════════════
// 4. WORKFLOW ENGINE (DAG-based)
// ══════════════════════════════════════════════════════

export class WorkflowEngine {
  constructor(private env: Env) {}

  /** Create and start a workflow */
  async create(params: {
    org_id: string;
    name: string;
    description: string;
    trigger: WorkflowTrigger;
    steps: Omit<WorkflowStep, 'status' | 'retry_count' | 'task_id' | 'started_at' | 'completed_at' | 'output'>[];
    initiated_by: string;
    context?: Record<string, any>;
    auto_start?: boolean;
  }): Promise<Workflow> {
    const id = `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const steps: WorkflowStep[] = params.steps.map(s => ({
      ...s,
      status: 'pending',
      retry_count: 0,
      task_id: null,
      started_at: null,
      completed_at: null,
      output: null,
    }));

    const workflow: Workflow = {
      id, org_id: params.org_id,
      name: params.name, description: params.description,
      trigger: params.trigger, steps,
      status: params.auto_start !== false ? 'active' : 'draft',
      initiated_by: params.initiated_by,
      context: params.context || {},
      created_at: now,
      started_at: params.auto_start !== false ? now : null,
      completed_at: null, updated_at: now,
    };

    await this.env.DB.prepare(`
      INSERT INTO collaboration_workflows (
        id, org_id, name, description, trigger_config, steps, status,
        initiated_by, context, created_at, started_at, completed_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, params.org_id, params.name, params.description,
      JSON.stringify(params.trigger), JSON.stringify(steps),
      workflow.status, params.initiated_by,
      JSON.stringify(workflow.context),
      now, workflow.started_at, null, now
    ).run();

    // Auto-start ready steps
    if (params.auto_start !== false) {
      await this.advanceWorkflow(id);
    }

    return workflow;
  }

  /** Advance a workflow: find ready steps and create tasks for them */
  async advanceWorkflow(workflowId: string): Promise<{
    started_steps: string[];
    completed: boolean;
  }> {
    const row = await this.env.DB.prepare(
      'SELECT * FROM collaboration_workflows WHERE id = ?'
    ).bind(workflowId).first<any>();

    if (!row || row.status !== 'active') return { started_steps: [], completed: false };

    const steps: WorkflowStep[] = JSON.parse(row.steps || '[]');
    const context: Record<string, any> = JSON.parse(row.context || '{}');
    const startedSteps: string[] = [];
    const taskQueue = new TaskQueueEngine(this.env);

    for (const step of steps) {
      if (step.status !== 'pending') continue;

      // Check if all dependencies are met
      const depsReady = this.checkGate(step, steps);
      if (!depsReady) continue;

      // Mark step as ready → in_progress
      step.status = 'in_progress';
      step.started_at = new Date().toISOString();

      // Map workflow context to task input
      const inputData: Record<string, any> = {};
      for (const [taskKey, contextKey] of Object.entries(step.task_template.input_mapping)) {
        inputData[taskKey] = context[contextKey];
      }

      // Resolve assigned_to: could be a role name that needs resolution
      const assignee = await this.resolveAssignee(step.assigned_to, row.org_id);

      // Create the task
      const task = await taskQueue.enqueue({
        org_id: row.org_id,
        title: step.task_template.title,
        description: step.task_template.description,
        priority: step.task_template.priority,
        assigned_to: assignee,
        created_by: row.initiated_by,
        workflow_id: workflowId,
        workflow_step_id: step.id,
        input_data: inputData,
        estimated_duration_ms: step.task_template.estimated_duration_ms,
      });

      step.task_id = task.id;
      startedSteps.push(step.id);
    }

    // Check if workflow is complete
    const allDone = steps.every(s => s.status === 'completed' || s.status === 'skipped');
    const anyFailed = steps.some(s => s.status === 'failed');
    const now = new Date().toISOString();

    let workflowStatus = row.status;
    if (allDone) workflowStatus = 'completed';
    else if (anyFailed) workflowStatus = 'failed';

    await this.env.DB.prepare(`
      UPDATE collaboration_workflows SET steps = ?, context = ?, status = ?, updated_at = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      JSON.stringify(steps), JSON.stringify(context), workflowStatus, now,
      allDone ? now : null, workflowId
    ).run();

    return { started_steps: startedSteps, completed: allDone };
  }

  /** Handle task completion within a workflow step */
  async onStepTaskCompleted(workflowId: string, stepId: string, output: Record<string, any>): Promise<void> {
    const row = await this.env.DB.prepare(
      'SELECT * FROM collaboration_workflows WHERE id = ?'
    ).bind(workflowId).first<any>();

    if (!row) return;

    const steps: WorkflowStep[] = JSON.parse(row.steps || '[]');
    const context: Record<string, any> = JSON.parse(row.context || '{}');

    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'completed';
    step.completed_at = new Date().toISOString();
    step.output = output;

    // Map task output back to workflow context
    for (const [contextKey, outputKey] of Object.entries(step.task_template.output_mapping)) {
      context[contextKey] = output[outputKey];
    }

    await this.env.DB.prepare(
      'UPDATE collaboration_workflows SET steps = ?, context = ?, updated_at = ? WHERE id = ?'
    ).bind(JSON.stringify(steps), JSON.stringify(context), new Date().toISOString(), workflowId).run();

    // Advance to next steps
    await this.advanceWorkflow(workflowId);
  }

  /** Handle task failure within a workflow step */
  async onStepTaskFailed(workflowId: string, stepId: string, error: string): Promise<void> {
    const row = await this.env.DB.prepare(
      'SELECT * FROM collaboration_workflows WHERE id = ?'
    ).bind(workflowId).first<any>();

    if (!row) return;

    const steps: WorkflowStep[] = JSON.parse(row.steps || '[]');
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    step.retry_count++;

    if (step.on_failure === 'retry' && step.retry_count <= step.max_retries) {
      step.status = 'pending'; // Will be re-picked up by advanceWorkflow
      step.task_id = null;
    } else if (step.on_failure === 'skip') {
      step.status = 'skipped';
      step.completed_at = new Date().toISOString();
    } else if (step.on_failure === 'escalate') {
      step.status = 'failed';
      // Send escalation message
      const messaging = new InterAgentMessaging(this.env);
      await messaging.send({
        org_id: row.org_id,
        from_employee: step.assigned_to,
        to_employee: row.initiated_by,
        type: 'escalate',
        priority: 'urgent',
        subject: `Workflow step failed: ${step.name}`,
        body: `Step "${step.name}" in workflow "${row.name}" failed after ${step.retry_count} attempts. Error: ${error}`,
        reference_id: workflowId,
      });
    } else {
      // abort
      step.status = 'failed';
      await this.env.DB.prepare(
        'UPDATE collaboration_workflows SET status = ?, updated_at = ? WHERE id = ?'
      ).bind('failed', new Date().toISOString(), workflowId).run();
    }

    await this.env.DB.prepare(
      'UPDATE collaboration_workflows SET steps = ?, updated_at = ? WHERE id = ?'
    ).bind(JSON.stringify(steps), new Date().toISOString(), workflowId).run();

    // Try to advance remaining steps
    await this.advanceWorkflow(workflowId);
  }

  /** Get a workflow by ID */
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    const row = await this.env.DB.prepare(
      'SELECT * FROM collaboration_workflows WHERE id = ?'
    ).bind(workflowId).first<any>();
    return row ? this.rowToWorkflow(row) : null;
  }

  /** List workflows for an org */
  async listWorkflows(orgId: string, status?: WorkflowStatus): Promise<Workflow[]> {
    const filter = status ? 'AND status = ?' : '';
    const params: any[] = [orgId];
    if (status) params.push(status);

    const rows = await this.env.DB.prepare(`
      SELECT * FROM collaboration_workflows WHERE org_id = ? ${filter}
      ORDER BY updated_at DESC LIMIT 50
    `).bind(...params).all();

    return (rows.results || []).map((r: any) => this.rowToWorkflow(r));
  }

  private checkGate(step: WorkflowStep, allSteps: WorkflowStep[]): boolean {
    if (step.depends_on.length === 0) return true;

    const depStatuses = step.depends_on.map(depId => {
      const dep = allSteps.find(s => s.id === depId);
      return dep?.status || 'pending';
    });

    switch (step.gate) {
      case 'all':  return depStatuses.every(s => s === 'completed' || s === 'skipped');
      case 'any':  return depStatuses.some(s => s === 'completed' || s === 'skipped');
      case 'manual': return false; // Requires manual trigger
      default:     return depStatuses.every(s => s === 'completed' || s === 'skipped');
    }
  }

  private async resolveAssignee(assigneeOrRole: string, orgId: string): Promise<string> {
    // If it looks like an employee ID, return as-is
    if (assigneeOrRole.includes('-') || assigneeOrRole.length > 20) return assigneeOrRole;

    // Otherwise treat as a role name and find the best available employee
    const delegation = new DelegationEngine(this.env);
    const best = await delegation.findBestAgent(orgId, assigneeOrRole, []);
    return best || assigneeOrRole;
  }

  private rowToWorkflow(row: any): Workflow {
    return {
      id: row.id, org_id: row.org_id,
      name: row.name, description: row.description,
      trigger: JSON.parse(row.trigger_config || '{}'),
      steps: JSON.parse(row.steps || '[]'),
      status: row.status, initiated_by: row.initiated_by,
      context: JSON.parse(row.context || '{}'),
      created_at: row.created_at, started_at: row.started_at,
      completed_at: row.completed_at, updated_at: row.updated_at,
    };
  }
}

// ══════════════════════════════════════════════════════
// 5. DELEGATION ENGINE
// ══════════════════════════════════════════════════════

export class DelegationEngine {
  constructor(private env: Env) {}

  /** Register or update an employee's capabilities */
  async registerCapabilities(params: {
    employee_id: string;
    org_id: string;
    role: string;
    display_name: string;
    capabilities: string[];
    max_concurrent_tasks?: number;
    specializations?: Record<string, number>;
  }): Promise<EmployeeCapability> {
    const now = new Date().toISOString();

    const cap: EmployeeCapability = {
      employee_id: params.employee_id,
      org_id: params.org_id,
      role: params.role,
      display_name: params.display_name,
      capabilities: params.capabilities,
      current_load: 0,
      max_concurrent_tasks: params.max_concurrent_tasks || 5,
      status: 'available',
      specializations: params.specializations || {},
      avg_task_completion_ms: 0,
      success_rate: 1.0,
      last_active: now,
    };

    // Store in both D1 (permanent) and KV (fast lookup)
    await this.env.DB.prepare(`
      INSERT OR REPLACE INTO employee_capabilities (
        employee_id, org_id, role, display_name, capabilities,
        current_load, max_concurrent_tasks, status, specializations,
        avg_task_completion_ms, success_rate, last_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      cap.employee_id, cap.org_id, cap.role, cap.display_name,
      JSON.stringify(cap.capabilities), 0, cap.max_concurrent_tasks,
      'available', JSON.stringify(cap.specializations || {}),
      0, 1.0, now
    ).run();

    await this.env.CACHE.put(
      `capability:${params.org_id}:${params.employee_id}`,
      JSON.stringify(cap), { expirationTtl: 3600 }
    );

    return cap;
  }

  /** Find the best agent for a task based on capabilities and load */
  async findBestAgent(orgId: string, requiredRole: string, requiredCapabilities: string[]): Promise<string | null> {
    const rows = await this.env.DB.prepare(`
      SELECT * FROM employee_capabilities
      WHERE org_id = ? AND role = ? AND status != 'offline'
      ORDER BY current_load ASC
    `).bind(orgId, requiredRole).all();

    const candidates = (rows.results || []) as any[];
    if (candidates.length === 0) {
      // Try matching by capabilities instead of exact role
      const allRows = await this.env.DB.prepare(
        "SELECT * FROM employee_capabilities WHERE org_id = ? AND status != 'offline'"
      ).bind(orgId).all();

      const allCandidates = (allRows.results || []) as any[];
      const capMatches = allCandidates.filter(c => {
        const caps: string[] = JSON.parse(c.capabilities || '[]');
        return requiredCapabilities.every(rc => caps.includes(rc));
      });

      if (capMatches.length === 0) return null;
      return this.scoreCandidates(capMatches, requiredCapabilities)[0]?.employee_id || null;
    }

    return this.scoreCandidates(candidates, requiredCapabilities)[0]?.employee_id || null;
  }

  /** Delegate a task from one employee to another */
  async delegate(params: {
    org_id: string;
    from_employee: string;
    task_title: string;
    task_description: string;
    required_capabilities?: string[];
    preferred_employee?: string;
    priority?: TaskPriority;
    input_data?: Record<string, any>;
    deadline?: string;
  }): Promise<{
    task: QueuedTask;
    delegated_to: string;
    reason: string;
  }> {
    let assignee: string;
    let reason: string;

    if (params.preferred_employee) {
      assignee = params.preferred_employee;
      reason = 'Explicitly requested';
    } else {
      // Find best agent
      const taskType = this.inferTaskType(params.task_title, params.task_description);
      const capabilities = params.required_capabilities || [taskType];
      const role = this.inferRole(capabilities);

      const best = await this.findBestAgent(params.org_id, role, capabilities);
      if (!best) {
        // Fallback: assign to creator (self-delegation)
        assignee = params.from_employee;
        reason = 'No suitable agent found; self-assigned';
      } else {
        assignee = best;
        reason = `Best match for capabilities: ${capabilities.join(', ')}`;
      }
    }

    const taskQueue = new TaskQueueEngine(this.env);
    const task = await taskQueue.enqueue({
      org_id: params.org_id,
      title: params.task_title,
      description: params.task_description,
      priority: params.priority || 'normal',
      assigned_to: assignee,
      created_by: params.from_employee,
      delegated_from: params.from_employee,
      input_data: params.input_data,
      deadline: params.deadline,
    });

    return { task, delegated_to: assignee, reason };
  }

  /** Get all employee capabilities for an org */
  async getTeam(orgId: string): Promise<EmployeeCapability[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM employee_capabilities WHERE org_id = ? ORDER BY role, display_name'
    ).bind(orgId).all();

    return (rows.results || []).map((r: any) => ({
      employee_id: r.employee_id, org_id: r.org_id, role: r.role,
      display_name: r.display_name,
      capabilities: JSON.parse(r.capabilities || '[]'),
      current_load: r.current_load, max_concurrent_tasks: r.max_concurrent_tasks,
      status: r.status,
      specializations: JSON.parse(r.specializations || '{}'),
      avg_task_completion_ms: r.avg_task_completion_ms,
      success_rate: r.success_rate, last_active: r.last_active,
    }));
  }

  /** Update load metrics when a task starts/completes */
  async updateLoad(employeeId: string, orgId: string): Promise<void> {
    const taskQueue = new TaskQueueEngine(this.env);
    const activeTasks = await taskQueue.getQueue(employeeId, orgId);
    const inProgress = activeTasks.filter(t => t.status === 'in_progress').length;

    const capRow = await this.env.DB.prepare(
      'SELECT max_concurrent_tasks FROM employee_capabilities WHERE employee_id = ? AND org_id = ?'
    ).bind(employeeId, orgId).first<any>();

    const maxTasks = capRow?.max_concurrent_tasks || 5;
    const load = Math.min(1.0, inProgress / maxTasks);
    const status = load >= 0.9 ? 'overloaded' : load >= 0.6 ? 'busy' : 'available';

    await this.env.DB.prepare(
      'UPDATE employee_capabilities SET current_load = ?, status = ?, last_active = ? WHERE employee_id = ? AND org_id = ?'
    ).bind(load, status, new Date().toISOString(), employeeId, orgId).run();
  }

  private scoreCandidates(candidates: any[], requiredCapabilities: string[]): { employee_id: string; score: number }[] {
    return candidates.map(c => {
      const caps: string[] = JSON.parse(c.capabilities || '[]');
      const specs: Record<string, number> = JSON.parse(c.specializations || '{}');

      // Capability match score
      const capMatch = requiredCapabilities.length > 0
        ? requiredCapabilities.filter(rc => caps.includes(rc)).length / requiredCapabilities.length
        : 0.5;

      // Specialization proficiency score
      const specScore = requiredCapabilities.length > 0
        ? requiredCapabilities.reduce((sum, rc) => sum + (specs[rc] || 0.5), 0) / requiredCapabilities.length
        : 0.5;

      // Load score (lower load = better)
      const loadScore = 1.0 - (c.current_load || 0);

      // Success rate
      const successScore = c.success_rate || 0.8;

      // Combined: capability 30%, specialization 20%, load 30%, success 20%
      const finalScore = (capMatch * 0.3) + (specScore * 0.2) + (loadScore * 0.3) + (successScore * 0.2);

      return { employee_id: c.employee_id, score: finalScore };
    }).sort((a, b) => b.score - a.score);
  }

  private inferTaskType(title: string, description: string): string {
    const text = (title + ' ' + description).toLowerCase();
    if (text.match(/\b(email|draft|compose|send)\b/)) return 'email_drafting';
    if (text.match(/\b(schedule|meeting|calendar|book)\b/)) return 'scheduling';
    if (text.match(/\b(report|analyze|data|metric)\b/)) return 'data_analysis';
    if (text.match(/\b(support|ticket|issue|help)\b/)) return 'customer_support';
    if (text.match(/\b(sell|deal|prospect|pipeline)\b/)) return 'sales';
    if (text.match(/\b(hire|onboard|candidate|interview)\b/)) return 'hr_management';
    if (text.match(/\b(market|campaign|content|social)\b/)) return 'marketing';
    return 'general';
  }

  private inferRole(capabilities: string[]): string {
    const roleMap: Record<string, string> = {
      scheduling: 'executive_assistant',
      email_drafting: 'executive_assistant',
      data_analysis: 'data_analyst',
      customer_support: 'customer_support_agent',
      sales: 'sales_representative',
      hr_management: 'hr_manager',
      marketing: 'marketing_manager',
    };
    for (const cap of capabilities) {
      if (roleMap[cap]) return roleMap[cap];
    }
    return 'executive_assistant';
  }
}

// ══════════════════════════════════════════════════════
// 6. EVENT BUS (pub/sub)
// ══════════════════════════════════════════════════════

export class EventBus {
  constructor(private env: Env) {}

  /** Emit an event and notify all matching subscribers */
  async emit(params: {
    org_id: string;
    category: EventCategory;
    event_name: string;
    emitted_by: string;
    payload: Record<string, any>;
  }): Promise<CollaborationEvent> {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // Find matching subscriptions
    const subs = await this.env.DB.prepare(
      'SELECT * FROM event_subscriptions WHERE org_id = ? AND active = 1'
    ).bind(params.org_id).all();

    const matchingSubs = (subs.results || []).filter((s: any) => {
      return this.matchesPattern(params.event_name, s.event_pattern) ||
             this.matchesPattern(`${params.category}.*`, s.event_pattern);
    }) as any[];

    const subscribersNotified: string[] = [];
    const workflowsTriggered: string[] = [];

    for (const sub of matchingSubs) {
      subscribersNotified.push(sub.employee_id);

      const actionConfig = JSON.parse(sub.action_config || '{}');

      switch (sub.action) {
        case 'notify': {
          const messaging = new InterAgentMessaging(this.env);
          await messaging.send({
            org_id: params.org_id,
            from_employee: params.emitted_by,
            to_employee: sub.employee_id,
            type: 'inform',
            priority: 'normal',
            subject: `Event: ${params.event_name}`,
            body: `Event "${params.event_name}" was triggered by ${params.emitted_by}. Details: ${JSON.stringify(params.payload).slice(0, 500)}`,
            structured_payload: params.payload,
            reference_id: id,
          });
          break;
        }
        case 'trigger_workflow': {
          if (actionConfig.workflow_template) {
            const workflowEngine = new WorkflowEngine(this.env);
            const wf = await workflowEngine.create({
              org_id: params.org_id,
              name: actionConfig.workflow_template.name || `Auto: ${params.event_name}`,
              description: `Triggered by event: ${params.event_name}`,
              trigger: { type: 'event', event_name: params.event_name },
              steps: actionConfig.workflow_template.steps || [],
              initiated_by: params.emitted_by,
              context: { ...params.payload, trigger_event: params.event_name },
              auto_start: true,
            });
            workflowsTriggered.push(wf.id);
          }
          break;
        }
        case 'execute_task': {
          const taskQueue = new TaskQueueEngine(this.env);
          await taskQueue.enqueue({
            org_id: params.org_id,
            title: actionConfig.task_title || `Handle: ${params.event_name}`,
            description: actionConfig.task_description || `Triggered by event: ${params.event_name}`,
            priority: actionConfig.priority || 'normal',
            assigned_to: sub.employee_id,
            created_by: params.emitted_by,
            input_data: params.payload,
          });
          break;
        }
      }
    }

    const event: CollaborationEvent = {
      id, org_id: params.org_id,
      category: params.category, event_name: params.event_name,
      emitted_by: params.emitted_by, payload: params.payload,
      subscribers_notified: subscribersNotified,
      workflows_triggered: workflowsTriggered,
      created_at: now,
    };

    // Persist event
    await this.env.DB.prepare(`
      INSERT INTO collaboration_events (id, org_id, category, event_name, emitted_by, payload, subscribers_notified, workflows_triggered, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, params.org_id, params.category, params.event_name, params.emitted_by,
      JSON.stringify(params.payload), JSON.stringify(subscribersNotified),
      JSON.stringify(workflowsTriggered), now
    ).run();

    return event;
  }

  /** Subscribe an employee to an event pattern */
  async subscribe(params: {
    org_id: string;
    employee_id: string;
    event_pattern: string;
    action: 'notify' | 'trigger_workflow' | 'execute_task';
    action_config?: Record<string, any>;
  }): Promise<EventSubscription> {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const sub: EventSubscription = {
      id, org_id: params.org_id, employee_id: params.employee_id,
      event_pattern: params.event_pattern,
      action: params.action, action_config: params.action_config || {},
      active: true, created_at: now,
    };

    await this.env.DB.prepare(`
      INSERT INTO event_subscriptions (id, org_id, employee_id, event_pattern, action, action_config, active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, params.org_id, params.employee_id, params.event_pattern, params.action, JSON.stringify(params.action_config || {}), 1, now).run();

    return sub;
  }

  /** List subscriptions for an employee */
  async getSubscriptions(employeeId: string, orgId: string): Promise<EventSubscription[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM event_subscriptions WHERE org_id = ? AND employee_id = ? ORDER BY created_at DESC'
    ).bind(orgId, employeeId).all();

    return (rows.results || []).map((r: any) => ({
      id: r.id, org_id: r.org_id, employee_id: r.employee_id,
      event_pattern: r.event_pattern, action: r.action,
      action_config: JSON.parse(r.action_config || '{}'),
      active: !!r.active, created_at: r.created_at,
    }));
  }

  /** Get recent events for an org */
  async getRecentEvents(orgId: string, limit = 50): Promise<CollaborationEvent[]> {
    const rows = await this.env.DB.prepare(
      'SELECT * FROM collaboration_events WHERE org_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(orgId, limit).all();

    return (rows.results || []).map((r: any) => ({
      id: r.id, org_id: r.org_id, category: r.category,
      event_name: r.event_name, emitted_by: r.emitted_by,
      payload: JSON.parse(r.payload || '{}'),
      subscribers_notified: JSON.parse(r.subscribers_notified || '[]'),
      workflows_triggered: JSON.parse(r.workflows_triggered || '[]'),
      created_at: r.created_at,
    }));
  }

  private matchesPattern(eventName: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === eventName) return true;
    // Simple glob: "deal.*" matches "deal.closed", "deal.updated"
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      return eventName.startsWith(prefix);
    }
    return false;
  }
}

// ══════════════════════════════════════════════════════
// 7. PRE-BUILT WORKFLOW TEMPLATES
// ══════════════════════════════════════════════════════

export const WORKFLOW_TEMPLATES: Record<string, {
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: Omit<WorkflowStep, 'status' | 'retry_count' | 'task_id' | 'started_at' | 'completed_at' | 'output'>[];
}> = {
  new_customer_onboarding: {
    name: 'New Customer Onboarding',
    description: 'End-to-end onboarding when Sales closes a new deal',
    trigger: { type: 'event', event_name: 'deal.closed' },
    steps: [
      {
        id: 'step-schedule-onboarding',
        name: 'Schedule Onboarding Meeting',
        description: 'Executive Assistant schedules kickoff meeting with the new customer',
        assigned_to: 'executive_assistant',
        depends_on: [],
        gate: 'all',
        task_template: {
          title: 'Schedule onboarding meeting for {customer_name}',
          description: 'Book a 60-min onboarding kickoff with {contact_email}. Include account manager and support lead.',
          priority: 'high',
          estimated_duration_ms: 300000,
          input_mapping: { customer_name: 'customer_name', contact_email: 'contact_email' },
          output_mapping: { meeting_time: 'meeting_scheduled_time', calendar_link: 'meeting_link' },
        },
        timeout_ms: 3600000,
        on_failure: 'retry',
        max_retries: 2,
      },
      {
        id: 'step-prepare-docs',
        name: 'Prepare Support Documentation',
        description: 'Customer Support prepares onboarding guides and support docs',
        assigned_to: 'customer_support_agent',
        depends_on: [],  // parallel with scheduling
        gate: 'all',
        task_template: {
          title: 'Prepare onboarding docs for {customer_name}',
          description: 'Create customized onboarding guide, FAQ, and support contact sheet for {customer_name} ({plan_type} plan).',
          priority: 'high',
          estimated_duration_ms: 600000,
          input_mapping: { customer_name: 'customer_name', plan_type: 'plan_type' },
          output_mapping: { doc_links: 'support_doc_links' },
        },
        timeout_ms: 7200000,
        on_failure: 'retry',
        max_retries: 2,
      },
      {
        id: 'step-setup-access',
        name: 'Set Up Customer Access',
        description: 'HR Manager provisions accounts and access for the new customer',
        assigned_to: 'hr_manager',
        depends_on: ['step-schedule-onboarding'],
        gate: 'all',
        task_template: {
          title: 'Provision access for {customer_name}',
          description: 'Create org workspace, set up admin account for {contact_email}, configure plan limits for {plan_type}.',
          priority: 'high',
          estimated_duration_ms: 900000,
          input_mapping: { customer_name: 'customer_name', contact_email: 'contact_email', plan_type: 'plan_type' },
          output_mapping: { workspace_url: 'workspace_url', admin_credentials: 'admin_setup_complete' },
        },
        timeout_ms: 3600000,
        on_failure: 'escalate',
        max_retries: 1,
      },
      {
        id: 'step-send-welcome',
        name: 'Send Welcome Email',
        description: 'Sales AI sends personalized welcome email with all setup details',
        assigned_to: 'sales_representative',
        depends_on: ['step-schedule-onboarding', 'step-prepare-docs', 'step-setup-access'],
        gate: 'all',
        task_template: {
          title: 'Send welcome email to {customer_name}',
          description: 'Compose and send welcome email to {contact_email} with meeting link, docs, and workspace access.',
          priority: 'high',
          estimated_duration_ms: 300000,
          input_mapping: {
            customer_name: 'customer_name', contact_email: 'contact_email',
            meeting_link: 'meeting_link', support_doc_links: 'support_doc_links',
            workspace_url: 'workspace_url',
          },
          output_mapping: { email_sent: 'welcome_email_sent' },
        },
        timeout_ms: 1800000,
        on_failure: 'retry',
        max_retries: 2,
      },
    ],
  },

  employee_offboarding: {
    name: 'Employee Offboarding',
    description: 'Coordinated offboarding when an employee leaves the organization',
    trigger: { type: 'event', event_name: 'hr.employee_departure' },
    steps: [
      {
        id: 'step-knowledge-transfer',
        name: 'Knowledge Transfer',
        description: 'Data Analyst exports all reports and dashboards created by departing employee',
        assigned_to: 'data_analyst',
        depends_on: [],
        gate: 'all',
        task_template: {
          title: 'Export knowledge base for {employee_name}',
          description: 'Export all reports, dashboards, and documented processes for {employee_name} before departure on {departure_date}.',
          priority: 'high',
          estimated_duration_ms: 1800000,
          input_mapping: { employee_name: 'employee_name', departure_date: 'departure_date' },
          output_mapping: { export_location: 'knowledge_export_url' },
        },
        timeout_ms: 86400000,
        on_failure: 'escalate',
        max_retries: 1,
      },
      {
        id: 'step-reassign-clients',
        name: 'Reassign Client Accounts',
        description: 'Sales Rep reassigns the departing employee\'s accounts',
        assigned_to: 'sales_representative',
        depends_on: [],
        gate: 'all',
        task_template: {
          title: 'Reassign accounts from {employee_name}',
          description: 'Review and reassign all active client accounts from {employee_name}. Notify affected clients.',
          priority: 'high',
          estimated_duration_ms: 1200000,
          input_mapping: { employee_name: 'employee_name' },
          output_mapping: { accounts_reassigned: 'reassignment_count' },
        },
        timeout_ms: 172800000,
        on_failure: 'escalate',
        max_retries: 1,
      },
      {
        id: 'step-revoke-access',
        name: 'Revoke System Access',
        description: 'HR Manager revokes all system access on departure date',
        assigned_to: 'hr_manager',
        depends_on: ['step-knowledge-transfer'],
        gate: 'all',
        task_template: {
          title: 'Revoke access for {employee_name}',
          description: 'Disable all system accounts, SSO, VPN, and building access for {employee_name} effective {departure_date}.',
          priority: 'critical',
          estimated_duration_ms: 600000,
          input_mapping: { employee_name: 'employee_name', departure_date: 'departure_date' },
          output_mapping: { access_revoked: 'access_cleanup_complete' },
        },
        timeout_ms: 3600000,
        on_failure: 'escalate',
        max_retries: 0,
      },
      {
        id: 'step-farewell',
        name: 'Send Team Notification',
        description: 'Executive Assistant drafts and sends team notification',
        assigned_to: 'executive_assistant',
        depends_on: ['step-reassign-clients'],
        gate: 'all',
        task_template: {
          title: 'Draft departure announcement for {employee_name}',
          description: 'Draft a professional team notification about {employee_name}\'s departure and account transitions.',
          priority: 'normal',
          estimated_duration_ms: 300000,
          input_mapping: { employee_name: 'employee_name', reassignment_count: 'reassignment_count' },
          output_mapping: { notification_sent: 'team_notified' },
        },
        timeout_ms: 86400000,
        on_failure: 'skip',
        max_retries: 1,
      },
    ],
  },

  quarterly_report: {
    name: 'Quarterly Business Report',
    description: 'Multi-department quarterly report compilation',
    trigger: { type: 'schedule', schedule: '0 9 1 1,4,7,10 *' },
    steps: [
      {
        id: 'step-sales-metrics',
        name: 'Compile Sales Metrics',
        description: 'Sales Rep compiles quarterly sales data',
        assigned_to: 'sales_representative',
        depends_on: [],
        gate: 'all',
        task_template: {
          title: 'Compile Q{quarter} sales metrics',
          description: 'Compile revenue, deals closed, pipeline value, and win rate for Q{quarter} {year}.',
          priority: 'high',
          estimated_duration_ms: 1200000,
          input_mapping: { quarter: 'quarter', year: 'year' },
          output_mapping: { sales_data: 'sales_metrics' },
        },
        timeout_ms: 86400000,
        on_failure: 'retry',
        max_retries: 2,
      },
      {
        id: 'step-support-metrics',
        name: 'Compile Support Metrics',
        description: 'Customer Support compiles CSAT and ticket data',
        assigned_to: 'customer_support_agent',
        depends_on: [],
        gate: 'all',
        task_template: {
          title: 'Compile Q{quarter} support metrics',
          description: 'Compile CSAT score, tickets resolved, avg response time, and top issues for Q{quarter} {year}.',
          priority: 'high',
          estimated_duration_ms: 900000,
          input_mapping: { quarter: 'quarter', year: 'year' },
          output_mapping: { support_data: 'support_metrics' },
        },
        timeout_ms: 86400000,
        on_failure: 'retry',
        max_retries: 2,
      },
      {
        id: 'step-analyze',
        name: 'Analyze and Visualize',
        description: 'Data Analyst creates visualizations and trend analysis',
        assigned_to: 'data_analyst',
        depends_on: ['step-sales-metrics', 'step-support-metrics'],
        gate: 'all',
        task_template: {
          title: 'Analyze Q{quarter} data and create visualizations',
          description: 'Cross-reference sales and support data. Create trend charts, identify correlations, prepare executive summary.',
          priority: 'high',
          estimated_duration_ms: 1800000,
          input_mapping: { quarter: 'quarter', year: 'year', sales_metrics: 'sales_metrics', support_metrics: 'support_metrics' },
          output_mapping: { analysis: 'quarterly_analysis', charts: 'visualization_urls' },
        },
        timeout_ms: 86400000,
        on_failure: 'retry',
        max_retries: 2,
      },
      {
        id: 'step-compile-report',
        name: 'Compile Final Report',
        description: 'Executive Assistant compiles everything into the quarterly report',
        assigned_to: 'executive_assistant',
        depends_on: ['step-analyze'],
        gate: 'all',
        task_template: {
          title: 'Compile Q{quarter} quarterly business report',
          description: 'Compile analysis, charts, and department data into final quarterly report. Format for executive presentation.',
          priority: 'high',
          estimated_duration_ms: 1200000,
          input_mapping: { quarter: 'quarter', year: 'year', quarterly_analysis: 'quarterly_analysis', visualization_urls: 'visualization_urls' },
          output_mapping: { report_url: 'final_report_url' },
        },
        timeout_ms: 86400000,
        on_failure: 'retry',
        max_retries: 2,
      },
    ],
  },
};

// ══════════════════════════════════════════════════════
// 8. D1 SCHEMA
// ══════════════════════════════════════════════════════

export const COLLABORATION_SCHEMA = `
  CREATE TABLE IF NOT EXISTS collaboration_tasks (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'queued',
    assigned_to TEXT NOT NULL,
    created_by TEXT NOT NULL,
    delegated_from TEXT,
    workflow_id TEXT,
    workflow_step_id TEXT,
    dependencies TEXT DEFAULT '[]',
    blocked_by TEXT DEFAULT '[]',
    input_data TEXT DEFAULT '{}',
    output_data TEXT,
    deadline TEXT,
    estimated_duration_ms INTEGER DEFAULT 0,
    actual_duration_ms INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    tags TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_collab_tasks_org ON collaboration_tasks(org_id, status);
  CREATE INDEX IF NOT EXISTS idx_collab_tasks_assignee ON collaboration_tasks(org_id, assigned_to, status);
  CREATE INDEX IF NOT EXISTS idx_collab_tasks_workflow ON collaboration_tasks(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_collab_tasks_priority ON collaboration_tasks(org_id, priority, status);

  CREATE TABLE IF NOT EXISTS agent_messages (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    from_employee TEXT NOT NULL,
    to_employee TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    subject TEXT NOT NULL,
    body TEXT,
    structured_payload TEXT,
    reference_id TEXT,
    requires_response INTEGER DEFAULT 0,
    response_deadline TEXT,
    status TEXT DEFAULT 'sent',
    thread_id TEXT,
    created_at TEXT NOT NULL,
    read_at TEXT,
    actioned_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_agent_msg_inbox ON agent_messages(org_id, to_employee, status);
  CREATE INDEX IF NOT EXISTS idx_agent_msg_thread ON agent_messages(thread_id);
  CREATE INDEX IF NOT EXISTS idx_agent_msg_ref ON agent_messages(reference_id);

  CREATE TABLE IF NOT EXISTS collaboration_workflows (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    trigger_config TEXT DEFAULT '{}',
    steps TEXT DEFAULT '[]',
    status TEXT DEFAULT 'draft',
    initiated_by TEXT NOT NULL,
    context TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_collab_wf_org ON collaboration_workflows(org_id, status);
  CREATE INDEX IF NOT EXISTS idx_collab_wf_initiator ON collaboration_workflows(initiated_by);

  CREATE TABLE IF NOT EXISTS collaboration_events (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    category TEXT NOT NULL,
    event_name TEXT NOT NULL,
    emitted_by TEXT NOT NULL,
    payload TEXT DEFAULT '{}',
    subscribers_notified TEXT DEFAULT '[]',
    workflows_triggered TEXT DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_collab_events_org ON collaboration_events(org_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_collab_events_name ON collaboration_events(org_id, event_name);

  CREATE TABLE IF NOT EXISTS event_subscriptions (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    employee_id TEXT NOT NULL,
    event_pattern TEXT NOT NULL,
    action TEXT NOT NULL,
    action_config TEXT DEFAULT '{}',
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_event_subs_org ON event_subscriptions(org_id, active);
  CREATE INDEX IF NOT EXISTS idx_event_subs_emp ON event_subscriptions(org_id, employee_id);

  CREATE TABLE IF NOT EXISTS employee_capabilities (
    employee_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    role TEXT NOT NULL,
    display_name TEXT NOT NULL,
    capabilities TEXT DEFAULT '[]',
    current_load REAL DEFAULT 0,
    max_concurrent_tasks INTEGER DEFAULT 5,
    status TEXT DEFAULT 'available',
    specializations TEXT DEFAULT '{}',
    avg_task_completion_ms INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 1.0,
    last_active TEXT,
    PRIMARY KEY (employee_id, org_id)
  );

  CREATE INDEX IF NOT EXISTS idx_emp_cap_role ON employee_capabilities(org_id, role, status);
`;

// ══════════════════════════════════════════════════════
// 9. ROUTE HANDLER
// ══════════════════════════════════════════════════════

export async function handleCollaboration(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const method = request.method;
  const subPath = path.replace('/api/collab/', '');

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const taskQueue = new TaskQueueEngine(env);
    const messaging = new InterAgentMessaging(env);
    const workflows = new WorkflowEngine(env);
    const delegation = new DelegationEngine(env);
    const eventBus = new EventBus(env);

    // ── Task Queue ──
    if (subPath === 'tasks' && method === 'POST') {
      const body = await request.json() as any;
      const task = await taskQueue.enqueue(body);
      return json(task, 201);
    }

    if (subPath === 'tasks/dequeue' && method === 'POST') {
      const body = await request.json() as any;
      const task = await taskQueue.dequeue(body.employee_id, body.org_id || 'default-org');
      if (!task) return json({ message: 'Queue empty' }, 204);
      return json(task);
    }

    if (subPath.match(/^tasks\/[^/]+\/complete$/) && method === 'POST') {
      const taskId = subPath.replace('tasks/', '').replace('/complete', '');
      const body = await request.json() as any;
      const result = await taskQueue.complete(taskId, body.output || {});

      // If part of a workflow, advance it
      if (result.task.workflow_id && result.task.workflow_step_id) {
        await workflows.onStepTaskCompleted(result.task.workflow_id, result.task.workflow_step_id, body.output || {});
      }

      // Update assignee load
      await delegation.updateLoad(result.task.assigned_to, result.task.org_id);

      return json(result);
    }

    if (subPath.match(/^tasks\/[^/]+\/fail$/) && method === 'POST') {
      const taskId = subPath.replace('tasks/', '').replace('/fail', '');
      const body = await request.json() as any;
      const task = await taskQueue.fail(taskId, body.error || 'Unknown error');

      if (task.workflow_id && task.workflow_step_id && task.status === 'failed') {
        await workflows.onStepTaskFailed(task.workflow_id, task.workflow_step_id, body.error || 'Unknown error');
      }

      return json(task);
    }

    if (subPath.match(/^tasks\/[^/]+$/) && method === 'GET') {
      const taskId = subPath.replace('tasks/', '');
      const task = await taskQueue.getTask(taskId);
      if (!task) return json({ error: 'Task not found' }, 404);
      return json(task);
    }

    if (subPath === 'tasks/queue' && method === 'GET') {
      const url = new URL(request.url);
      const employeeId = url.searchParams.get('employee_id') || '';
      const orgId = url.searchParams.get('org_id') || 'default-org';
      const tasks = await taskQueue.getQueue(employeeId, orgId);
      return json({ tasks });
    }

    if (subPath === 'tasks/org' && method === 'GET') {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('org_id') || 'default-org';
      const status = url.searchParams.get('status') as QueuedTaskStatus | undefined;
      const tasks = await taskQueue.getOrgTasks(orgId, status || undefined);
      return json({ tasks });
    }

    // ── Messaging ──
    if (subPath === 'messages' && method === 'POST') {
      const body = await request.json() as any;
      const msg = await messaging.send(body);
      return json(msg, 201);
    }

    if (subPath === 'messages/broadcast' && method === 'POST') {
      const body = await request.json() as any;
      const msg = await messaging.broadcast(body);
      return json(msg, 201);
    }

    if (subPath === 'messages/inbox' && method === 'GET') {
      const url = new URL(request.url);
      const employeeId = url.searchParams.get('employee_id') || '';
      const orgId = url.searchParams.get('org_id') || 'default-org';
      const unreadOnly = url.searchParams.get('unread') === 'true';
      const messages = await messaging.getInbox(employeeId, orgId, unreadOnly);
      return json({ messages });
    }

    if (subPath.match(/^messages\/[^/]+\/read$/) && method === 'POST') {
      const msgId = subPath.replace('messages/', '').replace('/read', '');
      await messaging.markRead(msgId);
      return json({ success: true });
    }

    if (subPath.match(/^messages\/[^/]+\/reply$/) && method === 'POST') {
      const msgId = subPath.replace('messages/', '').replace('/reply', '');
      const body = await request.json() as any;
      const reply = await messaging.reply(msgId, { from_employee: body.from_employee, body: body.body, structured_payload: body.structured_payload });
      return json(reply, 201);
    }

    if (subPath.startsWith('messages/thread/') && method === 'GET') {
      const threadId = subPath.replace('messages/thread/', '');
      const messages = await messaging.getThread(threadId);
      return json({ messages });
    }

    // ── Workflows ──
    if (subPath === 'workflows' && method === 'POST') {
      const body = await request.json() as any;
      const wf = await workflows.create(body);
      return json(wf, 201);
    }

    if (subPath === 'workflows/templates' && method === 'GET') {
      return json({ templates: Object.entries(WORKFLOW_TEMPLATES).map(([key, tmpl]) => ({ key, ...tmpl })) });
    }

    if (subPath === 'workflows/from-template' && method === 'POST') {
      const body = await request.json() as any;
      const template = WORKFLOW_TEMPLATES[body.template_key];
      if (!template) return json({ error: 'Template not found' }, 404);

      const wf = await workflows.create({
        org_id: body.org_id || 'default-org',
        name: template.name,
        description: template.description,
        trigger: template.trigger,
        steps: template.steps,
        initiated_by: body.initiated_by || userId,
        context: body.context || {},
        auto_start: body.auto_start !== false,
      });
      return json(wf, 201);
    }

    if (subPath.match(/^workflows\/[^/]+$/) && method === 'GET') {
      const wfId = subPath.replace('workflows/', '');
      const wf = await workflows.getWorkflow(wfId);
      if (!wf) return json({ error: 'Workflow not found' }, 404);
      return json(wf);
    }

    if (subPath === 'workflows/list' && method === 'GET') {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('org_id') || 'default-org';
      const status = url.searchParams.get('status') as WorkflowStatus | undefined;
      const wfs = await workflows.listWorkflows(orgId, status || undefined);
      return json({ workflows: wfs });
    }

    // ── Delegation ──
    if (subPath === 'delegate' && method === 'POST') {
      const body = await request.json() as any;
      const result = await delegation.delegate(body);
      return json(result, 201);
    }

    if (subPath === 'team' && method === 'GET') {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('org_id') || 'default-org';
      const team = await delegation.getTeam(orgId);
      return json({ team });
    }

    if (subPath === 'team/register' && method === 'POST') {
      const body = await request.json() as any;
      const cap = await delegation.registerCapabilities(body);
      return json(cap, 201);
    }

    // ── Events ──
    if (subPath === 'events/emit' && method === 'POST') {
      const body = await request.json() as any;
      const event = await eventBus.emit(body);
      return json(event, 201);
    }

    if (subPath === 'events/subscribe' && method === 'POST') {
      const body = await request.json() as any;
      const sub = await eventBus.subscribe(body);
      return json(sub, 201);
    }

    if (subPath === 'events/subscriptions' && method === 'GET') {
      const url = new URL(request.url);
      const employeeId = url.searchParams.get('employee_id') || '';
      const orgId = url.searchParams.get('org_id') || 'default-org';
      const subs = await eventBus.getSubscriptions(employeeId, orgId);
      return json({ subscriptions: subs });
    }

    if (subPath === 'events/recent' && method === 'GET') {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('org_id') || 'default-org';
      const events = await eventBus.getRecentEvents(orgId);
      return json({ events });
    }

    return json({ error: 'Not Found', code: 'COLLAB_NOT_FOUND' }, 404);
  } catch (err: any) {
    return json({ error: err.message, code: 'COLLAB_ERROR' }, 500);
  }
}
