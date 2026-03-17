/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR IndexedDB Cache Layer — Structured Offline Storage with D1 Sync
 *
 * Replaces raw localStorage JSON.parse/stringify with proper IndexedDB:
 *  - Indexed queries (no full-scan parsing)
 *  - Async non-blocking reads/writes
 *  - Structured storage with object stores per entity type
 *  - Automatic sync queue for offline mutations
 *  - Conflict resolution (last-write-wins with version vectors)
 *  - Multi-device aware via device fingerprinting
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface SyncQueueItem {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  recordId: string;
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
}

export interface SyncMeta {
  table: string;
  lastSyncedAt: string;
  syncVersion: number;
  deviceId: string;
}

export interface ConflictRecord {
  id: string;
  table: string;
  recordId: string;
  localData: any;
  remoteData: any;
  localTimestamp: number;
  remoteTimestamp: number;
  resolution?: 'local' | 'remote' | 'merged';
  resolvedAt?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DB_NAME = 'nexushr_cache';
const DB_VERSION = 3;

const STORES = {
  conversations: { keyPath: 'id', indexes: ['orgId', 'userId', 'status', 'lastMessageAt'] },
  messages: { keyPath: 'id', indexes: ['conversationId', 'orgId', 'createdAt'] },
  employees: { keyPath: 'id', indexes: ['orgId', 'employeeId', 'active'] },
  tasks: { keyPath: 'id', indexes: ['orgId', 'userId', 'status'] },
  users: { keyPath: 'id', indexes: ['orgId', 'email'] },
  subscriptions: { keyPath: 'id', indexes: ['orgId'] },
  invoices: { keyPath: 'id', indexes: ['orgId', 'status'] },
  usageRecords: { keyPath: 'id', indexes: ['orgId', 'userId', 'type'] },
  auditEvents: { keyPath: 'id', indexes: ['orgId', 'userId', 'createdAt'] },
  fleetConfig: { keyPath: 'id', indexes: ['provider', 'enabled'] },
  alertRules: { keyPath: 'id', indexes: ['metric', 'severity'] },
  alerts: { keyPath: 'id', indexes: ['status', 'severity'] },
  // Meta stores
  syncQueue: { keyPath: 'id', indexes: ['table', 'status', 'timestamp'] },
  syncMeta: { keyPath: 'table', indexes: [] },
  conflicts: { keyPath: 'id', indexes: ['table', 'resolvedAt'] },
} as const;

type StoreName = keyof typeof STORES;

// ── Device ID ──────────────────────────────────────────────────────────────

let _deviceId: string | null = null;

export function getDeviceId(): string {
  if (_deviceId) return _deviceId;
  const stored = localStorage.getItem('nexushr_device_id');
  if (stored) { _deviceId = stored; return stored; }
  const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem('nexushr_device_id', id);
  _deviceId = id;
  return id;
}

// ── IndexedDB Manager ──────────────────────────────────────────────────────

class IDBManager {
  private db: IDBDatabase | null = null;
  private opening: Promise<IDBDatabase> | null = null;

  /** Open or return cached database connection */
  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.opening) return this.opening;

    this.opening = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const [name, config] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: config.keyPath });
            for (const idx of config.indexes) {
              store.createIndex(idx, idx, { unique: false });
            }
          }
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onclose = () => { this.db = null; this.opening = null; };
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });

    return this.opening;
  }

  /** Get a transaction for given stores */
  async tx(storeNames: StoreName | StoreName[], mode: IDBTransactionMode = 'readonly'): Promise<IDBTransaction> {
    const db = await this.open();
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    return db.transaction(names, mode);
  }

  /** Close the database connection */
  close(): void {
    this.db?.close();
    this.db = null;
    this.opening = null;
  }
}

const idb = new IDBManager();

// ── Generic CRUD Operations ────────────────────────────────────────────────

/** Promisify an IDBRequest */
function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Promisify a transaction completion */
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('Transaction aborted'));
  });
}

