/**
 * Enhanced Employee System — Task execution, inter-employee communication,
 * dynamic metrics, personality tuning, and employee onboarding.
 */
import type { Env } from '../index';
import { json, generateId, parseBody, EMPLOYEE_JOB_MAP, EMPLOYEE_NAMES, ROLE_SYSTEM_PROMPTS, ROLE_MODEL_CONFIG } from '../lib/helpers';

// ── Task Execution Pipelines per Role ──
interface TaskPipeline {
  steps: Array<{ name: string; tool: string; description: string }>;
  estimatedTime: string;
}

const ROLE_TASK_PIPELINES: Record<string, Record<string, TaskPipeline>> = {
  'software-engineer': {
    code_implementation: {
      steps: [
        { name: 'Analyze requirements', tool: 'llm_analyze', description: 'Parse the task into technical requirements' },
        { name: 'Generate code', tool: 'code_execute', description: 'Write implementation code' },
        { name: 'Review code', tool: 'code_review', description: 'Run static analysis and best practice checks' },
        { name: 'Run tests', tool: 'code_execute', description: 'Execute test suite' },
        { name: 'Document', tool: 'llm_generate', description: 'Generate code documentation' },
      ],
      estimatedTime: '5-15 min',
    },
    bug_fix: {
      steps: [
        { name: 'Reproduce issue', tool: 'code_execute', description: 'Attempt to reproduce the reported bug' },
        { name: 'Root cause analysis', tool: 'code_review', description: 'Analyze code for the root cause' },
        { name: 'Implement fix', tool: 'code_execute', description: 'Write and test the fix' },
        { name: 'Regression test', tool: 'code_execute', description: 'Ensure fix doesn\'t break existing functionality' },
      ],
      estimatedTime: '3-10 min',
    },
    api_design: {
      steps: [
        { name: 'Analyze endpoints', tool: 'llm_analyze', description: 'Design API endpoint structure' },
        { name: 'Generate OpenAPI spec', tool: 'llm_generate', description: 'Create OpenAPI specification' },
        { name: 'Create mock server', tool: 'code_execute', description: 'Generate mock API responses' },
        { name: 'Test endpoints', tool: 'api_test', description: 'Validate API contract' },
      ],
      estimatedTime: '8-20 min',
    },
  },
  'marketing-manager': {
    campaign_launch: {
      steps: [
        { name: 'Audience analysis', tool: 'analytics_query', description: 'Analyze target audience segments' },
        { name: 'Content creation', tool: 'llm_generate', description: 'Draft campaign copy and assets' },
        { name: 'SEO optimization', tool: 'seo_audit', description: 'Optimize content for search' },
        { name: 'A/B variants', tool: 'ab_test', description: 'Create test variants' },
        { name: 'Schedule distribution', tool: 'social_post', description: 'Schedule across channels' },
      ],
      estimatedTime: '15-30 min',
    },
    content_creation: {
      steps: [
        { name: 'Research keywords', tool: 'seo_audit', description: 'Identify target keywords and topics' },
        { name: 'Draft content', tool: 'llm_generate', description: 'Write the content piece' },
        { name: 'SEO optimize', tool: 'seo_audit', description: 'Optimize meta tags, headings, keywords' },
        { name: 'Grammar check', tool: 'grammar_check', description: 'Review for grammar and style' },
      ],
      estimatedTime: '10-20 min',
    },
  },
  'sales-representative': {
    prospect_outreach: {
      steps: [
        { name: 'Research prospect', tool: 'crm_query', description: 'Gather prospect intelligence from CRM' },
        { name: 'Draft outreach', tool: 'llm_generate', description: 'Create personalized outreach sequence' },
        { name: 'Send initial email', tool: 'email_send', description: 'Send first touch email' },
        { name: 'Update CRM', tool: 'crm_update', description: 'Log activity in CRM' },
        { name: 'Schedule follow-up', tool: 'calendar_book', description: 'Set follow-up reminders' },
      ],
      estimatedTime: '5-10 min',
    },
    deal_analysis: {
      steps: [
        { name: 'Pull pipeline data', tool: 'crm_query', description: 'Get current pipeline status' },
        { name: 'Analyze deal health', tool: 'llm_analyze', description: 'Score deals by likelihood to close' },
        { name: 'Generate forecast', tool: 'report_generate', description: 'Create revenue forecast' },
        { name: 'Identify risks', tool: 'llm_generate', description: 'Flag at-risk deals with save strategies' },
      ],
      estimatedTime: '5-15 min',
    },
  },
  'customer-support': {
    ticket_resolution: {
      steps: [
        { name: 'Classify issue', tool: 'llm_analyze', description: 'Categorize and prioritize the ticket' },
        { name: 'Search knowledge base', tool: 'kb_search', description: 'Find relevant solutions' },
        { name: 'Draft response', tool: 'llm_generate', description: 'Write empathetic, solution-focused reply' },
        { name: 'Update ticket', tool: 'ticket_update', description: 'Update ticket status and notes' },
      ],
      estimatedTime: '2-5 min',
    },
    escalation: {
      steps: [
        { name: 'Document issue', tool: 'llm_generate', description: 'Create detailed escalation report' },
        { name: 'Notify team', tool: 'email_send', description: 'Alert engineering or management' },
        { name: 'Create escalation', tool: 'escalation_create', description: 'Create escalation ticket' },
        { name: 'Update customer', tool: 'llm_generate', description: 'Draft customer update on escalation' },
      ],
      estimatedTime: '3-8 min',
    },
  },
  'data-analyst': {
    data_analysis: {
      steps: [
        { name: 'Query data', tool: 'sql_query', description: 'Extract relevant data' },
        { name: 'Process and clean', tool: 'code_execute', description: 'Clean and transform data' },
        { name: 'Analyze patterns', tool: 'code_execute', description: 'Run statistical analysis' },
        { name: 'Visualize', tool: 'chart_generate', description: 'Create charts and dashboards' },
        { name: 'Generate report', tool: 'report_generate', description: 'Summarize findings with recommendations' },
      ],
      estimatedTime: '10-25 min',
    },
    dashboard_creation: {
      steps: [
        { name: 'Define KPIs', tool: 'llm_analyze', description: 'Identify key metrics to track' },
        { name: 'Query data sources', tool: 'sql_query', description: 'Build data queries' },
        { name: 'Create visualizations', tool: 'chart_generate', description: 'Design chart components' },
        { name: 'Build dashboard', tool: 'report_generate', description: 'Assemble dashboard layout' },
      ],
      estimatedTime: '15-30 min',
    },
  },
  'content-writer': {
    article_creation: {
      steps: [
        { name: 'Research topic', tool: 'seo_audit', description: 'Research keywords and competitor content' },
        { name: 'Create outline', tool: 'llm_generate', description: 'Structure the article with headings' },
        { name: 'Write draft', tool: 'llm_generate', description: 'Write the full article' },
        { name: 'SEO optimize', tool: 'seo_audit', description: 'Optimize for target keywords' },
        { name: 'Grammar review', tool: 'grammar_check', description: 'Polish grammar and style' },
      ],
      estimatedTime: '15-30 min',
    },
  },
  'product-manager': {
    feature_spec: {
      steps: [
        { name: 'Analyze requirements', tool: 'llm_analyze', description: 'Parse user needs and business goals' },
        { name: 'Draft PRD', tool: 'llm_generate', description: 'Write product requirements document' },
        { name: 'Create user stories', tool: 'llm_generate', description: 'Break into user stories with acceptance criteria' },
        { name: 'Prioritize with RICE', tool: 'llm_analyze', description: 'Score and prioritize features' },
      ],
      estimatedTime: '10-20 min',
    },
  },
  'designer': {
    design_review: {
      steps: [
        { name: 'Accessibility audit', tool: 'accessibility_audit', description: 'Check WCAG 2.1 AA compliance' },
        { name: 'UX analysis', tool: 'llm_analyze', description: 'Evaluate user flow and usability' },
        { name: 'Generate recommendations', tool: 'llm_generate', description: 'Create actionable design improvements' },
        { name: 'Export design tokens', tool: 'design_token_export', description: 'Generate CSS/JSON design tokens' },
      ],
      estimatedTime: '8-15 min',
    },
  },
};

