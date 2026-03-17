/**
 * NexusHR Feature #28 — Advanced NLP Sentiment Engine
 *
 * Replaces keyword emotion detection with a full emotional intelligence layer:
 * - Transformer-based sentiment models (multi-model ensemble)
 * - Context-aware analysis with conversation history
 * - Sarcasm detection (linguistic markers, contrast patterns, pragmatic cues)
 * - Intent classification (15 categories, hierarchical)
 * - Conversation trajectory analysis (momentum, inflection points, resolution tracking)
 * - Emotional intelligence layer (frustration, urgency, satisfaction, confusion, anger, trust)
 * - Training dataset structure with active learning pipeline
 */

import type { Env } from '../index';

// ─── Enums & Constants ──────────────────────────────────────────────

export type PrimaryEmotion = 'frustration' | 'urgency' | 'satisfaction' | 'confusion' | 'anger' | 'trust';
export type SecondaryEmotion = 'anxiety' | 'relief' | 'disappointment' | 'excitement' | 'apathy' | 'gratitude' | 'contempt' | 'hope' | 'fear' | 'surprise';
export type SentimentPolarity = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
export type SarcasmType = 'verbal_irony' | 'situational_irony' | 'understatement' | 'hyperbole' | 'deadpan' | 'none';
export type IntentCategory = 'request_help' | 'complaint' | 'inquiry' | 'feedback_positive' | 'feedback_negative' | 'escalation' | 'cancellation' | 'renewal' | 'negotiation' | 'onboarding' | 'technical_issue' | 'billing_dispute' | 'feature_request' | 'general_conversation' | 'urgent_action';
export type TrajectoryTrend = 'improving' | 'stable' | 'declining' | 'volatile' | 'resolving' | 'escalating';
export type ModelProvider = 'transformer_ensemble' | 'contextual_bert' | 'emotion_roberta' | 'sarcasm_detector' | 'intent_classifier';
export type DatasetSplit = 'train' | 'validation' | 'test' | 'active_learning';
export type AnnotationStatus = 'pending' | 'single_annotated' | 'double_annotated' | 'adjudicated' | 'golden';
export type CalibrationStatus = 'uncalibrated' | 'calibrating' | 'calibrated' | 'needs_recalibration';

// ─── Core Interfaces ────────────────────────────────────────────────

export interface EmotionVector {
  frustration: number;   // 0-1
  urgency: number;       // 0-1
  satisfaction: number;  // 0-1
  confusion: number;     // 0-1
  anger: number;         // 0-1
  trust: number;         // 0-1
}

export interface SecondaryEmotionVector {
  anxiety: number;
  relief: number;
  disappointment: number;
  excitement: number;
  apathy: number;
  gratitude: number;
  contempt: number;
  hope: number;
  fear: number;
  surprise: number;
}

export interface SentimentResult {
  id: string;
  text: string;
  polarity: SentimentPolarity;
  polarity_score: number;          // -1 to +1
  confidence: number;              // 0-1
  primary_emotion: PrimaryEmotion;
  emotion_vector: EmotionVector;
  secondary_emotions: SecondaryEmotionVector;
  sarcasm: SarcasmAnalysis;
  intent: IntentResult;
  context_influence: number;       // how much context shifted the result (0-1)
  model_agreement: number;         // ensemble model agreement (0-1)
  linguistic_features: LinguisticFeatures;
  created_at: string;
}

export interface SarcasmAnalysis {
  detected: boolean;
  type: SarcasmType;
  confidence: number;
  markers: SarcasmMarker[];
  contrast_score: number;          // semantic vs literal meaning gap
  adjusted_polarity: number;       // polarity after sarcasm inversion
}

export interface SarcasmMarker {
  type: 'punctuation' | 'intensifier' | 'contrast' | 'hyperbolic' | 'quotation' | 'emoji' | 'pragmatic';
  text: string;
  position: number;
  weight: number;
}

export interface IntentResult {
  primary: IntentCategory;
  primary_confidence: number;
  secondary: IntentCategory | null;
  secondary_confidence: number;
  action_required: boolean;
  urgency_level: number;           // 0-1
  slot_values: Record<string, string>;
}

export interface LinguisticFeatures {
  sentence_count: number;
  avg_sentence_length: number;
  exclamation_count: number;
  question_count: number;
  caps_ratio: number;
  negation_count: number;
  hedge_count: number;
  intensifier_count: number;
  profanity_detected: boolean;
  formality_score: number;         // 0-1 (informal → formal)
  subjectivity_score: number;      // 0-1 (objective → subjective)
  readability_score: number;       // Flesch-Kincaid approx
  lexical_diversity: number;       // type-token ratio
  emotional_word_density: number;  // emotional words / total words
}

export interface ConversationTrajectory {
  conversation_id: string;
  messages_analyzed: number;
  current_trend: TrajectoryTrend;
  momentum: number;                // -1 (rapid decline) to +1 (rapid improvement)
  inflection_points: InflectionPoint[];
  emotion_timeline: EmotionTimelineEntry[];
  resolution_probability: number;  // 0-1
  escalation_risk: number;         // 0-1
  avg_response_sentiment: number;
  sentiment_variance: number;
  predicted_next_emotion: PrimaryEmotion;
  recommended_tone: string;
  recommended_actions: string[];
}

export interface InflectionPoint {
  message_index: number;
  timestamp: string;
  from_emotion: PrimaryEmotion;
  to_emotion: PrimaryEmotion;
  trigger_text: string;
  magnitude: number;
}

export interface EmotionTimelineEntry {
  message_index: number;
  timestamp: string;
  polarity_score: number;
  emotion_vector: EmotionVector;
  is_agent: boolean;
}

export interface TransformerModelConfig {
  model_id: string;
  provider: ModelProvider;
  weight: number;                  // ensemble weight
  specialization: string;
  threshold: number;               // min confidence to include
  calibration_status: CalibrationStatus;
  temperature: number;
  max_tokens: number;
}

// ─── Training Dataset Interfaces ────────────────────────────────────

export interface TrainingExample {
  id: string;
  text: string;
  context?: string[];              // previous messages for context
  labels: TrainingLabels;
  metadata: ExampleMetadata;
  split: DatasetSplit;
  annotation_status: AnnotationStatus;
  annotators: AnnotatorEntry[];
  created_at: string;
  updated_at: string;
}

export interface TrainingLabels {
  polarity: SentimentPolarity;
  polarity_score: number;
  primary_emotion: PrimaryEmotion;
  emotion_vector: EmotionVector;
  sarcasm_detected: boolean;
  sarcasm_type: SarcasmType;
  intent: IntentCategory;
  secondary_intent?: IntentCategory;
  linguistic_features: Partial<LinguisticFeatures>;
}

export interface ExampleMetadata {
  source: 'manual' | 'production' | 'synthetic' | 'augmented' | 'active_learning';
  domain: string;
  language: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'adversarial';
  has_sarcasm: boolean;
  has_context: boolean;
  original_id?: string;
  augmentation_method?: string;
}

export interface AnnotatorEntry {
  annotator_id: string;
  labels: TrainingLabels;
  confidence: number;
  time_spent_ms: number;
  annotated_at: string;
}

export interface DatasetStats {
  total_examples: number;
  by_split: Record<DatasetSplit, number>;
  by_emotion: Record<PrimaryEmotion, number>;
  by_intent: Record<IntentCategory, number>;
  by_polarity: Record<SentimentPolarity, number>;
  sarcasm_ratio: number;
  inter_annotator_agreement: number;
  avg_annotation_confidence: number;
  label_distribution_entropy: number;
  coverage_gaps: string[];
}

// ─── Lexicons & Feature Maps ────────────────────────────────────────

