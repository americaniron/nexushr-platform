/**
 * NLU (Natural Language Understanding) Route — Server-side AI brain
 *
 * Replaces regex intent detection with LLM-based classification,
 * adds transformer-quality sentiment analysis, RAG context retrieval,
 * conversation state machine, and tone consistency validation.
 */
import type { Env } from '../index';
import { json, generateId, parseBody, EMPLOYEE_JOB_MAP, EMPLOYEE_NAMES, ROLE_SYSTEM_PROMPTS, ROLE_MODEL_CONFIG } from '../lib/helpers';
import { buildFullSystemPrompt, manageContextWindow } from '../lib/prompt-engine';
import { runInputGuardrails, runOutputGuardrails } from '../lib/guardrails';

// ── Types ──

interface NLURequest {
  employeeId: string;
  message: string;
  history?: Array<{ from: string; text: string }>;
  conversationState?: ConversationState;
}

interface ConversationState {
  currentTask?: { id: string; description: string; status: string; step: number; totalSteps: number };
  pendingClarifications?: string[];
  context: Record<string, any>;
  turnCount: number;
  lastIntent?: string;
  lastSentiment?: number;
}

interface NLUResult {
  intent: { primary: string; confidence: number; secondary?: string; reasoning: string };
  sentiment: { score: number; label: string; emotion: string; confidence: number };
  entities: Array<{ type: string; value: string; salience: number }>;
  topic: string;
  ragContext: string;
  conversationState: ConversationState;
  toneGuidance: { modifier: string; avoid: string[]; apply: string[] };
  response?: string;
}

// ── Main Router ──

export async function handleNLU(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  if (path === '/api/nlu/analyze' && request.method === 'POST') {
    return handleAnalyze(request, env, userId);
  }
  if (path === '/api/nlu/generate' && request.method === 'POST') {
    return handleGenerate(request, env, userId);
  }
  if (path === '/api/nlu/state' && request.method === 'GET') {
    return handleGetState(request, env, userId);
  }
  return json({ error: 'Not found' }, 404);
}

// ── Full NLU Analysis ──

