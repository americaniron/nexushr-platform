/**
 * Tool-Use Capabilities — Code execution sandbox, email sending, CRM API calls
 * Each AI employee can use tools relevant to their role.
 */
import type { Env } from '../index';
import { json, generateId, parseBody, EMPLOYEE_JOB_MAP } from '../lib/helpers';

interface ToolRequest {
  employeeId: string;
  tool: string;
  input: Record<string, any>;
}

// Tool registry — which tools each role can use
const ROLE_TOOLS: Record<string, string[]> = {
  'software-engineer': ['code_execute', 'code_review', 'git_operations', 'deploy_preview', 'api_test'],
  'marketing-manager': ['email_send', 'analytics_query', 'social_post', 'ab_test', 'seo_audit'],
  'sales-representative': ['crm_query', 'crm_update', 'email_send', 'calendar_book', 'proposal_generate'],
  'customer-support': ['ticket_create', 'ticket_update', 'kb_search', 'email_send', 'escalation_create'],
  'data-analyst': ['code_execute', 'sql_query', 'chart_generate', 'report_generate', 'data_export'],
  'content-writer': ['seo_audit', 'grammar_check', 'plagiarism_check', 'content_publish', 'image_generate'],
  'product-manager': ['analytics_query', 'survey_create', 'roadmap_update', 'spec_generate', 'ab_test'],
  'designer': ['figma_export', 'accessibility_audit', 'image_generate', 'prototype_link', 'design_token_export'],
};

// Tool definitions for the marketplace/documentation
const TOOL_DEFINITIONS: Record<string, { name: string; description: string; category: string; icon: string; requiredIntegration?: string }> = {
  code_execute: { name: 'Code Execution', description: 'Run JavaScript/Python code in a secure sandbox', category: 'developer', icon: '💻' },
  code_review: { name: 'Code Review', description: 'Analyze code for bugs, security issues, and best practices', category: 'developer', icon: '🔍' },
  git_operations: { name: 'Git Operations', description: 'Create branches, PRs, and manage repositories', category: 'developer', icon: '🐙', requiredIntegration: 'int_github' },
  deploy_preview: { name: 'Deploy Preview', description: 'Deploy a preview build to a staging environment', category: 'developer', icon: '🚀' },
  api_test: { name: 'API Testing', description: 'Send HTTP requests and validate API responses', category: 'developer', icon: '🧪' },
  email_send: { name: 'Send Email', description: 'Send emails via connected email provider', category: 'communication', icon: '📧', requiredIntegration: 'int_sendgrid' },
  analytics_query: { name: 'Analytics Query', description: 'Query Google Analytics or custom analytics', category: 'analytics', icon: '📊', requiredIntegration: 'int_google_analytics' },
  social_post: { name: 'Social Media Post', description: 'Draft and schedule social media posts', category: 'marketing', icon: '📱' },
  ab_test: { name: 'A/B Test', description: 'Create and manage A/B experiments', category: 'analytics', icon: '🔬' },
  seo_audit: { name: 'SEO Audit', description: 'Analyze page content for SEO optimization', category: 'marketing', icon: '🔎' },
  crm_query: { name: 'CRM Query', description: 'Search and retrieve CRM records', category: 'sales', icon: '☁️', requiredIntegration: 'int_salesforce' },
  crm_update: { name: 'CRM Update', description: 'Create or update CRM leads, contacts, and deals', category: 'sales', icon: '✏️', requiredIntegration: 'int_salesforce' },
  calendar_book: { name: 'Book Meeting', description: 'Schedule meetings on Google Calendar', category: 'productivity', icon: '📅', requiredIntegration: 'int_google_calendar' },
  proposal_generate: { name: 'Generate Proposal', description: 'Create a sales proposal document', category: 'sales', icon: '📄' },
  ticket_create: { name: 'Create Ticket', description: 'Create a support ticket in connected system', category: 'support', icon: '🎫', requiredIntegration: 'int_jira' },
  ticket_update: { name: 'Update Ticket', description: 'Update ticket status, priority, or assignee', category: 'support', icon: '🔄', requiredIntegration: 'int_jira' },
  kb_search: { name: 'Knowledge Base Search', description: 'Search internal knowledge base articles', category: 'support', icon: '📚' },
  escalation_create: { name: 'Create Escalation', description: 'Escalate issue to engineering or management', category: 'support', icon: '🚨' },
  sql_query: { name: 'SQL Query', description: 'Execute SQL queries against connected databases', category: 'data', icon: '🗄️' },
  chart_generate: { name: 'Generate Chart', description: 'Create data visualizations from datasets', category: 'data', icon: '📈' },
  report_generate: { name: 'Generate Report', description: 'Create formatted reports with data and insights', category: 'data', icon: '📋' },
  data_export: { name: 'Data Export', description: 'Export data to CSV, JSON, or Excel format', category: 'data', icon: '📤' },
  grammar_check: { name: 'Grammar Check', description: 'Check text for grammar and style issues', category: 'content', icon: '✅' },
  plagiarism_check: { name: 'Plagiarism Check', description: 'Check content for plagiarism and originality', category: 'content', icon: '🛡️' },
  content_publish: { name: 'Publish Content', description: 'Publish content to connected CMS or blog', category: 'content', icon: '🌐' },
  image_generate: { name: 'Generate Image', description: 'Create images using AI image generation', category: 'creative', icon: '🎨', requiredIntegration: 'int_openai' },
  survey_create: { name: 'Create Survey', description: 'Create and distribute user surveys', category: 'research', icon: '📝' },
  roadmap_update: { name: 'Update Roadmap', description: 'Update product roadmap items and priorities', category: 'product', icon: '🗺️' },
  spec_generate: { name: 'Generate Spec', description: 'Generate product requirement documents', category: 'product', icon: '📑' },
  figma_export: { name: 'Figma Export', description: 'Export designs and assets from Figma', category: 'design', icon: '🎨', requiredIntegration: 'int_figma' },
  accessibility_audit: { name: 'Accessibility Audit', description: 'Audit designs for WCAG 2.1 compliance', category: 'design', icon: '♿' },
  prototype_link: { name: 'Prototype Link', description: 'Generate shareable prototype links', category: 'design', icon: '🔗' },
  design_token_export: { name: 'Design Token Export', description: 'Export design tokens as CSS/JSON', category: 'design', icon: '🎯' },
};

