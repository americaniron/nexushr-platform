/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Scalability Engine — Multi-Tenant, Caching, Task Queue, WebSocket,
 * CDN, Auto-Scaling, Multi-Region Health
 *
 * Built on Cloudflare edge primitives:
 *  - D1 for relational data (multi-tenant with org_id scoping)
 *  - KV for distributed caching (cache-aside pattern)
 *  - Durable Objects for WebSocket gateway + real-time state
 *  - Workers Queue for async AI task processing
 *  - Workers for edge compute with auto-scaling
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface TenantContext {
  orgId: string;
  userId: string;
  role: string;
  plan: 'starter' | 'growth' | 'enterprise';
  rateLimits: { rpm: number; tpm: number; concurrent: number };
}

export interface CacheEntry<T = any> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  tags: string[];
}

export interface QueueTask {
  id: string;
  orgId: string;
  userId: string;
  type: 'llm_completion' | 'tool_execution' | 'batch_process' | 'email_send'
    | 'webhook_delivery' | 'report_generation' | 'embedding_index';
  priority: 'critical' | 'high' | 'normal' | 'low';
  payload: Record<string, any>;
  maxRetries: number;
  retryCount: number;
  scheduledAt?: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
}

export interface WebSocketMessage {
  type: 'chat' | 'task_update' | 'alert' | 'presence' | 'typing' | 'sync';
  orgId: string;
  userId?: string;
  channel?: string;
  payload: any;
  timestamp: number;
}

export interface RegionHealth {
  region: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  requestsPerMinute: number;
  errorRate: number;
  lastCheck: string;
}

export interface AutoScalePolicy {
  name: string;
  metric: 'rpm' | 'latency_p95' | 'error_rate' | 'queue_depth' | 'cpu_time';
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownSeconds: number;
  minInstances: number;
  maxInstances: number;
}

// ── Plan-Based Rate Limits ─────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, TenantContext['rateLimits']> = {
  starter:    { rpm: 30,  tpm: 50000,   concurrent: 3  },
  growth:     { rpm: 120, tpm: 500000,  concurrent: 10 },
  enterprise: { rpm: 600, tpm: 5000000, concurrent: 50 },
};

// ── Multi-Tenant Query Layer ───────────────────────────────────────────────

export class TenantQueryLayer {
  constructor(
    private db: D1Database,
    private ctx: TenantContext,
  ) {}

  /** Scoped SELECT — always filters by org_id */
  async select<T = any>(
    table: string,
    opts: {
      where?: string;
      params?: any[];
      orderBy?: string;
      limit?: number;
      offset?: number;
      columns?: string[];
    } = {}
  ): Promise<T[]> {
    const cols = opts.columns?.join(', ') || '*';
    const whereClause = opts.where ? `AND (${opts.where})` : '';
    const orderClause = opts.orderBy ? `ORDER BY ${opts.orderBy}` : '';
    const limitClause = opts.limit ? `LIMIT ${opts.limit}` : 'LIMIT 100';
    const offsetClause = opts.offset ? `OFFSET ${opts.offset}` : '';

    const sql = `SELECT ${cols} FROM ${table} WHERE org_id = ? ${whereClause} ${orderClause} ${limitClause} ${offsetClause}`;
    const result = await this.db.prepare(sql).bind(this.ctx.orgId, ...(opts.params || [])).all();
    return (result.results || []) as T[];
  }

  /** Scoped COUNT */
  async count(table: string, where?: string, params: any[] = []): Promise<number> {
    const whereClause = where ? `AND (${where})` : '';
    const sql = `SELECT COUNT(*) as cnt FROM ${table} WHERE org_id = ? ${whereClause}`;
    const result = await this.db.prepare(sql).bind(this.ctx.orgId, ...params).first() as any;
    return result?.cnt || 0;
  }

  /** Scoped INSERT — auto-injects org_id */
  async insert(table: string, data: Record<string, any>): Promise<string> {
    const id = data.id || crypto.randomUUID();
    const withMeta = { ...data, id, org_id: this.ctx.orgId, created_at: new Date().toISOString() };
    const cols = Object.keys(withMeta);
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
    await this.db.prepare(sql).bind(...Object.values(withMeta)).run();
    return id;
  }

