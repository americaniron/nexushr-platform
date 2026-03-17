import type { AuthState, ChatMessage, UsageRecord, ConversationMemory, AuditEntry, RateLimitState } from '../data/types';

const STORAGE_KEYS = {
  AUTH: 'nexushr_auth',
  CHATS: 'nexushr_chats',
  USAGE: 'nexushr_usage',
  ONBOARDING: 'nexushr_onboarding',
  FLEET: 'nexushr_fleet',
  SUBSCRIBERS: 'nexushr_subscribers',
  MEMORY: 'nexushr_memory',
  AUDIT: 'nexushr_audit',
  RATE_LIMIT: 'nexushr_rate_limit',
} as const;

const MAX_CHAT_MESSAGES = 200; // per employee
const MAX_AUDIT_ENTRIES = 500;
const MAX_USAGE_RECORDS = 90; // 90 days

// ── Storage Size Monitoring ──
export function getStorageUsage(): { used: number; total: number; percent: number } {
  let used = 0;
  try {
    for (const key of Object.values(STORAGE_KEYS)) {
      const item = localStorage.getItem(key);
      if (item) used += item.length * 2; // approximate bytes (UTF-16)
    }
  } catch {}
  const total = 5 * 1024 * 1024; // 5MB typical limit
  return { used, total, percent: Math.round((used / total) * 100) };
}

// ── Auth state persistence ──
export function saveAuthState(state: AuthState): void {
  try { localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(state)); } catch {}
}
export function loadAuthState(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
export function clearAuthState(): void {
  try { localStorage.removeItem(STORAGE_KEYS.AUTH); } catch {}
}

// ── Chat history persistence (with pruning) ──
export function saveChatHistory(employeeId: string, messages: ChatMessage[]): void {
  try {
    const all = loadAllChats();
    // Prune to max messages per employee
    all[employeeId] = messages.slice(-MAX_CHAT_MESSAGES);
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(all));
  } catch (e) {
    // If storage quota exceeded, prune aggressively
    try {
      const all = loadAllChats();
      for (const key of Object.keys(all)) {
        all[key] = all[key].slice(-50); // keep only last 50 per employee
      }
      all[employeeId] = messages.slice(-50);
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(all));
    } catch {}
  }
}
export function loadChatHistory(employeeId: string): ChatMessage[] | null {
  try {
    const all = loadAllChats();
    return all[employeeId] || null;
  } catch { return null; }
}
export function loadAllChats(): Record<string, ChatMessage[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHATS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
export function clearChatHistory(employeeId: string): void {
  try {
    const all = loadAllChats();
    delete all[employeeId];
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(all));
  } catch {}
}
export function exportChatHistory(employeeId: string): string {
  const messages = loadChatHistory(employeeId) || [];
  return messages.map(m => `[${m.ts}] ${m.from === 'user' ? 'You' : 'AI'}: ${m.text}`).join('\n\n');
}

// ── Usage tracking (with pruning) ──
export function saveUsage(records: UsageRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USAGE, JSON.stringify(records.slice(-MAX_USAGE_RECORDS)));
  } catch {}
}
export function loadUsage(): UsageRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USAGE);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
export function trackTask(): void {
  const today = new Date().toISOString().split('T')[0];
  const usage = loadUsage();
  const existing = usage.find(u => u.date === today);
  if (existing) {
    existing.tasks += 1;
    existing.compute += 0.02;
    existing.cost += 0.03;
  } else {
    usage.push({ date: today, tasks: 1, compute: 0.02, cost: 0.03 });
  }
  saveUsage(usage);
}

// ── Conversation Memory ──
export function saveMemory(employeeId: string, memory: ConversationMemory): void {
  try {
    const all = loadAllMemory();
    all[employeeId] = memory;
    localStorage.setItem(STORAGE_KEYS.MEMORY, JSON.stringify(all));
  } catch {}
}
export function loadMemory(employeeId: string): ConversationMemory | null {
  try {
    const all = loadAllMemory();
    return all[employeeId] || null;
  } catch { return null; }
}
function loadAllMemory(): Record<string, ConversationMemory> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEMORY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ── Audit Logging ──
export function addAuditEntry(action: string, actor: string, target: string, details: string): void {
  try {
    const entries = loadAuditLog();
    entries.push({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      actor,
      target,
      details,
      ip: '127.0.0.1', // client-side, no real IP
    });
    // Keep only last N entries
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(entries.slice(-MAX_AUDIT_ENTRIES)));
  } catch {}
}
export function loadAuditLog(): AuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ── Rate Limiting ──
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

