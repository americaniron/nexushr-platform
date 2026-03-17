/**
 * Enhanced Employee Engine — Dual-mode storage (localStorage + D1 sync)
 * Provides task execution, inter-employee communication, dynamic metrics,
 * personality tuning, and onboarding — works offline, syncs when Worker is connected.
 */
import { isWorkerConnected, WorkerEmployees } from './worker-api';
import type {
  TaskPipeline, TaskExecutionResult, InterEmployeeMessage,
  EmployeeMetrics, PersonalityConfig, OnboardingContext,
} from '../data/types';

const STORAGE_KEYS = {
  TASK_HISTORY: 'nexushr_task_history',
  MESSAGES: 'nexushr_emp_messages',
  METRICS: 'nexushr_emp_metrics',
  PERSONALITY: 'nexushr_personality',
  ONBOARDING: 'nexushr_onboarding_ctx',
} as const;

// ── Helper ──
function loadJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function saveJSON(key: string, data: any): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ══════════════════════════════════════
// TASK EXECUTION PIPELINES (local fallback)
// ══════════════════════════════════════

const LOCAL_PIPELINES: Record<string, Record<string, TaskPipeline>> = {
  'software-engineer': {
    code_implementation: { steps: [
      { name: 'Analyze requirements', tool: 'llm_analyze', description: 'Parse the task into technical requirements' },
      { name: 'Generate code', tool: 'code_execute', description: 'Write implementation code' },
      { name: 'Review code', tool: 'code_review', description: 'Run static analysis and best practice checks' },
      { name: 'Run tests', tool: 'code_execute', description: 'Execute test suite' },
      { name: 'Document', tool: 'llm_generate', description: 'Generate code documentation' },
    ], estimatedTime: '5-15 min' },
    bug_fix: { steps: [
      { name: 'Reproduce issue', tool: 'code_execute', description: 'Attempt to reproduce the reported bug' },
      { name: 'Root cause analysis', tool: 'code_review', description: 'Analyze code for the root cause' },
      { name: 'Implement fix', tool: 'code_execute', description: 'Write and test the fix' },
      { name: 'Regression test', tool: 'code_execute', description: 'Ensure fix doesn\'t break existing functionality' },
    ], estimatedTime: '3-10 min' },
  },
  'marketing-manager': {
    campaign_launch: { steps: [
      { name: 'Audience analysis', tool: 'analytics_query', description: 'Analyze target audience segments' },
      { name: 'Content creation', tool: 'llm_generate', description: 'Draft campaign copy and assets' },
      { name: 'SEO optimization', tool: 'seo_audit', description: 'Optimize content for search' },
      { name: 'A/B variants', tool: 'ab_test', description: 'Create test variants' },
      { name: 'Schedule distribution', tool: 'social_post', description: 'Schedule across channels' },
    ], estimatedTime: '15-30 min' },
    content_creation: { steps: [
      { name: 'Research keywords', tool: 'seo_audit', description: 'Identify target keywords and topics' },
      { name: 'Draft content', tool: 'llm_generate', description: 'Write the content piece' },
      { name: 'SEO optimize', tool: 'seo_audit', description: 'Optimize meta tags, headings, keywords' },
      { name: 'Grammar check', tool: 'grammar_check', description: 'Review for grammar and style' },
    ], estimatedTime: '10-20 min' },
  },
  'sales-representative': {
    prospect_outreach: { steps: [
      { name: 'Research prospect', tool: 'crm_query', description: 'Gather prospect intelligence from CRM' },
      { name: 'Draft outreach', tool: 'llm_generate', description: 'Create personalized outreach sequence' },
      { name: 'Send initial email', tool: 'email_send', description: 'Send first touch email' },
      { name: 'Update CRM', tool: 'crm_update', description: 'Log activity in CRM' },
    ], estimatedTime: '5-10 min' },
    deal_analysis: { steps: [
      { name: 'Pull pipeline data', tool: 'crm_query', description: 'Get current pipeline status' },
      { name: 'Analyze deal health', tool: 'llm_analyze', description: 'Score deals by likelihood to close' },
      { name: 'Generate forecast', tool: 'report_generate', description: 'Create revenue forecast' },
    ], estimatedTime: '5-15 min' },
  },
  'customer-support': {
    ticket_resolution: { steps: [
      { name: 'Classify issue', tool: 'llm_analyze', description: 'Categorize and prioritize the ticket' },
      { name: 'Search knowledge base', tool: 'kb_search', description: 'Find relevant solutions' },
      { name: 'Draft response', tool: 'llm_generate', description: 'Write empathetic, solution-focused reply' },
      { name: 'Update ticket', tool: 'ticket_update', description: 'Update ticket status and notes' },
    ], estimatedTime: '2-5 min' },
  },
  'data-analyst': {
    data_analysis: { steps: [
      { name: 'Query data', tool: 'sql_query', description: 'Extract relevant data' },
      { name: 'Process and clean', tool: 'code_execute', description: 'Clean and transform data' },
      { name: 'Analyze patterns', tool: 'code_execute', description: 'Run statistical analysis' },
      { name: 'Visualize', tool: 'chart_generate', description: 'Create charts and dashboards' },
      { name: 'Generate report', tool: 'report_generate', description: 'Summarize findings with recommendations' },
    ], estimatedTime: '10-25 min' },
  },
  'content-writer': {
    article_creation: { steps: [
      { name: 'Research topic', tool: 'seo_audit', description: 'Research keywords and competitor content' },
      { name: 'Create outline', tool: 'llm_generate', description: 'Structure the article with headings' },
      { name: 'Write draft', tool: 'llm_generate', description: 'Write the full article' },
      { name: 'SEO optimize', tool: 'seo_audit', description: 'Optimize for target keywords' },
      { name: 'Grammar review', tool: 'grammar_check', description: 'Polish grammar and style' },
    ], estimatedTime: '15-30 min' },
  },
  'product-manager': {
    feature_spec: { steps: [
      { name: 'Analyze requirements', tool: 'llm_analyze', description: 'Parse user needs and business goals' },
      { name: 'Draft PRD', tool: 'llm_generate', description: 'Write product requirements document' },
      { name: 'Create user stories', tool: 'llm_generate', description: 'Break into user stories' },
      { name: 'Prioritize with RICE', tool: 'llm_analyze', description: 'Score and prioritize features' },
    ], estimatedTime: '10-20 min' },
  },
  'designer': {
    design_review: { steps: [
      { name: 'Accessibility audit', tool: 'accessibility_audit', description: 'Check WCAG 2.1 AA compliance' },
      { name: 'UX analysis', tool: 'llm_analyze', description: 'Evaluate user flow and usability' },
      { name: 'Generate recommendations', tool: 'llm_generate', description: 'Create actionable design improvements' },
    ], estimatedTime: '8-15 min' },
  },
};

