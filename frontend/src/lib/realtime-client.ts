/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Real-Time Client — WebSocket, Task Queue, Cache, Multi-Region
 * Worker WebSocket primary with polling fallback for offline resilience
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WSMessage {
  type: 'chat' | 'task_update' | 'alert' | 'presence' | 'typing' | 'sync';
  orgId: string;
  userId?: string;
  channel?: string;
  payload: any;
  timestamp: number;
}

export interface QueueTask {
  id: string;
  type: string;
  priority: string;
  status: string;
  payload: any;
  createdAt: string;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  byPriority: Record<string, number>;
  avgProcessingTimeMs: number;
}

export interface RegionHealth {
  region: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  requestsPerMinute: number;
  errorRate: number;
}

export interface PlatformStatus {
  status: 'healthy' | 'degraded' | 'down';
  healthyRegions: number;
  totalRegions: number;
}

type MessageHandler = (msg: WSMessage) => void;

// ── Constants ──────────────────────────────────────────────────────────────

const API_BASE = '/api/scale';
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 30000;

// ── API Helper ─────────────────────────────────────────────────────────────

async function api<T>(path: string, opts: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const token = localStorage.getItem('nexushr_token') || '';
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(opts.headers || {}) },
    });
    const json = await res.json() as any;
    if (!res.ok || !json.success) return { ok: false, error: json.error || `HTTP ${res.status}` };
    return { ok: true, data: json.data ?? json };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ── WebSocket Manager ──────────────────────────────────────────────────────

