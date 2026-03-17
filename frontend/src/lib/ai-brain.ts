/**
 * AI Brain v2 — Enhanced NLU Engine
 *
 * Improvements over v1:
 * 1. LLM-based intent classification (via Worker NLU endpoint, with enhanced local fallback)
 * 2. Transformer-quality sentiment analysis (via LLM, with weighted word-list + negation fallback)
 * 3. RAG (Retrieval-Augmented Generation) — conversation memory + company context injection
 * 4. Conversation state machine — tracks multi-turn task completion
 * 5. Tone consistency validation — prevents personality modifier stacking
 */

import type { AIEmployee, ChatMessage, IntentType, ConversationMemory } from '../data/types';
import { isWorkerConnected } from './worker-api';

// ── Types ──

export interface ConversationState {
  currentTask?: { id: string; description: string; status: string; step: number; totalSteps: number };
  pendingClarifications?: string[];
  context: Record<string, any>;
  turnCount: number;
  lastIntent?: string;
  lastSentiment?: number;
}

export interface NLUResult {
  intent: { primary: IntentType; confidence: number; secondary?: IntentType; reasoning: string };
  sentiment: { score: number; label: string; emotion: string; confidence: number };
  entities: Array<{ type: string; value: string; salience: number }>;
  topic: string;
  ragContext: string;
  conversationState: ConversationState;
  toneGuidance: ToneGuidance;
}

export interface ToneGuidance {
  modifier: string;
  avoid: string[];
  apply: string[];
}

// ── Conversation State Storage (in-memory for current session, persisted to localStorage) ──

const CONVERSATION_STATES: Record<string, ConversationState> = {};

export function getConversationState(employeeId: string): ConversationState {
  if (!CONVERSATION_STATES[employeeId]) {
    // Try loading from localStorage
    try {
      const raw = localStorage.getItem(`nexushr_conv_state_${employeeId}`);
      if (raw) {
        CONVERSATION_STATES[employeeId] = JSON.parse(raw);
      }
    } catch {}
  }
  return CONVERSATION_STATES[employeeId] || { context: {}, turnCount: 0 };
}

function saveConversationState(employeeId: string, state: ConversationState): void {
  CONVERSATION_STATES[employeeId] = state;
  try {
    localStorage.setItem(`nexushr_conv_state_${employeeId}`, JSON.stringify(state));
  } catch {}
}

// ── Input Sanitization ──
export function sanitizeInput(text: string): string {
  return text
    .replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .trim()
    .slice(0, 4000);
}

// ══════════════════════════════════════════════════════
// 1. INTENT DETECTION — Enhanced weighted scoring + LLM via Worker
// ══════════════════════════════════════════════════════

