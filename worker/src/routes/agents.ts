/**
 * Multi-Agent Collaboration Engine — The competitive moat
 * Enables multiple AI employees to collaborate on complex tasks
 * using orchestrated workflows, shared context, and handoffs.
 */
import type { Env } from '../index';
import { json, generateId, parseBody, EMPLOYEE_JOB_MAP, EMPLOYEE_NAMES, ROLE_SYSTEM_PROMPTS } from '../lib/helpers';

interface CollaborationRequest {
  name: string;
  description: string;
  employeeIds: string[];
  workflow: 'sequential' | 'parallel' | 'debate' | 'review_chain' | 'swarm';
  task: string;
  config?: Record<string, any>;
}

// Workflow definitions
const WORKFLOW_DEFINITIONS: Record<string, { name: string; description: string; icon: string; minAgents: number; maxAgents: number }> = {
  sequential: {
    name: 'Sequential Pipeline',
    description: 'Each agent processes the task in order, building on the previous output. Ideal for content creation pipelines.',
    icon: '🔗',
    minAgents: 2,
    maxAgents: 10,
  },
  parallel: {
    name: 'Parallel Execution',
    description: 'All agents work on the task simultaneously, results are merged. Ideal for research and analysis.',
    icon: '⚡',
    minAgents: 2,
    maxAgents: 10,
  },
  debate: {
    name: 'Structured Debate',
    description: 'Agents argue different perspectives, then a moderator synthesizes. Ideal for strategy and decision-making.',
    icon: '🗣️',
    minAgents: 2,
    maxAgents: 5,
  },
  review_chain: {
    name: 'Review Chain',
    description: 'First agent creates, subsequent agents review and refine. Ideal for code review, content editing.',
    icon: '🔍',
    minAgents: 2,
    maxAgents: 5,
  },
  swarm: {
    name: 'Agent Swarm',
    description: 'Agents self-organize, each tackling sub-tasks they are best suited for. Ideal for complex projects.',
    icon: '🐝',
    minAgents: 3,
    maxAgents: 10,
  },
};

// Pre-built collaboration templates
const COLLABORATION_TEMPLATES = [
  {
    id: 'content_pipeline',
    name: 'Content Creation Pipeline',
    description: 'Writer drafts → Designer reviews visuals → Marketer optimizes for SEO → PM validates against roadmap',
    employeeIds: ['lyra', 'pixel', 'aurora', 'sage'],
    workflow: 'sequential',
    category: 'content',
  },
  {
    id: 'deal_war_room',
    name: 'Deal War Room',
    description: 'Sales rep presents deal context → Data analyst pulls metrics → Marketer creates collateral → PM aligns with product',
    employeeIds: ['vex', 'prism', 'aurora', 'sage'],
    workflow: 'parallel',
    category: 'sales',
  },
  {
    id: 'code_review_pipeline',
    name: 'Code Review Pipeline',
    description: 'Engineer writes code → Second engineer reviews → Designer checks UI → Support validates user scenarios',
    employeeIds: ['atlas', 'cipher', 'pixel', 'harmony'],
    workflow: 'review_chain',
    category: 'engineering',
  },
  {
    id: 'strategy_debate',
    name: 'Strategy Debate',
    description: 'Sales, marketing, and product debate go-to-market strategy from their perspectives',
    employeeIds: ['vex', 'aurora', 'sage'],
    workflow: 'debate',
    category: 'strategy',
  },
  {
    id: 'incident_swarm',
    name: 'Incident Response Swarm',
    description: 'Support triages → Engineers investigate → Data analyst checks metrics → PM communicates status',
    employeeIds: ['harmony', 'atlas', 'cipher', 'prism', 'sage'],
    workflow: 'swarm',
    category: 'operations',
  },
  {
    id: 'launch_readiness',
    name: 'Launch Readiness Review',
    description: 'PM reviews requirements → Engineer checks technical readiness → Marketer prepares launch plan → Designer finalizes assets',
    employeeIds: ['sage', 'atlas', 'aurora', 'pixel'],
    workflow: 'sequential',
    category: 'product',
  },
  {
    id: 'customer_360',
    name: 'Customer 360 Analysis',
    description: 'All agents analyze a customer from their domain perspective — support history, usage data, marketing engagement, product fit',
    employeeIds: ['harmony', 'prism', 'aurora', 'vex', 'sage'],
    workflow: 'parallel',
    category: 'customer_success',
  },
];