class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private messageQueue: WSMessage[] = [];

  /** Connect to the WebSocket gateway */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.closed = false;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = localStorage.getItem('nexushr_token') || '';
    const url = `${protocol}//${window.location.host}${API_BASE}/ws?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        // Flush queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift()!;
          this.send(msg);
        }
        this.emit('_connection', { type: 'sync', orgId: '', payload: { status: 'connected' }, timestamp: Date.now() } as WSMessage);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          this.emit(msg.type, msg);
          this.emit('*', msg); // Wildcard handler
        } catch { /* Invalid message */ }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (!this.closed) this.scheduleReconnect();
        this.emit('_connection', { type: 'sync', orgId: '', payload: { status: 'disconnected' }, timestamp: Date.now() } as WSMessage);
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  /** Disconnect */
  disconnect(): void {
    this.closed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  /** Send a message */
  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue for when connection is restored
      this.messageQueue.push(message);
    }
  }

  /** Subscribe to a message type */
  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
    return () => { this.handlers.get(type)?.delete(handler); };
  }

  /** Get connection state */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get queuedMessages(): number {
    return this.messageQueue.length;
  }

  private emit(type: string, msg: WSMessage): void {
    this.handlers.get(type)?.forEach(h => { try { h(msg); } catch {} });
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, this.reconnectAttempts), RECONNECT_MAX_MS);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }
}

// Singleton
const wsManager = new WebSocketManager();

// ── Task Queue Client ──────────────────────────────────────────────────────

export const taskQueueClient = {
  async enqueue(type: string, payload: any, priority = 'normal'): Promise<string | null> {
    const res = await api<{ taskId: string }>('/queue/enqueue', {
      method: 'POST', body: JSON.stringify({ type, payload, priority }),
    });
    return res.ok ? res.data.taskId : null;
  },

  async getStats(): Promise<QueueStats | null> {
    const res = await api<QueueStats>('/queue/stats');
    return res.ok ? res.data : null;
  },

  async getUserTasks(): Promise<QueueTask[]> {
    const res = await api<QueueTask[]>('/queue/tasks');
    return res.ok ? res.data : [];
  },

  async complete(taskId: string, result: any): Promise<boolean> {
    const res = await api(`/queue/complete/${taskId}`, {
      method: 'POST', body: JSON.stringify({ result }),
    });
    return res.ok;
  },

  async fail(taskId: string, error: string): Promise<string> {
    const res = await api<{ outcome: string }>(`/queue/fail/${taskId}`, {
      method: 'POST', body: JSON.stringify({ error }),
    });
    return res.ok ? res.data.outcome : 'failed';
  },
};

// ── Cache Client ───────────────────────────────────────────────────────────

export const cacheClient = {
  async invalidate(opts: { key?: string; tag?: string; orgId?: string }): Promise<number> {
    const res = await api<{ invalidated: number }>('/cache/invalidate', {
      method: 'POST', body: JSON.stringify(opts),
    });
    return res.ok ? res.data.invalidated : 0;
  },
};

// ── Region Health Client ───────────────────────────────────────────────────

export const regionClient = {
  async getHealth(): Promise<{ regions: RegionHealth[]; overall: PlatformStatus } | null> {
    const res = await api<{ regions: RegionHealth[]; overall: PlatformStatus }>('/regions');
    return res.ok ? res.data : null;
  },

  async getDashboard(): Promise<any> {
    const res = await api<any>('/dashboard');
    return res.ok ? res.data : null;
  },
};

// ── React Hooks ────────────────────────────────────────────────────────────

/** Hook for WebSocket connection with auto-connect/disconnect */
export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    wsManager.connect();

    const unsub = wsManager.on('_connection', (msg) => {
      setConnected(msg.payload.status === 'connected');
      setQueuedCount(wsManager.queuedMessages);
    });

    return () => {
      unsub();
      // Don't disconnect on unmount — keep connection alive across pages
    };
  }, []);

  const send = useCallback((type: WSMessage['type'], payload: any, channel?: string) => {
    wsManager.send({ type, orgId: '', payload, channel, timestamp: Date.now() });
  }, []);

  const disconnect = useCallback(() => wsManager.disconnect(), []);

  return { connected, queuedCount, send, disconnect };
}

/** Hook to subscribe to specific WebSocket message types */
export function useWSMessages(type: string | '*') {
  const [messages, setMessages] = useState<WSMessage[]>([]);

  useEffect(() => {
    const unsub = wsManager.on(type, (msg) => {
      setMessages(prev => [...prev.slice(-99), msg]); // Keep last 100
    });
    return unsub;
  }, [type]);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, latest: messages[messages.length - 1] || null, clear };
}

/** Hook for real-time presence (who's online) */
export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    const unsub = wsManager.on('presence', (msg) => {
      setOnlineUsers(msg.payload?.onlineUsers || []);
    });
    return unsub;
  }, []);

  return { onlineUsers, count: onlineUsers.length };
}

/** Hook for typing indicators */
export function useTypingIndicator() {
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const timeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const unsub = wsManager.on('typing', (msg) => {
      if (!msg.userId) return;
      setTypingUsers(prev => new Map(prev).set(msg.userId!, Date.now()));

      // Clear after 3 seconds of no typing
      const existing = timeoutRef.current.get(msg.userId);
      if (existing) clearTimeout(existing);
      timeoutRef.current.set(msg.userId, setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(msg.userId!);
          return next;
        });
      }, 3000));
    });

    return () => {
      unsub();
      timeoutRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const sendTyping = useCallback(() => {
    wsManager.send({ type: 'typing', orgId: '', payload: { typing: true }, timestamp: Date.now() });
  }, []);

  return { typingUsers: [...typingUsers.keys()], sendTyping };
}

/** Hook for task queue monitoring */
export function useTaskQueue(pollIntervalMs = 10000) {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [tasks, setTasks] = useState<QueueTask[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [s, t] = await Promise.all([
      taskQueueClient.getStats(),
      taskQueueClient.getUserTasks(),
    ]);
    setStats(s);
    setTasks(t);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);

    // Also listen for real-time task updates
    const unsub = wsManager.on('task_update', () => refresh());

    return () => { clearInterval(interval); unsub(); };
  }, [refresh, pollIntervalMs]);

  const enqueue = useCallback(async (type: string, payload: any, priority?: string) => {
    const id = await taskQueueClient.enqueue(type, payload, priority);
    if (id) await refresh();
    return id;
  }, [refresh]);

  return { stats, tasks, loading, refresh, enqueue };
}

/** Hook for platform health monitoring */
export function usePlatformHealth(pollIntervalMs = 30000) {
  const [health, setHealth] = useState<{ regions: RegionHealth[]; overall: PlatformStatus } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await regionClient.getHealth();
      setHealth(data);
      setLoading(false);
    };
    load();
    const interval = setInterval(load, pollIntervalMs);

    // Listen for real-time alerts
    const unsub = wsManager.on('alert', () => load());

    return () => { clearInterval(interval); unsub(); };
  }, [pollIntervalMs]);

  return { health, loading, isHealthy: health?.overall.status === 'healthy' };
}

/** Hook for real-time chat messages with WebSocket + API fallback */
export function useRealtimeChat(channel: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const { connected } = useWebSocket();

  useEffect(() => {
    // Subscribe to channel
    if (connected) {
      wsManager.send({ type: 'sync', orgId: '', payload: { subscribe: [channel] }, timestamp: Date.now() });
    }

    const unsub = wsManager.on('chat', (msg) => {
      if (msg.channel === channel || !msg.channel) {
        setMessages(prev => [...prev, msg.payload]);
      }
    });

    return unsub;
  }, [channel, connected]);

  const sendMessage = useCallback((content: string, metadata?: any) => {
    const msg = { content, metadata, sentAt: new Date().toISOString() };
    wsManager.send({ type: 'chat', orgId: '', channel, payload: msg, timestamp: Date.now() });
    setMessages(prev => [...prev, { ...msg, role: 'user' }]);
  }, [channel]);

  return { messages, sendMessage, connected };
}