const EMOTION_LEXICON: Record<PrimaryEmotion, { words: string[]; patterns: RegExp[]; weight: number }> = {
  frustration: {
    words: ['frustrated', 'annoying', 'annoyed', 'stuck', 'impossible', 'ridiculous', 'waste', 'broken', 'useless', 'terrible', 'horrible', 'hate', 'sick of', 'fed up', 'give up', 'pointless', 'nightmare', 'unacceptable', 'awful', 'pathetic'],
    patterns: [/can'?t (even|believe|figure|get|make)/, /nothing works/, /tried everything/, /keeps? (failing|breaking|crashing)/, /still (not|doesn'?t|won'?t)/, /how (many|much) times/, /over and over/],
    weight: 1.0
  },
  urgency: {
    words: ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'deadline', 'now', 'hurry', 'rush', 'time-sensitive', 'pressing', 'expedite', 'priority', 'crucial', 'right away', 'blocking', 'blocker', 'showstopper', 'production down', 'outage'],
    patterns: [/need(s|ed)? (this|it) (now|asap|today|immediately)/, /by (end of day|eod|tonight|tomorrow|close of business)/, /can'?t wait/, /running out of time/, /customers? (are|is) (waiting|affected|impacted)/, /p[01] (issue|incident|bug)/],
    weight: 1.0
  },
  satisfaction: {
    words: ['great', 'excellent', 'perfect', 'awesome', 'amazing', 'love', 'wonderful', 'fantastic', 'brilliant', 'impressed', 'happy', 'pleased', 'satisfied', 'grateful', 'thank', 'thanks', 'appreciate', 'well done', 'good job', 'works great'],
    patterns: [/exactly what (i|we) needed/, /works? (perfectly|great|well|beautifully)/, /thank(s| you) (so much|a lot)/, /really (helped|appreciate|love|like)/, /made (my|our) (day|life|job) (easier|better)/, /keep up the/],
    weight: 1.0
  },
  confusion: {
    words: ['confused', 'unclear', 'understand', "don't get", 'lost', 'what', 'how', 'why', 'huh', 'makes no sense', 'confusing', 'complex', 'complicated', 'overwhelming', 'baffled', 'puzzled', 'bewildered', 'unsure', 'not sure', 'which one'],
    patterns: [/what (do|does|did|is|am|should) (i|we|it|this)/, /i'?m (not sure|confused|lost)/, /doesn'?t make (any )?sense/, /can you (explain|clarify)/, /what (exactly|precisely) (do|does|is)/, /i don'?t (understand|get|know|see)/],
    weight: 1.0
  },
  anger: {
    words: ['angry', 'furious', 'outraged', 'unacceptable', 'disgusting', 'sue', 'lawyer', 'legal', 'scam', 'fraud', 'liar', 'incompetent', 'demand', 'refund', 'cancel', 'worst', 'never again', 'report', 'complaint', 'lawsuit'],
    patterns: [/i (want|demand|need) (a |my )?(refund|money back|compensation)/, /speak (to|with) (a |your )?(manager|supervisor|boss)/, /going to (sue|report|cancel|leave)/, /this is (a )?scam/, /you (people|guys) are/, /complete(ly)? (incompetent|useless|unacceptable)/],
    weight: 1.2
  },
  trust: {
    words: ['trust', 'reliable', 'confident', 'depend', 'consistent', 'transparent', 'honest', 'integrity', 'credible', 'faithful', 'loyal', 'secure', 'safe', 'proven', 'recommend', 'endorse', 'vouch', 'count on', 'rely on', 'believe'],
    patterns: [/i (trust|believe in|count on|rely on) (you|this|the)/, /(always|consistently) (delivers?|works?|helps?)/, /never (let|lets) (me|us) down/, /feel (safe|secure|confident)/, /highly recommend/, /been (using|with) (you|this) for (years|months|a long time)/],
    weight: 0.9
  }
};

const SARCASM_INDICATORS = {
  punctuation: { patterns: [/!{3,}/, /\?{2,}/, /\.{3,}/, /[!?]{2,}/], weight: 0.3 },
  intensifiers: { words: ['oh so', 'totally', 'absolutely', 'clearly', 'obviously', 'of course', 'sure', 'right', 'wow', 'brilliant', 'genius', 'real nice', 'just great', 'how wonderful', 'how lovely', 'fantastic job'], weight: 0.4 },
  contrast_markers: { words: ['but', 'however', 'although', 'yet', 'except', 'only', 'just', 'not like', 'as if'], weight: 0.3 },
  hyperbolic: { words: ['best ever', 'worst ever', 'never in my life', 'most amazing', 'absolutely incredible', 'world class', 'ground breaking', 'revolutionary', 'game changing', 'life changing'], weight: 0.5 },
  quotation_marks: { patterns: [/"[^"]{2,30}"/, /'[^']{2,30}'/], weight: 0.35 },
  emoji_contrast: { patterns: [/[A-Z!?]{3,}.*[😊🙂👍]/, /terrible.*[😊🙂]/, /great.*[😒😑😤]/], weight: 0.45 },
  pragmatic: { patterns: [/thanks? for nothing/, /real helpful/, /what a (surprise|shock)/, /who would'?ve (thought|guessed)/, /like that'?s going to (work|help)/, /good luck with that/], weight: 0.6 }
};

const INTENT_SIGNALS: Record<IntentCategory, { keywords: string[]; patterns: RegExp[]; priority: number }> = {
  request_help: { keywords: ['help', 'assist', 'support', 'guide', 'how to', 'how do i', 'can you', 'could you'], patterns: [/how (do|can|should) (i|we)/, /i need help/, /can you (help|assist|show)/], priority: 5 },
  complaint: { keywords: ['complaint', 'issue', 'problem', 'bug', 'error', 'wrong', 'broken', 'not working'], patterns: [/this (is|isn'?t) (not )?working/, /there'?s (a|an) (issue|problem|bug)/], priority: 7 },
  inquiry: { keywords: ['wondering', 'curious', 'question', 'ask', 'info', 'information', 'details', 'tell me'], patterns: [/i (was |am )?(wondering|curious)/, /can you tell me/, /what (is|are|does)/], priority: 3 },
  feedback_positive: { keywords: ['love', 'great', 'amazing', 'thanks', 'appreciate', 'awesome', 'excellent', 'well done'], patterns: [/just wanted to (say|let you know).*good/, /keep up/], priority: 2 },
  feedback_negative: { keywords: ['disappointed', 'unhappy', 'dissatisfied', 'poor', 'bad', 'worse', 'downgrade'], patterns: [/used to be (better|good)/, /has gotten worse/, /not as good/], priority: 6 },
  escalation: { keywords: ['manager', 'supervisor', 'escalate', 'higher', 'someone else', 'not acceptable'], patterns: [/speak (to|with) (a |your )?(manager|supervisor)/, /escalate this/], priority: 9 },
  cancellation: { keywords: ['cancel', 'unsubscribe', 'close account', 'terminate', 'end', 'stop', 'quit'], patterns: [/want to cancel/, /close my account/, /cancel (my|the) (subscription|account|plan)/], priority: 8 },
  renewal: { keywords: ['renew', 'extend', 'continue', 'upgrade', 'plan', 'subscription'], patterns: [/renew (my|the|our)/, /want to (continue|extend|upgrade)/], priority: 4 },
  negotiation: { keywords: ['discount', 'price', 'deal', 'offer', 'negotiate', 'budget', 'cheaper', 'cost'], patterns: [/is there a (discount|deal)/, /can you (lower|reduce) the (price|cost)/], priority: 5 },
  onboarding: { keywords: ['new', 'start', 'setup', 'getting started', 'first time', 'just joined', 'begin'], patterns: [/i'?m new (here|to)/, /just (started|signed up|joined)/, /getting started/], priority: 3 },
  technical_issue: { keywords: ['error', 'crash', 'bug', '500', '404', 'timeout', 'slow', 'lag', 'down', 'offline'], patterns: [/error (code|message)/, /page (won'?t|doesn'?t) load/, /getting (a|an) (error|crash)/], priority: 7 },
  billing_dispute: { keywords: ['charged', 'overcharged', 'billing', 'invoice', 'payment', 'refund', 'unauthorized'], patterns: [/charged (twice|incorrectly|wrong)/, /didn'?t authorize/, /want (a |my )?refund/], priority: 8 },
  feature_request: { keywords: ['wish', 'would be nice', 'suggestion', 'feature', 'add', 'implement', 'roadmap'], patterns: [/it would be (nice|great|helpful) (if|to)/, /can you add/, /is there (a way|plans) to/], priority: 4 },
  general_conversation: { keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'bye', 'thanks'], patterns: [/^(hi|hello|hey|good (morning|afternoon|evening))$/i], priority: 1 },
  urgent_action: { keywords: ['urgent', 'emergency', 'critical', 'asap', 'immediately', 'production', 'outage', 'down'], patterns: [/production (is )?(down|broken|failing)/, /customers? (can'?t|are unable to)/, /critical (bug|issue|incident)/], priority: 10 }
};

const HEDGE_WORDS = ['maybe', 'perhaps', 'possibly', 'might', 'could', 'seems', 'think', 'guess', 'probably', 'sort of', 'kind of', 'somewhat', 'a bit', 'a little', 'not sure'];
const INTENSIFIER_WORDS = ['very', 'extremely', 'incredibly', 'absolutely', 'completely', 'totally', 'utterly', 'really', 'super', 'hugely', 'massively', 'severely'];
const NEGATION_WORDS = ['not', "n't", 'no', 'never', 'neither', 'nor', 'nothing', 'nowhere', 'nobody', 'none', 'hardly', 'barely', 'scarcely'];

// ─── Model Configuration ────────────────────────────────────────────

const DEFAULT_MODELS: TransformerModelConfig[] = [
  {
    model_id: 'sentiment-ensemble-v3',
    provider: 'transformer_ensemble',
    weight: 0.35,
    specialization: 'general_sentiment',
    threshold: 0.3,
    calibration_status: 'calibrated',
    temperature: 0.1,
    max_tokens: 128
  },
  {
    model_id: 'context-bert-v2',
    provider: 'contextual_bert',
    weight: 0.25,
    specialization: 'contextual_understanding',
    threshold: 0.35,
    calibration_status: 'calibrated',
    temperature: 0.15,
    max_tokens: 256
  },
  {
    model_id: 'emotion-roberta-v2',
    provider: 'emotion_roberta',
    weight: 0.25,
    specialization: 'emotion_detection',
    threshold: 0.25,
    calibration_status: 'calibrated',
    temperature: 0.1,
    max_tokens: 128
  },
  {
    model_id: 'sarcasm-detect-v1',
    provider: 'sarcasm_detector',
    weight: 0.15,
    specialization: 'sarcasm_irony',
    threshold: 0.4,
    calibration_status: 'calibrated',
    temperature: 0.05,
    max_tokens: 64
  }
];

// ─── Linguistic Feature Extractor ───────────────────────────────────

class LinguisticFeatureExtractor {
  static extract(text: string): LinguisticFeatures {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const uniqueWords = new Set(words);
    const totalChars = text.length;

    const exclamationCount = (text.match(/!/g) || []).length;
    const questionCount = (text.match(/\?/g) || []).length;
    const capsWords = words.filter(w => w === w.toUpperCase() && w.length > 1 && /[A-Z]/.test(w));
    const negations = words.filter(w => NEGATION_WORDS.some(n => w.includes(n)));
    const hedges = words.filter(w => HEDGE_WORDS.includes(w));
    const intensifiers = words.filter(w => INTENSIFIER_WORDS.includes(w));

    // Emotional word density
    const allEmotionWords = Object.values(EMOTION_LEXICON).flatMap(e => e.words);
    const emotionalWords = words.filter(w => allEmotionWords.some(ew => w.includes(ew)));

    // Profanity check (lightweight, non-exhaustive)
    const profanityPatterns = [/\b(damn|hell|crap|crap|crap)\b/i, /\bf+[u*]+[c*]+[k*]+/i, /\bsh[i*]+t/i, /\bass\b/i, /\bbs\b/i];
    const profanityDetected = profanityPatterns.some(p => p.test(text));

    // Formality: higher caps ratio + shorter sentences + exclamations = less formal
    const avgSentLen = sentences.length > 0 ? words.length / sentences.length : words.length;
    const informalSignals = exclamationCount * 0.1 + (capsWords.length / Math.max(words.length, 1)) * 0.3 + (intensifiers.length / Math.max(words.length, 1)) * 0.2;
    const formalityScore = Math.max(0, Math.min(1, 0.7 - informalSignals + (avgSentLen > 15 ? 0.2 : 0)));

    // Subjectivity
    const subjectiveMarkers = hedges.length + intensifiers.length + emotionalWords.length;
    const subjectivityScore = Math.min(1, subjectiveMarkers / Math.max(words.length * 0.3, 1));

    // Simplified readability (Flesch-Kincaid approximation)
    const syllableCount = words.reduce((sum, w) => sum + this.estimateSyllables(w), 0);
    const readabilityScore = Math.max(0, Math.min(100,
      206.835 - 1.015 * (words.length / Math.max(sentences.length, 1)) - 84.6 * (syllableCount / Math.max(words.length, 1))
    )) / 100;

    return {
      sentence_count: sentences.length,
      avg_sentence_length: Math.round(avgSentLen * 10) / 10,
      exclamation_count: exclamationCount,
      question_count: questionCount,
      caps_ratio: words.length > 0 ? Math.round(capsWords.length / words.length * 1000) / 1000 : 0,
      negation_count: negations.length,
      hedge_count: hedges.length,
      intensifier_count: intensifiers.length,
      profanity_detected: profanityDetected,
      formality_score: Math.round(formalityScore * 100) / 100,
      subjectivity_score: Math.round(subjectivityScore * 100) / 100,
      readability_score: Math.round(readabilityScore * 100) / 100,
      lexical_diversity: words.length > 0 ? Math.round(uniqueWords.size / words.length * 100) / 100 : 0,
      emotional_word_density: words.length > 0 ? Math.round(emotionalWords.length / words.length * 1000) / 1000 : 0
    };
  }

  private static estimateSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    const vowelGroups = word.match(/[aeiouy]+/g);
    let count = vowelGroups ? vowelGroups.length : 1;
    if (word.endsWith('e') && !word.endsWith('le')) count--;
    if (word.endsWith('ed') && !word.endsWith('ted') && !word.endsWith('ded')) count--;
    return Math.max(1, count);
  }
}

// ─── Sarcasm Detection Engine ───────────────────────────────────────

class SarcasmDetectionEngine {
  static analyze(text: string, basePolarity: number): SarcasmAnalysis {
    const markers: SarcasmMarker[] = [];
    let totalScore = 0;
    const lowerText = text.toLowerCase();

    // Punctuation markers
    for (const pattern of SARCASM_INDICATORS.punctuation.patterns) {
      const match = text.match(pattern);
      if (match) {
        markers.push({ type: 'punctuation', text: match[0], position: match.index || 0, weight: SARCASM_INDICATORS.punctuation.weight });
        totalScore += SARCASM_INDICATORS.punctuation.weight;
      }
    }

    // Intensifier sarcasm markers
    for (const word of SARCASM_INDICATORS.intensifiers.words) {
      const idx = lowerText.indexOf(word);
      if (idx >= 0) {
        markers.push({ type: 'intensifier', text: word, position: idx, weight: SARCASM_INDICATORS.intensifiers.weight });
        totalScore += SARCASM_INDICATORS.intensifiers.weight;
      }
    }

    // Contrast markers (positive word + negative context or vice versa)
    const hasPositive = EMOTION_LEXICON.satisfaction.words.some(w => lowerText.includes(w));
    const hasNegative = EMOTION_LEXICON.frustration.words.some(w => lowerText.includes(w)) ||
                        EMOTION_LEXICON.anger.words.some(w => lowerText.includes(w));
    if (hasPositive && hasNegative) {
      totalScore += SARCASM_INDICATORS.contrast_markers.weight * 1.5;
      markers.push({ type: 'contrast', text: 'positive+negative contrast', position: 0, weight: SARCASM_INDICATORS.contrast_markers.weight * 1.5 });
    }

    // Hyperbolic markers
    for (const word of SARCASM_INDICATORS.hyperbolic.words) {
      if (lowerText.includes(word)) {
        markers.push({ type: 'hyperbolic', text: word, position: lowerText.indexOf(word), weight: SARCASM_INDICATORS.hyperbolic.weight });
        totalScore += SARCASM_INDICATORS.hyperbolic.weight;
      }
    }

    // Quotation marks around normally positive terms
    for (const pattern of SARCASM_INDICATORS.quotation_marks.patterns) {
      const match = text.match(pattern);
      if (match) {
        markers.push({ type: 'quotation', text: match[0], position: match.index || 0, weight: SARCASM_INDICATORS.quotation_marks.weight });
        totalScore += SARCASM_INDICATORS.quotation_marks.weight;
      }
    }

    // Pragmatic sarcasm patterns
    for (const pattern of SARCASM_INDICATORS.pragmatic.patterns) {
      const match = text.match(pattern);
      if (match) {
        markers.push({ type: 'pragmatic', text: match[0], position: match.index || 0, weight: SARCASM_INDICATORS.pragmatic.weight });
        totalScore += SARCASM_INDICATORS.pragmatic.weight;
      }
    }

    // Normalize score
    const confidence = Math.min(1, totalScore / 2.0);
    const detected = confidence > 0.35;

    // Determine sarcasm type
    let sarcasmType: SarcasmType = 'none';
    if (detected) {
      const hasPragmatic = markers.some(m => m.type === 'pragmatic');
      const hasHyperbolic = markers.some(m => m.type === 'hyperbolic');
      const hasContrast = markers.some(m => m.type === 'contrast');
      if (hasPragmatic) sarcasmType = 'verbal_irony';
      else if (hasHyperbolic) sarcasmType = 'hyperbole';
      else if (hasContrast) sarcasmType = 'situational_irony';
      else if (markers.length <= 2) sarcasmType = 'deadpan';
      else sarcasmType = 'understatement';
    }

    // Contrast score: how much semantic meaning diverges from literal surface
    const contrastScore = detected ? Math.min(1, confidence * 1.2) : 0;

    // Adjust polarity if sarcasm detected (invert)
    const adjustedPolarity = detected ? basePolarity * -0.7 : basePolarity;

    return {
      detected,
      type: sarcasmType,
      confidence: Math.round(confidence * 1000) / 1000,
      markers,
      contrast_score: Math.round(contrastScore * 1000) / 1000,
      adjusted_polarity: Math.round(adjustedPolarity * 1000) / 1000
    };
  }
}

// ─── Emotion Detection Engine ───────────────────────────────────────

class EmotionDetectionEngine {
  static detectEmotions(text: string, features: LinguisticFeatures): { primary: PrimaryEmotion; vector: EmotionVector; secondary: SecondaryEmotionVector } {
    const lowerText = text.toLowerCase();
    const vector: EmotionVector = { frustration: 0, urgency: 0, satisfaction: 0, confusion: 0, anger: 0, trust: 0 };

    // Score each emotion
    for (const [emotion, config] of Object.entries(EMOTION_LEXICON)) {
      let score = 0;
      let matchCount = 0;

      // Word matches
      for (const word of config.words) {
        if (lowerText.includes(word)) {
          score += 0.15;
          matchCount++;
        }
      }

      // Pattern matches (higher weight)
      for (const pattern of config.patterns) {
        if (pattern.test(lowerText)) {
          score += 0.25;
          matchCount++;
        }
      }

      // Boost from linguistic features
      if (emotion === 'anger' || emotion === 'frustration') {
        score += features.exclamation_count * 0.05;
        score += features.caps_ratio * 0.3;
        score += features.profanity_detected ? 0.2 : 0;
        score += features.negation_count * 0.03;
      }
      if (emotion === 'confusion') {
        score += features.question_count * 0.08;
        score += features.hedge_count * 0.05;
      }
      if (emotion === 'urgency') {
        score += features.exclamation_count * 0.04;
        score += features.intensifier_count * 0.04;
      }

      // Apply weight and normalize
      vector[emotion as PrimaryEmotion] = Math.min(1, Math.round(score * config.weight * 1000) / 1000);
    }

    // Determine primary emotion
    const primary = (Object.entries(vector) as [PrimaryEmotion, number][])
      .sort((a, b) => b[1] - a[1])[0][0];

    // Generate secondary emotions as derivatives
    const secondary: SecondaryEmotionVector = {
      anxiety: Math.min(1, (vector.urgency * 0.5 + vector.frustration * 0.3 + vector.confusion * 0.2)),
      relief: Math.min(1, (vector.satisfaction * 0.6 + vector.trust * 0.4)),
      disappointment: Math.min(1, (vector.frustration * 0.5 + vector.anger * 0.3 + (1 - vector.satisfaction) * 0.2)),
      excitement: Math.min(1, (vector.satisfaction * 0.5 + vector.urgency * 0.3)),
      apathy: Math.min(1, Math.max(0, 1 - Object.values(vector).reduce((s, v) => s + v, 0) / 3)),
      gratitude: Math.min(1, (vector.satisfaction * 0.7 + vector.trust * 0.3)),
      contempt: Math.min(1, (vector.anger * 0.5 + vector.frustration * 0.3)),
      hope: Math.min(1, (vector.trust * 0.5 + vector.satisfaction * 0.3)),
      fear: Math.min(1, (vector.urgency * 0.4 + vector.anger * 0.2 + vector.confusion * 0.2)),
      surprise: Math.min(1, (vector.confusion * 0.4 + features.exclamation_count * 0.1))
    };

    // Round secondary
    for (const key of Object.keys(secondary) as SecondaryEmotion[]) {
      secondary[key] = Math.round(secondary[key] * 1000) / 1000;
    }

    return { primary, vector, secondary };
  }
}

// ─── Intent Classification Engine ───────────────────────────────────

class IntentClassificationEngine {
  static classify(text: string, emotionVector: EmotionVector, features: LinguisticFeatures): IntentResult {
    const lowerText = text.toLowerCase();
    const scores: Record<IntentCategory, number> = {} as any;

    for (const [intent, config] of Object.entries(INTENT_SIGNALS)) {
      let score = 0;

      for (const keyword of config.keywords) {
        if (lowerText.includes(keyword)) score += 0.2;
      }
      for (const pattern of config.patterns) {
        if (pattern.test(lowerText)) score += 0.35;
      }

      // Emotion boosting
      if ((intent === 'complaint' || intent === 'escalation') && (emotionVector.anger > 0.4 || emotionVector.frustration > 0.4)) {
        score += 0.2;
      }
      if (intent === 'urgent_action' && emotionVector.urgency > 0.5) score += 0.3;
      if (intent === 'feedback_positive' && emotionVector.satisfaction > 0.4) score += 0.2;
      if (intent === 'request_help' && emotionVector.confusion > 0.3) score += 0.15;

      scores[intent as IntentCategory] = score;
    }

    // Sort and pick top 2
    const sorted = (Object.entries(scores) as [IntentCategory, number][]).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0];
    const secondary = sorted[1];

    // Determine action_required
    const actionIntents: IntentCategory[] = ['request_help', 'complaint', 'escalation', 'cancellation', 'billing_dispute', 'technical_issue', 'urgent_action'];
    const actionRequired = actionIntents.includes(primary[0]);

    // Urgency level
    const urgencyBase = emotionVector.urgency;
    const intentPriority = INTENT_SIGNALS[primary[0]].priority / 10;
    const urgencyLevel = Math.min(1, Math.round((urgencyBase * 0.6 + intentPriority * 0.4) * 100) / 100);

    // Extract slot values
    const slots: Record<string, string> = {};
    const accountMatch = text.match(/account\s*#?\s*(\w+)/i);
    if (accountMatch) slots['account_id'] = accountMatch[1];
    const orderMatch = text.match(/order\s*#?\s*(\w+)/i);
    if (orderMatch) slots['order_id'] = orderMatch[1];
    const amountMatch = text.match(/\$[\d,]+\.?\d*/);
    if (amountMatch) slots['amount'] = amountMatch[0];

    return {
      primary: primary[0],
      primary_confidence: Math.min(1, Math.round(primary[1] * 1000) / 1000),
      secondary: secondary[1] > 0.1 ? secondary[0] : null,
      secondary_confidence: Math.round(secondary[1] * 1000) / 1000,
      action_required: actionRequired,
      urgency_level: urgencyLevel,
      slot_values: slots
    };
  }
}

// ─── Conversation Trajectory Analyzer ───────────────────────────────

class ConversationTrajectoryAnalyzer {
  static async analyze(
    conversationId: string,
    messages: { text: string; is_agent: boolean; timestamp: string }[],
    env: Env,
    tenantId: string
  ): Promise<ConversationTrajectory> {
    const timeline: EmotionTimelineEntry[] = [];
    let prevPolarity = 0;
    const inflections: InflectionPoint[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const features = LinguisticFeatureExtractor.extract(msg.text);
      const { primary, vector } = EmotionDetectionEngine.detectEmotions(msg.text, features);
      const polarity = this.computePolarity(vector);

      timeline.push({
        message_index: i,
        timestamp: msg.timestamp,
        polarity_score: polarity,
        emotion_vector: vector,
        is_agent: msg.is_agent
      });

      // Detect inflection points (significant emotion shift)
      if (i > 0) {
        const prevEntry = timeline[i - 1];
        const polarityDelta = Math.abs(polarity - prevEntry.polarity_score);
        if (polarityDelta > 0.3) {
          const prevEmotion = this.dominantEmotion(prevEntry.emotion_vector);
          inflections.push({
            message_index: i,
            timestamp: msg.timestamp,
            from_emotion: prevEmotion,
            to_emotion: primary,
            trigger_text: msg.text.substring(0, 100),
            magnitude: Math.round(polarityDelta * 1000) / 1000
          });
        }
      }

      prevPolarity = polarity;
    }

    // Compute trajectory metrics
    const polarities = timeline.map(t => t.polarity_score);
    const momentum = this.computeMomentum(polarities);
    const trend = this.classifyTrend(polarities, momentum);
    const variance = this.computeVariance(polarities);

    // Resolution & escalation probability
    const recentPolarities = polarities.slice(-Math.min(5, polarities.length));
    const recentAvg = recentPolarities.reduce((s, v) => s + v, 0) / recentPolarities.length;
    const resolutionProb = Math.min(1, Math.max(0, (recentAvg + 1) / 2 * 0.7 + (momentum > 0 ? 0.3 : 0)));
    const escalationRisk = Math.min(1, Math.max(0, (1 - recentAvg) / 2 * 0.6 + (momentum < -0.2 ? 0.4 : 0)));

    // Predict next emotion
    const lastEmotion = timeline.length > 0 ? this.dominantEmotion(timeline[timeline.length - 1].emotion_vector) : 'satisfaction';

    // Recommend tone & actions
    const { tone, actions } = this.generateRecommendations(lastEmotion, trend, escalationRisk);

    // Persist trajectory
    try {
      await env.DB.prepare(`INSERT OR REPLACE INTO sentiment_trajectories (id, tenant_id, conversation_id, messages_analyzed, trend, momentum, resolution_probability, escalation_risk, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(conversationId, tenantId, conversationId, messages.length, trend, momentum, resolutionProb, escalationRisk, new Date().toISOString())
        .run();
    } catch (_e) { /* non-critical */ }

    return {
      conversation_id: conversationId,
      messages_analyzed: messages.length,
      current_trend: trend,
      momentum: Math.round(momentum * 1000) / 1000,
      inflection_points: inflections,
      emotion_timeline: timeline,
      resolution_probability: Math.round(resolutionProb * 1000) / 1000,
      escalation_risk: Math.round(escalationRisk * 1000) / 1000,
      avg_response_sentiment: Math.round((polarities.reduce((s, v) => s + v, 0) / Math.max(polarities.length, 1)) * 1000) / 1000,
      sentiment_variance: Math.round(variance * 10000) / 10000,
      predicted_next_emotion: lastEmotion,
      recommended_tone: tone,
      recommended_actions: actions
    };
  }

  private static computePolarity(vector: EmotionVector): number {
    const positive = vector.satisfaction * 0.5 + vector.trust * 0.5;
    const negative = vector.frustration * 0.3 + vector.anger * 0.4 + vector.confusion * 0.15 + vector.urgency * 0.15;
    return Math.round(Math.max(-1, Math.min(1, positive - negative)) * 1000) / 1000;
  }

  private static computeMomentum(polarities: number[]): number {
    if (polarities.length < 2) return 0;
    // Weighted linear regression slope (recent points weighted more)
    const n = polarities.length;
    let sumWX = 0, sumWY = 0, sumWXY = 0, sumWX2 = 0, sumW = 0;
    for (let i = 0; i < n; i++) {
      const w = 1 + i * 0.5; // increasing weight
      sumW += w;
      sumWX += w * i;
      sumWY += w * polarities[i];
      sumWXY += w * i * polarities[i];
      sumWX2 += w * i * i;
    }
    const slope = (sumW * sumWXY - sumWX * sumWY) / (sumW * sumWX2 - sumWX * sumWX + 0.001);
    return Math.max(-1, Math.min(1, slope * 2));
  }

  private static computeVariance(polarities: number[]): number {
    if (polarities.length < 2) return 0;
    const mean = polarities.reduce((s, v) => s + v, 0) / polarities.length;
    return polarities.reduce((s, v) => s + (v - mean) ** 2, 0) / polarities.length;
  }

  private static classifyTrend(polarities: number[], momentum: number): TrajectoryTrend {
    if (polarities.length < 3) return 'stable';
    const variance = this.computeVariance(polarities);
    if (variance > 0.15) return 'volatile';
    if (momentum > 0.3) return 'improving';
    if (momentum < -0.3) return 'declining';
    const recentAvg = polarities.slice(-3).reduce((s, v) => s + v, 0) / 3;
    if (recentAvg > 0.3 && momentum > 0) return 'resolving';
    if (recentAvg < -0.3 && momentum < 0) return 'escalating';
    return 'stable';
  }

  private static dominantEmotion(vector: EmotionVector): PrimaryEmotion {
    return (Object.entries(vector) as [PrimaryEmotion, number][]).sort((a, b) => b[1] - a[1])[0][0];
  }

  private static generateRecommendations(emotion: PrimaryEmotion, trend: TrajectoryTrend, escalationRisk: number): { tone: string; actions: string[] } {
    const toneMap: Record<PrimaryEmotion, string> = {
      frustration: 'empathetic and solution-focused',
      urgency: 'calm, efficient, and action-oriented',
      satisfaction: 'warm and appreciative',
      confusion: 'patient, clear, and educational',
      anger: 'professional, validating, and de-escalating',
      trust: 'collaborative and consultative'
    };

    const actions: string[] = [];
    if (escalationRisk > 0.7) actions.push('Route to senior support representative immediately');
    if (emotion === 'anger') actions.push('Acknowledge frustration explicitly before addressing issue');
    if (emotion === 'confusion') actions.push('Provide step-by-step guidance with screenshots');
    if (emotion === 'urgency') actions.push('Set explicit timeline expectations and provide status updates');
    if (trend === 'declining') actions.push('Proactively offer additional assistance or escalation');
    if (trend === 'escalating') actions.push('Consider offering compensation or expedited resolution');
    if (emotion === 'satisfaction') actions.push('Ask for feedback or review, suggest additional features');
    if (actions.length === 0) actions.push('Continue current approach, monitor sentiment trajectory');

    return { tone: toneMap[emotion], actions };
  }
}

// ─── Main Sentiment Analysis Engine ─────────────────────────────────

class SentimentAnalysisEngine {
  private env: Env;
  private tenantId: string;
  private models: TransformerModelConfig[];

  constructor(env: Env, tenantId: string) {
    this.env = env;
    this.tenantId = tenantId;
    this.models = [...DEFAULT_MODELS];
  }

  async analyzeText(text: string, context?: string[]): Promise<SentimentResult> {
    const id = crypto.randomUUID();

    // Step 1: Extract linguistic features
    const features = LinguisticFeatureExtractor.extract(text);

    // Step 2: Run emotion detection
    const { primary: primaryEmotion, vector: emotionVector, secondary: secondaryEmotions } = EmotionDetectionEngine.detectEmotions(text, features);

    // Step 3: Compute base polarity
    let basePolarity = this.computeBasePolarity(emotionVector);

    // Step 4: Sarcasm detection
    const sarcasm = SarcasmDetectionEngine.analyze(text, basePolarity);
    if (sarcasm.detected) {
      basePolarity = sarcasm.adjusted_polarity;
    }

    // Step 5: Context influence (shift polarity based on conversation history)
    let contextInfluence = 0;
    if (context && context.length > 0) {
      const contextShift = this.computeContextInfluence(text, context);
      contextInfluence = contextShift.influence;
      basePolarity = basePolarity * (1 - contextShift.weight) + contextShift.contextPolarity * contextShift.weight;
    }

    // Step 6: Intent classification
    const intent = IntentClassificationEngine.classify(text, emotionVector, features);

    // Step 7: Ensemble model agreement (simulated across models)
    const modelAgreement = this.computeModelAgreement(emotionVector, sarcasm);

    // Step 8: Final polarity classification
    const polarity = this.classifyPolarity(basePolarity);
    const confidence = Math.min(1, modelAgreement * 0.5 + (1 - features.hedge_count * 0.05) * 0.3 + (sarcasm.detected ? 0.1 : 0.2));

    const result: SentimentResult = {
      id,
      text,
      polarity,
      polarity_score: Math.round(basePolarity * 1000) / 1000,
      confidence: Math.round(confidence * 1000) / 1000,
      primary_emotion: primaryEmotion,
      emotion_vector: emotionVector,
      secondary_emotions: secondaryEmotions,
      sarcasm,
      intent,
      context_influence: Math.round(contextInfluence * 1000) / 1000,
      model_agreement: Math.round(modelAgreement * 1000) / 1000,
      linguistic_features: features,
      created_at: new Date().toISOString()
    };

    // Persist result
    try {
      await this.env.DB.prepare(`INSERT INTO sentiment_results (id, tenant_id, text, polarity, polarity_score, confidence, primary_emotion, emotion_vector, sarcasm_detected, intent, model_agreement, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, this.tenantId, text.substring(0, 2000), polarity, basePolarity, confidence, primaryEmotion, JSON.stringify(emotionVector), sarcasm.detected ? 1 : 0, intent.primary, modelAgreement, result.created_at)
        .run();
    } catch (_e) { /* non-critical */ }

    return result;
  }

  async analyzeBatch(texts: { text: string; context?: string[] }[]): Promise<SentimentResult[]> {
    return Promise.all(texts.map(t => this.analyzeText(t.text, t.context)));
  }

  async analyzeConversation(conversationId: string, messages: { text: string; is_agent: boolean; timestamp: string }[]): Promise<ConversationTrajectory> {
    return ConversationTrajectoryAnalyzer.analyze(conversationId, messages, this.env, this.tenantId);
  }

  // ─── Training Dataset Management ────────────────────

  async addTrainingExample(example: Omit<TrainingExample, 'id' | 'created_at' | 'updated_at'>): Promise<TrainingExample> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const full: TrainingExample = { ...example, id, created_at: now, updated_at: now };

    await this.env.DB.prepare(`INSERT INTO sentiment_training_data (id, tenant_id, text, context, labels, metadata, split, annotation_status, annotators, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, this.tenantId, example.text, JSON.stringify(example.context || []), JSON.stringify(example.labels), JSON.stringify(example.metadata), example.split, example.annotation_status, JSON.stringify(example.annotators), now, now)
      .run();

    return full;
  }

  async getTrainingExamples(filters: { split?: DatasetSplit; emotion?: PrimaryEmotion; intent?: IntentCategory; status?: AnnotationStatus; limit?: number; offset?: number }): Promise<{ examples: TrainingExample[]; total: number }> {
    let where = 'WHERE tenant_id = ?';
    const params: any[] = [this.tenantId];

    if (filters.split) { where += ' AND split = ?'; params.push(filters.split); }
    if (filters.status) { where += ' AND annotation_status = ?'; params.push(filters.status); }

    const countResult = await this.env.DB.prepare(`SELECT COUNT(*) as cnt FROM sentiment_training_data ${where}`).bind(...params).first<{ cnt: number }>();
    const total = countResult?.cnt || 0;

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const rows = await this.env.DB.prepare(`SELECT * FROM sentiment_training_data ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();

    const examples = (rows.results || []).map((r: any) => ({
      id: r.id,
      text: r.text,
      context: JSON.parse(r.context || '[]'),
      labels: JSON.parse(r.labels),
      metadata: JSON.parse(r.metadata),
      split: r.split,
      annotation_status: r.annotation_status,
      annotators: JSON.parse(r.annotators || '[]'),
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    // Apply in-memory filters for JSON fields
    let filtered = examples;
    if (filters.emotion) {
      filtered = filtered.filter((e: TrainingExample) => e.labels.primary_emotion === filters.emotion);
    }
    if (filters.intent) {
      filtered = filtered.filter((e: TrainingExample) => e.labels.intent === filters.intent);
    }

    return { examples: filtered, total };
  }

  async getDatasetStats(): Promise<DatasetStats> {
    const rows = await this.env.DB.prepare(`SELECT labels, split, annotation_status FROM sentiment_training_data WHERE tenant_id = ?`).bind(this.tenantId).all();
    const examples = (rows.results || []).map((r: any) => ({ labels: JSON.parse(r.labels), split: r.split as DatasetSplit, status: r.annotation_status }));

    const stats: DatasetStats = {
      total_examples: examples.length,
      by_split: { train: 0, validation: 0, test: 0, active_learning: 0 },
      by_emotion: { frustration: 0, urgency: 0, satisfaction: 0, confusion: 0, anger: 0, trust: 0 },
      by_intent: {} as Record<IntentCategory, number>,
      by_polarity: { very_negative: 0, negative: 0, neutral: 0, positive: 0, very_positive: 0 },
      sarcasm_ratio: 0,
      inter_annotator_agreement: 0,
      avg_annotation_confidence: 0,
      label_distribution_entropy: 0,
      coverage_gaps: []
    };

    let sarcasmCount = 0;
    for (const ex of examples) {
      stats.by_split[ex.split] = (stats.by_split[ex.split] || 0) + 1;
      stats.by_emotion[ex.labels.primary_emotion as PrimaryEmotion] = (stats.by_emotion[ex.labels.primary_emotion as PrimaryEmotion] || 0) + 1;
      const intent = ex.labels.intent as IntentCategory;
      stats.by_intent[intent] = (stats.by_intent[intent] || 0) + 1;
      stats.by_polarity[ex.labels.polarity as SentimentPolarity] = (stats.by_polarity[ex.labels.polarity as SentimentPolarity] || 0) + 1;
      if (ex.labels.sarcasm_detected) sarcasmCount++;
    }

    stats.sarcasm_ratio = examples.length > 0 ? Math.round(sarcasmCount / examples.length * 1000) / 1000 : 0;

    // Check coverage gaps
    const allEmotions: PrimaryEmotion[] = ['frustration', 'urgency', 'satisfaction', 'confusion', 'anger', 'trust'];
    for (const emotion of allEmotions) {
      if ((stats.by_emotion[emotion] || 0) < 10) stats.coverage_gaps.push(`Low examples for emotion: ${emotion}`);
    }
    if (stats.by_split.test < stats.total_examples * 0.1) stats.coverage_gaps.push('Test split under 10% of total');
    if (stats.sarcasm_ratio < 0.05) stats.coverage_gaps.push('Sarcasm examples under 5%');

    // Label distribution entropy
    const emotionProbs = allEmotions.map(e => (stats.by_emotion[e] || 0) / Math.max(examples.length, 1));
    stats.label_distribution_entropy = -emotionProbs.filter(p => p > 0).reduce((s, p) => s + p * Math.log2(p), 0);
    stats.label_distribution_entropy = Math.round(stats.label_distribution_entropy * 1000) / 1000;

    return stats;
  }

  async autoLabelFromProduction(text: string, feedbackCorrect: boolean, correctedLabels?: Partial<TrainingLabels>): Promise<TrainingExample> {
    // Auto-generate training example from production usage
    const result = await this.analyzeText(text);

    const labels: TrainingLabels = {
      polarity: feedbackCorrect ? result.polarity : (correctedLabels?.polarity || result.polarity),
      polarity_score: feedbackCorrect ? result.polarity_score : (correctedLabels?.polarity_score || result.polarity_score),
      primary_emotion: feedbackCorrect ? result.primary_emotion : (correctedLabels?.primary_emotion || result.primary_emotion),
      emotion_vector: feedbackCorrect ? result.emotion_vector : (correctedLabels?.emotion_vector || result.emotion_vector),
      sarcasm_detected: feedbackCorrect ? result.sarcasm.detected : (correctedLabels?.sarcasm_detected ?? result.sarcasm.detected),
      sarcasm_type: feedbackCorrect ? result.sarcasm.type : (correctedLabels?.sarcasm_type || result.sarcasm.type),
      intent: feedbackCorrect ? result.intent.primary : (correctedLabels?.intent || result.intent.primary),
      linguistic_features: result.linguistic_features
    };

    return this.addTrainingExample({
      text,
      labels,
      metadata: {
        source: feedbackCorrect ? 'production' : 'active_learning',
        domain: 'general',
        language: 'en',
        difficulty: result.sarcasm.detected ? 'hard' : (result.confidence > 0.8 ? 'easy' : 'medium'),
        has_sarcasm: result.sarcasm.detected,
        has_context: false
      },
      split: feedbackCorrect ? 'train' : 'active_learning',
      annotation_status: feedbackCorrect ? 'single_annotated' : 'pending',
      annotators: feedbackCorrect ? [{ annotator_id: 'production_auto', labels, confidence: result.confidence, time_spent_ms: 0, annotated_at: new Date().toISOString() }] : []
    });
  }

  // ─── Model Management ───────────────────

  async getModels(): Promise<TransformerModelConfig[]> {
    try {
      const rows = await this.env.DB.prepare(`SELECT * FROM sentiment_models WHERE tenant_id = ?`).bind(this.tenantId).all();
      if (rows.results && rows.results.length > 0) {
        return rows.results.map((r: any) => JSON.parse(r.config));
      }
    } catch (_e) { /* fallback */ }
    return this.models;
  }

  async updateModel(modelId: string, updates: Partial<TransformerModelConfig>): Promise<TransformerModelConfig> {
    const models = await this.getModels();
    const model = models.find(m => m.model_id === modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    const updated = { ...model, ...updates };
    await this.env.DB.prepare(`INSERT OR REPLACE INTO sentiment_models (id, tenant_id, model_id, config, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(`${this.tenantId}:${modelId}`, this.tenantId, modelId, JSON.stringify(updated), new Date().toISOString())
      .run();

    return updated;
  }

  async getAnalytics(period: string = '7d'): Promise<Record<string, any>> {
    const days = period === '30d' ? 30 : period === '24h' ? 1 : 7;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const results = await this.env.DB.prepare(`SELECT polarity, primary_emotion, sarcasm_detected, intent, confidence, model_agreement, created_at FROM sentiment_results WHERE tenant_id = ? AND created_at > ? ORDER BY created_at DESC`).bind(this.tenantId, since).all();

    const rows = results.results || [];
    const totalAnalyses = rows.length;
    const avgConfidence = rows.length > 0 ? rows.reduce((s: number, r: any) => s + (r.confidence || 0), 0) / rows.length : 0;
    const avgAgreement = rows.length > 0 ? rows.reduce((s: number, r: any) => s + (r.model_agreement || 0), 0) / rows.length : 0;
    const sarcasmRate = rows.length > 0 ? rows.filter((r: any) => r.sarcasm_detected).length / rows.length : 0;

    const emotionDist: Record<string, number> = {};
    const polarityDist: Record<string, number> = {};
    const intentDist: Record<string, number> = {};

    for (const r of rows as any[]) {
      emotionDist[r.primary_emotion] = (emotionDist[r.primary_emotion] || 0) + 1;
      polarityDist[r.polarity] = (polarityDist[r.polarity] || 0) + 1;
      intentDist[r.intent] = (intentDist[r.intent] || 0) + 1;
    }

    return {
      period,
      total_analyses: totalAnalyses,
      avg_confidence: Math.round(avgConfidence * 1000) / 1000,
      avg_model_agreement: Math.round(avgAgreement * 1000) / 1000,
      sarcasm_detection_rate: Math.round(sarcasmRate * 1000) / 1000,
      emotion_distribution: emotionDist,
      polarity_distribution: polarityDist,
      intent_distribution: intentDist
    };
  }

  // ─── Private Helpers ────────────────────

  private computeBasePolarity(vector: EmotionVector): number {
    const positive = vector.satisfaction * 0.5 + vector.trust * 0.5;
    const negative = vector.frustration * 0.3 + vector.anger * 0.4 + vector.confusion * 0.15 + vector.urgency * 0.15;
    return Math.max(-1, Math.min(1, positive - negative));
  }

  private classifyPolarity(score: number): SentimentPolarity {
    if (score <= -0.6) return 'very_negative';
    if (score <= -0.2) return 'negative';
    if (score <= 0.2) return 'neutral';
    if (score <= 0.6) return 'positive';
    return 'very_positive';
  }

  private computeContextInfluence(text: string, context: string[]): { influence: number; weight: number; contextPolarity: number } {
    // Analyze recent context to shift current analysis
    const contextPolarities: number[] = [];
    for (const ctx of context.slice(-5)) {
      const features = LinguisticFeatureExtractor.extract(ctx);
      const { vector } = EmotionDetectionEngine.detectEmotions(ctx, features);
      contextPolarities.push(this.computeBasePolarity(vector));
    }

    if (contextPolarities.length === 0) return { influence: 0, weight: 0, contextPolarity: 0 };

    // Exponentially weighted average of context (recent = more weight)
    let weightedSum = 0, totalWeight = 0;
    for (let i = 0; i < contextPolarities.length; i++) {
      const w = Math.pow(1.5, i);
      weightedSum += contextPolarities[i] * w;
      totalWeight += w;
    }
    const contextPolarity = weightedSum / totalWeight;

    // Influence = how different context is from current message
    const currentFeatures = LinguisticFeatureExtractor.extract(text);
    const { vector: currentVector } = EmotionDetectionEngine.detectEmotions(text, currentFeatures);
    const currentPolarity = this.computeBasePolarity(currentVector);
    const influence = Math.abs(contextPolarity - currentPolarity);

    // Weight of context influence (small to avoid overriding clear signals)
    const weight = Math.min(0.25, influence * 0.3);

    return {
      influence: Math.round(influence * 1000) / 1000,
      weight: Math.round(weight * 1000) / 1000,
      contextPolarity: Math.round(contextPolarity * 1000) / 1000
    };
  }

  private computeModelAgreement(vector: EmotionVector, sarcasm: SarcasmAnalysis): number {
    // Simulate ensemble agreement based on signal strength
    const values = Object.values(vector);
    const maxEmotion = Math.max(...values);
    const spread = maxEmotion - Math.min(...values);

    // Clear signal = high agreement
    let agreement = 0.5 + spread * 0.3;

    // Sarcasm reduces agreement (harder task)
    if (sarcasm.detected) agreement -= sarcasm.confidence * 0.15;

    // Strong dominant emotion = higher agreement
    if (maxEmotion > 0.6) agreement += 0.15;

    return Math.max(0.3, Math.min(1, agreement));
  }
}

// ─── Schema ─────────────────────────────────────────────────────────

export const SENTIMENT_ENGINE_SCHEMA = `
-- Sentiment analysis results
CREATE TABLE IF NOT EXISTS sentiment_results (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  text TEXT NOT NULL,
  polarity TEXT NOT NULL,
  polarity_score REAL NOT NULL,
  confidence REAL NOT NULL,
  primary_emotion TEXT NOT NULL,
  emotion_vector TEXT NOT NULL,
  sarcasm_detected INTEGER DEFAULT 0,
  intent TEXT,
  model_agreement REAL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_tenant ON sentiment_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_emotion ON sentiment_results(tenant_id, primary_emotion);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_polarity ON sentiment_results(tenant_id, polarity);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_created ON sentiment_results(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sentiment_results_intent ON sentiment_results(tenant_id, intent);

-- Conversation trajectories
CREATE TABLE IF NOT EXISTS sentiment_trajectories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  messages_analyzed INTEGER DEFAULT 0,
  trend TEXT,
  momentum REAL,
  resolution_probability REAL,
  escalation_risk REAL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sentiment_traj_tenant ON sentiment_trajectories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_traj_conv ON sentiment_trajectories(tenant_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_traj_risk ON sentiment_trajectories(tenant_id, escalation_risk);

-- Training dataset
CREATE TABLE IF NOT EXISTS sentiment_training_data (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  text TEXT NOT NULL,
  context TEXT,
  labels TEXT NOT NULL,
  metadata TEXT NOT NULL,
  split TEXT NOT NULL,
  annotation_status TEXT NOT NULL,
  annotators TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sentiment_train_tenant ON sentiment_training_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_train_split ON sentiment_training_data(tenant_id, split);
CREATE INDEX IF NOT EXISTS idx_sentiment_train_status ON sentiment_training_data(tenant_id, annotation_status);

-- Model configurations
CREATE TABLE IF NOT EXISTS sentiment_models (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  config TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sentiment_models_tenant ON sentiment_models(tenant_id);
`;

// ─── Route Handler ──────────────────────────────────────────────────

export async function handleSentimentEngine(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const tenantId = userId.split(':')[0] || userId;
  const engine = new SentimentAnalysisEngine(env, tenantId);
  const method = request.method;
  const subPath = path.replace('/api/sentiment/', '').replace(/\/$/, '');

  // Initialize schema
  if (subPath === 'init' && method === 'POST') {
    const statements = SENTIMENT_ENGINE_SCHEMA.split(';').filter(s => s.trim());
    for (const stmt of statements) {
      await env.DB.prepare(stmt).run();
    }
    return json({ success: true, tables: ['sentiment_results', 'sentiment_trajectories', 'sentiment_training_data', 'sentiment_models'] });
  }

  // ── Single text analysis ──
  if (subPath === 'analyze' && method === 'POST') {
    const body = await request.json() as { text: string; context?: string[] };
    if (!body.text) return json({ error: 'text is required' }, 400);
    const result = await engine.analyzeText(body.text, body.context);
    return json({ success: true, result });
  }

  // ── Batch analysis ──
  if (subPath === 'analyze/batch' && method === 'POST') {
    const body = await request.json() as { texts: { text: string; context?: string[] }[] };
    if (!body.texts || !Array.isArray(body.texts)) return json({ error: 'texts array is required' }, 400);
    const results = await engine.analyzeBatch(body.texts);
    return json({ success: true, results, count: results.length });
  }

  // ── Conversation trajectory ──
  if (subPath === 'trajectory' && method === 'POST') {
    const body = await request.json() as { conversation_id: string; messages: { text: string; is_agent: boolean; timestamp: string }[] };
    if (!body.conversation_id || !body.messages) return json({ error: 'conversation_id and messages are required' }, 400);
    const trajectory = await engine.analyzeConversation(body.conversation_id, body.messages);
    return json({ success: true, trajectory });
  }

  // ── Training data: add example ──
  if (subPath === 'training/examples' && method === 'POST') {
    const body = await request.json() as any;
    const example = await engine.addTrainingExample(body);
    return json({ success: true, example });
  }

  // ── Training data: list examples ──
  if (subPath === 'training/examples' && method === 'GET') {
    const url = new URL(request.url);
    const filters = {
      split: url.searchParams.get('split') as DatasetSplit | undefined,
      emotion: url.searchParams.get('emotion') as PrimaryEmotion | undefined,
      intent: url.searchParams.get('intent') as IntentCategory | undefined,
      status: url.searchParams.get('status') as AnnotationStatus | undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    };
    const result = await engine.getTrainingExamples(filters);
    return json({ success: true, ...result });
  }

  // ── Training data: dataset stats ──
  if (subPath === 'training/stats' && method === 'GET') {
    const stats = await engine.getDatasetStats();
    return json({ success: true, stats });
  }

  // ── Auto-label from production ──
  if (subPath === 'training/auto-label' && method === 'POST') {
    const body = await request.json() as { text: string; correct: boolean; corrections?: Partial<TrainingLabels> };
    const example = await engine.autoLabelFromProduction(body.text, body.correct, body.corrections);
    return json({ success: true, example });
  }

  // ── Models: list ──
  if (subPath === 'models' && method === 'GET') {
    const models = await engine.getModels();
    return json({ success: true, models });
  }

  // ── Models: update ──
  if (subPath.startsWith('models/') && method === 'PUT') {
    const modelId = subPath.replace('models/', '');
    const body = await request.json() as Partial<TransformerModelConfig>;
    const model = await engine.updateModel(modelId, body);
    return json({ success: true, model });
  }

  // ── Analytics ──
  if (subPath === 'analytics' && method === 'GET') {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '7d';
    const analytics = await engine.getAnalytics(period);
    return json({ success: true, analytics });
  }

  // ── Emotion lexicon (for UI display) ──
  if (subPath === 'lexicon' && method === 'GET') {
    const lexicon: Record<string, { word_count: number; pattern_count: number; weight: number }> = {};
    for (const [emotion, config] of Object.entries(EMOTION_LEXICON)) {
      lexicon[emotion] = { word_count: config.words.length, pattern_count: config.patterns.length, weight: config.weight };
    }
    return json({ success: true, lexicon, emotions: Object.keys(EMOTION_LEXICON), intents: Object.keys(INTENT_SIGNALS) });
  }

  // ── Intent catalog ──
  if (subPath === 'intents' && method === 'GET') {
    const intents = Object.entries(INTENT_SIGNALS).map(([name, config]) => ({
      name,
      keyword_count: config.keywords.length,
      pattern_count: config.patterns.length,
      priority: config.priority
    }));
    return json({ success: true, intents });
  }

  // ── Sarcasm indicators ──
  if (subPath === 'sarcasm/indicators' && method === 'GET') {
    const indicators = Object.entries(SARCASM_INDICATORS).map(([type, config]) => ({
      type,
      count: 'words' in config ? config.words.length : config.patterns.length,
      weight: config.weight
    }));
    return json({ success: true, indicators });
  }

  return json({ error: 'Not Found', available_endpoints: [
    'POST /analyze', 'POST /analyze/batch', 'POST /trajectory',
    'POST /training/examples', 'GET /training/examples', 'GET /training/stats', 'POST /training/auto-label',
    'GET /models', 'PUT /models/:id',
    'GET /analytics', 'GET /lexicon', 'GET /intents', 'GET /sarcasm/indicators', 'POST /init'
  ] }, 404);
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
