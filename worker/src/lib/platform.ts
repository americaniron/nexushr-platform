/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Platform Features — Notifications, Search, Settings, Help, i18n, a11y,
 * Onboarding, Data Import/Export, API Docs, PWA Manifest
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Env } from '../index';

// ══════════════════════════════════════════════════════
// 1. NOTIFICATION SYSTEM
// ══════════════════════════════════════════════════════

export type NotificationChannel = 'in_app' | 'email' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  org_id: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  category: string;
  action_url?: string;
  read: boolean;
  created_at: string;
}

export class NotificationService {
  constructor(private env: Env) {}

  async send(userId: string, orgId: string, title: string, body: string, opts?: {
    channel?: NotificationChannel; priority?: NotificationPriority; category?: string; action_url?: string;
  }): Promise<Notification> {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const notif: Notification = {
      id, user_id: userId, org_id: orgId, title, body,
      channel: opts?.channel || 'in_app', priority: opts?.priority || 'normal',
      category: opts?.category || 'general', action_url: opts?.action_url,
      read: false, created_at: new Date().toISOString(),
    };

    await this.env.DB.prepare(
      `INSERT INTO notifications (id, user_id, org_id, title, body, channel, priority, category, action_url, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
    ).bind(id, userId, orgId, title, body, notif.channel, notif.priority, notif.category, notif.action_url || null, notif.created_at).run();

    // If push channel, store push payload in KV for WebSocket/SSE delivery
    if (notif.channel === 'push' || notif.priority === 'urgent') {
      await this.env.CACHE.put(`push:${userId}:${id}`, JSON.stringify(notif), { expirationTtl: 86400 });
    }

    return notif;
  }

  async list(userId: string, opts?: { unread_only?: boolean; limit?: number }): Promise<Notification[]> {
    const limit = opts?.limit || 50;
    const query = opts?.unread_only
      ? `SELECT * FROM notifications WHERE user_id = ? AND read = 0 ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`;
    const result = await this.env.DB.prepare(query).bind(userId, limit).all();
    return (result.results || []) as unknown as Notification[];
  }

  async markRead(notifId: string): Promise<void> {
    await this.env.DB.prepare(`UPDATE notifications SET read = 1 WHERE id = ?`).bind(notifId).run();
  }

  async markAllRead(userId: string): Promise<void> {
    await this.env.DB.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0`).bind(userId).run();
  }

  async getUnreadCount(userId: string): Promise<number> {
    const r = await this.env.DB.prepare(`SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND read = 0`).bind(userId).first<{ cnt: number }>();
    return r?.cnt || 0;
  }

  async subscribePush(userId: string, subscription: any): Promise<void> {
    await this.env.CACHE.put(`push-sub:${userId}`, JSON.stringify(subscription), { expirationTtl: 86400 * 30 });
  }
}

// ══════════════════════════════════════════════════════
// 2. UNIVERSAL SEARCH
// ══════════════════════════════════════════════════════

export interface SearchResult {
  type: 'conversation' | 'task' | 'employee' | 'document' | 'notification';
  id: string;
  title: string;
  snippet: string;
  relevance: number;
  url: string;
  created_at: string;
}

export class SearchEngine {
  constructor(private env: Env) {}

  async search(orgId: string, query: string, opts?: { types?: string[]; limit?: number }): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const limit = opts?.limit || 20;
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const likePattern = `%${query}%`;

    const searchTypes = opts?.types || ['conversation', 'task', 'employee', 'notification'];

    // Search conversations/messages
    if (searchTypes.includes('conversation')) {
      const msgs = await this.env.DB.prepare(
        `SELECT id, conversation_id, content, created_at FROM ai_messages
         WHERE org_id = ? AND content LIKE ? ORDER BY created_at DESC LIMIT ?`
      ).bind(orgId, likePattern, Math.ceil(limit / 4)).all();

      for (const m of (msgs.results || []) as any[]) {
        results.push({
          type: 'conversation', id: m.conversation_id, title: 'Conversation',
          snippet: m.content.slice(0, 150), relevance: this.scoreRelevance(m.content, terms),
          url: `/conversations/${m.conversation_id}`, created_at: m.created_at,
        });
      }
    }

    // Search tasks
    if (searchTypes.includes('task')) {
      const tasks = await this.env.DB.prepare(
        `SELECT id, title, description, status, started_at as created_at FROM ai_tasks
         WHERE org_id = ? AND (title LIKE ? OR description LIKE ?) ORDER BY started_at DESC LIMIT ?`
      ).bind(orgId, likePattern, likePattern, Math.ceil(limit / 4)).all();

      for (const t of (tasks.results || []) as any[]) {
        results.push({
          type: 'task', id: t.id, title: t.title,
          snippet: (t.description || '').slice(0, 150), relevance: this.scoreRelevance(`${t.title} ${t.description}`, terms),
          url: `/tasks/${t.id}`, created_at: t.created_at,
        });
      }
    }

