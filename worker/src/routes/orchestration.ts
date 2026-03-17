/**
 * Orchestration API Routes — Task queue, workflows, messaging, circuit breakers
 */
import type { Env } from '../index';
import { json, generateId, parseBody } from '../lib/helpers';
import {
  TaskQueue, WorkflowOrchestrator, AgentMessaging, ORCHESTRATION_SCHEMA,
  type TaskStatus, type TaskPriority, type WorkflowType,
} from '../lib/orchestration';

// Singleton orchestrators per request (Worker is stateless, but within a request we reuse)
function getOrchestrator(env: Env): WorkflowOrchestrator {
  return new WorkflowOrchestrator(env);
}

export async function handleOrchestration(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const method = request.method;

  // ── Schema initialization ──
  if (path === '/api/orchestration/init' && method === 'POST') {
    return handleInitSchema(env);
  }

  // ── Task CRUD ──
  if (path === '/api/orchestration/tasks' && method === 'POST') {
    return handleCreateTask(request, env, userId);
  }
  if (path === '/api/orchestration/tasks' && method === 'GET') {
    return handleListTasks(request, env, userId);
  }
  if (path.match(/^\/api\/orchestration\/tasks\/[^/]+$/) && method === 'GET') {
    const taskId = path.split('/').pop()!;
    return handleGetTask(env, userId, taskId);
  }
  if (path.match(/^\/api\/orchestration\/tasks\/[^/]+\/transition$/) && method === 'POST') {
    const taskId = path.split('/')[4];
    return handleTransitionTask(request, env, userId, taskId);
  }
  if (path.match(/^\/api\/orchestration\/tasks\/[^/]+\/cancel$/) && method === 'POST') {
    const taskId = path.split('/')[4];
    return handleCancelTask(env, userId, taskId);
  }
  if (path.match(/^\/api\/orchestration\/tasks\/[^/]+\/execute$/) && method === 'POST') {
    const taskId = path.split('/')[4];
    return handleExecuteTask(request, env, userId, taskId);
  }

  // ── Task queue operations ──
  if (path === '/api/orchestration/queue/next' && method === 'POST') {
    return handleDequeue(request, env, userId);
  }

  // ── Workflow CRUD ──
  if (path === '/api/orchestration/workflows' && method === 'POST') {
    return handleCreateWorkflow(request, env, userId);
  }
  if (path === '/api/orchestration/workflows' && method === 'GET') {
    return handleListWorkflows(env, userId);
  }
  if (path.match(/^\/api\/orchestration\/workflows\/[^/]+$/) && method === 'GET') {
    const workflowId = path.split('/').pop()!;
    return handleGetWorkflow(env, userId, workflowId);
  }

  // ── Inter-agent messaging ──
  if (path === '/api/orchestration/messages' && method === 'POST') {
    return handleSendMessage(request, env, userId);
  }
  if (path === '/api/orchestration/messages' && method === 'GET') {
    return handleGetMessages(request, env, userId);
  }
  if (path.match(/^\/api\/orchestration\/messages\/[^/]+\/read$/) && method === 'POST') {
    const messageId = path.split('/')[4];
    return handleMarkRead(env, messageId);
  }
  if (path.match(/^\/api\/orchestration\/messages\/conversation\/[^/]+$/) && method === 'GET') {
    const workflowId = path.split('/').pop()!;
    return handleGetConversation(env, workflowId);
  }

  // ── Circuit breaker status ──
  if (path === '/api/orchestration/circuit-breakers' && method === 'GET') {
    return handleCircuitBreakerStatus(env);
  }

  // ── Events / SSE ──
  if (path === '/api/orchestration/events' && method === 'GET') {
    return handleEventStream(request, env, userId);
  }

  // ── Dashboard stats ──
  if (path === '/api/orchestration/stats' && method === 'GET') {
    return handleDashboardStats(env, userId);
  }

  return json({ error: 'Not found' }, 404);
}

// ── Schema Init ──
async function handleInitSchema(env: Env): Promise<Response> {
  const results: string[] = [];
  for (const sql of ORCHESTRATION_SCHEMA) {
    try {
      await env.DB.prepare(sql).run();
      results.push(`OK: ${sql.slice(0, 60)}...`);
    } catch (err: any) {
      results.push(`WARN: ${err.message}`);
    }
  }
  return json({ success: true, results });
}