export const cacheStore = {
  /** Get a single record by key */
  async get<T = any>(store: StoreName, key: string): Promise<T | undefined> {
    const tx = await idb.tx(store, 'readonly');
    return req<T>(tx.objectStore(store).get(key));
  },

  /** Get all records in a store */
  async getAll<T = any>(store: StoreName): Promise<T[]> {
    const tx = await idb.tx(store, 'readonly');
    return req<T[]>(tx.objectStore(store).getAll());
  },

  /** Get records by index value */
  async getByIndex<T = any>(store: StoreName, indexName: string, value: IDBValidKey): Promise<T[]> {
    const tx = await idb.tx(store, 'readonly');
    const index = tx.objectStore(store).index(indexName);
    return req<T[]>(index.getAll(value));
  },

  /** Get records by index range */
  async getByRange<T = any>(store: StoreName, indexName: string, range: IDBKeyRange, limit?: number): Promise<T[]> {
    const tx = await idb.tx(store, 'readonly');
    const index = tx.objectStore(store).index(indexName);
    return req<T[]>(index.getAll(range, limit));
  },

  /** Put a record (insert or update) */
  async put<T = any>(store: StoreName, data: T): Promise<void> {
    const tx = await idb.tx(store, 'readwrite');
    tx.objectStore(store).put(data);
    await txDone(tx);
  },

  /** Put multiple records in a single transaction */
  async putMany<T = any>(store: StoreName, items: T[]): Promise<void> {
    if (items.length === 0) return;
    const tx = await idb.tx(store, 'readwrite');
    const objStore = tx.objectStore(store);
    for (const item of items) {
      objStore.put(item);
    }
    await txDone(tx);
  },

  /** Delete a record by key */
  async delete(store: StoreName, key: string): Promise<void> {
    const tx = await idb.tx(store, 'readwrite');
    tx.objectStore(store).delete(key);
    await txDone(tx);
  },

  /** Clear all records in a store */
  async clear(store: StoreName): Promise<void> {
    const tx = await idb.tx(store, 'readwrite');
    tx.objectStore(store).clear();
    await txDone(tx);
  },

  /** Count records in a store */
  async count(store: StoreName): Promise<number> {
    const tx = await idb.tx(store, 'readonly');
    return req<number>(tx.objectStore(store).count());
  },

  /** Count records by index */
  async countByIndex(store: StoreName, indexName: string, value: IDBValidKey): Promise<number> {
    const tx = await idb.tx(store, 'readonly');
    const index = tx.objectStore(store).index(indexName);
    return req<number>(index.count(value));
  },
};

// ── Sync Queue ─────────────────────────────────────────────────────────────

export const syncQueue = {
  /** Enqueue a mutation for later sync to D1 */
  async enqueue(table: string, operation: 'insert' | 'update' | 'delete', recordId: string, data: any): Promise<void> {
    const item: SyncQueueItem = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      table,
      operation,
      recordId,
      data,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };
    await cacheStore.put('syncQueue', item);
  },

  /** Get all pending items, oldest first */
  async getPending(): Promise<SyncQueueItem[]> {
    const all = await cacheStore.getByIndex<SyncQueueItem>('syncQueue', 'status', 'pending');
    return all.sort((a, b) => a.timestamp - b.timestamp);
  },

  /** Mark an item as syncing */
  async markSyncing(id: string): Promise<void> {
    const item = await cacheStore.get<SyncQueueItem>('syncQueue', id);
    if (item) {
      item.status = 'syncing';
      await cacheStore.put('syncQueue', item);
    }
  },

  /** Remove a successfully synced item */
  async remove(id: string): Promise<void> {
    await cacheStore.delete('syncQueue', id);
  },

  /** Mark as failed and increment retry counter */
  async markFailed(id: string): Promise<void> {
    const item = await cacheStore.get<SyncQueueItem>('syncQueue', id);
    if (item) {
      item.status = 'failed';
      item.retries++;
      // Re-mark as pending if under retry limit
      if (item.retries < 5) item.status = 'pending';
      await cacheStore.put('syncQueue', item);
    }
  },

  /** Get queue size */
  async size(): Promise<number> {
    return cacheStore.count('syncQueue');
  },

  /** Clear completed/dead items */
  async cleanup(): Promise<number> {
    const all = await cacheStore.getAll<SyncQueueItem>('syncQueue');
    let removed = 0;
    for (const item of all) {
      if (item.status === 'failed' && item.retries >= 5) {
        await cacheStore.delete('syncQueue', item.id);
        removed++;
      }
    }
    return removed;
  },
};

// ── Sync Engine ────────────────────────────────────────────────────────────

const API_BASE = '/api/database';

async function apiCall<T>(path: string, opts: RequestInit = {}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
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
    return { ok: false, error: err.message || 'Network error' };
  }
}