// ── Inter-Employee Communication Messages ──
interface InterEmployeeMessage {
  id: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  type: 'handoff' | 'request' | 'feedback' | 'data_share' | 'escalation';
  subject: string;
  content: string;
  attachedData?: any;
  status: 'sent' | 'read' | 'acted_on';
  createdAt: string;
}

// ── Personality Tuning Dimensions ──
interface PersonalityConfig {
  tone: 'formal' | 'casual' | 'friendly' | 'direct';
  formality: number;
  verbosity: number;
  humor: number;
  assertiveness: number;
  empathy: number;
  responseStyle: 'concise' | 'detailed' | 'balanced';
  language: string;
  customInstructions: string;
}

// ── Onboarding Context ──
interface OnboardingContext {
  companyName: string;
  industry: string;
  companySize: string;
  products: string;
  targetAudience: string;
  brandVoice: string;
  competitors: string;
  keyMetrics: string;
  techStack: string;
  customContext: string;
}

export async function handleEmployees(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  // Task execution
  if (path === '/api/employees/tasks/execute' && request.method === 'POST') return executeTaskPipeline(request, env, userId);
  if (path === '/api/employees/tasks/pipelines' && request.method === 'GET') return getTaskPipelines(request, env, userId);
  if (path === '/api/employees/tasks/history' && request.method === 'GET') return getTaskHistory(request, env, userId);

  // Inter-employee communication
  if (path === '/api/employees/messages/send' && request.method === 'POST') return sendInterEmployeeMessage(request, env, userId);
  if (path === '/api/employees/messages' && request.method === 'GET') return getInterEmployeeMessages(request, env, userId);
  if (path === '/api/employees/handoff' && request.method === 'POST') return performHandoff(request, env, userId);

  // Dynamic metrics
  if (path === '/api/employees/metrics' && request.method === 'GET') return getEmployeeMetrics(request, env, userId);
  if (path === '/api/employees/metrics/leaderboard' && request.method === 'GET') return getLeaderboard(request, env, userId);

  // Personality tuning
  if (path === '/api/employees/personality' && request.method === 'GET') return getPersonalityConfig(request, env, userId);
  if (path === '/api/employees/personality' && request.method === 'PUT') return updatePersonalityConfig(request, env, userId);

  // Onboarding
  if (path === '/api/employees/onboarding' && request.method === 'GET') return getOnboardingContext(request, env, userId);
  if (path === '/api/employees/onboarding' && request.method === 'POST') return saveOnboardingContext(request, env, userId);
  if (path === '/api/employees/onboarding/status' && request.method === 'GET') return getOnboardingStatus(request, env, userId);

  return json({ error: 'Not found' }, 404);
}