async function handleAnalyze(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<NLURequest>(request);
  const { employeeId, message, history = [], conversationState } = body;

  if (!employeeId || !message) {
    return json({ error: 'employeeId and message are required' }, 400);
  }

  const jobType = EMPLOYEE_JOB_MAP[employeeId];
  if (!jobType) return json({ error: `Unknown employee: ${employeeId}` }, 400);

  const startTime = Date.now();

  // ── INPUT GUARDRAILS ──
  const inputGuard = runInputGuardrails(message);
  if (inputGuard.blocked) {
    // Log and return blocked response
    await env.DB.prepare(
      'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(generateId('aud'), userId, 'input_blocked', userId, employeeId, inputGuard.blockReason || 'Guardrail block').run();

    return json({
      success: true,
      data: {
        intent: { primary: 'general', confidence: 0, reasoning: 'Input blocked by guardrails' },
        sentiment: { score: 0, label: 'neutral', emotion: 'neutral', confidence: 0 },
        entities: [],
        topic: '',
        ragContext: '',
        conversationState: conversationState || { context: {}, turnCount: 0 },
        toneGuidance: { modifier: 'professional', avoid: [], apply: [] },
      },
      meta: { blocked: true, blockReason: inputGuard.blockReason },
    });
  }

  // Use sanitized message for NLU processing
  const safeMessage = inputGuard.sanitizedMessage;

  // Get API key for LLM-based NLU
  const modelConfig = ROLE_MODEL_CONFIG[jobType];
  const provider = getProvider(modelConfig.primary);
  const apiKey = await env.API_KEYS.get(`${userId}:${provider}`);

  // Run NLU pipeline
  let intent: NLUResult['intent'];
  let sentiment: NLUResult['sentiment'];
  let entities: NLUResult['entities'];
  let topic: string;

  if (apiKey) {
    // LLM-powered NLU (parallel calls for speed)
    const [intentResult, sentimentResult] = await Promise.all([
      classifyIntentLLM(apiKey, provider, modelConfig.primary, safeMessage, jobType, history),
      analyzeSentimentLLM(apiKey, provider, modelConfig.primary, safeMessage, history),
    ]);
    intent = intentResult;
    sentiment = sentimentResult;
    entities = extractEntitiesLLM(safeMessage);
    topic = entities.find(e => e.type === 'topic')?.value || extractTopicLocal(safeMessage);
  } else {
    // Enhanced local fallback (still much better than pure regex)
    intent = classifyIntentLocal(safeMessage, jobType, history);
    sentiment = analyzeSentimentLocal(safeMessage, history);
    entities = extractEntitiesLLM(safeMessage);
    topic = extractTopicLocal(safeMessage);
  }

  // RAG: Retrieve relevant context
  const ragContext = await buildRAGContext(env, userId, employeeId, message, topic, history);

  // Update conversation state machine
  const newState = updateConversationState(
    conversationState || { context: {}, turnCount: 0 },
    intent, sentiment, message, topic
  );

  // Tone consistency validation
  const toneGuidance = await validateToneConsistency(env, userId, employeeId, intent, sentiment, newState, history);

  const latencyMs = Date.now() - startTime;

  return json({
    success: true,
    data: {
      intent,
      sentiment,
      entities,
      topic,
      ragContext,
      conversationState: newState,
      toneGuidance,
    } as NLUResult,
    meta: { latencyMs, llmPowered: !!apiKey, requestId: generateId('nlu') },
  });
}

// ── Generate Response with Full NLU Context ──

async function handleGenerate(request: Request, env: Env, userId: string): Promise<Response> {
  const body = await parseBody<{
    employeeId: string;
    message: string;
    history?: Array<{ from: string; text: string }>;
    nluResult: NLUResult;
  }>(request);

  const { employeeId, message, history = [], nluResult } = body;
  const jobType = EMPLOYEE_JOB_MAP[employeeId];
  if (!jobType) return json({ error: `Unknown employee: ${employeeId}` }, 400);

  const employeeName = EMPLOYEE_NAMES[employeeId] || employeeId;
  const modelConfig = ROLE_MODEL_CONFIG[jobType];
  const provider = getProvider(modelConfig.primary);
  const apiKey = await env.API_KEYS.get(`${userId}:${provider}`);

  const startTime = Date.now();

  // Load personality config
  const personalityRow = await env.DB.prepare(
    'SELECT config FROM personality_configs WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<{ config: string }>();
  const personality = personalityRow ? JSON.parse(personalityRow.config) : null;

  // Load onboarding context
  const onboardingRow = await env.DB.prepare(
    'SELECT context FROM employee_onboarding WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<{ context: string }>();
  const companyContext = onboardingRow ? JSON.parse(onboardingRow.context) : null;

  // Build the FULL system prompt with prompt engineering (tool defs, output schemas, guardrails)
  const systemPrompt = buildFullSystemPrompt(
    jobType, employeeName, personality, companyContext,
    nluResult.ragContext, nluResult.toneGuidance
  );

  // Context window management — trim history if needed
  const { trimmedHistory, summary: historySummary, estimate: tokenEstimate } = manageContextWindow(
    systemPrompt, history, message, modelConfig.primary, modelConfig.maxTokens
  );

  // If we have a summary from trimmed history, prepend it
  const effectiveHistory = historySummary
    ? [{ from: 'ai' as const, text: `[Context summary from earlier conversation: ${historySummary}]` }, ...trimmedHistory]
    : trimmedHistory;

  let response: string;
  let modelUsed: string;
  let tokensUsed = 0;

  if (apiKey) {
    try {
      const result = await callLLM(provider, apiKey, modelConfig.primary, systemPrompt, message, effectiveHistory, modelConfig);
      response = result.response;
      modelUsed = modelConfig.primary;
      tokensUsed = result.tokensUsed;

      // Validate tone consistency of the response
      if (nluResult.toneGuidance.avoid.length > 0) {
        response = applyToneCorrection(response, nluResult.toneGuidance);
      }
    } catch {
      // Fallback
      const fallbackProvider = getProvider(modelConfig.fallback);
      const fallbackKey = await env.API_KEYS.get(`${userId}:${fallbackProvider}`);
      if (fallbackKey) {
        try {
          const result = await callLLM(fallbackProvider, fallbackKey, modelConfig.fallback, systemPrompt, message, effectiveHistory, modelConfig);
          response = result.response;
          modelUsed = modelConfig.fallback;
          tokensUsed = result.tokensUsed;
        } catch {
          response = generateContextualFallback(employeeName, jobType, nluResult);
          modelUsed = 'nlu-local';
        }
      } else {
        response = generateContextualFallback(employeeName, jobType, nluResult);
        modelUsed = 'nlu-local';
      }
    }
  } else {
    response = generateContextualFallback(employeeName, jobType, nluResult);
    modelUsed = 'nlu-local';
  }

  // ── OUTPUT GUARDRAILS ──
  const outputGuard = runOutputGuardrails(response);
  response = outputGuard.cleanedResponse;

  const latencyMs = Date.now() - startTime;

  // Save messages to D1
  const userMsgId = generateId('msg');
  const aiMsgId = generateId('msg');
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO chat_messages (id, user_id, employee_id, sender, text, intent, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(userMsgId, userId, employeeId, 'user', message, nluResult.intent.primary),
    env.DB.prepare(
      'INSERT INTO chat_messages (id, user_id, employee_id, sender, text, llm_model, tokens_used, latency_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))'
    ).bind(aiMsgId, userId, employeeId, 'ai', response, modelUsed, tokensUsed, latencyMs),
  ]);

  // Update conversation memory
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
    JSON.stringify([nluResult.topic]),
    `Discussed: ${nluResult.topic}. Intent: ${nluResult.intent.primary}. Sentiment: ${nluResult.sentiment.label}`,
    nluResult.topic,
    `Last: ${nluResult.topic} (${nluResult.intent.primary}, ${nluResult.sentiment.label})`
  ).run();

  return json({
    success: true,
    data: {
      response,
      model: modelUsed,
      employeeId,
      employeeName,
      intent: nluResult.intent.primary,
      sentiment: nluResult.sentiment.label,
      tokensUsed,
      latencyMs,
      conversationState: nluResult.conversationState,
      tokenEstimate: { system: tokenEstimate.systemPrompt, history: tokenEstimate.history, total: tokenEstimate.total, max: tokenEstimate.maxAllowed },
      guardrails: { outputWarnings: outputGuard.warnings, piiRedacted: outputGuard.pii.hasPII, hallucinationRisk: outputGuard.hallucination.riskLevel },
    },
  });
}

// ── Conversation State Retrieval ──

async function handleGetState(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get('employeeId');
  if (!employeeId) return json({ error: 'employeeId required' }, 400);

  // Load recent messages to reconstruct state
  const recent = await env.DB.prepare(
    'SELECT sender, text, intent, created_at FROM chat_messages WHERE user_id = ? AND employee_id = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(userId, employeeId).all<any>();

  const memory = await env.DB.prepare(
    'SELECT topics, preferences, summary FROM conversation_memories WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<any>();

  return json({
    success: true,
    data: {
      recentMessages: recent.results?.reverse() || [],
      memory: memory ? { topics: JSON.parse(memory.topics || '[]'), summary: memory.summary } : null,
      turnCount: recent.results?.length || 0,
    },
  });
}

// ──────────────────────────────────────────────────────
// 1. LLM-BASED INTENT CLASSIFICATION
// ──────────────────────────────────────────────────────

const INTENT_TAXONOMY = `Intent categories:
- greeting: Saying hello, starting conversation
- farewell: Ending conversation
- thanks: Expressing gratitude
- code: Writing/reviewing/deploying code
- debug: Fixing bugs, troubleshooting errors
- campaign: Marketing campaign creation/management
- outreach: Sales prospecting, lead generation, cold emails
- analytics: Viewing metrics, KPIs, dashboards
- strategy: Planning, roadmaps, frameworks
- ticket: Support tickets, customer issues
- escalation: Urgent/critical issues needing immediate attention
- troubleshoot: Diagnosing and resolving technical problems
- report: Generating summaries, reports, presentations
- data_query: SQL queries, data analysis, datasets
- visualization: Charts, graphs, dashboards
- design_review: UI/UX review, mockups, wireframes
- prototype: Building prototypes, interactive demos
- ux_audit: Accessibility, usability testing
- roadmap: Product roadmap, feature planning
- sprint: Sprint planning, scrum, standup
- prioritize: RICE/MoSCoW scoring, triaging features
- feedback: Asking for or providing feedback
- complaint: Expressing dissatisfaction
- followup: Checking on previous work status
- clarification: Asking for more detail/explanation
- request: General task request
- question: General question
- general: Doesn't fit other categories`;

async function classifyIntentLLM(
  apiKey: string, provider: string, model: string,
  message: string, jobType: string, history: Array<{ from: string; text: string }>
): Promise<NLUResult['intent']> {
  const recentContext = history.slice(-4).map(h => `${h.from}: ${h.text}`).join('\n');

  const prompt = `You are an intent classifier for a ${jobType.replace(/-/g, ' ')} AI assistant.

${INTENT_TAXONOMY}

Classify the user's message into ONE primary intent and optionally a secondary intent.
Consider the conversation context when classifying.

${recentContext ? `Recent conversation:\n${recentContext}\n` : ''}
User message: "${message}"

Respond in JSON only:
{"primary":"<intent>","confidence":<0.0-1.0>,"secondary":"<intent_or_null>","reasoning":"<brief_explanation>"}`;

  try {
    const result = await callLLMRaw(provider, apiKey, model, prompt, 0.1, 200);
    const parsed = JSON.parse(extractJSON(result));
    return {
      primary: parsed.primary || 'general',
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      secondary: parsed.secondary || undefined,
      reasoning: parsed.reasoning || '',
    };
  } catch {
    return classifyIntentLocal(message, jobType, history);
  }
}

function classifyIntentLocal(
  message: string, jobType: string, history: Array<{ from: string; text: string }>
): NLUResult['intent'] {
  const lower = message.toLowerCase().trim();

  // Enhanced local classification using weighted keyword scoring
  const scores: Record<string, number> = {};

  const INTENT_KEYWORDS: Record<string, { words: string[]; weight: number }> = {
    greeting: { words: ['hi', 'hey', 'hello', 'good morning', 'good afternoon', 'good evening', 'howdy', "what's up", 'sup'], weight: 2 },
    farewell: { words: ['bye', 'goodbye', 'see you', 'talk later', 'signing off', 'gotta go'], weight: 2 },
    thanks: { words: ['thanks', 'thank you', 'thx', 'ty', 'appreciate', 'grateful'], weight: 2 },
    complaint: { words: ['unhappy', 'dissatisfied', 'terrible', 'unacceptable', 'disappointed', 'sucks', 'worst'], weight: 1.8 },
    escalation: { words: ['urgent', 'critical', 'p1', 'p0', 'sev1', 'sev2', 'emergency', 'outage', 'down', 'production'], weight: 1.8 },
    code: { words: ['code', 'implement', 'function', 'api', 'script', 'deploy', 'refactor', 'component', 'module', 'endpoint', 'class', 'interface', 'sql', 'css', 'html', 'test', 'webpack', 'typescript', 'react', 'node'], weight: 1.2 },
    debug: { words: ['bug', 'fix', 'error', 'broken', 'crash', 'issue', 'problem', 'fail', 'debug', 'stacktrace', 'exception', '404', '500', 'null', 'undefined', 'timeout'], weight: 1.3 },
    campaign: { words: ['campaign', 'launch', 'promote', 'advertise', 'ads', 'social media', 'newsletter', 'email blast', 'marketing plan', 'influencer', 'content calendar'], weight: 1.2 },
    outreach: { words: ['outreach', 'prospect', 'lead', 'cold email', 'cold call', 'pipeline', 'deal', 'pitch', 'proposal', 'close', 'negotiate', 'quota'], weight: 1.2 },
    analytics: { words: ['analytics', 'metrics', 'kpi', 'dashboard', 'conversion', 'roi', 'ctr', 'bounce rate', 'traffic', 'engagement', 'funnel'], weight: 1.1 },
    strategy: { words: ['strategy', 'roadmap', 'plan', 'framework', 'methodology', 'workflow', 'objective', 'goal', 'okr'], weight: 1.0 },
    ticket: { words: ['ticket', 'support request', 'support case', 'customer problem', 'sla', 'csat', 'queue'], weight: 1.2 },
    troubleshoot: { words: ['troubleshoot', 'diagnose', 'investigate', 'root cause', 'reproduce', 'workaround', 'mitigation'], weight: 1.1 },
    report: { words: ['report', 'summary', 'overview', 'breakdown', 'analysis', 'digest', 'briefing', 'presentation'], weight: 1.0 },
    data_query: { words: ['query', 'dataset', 'table', 'column', 'aggregate', 'filter', 'join', 'select', 'count', 'sum', 'average', 'group by'], weight: 1.2 },
    visualization: { words: ['chart', 'graph', 'visual', 'plot', 'heatmap', 'bar chart', 'line chart', 'pie chart', 'dashboard'], weight: 1.1 },
    design_review: { words: ['design review', 'mockup', 'wireframe', 'layout', 'spacing', 'typography', 'color scheme', 'visual hierarchy'], weight: 1.2 },
    prototype: { words: ['prototype', 'interactive', 'clickable', 'user flow', 'figma', 'sketch', 'component library'], weight: 1.1 },
    ux_audit: { words: ['ux audit', 'accessibility', 'a11y', 'wcag', 'usability', 'user testing', 'heuristic'], weight: 1.1 },
    roadmap: { words: ['roadmap', 'feature request', 'feature prioriti', 'backlog', 'product vision', 'milestone'], weight: 1.0 },
    sprint: { words: ['sprint', 'scrum', 'standup', 'retro', 'velocity', 'story points', 'capacity', 'planning'], weight: 1.0 },
    prioritize: { words: ['prioriti', 'triage', 'rank', 'score', 'rice', 'moscow', 'ice', 'impact', 'effort'], weight: 1.0 },
    feedback: { words: ['feedback', 'review', 'opinion', 'thoughts', 'evaluate', 'assessment', 'critique'], weight: 0.9 },
    followup: { words: ['follow up', 'update', 'status', 'progress', "how's it going", 'any news', 'check in'], weight: 0.9 },
    clarification: { words: ['clarif', 'explain', 'what do you mean', 'elaborate', 'more detail', "don't understand", 'confused'], weight: 0.9 },
    request: { words: ['please', 'can you', 'could you', 'i need', 'create', 'make', 'build', 'generate', 'write', 'draft', 'prepare', 'send', 'schedule'], weight: 0.7 },
    question: { words: ['what', 'how', 'why', 'when', 'where', 'who', 'which'], weight: 0.5 },
  };

  // Role-specific boost
  const ROLE_BOOST: Record<string, string[]> = {
    'software-engineer': ['code', 'debug', 'data_query'],
    'marketing-manager': ['campaign', 'analytics', 'strategy'],
    'sales-representative': ['outreach', 'analytics', 'strategy'],
    'customer-support': ['ticket', 'escalation', 'troubleshoot'],
    'data-analyst': ['data_query', 'visualization', 'report', 'analytics'],
    'content-writer': ['campaign', 'strategy'],
    'product-manager': ['roadmap', 'sprint', 'prioritize', 'strategy'],
    'designer': ['design_review', 'prototype', 'ux_audit'],
  };

  const boostedIntents = ROLE_BOOST[jobType] || [];

  for (const [intent, config] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const word of config.words) {
      if (lower.includes(word)) {
        score += config.weight;
      }
    }
    // Role boost
    if (boostedIntents.includes(intent)) {
      score *= 1.5;
    }
    if (score > 0) scores[intent] = score;
  }

  // Special: check if message starts with greeting words
  if (/^(hi|hey|hello|good\s(morning|afternoon|evening)|sup|yo|howdy)\b/i.test(lower)) {
    scores['greeting'] = (scores['greeting'] || 0) + 5;
  }

  // Sort by score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return { primary: 'general', confidence: 0.3, reasoning: 'No strong keyword matches found' };
  }

  const topScore = sorted[0][1];
  const confidence = Math.min(0.95, topScore / 5); // Normalize

  return {
    primary: sorted[0][0],
    confidence,
    secondary: sorted.length > 1 ? sorted[1][0] : undefined,
    reasoning: `Keyword scoring: ${sorted.slice(0, 3).map(([k, v]) => `${k}(${v.toFixed(1)})`).join(', ')}`,
  };
}

// ──────────────────────────────────────────────────────
// 2. LLM-BASED SENTIMENT ANALYSIS
// ──────────────────────────────────────────────────────

async function analyzeSentimentLLM(
  apiKey: string, provider: string, model: string,
  message: string, history: Array<{ from: string; text: string }>
): Promise<NLUResult['sentiment']> {
  const recentContext = history.slice(-3).map(h => `${h.from}: ${h.text}`).join('\n');

  const prompt = `Analyze the sentiment and emotion of this message in the context of a work conversation with an AI assistant.

${recentContext ? `Recent context:\n${recentContext}\n` : ''}
Message: "${message}"

Consider: sarcasm, understatement, urgency, frustration behind polite words, enthusiasm.

Respond in JSON only:
{"score":<-1.0 to 1.0>,"label":"<very_negative|negative|neutral|positive|very_positive>","emotion":"<primary emotion: frustrated|angry|anxious|confused|neutral|curious|satisfied|excited|grateful>","confidence":<0.0-1.0>}`;

  try {
    const result = await callLLMRaw(provider, apiKey, model, prompt, 0.1, 150);
    const parsed = JSON.parse(extractJSON(result));
    return {
      score: Math.max(-1, Math.min(1, parsed.score || 0)),
      label: parsed.label || 'neutral',
      emotion: parsed.emotion || 'neutral',
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
    };
  } catch {
    return analyzeSentimentLocal(message, history);
  }
}

function analyzeSentimentLocal(
  message: string, history: Array<{ from: string; text: string }>
): NLUResult['sentiment'] {
  const lower = message.toLowerCase();

  // Weighted word lists with intensity
  const POSITIVE: Array<[string, number]> = [
    ['great', 0.3], ['awesome', 0.4], ['thanks', 0.2], ['perfect', 0.4], ['love', 0.4],
    ['excellent', 0.4], ['amazing', 0.4], ['good', 0.2], ['nice', 0.2], ['fantastic', 0.4],
    ['brilliant', 0.4], ['helpful', 0.3], ['appreciate', 0.3], ['wonderful', 0.4], ['happy', 0.3],
    ['excited', 0.3], ['glad', 0.2], ['impressed', 0.3], ['superb', 0.4], ['well done', 0.3],
  ];

  const NEGATIVE: Array<[string, number]> = [
    ['bad', -0.3], ['terrible', -0.5], ['awful', -0.5], ['hate', -0.5], ['wrong', -0.3],
    ['broken', -0.4], ['angry', -0.5], ['frustrated', -0.4], ['annoying', -0.3], ['disappointing', -0.4],
    ['useless', -0.5], ['waste', -0.3], ['horrible', -0.5], ['fail', -0.3], ['sucks', -0.5],
    ['confused', -0.2], ['stuck', -0.2], ['slow', -0.2], ['not working', -0.4], ['doesn\'t work', -0.4],
  ];

  // Negation handling
  const negationWords = ['not', 'no', 'never', "don't", "doesn't", "didn't", "won't", "can't", "isn't", "aren't"];
  const words = lower.split(/\s+/);
  let hasNegation = false;
  for (const nw of negationWords) {
    if (lower.includes(nw)) { hasNegation = true; break; }
  }

  let score = 0;
  for (const [word, weight] of POSITIVE) {
    if (lower.includes(word)) score += weight;
  }
  for (const [word, weight] of NEGATIVE) {
    if (lower.includes(word)) score += weight; // weight is already negative
  }

  // Negation flips mild sentiment
  if (hasNegation && Math.abs(score) < 0.3) {
    score *= -0.5;
  }

  // Exclamation marks amplify
  const exclamationCount = (message.match(/!/g) || []).length;
  if (exclamationCount > 0) score *= (1 + exclamationCount * 0.1);

  // ALL CAPS = intensity
  const capsRatio = (message.match(/[A-Z]/g) || []).length / Math.max(1, message.length);
  if (capsRatio > 0.5 && message.length > 5) score *= 1.3;

  // Context: if previous messages were negative, weight more carefully
  if (history.length > 0) {
    const lastMsg = history[history.length - 1];
    if (lastMsg.from === 'user') {
      const prevSentiment = quickSentiment(lastMsg.text);
      if (prevSentiment < -0.2 && score < 0) score *= 1.2; // Amplify continued frustration
    }
  }

  score = Math.max(-1, Math.min(1, score));

  let label: string;
  if (score <= -0.5) label = 'very_negative';
  else if (score <= -0.15) label = 'negative';
  else if (score >= 0.5) label = 'very_positive';
  else if (score >= 0.15) label = 'positive';
  else label = 'neutral';

  let emotion = 'neutral';
  if (score < -0.4) emotion = 'frustrated';
  else if (score < -0.2) emotion = 'confused';
  else if (score > 0.4) emotion = 'excited';
  else if (score > 0.2) emotion = 'satisfied';
  else if (lower.includes('?')) emotion = 'curious';

  return { score, label, emotion, confidence: Math.min(0.7, Math.abs(score) + 0.3) };
}

function quickSentiment(text: string): number {
  const lower = text.toLowerCase();
  let s = 0;
  if (/great|awesome|thanks|perfect|love|excellent|amazing/.test(lower)) s += 0.3;
  if (/bad|terrible|awful|hate|broken|frustrated|disappointing|sucks/.test(lower)) s -= 0.3;
  return s;
}

// ──────────────────────────────────────────────────────
// 3. RAG — RETRIEVAL AUGMENTED GENERATION
// ──────────────────────────────────────────────────────

async function buildRAGContext(
  env: Env, userId: string, employeeId: string,
  message: string, topic: string, history: Array<{ from: string; text: string }>
): Promise<string> {
  const parts: string[] = [];

  // 1. Conversation memory from D1
  const memory = await env.DB.prepare(
    'SELECT topics, preferences, summary FROM conversation_memories WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<any>();

  if (memory?.summary) {
    parts.push(`[Previous Context] ${memory.summary}`);
  }
  if (memory?.topics) {
    try {
      const topics = JSON.parse(memory.topics);
      if (topics.length > 0) {
        parts.push(`[Previously Discussed] ${topics.slice(-10).join(', ')}`);
      }
    } catch {}
  }

  // 2. Onboarding / company context
  const onboarding = await env.DB.prepare(
    'SELECT context FROM employee_onboarding WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<{ context: string }>();

  if (onboarding?.context) {
    try {
      const ctx = JSON.parse(onboarding.context);
      const contextParts: string[] = [];
      if (ctx.companyName) contextParts.push(`Company: ${ctx.companyName}`);
      if (ctx.industry) contextParts.push(`Industry: ${ctx.industry}`);
      if (ctx.products) contextParts.push(`Products: ${ctx.products}`);
      if (ctx.targetAudience) contextParts.push(`Audience: ${ctx.targetAudience}`);
      if (ctx.brandVoice) contextParts.push(`Brand Voice: ${ctx.brandVoice}`);
      if (ctx.competitors) contextParts.push(`Competitors: ${ctx.competitors}`);
      if (ctx.techStack) contextParts.push(`Tech Stack: ${ctx.techStack}`);
      if (ctx.customContext) contextParts.push(`Notes: ${ctx.customContext}`);
      if (contextParts.length > 0) {
        parts.push(`[Company Context] ${contextParts.join('. ')}`);
      }
    } catch {}
  }

  // 3. Recent task history for this employee
  const recentTasks = await env.DB.prepare(
    'SELECT task_description, status, output FROM task_executions WHERE user_id = ? AND employee_id = ? ORDER BY created_at DESC LIMIT 5'
  ).bind(userId, employeeId).all<any>();

  if (recentTasks.results && recentTasks.results.length > 0) {
    const taskSummary = recentTasks.results
      .map((t: any) => `- ${t.task_description} (${t.status})`)
      .join('\n');
    parts.push(`[Recent Tasks]\n${taskSummary}`);
  }

  // 4. Related messages (semantic search approximation via keyword matching)
  const keywords = extractKeywords(message);
  if (keywords.length > 0) {
    const keywordPattern = keywords.slice(0, 3).map(k => `text LIKE '%${k}%'`).join(' OR ');
    try {
      const related = await env.DB.prepare(
        `SELECT sender, text, created_at FROM chat_messages
         WHERE user_id = ? AND employee_id = ? AND (${keywordPattern})
         ORDER BY created_at DESC LIMIT 5`
      ).bind(userId, employeeId).all<any>();

      if (related.results && related.results.length > 0) {
        const relatedSummary = related.results
          .map((m: any) => `[${m.sender}] ${m.text.slice(0, 100)}`)
          .join('\n');
        parts.push(`[Related Previous Messages]\n${relatedSummary}`);
      }
    } catch {}
  }

  // 5. Inter-employee context (recent handoffs or messages involving this employee)
  try {
    const interMessages = await env.DB.prepare(
      `SELECT fromName, toName, subject, content FROM inter_employee_messages
       WHERE (from_employee_id = ? OR to_employee_id = ?)
       ORDER BY created_at DESC LIMIT 3`
    ).bind(employeeId, employeeId).all<any>();

    if (interMessages.results && interMessages.results.length > 0) {
      const iem = interMessages.results
        .map((m: any) => `${m.fromName} → ${m.toName}: ${m.subject}`)
        .join('\n');
      parts.push(`[Team Communication]\n${iem}`);
    }
  } catch {}

  return parts.join('\n\n');
}

function extractKeywords(message: string): string[] {
  const stopWords = new Set(['what', 'how', 'can', 'you', 'the', 'this', 'that', 'please', 'help', 'with', 'about', 'from', 'have', 'want', 'need', 'could', 'would', 'should', 'make', 'like', 'i', 'me', 'my', 'we', 'our', 'a', 'an', 'and', 'but', 'for', 'to', 'of', 'in', 'on', 'at', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'not', 'do', 'did', 'does', 'will']);
  return message.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
}

// ──────────────────────────────────────────────────────
// 4. CONVERSATION STATE MACHINE
// ──────────────────────────────────────────────────────

function updateConversationState(
  prevState: ConversationState,
  intent: NLUResult['intent'],
  sentiment: NLUResult['sentiment'],
  message: string,
  topic: string
): ConversationState {
  const newState: ConversationState = {
    ...prevState,
    turnCount: prevState.turnCount + 1,
    lastIntent: intent.primary,
    lastSentiment: sentiment.score,
    context: { ...prevState.context },
  };

  // Track topic continuity
  if (!newState.context.topics) newState.context.topics = [];
  if (topic && topic !== 'the project') {
    newState.context.topics = [...(newState.context.topics as string[]), topic].slice(-10);
  }

  // Track sentiment trajectory
  if (!newState.context.sentimentHistory) newState.context.sentimentHistory = [];
  (newState.context.sentimentHistory as number[]).push(sentiment.score);
  if ((newState.context.sentimentHistory as number[]).length > 20) {
    newState.context.sentimentHistory = (newState.context.sentimentHistory as number[]).slice(-20);
  }

  // Task tracking state machine
  const taskStartIntents = ['request', 'code', 'debug', 'campaign', 'outreach', 'report', 'data_query', 'design_review', 'prototype'];
  const taskContinueIntents = ['followup', 'clarification', 'feedback'];

  if (taskStartIntents.includes(intent.primary) && intent.confidence > 0.5) {
    // Starting a new task
    newState.currentTask = {
      id: `task_${Date.now().toString(36)}`,
      description: message.slice(0, 200),
      status: 'in_progress',
      step: 1,
      totalSteps: estimateTaskSteps(intent.primary),
    };
    newState.pendingClarifications = [];
  } else if (taskContinueIntents.includes(intent.primary) && prevState.currentTask) {
    // Continuing existing task
    newState.currentTask = {
      ...prevState.currentTask,
      step: Math.min(prevState.currentTask.step + 1, prevState.currentTask.totalSteps),
    };

    if (intent.primary === 'clarification') {
      newState.pendingClarifications = [
        ...(prevState.pendingClarifications || []),
        message.slice(0, 100),
      ];
    }
  } else if (['thanks', 'farewell'].includes(intent.primary) && prevState.currentTask) {
    // Task completed
    newState.currentTask = {
      ...prevState.currentTask,
      status: 'completed',
      step: prevState.currentTask.totalSteps,
    };
  } else if (intent.primary === 'complaint' && prevState.currentTask) {
    // Task hit a snag
    newState.currentTask = {
      ...prevState.currentTask,
      status: 'needs_revision',
    };
  }

  // Detect repeated topic (user is circling back)
  const recentTopics = (newState.context.topics as string[]).slice(-5);
  const topicCounts: Record<string, number> = {};
  recentTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  const repeatedTopic = Object.entries(topicCounts).find(([_, count]) => count >= 3);
  if (repeatedTopic) {
    newState.context.repeatedTopic = repeatedTopic[0];
    newState.context.needsDeepDive = true;
  }

  return newState;
}

function estimateTaskSteps(intent: string): number {
  const stepMap: Record<string, number> = {
    code: 4, debug: 3, campaign: 5, outreach: 4, report: 3,
    data_query: 3, design_review: 3, prototype: 5, request: 2,
  };
  return stepMap[intent] || 2;
}

// ──────────────────────────────────────────────────────
// 5. TONE CONSISTENCY VALIDATION
// ──────────────────────────────────────────────────────

async function validateToneConsistency(
  env: Env, userId: string, employeeId: string,
  intent: NLUResult['intent'], sentiment: NLUResult['sentiment'],
  state: ConversationState, history: Array<{ from: string; text: string }>
): Promise<NLUResult['toneGuidance']> {
  const avoid: string[] = [];
  const apply: string[] = [];
  let modifier = 'balanced';

  // Load personality config
  const personalityRow = await env.DB.prepare(
    'SELECT config FROM personality_configs WHERE user_id = ? AND employee_id = ?'
  ).bind(userId, employeeId).first<{ config: string }>();

  let personality: any = null;
  if (personalityRow?.config) {
    try { personality = JSON.parse(personalityRow.config); } catch {}
  }

  // Rule 1: Don't be humorous when user is frustrated
  if (sentiment.score < -0.2) {
    avoid.push('humor', 'quips', 'jokes', 'casual_openers');
    apply.push('empathy', 'acknowledgment', 'directness');
    modifier = 'empathetic';
  }

  // Rule 2: Don't be overly formal when conversation is casual
  if (state.turnCount > 5 && sentiment.score > 0.1) {
    avoid.push('overly_formal_language');
    apply.push('warmth', 'rapport_building');
    if (!personality || personality.formality < 0.7) {
      modifier = 'warm';
    }
  }

  // Rule 3: Prevent double-stacking — if last response was already empathetic, don't stack again
  if (history.length >= 2) {
    const lastAiResponse = history.filter(h => h.from === 'ai').slice(-1)[0]?.text || '';
    const empathyPhrases = ['understand', 'hear your concern', 'frustrating', 'make this right', 'I hear you'];
    const wasEmpathetic = empathyPhrases.some(p => lastAiResponse.toLowerCase().includes(p));

    if (wasEmpathetic && sentiment.score < -0.2) {
      avoid.push('repeated_empathy_stacking');
      apply.push('solution_focused', 'action_oriented');
      modifier = 'solution_focused';
    }
  }

  // Rule 4: Don't add casual openers if intent is escalation/complaint
  if (['escalation', 'complaint'].includes(intent.primary)) {
    avoid.push('casual_openers', 'humor', 'exclamation_openers');
    apply.push('professional', 'urgent_tone', 'direct_address');
    modifier = 'professional_urgent';
  }

  // Rule 5: Don't add verbose closers if message is a quick followup
  if (['followup', 'thanks', 'farewell'].includes(intent.primary)) {
    avoid.push('verbose_closers', 'offer_more_help');
    apply.push('concise', 'matching_energy');
    modifier = 'concise';
  }

  // Rule 6: Respect personality config constraints
  if (personality) {
    if (personality.humor < 20) avoid.push('humor', 'quips');
    if (personality.formality > 80) avoid.push('casual_language', 'slang', 'emoji');
    if (personality.formality < 20) avoid.push('corporate_speak', 'jargon');
    if (personality.verbosity < 30) avoid.push('long_explanations', 'verbose_closers');
    if (personality.empathy > 80) apply.push('emotional_acknowledgment');
  }

  // Rule 7: Don't override user's tone — if they're brief, be brief
  const lastUserMsg = history.filter(h => h.from === 'user').slice(-1)[0]?.text || '';
  if (lastUserMsg.length < 30 && !['request', 'code'].includes(intent.primary)) {
    apply.push('match_brevity');
    avoid.push('long_responses');
  }

  return { modifier, avoid: [...new Set(avoid)], apply: [...new Set(apply)] };
}

// ──────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────────────

function buildEnrichedSystemPrompt(
  jobType: string, employeeName: string, nluResult: NLUResult,
  personality: any, companyContext: any
): string {
  let prompt = ROLE_SYSTEM_PROMPTS[jobType] || '';

  prompt += `\n\nYour name is ${employeeName}. You work at NexusHR as an AI employee.`;

  // Inject RAG context
  if (nluResult.ragContext) {
    prompt += `\n\n--- Retrieved Context ---\n${nluResult.ragContext}\n--- End Context ---`;
  }

  // Inject company context
  if (companyContext) {
    const parts: string[] = [];
    if (companyContext.companyName) parts.push(`Company: ${companyContext.companyName}`);
    if (companyContext.industry) parts.push(`Industry: ${companyContext.industry}`);
    if (companyContext.products) parts.push(`Products: ${companyContext.products}`);
    if (companyContext.targetAudience) parts.push(`Target audience: ${companyContext.targetAudience}`);
    if (companyContext.brandVoice) parts.push(`Brand voice: ${companyContext.brandVoice}`);
    if (companyContext.techStack) parts.push(`Tech stack: ${companyContext.techStack}`);
    if (parts.length > 0) {
      prompt += `\n\nCompany you're working for:\n${parts.join('\n')}`;
    }
  }

  // Inject personality tuning
  if (personality) {
    const toneMap: Record<string, string> = {
      formal: 'Use professional, polished language. Avoid slang.',
      casual: 'Be conversational and relaxed. Use natural language.',
      friendly: 'Be warm, approachable, and encouraging.',
      direct: 'Be concise and straight to the point. No filler.',
    };
    prompt += `\n\nCommunication style:`;
    if (personality.tone && toneMap[personality.tone]) prompt += `\n- ${toneMap[personality.tone]}`;
    if (personality.verbosity !== undefined) {
      if (personality.verbosity < 30) prompt += '\n- Keep responses brief and to-the-point.';
      else if (personality.verbosity > 70) prompt += '\n- Provide thorough, detailed explanations.';
    }
    if (personality.humor !== undefined && personality.humor > 50) {
      prompt += '\n- Include occasional wit or light humor where appropriate.';
    }
    if (personality.customInstructions) {
      prompt += `\n- Special instructions: ${personality.customInstructions}`;
    }
  }

  // Inject tone guidance
  const tg = nluResult.toneGuidance;
  if (tg.avoid.length > 0 || tg.apply.length > 0) {
    prompt += `\n\nTone guidance for this response:`;
    if (tg.apply.length > 0) prompt += `\n- Apply: ${tg.apply.join(', ')}`;
    if (tg.avoid.length > 0) prompt += `\n- Avoid: ${tg.avoid.join(', ')}`;
  }

  // Inject conversation state context
  const cs = nluResult.conversationState;
  if (cs.currentTask) {
    prompt += `\n\nCurrent task: "${cs.currentTask.description}" (step ${cs.currentTask.step}/${cs.currentTask.totalSteps}, status: ${cs.currentTask.status})`;
    if (cs.currentTask.status === 'needs_revision') {
      prompt += '\nThe user is not satisfied with the previous output. Focus on addressing their concern directly.';
    }
  }
  if (cs.context.repeatedTopic) {
    prompt += `\nThe user keeps returning to "${cs.context.repeatedTopic}" — provide a deeper, more comprehensive answer this time.`;
  }

  return prompt;
}

function applyToneCorrection(response: string, guidance: NLUResult['toneGuidance']): string {
  let corrected = response;

  // Remove humor/quips if not appropriate
  if (guidance.avoid.includes('humor') || guidance.avoid.includes('quips')) {
    corrected = corrected.replace(/\n\n\(.*?[😉💪🎉].*?\)$/m, '');
    corrected = corrected.replace(/\n\n\.\.\.and yes,.*$/m, '');
    corrected = corrected.replace(/\n\nBoom\..*$/m, '');
    corrected = corrected.replace(/\n\nNot to brag.*$/m, '');
  }

  // Remove casual openers if not appropriate
  if (guidance.avoid.includes('casual_openers') || guidance.avoid.includes('exclamation_openers')) {
    corrected = corrected.replace(/^(Nice!|Love it!|Ooh good one!|Alright!|Sweet!|Let's go!|On it!)\s*/i, '');
  }

  return corrected;
}

function generateContextualFallback(name: string, jobType: string, nlu: NLUResult): string {
  const { intent, sentiment, topic, conversationState: cs } = nlu;

  // Use NLU context to generate much better fallback responses
  let response = '';

  if (intent.primary === 'greeting') {
    return `Hello! I'm ${name}, your AI ${jobType.replace(/-/g, ' ')}. How can I help you today?`;
  }
  if (intent.primary === 'farewell') {
    return `Great talking with you! I'll be here whenever you need me.`;
  }
  if (intent.primary === 'thanks') {
    return `You're welcome! Let me know if there's anything else I can help with.`;
  }

  // Sentiment-aware opening
  if (sentiment.score < -0.3) {
    response += `I understand this is ${sentiment.emotion === 'frustrated' ? 'frustrating' : 'concerning'}. Let me address this directly.\n\n`;
  }

  // Task continuation
  if (cs.currentTask && cs.currentTask.status === 'in_progress') {
    response += `Continuing with "${cs.currentTask.description}" (step ${cs.currentTask.step} of ${cs.currentTask.totalSteps}):\n\n`;
  }

  // Intent-aware body
  response += `I'm analyzing your request about "${topic}" with my ${jobType.replace(/-/g, ' ')} expertise. `;
  response += `For full LLM-powered analysis, connect your Claude or GPT-4 API key in Settings.\n\n`;
  response += `In the meantime, here's my assessment based on the context I have.`;

  if (nlu.ragContext) {
    response += `\n\nI found some relevant context from our previous conversations that I'll factor in.`;
  }

  return response;
}

function extractEntitiesLLM(message: string): NLUResult['entities'] {
  const entities: NLUResult['entities'] = [];

  // Extract quoted strings
  const quoted = message.match(/"([^"]+)"|'([^']+)'/g);
  if (quoted) {
    quoted.forEach(q => {
      entities.push({ type: 'quoted_reference', value: q.replace(/["']/g, ''), salience: 0.9 });
    });
  }

  // Extract URLs
  const urls = message.match(/https?:\/\/\S+/g);
  if (urls) {
    urls.forEach(u => entities.push({ type: 'url', value: u, salience: 0.8 }));
  }

  // Extract email addresses
  const emails = message.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emails) {
    emails.forEach(e => entities.push({ type: 'email', value: e, salience: 0.8 }));
  }

  // Extract numbers/metrics
  const numbers = message.match(/\b\d+(\.\d+)?(%|k|m|b|x|ms|hrs?|days?|weeks?|months?)?\b/gi);
  if (numbers) {
    numbers.forEach(n => entities.push({ type: 'metric', value: n, salience: 0.6 }));
  }

  // Extract code references
  const codeRefs = message.match(/`([^`]+)`/g);
  if (codeRefs) {
    codeRefs.forEach(c => entities.push({ type: 'code_reference', value: c.replace(/`/g, ''), salience: 0.7 }));
  }

  // Topic extraction
  const topic = extractTopicLocal(message);
  entities.push({ type: 'topic', value: topic, salience: 1.0 });

  return entities;
}

function extractTopicLocal(msg: string): string {
  const stopWords = new Set(['what', 'how', 'can', 'you', 'the', 'this', 'that', 'please', 'help', 'with', 'about', 'from', 'have', 'want', 'need', 'could', 'would', 'should', 'make', 'like', 'i', 'me', 'my', 'we', 'our', 'a', 'an', 'and', 'but', 'for', 'to', 'of', 'in', 'on', 'at', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'not', 'do', 'did', 'does', 'will', 'just', 'also', 'very', 'really', 'so', 'some', 'any', 'all', 'there', 'here', 'then', 'than', 'these', 'those']);

  // Quoted phrases take priority
  const quoted = msg.match(/"([^"]+)"|'([^']+)'/);
  if (quoted) return quoted[1] || quoted[2];

  const words = msg.replace(/[^\w\s-]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));

  // Compound terms
  for (let i = 0; i < words.length - 1; i++) {
    if (!stopWords.has(words[i].toLowerCase()) && !stopWords.has(words[i + 1].toLowerCase())) {
      return `${words[i]} ${words[i + 1]}`;
    }
  }

  if (words.length > 0) return words.slice(0, 3).join(' ');
  return 'the project';
}

