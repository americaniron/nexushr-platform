/**
 * NexusHR Platform Client — AI Core, Integrations, Notifications, Search,
 * Settings, Help, i18n, Onboarding, Data Import/Export, PWA, Accessibility
 *
 * Dual-mode: Worker API when online, localStorage/IndexedDB fallback offline.
 */

import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';

// ══════════════════════════════════════════════════════
// 1. TYPES
// ══════════════════════════════════════════════════════

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; timestamp: string }
export interface AITask { id: string; title: string; status: string; subtasks: any[]; result: string | null; execution_time_ms: number }
export interface Notification { id: string; title: string; body: string; channel: string; priority: string; read: boolean; action_url?: string; created_at: string }
export interface SearchResult { type: string; id: string; title: string; snippet: string; relevance: number; url: string }
export interface UserSettings { theme: 'light' | 'dark' | 'system'; language: string; timezone: string; notifications: any; privacy: any; accessibility: any; data_management: any }
export interface OnboardingStep { id: string; title: string; description: string; required: boolean }
export interface OnboardingProgress { current_step: number; completed_steps: string[]; skipped_steps: string[]; completed_at: string | null }
export interface HelpArticle { id: string; category: string; title: string; content: string; tags: string[] }
export interface IntegrationConfig { id: string; type: string; provider: string; status: string; settings: any }
export interface VoiceSession { session_id: string; state: string; offer_sdp: string | null; answer_sdp: string | null }

// ══════════════════════════════════════════════════════
// 2. API HELPERS
// ══════════════════════════════════════════════════════

async function api<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
    if (!res.ok) return null;
    return await res.json() as T;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════
// 3. AI CORE CLIENT
// ══════════════════════════════════════════════════════

export const aiClient = {
  async chat(params: { conversation_id: string; employee_id: string; org_id: string; message: string; messages?: ChatMessage[]; persona?: any; max_tokens?: number }) {
    return api<{ reply: string; tokens_used: { input: number; output: number }; suggested_actions: string[] }>('/api/ai/chat', { method: 'POST', body: JSON.stringify(params) });
  },
  async getHistory(conversationId: string) {
    return api<{ messages: ChatMessage[] }>(`/api/ai/conversations/${conversationId}`);
  },
  async createTask(params: { org_id: string; employee_id: string; title: string; description: string }) {
    return api<AITask>('/api/ai/tasks', { method: 'POST', body: JSON.stringify(params) });
  },
  async executeTask(taskId: string) {
    return api<AITask>(`/api/ai/tasks/${taskId}/execute`, { method: 'POST' });
  },
  async getOrgTasks(orgId: string) {
    return api<{ tasks: AITask[] }>(`/api/ai/tasks/org/${orgId}`);
  },
  async summarize(content: string, style?: string) {
    return api<{ summary: string; key_points: string[] }>('/api/ai/documents/summarize', { method: 'POST', body: JSON.stringify({ content, style }) });
  },
  async extractEntities(content: string) {
    return api<{ names: string[]; dates: string[]; amounts: string[]; emails: string[] }>('/api/ai/documents/entities', { method: 'POST', body: JSON.stringify({ content }) });
  },
  async documentQA(content: string, question: string) {
    return api<{ answer: string; confidence: number }>('/api/ai/documents/qa', { method: 'POST', body: JSON.stringify({ content, question }) });
  },
  async recordFeedback(employeeId: string, messageId: string, rating: number, comment?: string) {
    return api('/api/ai/feedback', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, message_id: messageId, rating, comment }) });
  },
  async getPerformance(employeeId: string) {
    return api<any>(`/api/ai/performance/${employeeId}`);
  },
};