    // Search employees
    if (searchTypes.includes('employee')) {
      const emps = await this.env.DB.prepare(
        `SELECT id, name, role, department, created_at FROM employees
         WHERE org_id = ? AND (name LIKE ? OR role LIKE ? OR department LIKE ?) LIMIT ?`
      ).bind(orgId, likePattern, likePattern, likePattern, Math.ceil(limit / 4)).all();

      for (const e of (emps.results || []) as any[]) {
        results.push({
          type: 'employee', id: e.id, title: e.name,
          snippet: `${e.role} — ${e.department}`, relevance: this.scoreRelevance(`${e.name} ${e.role} ${e.department}`, terms),
          url: `/employees/${e.id}`, created_at: e.created_at,
        });
      }
    }

    // Search notifications
    if (searchTypes.includes('notification')) {
      const notifs = await this.env.DB.prepare(
        `SELECT id, title, body, created_at FROM notifications
         WHERE org_id = ? AND (title LIKE ? OR body LIKE ?) ORDER BY created_at DESC LIMIT ?`
      ).bind(orgId, likePattern, likePattern, Math.ceil(limit / 4)).all();

      for (const n of (notifs.results || []) as any[]) {
        results.push({
          type: 'notification', id: n.id, title: n.title,
          snippet: n.body.slice(0, 150), relevance: this.scoreRelevance(`${n.title} ${n.body}`, terms),
          url: `/notifications/${n.id}`, created_at: n.created_at,
        });
      }
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  }

  private scoreRelevance(text: string, terms: string[]): number {
    const lower = text.toLowerCase();
    let score = 0;
    for (const term of terms) {
      const matches = (lower.match(new RegExp(term, 'g')) || []).length;
      score += matches * (1 / terms.length);
    }
    return Math.min(1, score);
  }
}

// ══════════════════════════════════════════════════════
// 3. USER SETTINGS
// ══════════════════════════════════════════════════════

export interface UserSettings {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: { in_app: boolean; email: boolean; push: boolean; digest: 'none' | 'daily' | 'weekly' };
  privacy: { analytics: boolean; crash_reports: boolean };
  accessibility: { high_contrast: boolean; reduced_motion: boolean; font_size: 'small' | 'medium' | 'large' | 'xlarge'; screen_reader_hints: boolean };
  data_management: { auto_backup: boolean; retention_days: number };
}

export const DEFAULT_SETTINGS: UserSettings = {
  user_id: '', theme: 'system', language: 'en', timezone: 'UTC',
  notifications: { in_app: true, email: true, push: false, digest: 'weekly' },
  privacy: { analytics: true, crash_reports: true },
  accessibility: { high_contrast: false, reduced_motion: false, font_size: 'medium', screen_reader_hints: true },
  data_management: { auto_backup: true, retention_days: 365 },
};

export class SettingsService {
  constructor(private env: Env) {}

  async get(userId: string): Promise<UserSettings> {
    const row = await this.env.DB.prepare(
      `SELECT settings FROM user_settings WHERE user_id = ?`
    ).bind(userId).first<{ settings: string }>();

    if (row?.settings) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(row.settings), user_id: userId };
    }
    return { ...DEFAULT_SETTINGS, user_id: userId };
  }

  async update(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.get(userId);
    const merged: UserSettings = {
      ...current,
      ...updates,
      notifications: { ...current.notifications, ...(updates.notifications || {}) },
      privacy: { ...current.privacy, ...(updates.privacy || {}) },
      accessibility: { ...current.accessibility, ...(updates.accessibility || {}) },
      data_management: { ...current.data_management, ...(updates.data_management || {}) },
      user_id: userId,
    };

    await this.env.DB.prepare(
      `INSERT OR REPLACE INTO user_settings (user_id, settings, updated_at) VALUES (?, ?, ?)`
    ).bind(userId, JSON.stringify(merged), new Date().toISOString()).run();

    return merged;
  }
}

// ══════════════════════════════════════════════════════
// 4. HELP CENTER
// ══════════════════════════════════════════════════════

export interface HelpArticle {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  helpful_votes: number;
  views: number;
}