  /** Scoped UPDATE — only updates rows in same org */
  async update(table: string, id: string, data: Record<string, any>): Promise<boolean> {
    const withTimestamp = { ...data, updated_at: new Date().toISOString() };
    const sets = Object.keys(withTimestamp).map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${sets} WHERE id = ? AND org_id = ?`;
    const result = await this.db.prepare(sql).bind(...Object.values(withTimestamp), id, this.ctx.orgId).run();
    return (result.meta?.changes || 0) > 0;
  }

  /** Scoped DELETE */
  async remove(table: string, id: string): Promise<boolean> {
    const result = await this.db.prepare(
      `DELETE FROM ${table} WHERE id = ? AND org_id = ?`
    ).bind(id, this.ctx.orgId).run();
    return (result.meta?.changes || 0) > 0;
  }

  /** Batch INSERT in single transaction */
  async batchInsert(table: string, rows: Record<string, any>[]): Promise<number> {
    if (rows.length === 0) return 0;
    const stmts = rows.map(row => {
      const withMeta = { ...row, id: row.id || crypto.randomUUID(), org_id: this.ctx.orgId, created_at: new Date().toISOString() };
      const cols = Object.keys(withMeta);
      const placeholders = cols.map(() => '?').join(', ');
      return this.db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).bind(...Object.values(withMeta));
    });
    await this.db.batch(stmts);
    return rows.length;
  }

  /** Cross-tenant admin query (super_admin only) */
  async adminQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.ctx.role !== 'super_admin' && this.ctx.role !== 'owner') {
      throw new Error('Cross-tenant queries require super_admin or owner role');
    }
    const result = await this.db.prepare(sql).bind(...params).all();
    return (result.results || []) as T[];
  }

  /** Get tenant context */
  getContext(): TenantContext { return this.ctx; }
}

/** Build tenant context from user lookup */
export async function buildTenantContext(db: D1Database, userId: string): Promise<TenantContext> {
  const user = await db.prepare(
    'SELECT u.id, u.org_id, u.role, o.plan FROM users u JOIN organizations o ON u.org_id = o.id WHERE u.id = ?'
  ).bind(userId).first() as any;

  if (!user) throw new Error('User not found');

  const plan = user.plan || 'starter';
  return {
    orgId: user.org_id,
    userId: user.id,
    role: user.role,
    plan,
    rateLimits: PLAN_LIMITS[plan] || PLAN_LIMITS.starter,
  };
}

// ── Distributed Cache (KV-backed, cache-aside pattern) ─────────────────────

export class DistributedCache {
  private readonly defaultTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private kv: KVNamespace) {}

  /** Get from cache, or execute fetcher and cache result */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs?: number,
    tags: string[] = [],
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    // Cache miss — fetch and store
    const data = await fetcher();
    await this.set(key, data, ttlMs, tags);
    return data;
  }

  /** Get from cache */
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.kv.get(`cache:${key}`);
    if (!raw) return null;

    try {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      // Check TTL
      if (Date.now() - entry.cachedAt > entry.ttlMs) {
        await this.kv.delete(`cache:${key}`);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  /** Set in cache */
  async set<T>(key: string, data: T, ttlMs?: number, tags: string[] = []): Promise<void> {
    const ttl = ttlMs || this.defaultTtlMs;
    const entry: CacheEntry<T> = {
      data, cachedAt: Date.now(), ttlMs: ttl, tags,
    };
    await this.kv.put(`cache:${key}`, JSON.stringify(entry), {
      expirationTtl: Math.ceil(ttl / 1000),
    });

    // Track tags for invalidation
    for (const tag of tags) {
      const existing = await this.kv.get(`cache_tag:${tag}`);
      const keys: string[] = existing ? JSON.parse(existing) : [];
      if (!keys.includes(key)) {
        keys.push(key);
        await this.kv.put(`cache_tag:${tag}`, JSON.stringify(keys), { expirationTtl: Math.ceil(ttl / 1000) });
      }
    }
  }

  /** Invalidate a single key */
  async invalidate(key: string): Promise<void> {
    await this.kv.delete(`cache:${key}`);
  }

  /** Invalidate all keys with a given tag */
  async invalidateByTag(tag: string): Promise<number> {
    const raw = await this.kv.get(`cache_tag:${tag}`);
    if (!raw) return 0;

    const keys: string[] = JSON.parse(raw);
    await Promise.all(keys.map(k => this.kv.delete(`cache:${k}`)));
    await this.kv.delete(`cache_tag:${tag}`);
    return keys.length;
  }

  /** Invalidate all cache for an org */
  async invalidateOrg(orgId: string): Promise<number> {
    return this.invalidateByTag(`org:${orgId}`);
  }

  // ── Pre-built cache patterns ──

  /** Cache an org's employees list */
  async cacheEmployees(orgId: string, fetcher: () => Promise<any[]>): Promise<any[]> {
    return this.getOrFetch(`employees:${orgId}`, fetcher, 10 * 60 * 1000, [`org:${orgId}`, 'employees']);
  }

  /** Cache conversation messages (shorter TTL) */
  async cacheMessages(conversationId: string, orgId: string, fetcher: () => Promise<any[]>): Promise<any[]> {
    return this.getOrFetch(`messages:${conversationId}`, fetcher, 60 * 1000, [`org:${orgId}`, 'messages']);
  }

  /** Cache fleet config */
  async cacheFleetConfig(fetcher: () => Promise<any[]>): Promise<any[]> {
    return this.getOrFetch('fleet_config', fetcher, 30 * 60 * 1000, ['fleet']);
  }

  /** Cache user session data */
  async cacheUserSession(userId: string, fetcher: () => Promise<any>): Promise<any> {
    return this.getOrFetch(`session:${userId}`, fetcher, 15 * 60 * 1000, ['sessions']);
  }
}

// ── Async Task Queue (Workers Queue pattern) ───────────────────────────────

export class TaskQueue {
  constructor(
    private db: D1Database,
    private kv: KVNamespace,
  ) {}

  /** Enqueue a new task */
  async enqueue(task: Omit<QueueTask, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> {
    const id = crypto.randomUUID();
    const fullTask: QueueTask = {
      ...task, id, retryCount: 0, status: 'pending', createdAt: new Date().toISOString(),
    };

    // Store in D1 for persistence
    await this.db.prepare(
      `INSERT INTO task_queue (id, org_id, user_id, type, priority, payload, max_retries, retry_count, scheduled_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`
    ).bind(id, task.orgId, task.userId, task.type, task.priority,
      JSON.stringify(task.payload), task.maxRetries, task.scheduledAt || null,
      fullTask.createdAt).run();

    // Add to KV for fast queue access
    await this.kv.put(`queue:${task.priority}:${id}`, JSON.stringify(fullTask), { expirationTtl: 86400 });

    // Update queue depth metric
    await this.updateQueueDepth(task.orgId);

    return id;
  }

  /** Dequeue the next task by priority */
  async dequeue(): Promise<QueueTask | null> {
    for (const priority of ['critical', 'high', 'normal', 'low']) {
      const result = await this.db.prepare(
        `SELECT * FROM task_queue WHERE status = 'pending' AND priority = ?
         AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
         ORDER BY created_at ASC LIMIT 1`
      ).bind(priority).first() as any;

      if (result) {
        // Mark as processing
        await this.db.prepare(
          "UPDATE task_queue SET status = 'processing', started_at = datetime('now') WHERE id = ?"
        ).bind(result.id).run();

        return {
          id: result.id, orgId: result.org_id, userId: result.user_id,
          type: result.type, priority: result.priority,
          payload: JSON.parse(result.payload || '{}'),
          maxRetries: result.max_retries, retryCount: result.retry_count,
          scheduledAt: result.scheduled_at, createdAt: result.created_at,
          status: 'processing',
        };
      }
    }
    return null;
  }

  /** Complete a task */
  async complete(taskId: string, result: any): Promise<void> {
    await this.db.prepare(
      "UPDATE task_queue SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?"
    ).bind(JSON.stringify(result), taskId).run();
    await this.cleanupKV(taskId);
  }

  /** Fail a task (with retry logic) */
  async fail(taskId: string, error: string): Promise<'retrying' | 'dead_letter'> {
    const task = await this.db.prepare('SELECT * FROM task_queue WHERE id = ?').bind(taskId).first() as any;
    if (!task) return 'dead_letter';

    const newRetryCount = (task.retry_count || 0) + 1;

    if (newRetryCount < task.max_retries) {
      // Exponential backoff: schedule retry
      const delaySeconds = Math.min(300, Math.pow(2, newRetryCount) * 10);
      const scheduledAt = new Date(Date.now() + delaySeconds * 1000).toISOString();

      await this.db.prepare(
        "UPDATE task_queue SET status = 'pending', retry_count = ?, error = ?, scheduled_at = ? WHERE id = ?"
      ).bind(newRetryCount, error, scheduledAt, taskId).run();
      return 'retrying';
    }

    // Max retries exceeded → dead letter
    await this.db.prepare(
      "UPDATE task_queue SET status = 'dead_letter', retry_count = ?, error = ?, completed_at = datetime('now') WHERE id = ?"
    ).bind(newRetryCount, error, taskId).run();
    return 'dead_letter';
  }

  /** Get queue statistics */
  async getStats(orgId?: string): Promise<{
    pending: number; processing: number; completed: number; failed: number; deadLetter: number;
    byPriority: Record<string, number>; avgProcessingTimeMs: number;
  }> {
    const orgFilter = orgId ? 'AND org_id = ?' : '';
    const params = orgId ? [orgId] : [];

    const counts = await this.db.prepare(
      `SELECT status, COUNT(*) as cnt FROM task_queue WHERE 1=1 ${orgFilter} GROUP BY status`
    ).bind(...params).all();

    const priorityCounts = await this.db.prepare(
      `SELECT priority, COUNT(*) as cnt FROM task_queue WHERE status = 'pending' ${orgFilter} GROUP BY priority`
    ).bind(...params).all();

    const avgTime = await this.db.prepare(
      `SELECT AVG(CAST((julianday(completed_at) - julianday(started_at)) * 86400000 AS INTEGER)) as avg_ms
       FROM task_queue WHERE status = 'completed' AND started_at IS NOT NULL ${orgFilter}`
    ).bind(...params).first() as any;

    const statusMap = Object.fromEntries(((counts.results || []) as any[]).map(r => [r.status, r.cnt]));
    const priorityMap = Object.fromEntries(((priorityCounts.results || []) as any[]).map(r => [r.priority, r.cnt]));

    return {
      pending: statusMap.pending || 0,
      processing: statusMap.processing || 0,
      completed: statusMap.completed || 0,
      failed: statusMap.failed || 0,
      deadLetter: statusMap.dead_letter || 0,
      byPriority: priorityMap,
      avgProcessingTimeMs: avgTime?.avg_ms || 0,
    };
  }

  /** Get tasks for a user */
  async getUserTasks(orgId: string, userId: string, limit = 20): Promise<QueueTask[]> {
    const result = await this.db.prepare(
      'SELECT * FROM task_queue WHERE org_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(orgId, userId, limit).all();
    return ((result.results || []) as any[]).map(this.mapTask);
  }

  /** Clean up old completed tasks (retention: 7 days) */
  async cleanup(): Promise<number> {
    const result = await this.db.prepare(
      "DELETE FROM task_queue WHERE status IN ('completed', 'dead_letter') AND completed_at < datetime('now', '-7 days')"
    ).run();
    return result.meta?.changes || 0;
  }

  private mapTask(r: any): QueueTask {
    return {
      id: r.id, orgId: r.org_id, userId: r.user_id,
      type: r.type, priority: r.priority,
      payload: JSON.parse(r.payload || '{}'),
      maxRetries: r.max_retries, retryCount: r.retry_count,
      scheduledAt: r.scheduled_at, createdAt: r.created_at, status: r.status,
    };
  }

  private async cleanupKV(taskId: string): Promise<void> {
    for (const p of ['critical', 'high', 'normal', 'low']) {
      await this.kv.delete(`queue:${p}:${taskId}`);
    }
  }

  private async updateQueueDepth(orgId: string): Promise<void> {
    const count = await this.db.prepare(
      "SELECT COUNT(*) as cnt FROM task_queue WHERE org_id = ? AND status = 'pending'"
    ).bind(orgId).first() as any;
    await this.kv.put(`queue_depth:${orgId}`, String(count?.cnt || 0), { expirationTtl: 60 });
  }
}

// ── Task Queue Schema ──────────────────────────────────────────────────────

export const TASK_QUEUE_SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS task_queue (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal',
    payload TEXT DEFAULT '{}',
    result TEXT,
    error TEXT,
    max_retries INTEGER DEFAULT 3,
    retry_count INTEGER DEFAULT 0,
    scheduled_at TEXT,
    started_at TEXT,
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tq_status ON task_queue(status, priority, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_tq_org ON task_queue(org_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_tq_user ON task_queue(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_tq_scheduled ON task_queue(scheduled_at)`,
];

// ── WebSocket Gateway (Durable Object pattern) ────────────────────────────

export class WebSocketRoom {
  private connections = new Map<string, { ws: WebSocket; userId: string; orgId: string; subscribedChannels: Set<string> }>();

  /** Handle WebSocket upgrade */
  handleUpgrade(request: Request, userId: string, orgId: string): Response {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const connId = crypto.randomUUID();

    (server as any).accept();

    this.connections.set(connId, {
      ws: server, userId, orgId,
      subscribedChannels: new Set(['global', `org:${orgId}`, `user:${userId}`]),
    });

    server.addEventListener('message', (event: MessageEvent) => {
      this.handleMessage(connId, event.data as string);
    });

    server.addEventListener('close', () => {
      this.connections.delete(connId);
      this.broadcastPresence(orgId);
    });

    server.addEventListener('error', () => {
      this.connections.delete(connId);
    });

    // Send initial presence
    this.broadcastPresence(orgId);

    return new Response(null, { status: 101, webSocket: client });
  }

  /** Handle incoming WebSocket message */
  private handleMessage(connId: string, raw: string): void {
    try {
      const msg = JSON.parse(raw) as WebSocketMessage;
      const conn = this.connections.get(connId);
      if (!conn) return;

      switch (msg.type) {
        case 'typing':
          this.broadcastToOrg(conn.orgId, { type: 'typing', orgId: conn.orgId, userId: conn.userId, payload: msg.payload, timestamp: Date.now() }, connId);
          break;

        case 'chat':
          this.broadcastToChannel(msg.channel || `org:${conn.orgId}`, { ...msg, userId: conn.userId, timestamp: Date.now() }, connId);
          break;

        case 'sync':
          // Subscribe to additional channels
          if (msg.payload?.subscribe) {
            for (const ch of msg.payload.subscribe) {
              conn.subscribedChannels.add(ch);
            }
          }
          break;

        default:
          // Forward to org
          this.broadcastToOrg(conn.orgId, { ...msg, timestamp: Date.now() });
      }
    } catch { /* Invalid message */ }
  }

  /** Broadcast a message to all connections in an org */
  broadcastToOrg(orgId: string, message: WebSocketMessage, excludeConnId?: string): void {
    const payload = JSON.stringify(message);
    for (const [connId, conn] of this.connections) {
      if (conn.orgId === orgId && connId !== excludeConnId) {
        try { conn.ws.send(payload); } catch { this.connections.delete(connId); }
      }
    }
  }

  /** Broadcast to a specific channel */
  broadcastToChannel(channel: string, message: WebSocketMessage, excludeConnId?: string): void {
    const payload = JSON.stringify(message);
    for (const [connId, conn] of this.connections) {
      if (conn.subscribedChannels.has(channel) && connId !== excludeConnId) {
        try { conn.ws.send(payload); } catch { this.connections.delete(connId); }
      }
    }
  }

  /** Send to a specific user */
  sendToUser(userId: string, message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    for (const [connId, conn] of this.connections) {
      if (conn.userId === userId) {
        try { conn.ws.send(payload); } catch { this.connections.delete(connId); }
      }
    }
  }

  /** Broadcast presence update */
  private broadcastPresence(orgId: string): void {
    const onlineUsers: string[] = [];
    for (const conn of this.connections.values()) {
      if (conn.orgId === orgId && !onlineUsers.includes(conn.userId)) {
        onlineUsers.push(conn.userId);
      }
    }
    this.broadcastToOrg(orgId, {
      type: 'presence', orgId, payload: { onlineUsers, count: onlineUsers.length },
      timestamp: Date.now(),
    });
  }

  /** Get connection stats */
  getStats(): { totalConnections: number; byOrg: Record<string, number> } {
    const byOrg: Record<string, number> = {};
    for (const conn of this.connections.values()) {
      byOrg[conn.orgId] = (byOrg[conn.orgId] || 0) + 1;
    }
    return { totalConnections: this.connections.size, byOrg };
  }
}

// ── CDN & Static Asset Configuration ───────────────────────────────────────

export const CDN_CONFIG = {
  /** Cloudflare CDN caching rules */
  cacheRules: {
    staticAssets: {
      match: '*.{js,css,png,jpg,jpeg,gif,svg,woff,woff2,ttf,ico}',
      ttl: 365 * 24 * 60 * 60,  // 1 year (immutable with hash)
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Vary': 'Accept-Encoding',
      },
    },
    htmlPages: {
      match: '*.html',
      ttl: 300, // 5 minutes
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600',
        'Vary': 'Accept-Encoding',
      },
    },
    apiResponses: {
      match: '/api/*',
      ttl: 0,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    },
  },