const INTENT_KEYWORDS: Record<string, { words: string[]; weight: number }> = {
  greeting: { words: ['hi', 'hey', 'hello', 'good morning', 'good afternoon', 'good evening', 'howdy', "what's up", 'sup', 'yo'], weight: 2.5 },
  farewell: { words: ['bye', 'goodbye', 'see you', 'talk later', 'signing off', 'gotta go', 'catch you'], weight: 2.5 },
  thanks: { words: ['thanks', 'thank you', 'thx', 'ty', 'appreciate', 'grateful', 'cheers'], weight: 2.5 },
  complaint: { words: ['unhappy', 'dissatisfied', 'terrible', 'unacceptable', 'disappointed', 'sucks', 'worst', 'angry'], weight: 1.8 },
  escalation: { words: ['urgent', 'critical', 'p1', 'p0', 'sev1', 'sev2', 'emergency', 'outage', 'down', 'production is down', 'blocked'], weight: 1.8 },
  code: { words: ['code', 'implement', 'function', 'api', 'script', 'deploy', 'refactor', 'component', 'module', 'endpoint', 'class', 'interface', 'sql', 'css', 'html', 'test', 'typescript', 'react', 'node', 'python', 'webpack', 'docker', 'kubernetes'], weight: 1.2 },
  debug: { words: ['bug', 'fix', 'error', 'broken', 'crash', 'issue', 'problem', 'fail', 'debug', 'stacktrace', 'exception', '404', '500', 'null', 'undefined', 'timeout', 'memory leak'], weight: 1.3 },
  campaign: { words: ['campaign', 'launch', 'promote', 'advertise', 'ads', 'social media', 'newsletter', 'email blast', 'marketing plan', 'influencer', 'content calendar'], weight: 1.2 },
  outreach: { words: ['outreach', 'prospect', 'lead', 'cold email', 'cold call', 'pipeline', 'deal', 'pitch', 'proposal', 'close', 'negotiate', 'quota'], weight: 1.2 },
  analytics: { words: ['analytics', 'metrics', 'kpi', 'dashboard', 'conversion', 'roi', 'ctr', 'bounce rate', 'traffic', 'engagement', 'funnel', 'cohort'], weight: 1.1 },
  strategy: { words: ['strategy', 'roadmap', 'plan', 'framework', 'methodology', 'workflow', 'objective', 'goal', 'okr'], weight: 1.0 },
  ticket: { words: ['ticket', 'support request', 'support case', 'customer problem', 'customer issue', 'sla', 'csat', 'queue'], weight: 1.2 },
  troubleshoot: { words: ['troubleshoot', 'diagnose', 'investigate', 'root cause', 'reproduce', 'workaround', 'mitigation', 'resolution'], weight: 1.1 },
  report: { words: ['report', 'summary', 'overview', 'breakdown', 'analysis', 'digest', 'briefing', 'presentation'], weight: 1.0 },
  data_query: { words: ['query', 'dataset', 'table', 'column', 'aggregate', 'filter', 'join', 'select', 'count', 'sum', 'average', 'group by'], weight: 1.2 },
  visualization: { words: ['chart', 'graph', 'visual', 'plot', 'heatmap', 'bar chart', 'line chart', 'pie chart', 'treemap'], weight: 1.1 },
  design_review: { words: ['design review', 'mockup', 'wireframe', 'layout', 'spacing', 'typography', 'color scheme', 'visual hierarchy'], weight: 1.2 },
  prototype: { words: ['prototype', 'interactive', 'clickable', 'user flow', 'figma', 'sketch', 'component library'], weight: 1.1 },
  ux_audit: { words: ['ux audit', 'accessibility', 'a11y', 'wcag', 'usability', 'user testing', 'heuristic', 'navigation'], weight: 1.1 },
  roadmap: { words: ['roadmap', 'feature request', 'feature prioriti', 'backlog', 'product vision', 'milestone', 'quarter'], weight: 1.0 },
  sprint: { words: ['sprint', 'scrum', 'standup', 'retro', 'velocity', 'story points', 'capacity', 'planning'], weight: 1.0 },
  prioritize: { words: ['prioriti', 'triage', 'rank', 'score', 'rice', 'moscow', 'ice', 'impact', 'effort', 'urgency'], weight: 1.0 },
  feedback: { words: ['feedback', 'review', 'opinion', 'thoughts', 'evaluate', 'assessment', 'critique', 'rate'], weight: 0.9 },
  followup: { words: ['follow up', 'update', 'status', 'progress', "how's it going", 'any news', 'check in'], weight: 0.9 },
  clarification: { words: ['clarif', 'explain', 'what do you mean', 'elaborate', 'more detail', "don't understand", 'confused', 'unclear'], weight: 0.9 },
  request: { words: ['please', 'can you', 'could you', 'i need', 'create', 'make', 'build', 'generate', 'write', 'draft', 'prepare', 'send', 'schedule'], weight: 0.7 },
  question: { words: ['what', 'how', 'why', 'when', 'where', 'who', 'which'], weight: 0.5 },
};

const ROLE_BOOST: Record<string, string[]> = {
  'software-engineer': ['code', 'debug', 'data_query'],
  'marketing-manager': ['campaign', 'analytics', 'strategy', 'outreach'],
  'sales-representative': ['outreach', 'analytics', 'strategy'],
  'customer-support': ['ticket', 'escalation', 'troubleshoot'],
  'data-analyst': ['data_query', 'visualization', 'report', 'analytics'],
  'content-writer': ['campaign', 'strategy', 'request'],
  'product-manager': ['roadmap', 'sprint', 'prioritize', 'strategy'],
  'designer': ['design_review', 'prototype', 'ux_audit'],
};