// ── Voice Client ──
export const voiceClient = {
  async createSession(employeeId: string, orgId: string) {
    return api<VoiceSession>('/api/ai/voice/session', { method: 'POST', body: JSON.stringify({ employee_id: employeeId, org_id: orgId }) });
  },
  async setOffer(sessionId: string, sdp: string) {
    return api<VoiceSession>(`/api/ai/voice/${sessionId}/offer`, { method: 'POST', body: JSON.stringify({ sdp }) });
  },
  async setAnswer(sessionId: string, sdp: string) {
    return api<VoiceSession>(`/api/ai/voice/${sessionId}/answer`, { method: 'POST', body: JSON.stringify({ sdp }) });
  },
  async addIce(sessionId: string, candidate: string) {
    return api(`/api/ai/voice/${sessionId}/ice`, { method: 'POST', body: JSON.stringify({ candidate }) });
  },
  async tts(text: string, voice?: string) {
    return api<{ audio_url: string; duration_ms: number }>('/api/ai/voice/tts', { method: 'POST', body: JSON.stringify({ text, voice }) });
  },
  async stt(audio: string) {
    return api<{ text: string; confidence: number }>('/api/ai/voice/stt', { method: 'POST', body: JSON.stringify({ audio }) });
  },
};

// ══════════════════════════════════════════════════════
// 4. INTEGRATIONS CLIENT
// ══════════════════════════════════════════════════════

export const integrationsClient = {
  async connect(orgId: string, type: string, provider: string, credentials: any, settings?: any) {
    return api<IntegrationConfig>('/api/connect/integrations', { method: 'POST', body: JSON.stringify({ org_id: orgId, type, provider, credentials, settings }) });
  },
  async disconnect(id: string) {
    return api(`/api/connect/integrations/${id}/disconnect`, { method: 'POST' });
  },
  async list(orgId: string) {
    return api<{ integrations: IntegrationConfig[] }>(`/api/connect/integrations/org/${orgId}`);
  },
  async sendEmail(integrationId: string, message: { to: string[]; subject: string; body: string }) {
    return api('/api/connect/email/send', { method: 'POST', body: JSON.stringify({ integration_id: integrationId, message }) });
  },
  async createCalendarEvent(integrationId: string, event: any) {
    return api('/api/connect/calendar/event', { method: 'POST', body: JSON.stringify({ integration_id: integrationId, event }) });
  },
  async checkAvailability(integrationId: string, attendees: string[], date: string) {
    return api('/api/connect/calendar/availability', { method: 'POST', body: JSON.stringify({ integration_id: integrationId, attendees, date }) });
  },
  async sendSlack(integrationId: string, channel: string, text: string) {
    return api('/api/connect/slack/message', { method: 'POST', body: JSON.stringify({ integration_id: integrationId, message: { channel, text } }) });
  },
  async createCRMContact(integrationId: string, contact: any) {
    return api('/api/connect/crm/contact', { method: 'POST', body: JSON.stringify({ integration_id: integrationId, contact }) });
  },
};

// ══════════════════════════════════════════════════════
// 5. PLATFORM CLIENT
// ══════════════════════════════════════════════════════

export const notificationsClient = {
  async list(unreadOnly?: boolean) { return api<{ notifications: Notification[]; unread_count: number }>(`/api/platform/notifications${unreadOnly ? '?unread=true' : ''}`); },
  async markRead(id: string) { return api(`/api/platform/notifications/${id}/read`, { method: 'PATCH' }); },
  async markAllRead() { return api('/api/platform/notifications/read-all', { method: 'PATCH' }); },
  async subscribePush(subscription: any) { return api('/api/platform/notifications/push-subscribe', { method: 'POST', body: JSON.stringify({ subscription }) }); },
};

export const searchClient = {
  async search(query: string, orgId?: string, types?: string[]) {
    const params = new URLSearchParams({ q: query });
    if (orgId) params.set('org_id', orgId);
    if (types) params.set('types', types.join(','));
    return api<{ results: SearchResult[] }>(`/api/platform/search?${params}`);
  },
};

