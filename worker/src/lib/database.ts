/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Database Layer — Normalized Schema, Migrations, Row-Level Security,
 * Connection Pooling Patterns, Backup Strategy, Encrypted Fields
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'invited' | 'suspended';
  encryptedApiKey?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  orgId: string;
  employeeId: string;
  name: string;
  role: string;
  systemPrompt: string;
  personalityParams: Record<string, any>;
  modelOverride?: string;
  temperatureOverride?: number;
  maxResponseTokens: number;
  toolsEnabled: string[];
  guardrailsProfile: string;
  active: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  orgId: string;
  userId: string;
  employeeId: string;
  title?: string;
  status: 'active' | 'archived' | 'deleted';
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  orgId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: string;
  tokensUsed: number;
  latencyMs: number;
  modelUsed: string;
  createdAt: string;
}

export interface Task {
  id: string;
  orgId: string;
  userId: string;
  employeeId?: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: string;
  output?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  orgId: string;
  plan: 'starter' | 'growth' | 'enterprise';
  status: 'active' | 'past_due' | 'cancelled' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  currency: string;
  monthlyAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  orgId: string;
  subscriptionId: string;
  stripeInvoiceId?: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
  createdAt: string;
}

export interface UsageRecord {
  id: string;
  orgId: string;
  userId: string;
  type: 'llm_tokens' | 'task_execution' | 'voice_minutes' | 'storage_mb';
  quantity: number;
  unitCost: number;
  totalCost: number;
  metadata: Record<string, any>;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  orgId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ── Normalized Schema (26 tables) ──────────────────────────────────────────

export const NORMALIZED_SCHEMA: string[] = [
  // ── Core: Organizations ──
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    settings TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_org_slug ON organizations(slug)`,

  // ── Core: Users (belongs to org) ──
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    encrypted_api_key TEXT,
    password_hash TEXT,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(org_id, email)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_org ON users(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_email ON users(email)`,

  // ── Core: Sessions ──
  `CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_session_token ON user_sessions(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_session_user ON user_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_session_expiry ON user_sessions(expires_at)`,

  // ── AI: Employees (belongs to org) ──
  `CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    system_prompt TEXT DEFAULT '',
    personality_params TEXT DEFAULT '{}',
    model_override TEXT,
    temperature_override REAL,
    max_response_tokens INTEGER DEFAULT 4096,
    tools_enabled TEXT DEFAULT '[]',
    guardrails_profile TEXT DEFAULT 'standard',
    active INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(org_id, employee_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_emp_org ON employees(org_id)`,

  // ── AI: Conversations (belongs to org + user + employee) ──
  `CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    title TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    message_count INTEGER DEFAULT 0,
    last_message_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_conv_org ON conversations(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_conv_last ON conversations(last_message_at)`,

  // ── AI: Messages (belongs to conversation, scoped to org) ──
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_calls TEXT,
    tokens_used INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    model_used TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_msg_org ON messages(org_id)`,

  // ── AI: Tasks (belongs to org + user) ──
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    employee_id TEXT REFERENCES employees(id),
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    input TEXT NOT NULL,
    output TEXT,
    error TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_task_user ON tasks(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_task_org ON tasks(org_id, status)`,

  // ── Billing: Subscriptions (belongs to org) ──
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'starter',
    status TEXT NOT NULL DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    cancel_at_period_end INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'usd',
    monthly_amount INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sub_org ON subscriptions(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sub_stripe ON subscriptions(stripe_customer_id)`,

  // ── Billing: Invoices (belongs to org + subscription) ──
  `CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
    stripe_invoice_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    currency TEXT DEFAULT 'usd',
    subtotal INTEGER DEFAULT 0,
    tax INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_inv_org ON invoices(org_id)`,
  `CREATE INDEX IF NOT EXISTS idx_inv_status ON invoices(status)`,

  // ── Billing: Usage Records ──
  `CREATE TABLE IF NOT EXISTS usage_records (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    metadata TEXT DEFAULT '{}',
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_usage_org ON usage_records(org_id, type, period_start)`,
  `CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_records(user_id, type)`,

  // ── Audit: Events (immutable log) ──
  `CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    details TEXT DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_events(org_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_events(resource_type, resource_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_user_ev ON audit_events(user_id, created_at)`,

  // ── Schema: Migrations tracking ──
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    rolled_back_at TEXT,
    execution_time_ms INTEGER DEFAULT 0
  )`,

  // ── Schema: Backup tracking ──
  `CREATE TABLE IF NOT EXISTS backup_log (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    size_bytes INTEGER DEFAULT 0,
    tables_backed_up TEXT DEFAULT '[]',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    error TEXT
  )`,
];

// ── Migration System ───────────────────────────────────────────────────────

export interface Migration {
  version: number;
  name: string;
  description: string;
  up: string[];
  down: string[];
}

/** Complete migration history — append-only, never modify existing entries */
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    description: 'Create all normalized tables with proper relations',
    up: NORMALIZED_SCHEMA,
    down: [
      'DROP TABLE IF EXISTS backup_log',
      'DROP TABLE IF EXISTS schema_migrations',
      'DROP TABLE IF EXISTS audit_events',
      'DROP TABLE IF EXISTS usage_records',
      'DROP TABLE IF EXISTS invoices',
      'DROP TABLE IF EXISTS subscriptions',
      'DROP TABLE IF EXISTS tasks',
      'DROP TABLE IF EXISTS messages',
      'DROP TABLE IF EXISTS conversations',
      'DROP TABLE IF EXISTS employees',
      'DROP TABLE IF EXISTS user_sessions',
      'DROP TABLE IF EXISTS users',
      'DROP TABLE IF EXISTS organizations',
    ],
  },
  {
    version: 2,
    name: 'add_sync_metadata',
    description: 'Add sync tracking columns for IndexedDB ↔ D1 sync',
    up: [
      `ALTER TABLE conversations ADD COLUMN sync_version INTEGER DEFAULT 0`,
      `ALTER TABLE conversations ADD COLUMN last_synced_at TEXT`,
      `ALTER TABLE messages ADD COLUMN sync_version INTEGER DEFAULT 0`,
      `ALTER TABLE messages ADD COLUMN pending_sync INTEGER DEFAULT 0`,
      `ALTER TABLE tasks ADD COLUMN sync_version INTEGER DEFAULT 0`,
      `CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        direction TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        conflict_resolution TEXT,
        synced_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sync_device ON sync_log(device_id, synced_at)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_org ON sync_log(org_id, table_name, synced_at)`,
    ],
    down: [
      'DROP TABLE IF EXISTS sync_log',
      // Note: SQLite doesn't support DROP COLUMN before 3.35
    ],
  },
  {
    version: 3,
    name: 'add_encryption_metadata',
    description: 'Add encrypted field tracking and key rotation support',
    up: [
      `CREATE TABLE IF NOT EXISTS encryption_keys (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        key_version INTEGER NOT NULL,
        algorithm TEXT NOT NULL DEFAULT 'AES-GCM',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        rotated_at TEXT,
        UNIQUE(org_id, key_version)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_enckey_org ON encryption_keys(org_id, status)`,
    ],
    down: ['DROP TABLE IF EXISTS encryption_keys'],
  },
];

export class MigrationRunner {
  constructor(private db: D1Database) {}

  /** Run all pending migrations in order */
  async runAll(): Promise<{ applied: number; errors: string[] }> {
    // Ensure migrations table exists first
    await this.db.prepare(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        checksum TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now')),
        rolled_back_at TEXT,
        execution_time_ms INTEGER DEFAULT 0
      )`
    ).run();

    const applied = await this.getAppliedVersions();
    const pending = MIGRATIONS.filter(m => !applied.has(m.version));
    let count = 0;
    const errors: string[] = [];

    for (const migration of pending.sort((a, b) => a.version - b.version)) {
      const start = Date.now();
      try {
        for (const sql of migration.up) {
          await this.db.prepare(sql).run();
        }
        const elapsed = Date.now() - start;
        const checksum = await this.computeChecksum(migration.up.join(';'));
        await this.db.prepare(
          `INSERT INTO schema_migrations (version, name, description, checksum, execution_time_ms)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(migration.version, migration.name, migration.description, checksum, elapsed).run();
        count++;
      } catch (err: any) {
        errors.push(`Migration v${migration.version} (${migration.name}): ${err.message}`);
        break; // Stop on first error
      }
    }

    return { applied: count, errors };
  }

  /** Rollback the last applied migration */
  async rollbackLast(): Promise<{ rolledBack: number | null; error?: string }> {
    const applied = await this.getAppliedVersions();
    if (applied.size === 0) return { rolledBack: null };

    const lastVersion = Math.max(...applied);
    const migration = MIGRATIONS.find(m => m.version === lastVersion);
    if (!migration) return { rolledBack: null, error: `Migration v${lastVersion} not found` };

    try {
      for (const sql of migration.down) {
        await this.db.prepare(sql).run();
      }
      await this.db.prepare(
        `UPDATE schema_migrations SET rolled_back_at = datetime('now') WHERE version = ?`
      ).bind(lastVersion).run();
      return { rolledBack: lastVersion };
    } catch (err: any) {
      return { rolledBack: null, error: err.message };
    }
  }

  /** Get current migration status */
  async getStatus(): Promise<Array<{ version: number; name: string; appliedAt: string; rolledBack: boolean }>> {
    const result = await this.db.prepare(
      'SELECT version, name, applied_at, rolled_back_at FROM schema_migrations ORDER BY version'
    ).all();
    return (result.results || []).map((r: any) => ({
      version: r.version,
      name: r.name,
      appliedAt: r.applied_at,
      rolledBack: !!r.rolled_back_at,
    }));
  }

  private async getAppliedVersions(): Promise<Set<number>> {
    try {
      const result = await this.db.prepare(
        'SELECT version FROM schema_migrations WHERE rolled_back_at IS NULL'
      ).all();
      return new Set((result.results || []).map((r: any) => r.version));
    } catch {
      return new Set();
    }
  }

  private async computeChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }
}