  /** Edge caching for frequently-accessed API data */
  edgeCacheable: [
    { path: '/api/employees/', ttl: 300, varyBy: ['Authorization'] },
    { path: '/api/billing/plans', ttl: 3600, varyBy: [] },
    { path: '/api/health', ttl: 30, varyBy: [] },
  ],

  /** Asset optimization */
  optimization: {
    minify: { javascript: true, css: true, html: true },
    brotli: true,
    earlyHints: true,
    http3: true,
    imageOptimization: { webp: true, avif: true, quality: 85 },
  },
};

/** Apply CDN headers to a response based on path */
export function applyCDNHeaders(response: Response, path: string): Response {
  const headers = new Headers(response.headers);

  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|ico)$/)) {
    headers.set('Cache-Control', CDN_CONFIG.cacheRules.staticAssets.headers['Cache-Control']);
    headers.set('Vary', 'Accept-Encoding');
  } else if (path.endsWith('.html') || path === '/') {
    headers.set('Cache-Control', CDN_CONFIG.cacheRules.htmlPages.headers['Cache-Control']);
  } else if (path.startsWith('/api/')) {
    headers.set('Cache-Control', CDN_CONFIG.cacheRules.apiResponses.headers['Cache-Control']);
    headers.set('Pragma', 'no-cache');
  }

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// ── Auto-Scaling Policies ──────────────────────────────────────────────────