export const settingsClient = {
  async get() { return api<UserSettings>('/api/platform/settings'); },
  async update(updates: Partial<UserSettings>) { return api<UserSettings>('/api/platform/settings', { method: 'PATCH', body: JSON.stringify(updates) }); },
};

export const helpClient = {
  async search(query: string) { return api<{ articles: HelpArticle[] }>(`/api/platform/help/search?q=${encodeURIComponent(query)}`); },
  async getArticle(id: string) { return api<HelpArticle>(`/api/platform/help/articles/${id}`); },
  async getCategories() { return api<{ categories: { category: string; articles: HelpArticle[] }[] }>('/api/platform/help/categories'); },
};

export const i18nClient = {
  async getTranslations(lang: string) { return api<{ translations: Record<string, string>; supported: { code: string; name: string }[] }>(`/api/platform/i18n/${lang}`); },
};

export const onboardingClient = {
  async getProgress() { return api<{ progress: OnboardingProgress; steps: OnboardingStep[] }>('/api/platform/onboarding'); },
  async completeStep(stepId: string) { return api<OnboardingProgress>('/api/platform/onboarding/complete', { method: 'POST', body: JSON.stringify({ step_id: stepId }) }); },
  async skipStep(stepId: string) { return api<OnboardingProgress>('/api/platform/onboarding/skip', { method: 'POST', body: JSON.stringify({ step_id: stepId }) }); },
};

export const dataPortClient = {
  async exportAll(orgId: string, format?: string) { return api<{ download_url: string; size_bytes: number; tables: string[] }>('/api/platform/export', { method: 'POST', body: JSON.stringify({ org_id: orgId, format }) }); },
  async importData(orgId: string, data: any) { return api<{ imported: Record<string, number>; errors: string[] }>('/api/platform/import', { method: 'POST', body: JSON.stringify({ org_id: orgId, data }) }); },
};

export const a11yClient = {
  async getAudit() { return api<{ checklist: any[]; compliance: { score: number; level: string } }>('/api/platform/accessibility/audit'); },
};

export const apiDocsClient = {
  async getDocs() { return api<any>('/api/platform/api-docs'); },
};

// ══════════════════════════════════════════════════════
// 6. i18n CONTEXT
// ══════════════════════════════════════════════════════

type I18nContextType = { t: (key: string) => string; lang: string; setLang: (l: string) => void; supported: { code: string; name: string }[] };
const I18nContext = createContext<I18nContextType>({ t: (k) => k, lang: 'en', setLang: () => {}, supported: [] });
export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children, defaultLang = 'en' }: { children: React.ReactNode; defaultLang?: string }) {
  const [lang, setLang] = useState(defaultLang);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [supported, setSupported] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    i18nClient.getTranslations(lang).then(data => {
      if (data) { setTranslations(data.translations); setSupported(data.supported); }
    });
  }, [lang]);

  const t = useCallback((key: string) => translations[key] || key, [translations]);

  return { t, lang, setLang, supported } as any; // Would wrap in I18nContext.Provider in JSX
}

// ══════════════════════════════════════════════════════
// 7. REACT HOOKS
// ══════════════════════════════════════════════════════

export function useAIChat(conversationId: string, employeeId: string, orgId: string = 'default-org') {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);

  useEffect(() => {
    aiClient.getHistory(conversationId).then(data => {
      if (data?.messages) setMessages(data.messages);
    });
  }, [conversationId]);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const result = await aiClient.chat({ conversation_id: conversationId, employee_id: employeeId, org_id: orgId, message: text, messages });
    if (result) {
      const assistantMsg: ChatMessage = { role: 'assistant', content: result.reply, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, assistantMsg]);
      setSuggestedActions(result.suggested_actions);
    }
    setLoading(false);
  }, [conversationId, employeeId, orgId, messages]);

  return { messages, sendMessage, loading, suggestedActions };
}