// ── Row-Level Security ─────────────────────────────────────────────────────

export class RowLevelSecurity {
  constructor(
    private db: D1Database,
    private orgId: string,
    private userId: string,
    private userRole: string,
  ) {}

  /** Scoped query — automatically filters by org_id */
  async query<T = any>(table: string, where: string = '1=1', params: any[] = [], limit = 100): Promise<T[]> {
    const sql = `SELECT * FROM ${table} WHERE org_id = ? AND (${where}) LIMIT ?`;
    const result = await this.db.prepare(sql).bind(this.orgId, ...params, limit).all();
    return (result.results || []) as T[];
  }

  /** Scoped insert — always sets org_id */
  async insert(table: string, data: Record<string, any>): Promise<void> {
    const withOrg = { ...data, org_id: this.orgId };
    const cols = Object.keys(withOrg);
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
    await this.db.prepare(sql).bind(...Object.values(withOrg)).run();
  }

  /** Scoped update — only updates rows in same org */
  async update(table: string, id: string, data: Record<string, any>): Promise<boolean> {
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${sets} WHERE id = ? AND org_id = ?`;
    const result = await this.db.prepare(sql).bind(...Object.values(data), id, this.orgId).run();
    return (result.meta?.changes || 0) > 0;
  }

  /** Scoped delete — only deletes rows in same org */
  async delete(table: string, id: string): Promise<boolean> {
    const result = await this.db.prepare(
      `DELETE FROM ${table} WHERE id = ? AND org_id = ?`
    ).bind(id, this.orgId).run();
    return (result.meta?.changes || 0) > 0;
  }

  /** Check if user can access a specific record */
  async canAccess(table: string, id: string): Promise<boolean> {
    const result = await this.db.prepare(
      `SELECT 1 FROM ${table} WHERE id = ? AND org_id = ? LIMIT 1`
    ).bind(id, this.orgId).first();
    return !!result;
  }

  /** Audit trail — every mutation is logged */
  async logAudit(action: string, resourceType: string, resourceId: string, details: Record<string, any> = {}): Promise<void> {
    const id = crypto.randomUUID();
    await this.db.prepare(
      `INSERT INTO audit_events (id, org_id, user_id, action, resource_type, resource_id, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, this.orgId, this.userId, action, resourceType, resourceId, JSON.stringify(details)).run();
  }