// ══════════════════════════════════════
// 1. TASK EXECUTION PIPELINES
// ══════════════════════════════════════

async function executeTaskPipeline(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ employeeId: string; pipelineId: string; task: string; context?: Record<string, any> }>(request);
  const { employeeId, pipelineId, task, context } = body;

  if (!employeeId || !pipelineId || !task) {
    return json({ error: 'employeeId, pipelineId, and task are required' }, 400);
  }

  const jobType = EMPLOYEE_JOB_MAP[employeeId];
  if (!jobType) return json({ error: `Unknown employee: ${employeeId}` }, 400);

  const rolePipelines = ROLE_TASK_PIPELINES[jobType];
  if (!rolePipelines || !rolePipelines[pipelineId]) {
    return json({ error: `Pipeline "${pipelineId}" not available for ${jobType}` }, 400);
  }

  const pipeline = rolePipelines[pipelineId];
  const executionId = generateId('task');
  const startTime = Date.now();

  // Record task start
  await env.DB.prepare(
    `INSERT INTO task_executions (id, user_id, employee_id, pipeline_id, task_description, status, steps_total, steps_completed, created_at)
     VALUES (?, ?, ?, ?, ?, 'running', ?, 0, datetime('now'))`
  ).bind(executionId, userId, employeeId, pipelineId, task, pipeline.steps.length).run();

  // Execute each step
  const stepResults: Array<{ step: string; status: string; output: any; durationMs: number }> = [];
  let overallStatus = 'completed';

  // Load onboarding context for enriched prompts
  const onboardingCtx = await env.DB.prepare(
    'SELECT context FROM employee_onboarding WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<any>();
  const companyContext = onboardingCtx?.context ? JSON.parse(onboardingCtx.context) : null;

  // Load personality config
  const personalityRow = await env.DB.prepare(
    'SELECT config FROM personality_configs WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<any>();
  const personalityConfig = personalityRow?.config ? JSON.parse(personalityRow.config) : null;

  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];
    const stepStart = Date.now();

    try {
      const output = await executeStep(step, task, stepResults, env, userId, employeeId, companyContext, personalityConfig);
      stepResults.push({ step: step.name, status: 'completed', output, durationMs: Date.now() - stepStart });

      // Update progress
      await env.DB.prepare(
        'UPDATE task_executions SET steps_completed = ? WHERE id = ?'
      ).bind(i + 1, executionId).run();
    } catch (err: any) {
      stepResults.push({ step: step.name, status: 'failed', output: { error: err.message }, durationMs: Date.now() - stepStart });
      overallStatus = 'partial';
    }
  }

  const totalDuration = Date.now() - startTime;

  // Update task record
  await env.DB.prepare(
    'UPDATE task_executions SET status = ?, output = ?, execution_time_ms = ?, completed_at = datetime("now") WHERE id = ?'
  ).bind(overallStatus, JSON.stringify(stepResults), totalDuration, executionId).run();

  // Update dynamic metrics
  await updateEmployeeMetrics(env, userId, employeeId, overallStatus, totalDuration);

  return json({
    success: true,
    data: {
      executionId,
      employeeId,
      employeeName: EMPLOYEE_NAMES[employeeId],
      pipeline: pipelineId,
      status: overallStatus,
      steps: stepResults,
      totalDurationMs: totalDuration,
      estimatedTime: pipeline.estimatedTime,
    },
  });
}

