/**
 * API Service Layer — abstraction for future backend migration.
 * Currently simulates API calls with localStorage. When a real backend is built,
 * swap the implementation of each method without changing any consumer code.
 */

import type { AIEmployee, ChatMessage, AuthState, UsageRecord, Subscriber, FleetConfig, ConversationMemory, APIResponse } from '../data/types';
import { AI_EMPLOYEES } from '../data/employees';
import { SUBSCRIBERS, FLEET_CONFIG } from '../data/constants';
import { loadChatHistory, saveChatHistory, loadUsage, saveUsage, loadMemory, saveMemory, loadAuditLog, addAuditEntry } from './storage';
import { generateResponse, getThinkingMessage, getResponseDelay, updateMemory } from './ai-brain';

let requestCounter = 0;
function makeRequestId(): string {
  return `req_${Date.now()}_${(++requestCounter).toString(36)}`;
}

function wrapResponse<T>(data: T, startTime: number): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: makeRequestId(),
      latency: Date.now() - startTime,
    },
  };
}

function wrapError(code: string, message: string): APIResponse<never> {
  return {
    success: false,
    error: { code, message },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: makeRequestId(),
      latency: 0,
    },
  };
}

// ── Employee API ──
export const EmployeeAPI = {
  list(filters?: { jobType?: string; search?: string }): APIResponse<AIEmployee[]> {
    const start = Date.now();
    let results = [...AI_EMPLOYEES];
    if (filters?.jobType) results = results.filter(e => e.jobType === filters.jobType);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q) ||
        e.skills.some(s => s.toLowerCase().includes(q))
      );
    }
    return wrapResponse(results, start);
  },

  get(id: string): APIResponse<AIEmployee> {
    const start = Date.now();
    const emp = AI_EMPLOYEES.find(e => e.id === id);
    if (!emp) return wrapError('NOT_FOUND', `Employee ${id} not found`);
    return wrapResponse(emp, start);
  },
};

// ── Chat API ──
export const ChatAPI = {
  getHistory(employeeId: string): APIResponse<ChatMessage[]> {
    const start = Date.now();
    const messages = loadChatHistory(employeeId) || [];
    return wrapResponse(messages, start);
  },

  sendMessage(employeeId: string, userMessage: string, history: ChatMessage[]): APIResponse<{ response: string; thinkingMessage: string; delay: number; intent: string }> {
    const start = Date.now();
    const emp = AI_EMPLOYEES.find(e => e.id === employeeId);
    if (!emp) return wrapError('NOT_FOUND', `Employee ${employeeId} not found`);

    const response = generateResponse(emp, userMessage, history);
    const thinkingMessage = getThinkingMessage(emp);
    const delay = getResponseDelay(emp);

    // Update conversation memory
    const memory = loadMemory(employeeId);
    const updatedMemory = updateMemory(memory, employeeId, 'current_user', userMessage, response);
    saveMemory(employeeId, updatedMemory);

    return wrapResponse({ response, thinkingMessage, delay, intent: 'detected' }, start);
  },

  saveHistory(employeeId: string, messages: ChatMessage[]): APIResponse<void> {
    const start = Date.now();
    saveChatHistory(employeeId, messages);
    return wrapResponse(undefined, start);
  },

  clearHistory(employeeId: string): APIResponse<void> {
    const start = Date.now();
    saveChatHistory(employeeId, []);
    return wrapResponse(undefined, start);
  },

  exportHistory(employeeId: string): APIResponse<string> {
    const start = Date.now();
    const messages = loadChatHistory(employeeId) || [];
    const text = messages.map(m => `[${m.ts}] ${m.from === 'user' ? 'You' : 'AI'}: ${m.text}`).join('\n\n');
    return wrapResponse(text, start);
  },
};

// ── Memory API ──
export const MemoryAPI = {
  get(employeeId: string): APIResponse<ConversationMemory | null> {
    const start = Date.now();
    return wrapResponse(loadMemory(employeeId), start);
  },
  save(employeeId: string, memory: ConversationMemory): APIResponse<void> {
    const start = Date.now();
    saveMemory(employeeId, memory);
    return wrapResponse(undefined, start);
  },
};

// ── Usage API ──
export const UsageAPI = {
  getRecords(): APIResponse<UsageRecord[]> {
    const start = Date.now();
    return wrapResponse(loadUsage(), start);
  },
  trackTask(): APIResponse<void> {
    const start = Date.now();
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
    return wrapResponse(undefined, start);
  },
  getSummary(): APIResponse<{ totalTasks: number; totalCompute: number; totalCost: number; avgTasksPerDay: number }> {
    const start = Date.now();
    const usage = loadUsage();
    const totalTasks = usage.reduce((a, u) => a + u.tasks, 0);
    const totalCompute = usage.reduce((a, u) => a + u.compute, 0);
    const totalCost = usage.reduce((a, u) => a + u.cost, 0);
    return wrapResponse({
      totalTasks,
      totalCompute,
      totalCost,
      avgTasksPerDay: usage.length > 0 ? totalTasks / usage.length : 0,
    }, start);
  },
};

// ── Admin API ──
export const AdminAPI = {
  getSubscribers(): APIResponse<Subscriber[]> {
    const start = Date.now();
    return wrapResponse([...SUBSCRIBERS], start);
  },
  getFleetConfig(): APIResponse<FleetConfig[]> {
    const start = Date.now();
    return wrapResponse([...FLEET_CONFIG], start);
  },
  getAuditLog(): APIResponse<ReturnType<typeof loadAuditLog>> {
    const start = Date.now();
    return wrapResponse(loadAuditLog(), start);
  },
  logAction(action: string, actor: string, target: string, details: string): APIResponse<void> {
    const start = Date.now();
    addAuditEntry(action, actor, target, details);
    return wrapResponse(undefined, start);
  },
  exportData(): APIResponse<string> {
    const start = Date.now();
    const data = {
      subscribers: SUBSCRIBERS,
      fleet: FLEET_CONFIG,
      usage: loadUsage(),
      audit: loadAuditLog(),
      exportedAt: new Date().toISOString(),
    };
    return wrapResponse(JSON.stringify(data, null, 2), start);
  },
};