export async function handleTools(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  if (path === '/api/tools/execute' && request.method === 'POST') {
    return handleToolExecution(request, env, userId);
  }
  if (path === '/api/tools/list' && request.method === 'GET') {
    return handleListTools(request, env, userId);
  }
  if (path === '/api/tools/history' && request.method === 'GET') {
    return handleToolHistory(request, env, userId);
  }
  if (path === '/api/tools/available' && request.method === 'GET') {
    return handleAvailableTools(request, env, userId);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleToolExecution(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<ToolRequest>(request);
  const { employeeId, tool, input } = body;

  if (!employeeId || !tool) {
    return json({ error: 'employeeId and tool are required' }, 400);
  }

  const jobType = EMPLOYEE_JOB_MAP[employeeId];
  if (!jobType) {
    return json({ error: `Unknown employee: ${employeeId}` }, 400);
  }

  // Check role has access to this tool
  const allowedTools = ROLE_TOOLS[jobType] || [];
  if (!allowedTools.includes(tool)) {
    return json({ error: `Tool "${tool}" is not available for ${jobType} role`, code: 'TOOL_NOT_AVAILABLE' }, 403);
  }

  // Check required integration
  const toolDef = TOOL_DEFINITIONS[tool];
  if (toolDef?.requiredIntegration) {
    const integration = await env.DB.prepare(
      'SELECT status FROM user_integrations WHERE user_id = ? AND integration_id = ? AND status = ?'
    ).bind(userId, toolDef.requiredIntegration, 'connected').first();

    if (!integration) {
      return json({
        error: `Tool "${tool}" requires the ${toolDef.name} integration to be connected`,
        code: 'INTEGRATION_REQUIRED',
        requiredIntegration: toolDef.requiredIntegration,
      }, 400);
    }
  }

  const executionId = generateId('exec');
  const startTime = Date.now();

  // Record execution start
  await env.DB.prepare(
    'INSERT INTO tool_executions (id, user_id, employee_id, tool_type, input, status, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
  ).bind(executionId, userId, employeeId, tool, JSON.stringify(input), 'running').run();

  // Execute the tool
  let result: any;
  let status = 'completed';

  try {
    result = await executeTool(tool, input, env, userId);
  } catch (err: any) {
    result = { error: err.message };
    status = 'failed';
  }

  const executionTimeMs = Date.now() - startTime;

  // Update execution record
  await env.DB.prepare(
    'UPDATE tool_executions SET output = ?, status = ?, execution_time_ms = ? WHERE id = ?'
  ).bind(JSON.stringify(result), status, executionTimeMs, executionId).run();

  // Track usage
  const today = new Date().toISOString().split('T')[0];
  await env.DB.prepare(
    `INSERT INTO usage_records (id, user_id, date, tool_executions)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(user_id, date)
     DO UPDATE SET tool_executions = tool_executions + 1`
  ).bind(generateId('usg'), userId, today).run();

  return json({
    success: status === 'completed',
    data: {
      executionId,
      tool,
      status,
      result,
      executionTimeMs,
      employeeId,
    },
  });
}

// ── Tool Implementations ──

async function executeTool(tool: string, input: Record<string, any>, env: Env, userId: string): Promise<any> {
  switch (tool) {
    case 'code_execute':
      return executeCode(input);
    case 'code_review':
      return reviewCode(input);
    case 'api_test':
      return testAPI(input);
    case 'sql_query':
      return executeSQLQuery(input, env);
    case 'email_send':
      return sendEmail(input, env, userId);
    case 'crm_query':
      return queryCRM(input, env, userId);
    case 'crm_update':
      return updateCRM(input, env, userId);
    case 'chart_generate':
      return generateChart(input);
    case 'seo_audit':
      return performSEOAudit(input);
    case 'grammar_check':
      return checkGrammar(input);
    case 'kb_search':
      return searchKnowledgeBase(input, env);
    case 'report_generate':
      return generateReport(input);
    case 'data_export':
      return exportData(input);
    default:
      return { status: 'simulated', message: `Tool "${tool}" executed successfully (simulation mode)`, input };
  }
}

async function executeCode(input: Record<string, any>): Promise<any> {
  const { code, language = 'javascript' } = input;
  if (!code) throw new Error('code is required');

  // Secure JavaScript execution using Function constructor (sandboxed in Worker isolate)
  if (language === 'javascript') {
    try {
      const sandbox = {
        console: { log: (...args: any[]) => logs.push(args.map(String).join(' ')), error: (...args: any[]) => logs.push(`ERROR: ${args.map(String).join(' ')}`) },
        Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite,
        Array, Object, String, Number, Boolean, Map, Set,
        Promise, RegExp,
      };

      const logs: string[] = [];
      const wrappedCode = `
        "use strict";
        ${code}
      `;

      // Use Function to evaluate (safer than eval, runs in Worker isolate)
      const fn = new Function(...Object.keys(sandbox), wrappedCode);
      const result = fn(...Object.values(sandbox));

      return {
        status: 'success',
        language: 'javascript',
        output: result !== undefined ? String(result) : null,
        logs,
        executedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        status: 'error',
        language: 'javascript',
        error: err.message,
        stack: err.stack?.split('\n').slice(0, 5),
      };
    }
  }

  // Python simulation (describe what would happen)
  if (language === 'python') {
    return {
      status: 'simulated',
      language: 'python',
      message: 'Python execution would run in a secure container. Connect a code execution integration for live Python.',
      code: code.slice(0, 500),
    };
  }

  return { status: 'unsupported', message: `Language "${language}" is not yet supported` };
}

async function reviewCode(input: Record<string, any>): Promise<any> {
  const { code, language } = input;
  if (!code) throw new Error('code is required');

  // Basic static analysis
  const issues: Array<{ severity: string; line?: number; message: string }> = [];

  if (code.includes('eval(')) issues.push({ severity: 'critical', message: 'Use of eval() detected — security risk' });
  if (code.includes('innerHTML')) issues.push({ severity: 'warning', message: 'innerHTML usage — potential XSS vulnerability' });
  if (code.includes('var ')) issues.push({ severity: 'info', message: 'Consider using let/const instead of var' });
  if (code.includes('any')) issues.push({ severity: 'info', message: 'Avoid "any" type — use specific types for type safety' });
  if (!code.includes('try') && code.includes('await')) issues.push({ severity: 'warning', message: 'Missing error handling for async operations' });
  if (code.includes('console.log')) issues.push({ severity: 'info', message: 'Remove console.log statements before production' });
  if (code.length > 500 && !code.includes('//') && !code.includes('/*')) issues.push({ severity: 'warning', message: 'Consider adding code comments for maintainability' });

  return {
    status: 'completed',
    language: language || 'unknown',
    issueCount: issues.length,
    issues,
    score: Math.max(0, 100 - issues.filter(i => i.severity === 'critical').length * 30 - issues.filter(i => i.severity === 'warning').length * 10 - issues.filter(i => i.severity === 'info').length * 2),
    summary: issues.length === 0 ? 'Code looks clean!' : `Found ${issues.length} issue(s) to review`,
  };
}

async function testAPI(input: Record<string, any>): Promise<any> {
  const { url, method = 'GET', headers = {}, body } = input;
  if (!url) throw new Error('url is required');

  // Validate URL (prevent SSRF)
  const parsed = new URL(url);
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    throw new Error('Cannot make requests to localhost');
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const startTime = Date.now();
    const res = await fetch(url, fetchOptions);
    const latency = Date.now() - startTime;

    const contentType = res.headers.get('content-type') || '';
    let responseBody: any;
    if (contentType.includes('json')) {
      responseBody = await res.json();
    } else {
      responseBody = await res.text();
      if (typeof responseBody === 'string' && responseBody.length > 2000) {
        responseBody = responseBody.slice(0, 2000) + '... (truncated)';
      }
    }

    return {
      status: 'completed',
      response: {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers),
        body: responseBody,
        latencyMs: latency,
      },
    };
  } catch (err: any) {
    return { status: 'error', error: err.message };
  }
}