export const syncEngine = {
  private_syncing: false,

  /** Full sync: push local changes, then pull remote updates */
  async fullSync(): Promise<{ pushed: number; pulled: number; conflicts: number }> {
    if ((this as any).private_syncing) return { pushed: 0, pulled: 0, conflicts: 0 };
    (this as any).private_syncing = true;

    let pushed = 0, pulled = 0, conflicts = 0;

    try {
      // Phase 1: Push local changes to D1
      pushed = await this.pushChanges();

      // Phase 2: Pull remote changes from D1
      const pullResult = await this.pullChanges();
      pulled = pullResult.pulled;
      conflicts = pullResult.conflicts;

    } finally {
      (this as any).private_syncing = false;
    }

    return { pushed, pulled, conflicts };
  },

  /** Push all pending local mutations to D1 */
  async pushChanges(): Promise<number> {
    const pending = await syncQueue.getPending();
    let pushed = 0;

    for (const item of pending) {
      await syncQueue.markSyncing(item.id);

      const endpoint = `/sync/push`;
      const res = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          table: item.table,
          operation: item.operation,
          recordId: item.recordId,
          data: item.data,
          deviceId: getDeviceId(),
          timestamp: item.timestamp,
        }),
      });

      if (res.ok) {
        await syncQueue.remove(item.id);
        pushed++;
      } else {
        await syncQueue.markFailed(item.id);
      }
    }

    return pushed;
  },

  /** Pull remote changes since last sync */
  async pullChanges(): Promise<{ pulled: number; conflicts: number }> {
    const syncTables: StoreName[] = ['conversations', 'messages', 'employees', 'tasks', 'alerts', 'fleetConfig'];
    let totalPulled = 0, totalConflicts = 0;

    for (const table of syncTables) {
      const meta = await cacheStore.get<SyncMeta>('syncMeta', table);
      const lastSync = meta?.lastSyncedAt || '1970-01-01T00:00:00Z';

      const res = await apiCall<{ records: any[]; syncVersion: number }>(`/sync/pull?table=${table}&since=${lastSync}&deviceId=${getDeviceId()}`);
      if (!res.ok) continue;

      const { records, syncVersion } = res.data;

      for (const remote of records) {
        const local = await cacheStore.get(table, remote.id);

        if (!local) {
          // No local copy — just insert
          await cacheStore.put(table, remote);
          totalPulled++;
        } else {
          // Conflict detection: compare versions
          const localVersion = (local as any).syncVersion || 0;
          const remoteVersion = remote.syncVersion || 0;

          if (remoteVersion > localVersion) {
            // Remote wins (last-write-wins)
            await cacheStore.put(table, remote);
            totalPulled++;
          } else if (remoteVersion === localVersion && JSON.stringify(local) !== JSON.stringify(remote)) {
            // Same version but different data — conflict
            const conflict: ConflictRecord = {
              id: crypto.randomUUID?.() || `${Date.now()}`,
              table,
              recordId: remote.id,
              localData: local,
              remoteData: remote,
              localTimestamp: (local as any).updatedAt ? new Date((local as any).updatedAt).getTime() : 0,
              remoteTimestamp: remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0,
            };

            // Auto-resolve: latest timestamp wins
            if (conflict.remoteTimestamp >= conflict.localTimestamp) {
              await cacheStore.put(table, remote);
              conflict.resolution = 'remote';
            } else {
              conflict.resolution = 'local';
              // Re-enqueue local version for push
              await syncQueue.enqueue(table, 'update', remote.id, local);
            }
            conflict.resolvedAt = Date.now();
            await cacheStore.put('conflicts', conflict);
            totalConflicts++;
            totalPulled++;
          }
          // If local version is higher, skip (our change is newer)
        }
      }

      // Update sync metadata
      await cacheStore.put('syncMeta', {
        table,
        lastSyncedAt: new Date().toISOString(),
        syncVersion: syncVersion || 0,
        deviceId: getDeviceId(),
      } as SyncMeta);
    }

    return { pulled: totalPulled, conflicts: totalConflicts };
  },

  /** Get unresolved conflicts */
  async getConflicts(): Promise<ConflictRecord[]> {
    const all = await cacheStore.getAll<ConflictRecord>('conflicts');
    return all.filter(c => !c.resolvedAt);
  },

  /** Manually resolve a conflict */
  async resolveConflict(conflictId: string, resolution: 'local' | 'remote'): Promise<void> {
    const conflict = await cacheStore.get<ConflictRecord>('conflicts', conflictId);
    if (!conflict) return;

    const data = resolution === 'local' ? conflict.localData : conflict.remoteData;
    await cacheStore.put(conflict.table as StoreName, data);

    if (resolution === 'local') {
      await syncQueue.enqueue(conflict.table, 'update', conflict.recordId, data);
    }

    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();
    await cacheStore.put('conflicts', conflict);
  },

  /** Get sync status across all tables */
  async getStatus(): Promise<{ table: string; lastSyncedAt: string; pendingChanges: number }[]> {
    const allMeta = await cacheStore.getAll<SyncMeta>('syncMeta');
    const pending = await syncQueue.getPending();

    const pendingByTable = new Map<string, number>();
    for (const p of pending) {
      pendingByTable.set(p.table, (pendingByTable.get(p.table) || 0) + 1);
    }

    return allMeta.map(m => ({
      table: m.table,
      lastSyncedAt: m.lastSyncedAt,
      pendingChanges: pendingByTable.get(m.table) || 0,
    }));
  },
};

// ── Cached Data Access Layer ───────────────────────────────────────────────
// High-level API that reads from IndexedDB first, falls back to Worker API

