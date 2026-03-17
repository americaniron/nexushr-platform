/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Orchestration Client — Frontend task management with local fallback
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. Worker-backed task queue when connected
 * 2. Local task tracking in localStorage when offline
 * 3. Real-time event polling with adaptive intervals
 * 4. Optimistic UI updates for immediate feedback
 * 5. Circuit breaker awareness (shows degraded state)
 */

import { isWorkerConnected } from './worker-api';

// ══════════════════════════════════════════════════════
// Types (mirror Worker types)
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
  parentTaskId?: string;
  workflowId?: string;
  dependencies: string[];
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
  maxRetries: number;
  deadline?: string;
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
  name: string;
  description: string;
  type: WorkflowType;
  status: TaskStatus;
  taskIds: string[];
  employeeIds: string[];
  createdAt: string;
  completedAt?: string;
}

export interface AgentMessage {
  id: string;
  workflowId: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  type: string;
  subject: string;
  payload: Record<string, any>;
  priority: TaskPriority;
  read: boolean;
  createdAt: string;
}

export interface OrchestratorEvent {
  id: string;
  type: string;
  taskId?: string;
  workflowId?: string;
  employeeId?: string;
  data: Record<string, any>;
  timestamp: string;
}

export interface DashboardStats {
  tasks: {
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    total: number;
    active: number;
    completed: number;
    failed: number;
  };
  workflows: { total: number };
  performance: { avgExecutionMs: number };
  employeeLoad: Record<string, number>;
  agentMessages: number;
}

// ══════════════════════════════════════════════════════
// Local Storage Fallback
// ══════════════════════════════════════════════════════

const LOCAL_TASKS_KEY = 'nexushr_tasks';
const LOCAL_WORKFLOWS_KEY = 'nexushr_workflows';
const LOCAL_MESSAGES_KEY = 'nexushr_agent_messages';

function getLocalTasks(): Task[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_TASKS_KEY) || '[]'); } catch { return []; }
}

function saveLocalTasks(tasks: Task[]): void {
  localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks.slice(-200))); // cap at 200
}

function getLocalWorkflows(): Workflow[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_WORKFLOWS_KEY) || '[]'); } catch { return []; }
}

function saveLocalWorkflows(workflows: Workflow[]): void {
  localStorage.setItem(LOCAL_WORKFLOWS_KEY, JSON.stringify(workflows.slice(-50)));
}

function getLocalMessages(): AgentMessage[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '[]'); } catch { return []; }
}

function saveLocalMessages(messages: AgentMessage[]): void {
  localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages.slice(-500)));
}