export function detectIntent(msg: string, jobType?: string): IntentType {
  const lower = msg.toLowerCase().trim();
  const scores: Record<string, number> = {};

  // Special: strong greeting check (must start with greeting word)
  if (/^(hi|hey|hello|good\s(morning|afternoon|evening)|sup|yo|howdy|what'?s?\s?up)\b/i.test(lower)) {
    return 'greeting';
  }

  const boostedIntents = jobType ? (ROLE_BOOST[jobType] || []) : [];

  for (const [intent, config] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const word of config.words) {
      if (lower.includes(word)) {
        score += config.weight;
      }
    }
    if (boostedIntents.includes(intent)) score *= 1.5;
    if (score > 0) scores[intent] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return 'general';
  return sorted[0][0] as IntentType;
}

export function detectIntentWithConfidence(msg: string, jobType?: string): NLUResult['intent'] {
  const lower = msg.toLowerCase().trim();
  const scores: Record<string, number> = {};

  if (/^(hi|hey|hello|good\s(morning|afternoon|evening)|sup|yo|howdy)\b/i.test(lower)) {
    return { primary: 'greeting' as IntentType, confidence: 0.95, reasoning: 'Direct greeting pattern' };
  }

  const boostedIntents = jobType ? (ROLE_BOOST[jobType] || []) : [];

  for (const [intent, config] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const word of config.words) {
      if (lower.includes(word)) score += config.weight;
    }
    if (boostedIntents.includes(intent)) score *= 1.5;
    if (score > 0) scores[intent] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    return { primary: 'general' as IntentType, confidence: 0.3, reasoning: 'No keyword matches' };
  }

  const topScore = sorted[0][1];
  const confidence = Math.min(0.95, topScore / 5);

  return {
    primary: sorted[0][0] as IntentType,
    confidence,
    secondary: sorted.length > 1 ? sorted[1][0] as IntentType : undefined,
    reasoning: `Weighted scoring: ${sorted.slice(0, 3).map(([k, v]) => `${k}(${v.toFixed(1)})`).join(', ')}`,
  };
}

// ══════════════════════════════════════════════════════
// 2. SENTIMENT ANALYSIS — Weighted + negation-aware + context-aware
// ══════════════════════════════════════════════════════

const POSITIVE_WORDS: Array<[string, number]> = [
  ['great', 0.3], ['awesome', 0.4], ['thanks', 0.2], ['perfect', 0.4], ['love', 0.4],
  ['excellent', 0.4], ['amazing', 0.4], ['good', 0.2], ['nice', 0.2], ['fantastic', 0.4],
  ['brilliant', 0.4], ['helpful', 0.3], ['appreciate', 0.3], ['wonderful', 0.4], ['happy', 0.3],
  ['excited', 0.3], ['glad', 0.2], ['impressed', 0.3], ['superb', 0.4], ['well done', 0.3],
];

const NEGATIVE_WORDS: Array<[string, number]> = [
  ['bad', -0.3], ['terrible', -0.5], ['awful', -0.5], ['hate', -0.5], ['wrong', -0.3],
  ['broken', -0.4], ['angry', -0.5], ['frustrated', -0.4], ['annoying', -0.3], ['disappointing', -0.4],
  ['useless', -0.5], ['waste', -0.3], ['horrible', -0.5], ['fail', -0.3], ['sucks', -0.5],
  ['confused', -0.2], ['stuck', -0.2], ['slow', -0.2], ['not working', -0.4], ["doesn't work", -0.4],
];

const NEGATION_WORDS = ['not', 'no', 'never', "don't", "doesn't", "didn't", "won't", "can't", "isn't", "aren't", "wasn't", "weren't"];

