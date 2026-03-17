/**
 * NexusHR Feature #28 — Advanced NLP Sentiment Engine Client
 * Full API client with React hooks, dual-mode (Worker backend + localStorage fallback)
 */

import { useState, useCallback } from 'react';

// ─── Types (mirror server) ──────────────────────────────────────────

export type PrimaryEmotion = 'frustration' | 'urgency' | 'satisfaction' | 'confusion' | 'anger' | 'trust';
export type SecondaryEmotion = 'anxiety' | 'relief' | 'disappointment' | 'excitement' | 'apathy' | 'gratitude' | 'contempt' | 'hope' | 'fear' | 'surprise';
export type SentimentPolarity = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
export type SarcasmType = 'verbal_irony' | 'situational_irony' | 'understatement' | 'hyperbole' | 'deadpan' | 'none';
export type IntentCategory = 'request_help' | 'complaint' | 'inquiry' | 'feedback_positive' | 'feedback_negative' | 'escalation' | 'cancellation' | 'renewal' | 'negotiation' | 'onboarding' | 'technical_issue' | 'billing_dispute' | 'feature_request' | 'general_conversation' | 'urgent_action';
export type TrajectoryTrend = 'improving' | 'stable' | 'declining' | 'volatile' | 'resolving' | 'escalating';
export type DatasetSplit = 'train' | 'validation' | 'test' | 'active_learning';
export type AnnotationStatus = 'pending' | 'single_annotated' | 'double_annotated' | 'adjudicated' | 'golden';

export interface EmotionVector {
  frustration: number;
  urgency: number;
  satisfaction: number;
  confusion: number;
  anger: number;
  trust: number;
}

export interface SecondaryEmotionVector {
  anxiety: number; relief: number; disappointment: number; excitement: number;
  apathy: number; gratitude: number; contempt: number; hope: number; fear: number; surprise: number;
}

export interface SarcasmMarker {
  type: 'punctuation' | 'intensifier' | 'contrast' | 'hyperbolic' | 'quotation' | 'emoji' | 'pragmatic';
  text: string; position: number; weight: number;
}

export interface SarcasmAnalysis {
  detected: boolean; type: SarcasmType; confidence: number;
  markers: SarcasmMarker[]; contrast_score: number; adjusted_polarity: number;
}

export interface IntentResult {
  primary: IntentCategory; primary_confidence: number;
  secondary: IntentCategory | null; secondary_confidence: number;
  action_required: boolean; urgency_level: number;
  slot_values: Record<string, string>;
}

export interface LinguisticFeatures {
  sentence_count: number; avg_sentence_length: number;
  exclamation_count: number; question_count: number;
  caps_ratio: number; negation_count: number;
  hedge_count: number; intensifier_count: number;
  profanity_detected: boolean; formality_score: number;
  subjectivity_score: number; readability_score: number;
  lexical_diversity: number; emotional_word_density: number;
}

export interface SentimentResult {
  id: string; text: string; polarity: SentimentPolarity;
  polarity_score: number; confidence: number;
  primary_emotion: PrimaryEmotion; emotion_vector: EmotionVector;
  secondary_emotions: SecondaryEmotionVector;
  sarcasm: SarcasmAnalysis; intent: IntentResult;
  context_influence: number; model_agreement: number;
  linguistic_features: LinguisticFeatures; created_at: string;
}

export interface EmotionTimelineEntry {
  message_index: number; timestamp: string; polarity_score: number;
  emotion_vector: EmotionVector; is_agent: boolean;
}

export interface InflectionPoint {
  message_index: number; timestamp: string;
  from_emotion: PrimaryEmotion; to_emotion: PrimaryEmotion;
  trigger_text: string; magnitude: number;
}

export interface ConversationTrajectory {
  conversation_id: string; messages_analyzed: number;
  current_trend: TrajectoryTrend; momentum: number;
  inflection_points: InflectionPoint[];
  emotion_timeline: EmotionTimelineEntry[];
  resolution_probability: number; escalation_risk: number;
  avg_response_sentiment: number; sentiment_variance: number;
  predicted_next_emotion: PrimaryEmotion;
  recommended_tone: string; recommended_actions: string[];
}

export interface TrainingLabels {
  polarity: SentimentPolarity; polarity_score: number;
  primary_emotion: PrimaryEmotion; emotion_vector: EmotionVector;
  sarcasm_detected: boolean; sarcasm_type: SarcasmType;
  intent: IntentCategory; secondary_intent?: IntentCategory;
  linguistic_features: Partial<LinguisticFeatures>;
}

export interface TrainingExample {
  id: string; text: string; context?: string[];
  labels: TrainingLabels; metadata: any;
  split: DatasetSplit; annotation_status: AnnotationStatus;
  annotators: any[]; created_at: string; updated_at: string;
}

