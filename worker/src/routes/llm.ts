/**
 * LLM API Proxy — Routes chat messages to Claude or GPT-4
 * with role-specific system prompts, memory context, and fallback logic.
 */
import type { Env } from '../index';
import { json, generateId, parseBody, ROLE_SYSTEM_PROMPTS, EMPLOYEE_JOB_MAP, EMPLOYEE_NAMES, ROLE_MODEL_CONFIG } from '../lib/helpers';

interface ChatRequest {
  employeeId: string;
  message: string;
  history?: Array<{ from: string; text: string }>;
  model?: string; // override
  stream?: boolean;
}

export async function handleLLM(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  if (path === '/api/llm/chat' && request.method === 'POST') {
    return handleChat(request, env, userId);
  }
  if (path === '/api/llm/models' && request.method === 'GET') {
    return handleListModels(env, userId);
  }
  if (path === '/api/llm/config' && request.method === 'GET') {
    return handleGetConfig(env, userId);
  }
  if (path === '/api/llm/config' && request.method === 'PUT') {
    return handleUpdateConfig(request, env, userId);
  }
  if (path === '/api/llm/keys' && request.method === 'POST') {
    return handleSetApiKey(request, env, userId);
  }
  if (path === '/api/llm/keys' && request.method === 'GET') {
    return handleListApiKeys(env, userId);
  }
  if (path === '/api/llm/keys' && request.method === 'DELETE') {
    return handleDeleteApiKey(request, env, userId);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleChat(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<ChatRequest>(request);
  const { employeeId, message, history = [] } = body;

  if (!employeeId || !message) {
    return json({ error: 'employeeId and message are required' }, 400);
  }

  const jobType = EMPLOYEE_JOB_MAP[employeeId];
  if (!jobType) {
    return json({ error: `Unknown employee: ${employeeId}` }, 400);
  }

  const employeeName = EMPLOYEE_NAMES[employeeId] || employeeId;
  const modelConfig = ROLE_MODEL_CONFIG[jobType];
  const systemPrompt = ROLE_SYSTEM_PROMPTS[jobType];

  // Load conversation memory from D1
  const memory = await env.DB.prepare(
    'SELECT topics, preferences, summary FROM conversation_memories WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<any>();

  // Build enriched system prompt with memory context
  let enrichedPrompt = `${systemPrompt}\n\nYour name is ${employeeName}. You work at NexusHR as an AI employee.`;
  if (memory?.summary) {
    enrichedPrompt += `\n\nConversation context from previous sessions:\n${memory.summary}`;
  }
  if (memory?.topics) {
    try {
      const topics = JSON.parse(memory.topics);
      if (topics.length > 0) {
        enrichedPrompt += `\nPreviously discussed topics: ${topics.slice(-10).join(', ')}`;
      }
    } catch {}
  }

  // Try to get user's API key for the provider
  const requestedModel = body.model || modelConfig.primary;
  const provider = getProvider(requestedModel);
  const apiKey = await env.API_KEYS.get(`${userId}:${provider}`);

  let response: string;
  let modelUsed: string;
  let tokensUsed = 0;
  let latencyMs = 0;
  const startTime = Date.now();

  if (apiKey) {
    // Real LLM API call
    try {
      const result = await callLLM(provider, apiKey, requestedModel, enrichedPrompt, message, history, modelConfig);
      response = result.response;
      modelUsed = requestedModel;
      tokensUsed = result.tokensUsed;
      latencyMs = Date.now() - startTime;
    } catch (err: any) {
      // Try fallback model
      const fallbackProvider = getProvider(modelConfig.fallback);
      const fallbackKey = await env.API_KEYS.get(`${userId}:${fallbackProvider}`);

      if (fallbackKey) {
        try {
          const result = await callLLM(fallbackProvider, fallbackKey, modelConfig.fallback, enrichedPrompt, message, history, modelConfig);
          response = result.response;
          modelUsed = modelConfig.fallback;
          tokensUsed = result.tokensUsed;
          latencyMs = Date.now() - startTime;
        } catch {
          response = generateFallbackResponse(employeeName, jobType, message);
          modelUsed = 'local-fallback';
          latencyMs = Date.now() - startTime;
        }
      } else {
        response = generateFallbackResponse(employeeName, jobType, message);
        modelUsed = 'local-fallback';
        latencyMs = Date.now() - startTime;
      }
    }
  } else {
    // No API key — use intelligent local response generation
    response = generateFallbackResponse(employeeName, jobType, message);
    modelUsed = 'local-engine';
    latencyMs = Date.now() - startTime;
  }

  // Save message to D1
  const userMsgId = generateId('msg');
  const aiMsgId = generateId('msg');

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO chat_messages (id, user_id, employee_id, sender, text, intent, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(userMsgId, userId, employeeId, 'user', message, detectIntent(message)),
    env.DB.prepare(
      'INSERT INTO chat_messages (id, user_id, employee_id, sender, text, llm_model, tokens_used, latency_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(aiMsgId, userId, employeeId, 'ai', response, modelUsed, tokensUsed, latencyMs),
  ]);

  // Update conversation memory
  const topic = extractTopic(message);
  await env.DB.prepare(
    `INSERT INTO conversation_memories (id, user_id, employee_id, topics, total_messages, summary, last_interaction)
     VALUES (?, ?, ?, ?, 2, ?, datetime('now'))
     ON CONFLICT(user_id, employee_id)
     DO UPDATE SET
       topics = json_insert(topics, '$[#]', ?),
       total_messages = total_messages + 2,
       summary = ?,
       last_interaction = datetime('now')`
  ).bind(
    generateId('mem'), userId, employeeId,
    JSON.stringify([topic]), `Discussed: ${topic}`,
    topic, `Last discussed: ${topic}`
  ).run();

  // Track usage
  const today = new Date().toISOString().split('T')[0];
  await env.DB.prepare(
    `INSERT INTO usage_records (id, user_id, date, tasks, compute_hours, cost, llm_tokens)
     VALUES (?, ?, ?, 1, 0.02, 0.03, ?)
     ON CONFLICT(user_id, date)
     DO UPDATE SET tasks = tasks + 1, compute_hours = compute_hours + 0.02, cost = cost + 0.03, llm_tokens = llm_tokens + ?`
  ).bind(generateId('usg'), userId, today, tokensUsed, tokensUsed).run();

  return json({
    success: true,
    data: {
      response,
      model: modelUsed,
      employeeId,
      employeeName,
      intent: detectIntent(message),
      tokensUsed,
      latencyMs,
      messageIds: { user: userMsgId, ai: aiMsgId },
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateId('req'),
      hasApiKey: !!apiKey,
      provider,
    },
  });
}

// ── Real LLM API Calls ──

async function callLLM(
  provider: string, apiKey: string, model: string,
  systemPrompt: string, userMessage: string,
  history: Array<{ from: string; text: string }>,
  config: { temperature: number; maxTokens: number }
): Promise<{ response: string; tokensUsed: number }> {

  if (provider === 'anthropic') {
    return callClaude(apiKey, model, systemPrompt, userMessage, history, config);
  } else if (provider === 'openai') {
    return callOpenAI(apiKey, model, systemPrompt, userMessage, history, config);
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

async function callClaude(
  apiKey: string, model: string, systemPrompt: string,
  userMessage: string, history: Array<{ from: string; text: string }>,
  config: { temperature: number; maxTokens: number }
): Promise<{ response: string; tokensUsed: number }> {

  const messages = [
    ...history.slice(-20).map(h => ({
      role: h.from === 'user' ? 'user' as const : 'assistant' as const,
      content: h.text,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json() as any;
  return {
    response: data.content?.[0]?.text || 'I apologize, I could not generate a response.',
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

async function callOpenAI(
  apiKey: string, model: string, systemPrompt: string,
  userMessage: string, history: Array<{ from: string; text: string }>,
  config: { temperature: number; maxTokens: number }
): Promise<{ response: string; tokensUsed: number }> {

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.slice(-20).map(h => ({
      role: h.from === 'user' ? 'user' as const : 'assistant' as const,
      content: h.text,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json() as any;
  return {
    response: data.choices?.[0]?.message?.content || 'I apologize, I could not generate a response.',
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

// ── Intelligent Fallback Response (no API key needed) ──

function generateFallbackResponse(name: string, jobType: string, message: string): string {
  const topic = extractTopic(message);
  const intent = detectIntent(message);

  const greetings: Record<string, string> = {
    'software-engineer': `Hey! I'm ${name}, your AI software engineer. I'm running on NexusHR's local engine right now. For full LLM-powered responses with real code execution, add your Claude or OpenAI API key in Settings > Integrations.\n\nThat said, I can still help with architecture discussions, code reviews, and technical planning. What are you working on?`,
    'marketing-manager': `Hi there! I'm ${name}, your AI marketing manager. I'm currently using NexusHR's built-in response engine. Connect a Claude or GPT-4 API key for full campaign generation, analytics, and strategic planning.\n\nIn the meantime, I can help brainstorm campaign ideas and marketing strategies. What's on your agenda?`,
    'sales-representative': `Hey! ${name} here, your AI sales rep. I'm running in local mode — connect an LLM API key for full prospecting, outreach generation, and pipeline analysis.\n\nI can still help with sales strategy and talk tracks. What deals are you working?`,
    'customer-support': `Hello! I'm ${name}, your AI support specialist. For full ticket resolution and customer communication drafting, please add an API key in Settings.\n\nI can still help triage issues and plan support responses. What's the situation?`,
    'data-analyst': `Hi! I'm ${name}, your AI data analyst. For full SQL generation, statistical analysis, and visualization design, connect a Claude or GPT-4 API key.\n\nI can still help with analytical frameworks and data strategy. What data challenge are you facing?`,
    'content-writer': `Hey! ${name} here, your AI content writer. Connect an LLM API key for full blog posts, social copy, and content strategy.\n\nI'm ready to brainstorm content ideas and plan your editorial calendar. What topic should we explore?`,
    'product-manager': `Hi! I'm ${name}, your AI product manager. For full PRD writing, roadmap generation, and prioritization analysis, add a Claude or GPT-4 API key.\n\nI can still help with product strategy and planning frameworks. What are we building?`,
    'designer': `Hello! ${name} here, your AI designer. For full design critiques, accessibility audits, and UX recommendations, connect an LLM API key.\n\nI can help with design system discussions and UX principles. What are you designing?`,
  };

  if (intent === 'greeting') {
    return greetings[jobType] || `Hi! I'm ${name}. How can I help you today?`;
  }

  // For non-greeting messages, provide role-aware responses
  const responses: Record<string, string> = {
    'software-engineer': `I'm analyzing your request about "${topic}". Here's my technical assessment:\n\n**Architecture Considerations:**\n- This touches the ${topic} system which typically involves API design, data modeling, and frontend integration\n- Key patterns to consider: separation of concerns, proper error handling, and testing\n- Recommended stack: TypeScript + React for frontend, Cloudflare Workers for backend\n\n**Next Steps:**\n1. Define the data models and API contracts\n2. Implement the backend endpoints with proper validation\n3. Build the frontend components with error states\n4. Write integration tests\n\n*For full code generation with real implementations, connect your Claude or GPT-4 API key in Settings > Integrations.*`,

    'marketing-manager': `Great question about "${topic}"! Here's my marketing analysis:\n\n**Strategic Assessment:**\n- Market positioning: Focus on differentiation through ${topic}\n- Target audience: Decision makers who care about efficiency and ROI\n- Channel strategy: Content marketing + paid social + email nurture\n\n**Recommended Campaign Framework:**\n1. **Awareness:** Educational content around ${topic}\n2. **Consideration:** Case studies and comparison content\n3. **Decision:** Product demos and free trials\n\n**KPIs to Track:** CAC, LTV, conversion rate, engagement rate\n\n*For full campaign generation with specific copy and creative, add your API key in Settings.*`,

    'sales-representative': `Let me break down the sales angle for "${topic}":\n\n**Opportunity Assessment:**\n- This fits our ICP for companies looking to optimize ${topic}\n- Typical deal size: $5K-50K ARR depending on team size\n- Sales cycle: 14-30 days for SMB, 60-90 days for enterprise\n\n**Outreach Strategy:**\n1. Personalized email touching on their specific ${topic} challenge\n2. LinkedIn engagement + connection request\n3. Follow-up with case study or ROI calculator\n4. Discovery call to qualify and understand needs\n\n*For full outreach sequence generation, connect your LLM API key.*`,

    'customer-support': `I'm reviewing the ${topic} issue. Here's my triage:\n\n**Priority Assessment:**\n- Category: Product/Technical\n- Severity: Needs investigation\n- SLA: Standard response time\n\n**Troubleshooting Steps:**\n1. Reproduce the issue in a controlled environment\n2. Check recent changes or deployments that may be related\n3. Review error logs for related entries\n4. Identify workaround if permanent fix requires development\n\n**Suggested Customer Response:**\n"Thank you for reporting this. We're investigating and will update you shortly."\n\n*For full AI-powered ticket resolution, add your API key in Settings.*`,

    'data-analyst': `Analyzing your request about "${topic}":\n\n**Analytical Approach:**\n- Data source: Identify relevant tables and joins\n- Methodology: Descriptive stats → trend analysis → segmentation\n- Output: Dashboard or report with actionable insights\n\n**Suggested SQL Framework:**\n\`\`\`sql\n-- Start with a CTE for the base data\nWITH base_data AS (\n  SELECT *\n  FROM relevant_table\n  WHERE date_column >= DATEADD(month, -3, GETDATE())\n)\nSELECT\n  dimension,\n  COUNT(*) as volume,\n  AVG(metric) as avg_metric\nFROM base_data\nGROUP BY dimension\nORDER BY volume DESC;\n\`\`\`\n\n*For full query generation with your actual schema, connect your API key.*`,

    'content-writer': `Here's my content plan for "${topic}":\n\n**Content Strategy:**\n- Format: Long-form guide (2,000-3,000 words)\n- Angle: Comprehensive + data-driven\n- Target keyword: "${topic}" and related terms\n- Search intent: Informational → Commercial\n\n**Outline:**\n1. Introduction — Hook with surprising statistic\n2. The Problem — Why ${topic} matters now\n3. The Solution — Framework for success\n4. Case Studies — Real examples with metrics\n5. Implementation Guide — Step-by-step\n6. Conclusion — CTA and next steps\n\n*For full content generation with SEO optimization, add your API key.*`,

    'product-manager': `Product analysis for "${topic}":\n\n**Problem Statement:**\nUsers need better ${topic} capabilities to improve their workflow efficiency.\n\n**RICE Prioritization:**\n- Reach: Medium-High (affects 60-70% of users)\n- Impact: High (directly tied to core value prop)\n- Confidence: Medium (need user validation)\n- Effort: Medium (2-3 sprint estimate)\n- **RICE Score: ~65**\n\n**Recommended Approach:**\n1. Validate with 5 customer interviews\n2. Write lightweight PRD with clear success metrics\n3. Prototype and test with beta users\n4. Ship MVP, iterate based on data\n\n*For full PRD generation and roadmap planning, connect your API key.*`,

    'designer': `Design review for "${topic}":\n\n**UX Assessment:**\n- Information Architecture: Consider how ${topic} fits into existing navigation\n- Visual Hierarchy: Primary actions should be immediately visible\n- Accessibility: Ensure WCAG 2.1 AA compliance\n\n**Design Recommendations:**\n1. Use consistent spacing (8px grid system)\n2. Clear visual feedback for all interactions\n3. Mobile-first responsive design\n4. Loading and empty states for all views\n5. Error states with recovery actions\n\n**Design Tokens to Apply:**\n- Colors: Primary brand + semantic (success/warning/error)\n- Typography: 16px base, 1.5 line-height\n- Spacing: 4/8/12/16/24/32/48px scale\n\n*For full design critiques with mockup annotations, add your API key.*`,
  };

  return responses[jobType] || `I'll work on "${topic}" for you. For enhanced AI responses, connect your API key in Settings > Integrations.`;
}

// ── API Key Management ──

async function handleSetApiKey(request: Request, env: Env, userId: string): Promise<Response> {
  const { provider, apiKey } = await parseBody<{ provider: string; apiKey: string }>(request);

  if (!provider || !apiKey) {
    return json({ error: 'provider and apiKey are required' }, 400);
  }

  const validProviders = ['anthropic', 'openai'];
  if (!validProviders.includes(provider)) {
    return json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` }, 400);
  }

  // Store encrypted key in KV
  await env.API_KEYS.put(`${userId}:${provider}`, apiKey);

  // Store key preview in D1 (last 4 chars)
  const preview = `...${apiKey.slice(-4)}`;
  await env.DB.prepare(
    `INSERT INTO api_keys (id, user_id, provider, key_hash, key_preview, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET key_hash = ?, key_preview = ?, is_active = 1`
  ).bind(
    `${userId}:${provider}`, userId, provider, 'stored_in_kv', preview,
    'stored_in_kv', preview
  ).run();

  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId('aud'), userId, 'api_key_set', userId, provider, `API key set for ${provider}`).run();

  return json({ success: true, provider, preview });
}

async function handleListApiKeys(env: Env, userId: string): Promise<Response> {
  const keys = await env.DB.prepare(
    'SELECT provider, key_preview, is_active, created_at FROM api_keys WHERE user_id = ?'
  ).bind(userId).all<any>();

  return json({
    success: true,
    data: keys.results?.map((k: any) => ({
      provider: k.provider,
      preview: k.key_preview,
      isActive: k.is_active === 1,
      createdAt: k.created_at,
    })) || [],
  });
}

async function handleDeleteApiKey(request: Request, env: Env, userId: string): Promise<Response> {
  const { provider } = await parseBody<{ provider: string }>(request);
  await env.API_KEYS.delete(`${userId}:${provider}`);
  await env.DB.prepare('DELETE FROM api_keys WHERE user_id = ? AND provider = ?').bind(userId, provider).run();
  return json({ success: true });
}

async function handleListModels(env: Env, userId: string): Promise<Response> {
  const hasAnthropic = !!(await env.API_KEYS.get(`${userId}:anthropic`));
  const hasOpenAI = !!(await env.API_KEYS.get(`${userId}:openai`));

  const models = [
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'anthropic', available: hasAnthropic },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', provider: 'anthropic', available: hasAnthropic },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'anthropic', available: hasAnthropic },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', available: hasOpenAI },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', available: hasOpenAI },
  ];

  return json({ success: true, data: models });
}

async function handleGetConfig(env: Env, userId: string): Promise<Response> {
  return json({ success: true, data: ROLE_MODEL_CONFIG });
}

async function handleUpdateConfig(request: Request, env: Env, userId: string): Promise<Response> {
  // In production, this would update per-user model configs
  const config = await parseBody(request);
  await env.CACHE.put(`config:${userId}`, JSON.stringify(config));
  return json({ success: true });
}

// ── Utility Functions ──

function getProvider(model: string): string {
  if (model.startsWith('claude') || model.startsWith('anthropic')) return 'anthropic';
  if (model.startsWith('gpt') || model.startsWith('openai')) return 'openai';
  return 'anthropic'; // default
}

function detectIntent(msg: string): string {
  const lower = msg.toLowerCase().trim();
  if (/^(hi|hey|hello|good\s(morning|afternoon|evening))\b/i.test(lower)) return 'greeting';
  if (/\b(bye|goodbye|see\syou)\b/i.test(lower)) return 'farewell';
  if (/\b(code|implement|build|function|api|deploy|refactor)\b/i.test(lower)) return 'code';
  if (/\b(bug|fix|error|broken|crash|debug)\b/i.test(lower)) return 'debug';
  if (/\b(campaign|launch|promote|ads?)\b/i.test(lower)) return 'campaign';
  if (/\b(outreach|prospect|lead|pipeline|deal)\b/i.test(lower)) return 'outreach';
  if (/\b(ticket|support|customer\sissue)\b/i.test(lower)) return 'ticket';
  if (/\b(report|summary|analysis|dashboard)\b/i.test(lower)) return 'report';
  if (/\b(design|mockup|wireframe|prototype)\b/i.test(lower)) return 'design_review';
  if (/\b(roadmap|feature|prioriti|backlog)\b/i.test(lower)) return 'roadmap';
  if (/^(what|how|why|when|where|who)\b/i.test(lower)) return 'question';
  if (/\b(please|can\syou|create|make|write)\b/i.test(lower)) return 'request';
  return 'general';
}

function extractTopic(msg: string): string {
  const stopWords = new Set(['what', 'how', 'can', 'you', 'the', 'this', 'that', 'please', 'help', 'with', 'about', 'i', 'me', 'my', 'we', 'a', 'an', 'and', 'for', 'to', 'of', 'in', 'on', 'is', 'are']);
  const words = msg.replace(/[^\w\s-]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
  return words.slice(0, 3).join(' ') || 'the project';
}