export const AUTO_SCALE_POLICIES: AutoScalePolicy[] = [
  {
    name: 'request_volume',
    metric: 'rpm',
    scaleUpThreshold: 500,
    scaleDownThreshold: 50,
    cooldownSeconds: 300,
    minInstances: 2,
    maxInstances: 100,
  },
  {
    name: 'latency',
    metric: 'latency_p95',
    scaleUpThreshold: 2000,  // ms
    scaleDownThreshold: 200,
    cooldownSeconds: 180,
    minInstances: 2,
    maxInstances: 50,
  },
  {
    name: 'error_rate',
    metric: 'error_rate',
    scaleUpThreshold: 5,  // percent
    scaleDownThreshold: 0.5,
    cooldownSeconds: 120,
    minInstances: 3,
    maxInstances: 50,
  },
  {
    name: 'queue_depth',
    metric: 'queue_depth',
    scaleUpThreshold: 100,
    scaleDownThreshold: 5,
    cooldownSeconds: 60,
    minInstances: 1,
    maxInstances: 20,
  },
];

// ── Multi-Region Health Monitor ────────────────────────────────────────────

export class MultiRegionHealth {
  private readonly REGIONS = ['us-east', 'us-west', 'eu-west', 'eu-central', 'ap-southeast', 'ap-northeast'];