function generateLocalId(prefix: string): string {
  return `${prefix}_local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ══════════════════════════════════════════════════════
// Orchestration Client API
// ══════════════════════════════════════════════════════

async function workerFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  return res.json();
}

export const OrchestrationClient = {

  // ── Initialize schema (call once on first setup) ──
  async initSchema(): Promise<void> {
    if (!isWorkerConnected()) return;
    await workerFetch('/api/orchestration/init', { method: 'POST' });
  },

  // ── Tasks ──
  async createTask(params: {
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
  }): Promise<Task> {
    if (isWorkerConnected()) {
      const res = await workerFetch('/api/orchestration/tasks', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (res.success) return res.data.task;
    }

    // Local fallback
    const task: Task = {
      id: generateLocalId('task'),
      userId: 'local',
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
      maxRetries: 3,
      deadline: params.deadline,
      tags: params.tags || [],
      stepsTotal: 1,
      stepsCompleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const tasks = getLocalTasks();
    tasks.push(task);
    saveLocalTasks(tasks);
    return task;
  },

  async listTasks(filters?: {
    status?: TaskStatus | TaskStatus[];
    employeeId?: string;
    workflowId?: string;
  }): Promise<{ tasks: Task[]; total: number }> {
    if (isWorkerConnected()) {
      const params = new URLSearchParams();
      if (filters?.status) {
        params.set('status', Array.isArray(filters.status) ? filters.status.join(',') : filters.status);
      }
      if (filters?.employeeId) params.set('employeeId', filters.employeeId);
      if (filters?.workflowId) params.set('workflowId', filters.workflowId);
      const res = await workerFetch(`/api/orchestration/tasks?${params}`);
      if (res.success) return res.data;
    }

    // Local fallback
    let tasks = getLocalTasks();
    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      tasks = tasks.filter(t => statuses.includes(t.status));
    }
    if (filters?.employeeId) tasks = tasks.filter(t => t.employeeId === filters.employeeId);
    if (filters?.workflowId) tasks = tasks.filter(t => t.workflowId === filters.workflowId);
    return { tasks, total: tasks.length };
  },

  async getTask(taskId: string): Promise<Task | null> {
    if (isWorkerConnected()) {
      const res = await workerFetch(`/api/orchestration/tasks/${taskId}`);
      if (res.success) return res.data.task;
    }
    return getLocalTasks().find(t => t.id === taskId) || null;
  },

  async transitionTask(taskId: string, status: TaskStatus, data?: Record<string, any>): Promise<Task> {
    if (isWorkerConnected()) {
      const res = await workerFetch(`/api/orchestration/tasks/${taskId}/transition`, {
        method: 'POST', body: JSON.stringify({ status, ...data }),
      });
      if (res.success) return res.data.task;
    }

    // Local fallback
    const tasks = getLocalTasks();
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      tasks[idx].status = status;
      tasks[idx].updatedAt = new Date().toISOString();
      if (status === 'completed') {
        tasks[idx].completedAt = new Date().toISOString();
        tasks[idx].stepsCompleted = tasks[idx].stepsTotal;
        if (data?.output) tasks[idx].output = data.output;
      }
      if (status === 'failed' && data?.error) tasks[idx].error = data.error;
      saveLocalTasks(tasks);
      return tasks[idx];
    }
    throw new Error('Task not found');
  },

  async cancelTask(taskId: string): Promise<Task> {
    return this.transitionTask(taskId, 'cancelled');
  },

  // ── Workflows ──
  async createWorkflow(params: {
    name: string;
    description: string;
    type: WorkflowType;
    employeeIds: string[];
    task: string;
  }): Promise<{ workflow: Workflow; tasks: Task[] }> {
    if (isWorkerConnected()) {
      const res = await workerFetch('/api/orchestration/workflows', {
        method: 'POST', body: JSON.stringify(params),
      });
      if (res.success) return res.data;
    }

    // Local fallback — create simple workflow representation
    const workflow: Workflow = {
      id: generateLocalId('wf'),
      name: params.name,
      description: params.description,
      type: params.type,
      status: 'created',
      taskIds: [],
      employeeIds: params.employeeIds,
      createdAt: new Date().toISOString(),
    };

    const tasks: Task[] = params.employeeIds.map((empId, i) => ({
      id: generateLocalId('task'),
      userId: 'local',
      title: `${params.name} — Step ${i + 1}`,
      description: params.task,
      employeeId: empId,
      status: 'created' as TaskStatus,
      priority: 'normal' as TaskPriority,
      workflowId: workflow.id,
      dependencies: [],
      input: { originalTask: params.task },
      retryCount: 0,
      maxRetries: 3,
      tags: [],
      stepsTotal: 1,
      stepsCompleted: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    workflow.taskIds = tasks.map(t => t.id);
    const allTasks = getLocalTasks();
    allTasks.push(...tasks);
    saveLocalTasks(allTasks);

    const workflows = getLocalWorkflows();
    workflows.push(workflow);
    saveLocalWorkflows(workflows);

    return { workflow, tasks };
  },

  async listWorkflows(): Promise<Workflow[]> {
    if (isWorkerConnected()) {
      const res = await workerFetch('/api/orchestration/workflows');
      if (res.success) return res.data.workflows;
    }
    return getLocalWorkflows();
  },

  async getWorkflow(workflowId: string): Promise<{ workflow: Workflow; tasks: Task[] } | null> {
    if (isWorkerConnected()) {
      const res = await workerFetch(`/api/orchestration/workflows/${workflowId}`);
      if (res.success) return res.data;
    }
    const workflow = getLocalWorkflows().find(w => w.id === workflowId);
    if (!workflow) return null;
    const tasks = getLocalTasks().filter(t => t.workflowId === workflowId);
    return { workflow, tasks };
  },

  // ── Inter-Agent Messaging ──
  async sendMessage(params: {
    workflowId: string;
    fromEmployeeId: string;
    toEmployeeId: string;
    type: string;
    subject: string;
    payload?: Record<string, any>;
  }): Promise<AgentMessage> {
    if (isWorkerConnected()) {
      const res = await workerFetch('/api/orchestration/messages', {
        method: 'POST', body: JSON.stringify(params),
      });
      if (res.success) return res.data.message;
    }

    const msg: AgentMessage = {
      id: generateLocalId('msg'),
      workflowId: params.workflowId,
      fromEmployeeId: params.fromEmployeeId,
      toEmployeeId: params.toEmployeeId,
      type: params.type,
      subject: params.subject,
      payload: params.payload || {},
      priority: 'normal',
      read: false,
      createdAt: new Date().toISOString(),
    };
    const messages = getLocalMessages();
    messages.push(msg);
    saveLocalMessages(messages);
    return msg;
  },

  async getMessages(params?: { workflowId?: string; employeeId?: string }): Promise<AgentMessage[]> {
    if (isWorkerConnected()) {
      const qp = new URLSearchParams();
      if (params?.workflowId) qp.set('workflowId', params.workflowId);
      if (params?.employeeId) qp.set('employeeId', params.employeeId);
      const res = await workerFetch(`/api/orchestration/messages?${qp}`);
      if (res.success) return res.data.messages;
    }
    let messages = getLocalMessages();
    if (params?.workflowId) messages = messages.filter(m => m.workflowId === params.workflowId);
    if (params?.employeeId) messages = messages.filter(m => m.toEmployeeId === params.employeeId || m.toEmployeeId === '*');
    return messages;
  },

  // ── Dashboard Stats ──
  async getStats(): Promise<DashboardStats> {
    if (isWorkerConnected()) {
      const res = await workerFetch('/api/orchestration/stats');
      if (res.success) return res.data;
    }

    // Local stats
    const tasks = getLocalTasks();
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const employeeLoad: Record<string, number> = {};

    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (!['completed', 'cancelled', 'failed'].includes(t.status)) {
        byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      }
      employeeLoad[t.employeeId] = (employeeLoad[t.employeeId] || 0) + 1;
    }

    return {
      tasks: {
        byStatus, byPriority, total: tasks.length,
        active: (byStatus['in_progress'] || 0) + (byStatus['queued'] || 0),
        completed: byStatus['completed'] || 0,
        failed: byStatus['failed'] || 0,
      },
      workflows: { total: getLocalWorkflows().length },
      performance: { avgExecutionMs: 0 },
      employeeLoad,
      agentMessages: getLocalMessages().length,
    };
  },

  // ── Event Polling ──
  async pollEvents(since?: string): Promise<{ events: OrchestratorEvent[]; nextPollMs: number }> {
    if (isWorkerConnected()) {
      const params = since ? `?since=${since}` : '';
      const res = await workerFetch(`/api/orchestration/events${params}`);
      if (res.success) return res.data;
    }
    return { events: [], nextPollMs: 5000 };
  },
};

// ══════════════════════════════════════════════════════
// Event Poller — Auto-polling with adaptive intervals
// ══════════════════════════════════════════════════════

export class EventPoller {
  private interval: ReturnType<typeof setTimeout> | null = null;
  private lastTimestamp: string = new Date().toISOString();
  private callbacks: ((event: OrchestratorEvent) => void)[] = [];
  private pollMs: number = 5000;

  subscribe(callback: (event: OrchestratorEvent) => void): () => void {
    this.callbacks.push(callback);
    if (this.callbacks.length === 1) this.start();
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
      if (this.callbacks.length === 0) this.stop();
    };
  }

  private async poll(): Promise<void> {
    try {
      const { events, nextPollMs } = await OrchestrationClient.pollEvents(this.lastTimestamp);
      this.pollMs = nextPollMs;

      for (const event of events) {
        this.lastTimestamp = event.timestamp;
        for (const cb of this.callbacks) cb(event);
      }
    } catch {
      this.pollMs = 10000; // slow down on errors
    }

    this.interval = setTimeout(() => this.poll(), this.pollMs);
  }

  private start(): void {
    this.poll();
  }

  stop(): void {
    if (this.interval) clearTimeout(this.interval);
    this.interval = null;
  }
}

// Singleton poller
export const eventPoller = new EventPoller();