export const HELP_ARTICLES: HelpArticle[] = [
  { id: 'getting-started', category: 'Getting Started', title: 'Welcome to NexusHR', content: 'NexusHR is an AI-powered workforce platform that lets you hire, manage, and collaborate with AI employees. This guide will walk you through your first steps.', tags: ['setup', 'basics'], helpful_votes: 0, views: 0 },
  { id: 'create-employee', category: 'Getting Started', title: 'How to Create Your First AI Employee', content: 'Navigate to the Employees section, click "Hire New Employee", choose a role template, customize the persona, and start chatting. Your AI employee will learn and adapt over time.', tags: ['employee', 'create', 'hire'], helpful_votes: 0, views: 0 },
  { id: 'conversations', category: 'Features', title: 'Having Conversations with AI Employees', content: 'Start a new conversation by clicking on an employee. Type naturally — they understand context, remember previous interactions, and can execute tasks on your behalf.', tags: ['chat', 'conversation', 'talk'], helpful_votes: 0, views: 0 },
  { id: 'tasks', category: 'Features', title: 'Assigning Tasks to AI Employees', content: 'Assign tasks by describing what you need in natural language. Tasks are automatically decomposed into subtasks, executed, and tracked with full status reporting.', tags: ['task', 'assign', 'work'], helpful_votes: 0, views: 0 },
  { id: 'integrations', category: 'Features', title: 'Connecting External Services', content: 'Connect your email, calendar, CRM, and Slack from Settings > Integrations. AI employees can then send emails, schedule meetings, and update your CRM automatically.', tags: ['integration', 'email', 'calendar', 'slack'], helpful_votes: 0, views: 0 },
  { id: 'billing', category: 'Account', title: 'Understanding Your Bill', content: 'NexusHR uses a hybrid pricing model: a base subscription for your plan tier, plus usage-based charges for tasks, compute hours, and storage beyond included amounts.', tags: ['billing', 'pricing', 'payment'], helpful_votes: 0, views: 0 },
  { id: 'security', category: 'Account', title: 'Security & Data Privacy', content: 'All data is encrypted at rest and in transit using AES-256-GCM. We support SSO/SAML, audit logging, and comply with GDPR and SOC 2 standards.', tags: ['security', 'privacy', 'encryption'], helpful_votes: 0, views: 0 },
  { id: 'team-setup', category: 'Getting Started', title: 'Inviting Team Members', content: 'Go to Settings > Team to invite colleagues. Assign roles (Admin, Member, Viewer) to control who can manage AI employees, view conversations, and modify settings.', tags: ['team', 'invite', 'members'], helpful_votes: 0, views: 0 },
  { id: 'voice-video', category: 'Features', title: 'Voice & Video Calls with AI', content: 'Click the phone or video icon in a conversation to start a real-time voice or video session. AI employees use speech recognition and text-to-speech for natural communication.', tags: ['voice', 'video', 'call'], helpful_votes: 0, views: 0 },
  { id: 'data-export', category: 'Account', title: 'Exporting Your Data', content: 'Export all your data anytime from Settings > Data Management > Export. Choose JSON or CSV format. Exports include conversations, tasks, employees, and settings.', tags: ['export', 'data', 'backup'], helpful_votes: 0, views: 0 },
];

export class HelpCenterService {
  async search(query: string): Promise<HelpArticle[]> {
    const terms = query.toLowerCase().split(/\s+/);
    return HELP_ARTICLES.filter(a => {
      const text = `${a.title} ${a.content} ${a.tags.join(' ')} ${a.category}`.toLowerCase();
      return terms.some(t => text.includes(t));
    }).sort((a, b) => {
      const aScore = terms.filter(t => `${a.title} ${a.tags.join(' ')}`.toLowerCase().includes(t)).length;
      const bScore = terms.filter(t => `${b.title} ${b.tags.join(' ')}`.toLowerCase().includes(t)).length;
      return bScore - aScore;
    });
  }

  async getArticle(id: string): Promise<HelpArticle | null> {
    return HELP_ARTICLES.find(a => a.id === id) || null;
  }

  async getCategories(): Promise<{ category: string; articles: HelpArticle[] }[]> {
    const cats = new Map<string, HelpArticle[]>();
    for (const a of HELP_ARTICLES) {
      if (!cats.has(a.category)) cats.set(a.category, []);
      cats.get(a.category)!.push(a);
    }
    return Array.from(cats.entries()).map(([category, articles]) => ({ category, articles }));
  }
}

// ══════════════════════════════════════════════════════
// 5. INTERNATIONALIZATION
// ══════════════════════════════════════════════════════

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh', 'ko', 'ar', 'hi'] as const;
export type Language = typeof SUPPORTED_LANGUAGES[number];