export const cachedData = {
  /** Get conversations for current user, with Worker fallback */
  async getConversations(userId: string, orgId: string): Promise<any[]> {
    // Try IndexedDB first
    const cached = await cacheStore.getByIndex('conversations', 'userId', userId);
    if (cached.length > 0) return cached.sort((a: any, b: any) =>
      (b.lastMessageAt || b.createdAt || '').localeCompare(a.lastMessageAt || a.createdAt || '')
    );

    // Fallback to Worker API
    const res = await apiCall<any[]>(`/conversations?userId=${userId}&orgId=${orgId}`);
    if (res.ok) {
      await cacheStore.putMany('conversations', res.data);
      return res.data;
    }
    return [];
  },

  /** Get messages for a conversation */
  async getMessages(conversationId: string): Promise<any[]> {
    const cached = await cacheStore.getByIndex('messages', 'conversationId', conversationId);
    if (cached.length > 0) return cached.sort((a: any, b: any) =>
      (a.createdAt || '').localeCompare(b.createdAt || '')
    );

    const res = await apiCall<any[]>(`/messages?conversationId=${conversationId}`);
    if (res.ok) {
      await cacheStore.putMany('messages', res.data);
      return res.data;
    }
    return [];
  },

  /** Save a message (IndexedDB + sync queue) */
  async saveMessage(message: any): Promise<void> {
    await cacheStore.put('messages', message);
    await syncQueue.enqueue('messages', 'insert', message.id, message);
  },

  /** Get employees for org */
  async getEmployees(orgId: string): Promise<any[]> {
    const cached = await cacheStore.getByIndex('employees', 'orgId', orgId);
    if (cached.length > 0) return cached;

    const res = await apiCall<any[]>(`/employees?orgId=${orgId}`);
    if (res.ok) {
      await cacheStore.putMany('employees', res.data);
      return res.data;
    }
    return [];
  },

  /** Get usage summary */
  async getUsageSummary(orgId: string): Promise<{ tokenCount: number; taskCount: number; voiceMinutes: number }> {
    const records = await cacheStore.getByIndex<any>('usageRecords', 'orgId', orgId);
    let tokenCount = 0, taskCount = 0, voiceMinutes = 0;
    for (const r of records) {
      if (r.type === 'llm_tokens') tokenCount += r.quantity;
      else if (r.type === 'task_execution') taskCount += r.quantity;
      else if (r.type === 'voice_minutes') voiceMinutes += r.quantity;
    }
    return { tokenCount, taskCount, voiceMinutes };
  },

  /** Clear all cached data (logout) */
  async clearAll(): Promise<void> {
    const stores: StoreName[] = ['conversations', 'messages', 'employees', 'tasks',
      'users', 'subscriptions', 'invoices', 'usageRecords', 'auditEvents',
      'fleetConfig', 'alertRules', 'alerts'];
    for (const store of stores) {
      await cacheStore.clear(store);
    }
  },
};

// ── React Hooks ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';

/** Hook for sync status with auto-sync on reconnect */
export function useSync(autoSyncIntervalMs = 60000) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const doSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncEngine.fullSync();
      setLastSync(new Date().toISOString());
      const pending = await syncQueue.size();
      setPendingCount(pending);
      setConflictCount(result.conflicts);
    } catch {} finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    // Initial sync
    doSync();

    // Periodic sync
    intervalRef.current = setInterval(doSync, autoSyncIntervalMs);

    // Sync on reconnect
    const onOnline = () => doSync();
    window.addEventListener('online', onOnline);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('online', onOnline);
    };
  }, [doSync, autoSyncIntervalMs]);

  return { syncing, lastSync, pendingCount, conflictCount, triggerSync: doSync };
}

/** Hook for cached conversations */
export function useCachedConversations(userId: string, orgId: string) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await cachedData.getConversations(userId, orgId);
    setConversations(data);
    setLoading(false);
  }, [userId, orgId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { conversations, loading, refresh };
}

/** Hook for cached messages with real-time appending */
export function useCachedMessages(conversationId: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    cachedData.getMessages(conversationId).then(msgs => {
      setMessages(msgs);
      setLoading(false);
    });
  }, [conversationId]);

  const addMessage = useCallback(async (message: any) => {
    await cachedData.saveMessage(message);
    setMessages(prev => [...prev, message]);
  }, []);

  return { messages, loading, addMessage };
}

/** Hook for IndexedDB storage stats */
export function useStorageStats() {
  const [stats, setStats] = useState<{ store: string; count: number }[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      const stores: StoreName[] = ['conversations', 'messages', 'employees', 'tasks', 'syncQueue', 'conflicts'];
      const results = await Promise.all(
        stores.map(async s => ({ store: s, count: await cacheStore.count(s) }))
      );
      setStats(results);
    };
    loadStats();
  }, []);

  return stats;
}