const EMPLOYEE_JOB_MAP: Record<string, string> = {
  atlas: 'software-engineer', cipher: 'software-engineer',
  aurora: 'marketing-manager', pulse: 'marketing-manager',
  vex: 'sales-representative', echo: 'sales-representative',
  harmony: 'customer-support', solace: 'customer-support',
  prism: 'data-analyst', vertex: 'data-analyst',
  lyra: 'content-writer', nexus: 'product-manager', pixel: 'designer',
};

const EMPLOYEE_NAMES: Record<string, string> = {
  atlas: 'Atlas', cipher: 'Cipher', aurora: 'Aurora', pulse: 'Pulse',
  vex: 'Vex', echo: 'Echo', harmony: 'Harmony', solace: 'Solace',
  prism: 'Prism', vertex: 'Vertex', lyra: 'Lyra', nexus: 'Nexus', pixel: 'Pixel',
};

// ── Task Execution ──

export async function getTaskPipelines(employeeId: string): Promise<Record<string, TaskPipeline>> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.getTaskPipelines(employeeId);
    if (res.success && res.data?.pipelines) return res.data.pipelines;
  }
  const jobType = EMPLOYEE_JOB_MAP[employeeId] || '';
  return LOCAL_PIPELINES[jobType] || {};
}

export async function executeTask(employeeId: string, pipelineId: string, task: string): Promise<TaskExecutionResult> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.executeTask(employeeId, pipelineId, task);
    if (res.success && res.data) {
      // Also save locally for offline access
      saveTaskToHistory(res.data);
      return res.data;
    }
  }

  // Local simulation
  const jobType = EMPLOYEE_JOB_MAP[employeeId] || '';
  const pipeline = LOCAL_PIPELINES[jobType]?.[pipelineId];
  if (!pipeline) throw new Error(`Pipeline "${pipelineId}" not found`);

  const steps = pipeline.steps.map((step, i) => ({
    step: step.name,
    status: 'completed' as const,
    output: { status: 'simulated', content: `[${step.name}] ${step.description} — simulated for: "${task.slice(0, 80)}"` },
    durationMs: 200 + Math.random() * 800,
  }));

  const result: TaskExecutionResult = {
    executionId: `local_${Date.now()}`,
    employeeId,
    employeeName: EMPLOYEE_NAMES[employeeId] || employeeId,
    pipeline: pipelineId,
    status: 'completed',
    steps,
    totalDurationMs: steps.reduce((s, r) => s + r.durationMs, 0),
    estimatedTime: pipeline.estimatedTime,
  };

  saveTaskToHistory(result);
  updateLocalMetrics(employeeId, 'completed', result.totalDurationMs);
  return result;
}