const TRANSLATIONS: Record<string, Record<Language, string>> = {
  'app.title': { en: 'NexusHR AI Platform', es: 'Plataforma IA NexusHR', fr: 'Plateforme IA NexusHR', de: 'NexusHR KI-Plattform', pt: 'Plataforma IA NexusHR', ja: 'NexusHR AIプラットフォーム', zh: 'NexusHR AI平台', ko: 'NexusHR AI 플랫폼', ar: 'منصة NexusHR للذكاء الاصطناعي', hi: 'NexusHR AI प्लेटफॉर्म' },
  'nav.dashboard': { en: 'Dashboard', es: 'Panel', fr: 'Tableau de bord', de: 'Dashboard', pt: 'Painel', ja: 'ダッシュボード', zh: '仪表板', ko: '대시보드', ar: 'لوحة القيادة', hi: 'डैशबोर्ड' },
  'nav.employees': { en: 'Employees', es: 'Empleados', fr: 'Employés', de: 'Mitarbeiter', pt: 'Funcionários', ja: '従業員', zh: '员工', ko: '직원', ar: 'الموظفون', hi: 'कर्मचारी' },
  'nav.conversations': { en: 'Conversations', es: 'Conversaciones', fr: 'Conversations', de: 'Gespräche', pt: 'Conversas', ja: '会話', zh: '对话', ko: '대화', ar: 'المحادثات', hi: 'बातचीत' },
  'nav.tasks': { en: 'Tasks', es: 'Tareas', fr: 'Tâches', de: 'Aufgaben', pt: 'Tarefas', ja: 'タスク', zh: '任务', ko: '작업', ar: 'المهام', hi: 'कार्य' },
  'nav.settings': { en: 'Settings', es: 'Configuración', fr: 'Paramètres', de: 'Einstellungen', pt: 'Configurações', ja: '設定', zh: '设置', ko: '설정', ar: 'الإعدادات', hi: 'सेटिंग्स' },
  'action.send': { en: 'Send', es: 'Enviar', fr: 'Envoyer', de: 'Senden', pt: 'Enviar', ja: '送信', zh: '发送', ko: '보내기', ar: 'إرسال', hi: 'भेजें' },
  'action.save': { en: 'Save', es: 'Guardar', fr: 'Enregistrer', de: 'Speichern', pt: 'Salvar', ja: '保存', zh: '保存', ko: '저장', ar: 'حفظ', hi: 'सहेजें' },
  'action.cancel': { en: 'Cancel', es: 'Cancelar', fr: 'Annuler', de: 'Abbrechen', pt: 'Cancelar', ja: 'キャンセル', zh: '取消', ko: '취소', ar: 'إلغاء', hi: 'रद्द करें' },
  'action.search': { en: 'Search...', es: 'Buscar...', fr: 'Rechercher...', de: 'Suchen...', pt: 'Pesquisar...', ja: '検索...', zh: '搜索...', ko: '검색...', ar: 'بحث...', hi: 'खोजें...' },
  'status.online': { en: 'Online', es: 'En línea', fr: 'En ligne', de: 'Online', pt: 'Online', ja: 'オンライン', zh: '在线', ko: '온라인', ar: 'متصل', hi: 'ऑनलाइन' },
  'status.offline': { en: 'Offline', es: 'Desconectado', fr: 'Hors ligne', de: 'Offline', pt: 'Offline', ja: 'オフライン', zh: '离线', ko: '오프라인', ar: 'غير متصل', hi: 'ऑफलाइन' },
};

export class I18nService {
  translate(key: string, lang: Language = 'en'): string {
    return TRANSLATIONS[key]?.[lang] || TRANSLATIONS[key]?.['en'] || key;
  }

  getTranslations(lang: Language): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, translations] of Object.entries(TRANSLATIONS)) {
      result[key] = translations[lang] || translations['en'] || key;
    }
    return result;
  }

  getSupportedLanguages(): { code: Language; name: string }[] {
    return [
      { code: 'en', name: 'English' }, { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' },
      { code: 'pt', name: 'Português' }, { code: 'ja', name: '日本語' },
      { code: 'zh', name: '中文' }, { code: 'ko', name: '한국어' },
      { code: 'ar', name: 'العربية' }, { code: 'hi', name: 'हिन्दी' },
    ];
  }
}

// ══════════════════════════════════════════════════════
// 6. ONBOARDING
// ══════════════════════════════════════════════════════

export interface OnboardingProgress {
  user_id: string;
  org_id: string;
  current_step: number;
  completed_steps: string[];
  skipped_steps: string[];
  started_at: string;
  completed_at: string | null;
}