  constructor(private kv: KVNamespace) {}

  /** Record health check from a region */
  async recordCheck(region: string, latencyMs: number, errorRate: number, rpm: number): Promise<void> {
    const status: RegionHealth['status'] = errorRate > 5 ? 'down' : errorRate > 1 ? 'degraded' : 'healthy';

    const health: RegionHealth = {
      region, status, latencyMs, requestsPerMinute: rpm,
      errorRate, lastCheck: new Date().toISOString(),
    };

    await this.kv.put(`region_health:${region}`, JSON.stringify(health), { expirationTtl: 300 });
  }

  /** Get health across all regions */
  async getAll(): Promise<RegionHealth[]> {
    const results: RegionHealth[] = [];
    for (const region of this.REGIONS) {
      const raw = await this.kv.get(`region_health:${region}`);
      if (raw) {
        results.push(JSON.parse(raw));
      } else {
        results.push({
          region, status: 'down', latencyMs: -1, requestsPerMinute: 0,
          errorRate: 100, lastCheck: '',
        });
      }
    }
    return results;
  }

  /** Get overall platform status */
  async getOverallStatus(): Promise<{ status: 'healthy' | 'degraded' | 'down'; healthyRegions: number; totalRegions: number }> {
    const all = await this.getAll();
    const healthy = all.filter(r => r.status === 'healthy').length;
    const down = all.filter(r => r.status === 'down').length;

    return {
      status: down > all.length / 2 ? 'down' : healthy < all.length / 2 ? 'degraded' : 'healthy',
      healthyRegions: healthy,
      totalRegions: all.length,
    };
  }