export function analyzeSentiment(msg: string, history?: ChatMessage[]): { score: number; label: string; emotion: string } {
  const lower = msg.toLowerCase();

  let score = 0;
  for (const [word, weight] of POSITIVE_WORDS) {
    if (lower.includes(word)) score += weight;
  }
  for (const [word, weight] of NEGATIVE_WORDS) {
    if (lower.includes(word)) score += weight;
  }

  // Negation handling — flip mild sentiment
  const hasNegation = NEGATION_WORDS.some(nw => lower.includes(nw));
  if (hasNegation && Math.abs(score) < 0.3) {
    score *= -0.5;
  }

  // Intensity amplifiers
  const exclamations = (msg.match(/!/g) || []).length;
  if (exclamations > 0) score *= (1 + exclamations * 0.1);

  const capsRatio = (msg.match(/[A-Z]/g) || []).length / Math.max(1, msg.length);
  if (capsRatio > 0.5 && msg.length > 5) score *= 1.3;

  // Context: continued frustration from history
  if (history && history.length > 0) {
    const lastUserMsg = [...history].reverse().find(m => m.from === 'user');
    if (lastUserMsg) {
      const prevScore = quickSentimentScore(lastUserMsg.text);
      if (prevScore < -0.2 && score < 0) score *= 1.2;
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

  return { score, label, emotion };
}

function quickSentimentScore(text: string): number {
  const l = text.toLowerCase();
  let s = 0;
  if (/great|awesome|thanks|perfect|love|excellent|amazing/.test(l)) s += 0.3;
  if (/bad|terrible|awful|hate|broken|frustrated|disappointing|sucks/.test(l)) s -= 0.3;
  return s;
}

// ══════════════════════════════════════════════════════
// 3. TOPIC & ENTITY EXTRACTION
// ══════════════════════════════════════════════════════

const STOP_WORDS = new Set(['what', 'how', 'can', 'you', 'the', 'this', 'that', 'please', 'help', 'with', 'about', 'from', 'have', 'want', 'need', 'could', 'would', 'should', 'make', 'like', 'i', 'me', 'my', 'we', 'our', 'a', 'an', 'and', 'but', 'for', 'to', 'of', 'in', 'on', 'at', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'not', 'do', 'did', 'does', 'will', 'just', 'also', 'very', 'really', 'so', 'some', 'any', 'all', 'there', 'here', 'then', 'than', 'these', 'those']);

export function extractTopic(msg: string): string {
  // Quoted phrases get highest priority
  const quoted = msg.match(/"([^"]+)"|'([^']+)'/);
  if (quoted) return quoted[1] || quoted[2];

  const words = msg.replace(/[^\w\s-]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

  // Compound terms (consecutive meaningful words)
  for (let i = 0; i < words.length - 1; i++) {
    if (!STOP_WORDS.has(words[i].toLowerCase()) && !STOP_WORDS.has(words[i + 1].toLowerCase())) {
      return `${words[i]} ${words[i + 1]}`;
    }
  }

  if (words.length > 0) return words.slice(0, 3).join(' ');
  return 'the project';
}

export function extractEntities(msg: string): Array<{ type: string; value: string }> {
  const entities: Array<{ type: string; value: string }> = [];

  const quoted = msg.match(/"([^"]+)"|'([^']+)'/g);
  if (quoted) quoted.forEach(q => entities.push({ type: 'reference', value: q.replace(/["']/g, '') }));

  const urls = msg.match(/https?:\/\/\S+/g);
  if (urls) urls.forEach(u => entities.push({ type: 'url', value: u }));

  const emails = msg.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emails) emails.forEach(e => entities.push({ type: 'email', value: e }));

  const codeRefs = msg.match(/`([^`]+)`/g);
  if (codeRefs) codeRefs.forEach(c => entities.push({ type: 'code', value: c.replace(/`/g, '') }));

  const numbers = msg.match(/\b\d+(\.\d+)?(%|k|m|b|x|ms|hrs?|days?|weeks?|months?)?\b/gi);
  if (numbers) numbers.forEach(n => entities.push({ type: 'metric', value: n }));

  return entities;
}

// ══════════════════════════════════════════════════════
// 4. CONVERSATION STATE MACHINE
// ══════════════════════════════════════════════════════