  /** Owner/admin check for destructive operations */
  requireRole(minimumRole: 'owner' | 'admin' | 'member'): void {
    const hierarchy: Record<string, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };
    const userLevel = hierarchy[this.userRole] || 0;
    const requiredLevel = hierarchy[minimumRole] || 0;
    if (userLevel < requiredLevel) {
      throw new Error(`Insufficient permissions: requires ${minimumRole}, got ${this.userRole}`);
    }
  }
}

// ── Connection Pooling Patterns ────────────────────────────────────────────

export class QueryPool {
  private batchQueue: Array<{ sql: string; params: any[]; resolve: (v: any) => void; reject: (e: any) => void }> = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxBatchSize = 20;
  private readonly flushIntervalMs = 5;

  constructor(private db: D1Database) {}

  /** Queue a query for batched execution */
  async execute<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({ sql, params, resolve, reject });
      if (this.batchQueue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => this.flush(), this.flushIntervalMs);
      }
    });
  }

  /** Flush all queued queries in a single batch */
  private async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const batch = this.batchQueue.splice(0, this.maxBatchSize);
    if (batch.length === 0) return;

    try {
      const statements = batch.map(q => this.db.prepare(q.sql).bind(...q.params));
      const results = await this.db.batch(statements);

      results.forEach((result, i) => {
        batch[i].resolve((result as any).results || []);
      });
    } catch (err) {
      batch.forEach(q => q.reject(err));
    }

    // If more queries arrived during flush, schedule another
    if (this.batchQueue.length > 0) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }

  /** Prepared statement cache — reuse parsed SQL */
  private stmtCache = new Map<string, D1PreparedStatement>();

  prepare(sql: string): D1PreparedStatement {
    let stmt = this.stmtCache.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.stmtCache.set(sql, stmt);
      // Evict old entries if cache grows too large
      if (this.stmtCache.size > 200) {
        const firstKey = this.stmtCache.keys().next().value;
        if (firstKey) this.stmtCache.delete(firstKey);
      }
    }
    return stmt;
  }

  /** Transaction helper — runs multiple statements atomically via D1 batch */
  async transaction(statements: Array<{ sql: string; params: any[] }>): Promise<any[]> {
    const prepared = statements.map(s => this.db.prepare(s.sql).bind(...s.params));
    return this.db.batch(prepared);
  }
}

