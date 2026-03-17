export interface JobType {
  id: string; title: string; icon: string; count: number; color: string;
}
export interface AIEmployee {
  id: string; name: string; role: string; jobType: string;
  avatar: string; emoji: string; skills: string[];
  rating: number; tasksCompleted: string; responseTime: string;
  hourlyRate: string; description: string; badge: 'Elite' | 'Pro';
  personality: PersonalityProfile; avatarColors: AvatarColors;
}
export interface PersonalityProfile {
  tone: 'formal' | 'casual' | 'friendly' | 'direct';
  formality: number; verbosity: number; humor: number;
  assertiveness: number; empathy: number;
  greeting: string; thinking: string[];
  expertise: string[];
  responseTemplates: Record<string, string[]>;
}
export interface AvatarColors {
  head: number; body: number; eyes: number; accent: number;
}
export interface Plan {
  slug: string; name: string; price: number; employees: number;
  compute: string; tasks: string; features: string[];
  highlighted: boolean; badge?: string;
}
export interface ChatMessage {
  id: string; from: 'user' | 'ai'; text: string; ts: string;
  employeeId?: string; thinking?: boolean;
  intent?: string; sentiment?: string;
}
export interface Subscriber {
  id: string; name: string; email: string; plan: string | null;
  subStatus: string | null; trialStatus: string; acctStatus: string;
  spend: number; employees: number; maxEmp: number;
}
export interface FleetConfig {
  jobType: string; name: string; icon: string;
  primary: string; fallback: string; temp: number; maxTok: number;
  enabled: boolean; stats: { req24h: number; lat: number; err: number; cost: number; };
}
export interface LLMModel { id: string; name: string; }
export interface ErrorLog {
  ts: string; type: string; model: string; error: string; severity: 'error' | 'warn' | 'info';
}
export interface UsageRecord {
  date: string; tasks: number; compute: number; cost: number;
}
export interface AuthState {
  status: 'logged_out' | 'login' | 'signup' | 'onboarding' | 'trial' | 'subscribed' | 'trial_expired' | 'admin';
  user: { id: string; name: string; email: string; password: string; role: string; systemRole: string; } | null;
  trial: { startedAt: string; daysRemaining: number; hoursUsed: number; dailyLimit: number; } | null;
  subscription: { status: string; periodEnd: string; } | null;
  plan: Plan | null;
  hiredEmployees: string[];
  usage: UsageRecord[];
  onboardingComplete: boolean;
}

// ── New types for enhanced features ──

export interface ConversationMemory {
  employeeId: string;
  userId: string;
  topics: string[];
  preferences: Record<string, string>;
  taskHistory: TaskRecord[];
  sentimentHistory: number[];
  lastInteraction: string;
  totalMessages: number;
  summary: string;
}

export interface TaskRecord {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  employeeId: string;
  output?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  target: string;
  details: string;
  ip: string;
}

export interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

export type IntentType =
  | 'code' | 'debug' | 'general' | 'question' | 'request'
  | 'feedback' | 'complaint' | 'followup' | 'clarification'
  | 'greeting' | 'farewell' | 'thanks'
  | 'campaign' | 'outreach' | 'analytics' | 'strategy'
  | 'ticket' | 'escalation' | 'troubleshoot'
  | 'report' | 'data_query' | 'visualization'
  | 'design_review' | 'prototype' | 'ux_audit'
  | 'roadmap' | 'sprint' | 'prioritize';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { timestamp: string; requestId: string; latency: number };
}

export interface TrialConversionEvent {
  type: 'feature_limit' | 'usage_limit' | 'time_limit' | 'employee_limit';
  message: string;
  ctaText: string;
  urgency: 'low' | 'medium' | 'high';
  percentUsed: number;
}

// ── Worker Backend Types ──

export interface WorkerConfig {
  apiUrl: string;
  connected: boolean;
}

export interface LLMApiKey {
  provider: 'anthropic' | 'openai';
  preview: string;
  isActive: boolean;
  createdAt: string;
}

export interface LLMChatResponse {
  response: string;
  model: string;
  employeeId: string;
  employeeName: string;
  intent: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  requiredIntegration?: string;
  ready?: boolean;
  integrationStatus?: string;
}

export interface ToolExecutionResult {
  executionId: string;
  tool: string;
  status: 'completed' | 'failed' | 'simulated';
  result: any;
  executionTimeMs: number;
  employeeId: string;
}

export interface Integration {
  id: string;
  name: string;
  provider: string;
  icon: string;
  description: string;
  category: string;
  authType: 'oauth2' | 'api_key';
  isConnected: boolean;
  connectionStatus: string;
  popularity: number;
  rating: number;
}

export interface ConnectedIntegration {
  id: string;
  integrationId: string;
  name: string;
  provider: string;
  icon: string;
  category: string;
  status: string;
  config: Record<string, any>;
  connectedAt: string;
}

export interface VoiceSession {
  sessionId: string;
  employeeId: string;
  employeeName: string;
  mode: 'voice' | 'video';
  status: string;
  voiceProfile: {
    defaultVoice: string;
    speed: number;
    pitch: number;
    personality: string;
  };
  iceServers: Array<{ urls: string; username?: string; credential?: string }>;
  config: {
    sampleRate: number;
    channels: number;
    codec: string;
    vadEnabled: boolean;
    noiseSuppressionEnabled: boolean;
    echoCancellationEnabled: boolean;
  };
}

export interface CollaborationWorkflow {
  name: string;
  description: string;
  icon: string;
  minAgents: number;
  maxAgents: number;
}

export interface CollaborationTemplate {
  id: string;
  name: string;
  description: string;
  employeeIds: string[];
  workflow: string;
  category: string;
  agents: Array<{ id: string; name: string; role: string }>;
}

export interface CollaborationResult {
  collaborationId: string;
  name: string;
  workflow: string;
  agents: Array<{ id: string; name: string; role: string }>;
  status: string;
  result: any;
  executionTimeMs: number;
  llmPowered: boolean;
}

// ── Enhanced Employee Types ──

export interface TaskPipelineStep {
  name: string;
  tool: string;
  description: string;
}

export interface TaskPipeline {
  steps: TaskPipelineStep[];
  estimatedTime: string;
}

export interface TaskExecutionResult {
  executionId: string;
  employeeId: string;
  employeeName: string;
  pipeline: string;
  status: string;
  steps: Array<{ step: string; status: string; output: any; durationMs: number }>;
  totalDurationMs: number;
  estimatedTime: string;
}

export interface InterEmployeeMessage {
  id: string;
  from_employee_id: string;
  to_employee_id: string;
  fromName: string;
  toName: string;
  type: 'handoff' | 'request' | 'feedback' | 'data_share' | 'escalation';
  subject: string;
  content: string;
  attachedData?: any;
  status: string;
  created_at: string;
}

export interface EmployeeMetrics {
  employeeId: string;
  employeeName: string;
  tasksCompleted: number;
  tasksFailed: number;
  successRate: number;
  avgResponseTimeMs: number;
  messagesSent: number;
  toolsUsed: number;
  activeDays: number;
}

export interface PersonalityConfig {
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

export interface OnboardingContext {
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