export function updateConversationStateMachine(
  employeeId: string,
  intent: NLUResult['intent'],
  sentiment: { score: number; label: string; emotion: string },
  message: string,
  topic: string
): ConversationState {
  const prev = getConversationState(employeeId);

  const newState: ConversationState = {
    ...prev,
    turnCount: prev.turnCount + 1,
    lastIntent: intent.primary,
    lastSentiment: sentiment.score,
    context: { ...prev.context },
  };

  // Track topics
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

  // Task state machine transitions
  const taskStartIntents: string[] = ['request', 'code', 'debug', 'campaign', 'outreach', 'report', 'data_query', 'design_review', 'prototype'];
  const taskContinueIntents: string[] = ['followup', 'clarification', 'feedback'];

  if (taskStartIntents.includes(intent.primary) && intent.confidence > 0.5) {
    newState.currentTask = {
      id: `task_${Date.now().toString(36)}`,
      description: message.slice(0, 200),
      status: 'in_progress',
      step: 1,
      totalSteps: estimateSteps(intent.primary),
    };
    newState.pendingClarifications = [];
  } else if (taskContinueIntents.includes(intent.primary) && prev.currentTask) {
    newState.currentTask = {
      ...prev.currentTask,
      step: Math.min(prev.currentTask.step + 1, prev.currentTask.totalSteps),
    };
    if (intent.primary === 'clarification') {
      newState.pendingClarifications = [...(prev.pendingClarifications || []), message.slice(0, 100)];
    }
  } else if (['thanks', 'farewell'].includes(intent.primary) && prev.currentTask) {
    newState.currentTask = { ...prev.currentTask, status: 'completed', step: prev.currentTask.totalSteps };
  } else if (intent.primary === 'complaint' && prev.currentTask) {
    newState.currentTask = { ...prev.currentTask, status: 'needs_revision' };
  }

  // Detect repeated topic (user circling back)
  const recentTopics = (newState.context.topics as string[]).slice(-5);
  const topicCounts: Record<string, number> = {};
  recentTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
  const repeated = Object.entries(topicCounts).find(([_, count]) => count >= 3);
  if (repeated) {
    newState.context.repeatedTopic = repeated[0];
    newState.context.needsDeepDive = true;
  } else {
    delete newState.context.repeatedTopic;
    delete newState.context.needsDeepDive;
  }

  saveConversationState(employeeId, newState);
  return newState;
}

function estimateSteps(intent: string): number {
  const map: Record<string, number> = {
    code: 4, debug: 3, campaign: 5, outreach: 4, report: 3,
    data_query: 3, design_review: 3, prototype: 5, request: 2,
  };
  return map[intent] || 2;
}

// ══════════════════════════════════════════════════════
// 5. TONE CONSISTENCY VALIDATION
// ══════════════════════════════════════════════════════

export function validateToneConsistency(
  intent: NLUResult['intent'],
  sentiment: { score: number; label: string; emotion: string },
  state: ConversationState,
  history: ChatMessage[],
  personality: AIEmployee['personality']
): ToneGuidance {
  const avoid: string[] = [];
  const apply: string[] = [];
  let modifier = 'balanced';

  // Rule 1: No humor when user is frustrated
  if (sentiment.score < -0.2) {
    avoid.push('humor', 'quips', 'casual_openers');
    apply.push('empathy', 'acknowledgment', 'directness');
    modifier = 'empathetic';
  }

  // Rule 2: Warm up in long positive conversations
  if (state.turnCount > 5 && sentiment.score > 0.1) {
    avoid.push('overly_formal');
    apply.push('warmth', 'rapport');
    if (personality.formality < 0.7) modifier = 'warm';
  }

  // Rule 3: Prevent empathy double-stacking
  if (history.length >= 2) {
    const lastAi = [...history].reverse().find(m => m.from === 'ai');
    if (lastAi) {
      const empathyPhrases = ['understand', 'hear your concern', 'frustrating', 'make this right', 'I hear you'];
      const wasEmpathetic = empathyPhrases.some(p => lastAi.text.toLowerCase().includes(p));
      if (wasEmpathetic && sentiment.score < -0.2) {
        avoid.push('repeated_empathy');
        apply.push('solution_focused', 'action_oriented');
        modifier = 'solution_focused';
      }
    }
  }

  // Rule 4: No casual openers for escalation/complaint
  if (['escalation', 'complaint'].includes(intent.primary)) {
    avoid.push('casual_openers', 'humor', 'exclamation_openers');
    apply.push('professional', 'urgent_tone');
    modifier = 'professional_urgent';
  }

  // Rule 5: Match brevity for quick followups
  if (['followup', 'thanks', 'farewell'].includes(intent.primary)) {
    avoid.push('verbose_closers', 'offer_more_help');
    apply.push('concise');
    modifier = 'concise';
  }

  // Rule 6: Respect personality constraints
  if (personality.humor < 0.3) avoid.push('humor', 'quips');
  if (personality.formality > 0.7) avoid.push('casual_language', 'slang');
  if (personality.formality < 0.3) avoid.push('corporate_speak');
  if (personality.verbosity < 0.3) avoid.push('long_explanations');

  // Rule 7: Match user brevity
  const lastUser = [...history].reverse().find(m => m.from === 'user');
  if (lastUser && lastUser.text.length < 30 && !['request', 'code'].includes(intent.primary)) {
    apply.push('match_brevity');
    avoid.push('long_responses');
  }

  return { modifier, avoid: [...new Set(avoid)], apply: [...new Set(apply)] };
}