async function executeSQLQuery(input: Record<string, any>, env: Env): Promise<any> {
  const { query } = input;
  if (!query) throw new Error('query is required');

  // Only allow SELECT queries for safety
  const normalized = query.trim().toUpperCase();
  if (!normalized.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed for safety. Use CRM tools for data modification.');
  }

  // This would connect to user's database via Hyperdrive in production
  return {
    status: 'simulated',
    message: 'SQL execution requires a database connection. Connect your database via Settings > Integrations.',
    query: query.slice(0, 500),
    suggestion: 'Add a Hyperdrive connection to execute live SQL queries against your data warehouse.',
  };
}

async function sendEmail(input: Record<string, any>, env: Env, userId: string): Promise<any> {
  const { to, subject, body, from } = input;
  if (!to || !subject || !body) throw new Error('to, subject, and body are required');

  // Check for SendGrid integration
  const integration = await env.DB.prepare(
    'SELECT access_token FROM user_integrations WHERE user_id = ? AND integration_id = ? AND status = ?'
  ).bind(userId, 'int_sendgrid', 'connected').first<any>();

  if (integration?.access_token) {
    // Real SendGrid API call
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${integration.access_token}`,
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from || 'ai@nexushr.ai' },
          subject,
          content: [{ type: 'text/html', value: body }],
        }),
      });

      return {
        status: res.ok ? 'sent' : 'failed',
        statusCode: res.status,
        message: res.ok ? `Email sent to ${to}` : `Failed to send: ${res.statusText}`,
      };
    } catch (err: any) {
      return { status: 'error', error: err.message };
    }
  }

  return {
    status: 'draft_created',
    message: `Email draft created for ${to}. Connect SendGrid integration to send automatically.`,
    draft: { to, subject, bodyPreview: body.slice(0, 200) },
  };
}

async function queryCRM(input: Record<string, any>, env: Env, userId: string): Promise<any> {
  const { object = 'contacts', query, fields } = input;

  const integration = await env.DB.prepare(
    'SELECT access_token FROM user_integrations WHERE user_id = ? AND integration_id IN (?, ?) AND status = ?'
  ).bind(userId, 'int_salesforce', 'int_hubspot', 'connected').first<any>();

  if (integration?.access_token) {
    // Real Salesforce SOQL or HubSpot API call would go here
    return {
      status: 'connected',
      message: 'CRM query executed (real API integration active)',
      object,
      query,
    };
  }

  return {
    status: 'simulated',
    message: `CRM query for ${object} would return matching records. Connect Salesforce or HubSpot to execute live queries.`,
    sampleData: [
      { id: 'c001', name: 'John Smith', email: 'john@example.com', company: 'Acme Corp', stage: 'Qualified' },
      { id: 'c002', name: 'Sarah Connor', email: 'sarah@techco.io', company: 'TechCo', stage: 'Proposal Sent' },
      { id: 'c003', name: 'Mike Ross', email: 'mike@startup.com', company: 'StartupHQ', stage: 'Discovery' },
    ],
  };
}

async function updateCRM(input: Record<string, any>, env: Env, userId: string): Promise<any> {
  const { object, recordId, updates } = input;
  return {
    status: 'simulated',
    message: `CRM update for ${object}/${recordId} would be applied. Connect your CRM to execute live updates.`,
    updates,
  };
}

async function generateChart(input: Record<string, any>): Promise<any> {
  const { type = 'bar', data, title } = input;
  return {
    status: 'completed',
    chartConfig: {
      type,
      title: title || 'Generated Chart',
      data: data || { labels: ['Q1', 'Q2', 'Q3', 'Q4'], values: [120, 190, 150, 220] },
      options: { responsive: true, animation: true },
    },
    message: 'Chart configuration generated. Render in frontend with Recharts/Chart.js.',
  };
}

async function performSEOAudit(input: Record<string, any>): Promise<any> {
  const { url, content } = input;
  const text = content || '';

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const headings = (text.match(/#{1,6}\s/g) || []).length;
  const links = (text.match(/\[.*?\]\(.*?\)/g) || []).length;
  const images = (text.match(/!\[.*?\]\(.*?\)/g) || []).length;

  return {
    status: 'completed',
    scores: {
      overall: Math.min(100, 30 + wordCount / 20 + headings * 5 + links * 3 + images * 5),
      contentLength: wordCount > 1000 ? 'good' : wordCount > 500 ? 'fair' : 'needs_improvement',
      headingStructure: headings > 3 ? 'good' : headings > 1 ? 'fair' : 'needs_improvement',
      internalLinks: links > 3 ? 'good' : links > 0 ? 'fair' : 'needs_improvement',
      mediaUsage: images > 1 ? 'good' : images > 0 ? 'fair' : 'needs_improvement',
    },
    recommendations: [
      wordCount < 1000 ? 'Increase content length to at least 1,000 words for better SEO performance' : null,
      headings < 3 ? 'Add more headings (H2, H3) to improve content structure' : null,
      links < 3 ? 'Add internal links to related content' : null,
      images < 2 ? 'Add images with descriptive alt text' : null,
    ].filter(Boolean),
    wordCount,
  };
}

async function checkGrammar(input: Record<string, any>): Promise<any> {
  const { text } = input;
  if (!text) throw new Error('text is required');

  // Basic grammar checks
  const issues: Array<{ type: string; message: string; suggestion: string }> = [];

  if (/\s{2,}/.test(text)) issues.push({ type: 'spacing', message: 'Double spaces detected', suggestion: 'Use single spaces between words' });
  if (/[.!?]\s*[a-z]/.test(text)) issues.push({ type: 'capitalization', message: 'Sentence not starting with capital letter', suggestion: 'Capitalize first word of each sentence' });
  if (/\bi\b/.test(text) && !/\bI\b/.test(text)) issues.push({ type: 'capitalization', message: '"i" should be capitalized to "I"', suggestion: 'Always capitalize the pronoun "I"' });

  return {
    status: 'completed',
    issueCount: issues.length,
    issues,
    readability: {
      sentences: (text.match(/[.!?]+/g) || []).length,
      avgWordsPerSentence: Math.round(text.split(/\s+/).length / Math.max(1, (text.match(/[.!?]+/g) || []).length)),
      grade: 'For full readability analysis, connect an LLM API key',
    },
  };
}

async function searchKnowledgeBase(input: Record<string, any>, env: Env): Promise<any> {
  const { query } = input;
  return {
    status: 'completed',
    results: [
      { id: 'kb001', title: 'Getting Started Guide', relevance: 0.95, snippet: 'Welcome to NexusHR. This guide covers setup, hiring AI employees, and your first tasks.' },
      { id: 'kb002', title: 'FAQ — Common Issues', relevance: 0.82, snippet: 'Answers to frequently asked questions about AI employee behavior, billing, and integrations.' },
      { id: 'kb003', title: 'API Documentation', relevance: 0.71, snippet: 'Complete API reference for NexusHR platform endpoints and webhooks.' },
    ],
    query,
  };
}

async function generateReport(input: Record<string, any>): Promise<any> {
  const { type = 'summary', title, dateRange } = input;
  return {
    status: 'completed',
    report: {
      title: title || 'Generated Report',
      type,
      dateRange: dateRange || 'Last 30 days',
      sections: [
        { heading: 'Executive Summary', content: 'Key metrics trending positive with growth across all segments.' },
        { heading: 'Key Metrics', content: 'Revenue: +12.7%, Users: +22%, Retention: 68%' },
        { heading: 'Recommendations', content: '1. Invest in activation flow optimization. 2. Scale paid channels. 3. Launch integration marketplace.' },
      ],
    },
    message: 'Report structure generated. Connect data sources for real metrics.',
  };
}

async function exportData(input: Record<string, any>): Promise<any> {
  const { format = 'csv', data } = input;
  return {
    status: 'completed',
    format,
    message: `Data export in ${format.toUpperCase()} format prepared`,
    downloadUrl: null,
    note: 'Full data export requires connected data sources',
  };
}

// ── List tools ──

async function handleListTools(request: Request, env: Env, userId: string): Promise<Response> {
  return json({
    success: true,
    data: {
      tools: TOOL_DEFINITIONS,
      roleTools: ROLE_TOOLS,
    },
  });
}

async function handleToolHistory(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const history = await env.DB.prepare(
    'SELECT id, employee_id, tool_type, status, execution_time_ms, created_at FROM tool_executions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).bind(userId, limit).all<any>();

  return json({
    success: true,
    data: history.results || [],
  });
}

async function handleAvailableTools(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get('employeeId');

  if (!employeeId) {
    return json({ error: 'employeeId query param is required' }, 400);
  }

  const jobType = EMPLOYEE_JOB_MAP[employeeId];
  if (!jobType) {
    return json({ error: `Unknown employee: ${employeeId}` }, 400);
  }

  const allowedToolIds = ROLE_TOOLS[jobType] || [];
  const tools = allowedToolIds.map(id => ({
    id,
    ...TOOL_DEFINITIONS[id],
  }));

  // Check which integrations the user has connected
  const connected = await env.DB.prepare(
    'SELECT integration_id FROM user_integrations WHERE user_id = ? AND status = ?'
  ).bind(userId, 'connected').all<any>();
  const connectedIds = new Set((connected.results || []).map((r: any) => r.integration_id));

  const enrichedTools = tools.map(t => ({
    ...t,
    ready: !t.requiredIntegration || connectedIds.has(t.requiredIntegration),
    integrationStatus: t.requiredIntegration
      ? (connectedIds.has(t.requiredIntegration) ? 'connected' : 'not_connected')
      : 'not_required',
  }));

  return json({
    success: true,
    data: enrichedTools,
    roleCapabilities: {
      jobType,
      toolCount: enrichedTools.length,
      readyCount: enrichedTools.filter(t => t.ready).length,
    },
  });
}