function saveTaskToHistory(result: TaskExecutionResult): void {
  const history = loadJSON<TaskExecutionResult[]>(STORAGE_KEYS.TASK_HISTORY, []);
  history.unshift(result);
  saveJSON(STORAGE_KEYS.TASK_HISTORY, history.slice(0, 100));
}

export function getLocalTaskHistory(employeeId?: string): TaskExecutionResult[] {
  const history = loadJSON<TaskExecutionResult[]>(STORAGE_KEYS.TASK_HISTORY, []);
  return employeeId ? history.filter(t => t.employeeId === employeeId) : history;
}

// ── Inter-Employee Communication ──

export async function sendInterEmployeeMessage(
  fromId: string, toId: string, type: string, subject: string, content: string
): Promise<InterEmployeeMessage> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.sendMessage(fromId, toId, type, subject, content);
    if (res.success && res.data) {
      const msg: InterEmployeeMessage = {
        id: res.data.id, from_employee_id: fromId, to_employee_id: toId,
        fromName: EMPLOYEE_NAMES[fromId], toName: EMPLOYEE_NAMES[toId],
        type: type as any, subject, content, status: 'sent',
        created_at: new Date().toISOString(),
      };
      saveMessageLocally(msg);
      return msg;
    }
  }

  const msg: InterEmployeeMessage = {
    id: `local_msg_${Date.now()}`, from_employee_id: fromId, to_employee_id: toId,
    fromName: EMPLOYEE_NAMES[fromId], toName: EMPLOYEE_NAMES[toId],
    type: type as any, subject, content, status: 'sent',
    created_at: new Date().toISOString(),
  };
  saveMessageLocally(msg);
  return msg;
}

function saveMessageLocally(msg: InterEmployeeMessage): void {
  const messages = loadJSON<InterEmployeeMessage[]>(STORAGE_KEYS.MESSAGES, []);
  messages.unshift(msg);
  saveJSON(STORAGE_KEYS.MESSAGES, messages.slice(0, 200));
}

export async function getInterEmployeeMessages(employeeId?: string): Promise<InterEmployeeMessage[]> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.getMessages(employeeId);
    if (res.success && res.data) return res.data;
  }
  const all = loadJSON<InterEmployeeMessage[]>(STORAGE_KEYS.MESSAGES, []);
  if (!employeeId) return all;
  return all.filter(m => m.from_employee_id === employeeId || m.to_employee_id === employeeId);
}

export async function performHandoff(fromId: string, toId: string, task: string, context: string, priority: string): Promise<any> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.performHandoff(fromId, toId, task, context, priority);
    if (res.success) {
      await sendInterEmployeeMessage(fromId, toId, 'handoff', `Handoff: ${task.slice(0, 50)}`, `Task handoff: ${task}\n\nContext: ${context}`);
      return res.data;
    }
  }

  const msg = await sendInterEmployeeMessage(fromId, toId, 'handoff', `Handoff: ${task.slice(0, 50)}`, `Task handoff: ${task}\n\nContext: ${context}\nPriority: ${priority}`);
  return { handoffId: msg.id, from: { id: fromId, name: EMPLOYEE_NAMES[fromId] }, to: { id: toId, name: EMPLOYEE_NAMES[toId] }, task, status: 'pending' };
}

// ── Dynamic Metrics ──

function updateLocalMetrics(employeeId: string, status: string, durationMs: number): void {
  const all = loadJSON<Record<string, EmployeeMetrics>>(STORAGE_KEYS.METRICS, {});
  const current = all[employeeId] || {
    employeeId, employeeName: EMPLOYEE_NAMES[employeeId] || employeeId,
    tasksCompleted: 0, tasksFailed: 0, successRate: 100,
    avgResponseTimeMs: 0, messagesSent: 0, toolsUsed: 0, activeDays: 0,
  };

  if (status === 'completed') current.tasksCompleted++;
  else current.tasksFailed++;

  const total = current.tasksCompleted + current.tasksFailed;
  current.successRate = total > 0 ? Math.round((current.tasksCompleted / total) * 100) : 100;
  current.avgResponseTimeMs = total > 0 ? Math.round(((current.avgResponseTimeMs * (total - 1)) + durationMs) / total) : durationMs;
  current.toolsUsed++;
  current.activeDays = Math.max(current.activeDays, 1);

  all[employeeId] = current;
  saveJSON(STORAGE_KEYS.METRICS, all);
}