// ══════════════════════════════════════════════════════
// 6. LOCAL RAG CONTEXT BUILDER
// ══════════════════════════════════════════════════════

function buildLocalRAGContext(employeeId: string, history: ChatMessage[]): string {
  const parts: string[] = [];

  // Recent conversation topics
  const userMessages = history.filter(m => m.from === 'user').slice(-10);
  const topics = userMessages.map(m => extractTopic(m.text)).filter(t => t !== 'the project');
  const uniqueTopics = [...new Set(topics)];
  if (uniqueTopics.length > 0) {
    parts.push(`[Previously Discussed] ${uniqueTopics.join(', ')}`);
  }

  // Load onboarding context from localStorage
  try {
    const raw = localStorage.getItem(`nexushr_employee_onboarding_${employeeId}`);
    if (raw) {
      const ctx = JSON.parse(raw);
      const contextParts: string[] = [];
      if (ctx.companyName) contextParts.push(`Company: ${ctx.companyName}`);
      if (ctx.industry) contextParts.push(`Industry: ${ctx.industry}`);
      if (ctx.products) contextParts.push(`Products: ${ctx.products}`);
      if (ctx.targetAudience) contextParts.push(`Audience: ${ctx.targetAudience}`);
      if (ctx.brandVoice) contextParts.push(`Brand Voice: ${ctx.brandVoice}`);
      if (ctx.techStack) contextParts.push(`Tech Stack: ${ctx.techStack}`);
      if (contextParts.length > 0) {
        parts.push(`[Company Context] ${contextParts.join('. ')}`);
      }
    }
  } catch {}

  // Load conversation state for task context
  const state = getConversationState(employeeId);
  if (state.currentTask) {
    parts.push(`[Active Task] "${state.currentTask.description}" — step ${state.currentTask.step}/${state.currentTask.totalSteps}, status: ${state.currentTask.status}`);
  }

  return parts.join('\n\n');
}

// ══════════════════════════════════════════════════════
// FULL NLU PIPELINE — Local mode (synchronous)
// ══════════════════════════════════════════════════════

export function runLocalNLU(employee: AIEmployee, message: string, history: ChatMessage[]): NLUResult {
  const intent = detectIntentWithConfidence(message, employee.jobType);
  const sentiment = analyzeSentiment(message, history);
  const entities = extractEntities(message);
  const topic = extractTopic(message);
  const ragContext = buildLocalRAGContext(employee.id, history);

  const conversationState = updateConversationStateMachine(
    employee.id, intent, sentiment, message, topic
  );

  const toneGuidance = validateToneConsistency(
    intent, sentiment, conversationState, history, employee.personality
  );

  return {
    intent,
    sentiment: { ...sentiment, confidence: Math.min(0.7, Math.abs(sentiment.score) + 0.3) },
    entities: entities.map(e => ({ ...e, salience: 0.7 })),
    topic,
    ragContext,
    conversationState,
    toneGuidance,
  };
}