export async function handleAgents(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  // List collaboration templates
  if (path === '/api/agents/templates' && request.method === 'GET') {
    return handleListTemplates();
  }

  // List workflows
  if (path === '/api/agents/workflows' && request.method === 'GET') {
    return handleListWorkflows();
  }

  // Start a collaboration
  if (path === '/api/agents/collaborate' && request.method === 'POST') {
    return handleStartCollaboration(request, env, userId);
  }

  // Get collaboration status
  if (path === '/api/agents/status' && request.method === 'GET') {
    return handleCollaborationStatus(request, env, userId);
  }

  // List user's collaborations
  if (path === '/api/agents/history' && request.method === 'GET') {
    return handleCollaborationHistory(env, userId);
  }

  // Agent capabilities matrix
  if (path === '/api/agents/capabilities' && request.method === 'GET') {
    return handleCapabilities();
  }

  return json({ error: 'Not found' }, 404);
}

async function handleStartCollaboration(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<CollaborationRequest>(request);
  const { name, description, employeeIds, workflow, task, config = {} } = body;

  if (!name || !employeeIds?.length || !workflow || !task) {
    return json({ error: 'name, employeeIds, workflow, and task are required' }, 400);
  }

  const workflowDef = WORKFLOW_DEFINITIONS[workflow];
  if (!workflowDef) {
    return json({ error: `Unknown workflow: ${workflow}. Valid: ${Object.keys(WORKFLOW_DEFINITIONS).join(', ')}` }, 400);
  }

  if (employeeIds.length < workflowDef.minAgents) {
    return json({ error: `${workflow} requires at least ${workflowDef.minAgents} agents` }, 400);
  }

  // Validate all employees exist
  for (const empId of employeeIds) {
    if (!EMPLOYEE_JOB_MAP[empId]) {
      return json({ error: `Unknown employee: ${empId}` }, 400);
    }
  }

  const collabId = generateId('collab');

  // Check for LLM API keys
  const hasAnthropic = !!(await env.API_KEYS.get(`${userId}:anthropic`));
  const hasOpenAI = !!(await env.API_KEYS.get(`${userId}:openai`));
  const hasLLM = hasAnthropic || hasOpenAI;

  // Execute the collaboration workflow
  let result: any;
  const startTime = Date.now();

  if (hasLLM) {
    // Real multi-agent execution with LLM
    const apiKey = hasAnthropic
      ? await env.API_KEYS.get(`${userId}:anthropic`)
      : await env.API_KEYS.get(`${userId}:openai`);
    const provider = hasAnthropic ? 'anthropic' : 'openai';

    result = await executeCollaboration(workflow, employeeIds, task, provider, apiKey!, env);
  } else {
    // Simulated collaboration
    result = simulateCollaboration(workflow, employeeIds, task);
  }

  const executionTime = Date.now() - startTime;

  // Store collaboration
  await env.DB.prepare(
    `INSERT INTO agent_collaborations (id, user_id, name, description, employee_ids, workflow, status, result, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now'), datetime('now'))`
  ).bind(collabId, userId, name, description || '', JSON.stringify(employeeIds), workflow, JSON.stringify(result)).run();

  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId('aud'), userId, 'collaboration_completed', userId, collabId, `${workflow} with ${employeeIds.length} agents`).run();

  return json({
    success: true,
    data: {
      collaborationId: collabId,
      name,
      workflow,
      agents: employeeIds.map(id => ({ id, name: EMPLOYEE_NAMES[id], role: EMPLOYEE_JOB_MAP[id] })),
      status: 'completed',
      result,
      executionTimeMs: executionTime,
      llmPowered: hasLLM,
    },
  });
}

// ── Real Multi-Agent Execution ──