export async function getEmployeeMetrics(employeeId?: string): Promise<EmployeeMetrics[]> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.getMetrics(employeeId);
    if (res.success && res.data) {
      if (employeeId && res.data.summary) return [{ ...res.data.summary, employeeId, employeeName: res.data.employeeName }];
      if (res.data.employees) return res.data.employees;
    }
  }

  const all = loadJSON<Record<string, EmployeeMetrics>>(STORAGE_KEYS.METRICS, {});
  if (employeeId) return all[employeeId] ? [all[employeeId]] : [];
  return Object.values(all);
}

export async function getLeaderboard(): Promise<EmployeeMetrics[]> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.getLeaderboard();
    if (res.success && res.data) return res.data as any;
  }
  const all = loadJSON<Record<string, EmployeeMetrics>>(STORAGE_KEYS.METRICS, {});
  return Object.values(all).sort((a, b) => b.tasksCompleted - a.tasksCompleted);
}

// ── Personality Tuning ──

export async function getPersonalityConfig(employeeId: string): Promise<PersonalityConfig> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.getPersonality(employeeId);
    if (res.success && res.data?.config) {
      saveJSON(`${STORAGE_KEYS.PERSONALITY}_${employeeId}`, res.data.config);
      return res.data.config;
    }
  }

  return loadJSON<PersonalityConfig>(`${STORAGE_KEYS.PERSONALITY}_${employeeId}`, {
    tone: 'friendly', formality: 0.5, verbosity: 0.5, humor: 0.3,
    assertiveness: 0.5, empathy: 0.5, responseStyle: 'balanced',
    language: 'en', customInstructions: '',
  });
}

export async function updatePersonalityConfig(employeeId: string, config: Partial<PersonalityConfig>): Promise<PersonalityConfig> {
  const current = await getPersonalityConfig(employeeId);
  const merged = { ...current, ...config };

  if (isWorkerConnected()) {
    const res = await WorkerEmployees.updatePersonality(employeeId, config);
    if (res.success && res.data?.config) {
      saveJSON(`${STORAGE_KEYS.PERSONALITY}_${employeeId}`, res.data.config);
      return res.data.config;
    }
  }

  saveJSON(`${STORAGE_KEYS.PERSONALITY}_${employeeId}`, merged);
  return merged;
}

// ── Onboarding ──

export async function getOnboardingContext(employeeId: string): Promise<OnboardingContext | null> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.getOnboarding(employeeId);
    if (res.success && res.data?.context) {
      saveJSON(`${STORAGE_KEYS.ONBOARDING}_${employeeId}`, res.data.context);
      return res.data.context;
    }
  }
  return loadJSON<OnboardingContext | null>(`${STORAGE_KEYS.ONBOARDING}_${employeeId}`, null);
}

export async function saveOnboardingContext(employeeId: string, context: OnboardingContext): Promise<void> {
  saveJSON(`${STORAGE_KEYS.ONBOARDING}_${employeeId}`, context);

  if (isWorkerConnected()) {
    await WorkerEmployees.saveOnboarding(employeeId, context);
  }
}

export async function getOnboardingStatus(): Promise<{ totalEmployees: number; onboarded: number; pending: number; percentComplete: number }> {
  if (isWorkerConnected()) {
    const res = await WorkerEmployees.getOnboardingStatus();
    if (res.success && res.data) return res.data;
  }

  const total = Object.keys(EMPLOYEE_JOB_MAP).length;
  let onboarded = 0;
  for (const id of Object.keys(EMPLOYEE_JOB_MAP)) {
    const ctx = loadJSON<OnboardingContext | null>(`${STORAGE_KEYS.ONBOARDING}_${id}`, null);
    if (ctx) onboarded++;
  }
  return { totalEmployees: total, onboarded, pending: total - onboarded, percentComplete: Math.round((onboarded / total) * 100) };
}

// ── Utility exports ──
export { EMPLOYEE_JOB_MAP, EMPLOYEE_NAMES, LOCAL_PIPELINES };