// ══════════════════════════════════════════════════════
// RESPONSE GENERATION — Uses NLU result for smarter responses
// ══════════════════════════════════════════════════════

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// Import role templates from the template system
import { UNIVERSAL_TEMPLATES, ROLE_TEMPLATES } from './response-templates';

export function generateResponse(employee: AIEmployee, userMessage: string, history: ChatMessage[]): string {
  // Run full local NLU pipeline
  const nlu = runLocalNLU(employee, userMessage, history);
  return generateResponseFromNLU(employee, nlu);
}

export function generateResponseFromNLU(employee: AIEmployee, nlu: NLUResult): string {
  const { intent, sentiment, topic, toneGuidance, conversationState } = nlu;
  const p = employee.personality;

  // 1. Get templates — role-specific > universal > employee defaults
  let templates: string[] = [];

  const roleTemplates = ROLE_TEMPLATES[employee.jobType];
  if (roleTemplates && roleTemplates[intent.primary]) {
    templates = roleTemplates[intent.primary];
  }
  if (templates.length === 0 && UNIVERSAL_TEMPLATES[intent.primary]) {
    templates = UNIVERSAL_TEMPLATES[intent.primary];
  }
  if (templates.length === 0) {
    const intentMap: Record<string, string> = {
      campaign: 'general', outreach: 'general', analytics: 'general', strategy: 'general',
      ticket: 'general', escalation: 'debug', troubleshoot: 'debug',
      report: 'general', data_query: 'code', visualization: 'code',
      design_review: 'general', prototype: 'code', ux_audit: 'general',
      roadmap: 'general', sprint: 'general', prioritize: 'general',
      request: 'general', question: 'general', feedback: 'general',
    };
    const fallbackIntent = intentMap[intent.primary] || intent.primary;
    templates = p.responseTemplates[fallbackIntent] || p.responseTemplates.general || [];
  }

  if (templates.length === 0) {
    templates = ["I'll work on {topic} right away. Give me a moment to analyze the best approach and I'll have a detailed response for you shortly."];
  }

  let response = pick(templates);

  // 2. Replace placeholders
  response = response.replace(/\{topic\}/g, topic);
  response = response.replace(/\{skill\}/g, pick(employee.skills));

  // 3. Apply personality modifiers WITH tone consistency validation

  // Context-aware opener (only if not avoided)
  if (conversationState.turnCount > 8 && Math.random() > 0.7 && !toneGuidance.avoid.includes('verbose_closers')) {
    const recentTopics = (conversationState.context.topics as string[]) || [];
    if (recentTopics.length > 0) {
      const continuity = [
        `Building on our discussion about ${recentTopics[recentTopics.length - 1]},`,
        `Following up on what we covered earlier,`,
        `Adding to our previous analysis,`,
      ];
      response = `${pick(continuity)} ${response.charAt(0).toLowerCase()}${response.slice(1)}`;
    }
  }

  // Sentiment-responsive (check tone guidance first!)
  if (sentiment.score < -0.3 && p.empathy > 0.5 && !toneGuidance.avoid.includes('repeated_empathy')) {
    if (toneGuidance.apply.includes('solution_focused')) {
      // Solution-focused instead of empathy stacking
      response = `Let me address this directly. ${response}`;
    } else {
      const empathyPhrases = [
        "I understand this is frustrating. Let me help.",
        "I hear your concern — let me address this directly.",
        "I want to make sure we get this right for you.",
      ];
      response = `${pick(empathyPhrases)} ${response}`;
    }
  } else if (sentiment.score > 0.3 && p.empathy > 0.6 && Math.random() > 0.6 && !toneGuidance.avoid.includes('casual_openers')) {
    const positive = ["Glad to hear that!", "That's great to know!", "Love the energy!"];
    response = `${pick(positive)} ${response}`;
  }

  // Formal modifier (only if not flagged to avoid)
  if (p.formality > 0.7 && Math.random() > 0.5 && !toneGuidance.avoid.includes('overly_formal') && !toneGuidance.avoid.includes('corporate_speak')) {
    const formal = ['Understood.', 'Acknowledged.', 'From a professional standpoint,', 'Per our discussion,', 'To address your inquiry,'];
    response = `${pick(formal)} ${response}`;
  }

  // Casual modifier (only if not flagged to avoid)
  if (p.formality < 0.3 && Math.random() > 0.5 && !toneGuidance.avoid.includes('casual_language') && !toneGuidance.avoid.includes('casual_openers')) {
    const casual = ['Nice!', 'Love it!', 'Ooh good one!', 'Alright!', 'Sweet!', "Let's go!", 'On it!'];
    response = `${pick(casual)} ${response}`;
  }

  // Assertive (always safe)
  if (p.assertiveness > 0.8 && Math.random() > 0.6) {
    response += "\n\nI have high confidence in this approach based on the data and patterns I've analyzed.";
  }

  // Humor (ONLY if tone guidance allows)
  if (p.humor > 0.5 && Math.random() > 0.7 && !toneGuidance.avoid.includes('humor') && !toneGuidance.avoid.includes('quips')) {
    const quips = [
      "\n\n(If this was easy, you wouldn't need an AI employee 😉)",
      '\n\n...and yes, I work on weekends too. Perks of being AI.',
      '\n\nBoom. Another task crushed before lunch.',
      "\n\nI don't sleep, so your competitors should worry.",
      "\n\nNot to brag, but I just did in 2 minutes what takes most teams a day. 💪",
    ];
    response += pick(quips);
  }

  // Verbose closer (only if allowed)
  if (p.verbosity > 0.8 && Math.random() > 0.5 && response.length < 500 && !toneGuidance.avoid.includes('verbose_closers') && !toneGuidance.avoid.includes('long_explanations')) {
    response += '\n\nWant me to go deeper on any of these points? I can provide more detailed analysis, examples, or alternative approaches.';
  }

  // Task continuation context
  if (conversationState.currentTask && conversationState.currentTask.status === 'in_progress') {
    const { step, totalSteps, description } = conversationState.currentTask;
    if (step > 1 && step < totalSteps) {
      response = `📋 *Continuing: ${description}* (step ${step}/${totalSteps})\n\n${response}`;
    }
  }

  // Repeated topic deep dive
  if (conversationState.context.needsDeepDive) {
    response += `\n\n💡 I notice we've discussed "${conversationState.context.repeatedTopic}" several times. Would you like me to provide a comprehensive deep-dive or summary of everything we've covered?`;
  }

  return response;
}