  /** Get the best region for routing */
  async getBestRegion(): Promise<string> {
    const all = await this.getAll();
    const healthy = all.filter(r => r.status === 'healthy').sort((a, b) => a.latencyMs - b.latencyMs);
    return healthy[0]?.region || 'us-east';
  }
}

// ── Tenant Rate Limiter ────────────────────────────────────────────────────

export class TenantRateLimiter {
  constructor(private kv: KVNamespace) {}

  /** Check if request is within org's rate limits */
  async check(ctx: TenantContext): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `rl:org:${ctx.orgId}`;
    const now = Math.floor(Date.now() / 1000);
    const windowSeconds = 60;

    const raw = await this.kv.get(key);
    let data = raw ? JSON.parse(raw) : { count: 0, windowStart: now };

    if (now - data.windowStart >= windowSeconds) {
      data = { count: 0, windowStart: now };
    }

    data.count++;
    const remaining = Math.max(0, ctx.rateLimits.rpm - data.count);
    const allowed = data.count <= ctx.rateLimits.rpm;
    const resetAt = data.windowStart + windowSeconds;

    await this.kv.put(key, JSON.stringify(data), { expirationTtl: windowSeconds });

    return { allowed, remaining, resetAt };
  }

  /** Add rate limit headers to response */
  static addHeaders(response: Response, rateResult: { remaining: number; resetAt: number }, limit: number): Response {
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(limit));
    headers.set('X-RateLimit-Remaining', String(rateResult.remaining));
    headers.set('X-RateLimit-Reset', String(rateResult.resetAt));
    return new Response(response.body, { status: response.status, headers });
  }
}

