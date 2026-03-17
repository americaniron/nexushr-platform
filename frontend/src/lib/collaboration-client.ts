/**
 * NexusHR Multi-Agent Collaboration Client
 *
 * Dual-mode: Worker API when online, localStorage fallback offline.
 *
 * Covers: task queues, inter-agent messaging, workflow engine,
 * delegation, event bus, team management.
 */

import { useState, useEffect, useCallback } from 'react';

const API = '/api/collab';

// ══════════════════════════════════════════════════════
// TYPES (mirrors server)
// ══════════════════════════════════════════════════════

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
export type QueuedTaskStatus = 'queued' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'failed' | 'cancelled';
export type MessageType = 'request' | 'inform' | 'delegate' | 'escalate' | 'acknowledge' | 'query' | 'response' | 'broadcast';
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface QueuedTask {
  id: string; org_id: string; title: string; description: string;
  priority: TaskPriority; status: QueuedTaskStatus;
  assigned_to: string; created_by: string; delegated_from: string | null;
  workflow_id: string | null; dependencies: string[]; blocked_by: string[];
  input_data: Record<string, any>; output_data: Record<string, any> | null;
  deadline: string | null; estimated_duration_ms: number; actual_duration_ms: number;
  retry_count: number; tags: string[];
  created_at: string; started_at: string | null; completed_at: string | null;
}

export interface AgentMessage {
  id: string; org_id: string; from_employee: string; to_employee: string;
  type: MessageType; priority: string; subject: string; body: string;
  structured_payload: Record<string, any> | null; reference_id: string | null;
  requires_response: boolean; status: string; thread_id: string;
  created_at: string; read_at: string | null;
}

export interface Workflow {
  id: string; org_id: string; name: string; description: string;
  trigger: any; steps: WorkflowStep[]; status: WorkflowStatus;
  initiated_by: string; context: Record<string, any>;
  created_at: string; started_at: string | null; completed_at: string | null;
}

export interface WorkflowStep {
  id: string; name: string; description: string; assigned_to: string;
  status: string; depends_on: string[]; gate: string;
  task_template: any; task_id: string | null;
  started_at: string | null; completed_at: string | null; output: any;
}

export interface EmployeeCapability {
  employee_id: string; role: string; display_name: string;
  capabilities: string[]; current_load: number; max_concurrent_tasks: number;
  status: string; specializations: Record<string, number>;
  success_rate: number; last_active: string;
}

export interface CollaborationEvent {
  id: string; category: string; event_name: string; emitted_by: string;
  payload: Record<string, any>; subscribers_notified: string[];
  workflows_triggered: string[]; created_at: string;
}

export interface WorkflowTemplate {
  key: string; name: string; description: string; trigger: any; steps: any[];
}

// ══════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════

async function api<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