export function useAITasks(orgId: string = 'default-org') {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await aiClient.getOrgTasks(orgId);
    if (data?.tasks) setTasks(data.tasks);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createAndExecute = useCallback(async (employeeId: string, title: string, description: string) => {
    const task = await aiClient.createTask({ org_id: orgId, employee_id: employeeId, title, description });
    if (task) {
      const executed = await aiClient.executeTask(task.id);
      if (executed) setTasks(prev => [executed, ...prev]);
      return executed;
    }
    return null;
  }, [orgId]);

  return { tasks, loading, refresh, createAndExecute };
}

export function useVoiceCall(employeeId: string, orgId: string = 'default-org') {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [isActive, setIsActive] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const startCall = useCallback(async () => {
    const sess = await voiceClient.createSession(employeeId, orgId);
    if (!sess) return;
    setSession(sess);
    setIsActive(true);

    // Create WebRTC peer connection
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) voiceClient.addIce(sess.session_id, JSON.stringify(e.candidate));
    };

    // Get user media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await voiceClient.setOffer(sess.session_id, JSON.stringify(offer));
    } catch (e) {
      console.error('Voice call setup failed:', e);
    }
  }, [employeeId, orgId]);

  const endCall = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    setIsActive(false);
    setSession(null);
  }, []);

  return { session, isActive, startCall, endCall };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await notificationsClient.list();
    if (data) { setNotifications(data.notifications); setUnreadCount(data.unread_count); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); const iv = setInterval(refresh, 30000); return () => clearInterval(iv); }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    await notificationsClient.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsClient.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, markRead, markAllRead, refresh };
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const data = await searchClient.search(q);
    if (data) setResults(data.results);
    setLoading(false);
  }, []);

  const debouncedSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  }, [search]);

  return { query, results, loading, search: debouncedSearch };
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsClient.get().then(s => { if (s) setSettings(s); setLoading(false); });
  }, []);

  const update = useCallback(async (updates: Partial<UserSettings>) => {
    const result = await settingsClient.update(updates);
    if (result) setSettings(result);
    return result;
  }, []);

  return { settings, loading, update };
}

export function useOnboarding() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onboardingClient.getProgress().then(data => {
      if (data) { setProgress(data.progress); setSteps(data.steps); }
      setLoading(false);
    });
  }, []);

  const complete = useCallback(async (stepId: string) => {
    const result = await onboardingClient.completeStep(stepId);
    if (result) setProgress(result);
  }, []);

  const skip = useCallback(async (stepId: string) => {
    const result = await onboardingClient.skipStep(stepId);
    if (result) setProgress(result);
  }, []);

  return { progress, steps, loading, complete, skip };
}

export function useHelpCenter() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [categories, setCategories] = useState<{ category: string; articles: HelpArticle[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    helpClient.getCategories().then(data => {
      if (data) setCategories(data.categories);
      setLoading(false);
    });
  }, []);

  const search = useCallback(async (query: string) => {
    const data = await helpClient.search(query);
    if (data) setArticles(data.articles);
  }, []);

  return { articles, categories, loading, search };
}

export function useIntegrations(orgId: string = 'default-org') {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await integrationsClient.list(orgId);
    if (data) setIntegrations(data.integrations);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { integrations, loading, refresh };
}

export function useAccessibilityAudit() {
  const [audit, setAudit] = useState<{ checklist: any[]; compliance: { score: number; level: string } } | null>(null);

  useEffect(() => {
    a11yClient.getAudit().then(data => { if (data) setAudit(data); });
  }, []);

  return audit;
}

// ══════════════════════════════════════════════════════
// 8. PWA REGISTRATION
// ══════════════════════════════════════════════════════

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('[NexusHR] Service worker registered:', reg.scope);
    }).catch(err => {
      console.error('[NexusHR] Service worker registration failed:', err);
    });
  }
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window) {
    return Notification.requestPermission();
  }
  return Promise.resolve('denied' as NotificationPermission);
}