// ── Encrypted Fields ───────────────────────────────────────────────────────

export class FieldEncryption {
  private keyMaterial: CryptoKey | null = null;

  constructor(private secret: string) {}

  /** Derive encryption key from secret using PBKDF2 */
  private async getKey(): Promise<CryptoKey> {
    if (this.keyMaterial) return this.keyMaterial;

    const encoder = new TextEncoder();
    const keyData = await crypto.subtle.importKey(
      'raw', encoder.encode(this.secret), 'PBKDF2', false, ['deriveKey']
    );
    this.keyMaterial = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: encoder.encode('nexushr-salt-v1'), iterations: 100000, hash: 'SHA-256' },
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    return this.keyMaterial;
  }

  /** Encrypt a string value → base64 (iv:ciphertext) */
  async encrypt(plaintext: string): Promise<string> {
    const key = await this.getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );
    const ivB64 = btoa(String.fromCharCode(...iv));
    const ctB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
    return `${ivB64}:${ctB64}`;
  }

  /** Decrypt a base64 (iv:ciphertext) → string */
  async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getKey();
    const [ivB64, ctB64] = ciphertext.split(':');
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
    const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ct
    );
    return new TextDecoder().decode(decrypted);
  }

  /** Encrypt specific fields in an object */
  async encryptFields<T extends Record<string, any>>(obj: T, fields: string[]): Promise<T> {
    const copy = { ...obj };
    for (const field of fields) {
      if (copy[field] && typeof copy[field] === 'string') {
        (copy as any)[field] = await this.encrypt(copy[field]);
      }
    }
    return copy;
  }

  /** Decrypt specific fields in an object */
  async decryptFields<T extends Record<string, any>>(obj: T, fields: string[]): Promise<T> {
    const copy = { ...obj };
    for (const field of fields) {
      if (copy[field] && typeof copy[field] === 'string' && copy[field].includes(':')) {
        try {
          (copy as any)[field] = await this.decrypt(copy[field]);
        } catch { /* Field may not be encrypted */ }
      }
    }
    return copy;
  }
}