// ── Task handlers ──
async function handleCreateTask(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<any>(request);
  const queue = new TaskQueue(env);
  const task = await queue.createTask({
    userId,
    title: body.title || 'Untitled task',
    description: body.description || '',
    employeeId: body.employeeId,
    priority: body.priority || 'normal',
    parentTaskId: body.parentTaskId,
    workflowId: body.workflowId,
    dependencies: body.dependencies || [],
    input: body.input || {},
    deadline: body.deadline,
    tags: body.tags || [],
    maxRetries: body.maxRetries,
    stepsTotal: body.stepsTotal,
  });
  const events = queue.flushEvents();
  return json({ success: true, data: { task, events } });
}

async function handleListTasks(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const queue = new TaskQueue(env);
  const statusParam = url.searchParams.get('status');
  const statuses = statusParam ? statusParam.split(',') as TaskStatus[] : undefined;
  const result = await queue.listTasks(userId, {
    status: statuses,
    employeeId: url.searchParams.get('employeeId') || undefined,
    workflowId: url.searchParams.get('workflowId') || undefined,
    priority: (url.searchParams.get('priority') as TaskPriority) || undefined,
    limit: parseInt(url.searchParams.get('limit') || '50'),
    offset: parseInt(url.searchParams.get('offset') || '0'),
  });
  return json({ success: true, data: result });
}

async function handleGetTask(env: Env, userId: string, taskId: string): Promise<Response> {
  const queue = new TaskQueue(env);
  const task = await queue.getTask(taskId);
  if (!task) return json({ error: 'Task not found' }, 404);
  if (task.userId !== userId) return json({ error: 'Forbidden' }, 403);
  return json({ success: true, data: { task } });
}

async function handleTransitionTask(request: Request, env: Env, userId: string, taskId: string): Promise<Response> {
  const body = await parseBody<{ status: TaskStatus; output?: any; error?: string; stepsCompleted?: number }>(request);
  const queue = new TaskQueue(env);
  const task = await queue.transitionTask(taskId, body.status, {
    output: body.output, error: body.error, stepsCompleted: body.stepsCompleted,
  });
  const events = queue.flushEvents();
  return json({ success: true, data: { task, events } });
}

async function handleCancelTask(env: Env, userId: string, taskId: string): Promise<Response> {
  const queue = new TaskQueue(env);
  const task = await queue.cancelTask(taskId);
  return json({ success: true, data: { task } });
}

async function handleExecuteTask(request: Request, env: Env, userId: string, taskId: string): Promise<Response> {
  const orchestrator = getOrchestrator(env);
  const queue = orchestrator.getQueue();
  const task = await queue.getTask(taskId);
  if (!task) return json({ error: 'Task not found' }, 404);
  if (task.userId !== userId) return json({ error: 'Forbidden' }, 403);

  // Simple executor — generates result based on employee role
  const result = await orchestrator.executeTask(task, async (t) => {
    // In a real system, this would call the LLM pipeline
    // For now, return a structured result showing the execution happened
    return {
      taskId: t.id,
      employeeId: t.employeeId,
      completedAt: new Date().toISOString(),
      summary: `Task "${t.title}" executed by ${t.employeeId}`,
      input: t.input,
    };
  });

  const events = queue.flushEvents();
  return json({ success: true, data: { task: result, events } });
}

async function handleDequeue(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ employeeId?: string }>(request);
  const queue = new TaskQueue(env);
  const task = await queue.dequeue(userId, body.employeeId);
  return json({ success: true, data: { task } });
}

// ── Workflow handlers ──
async function handleCreateWorkflow(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<any>(request);
  const orchestrator = getOrchestrator(env);
  const result = await orchestrator.createWorkflow({
    userId,
    name: body.name,
    description: body.description || '',
    type: body.type || 'sequential',
    employeeIds: body.employeeIds || [],
    task: body.task,
    config: body.config || {},
  });
  return json({ success: true, data: result });
}

async function handleListWorkflows(env: Env, userId: string): Promise<Response> {
  const orchestrator = getOrchestrator(env);
  const workflows = await orchestrator.listWorkflows(userId);
  return json({ success: true, data: { workflows } });
}

async function handleGetWorkflow(env: Env, userId: string, workflowId: string): Promise<Response> {
  const orchestrator = getOrchestrator(env);
  const result = await orchestrator.getWorkflow(workflowId);
  if (!result) return json({ error: 'Workflow not found' }, 404);
  if (result.workflow.userId !== userId) return json({ error: 'Forbidden' }, 403);
  return json({ success: true, data: result });
}

// ── Messaging handlers ──
async function handleSendMessage(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<any>(request);
  const messaging = new AgentMessaging(env);
  const msg = await messaging.sendMessage({
    workflowId: body.workflowId,
    fromEmployeeId: body.fromEmployeeId,
    toEmployeeId: body.toEmployeeId,
    type: body.type || 'data_share',
    subject: body.subject,
    payload: body.payload || {},
    replyToId: body.replyToId,
    priority: body.priority,
  });
  return json({ success: true, data: { message: msg } });
}