export function checkRateLimit(key: string = 'login'): { allowed: boolean; attemptsRemaining: number; lockedUntil?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT);
    const limits: Record<string, RateLimitState> = raw ? JSON.parse(raw) : {};
    const state = limits[key] || { attempts: 0, lastAttempt: 0, lockedUntil: null };
    const now = Date.now();

    // Check if locked out
    if (state.lockedUntil && now < state.lockedUntil) {
      return {
        allowed: false,
        attemptsRemaining: 0,
        lockedUntil: new Date(state.lockedUntil).toLocaleTimeString(),
      };
    }

    // Reset if window expired
    if (now - state.lastAttempt > RATE_LIMIT_WINDOW_MS) {
      state.attempts = 0;
      state.lockedUntil = null;
    }

    return {
      allowed: state.attempts < RATE_LIMIT_MAX_ATTEMPTS,
      attemptsRemaining: RATE_LIMIT_MAX_ATTEMPTS - state.attempts,
    };
  } catch {
    return { allowed: true, attemptsRemaining: RATE_LIMIT_MAX_ATTEMPTS };
  }
}

export function recordRateLimitAttempt(key: string = 'login', success: boolean): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT);
    const limits: Record<string, RateLimitState> = raw ? JSON.parse(raw) : {};
    const state = limits[key] || { attempts: 0, lastAttempt: 0, lockedUntil: null };
    const now = Date.now();

    if (success) {
      // Reset on success
      state.attempts = 0;
      state.lockedUntil = null;
    } else {
      // Reset if window expired
      if (now - state.lastAttempt > RATE_LIMIT_WINDOW_MS) {
        state.attempts = 0;
      }
      state.attempts += 1;
      state.lastAttempt = now;
      if (state.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
        state.lockedUntil = now + RATE_LIMIT_LOCKOUT_MS;
      }
    }

    limits[key] = state;
    localStorage.setItem(STORAGE_KEYS.RATE_LIMIT, JSON.stringify(limits));
  } catch {}
}

// ── Onboarding ──
export function saveOnboarding(complete: boolean): void {
  try { localStorage.setItem(STORAGE_KEYS.ONBOARDING, JSON.stringify(complete)); } catch {}
}
export function loadOnboarding(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ONBOARDING);
    return raw ? JSON.parse(raw) : false;
  } catch { return false; }
}

// ── Password Hashing (PBKDF2-inspired iteration for client-side) ──
export function hashPassword(password: string): string {
  // Multi-round hash with salt simulation (not production-grade, but significantly better than single-pass)
  let hash = 0;
  const salt = 'nexushr_v2_salt_' + password.length;
  const input = salt + password + salt;

  // Round 1: DJB2
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }

  // Round 2: FNV-1a
  let fnv = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    fnv ^= input.charCodeAt(i);
    fnv = Math.imul(fnv, 0x01000193);
  }

  // Round 3: Mix
  let mix = hash ^ fnv;
  for (let i = 0; i < 100; i++) {
    mix = Math.imul(mix, 0x5bd1e995);
    mix ^= mix >>> 13;
    mix = Math.imul(mix, 0x5bd1e995);
    mix ^= mix >>> 15;
  }

  return `pbk2_${Math.abs(hash).toString(36)}_${Math.abs(fnv).toString(36)}_${Math.abs(mix).toString(36)}`;
}

// ── Session token generation ──
export function generateSessionToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// ── Clear all data ──
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    try { localStorage.removeItem(key); } catch {}
  });
}

// ── Data Export (for admin) ──
export function exportAllData(): string {
  const data: Record<string, unknown> = {};
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      data[name] = raw ? JSON.parse(raw) : null;
    } catch {
      data[name] = null;
    }
  }
  return JSON.stringify(data, null, 2);
}