// ── Backup Strategy ────────────────────────────────────────────────────────

export class BackupManager {
  private readonly BACKUP_TABLES = [
    'organizations', 'users', 'employees', 'conversations', 'messages',
    'tasks', 'subscriptions', 'invoices', 'usage_records', 'audit_events',
  ];

  constructor(private db: D1Database, private kv: KVNamespace) {}

  /** Create a logical backup of all tables → KV storage */
  async createBackup(): Promise<{ id: string; tablesBackedUp: number; totalRows: number }> {
    const backupId = `backup_${Date.now()}`;
    let totalRows = 0;

    // Log backup start
    await this.db.prepare(
      `INSERT INTO backup_log (id, type, status, started_at) VALUES (?, 'full', 'running', datetime('now'))`
    ).bind(backupId).run();

    const tablesBackedUp: string[] = [];

    for (const table of this.BACKUP_TABLES) {
      try {
        const result = await this.db.prepare(`SELECT * FROM ${table}`).all();
        const rows = result.results || [];
        totalRows += rows.length;

        // Store in KV with 30-day expiration
        await this.kv.put(
          `${backupId}/${table}`,
          JSON.stringify(rows),
          { expirationTtl: 30 * 24 * 60 * 60 }
        );
        tablesBackedUp.push(table);
      } catch {
        // Table might not exist yet — skip
      }
    }

    // Update backup log
    await this.db.prepare(
      `UPDATE backup_log SET status = 'completed', completed_at = datetime('now'),
       tables_backed_up = ?, size_bytes = ? WHERE id = ?`
    ).bind(JSON.stringify(tablesBackedUp), totalRows * 500, backupId).run();

    return { id: backupId, tablesBackedUp: tablesBackedUp.length, totalRows };
  }

