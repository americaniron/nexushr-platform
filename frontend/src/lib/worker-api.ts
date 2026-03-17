/**
 * Worker API Client — Connects to the NexusHR Cloudflare Worker backend.
 * Falls back to local responses when Worker is not available.
 */
import type {
  LLMApiKey, LLMChatResponse, ToolDefinition, ToolExecutionResult,
  Integration, ConnectedIntegration, VoiceSession, CollaborationWorkflow,
  CollaborationTemplate, CollaborationResult, ChatMessage,
  TaskPipeline, TaskExecutionResult, InterEmployeeMessage,
  EmployeeMetrics, PersonalityConfig, OnboardingContext,
} from '../data/types';

// Worker URL — update after deployment
const WORKER_URL = localStorage.getItem('nexushr_worker_url') || '';
let sessionToken = localStorage.getItem('nexushr_session_token') || '';

export function setWorkerUrl(url: string) {
  localStorage.setItem('nexushr_worker_url', url);
}

export function getWorkerUrl(): string {
  return localStorage.getItem('nexushr_worker_url') || '';
}

export function setSessionToken(token: string) {
  sessionToken = token;
  localStorage.setItem('nexushr_session_token', token);
}

export function getSessionToken(): string {
  return sessionToken || localStorage.getItem('nexushr_session_token') || '';
}

export function isWorkerConnected(): boolean {
  return !!getWorkerUrl();
}

async function workerFetch<T>(path: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; error?: string }> {
  const url = getWorkerUrl();
  if (!url) {
    return { success: false, error: 'Worker not connected. Set the API URL in Settings.' };
  }

  try {
    const res = await fetch(`${url}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSessionToken()}`,
        ...(options.headers || {}),
      },
    });

    const json = await res.json() as any;
    if (!res.ok) {
      return { success: false, error: json.error || json.message || `HTTP ${res.status}` };
    }
    return { success: true, data: json.data || json };
  } catch (err: any) {
    return { success: false, error: `Connection failed: ${err.message}` };
  }
}

// ── Auth ──
export const WorkerAuth = {
  async login(email: string, password: string) {
    return workerFetch<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async signup(name: string, email: string, password: string) {
    return workerFetch<{ token: string; user: any }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  async demoLogin(mode: string) {
    return workerFetch<{ token: string; mode: string }>('/api/auth/demo', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    });
  },

  async logout() {
    return workerFetch('/api/auth/logout', { method: 'POST' });
  },
};

// ── LLM API ──
export const WorkerLLM = {
  async chat(employeeId: string, message: string, history: ChatMessage[] = []): Promise<{ success: boolean; data?: LLMChatResponse; error?: string }> {
    return workerFetch<LLMChatResponse>('/api/llm/chat', {
      method: 'POST',
      body: JSON.stringify({
        employeeId,
        message,
        history: history.slice(-20).map(h => ({ from: h.from, text: h.text })),
      }),
    });
  },

  async getModels() {
    return workerFetch<Array<{ id: string; name: string; provider: string; available: boolean }>>('/api/llm/models');
  },

  async setApiKey(provider: string, apiKey: string) {
    return workerFetch<{ provider: string; preview: string }>('/api/llm/keys', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey }),
    });
  },

  async listApiKeys() {
    return workerFetch<LLMApiKey[]>('/api/llm/keys');
  },

  async deleteApiKey(provider: string) {
    return workerFetch('/api/llm/keys', {
      method: 'DELETE',
      body: JSON.stringify({ provider }),
    });
  },
};

// ── Tools ──
export const WorkerTools = {
  async execute(employeeId: string, tool: string, input: Record<string, any>) {
    return workerFetch<ToolExecutionResult>('/api/tools/execute', {
      method: 'POST',
      body: JSON.stringify({ employeeId, tool, input }),
    });
  },

  async listAll() {
    return workerFetch<{ tools: Record<string, ToolDefinition>; roleTools: Record<string, string[]> }>('/api/tools/list');
  },

  async getAvailable(employeeId: string) {
    return workerFetch<ToolDefinition[]>(`/api/tools/available?employeeId=${employeeId}`);
  },

  async getHistory(limit = 50) {
    return workerFetch<any[]>(`/api/tools/history?limit=${limit}`);
  },
};

// ── Integrations ──
export const WorkerIntegrations = {
  async getMarketplace(category?: string, search?: string) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    return workerFetch<{ integrations: Integration[]; categories: string[]; totalCount: number; connectedCount: number }>(
      `/api/integrations/marketplace?${params.toString()}`
    );
  },

  async getConnected() {
    return workerFetch<ConnectedIntegration[]>('/api/integrations/connected');
  },

  async connect(integrationId: string, apiKey?: string, config?: Record<string, any>) {
    return workerFetch<{ connectionId: string; status: string; authUrl?: string }>('/api/integrations/connect', {
      method: 'POST',
      body: JSON.stringify({ integrationId, apiKey, config }),
    });
  },

  async disconnect(integrationId: string) {
    return workerFetch('/api/integrations/disconnect', {
      method: 'POST',
      body: JSON.stringify({ integrationId }),
    });
  },

  async testConnection(integrationId: string) {
    return workerFetch<{ status: string; provider: string }>('/api/integrations/test', {
      method: 'POST',
      body: JSON.stringify({ integrationId }),
    });
  },
};