export interface DatasetStats {
  total_examples: number;
  by_split: Record<DatasetSplit, number>;
  by_emotion: Record<PrimaryEmotion, number>;
  by_intent: Record<IntentCategory, number>;
  by_polarity: Record<SentimentPolarity, number>;
  sarcasm_ratio: number; inter_annotator_agreement: number;
  avg_annotation_confidence: number; label_distribution_entropy: number;
  coverage_gaps: string[];
}

export interface TransformerModelConfig {
  model_id: string; provider: string; weight: number;
  specialization: string; threshold: number;
  calibration_status: string; temperature: number; max_tokens: number;
}

export interface SentimentAnalytics {
  period: string; total_analyses: number;
  avg_confidence: number; avg_model_agreement: number;
  sarcasm_detection_rate: number;
  emotion_distribution: Record<string, number>;
  polarity_distribution: Record<string, number>;
  intent_distribution: Record<string, number>;
}

// ─── API Client ─────────────────────────────────────────────────────

const API_BASE = '/api/sentiment';
const STORE_KEY = 'nexushr_sentiment';

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}/${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn(`Sentiment API offline, using local fallback for ${path}`);
    return localFallback<T>(path, options);
  }
}

function localFallback<T>(path: string, options: RequestInit): T {
  const store = JSON.parse(localStorage.getItem(STORE_KEY) || '{"results":[],"training":[],"trajectories":[]}');

  if (path === 'analyze' && options.method === 'POST') {
    const body = JSON.parse(options.body as string);
    // Minimal local analysis
    const result: any = {
      id: crypto.randomUUID(),
      text: body.text,
      polarity: 'neutral',
      polarity_score: 0,
      confidence: 0.5,
      primary_emotion: 'satisfaction',
      emotion_vector: { frustration: 0, urgency: 0, satisfaction: 0.1, confusion: 0, anger: 0, trust: 0.1 },
      secondary_emotions: { anxiety: 0, relief: 0, disappointment: 0, excitement: 0, apathy: 0.5, gratitude: 0, contempt: 0, hope: 0, fear: 0, surprise: 0 },
      sarcasm: { detected: false, type: 'none', confidence: 0, markers: [], contrast_score: 0, adjusted_polarity: 0 },
      intent: { primary: 'general_conversation', primary_confidence: 0.5, secondary: null, secondary_confidence: 0, action_required: false, urgency_level: 0, slot_values: {} },
      context_influence: 0,
      model_agreement: 0.5,
      linguistic_features: { sentence_count: 1, avg_sentence_length: body.text.split(' ').length, exclamation_count: 0, question_count: 0, caps_ratio: 0, negation_count: 0, hedge_count: 0, intensifier_count: 0, profanity_detected: false, formality_score: 0.5, subjectivity_score: 0.5, readability_score: 0.5, lexical_diversity: 0.5, emotional_word_density: 0 },
      created_at: new Date().toISOString()
    };
    store.results.push(result);
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    return { success: true, result } as T;
  }

  if (path === 'analytics') {
    return { success: true, analytics: { period: '7d', total_analyses: store.results.length, avg_confidence: 0.5, avg_model_agreement: 0.5, sarcasm_detection_rate: 0, emotion_distribution: {}, polarity_distribution: {}, intent_distribution: {} } } as T;
  }

  return { success: true, data: [] } as T;
}

export const sentimentClient = {
  init: () => apiCall<{ success: boolean }>('init', { method: 'POST' }),

  analyze: (text: string, context?: string[]) =>
    apiCall<{ success: boolean; result: SentimentResult }>('analyze', { method: 'POST', body: JSON.stringify({ text, context }) }),

  analyzeBatch: (texts: { text: string; context?: string[] }[]) =>
    apiCall<{ success: boolean; results: SentimentResult[]; count: number }>('analyze/batch', { method: 'POST', body: JSON.stringify({ texts }) }),

  analyzeTrajectory: (conversationId: string, messages: { text: string; is_agent: boolean; timestamp: string }[]) =>
    apiCall<{ success: boolean; trajectory: ConversationTrajectory }>('trajectory', { method: 'POST', body: JSON.stringify({ conversation_id: conversationId, messages }) }),

  addTrainingExample: (example: Omit<TrainingExample, 'id' | 'created_at' | 'updated_at'>) =>
    apiCall<{ success: boolean; example: TrainingExample }>('training/examples', { method: 'POST', body: JSON.stringify(example) }),

  getTrainingExamples: (filters?: { split?: DatasetSplit; emotion?: PrimaryEmotion; intent?: IntentCategory; status?: AnnotationStatus; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        if (v !== undefined) params.set(k, String(v));
      }
    }
    return apiCall<{ success: boolean; examples: TrainingExample[]; total: number }>(`training/examples?${params}`);
  },

  getDatasetStats: () =>
    apiCall<{ success: boolean; stats: DatasetStats }>('training/stats'),

  autoLabel: (text: string, correct: boolean, corrections?: Partial<TrainingLabels>) =>
    apiCall<{ success: boolean; example: TrainingExample }>('training/auto-label', { method: 'POST', body: JSON.stringify({ text, correct, corrections }) }),

  getModels: () =>
    apiCall<{ success: boolean; models: TransformerModelConfig[] }>('models'),

  updateModel: (modelId: string, updates: Partial<TransformerModelConfig>) =>
    apiCall<{ success: boolean; model: TransformerModelConfig }>(`models/${modelId}`, { method: 'PUT', body: JSON.stringify(updates) }),

  getAnalytics: (period?: string) =>
    apiCall<{ success: boolean; analytics: SentimentAnalytics }>(`analytics?period=${period || '7d'}`),

  getLexicon: () =>
    apiCall<{ success: boolean; lexicon: Record<string, any>; emotions: string[]; intents: string[] }>('lexicon'),

  getIntents: () =>
    apiCall<{ success: boolean; intents: { name: string; keyword_count: number; pattern_count: number; priority: number }[] }>('intents'),

  getSarcasmIndicators: () =>
    apiCall<{ success: boolean; indicators: { type: string; count: number; weight: number }[] }>('sarcasm/indicators'),
};