async function executeCollaboration(
  workflow: string, employeeIds: string[], task: string,
  provider: string, apiKey: string, env: Env
): Promise<any> {
  const agentOutputs: Record<string, string> = {};

  switch (workflow) {
    case 'sequential': {
      let previousOutput = task;
      for (const empId of employeeIds) {
        const jobType = EMPLOYEE_JOB_MAP[empId];
        const prompt = `${ROLE_SYSTEM_PROMPTS[jobType]}\n\nYou are ${EMPLOYEE_NAMES[empId]}, working in a sequential pipeline with other AI agents.\n\nPrevious agent's output:\n${previousOutput}\n\nBuild upon this work from your ${jobType} perspective. Add your expertise and improvements.`;

        const response = await callLLMForAgent(provider, apiKey, prompt, task);
        agentOutputs[empId] = response;
        previousOutput = response;
      }
      return {
        type: 'sequential',
        steps: employeeIds.map((id, i) => ({
          step: i + 1,
          agent: EMPLOYEE_NAMES[id],
          role: EMPLOYEE_JOB_MAP[id],
          output: agentOutputs[id],
        })),
        finalOutput: agentOutputs[employeeIds[employeeIds.length - 1]],
      };
    }

    case 'parallel': {
      // Execute all agents simultaneously
      const promises = employeeIds.map(async (empId) => {
        const jobType = EMPLOYEE_JOB_MAP[empId];
        const prompt = `${ROLE_SYSTEM_PROMPTS[jobType]}\n\nYou are ${EMPLOYEE_NAMES[empId]}. Analyze this task from your ${jobType} perspective:\n\n${task}\n\nProvide your expert analysis and recommendations.`;
        const response = await callLLMForAgent(provider, apiKey, prompt, task);
        return { empId, response };
      });

      const results = await Promise.all(promises);
      results.forEach(r => { agentOutputs[r.empId] = r.response; });

      // Synthesize parallel outputs
      const synthesisPrompt = `You are a team coordinator. Multiple AI agents have analyzed the same task from different perspectives. Synthesize their outputs into a cohesive summary:\n\n${results.map(r => `**${EMPLOYEE_NAMES[r.empId]} (${EMPLOYEE_JOB_MAP[r.empId]}):**\n${r.response}`).join('\n\n---\n\n')}\n\nCreate a unified synthesis that combines the best insights from each perspective.`;

      const synthesis = await callLLMForAgent(provider, apiKey, synthesisPrompt, 'synthesize');

      return {
        type: 'parallel',
        agentOutputs: employeeIds.map(id => ({
          agent: EMPLOYEE_NAMES[id],
          role: EMPLOYEE_JOB_MAP[id],
          output: agentOutputs[id],
        })),
        synthesis,
      };
    }

    case 'debate': {
      const rounds: any[] = [];
      let context = task;

      // 3 rounds of debate
      for (let round = 1; round <= 3; round++) {
        const roundOutputs: any[] = [];
        for (const empId of employeeIds) {
          const jobType = EMPLOYEE_JOB_MAP[empId];
          const prompt = `${ROLE_SYSTEM_PROMPTS[jobType]}\n\nYou are ${EMPLOYEE_NAMES[empId]} in round ${round} of a structured debate.\n\nOriginal question: ${task}\n\n${round > 1 ? `Previous round discussion:\n${context}\n\n` : ''}Present your perspective from a ${jobType} standpoint. ${round > 1 ? 'Respond to other agents\' points, agree or disagree with specific reasoning.' : 'Give your initial position with supporting arguments.'}`;

          const response = await callLLMForAgent(provider, apiKey, prompt, task);
          roundOutputs.push({ agent: EMPLOYEE_NAMES[empId], role: jobType, argument: response });
        }
        rounds.push({ round, contributions: roundOutputs });
        context = roundOutputs.map(o => `${o.agent}: ${o.argument}`).join('\n\n');
      }

      // Final synthesis
      const verdictPrompt = `You are a neutral moderator. After 3 rounds of debate between AI agents, synthesize the key arguments and provide a balanced conclusion:\n\n${JSON.stringify(rounds, null, 2)}\n\nProvide:\n1. Key points of agreement\n2. Key points of disagreement\n3. Your recommended approach based on the strongest arguments`;
      const verdict = await callLLMForAgent(provider, apiKey, verdictPrompt, 'conclude');

      return { type: 'debate', rounds, verdict };
    }

    case 'review_chain': {
      // First agent creates, others review
      const creator = employeeIds[0];
      const reviewers = employeeIds.slice(1);

      const creatorPrompt = `${ROLE_SYSTEM_PROMPTS[EMPLOYEE_JOB_MAP[creator]]}\n\nYou are ${EMPLOYEE_NAMES[creator]}. Create a thorough response to:\n\n${task}`;
      const creation = await callLLMForAgent(provider, apiKey, creatorPrompt, task);

      const reviews: any[] = [];
      let currentVersion = creation;

      for (const reviewerId of reviewers) {
        const jobType = EMPLOYEE_JOB_MAP[reviewerId];
        const reviewPrompt = `${ROLE_SYSTEM_PROMPTS[jobType]}\n\nYou are ${EMPLOYEE_NAMES[reviewerId]} reviewing work from your ${jobType} perspective.\n\nOriginal task: ${task}\n\nCurrent version:\n${currentVersion}\n\nProvide:\n1. What works well\n2. Issues or improvements needed\n3. Your revised version incorporating the improvements`;

        const review = await callLLMForAgent(provider, apiKey, reviewPrompt, task);
        reviews.push({ reviewer: EMPLOYEE_NAMES[reviewerId], role: jobType, review });
        currentVersion = review;
      }

      return {
        type: 'review_chain',
        creator: { agent: EMPLOYEE_NAMES[creator], role: EMPLOYEE_JOB_MAP[creator], output: creation },
        reviews,
        finalVersion: currentVersion,
      };
    }

    case 'swarm':
    default: {
      // Swarm: each agent picks sub-tasks based on their expertise
      const decompositionPrompt = `Break down this task into ${employeeIds.length} sub-tasks, one for each specialist:\n\n${task}\n\nSpecialists available:\n${employeeIds.map(id => `- ${EMPLOYEE_NAMES[id]} (${EMPLOYEE_JOB_MAP[id]})`).join('\n')}\n\nReturn a JSON array of sub-tasks: [{"agentId": "...", "subtask": "..."}]`;

      let subtasks: Array<{ agentId: string; subtask: string }>;
      try {
        const decomposition = await callLLMForAgent(provider, apiKey, decompositionPrompt, 'decompose');
        const jsonMatch = decomposition.match(/\[[\s\S]*\]/);
        subtasks = jsonMatch ? JSON.parse(jsonMatch[0]) : employeeIds.map((id, i) => ({ agentId: id, subtask: `Part ${i + 1} of: ${task}` }));
      } catch {
        subtasks = employeeIds.map((id, i) => ({ agentId: id, subtask: `Part ${i + 1} of: ${task}` }));
      }

      // Execute sub-tasks in parallel
      const swarmResults = await Promise.all(subtasks.map(async (st) => {
        const empId = st.agentId;
        const jobType = EMPLOYEE_JOB_MAP[empId] || 'software-engineer';
        const prompt = `${ROLE_SYSTEM_PROMPTS[jobType]}\n\nYou are ${EMPLOYEE_NAMES[empId] || empId} in a swarm collaboration. Your assigned sub-task:\n\n${st.subtask}\n\nProvide a thorough response.`;
        const output = await callLLMForAgent(provider, apiKey, prompt, st.subtask);
        return { agent: EMPLOYEE_NAMES[empId] || empId, role: jobType, subtask: st.subtask, output };
      }));

      return {
        type: 'swarm',
        subtasks: swarmResults,
        agentCount: employeeIds.length,
      };
    }
  }
}