// ── Voice ──
export const WorkerVoice = {
  async startSession(employeeId: string, mode: 'voice' | 'video' = 'voice') {
    return workerFetch<VoiceSession>('/api/voice/session/start', {
      method: 'POST',
      body: JSON.stringify({ employeeId, mode }),
    });
  },

  async endSession(sessionId: string) {
    return workerFetch<{ sessionId: string; duration: number }>('/api/voice/session/end', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  },

  async textToSpeech(text: string, employeeId: string) {
    return workerFetch<{ audio?: string; fallback?: string; voiceConfig?: any }>('/api/voice/tts', {
      method: 'POST',
      body: JSON.stringify({ text, employeeId }),
    });
  },

  async getConfig() {
    return workerFetch<{ ttsProvider: string; sttProvider: string; hasApiKey: boolean; features: Record<string, boolean> }>('/api/voice/config');
  },
};

// ── Multi-Agent Collaboration ──
export const WorkerAgents = {
  async getTemplates() {
    return workerFetch<CollaborationTemplate[]>('/api/agents/templates');
  },

  async getWorkflows() {
    return workerFetch<Record<string, CollaborationWorkflow>>('/api/agents/workflows');
  },

  async startCollaboration(name: string, employeeIds: string[], workflow: string, task: string) {
    return workerFetch<CollaborationResult>('/api/agents/collaborate', {
      method: 'POST',
      body: JSON.stringify({ name, description: '', employeeIds, workflow, task }),
    });
  },

  async getHistory() {
    return workerFetch<any[]>('/api/agents/history');
  },

  async getCapabilities() {
    return workerFetch<any>('/api/agents/capabilities');
  },
};

// ── Enhanced Employees ──
export const WorkerEmployees = {
  // Task pipelines
  async getTaskPipelines(employeeId?: string) {
    const params = employeeId ? `?employeeId=${employeeId}` : '';
    return workerFetch<any>(`/api/employees/tasks/pipelines${params}`);
  },

  async executeTask(employeeId: string, pipelineId: string, task: string, context?: Record<string, any>) {
    return workerFetch<TaskExecutionResult>('/api/employees/tasks/execute', {
      method: 'POST',
      body: JSON.stringify({ employeeId, pipelineId, task, context }),
    });
  },

  async getTaskHistory(employeeId?: string, limit = 50) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (employeeId) params.set('employeeId', employeeId);
    return workerFetch<any[]>(`/api/employees/tasks/history?${params.toString()}`);
  },

  // Inter-employee communication
  async sendMessage(fromEmployeeId: string, toEmployeeId: string, type: string, subject: string, content: string, attachedData?: any) {
    return workerFetch<any>('/api/employees/messages/send', {
      method: 'POST',
      body: JSON.stringify({ fromEmployeeId, toEmployeeId, type, subject, content, attachedData }),
    });
  },

  async getMessages(employeeId?: string) {
    const params = employeeId ? `?employeeId=${employeeId}` : '';
    return workerFetch<InterEmployeeMessage[]>(`/api/employees/messages${params}`);
  },

  async performHandoff(fromEmployeeId: string, toEmployeeId: string, task: string, context: string, priority: string) {
    return workerFetch<any>('/api/employees/handoff', {
      method: 'POST',
      body: JSON.stringify({ fromEmployeeId, toEmployeeId, task, context, priority }),
    });
  },

  // Dynamic metrics
  async getMetrics(employeeId?: string, days = 30) {
    const params = new URLSearchParams({ days: String(days) });
    if (employeeId) params.set('employeeId', employeeId);
    return workerFetch<any>(`/api/employees/metrics?${params.toString()}`);
  },

  async getLeaderboard() {
    return workerFetch<any[]>('/api/employees/metrics/leaderboard');
  },

  // Personality tuning
  async getPersonality(employeeId: string) {
    return workerFetch<{ employeeId: string; employeeName: string; config: PersonalityConfig }>(`/api/employees/personality?employeeId=${employeeId}`);
  },

  async updatePersonality(employeeId: string, config: Partial<PersonalityConfig>) {
    return workerFetch<any>('/api/employees/personality', {
      method: 'PUT',
      body: JSON.stringify({ employeeId, config }),
    });
  },

  // Onboarding
  async getOnboarding(employeeId?: string) {
    const params = employeeId ? `?employeeId=${employeeId}` : '';
    return workerFetch<any>(`/api/employees/onboarding${params}`);
  },

  async saveOnboarding(employeeId: string, context: OnboardingContext) {
    return workerFetch<any>('/api/employees/onboarding', {
      method: 'POST',
      body: JSON.stringify({ employeeId, context }),
    });
  },

  async getOnboardingStatus() {
    return workerFetch<{ totalEmployees: number; onboarded: number; pending: number; percentComplete: number }>('/api/employees/onboarding/status');
  },
};

// ── NLU (Natural Language Understanding) ──
export const WorkerNLU = {
  /** Run full NLU analysis: intent classification, sentiment, entities, RAG, state machine, tone guidance */
  async analyze(employeeId: string, message: string, history: Array<{ from: string; text: string }> = [], conversationState?: any) {
    return workerFetch<any>('/api/nlu/analyze', {
      method: 'POST',
      body: JSON.stringify({ employeeId, message, history: history.slice(-20), conversationState }),
    });
  },

  /** Generate response using NLU result for context-aware, tone-validated output */
  async generate(employeeId: string, message: string, history: Array<{ from: string; text: string }> = [], nluResult: any) {
    return workerFetch<any>('/api/nlu/generate', {
      method: 'POST',
      body: JSON.stringify({ employeeId, message, history: history.slice(-20), nluResult }),
    });
  },

  /** Get conversation state for an employee */
  async getState(employeeId: string) {
    return workerFetch<any>(`/api/nlu/state?employeeId=${employeeId}`);
  },
};

// ── Health Check ──
export async function checkWorkerHealth(): Promise<{ connected: boolean; version?: string }> {
  const url = getWorkerUrl();
  if (!url) return { connected: false };

  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json() as any;
      return { connected: true, version: data.version };
    }
    return { connected: false };
  } catch {
    return { connected: false };
  }
}