// ── Scalability Routes ─────────────────────────────────────────────────────

export async function handleScalability(
  request: Request,
  env: { DB: D1Database; SESSIONS: KVNamespace; API_KEYS: KVNamespace; CACHE: KVNamespace; CORS_ORIGIN: string; ENVIRONMENT: string },
  userId: string,
  path: string,
): Promise<Response> {
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  const sub = path.replace('/api/scale/', '');

  // ── Schema init ──
  if (sub === 'schema/init' && request.method === 'POST') {
    for (const sql of TASK_QUEUE_SCHEMA) {
      await env.DB.prepare(sql).run();
    }
    return json({ success: true, tables: TASK_QUEUE_SCHEMA.length });
  }

  // ── Tenant context ──
  if (sub === 'tenant') {
    const ctx = await buildTenantContext(env.DB, userId);
    return json({ success: true, data: ctx });
  }

  // ── Queue operations ──
  if (sub.startsWith('queue')) {
    const queue = new TaskQueue(env.DB, env.CACHE);

    if (sub === 'queue/enqueue' && request.method === 'POST') {
      const body = await request.json() as any;
      const ctx = await buildTenantContext(env.DB, userId);
      const id = await queue.enqueue({
        orgId: ctx.orgId, userId, type: body.type, priority: body.priority || 'normal',
        payload: body.payload || {}, maxRetries: body.maxRetries || 3, scheduledAt: body.scheduledAt,
      });
      return json({ success: true, data: { taskId: id } });
    }

    if (sub === 'queue/dequeue' && request.method === 'POST') {
      const task = await queue.dequeue();
      return json({ success: true, data: task });
    }

    if (sub === 'queue/stats') {
      const ctx = await buildTenantContext(env.DB, userId);
      const stats = await queue.getStats(ctx.orgId);
      return json({ success: true, data: stats });
    }

    if (sub === 'queue/tasks') {
      const ctx = await buildTenantContext(env.DB, userId);
      const tasks = await queue.getUserTasks(ctx.orgId, userId);
      return json({ success: true, data: tasks });
    }

    if (sub.startsWith('queue/complete/') && request.method === 'POST') {
      const taskId = sub.replace('queue/complete/', '');
      const body = await request.json() as any;
      await queue.complete(taskId, body.result);
      return json({ success: true });
    }

    if (sub.startsWith('queue/fail/') && request.method === 'POST') {
      const taskId = sub.replace('queue/fail/', '');
      const body = await request.json() as any;
      const outcome = await queue.fail(taskId, body.error);
      return json({ success: true, data: { outcome } });
    }
  }

  // ── Cache operations ──
  if (sub.startsWith('cache')) {
    const cache = new DistributedCache(env.CACHE);

    if (sub === 'cache/invalidate' && request.method === 'POST') {
      const body = await request.json() as { key?: string; tag?: string; orgId?: string };
      let count = 0;
      if (body.key) { await cache.invalidate(body.key); count = 1; }
      if (body.tag) { count = await cache.invalidateByTag(body.tag); }
      if (body.orgId) { count = await cache.invalidateOrg(body.orgId); }
      return json({ success: true, data: { invalidated: count } });
    }
  }

  // ── WebSocket upgrade ──
  if (sub === 'ws' && request.headers.get('Upgrade') === 'websocket') {
    const room = new WebSocketRoom();
    const ctx = await buildTenantContext(env.DB, userId);
    return room.handleUpgrade(request, userId, ctx.orgId);
  }

  // ── Region health ──
  if (sub === 'regions') {
    const monitor = new MultiRegionHealth(env.CACHE);
    const regions = await monitor.getAll();
    const overall = await monitor.getOverallStatus();
    return json({ success: true, data: { regions, overall } });
  }

  if (sub === 'regions/record' && request.method === 'POST') {
    const body = await request.json() as { region: string; latencyMs: number; errorRate: number; rpm: number };
    const monitor = new MultiRegionHealth(env.CACHE);
    await monitor.recordCheck(body.region, body.latencyMs, body.errorRate, body.rpm);
    return json({ success: true });
  }

  // ── Auto-scale policies ──
  if (sub === 'autoscale/policies') {
    return json({ success: true, data: AUTO_SCALE_POLICIES });
  }

  // ── CDN config ──
  if (sub === 'cdn/config') {
    return json({ success: true, data: CDN_CONFIG });
  }

  // ── Platform dashboard ──
  if (sub === 'dashboard') {
    const queue = new TaskQueue(env.DB, env.CACHE);
    const monitor = new MultiRegionHealth(env.CACHE);
    const wsRoom = new WebSocketRoom();

    const [queueStats, regions, overall] = await Promise.all([
      queue.getStats(),
      monitor.getAll(),
      monitor.getOverallStatus(),
    ]);

    return json({
      success: true,
      data: {
        platform: overall,
        regions,
        queue: queueStats,
        websockets: wsRoom.getStats(),
        autoscale: AUTO_SCALE_POLICIES,
        cdn: { rules: Object.keys(CDN_CONFIG.cacheRules).length },
      },
    });
  }

  return json({ error: 'Not Found' }, 404);
}