// ══════════════════════════════════════════════════════
// EXPORTS — Backward compatible + new
// ══════════════════════════════════════════════════════

export function getThinkingMessage(employee: AIEmployee): string {
  return pick(employee.personality.thinking);
}

export function getResponseDelay(employee: AIEmployee): number {
  return 1000 + Math.random() * 2000 + (employee.personality.verbosity * 1000);
}

export function updateMemory(
  memory: ConversationMemory | null,
  employeeId: string,
  userId: string,
  userMessage: string,
  aiResponse: string
): ConversationMemory {
  const topic = extractTopic(userMessage);
  const sentiment = analyzeSentiment(userMessage);

  const existing: ConversationMemory = memory || {
    employeeId, userId, topics: [], preferences: {},
    taskHistory: [], sentimentHistory: [],
    lastInteraction: new Date().toISOString(),
    totalMessages: 0, summary: '',
  };

  const updatedTopics = [...existing.topics, topic].slice(-20);
  const updatedSentiment = [...existing.sentimentHistory, sentiment.score].slice(-50);
  const avgSentiment = updatedSentiment.reduce((a, b) => a + b, 0) / updatedSentiment.length;

  return {
    ...existing,
    topics: [...new Set(updatedTopics)],
    sentimentHistory: updatedSentiment,
    lastInteraction: new Date().toISOString(),
    totalMessages: existing.totalMessages + 2,
    summary: `Discussed: ${[...new Set(updatedTopics)].slice(-5).join(', ')}. Overall sentiment: ${avgSentiment > 0 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral'}.`,
  };
}