export const collabClient = {
  // Task Queue
  async createTask(params: any) { return api<QueuedTask>('/tasks', { method: 'POST', body: JSON.stringify(params) }); },
  async dequeue(employeeId: string, orgId: string) { return api<QueuedTask>('/tasks/dequeue', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, org_id: orgId }) }); },
  async completeTask(taskId: string, output: Record<string, any>) { return api<{ task: QueuedTask; unblocked: QueuedTask[] }>(`/tasks/${taskId}/complete`, { method: 'POST', body: JSON.stringify({ output }) }); },
  async failTask(taskId: string, error: string) { return api<QueuedTask>(`/tasks/${taskId}/fail`, { method: 'POST', body: JSON.stringify({ error }) }); },
  async getTask(taskId: string) { return api<QueuedTask>(`/tasks/${taskId}`); },
  async getQueue(employeeId: string, orgId: string) { return api<{ tasks: QueuedTask[] }>(`/tasks/queue?employee_id=${employeeId}&org_id=${orgId}`); },
  async getOrgTasks(orgId: string, status?: string) { return api<{ tasks: QueuedTask[] }>(`/tasks/org?org_id=${orgId}${status ? `&status=${status}` : ''}`); },

  // Messaging
  async sendMessage(params: any) { return api<AgentMessage>('/messages', { method: 'POST', body: JSON.stringify(params) }); },
  async broadcast(params: any) { return api<AgentMessage>('/messages/broadcast', { method: 'POST', body: JSON.stringify(params) }); },
  async getInbox(employeeId: string, orgId: string, unreadOnly?: boolean) { return api<{ messages: AgentMessage[] }>(`/messages/inbox?employee_id=${employeeId}&org_id=${orgId}${unreadOnly ? '&unread=true' : ''}`); },
  async markRead(messageId: string) { return api(`/messages/${messageId}/read`, { method: 'POST' }); },
  async replyMessage(messageId: string, params: any) { return api<AgentMessage>(`/messages/${messageId}/reply`, { method: 'POST', body: JSON.stringify(params) }); },
  async getThread(threadId: string) { return api<{ messages: AgentMessage[] }>(`/messages/thread/${threadId}`); },

  // Workflows
  async createWorkflow(params: any) { return api<Workflow>('/workflows', { method: 'POST', body: JSON.stringify(params) }); },
  async createFromTemplate(templateKey: string, orgId: string, initiatedBy: string, context?: Record<string, any>) {
    return api<Workflow>('/workflows/from-template', { method: 'POST', body: JSON.stringify({ template_key: templateKey, org_id: orgId, initiated_by: initiatedBy, context }) });
  },
  async getWorkflow(workflowId: string) { return api<Workflow>(`/workflows/${workflowId}`); },
  async listWorkflows(orgId: string, status?: string) { return api<{ workflows: Workflow[] }>(`/workflows/list?org_id=${orgId}${status ? `&status=${status}` : ''}`); },
  async getTemplates() { return api<{ templates: WorkflowTemplate[] }>('/workflows/templates'); },

  // Delegation
  async delegate(params: any) { return api<{ task: QueuedTask; delegated_to: string; reason: string }>('/delegate', { method: 'POST', body: JSON.stringify(params) }); },
  async getTeam(orgId: string) { return api<{ team: EmployeeCapability[] }>(`/team?org_id=${orgId}`); },
  async registerEmployee(params: any) { return api<EmployeeCapability>('/team/register', { method: 'POST', body: JSON.stringify(params) }); },

  // Events
  async emitEvent(params: any) { return api<CollaborationEvent>('/events/emit', { method: 'POST', body: JSON.stringify(params) }); },
  async subscribe(params: any) { return api<any>('/events/subscribe', { method: 'POST', body: JSON.stringify(params) }); },
  async getSubscriptions(employeeId: string, orgId: string) { return api<{ subscriptions: any[] }>(`/events/subscriptions?employee_id=${employeeId}&org_id=${orgId}`); },
  async getRecentEvents(orgId: string) { return api<{ events: CollaborationEvent[] }>(`/events/recent?org_id=${orgId}`); },
};

// ══════════════════════════════════════════════════════
// REACT HOOKS
// ══════════════════════════════════════════════════════

/** Hook: task queue for an AI employee */
export function useTaskQueue(employeeId: string, orgId: string) {
  const [tasks, setTasks] = useState<QueuedTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await collabClient.getQueue(employeeId, orgId);
    if (result) setTasks(result.tasks);
    setLoading(false);
  }, [employeeId, orgId]);

  const dequeue = useCallback(async () => {
    const task = await collabClient.dequeue(employeeId, orgId);
    if (task) { await refresh(); }
    return task;
  }, [employeeId, orgId, refresh]);

  const complete = useCallback(async (taskId: string, output: Record<string, any>) => {
    const result = await collabClient.completeTask(taskId, output);
    await refresh();
    return result;
  }, [refresh]);

  useEffect(() => { refresh(); }, [refresh]);
  return { tasks, loading, dequeue, complete, refresh };
}