// ─── React Hooks ────────────────────────────────────────────────────

export function useSentimentAnalysis() {
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (text: string, context?: string[]) => {
    setLoading(true); setError(null);
    try {
      const res = await sentimentClient.analyze(text, context);
      setResult(res.result);
      return res.result;
    } catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  return { result, loading, error, analyze };
}

export function useBatchSentiment() {
  const [results, setResults] = useState<SentimentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeBatch = useCallback(async (texts: { text: string; context?: string[] }[]) => {
    setLoading(true); setError(null);
    try {
      const res = await sentimentClient.analyzeBatch(texts);
      setResults(res.results);
      return res.results;
    } catch (e: any) { setError(e.message); return []; }
    finally { setLoading(false); }
  }, []);

  return { results, loading, error, analyzeBatch };
}

export function useConversationTrajectory() {
  const [trajectory, setTrajectory] = useState<ConversationTrajectory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (conversationId: string, messages: { text: string; is_agent: boolean; timestamp: string }[]) => {
    setLoading(true); setError(null);
    try {
      const res = await sentimentClient.analyzeTrajectory(conversationId, messages);
      setTrajectory(res.trajectory);
      return res.trajectory;
    } catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  return { trajectory, loading, error, analyze };
}

export function useTrainingDataset() {
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExamples = useCallback(async (filters?: any) => {
    setLoading(true); setError(null);
    try {
      const res = await sentimentClient.getTrainingExamples(filters);
      setExamples(res.examples);
      return res;
    } catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await sentimentClient.getDatasetStats();
      setStats(res.stats);
      return res.stats;
    } catch (e: any) { setError(e.message); return null; }
  }, []);

  const addExample = useCallback(async (example: any) => {
    try {
      const res = await sentimentClient.addTrainingExample(example);
      return res.example;
    } catch (e: any) { setError(e.message); return null; }
  }, []);

  const autoLabel = useCallback(async (text: string, correct: boolean, corrections?: Partial<TrainingLabels>) => {
    try {
      const res = await sentimentClient.autoLabel(text, correct, corrections);
      return res.example;
    } catch (e: any) { setError(e.message); return null; }
  }, []);

  return { examples, stats, loading, error, loadExamples, loadStats, addExample, autoLabel };
}

export function useSentimentModels() {
  const [models, setModels] = useState<TransformerModelConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await sentimentClient.getModels();
      setModels(res.models);
      return res.models;
    } catch (e: any) { setError(e.message); return []; }
    finally { setLoading(false); }
  }, []);

  const updateModel = useCallback(async (modelId: string, updates: Partial<TransformerModelConfig>) => {
    try {
      const res = await sentimentClient.updateModel(modelId, updates);
      setModels(prev => prev.map(m => m.model_id === modelId ? res.model : m));
      return res.model;
    } catch (e: any) { setError(e.message); return null; }
  }, []);

  return { models, loading, error, loadModels, updateModel };
}

export function useSentimentAnalytics() {
  const [analytics, setAnalytics] = useState<SentimentAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (period?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await sentimentClient.getAnalytics(period);
      setAnalytics(res.analytics);
      return res.analytics;
    } catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  return { analytics, loading, error, loadAnalytics };
}

export function useEmotionLexicon() {
  const [lexicon, setLexicon] = useState<Record<string, any> | null>(null);
  const [intents, setIntents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lexRes, intentRes] = await Promise.all([sentimentClient.getLexicon(), sentimentClient.getIntents()]);
      setLexicon(lexRes.lexicon);
      setIntents(intentRes.intents);
    } catch (_e) { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  return { lexicon, intents, loading, load };
}

export function useSarcasmDetection() {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadIndicators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sentimentClient.getSarcasmIndicators();
      setIndicators(res.indicators);
    } catch (_e) { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  return { indicators, loading, loadIndicators };
}