async function callLLMForAgent(provider: string, apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        temperature: 0.5,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });
    if (!res.ok) throw new Error(`Claude error: ${res.status}`);
    const data = await res.json() as any;
    return data.content?.[0]?.text || 'No response generated';
  } else {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4096,
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || 'No response generated';
  }
}

// ── Simulated Collaboration (no API key) ──

function simulateCollaboration(workflow: string, employeeIds: string[], task: string): any {
  const agents = employeeIds.map(id => ({
    id,
    name: EMPLOYEE_NAMES[id] || id,
    role: EMPLOYEE_JOB_MAP[id] || 'general',
  }));

  const topic = task.split(' ').slice(0, 5).join(' ');

  switch (workflow) {
    case 'sequential':
      return {
        type: 'sequential',
        status: 'simulated',
        steps: agents.map((a, i) => ({
          step: i + 1,
          agent: a.name,
          role: a.role,
          output: `[${a.name}] Step ${i + 1} analysis of "${topic}" from ${a.role} perspective. Connect an LLM API key for real multi-agent collaboration.`,
        })),
        message: 'Sequential pipeline simulated. Add a Claude or OpenAI API key for real multi-agent execution.',
      };

    case 'parallel':
      return {
        type: 'parallel',
        status: 'simulated',
        agentOutputs: agents.map(a => ({
          agent: a.name,
          role: a.role,
          output: `[${a.name}] Parallel analysis of "${topic}" from ${a.role} perspective.`,
        })),
        synthesis: `Combined insights from ${agents.length} agents on "${topic}". Connect an API key for real synthesis.`,
        message: 'Parallel execution simulated.',
      };

    case 'debate':
      return {
        type: 'debate',
        status: 'simulated',
        rounds: [1, 2, 3].map(round => ({
          round,
          contributions: agents.map(a => ({
            agent: a.name,
            role: a.role,
            argument: `[Round ${round}] ${a.name}'s ${a.role} perspective on "${topic}".`,
          })),
        })),
        verdict: `Synthesized debate conclusion after 3 rounds between ${agents.length} agents.`,
        message: 'Debate simulated.',
      };

    case 'review_chain':
      return {
        type: 'review_chain',
        status: 'simulated',
        creator: { agent: agents[0].name, role: agents[0].role, output: `Initial creation by ${agents[0].name}.` },
        reviews: agents.slice(1).map(a => ({
          reviewer: a.name,
          role: a.role,
          review: `Review feedback from ${a.name} (${a.role}).`,
        })),
        finalVersion: 'Final reviewed version. Connect an API key for real review chain.',
        message: 'Review chain simulated.',
      };

    case 'swarm':
    default:
      return {
        type: 'swarm',
        status: 'simulated',
        subtasks: agents.map(a => ({
          agent: a.name,
          role: a.role,
          subtask: `Sub-task for ${a.role}: Handle ${a.role}-specific aspects of "${topic}"`,
          output: `[${a.name}] Sub-task output.`,
        })),
        agentCount: agents.length,
        message: 'Swarm collaboration simulated.',
      };
  }
}