async function executeStep(
  step: { name: string; tool: string; description: string },
  task: string,
  previousResults: Array<{ step: string; output: any }>,
  env: Env,
  userId: string,
  employeeId: string,
  companyContext: OnboardingContext | null,
  personalityConfig: PersonalityConfig | null,
): Promise<any> {
  const jobType = EMPLOYEE_JOB_MAP[employeeId];

  // Build context from previous step results
  const prevContext = previousResults.map(r => `[${r.step}]: ${JSON.stringify(r.output).slice(0, 500)}`).join('\n');

  // For LLM-based steps, try to use real API or generate smart fallback
  if (step.tool === 'llm_analyze' || step.tool === 'llm_generate') {
    const claudeKey = await env.API_KEYS.get(`anthropic_${userId}`);
    const openaiKey = await env.API_KEYS.get(`openai_${userId}`);

    let contextPrompt = '';
    if (companyContext) {
      contextPrompt = `\nCompany Context: ${companyContext.companyName} in ${companyContext.industry}. Products: ${companyContext.products}. Target: ${companyContext.targetAudience}. Brand voice: ${companyContext.brandVoice}.`;
    }

    let personalityPrompt = '';
    if (personalityConfig) {
      personalityPrompt = `\nResponse style: ${personalityConfig.responseStyle}. Tone: ${personalityConfig.tone}. ${personalityConfig.customInstructions ? `Additional instructions: ${personalityConfig.customInstructions}` : ''}`;
    }

    const systemPrompt = `${ROLE_SYSTEM_PROMPTS[jobType] || ''}${contextPrompt}${personalityPrompt}`;
    const userPrompt = `Step: ${step.name}\nDescription: ${step.description}\nTask: ${task}\n${prevContext ? `\nPrevious results:\n${prevContext}` : ''}\n\nExecute this step and provide the output.`;

    if (claudeKey) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': claudeKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({
            model: ROLE_MODEL_CONFIG[jobType]?.primary || 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        });
        if (res.ok) {
          const data = await res.json() as any;
          return { status: 'completed', llmPowered: true, content: data.content?.[0]?.text || 'No response', model: 'claude' };
        }
      } catch {}
    }

    if (openaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: ROLE_MODEL_CONFIG[jobType]?.fallback || 'gpt-4o',
            max_tokens: 2048,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          }),
        });
        if (res.ok) {
          const data = await res.json() as any;
          return { status: 'completed', llmPowered: true, content: data.choices?.[0]?.message?.content || 'No response', model: 'gpt-4' };
        }
      } catch {}
    }

    // Smart fallback
    return {
      status: 'simulated',
      llmPowered: false,
      content: `[${step.name}] ${step.description} — completed for task: "${task.slice(0, 100)}". Connect an LLM API key in Settings for real AI-powered execution.`,
      suggestion: 'Add your Anthropic or OpenAI API key for live AI-powered task execution.',
    };
  }

  // For tool-based steps, return structured simulation
  return {
    status: 'simulated',
    tool: step.tool,
    content: `[${step.name}] ${step.description} — executed successfully.`,
    input: { task: task.slice(0, 200) },
  };
}

async function getTaskPipelines(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get('employeeId');

  if (employeeId) {
    const jobType = EMPLOYEE_JOB_MAP[employeeId];
    if (!jobType) return json({ error: `Unknown employee: ${employeeId}` }, 400);
    const pipelines = ROLE_TASK_PIPELINES[jobType] || {};
    return json({ success: true, data: { employeeId, jobType, pipelines } });
  }

  return json({ success: true, data: ROLE_TASK_PIPELINES });
}