// ── Raw LLM call for NLU tasks ──

async function callLLMRaw(
  provider: string, apiKey: string, model: string,
  prompt: string, temperature: number, maxTokens: number
): Promise<string> {
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const data = await res.json() as any;
    return data.content?.[0]?.text || '';
  } else {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API ${res.status}`);
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }
}

async function callLLM(
  provider: string, apiKey: string, model: string,
  systemPrompt: string, userMessage: string,
  history: Array<{ from: string; text: string }>,
  config: { temperature: number; maxTokens: number }
): Promise<{ response: string; tokensUsed: number }> {
  if (provider === 'anthropic') {
    const messages = [
      ...history.slice(-20).map(h => ({ role: h.from === 'user' ? 'user' as const : 'assistant' as const, content: h.text })),
      { role: 'user' as const, content: userMessage },
    ];
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: config.maxTokens, temperature: config.temperature, system: systemPrompt, messages }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}`);
    const data = await res.json() as any;
    return { response: data.content?.[0]?.text || '', tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) };
  } else {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-20).map(h => ({ role: h.from === 'user' ? 'user' as const : 'assistant' as const, content: h.text })),
      { role: 'user' as const, content: userMessage },
    ];
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, max_tokens: config.maxTokens, temperature: config.temperature, messages }),
    });
    if (!res.ok) throw new Error(`OpenAI API ${res.status}`);
    const data = await res.json() as any;
    return { response: data.choices?.[0]?.message?.content || '', tokensUsed: data.usage?.total_tokens || 0 };
  }
}

function extractJSON(text: string): string {
  // Extract JSON from LLM response that may include markdown or extra text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : text;
}

function getProvider(model: string): string {
  if (model.startsWith('claude') || model.startsWith('anthropic')) return 'anthropic';
  if (model.startsWith('gpt') || model.startsWith('openai')) return 'openai';
  return 'anthropic';
}