export const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome to NexusHR', description: 'Learn the basics of your AI workforce platform', required: true },
  { id: 'create_employee', title: 'Hire Your First AI Employee', description: 'Choose a role and customize their persona', required: true },
  { id: 'first_conversation', title: 'Start a Conversation', description: 'Chat with your new AI employee', required: true },
  { id: 'assign_task', title: 'Assign a Task', description: 'Give your AI employee something to work on', required: false },
  { id: 'invite_team', title: 'Invite Your Team', description: 'Add colleagues to collaborate with AI employees', required: false },
  { id: 'connect_integration', title: 'Connect an Integration', description: 'Link your email, calendar, or other tools', required: false },
  { id: 'explore_settings', title: 'Customize Your Settings', description: 'Set your preferences, notifications, and theme', required: false },
];

export class OnboardingService {
  constructor(private env: Env) {}

  async getProgress(userId: string): Promise<OnboardingProgress> {
    const row = await this.env.DB.prepare(
      `SELECT * FROM onboarding_progress WHERE user_id = ?`
    ).bind(userId).first<any>();

    if (row) {
      return {
        ...row,
        completed_steps: JSON.parse(row.completed_steps || '[]'),
        skipped_steps: JSON.parse(row.skipped_steps || '[]'),
      };
    }

    const now = new Date().toISOString();
    const progress: OnboardingProgress = {
      user_id: userId, org_id: 'default-org', current_step: 0,
      completed_steps: [], skipped_steps: [], started_at: now, completed_at: null,
    };
    await this.env.DB.prepare(
      `INSERT INTO onboarding_progress (user_id, org_id, current_step, completed_steps, skipped_steps, started_at, completed_at) VALUES (?, ?, 0, '[]', '[]', ?, NULL)`
    ).bind(userId, progress.org_id, now).run();
    return progress;
  }

  async completeStep(userId: string, stepId: string): Promise<OnboardingProgress> {
    const progress = await this.getProgress(userId);
    if (!progress.completed_steps.includes(stepId)) {
      progress.completed_steps.push(stepId);
    }
    progress.current_step = Math.min(progress.current_step + 1, ONBOARDING_STEPS.length);

    const allRequired = ONBOARDING_STEPS.filter(s => s.required).every(s => progress.completed_steps.includes(s.id));
    if (allRequired) progress.completed_at = new Date().toISOString();

    await this.env.DB.prepare(
      `UPDATE onboarding_progress SET current_step = ?, completed_steps = ?, completed_at = ? WHERE user_id = ?`
    ).bind(progress.current_step, JSON.stringify(progress.completed_steps), progress.completed_at, userId).run();

    return progress;
  }

  async skipStep(userId: string, stepId: string): Promise<OnboardingProgress> {
    const progress = await this.getProgress(userId);
    if (!progress.skipped_steps.includes(stepId)) {
      progress.skipped_steps.push(stepId);
    }
    progress.current_step = Math.min(progress.current_step + 1, ONBOARDING_STEPS.length);

    await this.env.DB.prepare(
      `UPDATE onboarding_progress SET current_step = ?, skipped_steps = ? WHERE user_id = ?`
    ).bind(progress.current_step, JSON.stringify(progress.skipped_steps), userId).run();

    return progress;
  }
}

// ══════════════════════════════════════════════════════
// 7. DATA IMPORT / EXPORT
// ══════════════════════════════════════════════════════

export class DataPortService {
  constructor(private env: Env) {}