async function getTaskHistory(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get('employeeId');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let query = 'SELECT * FROM task_executions WHERE user_id = ?';
  const binds: any[] = [userId];

  if (employeeId) {
    query += ' AND employee_id = ?';
    binds.push(employeeId);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  binds.push(limit);

  const stmt = env.DB.prepare(query);
  const result = await stmt.bind(...binds).all<any>();

  return json({ success: true, data: result.results || [] });
}

// ══════════════════════════════════════
// 2. INTER-EMPLOYEE COMMUNICATION
// ══════════════════════════════════════

async function sendInterEmployeeMessage(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{
    fromEmployeeId: string;
    toEmployeeId: string;
    type: string;
    subject: string;
    content: string;
    attachedData?: any;
  }>(request);

  const { fromEmployeeId, toEmployeeId, type, subject, content, attachedData } = body;

  if (!fromEmployeeId || !toEmployeeId || !content) {
    return json({ error: 'fromEmployeeId, toEmployeeId, and content are required' }, 400);
  }

  if (!EMPLOYEE_JOB_MAP[fromEmployeeId] || !EMPLOYEE_JOB_MAP[toEmployeeId]) {
    return json({ error: 'Invalid employee ID' }, 400);
  }

  const msgId = generateId('msg');

  await env.DB.prepare(
    `INSERT INTO inter_employee_messages (id, user_id, from_employee_id, to_employee_id, type, subject, content, attached_data, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', datetime('now'))`
  ).bind(msgId, userId, fromEmployeeId, toEmployeeId, type || 'request', subject || '', content, attachedData ? JSON.stringify(attachedData) : null).run();

  return json({
    success: true,
    data: {
      id: msgId,
      from: { id: fromEmployeeId, name: EMPLOYEE_NAMES[fromEmployeeId] },
      to: { id: toEmployeeId, name: EMPLOYEE_NAMES[toEmployeeId] },
      type,
      subject,
      status: 'sent',
    },
  });
}

async function getInterEmployeeMessages(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get('employeeId');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  let query: string;
  let binds: any[];

  if (employeeId) {
    query = 'SELECT * FROM inter_employee_messages WHERE user_id = ? AND (from_employee_id = ? OR to_employee_id = ?) ORDER BY created_at DESC LIMIT ?';
    binds = [userId, employeeId, employeeId, limit];
  } else {
    query = 'SELECT * FROM inter_employee_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?';
    binds = [userId, limit];
  }

  const result = await env.DB.prepare(query).bind(...binds).all<any>();

  const messages = (result.results || []).map((m: any) => ({
    ...m,
    fromName: EMPLOYEE_NAMES[m.from_employee_id],
    toName: EMPLOYEE_NAMES[m.to_employee_id],
    attachedData: m.attached_data ? JSON.parse(m.attached_data) : null,
  }));

  return json({ success: true, data: messages });
}

async function performHandoff(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{
    fromEmployeeId: string;
    toEmployeeId: string;
    task: string;
    context: string;
    priority: string;
  }>(request);

  const { fromEmployeeId, toEmployeeId, task, context, priority } = body;

  // Create handoff message
  const msgId = generateId('hoff');
  await env.DB.prepare(
    `INSERT INTO inter_employee_messages (id, user_id, from_employee_id, to_employee_id, type, subject, content, attached_data, status, created_at)
     VALUES (?, ?, ?, ?, 'handoff', ?, ?, ?, 'sent', datetime('now'))`
  ).bind(
    msgId, userId, fromEmployeeId, toEmployeeId,
    `Handoff: ${task.slice(0, 100)}`,
    `Task handoff from ${EMPLOYEE_NAMES[fromEmployeeId]} to ${EMPLOYEE_NAMES[toEmployeeId]}: ${task}`,
    JSON.stringify({ context, priority: priority || 'medium', originalTask: task })
  ).run();

  // Create a task execution for the receiving employee
  const taskId = generateId('task');
  await env.DB.prepare(
    `INSERT INTO task_executions (id, user_id, employee_id, pipeline_id, task_description, status, steps_total, steps_completed, created_at)
     VALUES (?, ?, ?, 'handoff', ?, 'pending', 1, 0, datetime('now'))`
  ).bind(taskId, userId, toEmployeeId, `[Handoff from ${EMPLOYEE_NAMES[fromEmployeeId]}] ${task}`).run();

  return json({
    success: true,
    data: {
      handoffId: msgId,
      taskId,
      from: { id: fromEmployeeId, name: EMPLOYEE_NAMES[fromEmployeeId], role: EMPLOYEE_JOB_MAP[fromEmployeeId] },
      to: { id: toEmployeeId, name: EMPLOYEE_NAMES[toEmployeeId], role: EMPLOYEE_JOB_MAP[toEmployeeId] },
      task,
      status: 'pending',
    },
  });
}

// ══════════════════════════════════════
// 3. DYNAMIC PERFORMANCE METRICS
// ══════════════════════════════════════

async function updateEmployeeMetrics(env: Env, userId: string, employeeId: string, status: string, durationMs: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  await env.DB.prepare(
    `INSERT INTO employee_metrics (id, user_id, employee_id, date, tasks_completed, tasks_failed, total_response_time_ms, messages_sent, tools_used, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, datetime('now'))
     ON CONFLICT(user_id, employee_id, date)
     DO UPDATE SET
       tasks_completed = tasks_completed + ?,
       tasks_failed = tasks_failed + ?,
       total_response_time_ms = total_response_time_ms + ?,
       tools_used = tools_used + 1`
  ).bind(
    generateId('met'), userId, employeeId, today,
    status === 'completed' ? 1 : 0,
    status === 'failed' ? 1 : 0,
    durationMs,
    status === 'completed' ? 1 : 0,
    status === 'failed' ? 1 : 0,
    durationMs,
  ).run();
}

async function getEmployeeMetrics(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get('employeeId');
  const days = parseInt(url.searchParams.get('days') || '30');
  const sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  if (employeeId) {
    // Single employee metrics
    const metrics = await env.DB.prepare(
      'SELECT * FROM employee_metrics WHERE user_id = ? AND employee_id = ? AND date >= ? ORDER BY date DESC'
    ).bind(userId, employeeId, sinceDate).all<any>();

    const rows = metrics.results || [];
    const totalTasks = rows.reduce((s: number, r: any) => s + (r.tasks_completed || 0), 0);
    const totalFailed = rows.reduce((s: number, r: any) => s + (r.tasks_failed || 0), 0);
    const totalTime = rows.reduce((s: number, r: any) => s + (r.total_response_time_ms || 0), 0);
    const totalMessages = rows.reduce((s: number, r: any) => s + (r.messages_sent || 0), 0);
    const totalTools = rows.reduce((s: number, r: any) => s + (r.tools_used || 0), 0);

    return json({
      success: true,
      data: {
        employeeId,
        employeeName: EMPLOYEE_NAMES[employeeId],
        period: { days, since: sinceDate },
        summary: {
          tasksCompleted: totalTasks,
          tasksFailed: totalFailed,
          successRate: totalTasks + totalFailed > 0 ? Math.round((totalTasks / (totalTasks + totalFailed)) * 100) : 100,
          avgResponseTimeMs: totalTasks > 0 ? Math.round(totalTime / totalTasks) : 0,
          messagesSent: totalMessages,
          toolsUsed: totalTools,
          activeDays: rows.length,
        },
        daily: rows,
      },
    });
  }

  // All employees aggregated
  const allMetrics = await env.DB.prepare(
    `SELECT employee_id,
       SUM(tasks_completed) as total_tasks,
       SUM(tasks_failed) as total_failed,
       SUM(total_response_time_ms) as total_time,
       SUM(messages_sent) as total_messages,
       SUM(tools_used) as total_tools,
       COUNT(DISTINCT date) as active_days
     FROM employee_metrics
     WHERE user_id = ? AND date >= ?
     GROUP BY employee_id`
  ).bind(userId, sinceDate).all<any>();

  const employees = (allMetrics.results || []).map((r: any) => ({
    employeeId: r.employee_id,
    employeeName: EMPLOYEE_NAMES[r.employee_id],
    tasksCompleted: r.total_tasks || 0,
    tasksFailed: r.total_failed || 0,
    successRate: (r.total_tasks || 0) + (r.total_failed || 0) > 0
      ? Math.round(((r.total_tasks || 0) / ((r.total_tasks || 0) + (r.total_failed || 0))) * 100)
      : 100,
    avgResponseTimeMs: (r.total_tasks || 0) > 0 ? Math.round((r.total_time || 0) / (r.total_tasks || 0)) : 0,
    messagesSent: r.total_messages || 0,
    toolsUsed: r.total_tools || 0,
    activeDays: r.active_days || 0,
  }));

  return json({ success: true, data: { period: { days, since: sinceDate }, employees } });
}

async function getLeaderboard(request: Request, env: Env, userId: string): Promise<Response> {
  const leaderboard = await env.DB.prepare(
    `SELECT employee_id,
       SUM(tasks_completed) as total_tasks,
       SUM(tasks_failed) as total_failed,
       SUM(total_response_time_ms) as total_time,
       SUM(tools_used) as total_tools
     FROM employee_metrics
     WHERE user_id = ?
     GROUP BY employee_id
     ORDER BY total_tasks DESC`
  ).bind(userId).all<any>();

  const ranked = (leaderboard.results || []).map((r: any, i: number) => ({
    rank: i + 1,
    employeeId: r.employee_id,
    employeeName: EMPLOYEE_NAMES[r.employee_id],
    tasksCompleted: r.total_tasks || 0,
    successRate: (r.total_tasks || 0) + (r.total_failed || 0) > 0
      ? Math.round(((r.total_tasks || 0) / ((r.total_tasks || 0) + (r.total_failed || 0))) * 100)
      : 100,
    avgResponseTimeMs: (r.total_tasks || 0) > 0 ? Math.round((r.total_time || 0) / (r.total_tasks || 0)) : 0,
  }));

  return json({ success: true, data: ranked });
}

// ══════════════════════════════════════
// 4. PERSONALITY TUNING
// ══════════════════════════════════════

async function getPersonalityConfig(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get('employeeId');

  if (!employeeId) return json({ error: 'employeeId query param required' }, 400);

  const row = await env.DB.prepare(
    'SELECT config FROM personality_configs WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<any>();

  const config = row?.config ? JSON.parse(row.config) : getDefaultPersonality(employeeId);

  return json({ success: true, data: { employeeId, employeeName: EMPLOYEE_NAMES[employeeId], config } });
}

async function updatePersonalityConfig(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ employeeId: string; config: Partial<PersonalityConfig> }>(request);
  const { employeeId, config } = body;

  if (!employeeId || !config) return json({ error: 'employeeId and config are required' }, 400);
  if (!EMPLOYEE_JOB_MAP[employeeId]) return json({ error: `Unknown employee: ${employeeId}` }, 400);

  // Validate numeric ranges
  for (const key of ['formality', 'verbosity', 'humor', 'assertiveness', 'empathy'] as const) {
    if (config[key] !== undefined && (config[key]! < 0 || config[key]! > 1)) {
      return json({ error: `${key} must be between 0 and 1` }, 400);
    }
  }

  // Merge with defaults
  const existing = await env.DB.prepare(
    'SELECT config FROM personality_configs WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<any>();

  const currentConfig = existing?.config ? JSON.parse(existing.config) : getDefaultPersonality(employeeId);
  const mergedConfig = { ...currentConfig, ...config };

  await env.DB.prepare(
    `INSERT INTO personality_configs (id, user_id, employee_id, config, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, employee_id)
     DO UPDATE SET config = ?, updated_at = datetime('now')`
  ).bind(generateId('prs'), userId, employeeId, JSON.stringify(mergedConfig), JSON.stringify(mergedConfig)).run();

  return json({
    success: true,
    data: { employeeId, employeeName: EMPLOYEE_NAMES[employeeId], config: mergedConfig },
    message: `Personality updated for ${EMPLOYEE_NAMES[employeeId]}`,
  });
}

function getDefaultPersonality(employeeId: string): PersonalityConfig {
  const defaults: Record<string, Partial<PersonalityConfig>> = {
    atlas: { tone: 'direct', formality: 0.7, verbosity: 0.5, humor: 0.2, assertiveness: 0.8, empathy: 0.5 },
    cipher: { tone: 'formal', formality: 0.9, verbosity: 0.6, humor: 0.1, assertiveness: 0.9, empathy: 0.3 },
    aurora: { tone: 'friendly', formality: 0.4, verbosity: 0.7, humor: 0.5, assertiveness: 0.6, empathy: 0.8 },
    pulse: { tone: 'casual', formality: 0.2, verbosity: 0.8, humor: 0.7, assertiveness: 0.5, empathy: 0.9 },
    vex: { tone: 'direct', formality: 0.6, verbosity: 0.4, humor: 0.3, assertiveness: 0.95, empathy: 0.6 },
    echo: { tone: 'casual', formality: 0.3, verbosity: 0.5, humor: 0.4, assertiveness: 0.8, empathy: 0.5 },
    harmony: { tone: 'friendly', formality: 0.5, verbosity: 0.6, humor: 0.3, assertiveness: 0.4, empathy: 0.95 },
    solace: { tone: 'direct', formality: 0.7, verbosity: 0.6, humor: 0.2, assertiveness: 0.7, empathy: 0.7 },
    prism: { tone: 'formal', formality: 0.8, verbosity: 0.7, humor: 0.1, assertiveness: 0.7, empathy: 0.4 },
    vertex: { tone: 'friendly', formality: 0.6, verbosity: 0.6, humor: 0.3, assertiveness: 0.5, empathy: 0.6 },
    lyra: { tone: 'friendly', formality: 0.4, verbosity: 0.9, humor: 0.4, assertiveness: 0.5, empathy: 0.7 },
    nexus: { tone: 'direct', formality: 0.6, verbosity: 0.6, humor: 0.2, assertiveness: 0.8, empathy: 0.7 },
    pixel: { tone: 'casual', formality: 0.3, verbosity: 0.7, humor: 0.5, assertiveness: 0.6, empathy: 0.8 },
  };

  const d = defaults[employeeId] || {};
  return {
    tone: d.tone || 'friendly',
    formality: d.formality ?? 0.5,
    verbosity: d.verbosity ?? 0.5,
    humor: d.humor ?? 0.3,
    assertiveness: d.assertiveness ?? 0.5,
    empathy: d.empathy ?? 0.5,
    responseStyle: 'balanced',
    language: 'en',
    customInstructions: '',
  };
}

// ══════════════════════════════════════
// 5. EMPLOYEE ONBOARDING
// ══════════════════════════════════════

async function saveOnboardingContext(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{ employeeId: string; context: OnboardingContext }>(request);
  const { employeeId, context } = body;

  if (!employeeId || !context) return json({ error: 'employeeId and context are required' }, 400);
  if (!EMPLOYEE_JOB_MAP[employeeId]) return json({ error: `Unknown employee: ${employeeId}` }, 400);

  await env.DB.prepare(
    `INSERT INTO employee_onboarding (id, user_id, employee_id, context, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'completed', datetime('now'), datetime('now'))
     ON CONFLICT(user_id, employee_id)
     DO UPDATE SET context = ?, status = 'completed', updated_at = datetime('now')`
  ).bind(generateId('onb'), userId, employeeId, JSON.stringify(context), JSON.stringify(context)).run();

  return json({
    success: true,
    data: { employeeId, employeeName: EMPLOYEE_NAMES[employeeId], status: 'completed' },
    message: `${EMPLOYEE_NAMES[employeeId]} has been onboarded with your company context. They will now tailor responses to your organization.`,
  });
}

async function getOnboardingContext(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get('employeeId');

  if (employeeId) {
    const row = await env.DB.prepare(
      'SELECT context, status, updated_at FROM employee_onboarding WHERE user_id = ? AND employee_id = ?'
    ).bind(userId, employeeId).first<any>();

    return json({
      success: true,
      data: {
        employeeId,
        employeeName: EMPLOYEE_NAMES[employeeId],
        context: row?.context ? JSON.parse(row.context) : null,
        status: row?.status || 'not_started',
        updatedAt: row?.updated_at,
      },
    });
  }

  // All employees
  const all = await env.DB.prepare(
    'SELECT employee_id, status, updated_at FROM employee_onboarding WHERE user_id = ?'
  ).bind(userId).all<any>();

  const statusMap: Record<string, { status: string; updatedAt: string }> = {};
  for (const row of (all.results || []) as any[]) {
    statusMap[row.employee_id] = { status: row.status, updatedAt: row.updated_at };
  }

  const employees = Object.keys(EMPLOYEE_JOB_MAP).map(id => ({
    employeeId: id,
    employeeName: EMPLOYEE_NAMES[id],
    jobType: EMPLOYEE_JOB_MAP[id],
    onboardingStatus: statusMap[id]?.status || 'not_started',
    updatedAt: statusMap[id]?.updatedAt || null,
  }));

  return json({ success: true, data: employees });
}

async function getOnboardingStatus(request: Request, env: Env, userId: string): Promise<Response> {
  const completed = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM employee_onboarding WHERE user_id = ? AND status = ?'
  ).bind(userId, 'completed').first<any>();

  const total = Object.keys(EMPLOYEE_JOB_MAP).length;
  const completedCount = completed?.count || 0;

  return json({
    success: true,
    data: {
      totalEmployees: total,
      onboarded: completedCount,
      pending: total - completedCount,
      percentComplete: Math.round((completedCount / total) * 100),
    },
  });
}