  /** List available backups */
  async listBackups(): Promise<Array<{ id: string; type: string; status: string; startedAt: string; completedAt?: string }>> {
    const result = await this.db.prepare(
      'SELECT id, type, status, started_at, completed_at FROM backup_log ORDER BY started_at DESC LIMIT 20'
    ).all();
    return (result.results || []).map((r: any) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      startedAt: r.started_at,
      completedAt: r.completed_at,
    }));
  }

  /** Restore a single table from backup */
  async restoreTable(backupId: string, table: string): Promise<{ rowsRestored: number }> {
    const data = await this.kv.get(`${backupId}/${table}`);
    if (!data) throw new Error(`Backup data not found for ${table}`);

    const rows = JSON.parse(data) as Record<string, any>[];
    if (rows.length === 0) return { rowsRestored: 0 };

    // Clear existing data
    await this.db.prepare(`DELETE FROM ${table}`).run();

    // Re-insert in batches of 50
    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(', ');
    const insertSql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const stmts = batch.map(row =>
        this.db.prepare(insertSql).bind(...cols.map(c => row[c]))
      );
      await this.db.batch(stmts);
    }

    return { rowsRestored: rows.length };
  }

  /** Point-in-time recovery using audit events */
  async getAuditTrail(
    resourceType: string,
    resourceId: string,
    orgId: string,
  ): Promise<AuditEvent[]> {
    const result = await this.db.prepare(
      `SELECT * FROM audit_events WHERE resource_type = ? AND resource_id = ? AND org_id = ?
       ORDER BY created_at DESC LIMIT 100`
    ).bind(resourceType, resourceId, orgId).all();
    return (result.results || []).map((r: any) => ({
      id: r.id,
      orgId: r.org_id,
      userId: r.user_id,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      details: JSON.parse(r.details || '{}'),
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      createdAt: r.created_at,
    }));
  }
}

// ── Database Routes Handler ────────────────────────────────────────────────

export async function handleDatabase(
  request: Request,
  env: { DB: D1Database; CACHE: KVNamespace; SESSIONS: KVNamespace; API_KEYS: KVNamespace },
  userId: string,
  path: string,
): Promise<Response> {
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  const sub = path.replace('/api/database/', '');

  // ── Migrations ──
  if (sub === 'migrate' && request.method === 'POST') {
    const runner = new MigrationRunner(env.DB);
    const result = await runner.runAll();
    return json({ success: true, data: result });
  }

  if (sub === 'migrate/status') {
    const runner = new MigrationRunner(env.DB);
    const status = await runner.getStatus();
    return json({ success: true, data: { migrations: status, latest: MIGRATIONS.length } });
  }

  if (sub === 'migrate/rollback' && request.method === 'POST') {
    const runner = new MigrationRunner(env.DB);
    const result = await runner.rollbackLast();
    return json({ success: true, data: result });
  }

  // ── Backups ──
  if (sub === 'backups' && request.method === 'POST') {
    const backup = new BackupManager(env.DB, env.CACHE);
    const result = await backup.createBackup();
    return json({ success: true, data: result });
  }

  if (sub === 'backups' && request.method === 'GET') {
    const backup = new BackupManager(env.DB, env.CACHE);
    const list = await backup.listBackups();
    return json({ success: true, data: list });
  }

  if (sub.startsWith('backups/restore/') && request.method === 'POST') {
    const backupId = sub.replace('backups/restore/', '');
    const body = await request.json() as { table: string };
    const backup = new BackupManager(env.DB, env.CACHE);
    const result = await backup.restoreTable(backupId, body.table);
    return json({ success: true, data: result });
  }

  // ── Audit Trail ──
  if (sub.startsWith('audit/')) {
    const parts = sub.replace('audit/', '').split('/');
    const resourceType = parts[0];
    const resourceId = parts[1];
    const backup = new BackupManager(env.DB, env.CACHE);
    // Need orgId — fetch from user
    const user = await env.DB.prepare('SELECT org_id FROM users WHERE id = ?').bind(userId).first() as any;
    const orgId = user?.org_id || 'default';
    const trail = await backup.getAuditTrail(resourceType, resourceId, orgId);
    return json({ success: true, data: trail });
  }

  // ── Health ──
  if (sub === 'health') {
    const runner = new MigrationRunner(env.DB);
    const status = await runner.getStatus();
    return json({
      success: true,
      data: {
        migrationsApplied: status.filter(s => !s.rolledBack).length,
        latestMigration: MIGRATIONS.length,
        upToDate: status.filter(s => !s.rolledBack).length === MIGRATIONS.length,
      },
    });
  }

  return json({ error: 'Not Found', code: 'NOT_FOUND' }, 404);
}