  async exportAll(orgId: string, format: 'json' | 'csv' = 'json'): Promise<{ download_url: string; size_bytes: number; tables: string[] }> {
    const tables = ['employees', 'ai_tasks', 'ai_messages', 'subscriptions', 'notifications', 'user_settings'];
    const data: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        const result = await this.env.DB.prepare(`SELECT * FROM ${table} WHERE org_id = ? LIMIT 10000`).bind(orgId).all();
        data[table] = result.results || [];
      } catch {
        // Table may not have org_id column
        try {
          const result = await this.env.DB.prepare(`SELECT * FROM ${table} LIMIT 1000`).all();
          data[table] = result.results || [];
        } catch { data[table] = []; }
      }
    }

    const payload = format === 'json'
      ? JSON.stringify(data, null, 2)
      : this.toCSV(data);

    const exportId = `export-${orgId}-${Date.now()}`;
    await this.env.CACHE.put(`export:${exportId}`, payload, { expirationTtl: 86400 });

    return {
      download_url: `/api/platform/exports/${exportId}`,
      size_bytes: new TextEncoder().encode(payload).length,
      tables: Object.keys(data).filter(k => data[k].length > 0),
    };
  }

  private toCSV(data: Record<string, any[]>): string {
    let csv = '';
    for (const [table, rows] of Object.entries(data)) {
      if (rows.length === 0) continue;
      csv += `\n=== ${table} ===\n`;
      const headers = Object.keys(rows[0]);
      csv += headers.join(',') + '\n';
      for (const row of rows) {
        csv += headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
      }
    }
    return csv;
  }

  async importData(orgId: string, data: Record<string, any[]>): Promise<{ imported: Record<string, number>; errors: string[] }> {
    const imported: Record<string, number> = {};
    const errors: string[] = [];

    for (const [table, rows] of Object.entries(data)) {
      imported[table] = 0;
      for (const row of rows) {
        try {
          row.org_id = orgId; // Override org_id for multi-tenant safety
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(', ');
          await this.env.DB.prepare(
            `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
          ).bind(...cols.map(c => row[c])).run();
          imported[table]++;
        } catch (e: any) {
          errors.push(`${table}: ${e.message}`);
        }
      }
    }

    return { imported, errors };
  }
}

// ══════════════════════════════════════════════════════
// 8. ACCESSIBILITY AUDIT
// ══════════════════════════════════════════════════════

export interface A11yCheck {
  rule: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  wcag_criterion: string;
  passes: boolean;
}

export class AccessibilityService {
  getAuditChecklist(): A11yCheck[] {
    return [
      { rule: 'color-contrast', category: 'Perceivable', severity: 'error', description: 'All text has sufficient color contrast ratio (4.5:1 for normal, 3:1 for large)', wcag_criterion: '1.4.3', passes: true },
      { rule: 'alt-text', category: 'Perceivable', severity: 'error', description: 'All images have meaningful alt text', wcag_criterion: '1.1.1', passes: true },
      { rule: 'heading-order', category: 'Perceivable', severity: 'warning', description: 'Headings follow a logical h1-h6 hierarchy', wcag_criterion: '1.3.1', passes: true },
      { rule: 'keyboard-navigation', category: 'Operable', severity: 'error', description: 'All interactive elements are keyboard accessible', wcag_criterion: '2.1.1', passes: true },
      { rule: 'focus-visible', category: 'Operable', severity: 'error', description: 'Focus indicators are visible on all interactive elements', wcag_criterion: '2.4.7', passes: true },
      { rule: 'skip-navigation', category: 'Operable', severity: 'warning', description: 'Skip navigation link is provided', wcag_criterion: '2.4.1', passes: true },
      { rule: 'form-labels', category: 'Understandable', severity: 'error', description: 'All form inputs have associated labels', wcag_criterion: '1.3.1', passes: true },
      { rule: 'error-identification', category: 'Understandable', severity: 'error', description: 'Form errors are clearly identified and described', wcag_criterion: '3.3.1', passes: true },
      { rule: 'language-attr', category: 'Understandable', severity: 'warning', description: 'Page has a lang attribute', wcag_criterion: '3.1.1', passes: true },
      { rule: 'aria-roles', category: 'Robust', severity: 'error', description: 'ARIA roles and attributes are used correctly', wcag_criterion: '4.1.2', passes: true },
      { rule: 'reduced-motion', category: 'Operable', severity: 'warning', description: 'Animations respect prefers-reduced-motion', wcag_criterion: '2.3.3', passes: true },
      { rule: 'touch-target', category: 'Operable', severity: 'warning', description: 'Touch targets are at least 44x44 CSS pixels', wcag_criterion: '2.5.5', passes: true },
    ];
  }

  getComplianceScore(): { score: number; level: string; checks_passed: number; total_checks: number } {
    const checks = this.getAuditChecklist();
    const passed = checks.filter(c => c.passes).length;
    const score = Math.round((passed / checks.length) * 100);
    return {
      score,
      level: score >= 90 ? 'AA Compliant' : score >= 70 ? 'Partial Compliance' : 'Needs Work',
      checks_passed: passed,
      total_checks: checks.length,
    };
  }
}

// ══════════════════════════════════════════════════════
// 9. API DOCUMENTATION
// ══════════════════════════════════════════════════════

export const API_DOCUMENTATION = {
  version: '1.0.0',
  base_url: '/api',
  authentication: { type: 'Bearer JWT', header: 'Authorization', format: 'Bearer <access_token>' },
  rate_limits: { starter: '100 req/min', professional: '500 req/min', enterprise: '2000 req/min' },
  endpoints: [
    { method: 'POST', path: '/api/ai/chat', description: 'Send a message to an AI employee', auth: true },
    { method: 'GET', path: '/api/ai/conversations/:id', description: 'Get conversation history', auth: true },
    { method: 'POST', path: '/api/ai/tasks', description: 'Create a new task for an AI employee', auth: true },
    { method: 'POST', path: '/api/ai/tasks/:id/execute', description: 'Execute a pending task', auth: true },
    { method: 'POST', path: '/api/ai/documents/summarize', description: 'Summarize a document', auth: true },
    { method: 'POST', path: '/api/ai/voice/session', description: 'Create a voice session', auth: true },
    { method: 'GET', path: '/api/employees/', description: 'List AI employees', auth: true },
    { method: 'POST', path: '/api/connect/integrations', description: 'Connect an external service', auth: true },
    { method: 'GET', path: '/api/platform/search', description: 'Universal search across all content', auth: true },
    { method: 'GET', path: '/api/platform/notifications', description: 'List notifications', auth: true },
    { method: 'GET', path: '/api/platform/settings', description: 'Get user settings', auth: true },
    { method: 'PATCH', path: '/api/platform/settings', description: 'Update user settings', auth: true },
    { method: 'GET', path: '/api/platform/help/search', description: 'Search help articles', auth: false },
    { method: 'GET', path: '/api/platform/i18n/:lang', description: 'Get translations for a language', auth: false },
    { method: 'GET', path: '/api/business/pricing/plans', description: 'Get pricing plans', auth: false },
    { method: 'POST', path: '/api/business/sales/roi', description: 'Calculate ROI', auth: false },
  ],
  sdk: {
    npm_package: '@nexushr/sdk',
    install: 'npm install @nexushr/sdk',
    quickstart: `import NexusHR from '@nexushr/sdk';\nconst client = new NexusHR({ apiKey: 'nxhr_...' });\nconst reply = await client.chat('employee-id', 'Hello!');`,
  },
};

// ══════════════════════════════════════════════════════
// 10. PWA MANIFEST
// ══════════════════════════════════════════════════════

export const PWA_MANIFEST = {
  name: 'NexusHR AI Platform',
  short_name: 'NexusHR',
  description: 'AI-powered workforce platform — hire, manage, and collaborate with AI employees',
  start_url: '/',
  display: 'standalone',
  background_color: '#0f172a',
  theme_color: '#3b82f6',
  orientation: 'any',
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  categories: ['business', 'productivity'],
  screenshots: [],
  related_applications: [],
  prefer_related_applications: false,
};

export const SERVICE_WORKER_CONFIG = {
  cache_name: 'nexushr-v1',
  precache: ['/', '/index.html', '/manifest.json'],
  runtime_cache: [
    { pattern: /\/api\/platform\/help/, strategy: 'stale-while-revalidate', maxAge: 86400 },
    { pattern: /\/api\/platform\/i18n/, strategy: 'cache-first', maxAge: 604800 },
    { pattern: /\/api\/business\/pricing/, strategy: 'stale-while-revalidate', maxAge: 3600 },
    { pattern: /\/api\//, strategy: 'network-first', maxAge: 300 },
  ],
};

// ══════════════════════════════════════════════════════
// 11. D1 SCHEMA
// ══════════════════════════════════════════════════════

export const PLATFORM_SCHEMA = `
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    channel TEXT DEFAULT 'in_app',
    priority TEXT DEFAULT 'normal',
    category TEXT DEFAULT 'general',
    action_url TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY,
    settings TEXT DEFAULT '{}',
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS onboarding_progress (
    user_id TEXT PRIMARY KEY,
    org_id TEXT,
    current_step INTEGER DEFAULT 0,
    completed_steps TEXT DEFAULT '[]',
    skipped_steps TEXT DEFAULT '[]',
    started_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(user_id, read);
`;

// ══════════════════════════════════════════════════════
// 12. ROUTE HANDLER
// ══════════════════════════════════════════════════════

export async function handlePlatform(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const subPath = path.replace('/api/platform/', '');

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    // ── Notifications ──
    if (subPath === 'notifications' && method === 'GET') {
      const svc = new NotificationService(env);
      const unreadOnly = url.searchParams.get('unread') === 'true';
      const notifs = await svc.list(userId, { unread_only: unreadOnly });
      const unreadCount = await svc.getUnreadCount(userId);
      return json({ notifications: notifs, unread_count: unreadCount });
    }

    if (subPath === 'notifications' && method === 'POST') {
      const body = await request.json() as any;
      const svc = new NotificationService(env);
      const notif = await svc.send(body.user_id || userId, body.org_id || 'default-org', body.title, body.body, body);
      return json(notif, 201);
    }

    if (subPath.startsWith('notifications/') && subPath.endsWith('/read') && method === 'PATCH') {
      const id = subPath.replace('notifications/', '').replace('/read', '');
      const svc = new NotificationService(env);
      await svc.markRead(id);
      return json({ success: true });
    }

    if (subPath === 'notifications/read-all' && method === 'PATCH') {
      const svc = new NotificationService(env);
      await svc.markAllRead(userId);
      return json({ success: true });
    }

    if (subPath === 'notifications/push-subscribe' && method === 'POST') {
      const body = await request.json() as any;
      const svc = new NotificationService(env);
      await svc.subscribePush(userId, body.subscription);
      return json({ success: true });
    }

    // ── Search ──
    if (subPath === 'search' && method === 'GET') {
      const query = url.searchParams.get('q') || '';
      const types = url.searchParams.get('types')?.split(',');
      const orgId = url.searchParams.get('org_id') || 'default-org';
      const svc = new SearchEngine(env);
      const results = await svc.search(orgId, query, { types });
      return json({ results, query });
    }

    // ── Settings ──
    if (subPath === 'settings' && method === 'GET') {
      const svc = new SettingsService(env);
      const settings = await svc.get(userId);
      return json(settings);
    }

    if (subPath === 'settings' && method === 'PATCH') {
      const body = await request.json() as any;
      const svc = new SettingsService(env);
      const settings = await svc.update(userId, body);
      return json(settings);
    }

    // ── Help Center ──
    if (subPath === 'help/search' && method === 'GET') {
      const query = url.searchParams.get('q') || '';
      const svc = new HelpCenterService();
      const articles = await svc.search(query);
      return json({ articles });
    }

    if (subPath.startsWith('help/articles/') && method === 'GET') {
      const id = subPath.replace('help/articles/', '');
      const svc = new HelpCenterService();
      const article = await svc.getArticle(id);
      return article ? json(article) : json({ error: 'Article not found' }, 404);
    }

    if (subPath === 'help/categories' && method === 'GET') {
      const svc = new HelpCenterService();
      const categories = await svc.getCategories();
      return json({ categories });
    }

    // ── i18n ──
    if (subPath.startsWith('i18n/') && method === 'GET') {
      const lang = subPath.replace('i18n/', '') as Language;
      const svc = new I18nService();
      return json({ language: lang, translations: svc.getTranslations(lang), supported: svc.getSupportedLanguages() });
    }

    // ── Onboarding ──
    if (subPath === 'onboarding' && method === 'GET') {
      const svc = new OnboardingService(env);
      const progress = await svc.getProgress(userId);
      return json({ progress, steps: ONBOARDING_STEPS });
    }

    if (subPath === 'onboarding/complete' && method === 'POST') {
      const body = await request.json() as any;
      const svc = new OnboardingService(env);
      const progress = await svc.completeStep(userId, body.step_id);
      return json(progress);
    }

    if (subPath === 'onboarding/skip' && method === 'POST') {
      const body = await request.json() as any;
      const svc = new OnboardingService(env);
      const progress = await svc.skipStep(userId, body.step_id);
      return json(progress);
    }

    // ── Data Import/Export ──
    if (subPath === 'export' && method === 'POST') {
      const body = await request.json() as any;
      const svc = new DataPortService(env);
      const result = await svc.exportAll(body.org_id || 'default-org', body.format);
      return json(result);
    }

    if (subPath.startsWith('exports/') && method === 'GET') {
      const exportId = subPath.replace('exports/', '');
      const data = await env.CACHE.get(`export:${exportId}`);
      if (!data) return json({ error: 'Export not found or expired' }, 404);
      return new Response(data, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${exportId}.json"` } });
    }

    if (subPath === 'import' && method === 'POST') {
      const body = await request.json() as any;
      const svc = new DataPortService(env);
      const result = await svc.importData(body.org_id || 'default-org', body.data);
      return json(result);
    }

    // ── Accessibility ──
    if (subPath === 'accessibility/audit' && method === 'GET') {
      const svc = new AccessibilityService();
      return json({ checklist: svc.getAuditChecklist(), compliance: svc.getComplianceScore() });
    }

    // ── API Docs ──
    if (subPath === 'api-docs' && method === 'GET') {
      return json(API_DOCUMENTATION);
    }

    // ── PWA ──
    if (subPath === 'manifest.json' && method === 'GET') {
      return json(PWA_MANIFEST);
    }

    return json({ error: 'Not Found', code: 'PLATFORM_NOT_FOUND' }, 404);
  } catch (err: any) {
    return json({ error: err.message, code: 'PLATFORM_ERROR' }, 500);
  }
}