async function handleGetMessages(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const messaging = new AgentMessaging(env);
  const messages = await messaging.getMessages({
    workflowId: url.searchParams.get('workflowId') || undefined,
    employeeId: url.searchParams.get('employeeId') || undefined,
    unreadOnly: url.searchParams.get('unreadOnly') === 'true',
    limit: parseInt(url.searchParams.get('limit') || '50'),
  });
  return json({ success: true, data: { messages } });
}

async function handleMarkRead(env: Env, messageId: string): Promise<Response> {
  const messaging = new AgentMessaging(env);
  await messaging.markRead(messageId);
  return json({ success: true });
}

async function handleGetConversation(env: Env, workflowId: string): Promise<Response> {
  const messaging = new AgentMessaging(env);
  const messages = await messaging.getConversation(workflowId);
  return json({ success: true, data: { messages } });
}

// ── Circuit Breaker ──
async function handleCircuitBreakerStatus(env: Env): Promise<Response> {
  const orchestrator = getOrchestrator(env);
  return json({
    success: true,
    data: {
      breakers: orchestrator.getCircuitBreakerStatuses(),
      description: 'Circuit breakers protect LLM API calls. States: closed (healthy), open (failing, rejecting calls), half_open (testing recovery)',
    },
  });
}

// ── SSE Event Stream ──
async function handleEventStream(request: Request, env: Env, userId: string): Promise<Response> {
  // Server-Sent Events endpoint for real-time updates
  // In Cloudflare Workers, we use polling with long-poll simulation via KV
  // True SSE would require Durable Objects — this is a polling fallback
  const url = new URL(request.url);
  const since = url.searchParams.get('since') || new Date(Date.now() - 60000).toISOString();

  // Fetch recent events from KV cache
  const eventsKey = `events:${userId}`;
  const cached = await env.CACHE.get(eventsKey, 'json') as any[];
  const events = (cached || []).filter((e: any) => e.timestamp > since);

  return json({
    success: true,
    data: {
      events,
      nextPollMs: events.length > 0 ? 1000 : 5000, // poll faster when there are events
    },
  });
}

// ── Dashboard Stats ──
async function handleDashboardStats(env: Env, userId: string): Promise<Response> {
  const results = await env.DB.batch([
    env.DB.prepare(`SELECT status, COUNT(*) as count FROM orchestration_tasks WHERE user_id = ? GROUP BY status`).bind(userId),
    env.DB.prepare(`SELECT priority, COUNT(*) as count FROM orchestration_tasks WHERE user_id = ? AND status NOT IN ('completed', 'cancelled', 'failed') GROUP BY priority`).bind(userId),
    env.DB.prepare(`SELECT COUNT(*) as count FROM orchestration_workflows WHERE user_id = ?`).bind(userId),
    env.DB.prepare(`SELECT AVG(execution_time_ms) as avg_ms FROM orchestration_tasks WHERE user_id = ? AND execution_time_ms IS NOT NULL`).bind(userId),
    env.DB.prepare(`SELECT employee_id, COUNT(*) as count FROM orchestration_tasks WHERE user_id = ? GROUP BY employee_id ORDER BY count DESC LIMIT 10`).bind(userId),
    env.DB.prepare(`SELECT COUNT(*) as count FROM agent_messages WHERE workflow_id IN (SELECT id FROM orchestration_workflows WHERE user_id = ?)`).bind(userId),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of results[0].results || []) {
    statusCounts[(row as any).status] = (row as any).count;
  }

  const priorityCounts: Record<string, number> = {};
  for (const row of results[1].results || []) {
    priorityCounts[(row as any).priority] = (row as any).count;
  }

  const employeeLoad: Record<string, number> = {};
  for (const row of results[4].results || []) {
    employeeLoad[(row as any).employee_id] = (row as any).count;
  }

  return json({
    success: true,
    data: {
      tasks: {
        byStatus: statusCounts,
        byPriority: priorityCounts,
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        active: (statusCounts['in_progress'] || 0) + (statusCounts['queued'] || 0) + (statusCounts['assigned'] || 0),
        completed: statusCounts['completed'] || 0,
        failed: statusCounts['failed'] || 0,
      },
      workflows: {
        total: (results[2].results?.[0] as any)?.count || 0,
      },
      performance: {
        avgExecutionMs: Math.round((results[3].results?.[0] as any)?.avg_ms || 0),
      },
      employeeLoad,
      agentMessages: (results[5].results?.[0] as any)?.count || 0,
    },
  });
}