// ── Template & Capability Endpoints ──

async function handleListTemplates(): Promise<Response> {
  return json({
    success: true,
    data: COLLABORATION_TEMPLATES.map(t => ({
      ...t,
      agents: t.employeeIds.map(id => ({
        id,
        name: EMPLOYEE_NAMES[id],
        role: EMPLOYEE_JOB_MAP[id],
      })),
    })),
  });
}

async function handleListWorkflows(): Promise<Response> {
  return json({
    success: true,
    data: WORKFLOW_DEFINITIONS,
  });
}

async function handleCollaborationStatus(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const collabId = url.searchParams.get('id');

  if (!collabId) {
    return json({ error: 'id query param required' }, 400);
  }

  const collab = await env.DB.prepare(
    'SELECT * FROM agent_collaborations WHERE id = ? AND user_id = ?'
  ).bind(collabId, userId).first<any>();

  if (!collab) {
    return json({ error: 'Collaboration not found' }, 404);
  }

  return json({
    success: true,
    data: {
      id: collab.id,
      name: collab.name,
      workflow: collab.workflow,
      status: collab.status,
      employeeIds: JSON.parse(collab.employee_ids),
      result: collab.result ? JSON.parse(collab.result) : null,
      createdAt: collab.created_at,
      completedAt: collab.completed_at,
    },
  });
}