/** Hook: org-wide task board */
export function useOrgTasks(orgId: string) {
  const [tasks, setTasks] = useState<QueuedTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (status?: string) => {
    setLoading(true);
    const result = await collabClient.getOrgTasks(orgId, status);
    if (result) setTasks(result.tasks);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { tasks, loading, refresh };
}

/** Hook: inter-agent messaging inbox */
export function useAgentInbox(employeeId: string, orgId: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [all, unread] = await Promise.all([
      collabClient.getInbox(employeeId, orgId),
      collabClient.getInbox(employeeId, orgId, true),
    ]);
    if (all) setMessages(all.messages);
    if (unread) setUnreadCount(unread.messages.length);
    setLoading(false);
  }, [employeeId, orgId]);

  const send = useCallback(async (to: string, type: MessageType, subject: string, body: string, payload?: any) => {
    await collabClient.sendMessage({ org_id: orgId, from_employee: employeeId, to_employee: to, type, priority: 'normal', subject, body, structured_payload: payload });
    await refresh();
  }, [employeeId, orgId, refresh]);

  const reply = useCallback(async (messageId: string, body: string) => {
    await collabClient.replyMessage(messageId, { from_employee: employeeId, body });
    await refresh();
  }, [employeeId, refresh]);

  useEffect(() => { refresh(); }, [refresh]);
  return { messages, unreadCount, loading, send, reply, refresh };
}

/** Hook: workflow management */
export function useWorkflows(orgId: string) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [wfs, tmpls] = await Promise.all([
      collabClient.listWorkflows(orgId),
      collabClient.getTemplates(),
    ]);
    if (wfs) setWorkflows(wfs.workflows);
    if (tmpls) setTemplates(tmpls.templates);
    setLoading(false);
  }, [orgId]);

  const launchFromTemplate = useCallback(async (templateKey: string, initiatedBy: string, context?: Record<string, any>) => {
    const wf = await collabClient.createFromTemplate(templateKey, orgId, initiatedBy, context);
    await refresh();
    return wf;
  }, [orgId, refresh]);

  useEffect(() => { refresh(); }, [refresh]);
  return { workflows, templates, loading, launchFromTemplate, refresh };
}

/** Hook: team capabilities and delegation */
export function useTeam(orgId: string) {
  const [team, setTeam] = useState<EmployeeCapability[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await collabClient.getTeam(orgId);
    if (result) setTeam(result.team);
    setLoading(false);
  }, [orgId]);

  const delegate = useCallback(async (params: { from_employee: string; task_title: string; task_description: string; required_capabilities?: string[]; preferred_employee?: string; priority?: TaskPriority }) => {
    return collabClient.delegate({ ...params, org_id: orgId });
  }, [orgId]);

  const register = useCallback(async (params: { employee_id: string; role: string; display_name: string; capabilities: string[]; max_concurrent_tasks?: number; specializations?: Record<string, number> }) => {
    const result = await collabClient.registerEmployee({ ...params, org_id: orgId });
    await refresh();
    return result;
  }, [orgId, refresh]);

  useEffect(() => { refresh(); }, [refresh]);
  return { team, loading, delegate, register, refresh };
}

/** Hook: event bus */
export function useEventBus(orgId: string) {
  const [events, setEvents] = useState<CollaborationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await collabClient.getRecentEvents(orgId);
    if (result) setEvents(result.events);
    setLoading(false);
  }, [orgId]);

  const emit = useCallback(async (category: string, eventName: string, emittedBy: string, payload: Record<string, any>) => {
    const event = await collabClient.emitEvent({ org_id: orgId, category, event_name: eventName, emitted_by: emittedBy, payload });
    await refresh();
    return event;
  }, [orgId, refresh]);

  const subscribe = useCallback(async (employeeId: string, pattern: string, action: 'notify' | 'trigger_workflow' | 'execute_task', config?: Record<string, any>) => {
    return collabClient.subscribe({ org_id: orgId, employee_id: employeeId, event_pattern: pattern, action, action_config: config });
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { events, loading, emit, subscribe, refresh };
}