async function handleCollaborationHistory(env: Env, userId: string): Promise<Response> {
  const history = await env.DB.prepare(
    'SELECT id, name, description, workflow, status, employee_ids, created_at, completed_at FROM agent_collaborations WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(userId).all<any>();

  return json({
    success: true,
    data: (history.results || []).map((h: any) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      workflow: h.workflow,
      status: h.status,
      agents: JSON.parse(h.employee_ids).map((id: string) => ({
        id,
        name: EMPLOYEE_NAMES[id],
        role: EMPLOYEE_JOB_MAP[id],
      })),
      createdAt: h.created_at,
      completedAt: h.completed_at,
    })),
  });
}

async function handleCapabilities(): Promise<Response> {
  const capabilities: Record<string, { name: string; role: string; strengths: string[]; bestFor: string[] }> = {};

  for (const [empId, jobType] of Object.entries(EMPLOYEE_JOB_MAP)) {
    capabilities[empId] = {
      name: EMPLOYEE_NAMES[empId],
      role: jobType,
      strengths: getAgentStrengths(jobType),
      bestFor: getAgentBestFor(jobType),
    };
  }

  return json({
    success: true,
    data: {
      agents: capabilities,
      workflows: WORKFLOW_DEFINITIONS,
      templates: COLLABORATION_TEMPLATES.length,
      competitiveMoat: {
        feature: 'Multi-Agent Collaboration',
        description: 'NexusHR uniquely enables multiple AI employees to collaborate using structured workflows — sequential pipelines, parallel analysis, structured debates, review chains, and agent swarms.',
        differentiators: [
          'Role-specific system prompts ensure each agent brings genuine domain expertise',
          'Workflow orchestration handles complex multi-step processes automatically',
          'Shared context and memory across agents enables true collaboration',
          'Pre-built templates for common business workflows',
          'Supports both real LLM-powered and simulated execution',
        ],
      },
    },
  });
}

function getAgentStrengths(jobType: string): string[] {
  const strengths: Record<string, string[]> = {
    'software-engineer': ['Code generation', 'Architecture design', 'Bug fixing', 'Performance optimization', 'Testing'],
    'marketing-manager': ['Campaign strategy', 'Content planning', 'Analytics interpretation', 'Brand messaging', 'Growth hacking'],
    'sales-representative': ['Prospecting', 'Objection handling', 'Pipeline management', 'Proposal writing', 'Closing strategies'],
    'customer-support': ['Issue triage', 'Customer communication', 'Troubleshooting', 'Knowledge base', 'Escalation management'],
    'data-analyst': ['SQL queries', 'Statistical analysis', 'Data visualization', 'Report generation', 'Trend analysis'],
    'content-writer': ['Blog posts', 'Social media', 'Email copy', 'SEO optimization', 'Brand voice'],
    'product-manager': ['PRD writing', 'Roadmap planning', 'Prioritization', 'Stakeholder communication', 'Sprint planning'],
    'designer': ['UI design', 'UX audits', 'Accessibility', 'Design systems', 'Prototyping'],
  };
  return strengths[jobType] || ['General analysis'];
}

function getAgentBestFor(jobType: string): string[] {
  const bestFor: Record<string, string[]> = {
    'software-engineer': ['Technical architecture', 'Code reviews', 'API design', 'DevOps'],
    'marketing-manager': ['Go-to-market strategy', 'Campaign optimization', 'Market research'],
    'sales-representative': ['Deal strategy', 'Competitive analysis', 'Customer outreach'],
    'customer-support': ['Issue resolution', 'Process improvement', 'Customer satisfaction'],
    'data-analyst': ['Business intelligence', 'Data modeling', 'Forecasting'],
    'content-writer': ['Content strategy', 'Editorial planning', 'Thought leadership'],
    'product-manager': ['Product strategy', 'Feature prioritization', 'User research synthesis'],
    'designer': ['Design critique', 'User experience', 'Visual design'],
  };
  return bestFor[jobType] || ['General tasks'];
}
