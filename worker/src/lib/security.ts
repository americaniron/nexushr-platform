/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Security Engine — JWT Auth, Password Hashing, CSRF, Security Headers,
 * Secrets Management, API Key Rotation, E2E Encryption
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Env } from '../index';

// ── Types ──────────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string;          // user ID
  org: string;          // org ID
  role: string;         // user role
  email: string;
  type: 'access' | 'refresh';
  iat: number;          // issued at (seconds)
  exp: number;          // expires at (seconds)
  jti: string;          // unique token ID
  csrf?: string;        // CSRF token bound to this session
}

export interface AuthSession {
  userId: string;
  orgId: string;
  role: string;
  email: string;
  accessTokenJti: string;
  refreshTokenJti: string;
  csrfToken: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface APIKey {
  id: string;
  orgId: string;
  name: string;
  keyHash: string;
  prefix: string;         // first 8 chars for identification
  scopes: string[];       // e.g. ['llm:read', 'employees:write']
  rateLimit: number;      // requests per minute
  lastUsedAt?: string;
  expiresAt?: string;
  rotatedFromId?: string; // previous key this was rotated from
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'logout' | 'login_failed' | 'token_refresh' | 'password_change'
    | 'api_key_created' | 'api_key_rotated' | 'api_key_revoked' | 'csrf_violation'
    | 'rate_limit_hit' | 'suspicious_activity';
  userId?: string;
  orgId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACCESS_TOKEN_TTL = 15 * 60;           // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const CSRF_TOKEN_LENGTH = 32;
const API_KEY_LENGTH = 48;
const SCRYPT_SALT_LENGTH = 16;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

// ── Schema ─────────────────────────────────────────────────────────────────

export const SECURITY_SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    access_token_jti TEXT NOT NULL UNIQUE,
    refresh_token_jti TEXT NOT NULL UNIQUE,
    csrf_token TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    revoked_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auth_session_user ON auth_sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_session_access ON auth_sessions(access_token_jti)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_session_refresh ON auth_sessions(refresh_token_jti)`,

  `CREATE TABLE IF NOT EXISTS platform_api_keys (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    prefix TEXT NOT NULL,
    scopes TEXT DEFAULT '[]',
    rate_limit INTEGER DEFAULT 60,
    last_used_at TEXT,
    expires_at TEXT,
    rotated_from_id TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_apikey_org ON platform_api_keys(org_id, active)`,
  `CREATE INDEX IF NOT EXISTS idx_apikey_prefix ON platform_api_keys(prefix)`,

  `CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    success INTEGER NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_login_email ON login_attempts(email, timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_login_ip ON login_attempts(ip_address, timestamp)`,

  `CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    user_id TEXT,
    org_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT DEFAULT '{}',
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_secev_type ON security_events(type, timestamp)`,
  `CREATE INDEX IF NOT EXISTS idx_secev_user ON security_events(user_id, timestamp)`,

  `CREATE TABLE IF NOT EXISTS encrypted_fields_registry (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    field_name TEXT NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    algorithm TEXT NOT NULL DEFAULT 'AES-GCM-256',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(table_name, field_name)
  )`,
];

// ── Crypto Helpers ─────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID();
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function base64url(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// ── Password Hashing (PBKDF2 — Workers-compatible alternative to bcrypt) ──

export class PasswordHasher {
  private readonly iterations = 600000; // OWASP recommendation for PBKDF2-SHA256

  /** Hash a password with a random salt */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SCRYPT_SALT_LENGTH);
    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: this.iterations, hash: 'SHA-256' },
      keyMaterial, 256
    );

    // Format: $pbkdf2-sha256$iterations$salt$hash
    return `$pbkdf2-sha256$${this.iterations}$${toHex(salt)}$${toHex(new Uint8Array(derivedBits))}`;
  }

  /** Verify a password against a stored hash */
  async verify(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split('$');
    if (parts.length !== 5 || parts[1] !== 'pbkdf2-sha256') return false;

    const iterations = parseInt(parts[2], 10);
    const salt = fromHex(parts[3]);
    const expectedHash = parts[4];

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial, 256
    );

    const actualHash = toHex(new Uint8Array(derivedBits));
    return timingSafeEqual(actualHash, expectedHash);
  }
}

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── JWT Service ────────────────────────────────────────────────────────────

export class JWTService {
  private signingKey: CryptoKey | null = null;

  constructor(private secret: string) {}

  private async getKey(): Promise<CryptoKey> {
    if (this.signingKey) return this.signingKey;
    const encoder = new TextEncoder();
    this.signingKey = await crypto.subtle.importKey(
      'raw', encoder.encode(this.secret), { name: 'HMAC', hash: 'SHA-256' },
      false, ['sign', 'verify']
    );
    return this.signingKey;
  }

  /** Sign a JWT */
  async sign(payload: JWTPayload): Promise<string> {
    const key = await this.getKey();
    const encoder = new TextEncoder();

    const header = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    const body = base64url(encoder.encode(JSON.stringify(payload)));
    const sigInput = `${header}.${body}`;

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(sigInput));
    return `${sigInput}.${base64url(signature)}`;
  }

  /** Verify and decode a JWT */
  async verify(token: string): Promise<JWTPayload | null> {
    try {
      const [header, body, sig] = token.split('.');
      if (!header || !body || !sig) return null;

      const key = await this.getKey();
      const encoder = new TextEncoder();
      const sigInput = `${header}.${body}`;

      const valid = await crypto.subtle.verify(
        'HMAC', key, fromBase64url(sig), encoder.encode(sigInput)
      );
      if (!valid) return null;

      const payload = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as JWTPayload;

      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;

      return payload;
    } catch {
      return null;
    }
  }

  /** Create an access + refresh token pair */
  async createTokenPair(user: { id: string; orgId: string; role: string; email: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
    accessJti: string;
    refreshJti: string;
    expiresIn: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const csrfToken = toHex(randomBytes(CSRF_TOKEN_LENGTH));
    const accessJti = uid();
    const refreshJti = uid();

    const accessPayload: JWTPayload = {
      sub: user.id, org: user.orgId, role: user.role, email: user.email,
      type: 'access', iat: now, exp: now + ACCESS_TOKEN_TTL,
      jti: accessJti, csrf: csrfToken,
    };

    const refreshPayload: JWTPayload = {
      sub: user.id, org: user.orgId, role: user.role, email: user.email,
      type: 'refresh', iat: now, exp: now + REFRESH_TOKEN_TTL,
      jti: refreshJti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.sign(accessPayload),
      this.sign(refreshPayload),
    ]);

    return { accessToken, refreshToken, csrfToken, accessJti, refreshJti, expiresIn: ACCESS_TOKEN_TTL };
  }
}

// ── CSRF Protection ────────────────────────────────────────────────────────

export class CSRFProtection {
  /** Validate CSRF token from request header against session */
  static validate(request: Request, sessionCsrf: string): boolean {
    const headerToken = request.headers.get('X-CSRF-Token') || request.headers.get('x-csrf-token');
    if (!headerToken || !sessionCsrf) return false;
    return timingSafeEqual(headerToken, sessionCsrf);
  }

  /** Check if request method requires CSRF validation */
  static requiresValidation(method: string): boolean {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  }
}

// ── Security Headers ───────────────────────────────────────────────────────

export function securityHeaders(env: Env): Record<string, string> {
  const isDev = env.ENVIRONMENT === 'development';

  return {
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://api.anthropic.com https://api.openai.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),

    // Prevent clickjacking
    'X-Frame-Options': 'DENY',

    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS Protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',

    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // HSTS (1 year, include subdomains)
    'Strict-Transport-Security': isDev ? '' : 'max-age=31536000; includeSubDomains; preload',

    // Permissions Policy
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(), payment=()',

    // Cross-Origin policies
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
}

// ── Rate Limiter (Server-side, KV-backed) ──────────────────────────────────

export class RateLimiter {
  constructor(private kv: KVNamespace) {}

  /** Check and increment rate limit. Returns remaining requests or -1 if exceeded. */
  async check(key: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const kvKey = `rl:${key}`;
    const now = Math.floor(Date.now() / 1000);

    const stored = await this.kv.get(kvKey);
    let data: { count: number; windowStart: number } = stored
      ? JSON.parse(stored)
      : { count: 0, windowStart: now };

    // Reset window if expired
    if (now - data.windowStart >= windowSeconds) {
      data = { count: 0, windowStart: now };
    }

    data.count++;
    const remaining = Math.max(0, maxRequests - data.count);
    const allowed = data.count <= maxRequests;
    const resetAt = data.windowStart + windowSeconds;

    await this.kv.put(kvKey, JSON.stringify(data), { expirationTtl: windowSeconds });

    return { allowed, remaining, resetAt };
  }

  /** Check login attempts for brute-force protection */
  async checkLoginAttempts(email: string, ip: string): Promise<{ allowed: boolean; attemptsLeft: number }> {
    const emailResult = await this.check(`login:email:${email}`, MAX_LOGIN_ATTEMPTS, LOGIN_LOCKOUT_MINUTES * 60);
    const ipResult = await this.check(`login:ip:${ip}`, MAX_LOGIN_ATTEMPTS * 3, LOGIN_LOCKOUT_MINUTES * 60);

    const allowed = emailResult.allowed && ipResult.allowed;
    const attemptsLeft = Math.min(emailResult.remaining, ipResult.remaining);
    return { allowed, attemptsLeft };
  }
}

// ── API Key Manager ────────────────────────────────────────────────────────

export class APIKeyManager {
  constructor(private db: D1Database) {}

  /** Generate a new API key */
  async create(orgId: string, name: string, scopes: string[], createdBy: string, expiresInDays?: number): Promise<{ key: string; id: string; prefix: string }> {
    const rawKey = toHex(randomBytes(API_KEY_LENGTH));
    const prefix = rawKey.slice(0, 8);
    const fullKey = `nxhr_${rawKey}`;

    const keyHash = await this.hashKey(fullKey);
    const id = uid();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await this.db.prepare(
      `INSERT INTO platform_api_keys (id, org_id, name, key_hash, prefix, scopes, created_by, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, orgId, name, keyHash, prefix, JSON.stringify(scopes), createdBy, expiresAt).run();

    return { key: fullKey, id, prefix };
  }

  /** Validate an API key and return its metadata */
  async validate(key: string): Promise<APIKey | null> {
    if (!key.startsWith('nxhr_')) return null;
    const prefix = key.slice(5, 13);

    const result = await this.db.prepare(
      'SELECT * FROM platform_api_keys WHERE prefix = ? AND active = 1'
    ).bind(prefix).all();

    for (const row of (result.results || []) as any[]) {
      const matches = await this.verifyKey(key, row.key_hash);
      if (matches) {
        // Check expiration
        if (row.expires_at && new Date(row.expires_at) < new Date()) {
          return null;
        }
        // Update last used
        await this.db.prepare(
          "UPDATE platform_api_keys SET last_used_at = datetime('now') WHERE id = ?"
        ).bind(row.id).run();

        return {
          id: row.id, orgId: row.org_id, name: row.name,
          keyHash: row.key_hash, prefix: row.prefix,
          scopes: JSON.parse(row.scopes || '[]'),
          rateLimit: row.rate_limit, lastUsedAt: row.last_used_at,
          expiresAt: row.expires_at, rotatedFromId: row.rotated_from_id,
          active: !!row.active, createdAt: row.created_at, createdBy: row.created_by,
        };
      }
    }
    return null;
  }

  /** Rotate an API key — creates new, deactivates old */
  async rotate(oldKeyId: string, orgId: string, rotatedBy: string): Promise<{ key: string; id: string; prefix: string } | null> {
    const old = await this.db.prepare(
      'SELECT * FROM platform_api_keys WHERE id = ? AND org_id = ? AND active = 1'
    ).bind(oldKeyId, orgId).first() as any;

    if (!old) return null;

    // Create new key with same scopes
    const result = await this.create(orgId, `${old.name} (rotated)`, JSON.parse(old.scopes || '[]'), rotatedBy);

    // Link new key to old and deactivate old
    await this.db.batch([
      this.db.prepare('UPDATE platform_api_keys SET rotated_from_id = ? WHERE id = ?').bind(oldKeyId, result.id),
      this.db.prepare('UPDATE platform_api_keys SET active = 0 WHERE id = ?').bind(oldKeyId),
    ]);

    return result;
  }

  /** Revoke an API key */
  async revoke(keyId: string, orgId: string): Promise<boolean> {
    const result = await this.db.prepare(
      'UPDATE platform_api_keys SET active = 0 WHERE id = ? AND org_id = ?'
    ).bind(keyId, orgId).run();
    return (result.meta?.changes || 0) > 0;
  }

  /** List API keys for an org (without the actual key hash) */
  async list(orgId: string): Promise<Omit<APIKey, 'keyHash'>[]> {
    const result = await this.db.prepare(
      'SELECT * FROM platform_api_keys WHERE org_id = ? ORDER BY created_at DESC'
    ).bind(orgId).all();
    return ((result.results || []) as any[]).map(r => ({
      id: r.id, orgId: r.org_id, name: r.name, prefix: r.prefix,
      scopes: JSON.parse(r.scopes || '[]'), rateLimit: r.rate_limit,
      lastUsedAt: r.last_used_at, expiresAt: r.expires_at,
      rotatedFromId: r.rotated_from_id, active: !!r.active,
      createdAt: r.created_at, createdBy: r.created_by,
    }));
  }

  private async hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(key));
    return toHex(new Uint8Array(hash));
  }

  private async verifyKey(key: string, storedHash: string): Promise<boolean> {
    const hash = await this.hashKey(key);
    return timingSafeEqual(hash, storedHash);
  }
}

// ── E2E Encryption Service ─────────────────────────────────────────────────

export class E2EEncryption {
  /** Generate a per-org encryption key pair */
  static async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true, ['encrypt', 'decrypt']
    ) as CryptoKeyPair;

    const pub = await crypto.subtle.exportKey('spki', keyPair.publicKey) as ArrayBuffer;
    const priv = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey) as ArrayBuffer;

    return { publicKey: base64url(pub), privateKey: base64url(priv) };
  }

  /** Encrypt data with a public key (hybrid encryption: RSA + AES) */
  static async encrypt(data: string, publicKeyB64: string): Promise<string> {
    // Generate a random AES key for this message
    const aesKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']) as CryptoKey;
    const iv = randomBytes(12);

    // Encrypt data with AES
    const encoder = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoder.encode(data));

    // Encrypt AES key with RSA public key
    const publicKey = await crypto.subtle.importKey(
      'spki', fromBase64url(publicKeyB64),
      { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
    );
    const rawAesKey = await crypto.subtle.exportKey('raw', aesKey) as ArrayBuffer;
    const encryptedAesKey = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey);

    // Format: base64(encryptedAesKey):base64(iv):base64(encryptedData)
    return `${base64url(encryptedAesKey)}:${base64url(iv)}:${base64url(encrypted)}`;
  }

  /** Decrypt data with a private key */
  static async decrypt(ciphertext: string, privateKeyB64: string): Promise<string> {
    const [encKeyB64, ivB64, dataB64] = ciphertext.split(':');

    // Decrypt AES key with RSA private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8', fromBase64url(privateKeyB64),
      { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['decrypt']
    );
    const rawAesKey = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, fromBase64url(encKeyB64));

    // Import AES key
    const aesKey = await crypto.subtle.importKey('raw', rawAesKey, 'AES-GCM', false, ['decrypt']);

    // Decrypt data
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64url(ivB64) }, aesKey, fromBase64url(dataB64)
    );

    return new TextDecoder().decode(decrypted);
  }
}

// ── Security Event Logger ──────────────────────────────────────────────────

export class SecurityEventLogger {
  constructor(private db: D1Database) {}

  async log(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const id = uid();
    await this.db.prepare(
      `INSERT INTO security_events (id, type, user_id, org_id, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, event.type, event.userId || null, event.orgId || null,
      event.ipAddress || null, event.userAgent || null,
      JSON.stringify(event.details || {})).run();
  }

  async getRecent(orgId: string, limit = 50): Promise<SecurityEvent[]> {
    const result = await this.db.prepare(
      'SELECT * FROM security_events WHERE org_id = ? ORDER BY timestamp DESC LIMIT ?'
    ).bind(orgId, limit).all();
    return ((result.results || []) as any[]).map(r => ({
      id: r.id, type: r.type, userId: r.user_id, orgId: r.org_id,
      ipAddress: r.ip_address, userAgent: r.user_agent,
      details: JSON.parse(r.details || '{}'), timestamp: r.timestamp,
    }));
  }

  async getByType(type: string, limit = 100): Promise<SecurityEvent[]> {
    const result = await this.db.prepare(
      'SELECT * FROM security_events WHERE type = ? ORDER BY timestamp DESC LIMIT ?'
    ).bind(type, limit).all();
    return ((result.results || []) as any[]).map(r => ({
      id: r.id, type: r.type, userId: r.user_id, orgId: r.org_id,
      ipAddress: r.ip_address, userAgent: r.user_agent,
      details: JSON.parse(r.details || '{}'), timestamp: r.timestamp,
    }));
  }
}

// ── Auth Session Manager ───────────────────────────────────────────────────

export class AuthSessionManager {
  private jwt: JWTService;
  private hasher: PasswordHasher;
  private rateLimiter: RateLimiter;
  private eventLogger: SecurityEventLogger;

  constructor(private db: D1Database, private kv: KVNamespace, jwtSecret: string) {
    this.jwt = new JWTService(jwtSecret);
    this.hasher = new PasswordHasher();
    this.rateLimiter = new RateLimiter(kv);
    this.eventLogger = new SecurityEventLogger(db);
  }

  /** Register a new user with server-side hashed password */
  async register(email: string, password: string, name: string, orgId: string = 'default-org'): Promise<{ success: boolean; userId?: string; error?: string }> {
    // Check if email already exists
    const existing = await this.db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return { success: false, error: 'Email already registered' };

    const passwordHash = await this.hasher.hash(password);
    const userId = uid();

    await this.db.prepare(
      `INSERT INTO users (id, email, name, password_hash, role, org_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'member', ?, 'active', datetime('now'), datetime('now'))`
    ).bind(userId, email, name, passwordHash, orgId).run();

    await this.eventLogger.log({
      type: 'login', userId, orgId,
      details: { action: 'registration', email },
    });

    return { success: true, userId };
  }

  /** Authenticate and create a session with JWT tokens */
  async login(email: string, password: string, ip?: string, userAgent?: string): Promise<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    csrfToken?: string;
    expiresIn?: number;
    user?: { id: string; email: string; name: string; role: string; orgId: string };
    error?: string;
  }> {
    // Rate limit check
    const rateCheck = await this.rateLimiter.checkLoginAttempts(email, ip || 'unknown');
    if (!rateCheck.allowed) {
      await this.eventLogger.log({
        type: 'rate_limit_hit', ipAddress: ip, userAgent,
        details: { email, reason: 'login_attempts_exceeded' },
      });
      return { success: false, error: `Too many login attempts. Try again in ${LOGIN_LOCKOUT_MINUTES} minutes.` };
    }

    // Find user
    const user = await this.db.prepare(
      'SELECT id, email, name, password_hash, role, org_id, status FROM users WHERE email = ?'
    ).bind(email).first() as any;

    if (!user || user.status !== 'active') {
      await this.recordLoginAttempt(email, ip, false);
      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const validPassword = await this.hasher.verify(password, user.password_hash);
    if (!validPassword) {
      await this.recordLoginAttempt(email, ip, false);
      await this.eventLogger.log({
        type: 'login_failed', userId: user.id, orgId: user.org_id,
        ipAddress: ip, userAgent,
        details: { email, attemptsLeft: rateCheck.attemptsLeft - 1 },
      });
      return { success: false, error: 'Invalid email or password' };
    }

    // Create tokens
    const tokens = await this.jwt.createTokenPair({
      id: user.id, orgId: user.org_id, role: user.role, email: user.email,
    });

    // Store session in D1
    const sessionId = uid();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000).toISOString();
    await this.db.prepare(
      `INSERT INTO auth_sessions (id, user_id, org_id, role, email, access_token_jti, refresh_token_jti, csrf_token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(sessionId, user.id, user.org_id, user.role, user.email,
      tokens.accessJti, tokens.refreshJti, tokens.csrfToken,
      ip || null, userAgent || null, expiresAt).run();

    // Update last login
    await this.db.prepare(
      "UPDATE users SET last_login_at = datetime('now') WHERE id = ?"
    ).bind(user.id).run();

    await this.recordLoginAttempt(email, ip, true);
    await this.eventLogger.log({
      type: 'login', userId: user.id, orgId: user.org_id,
      ipAddress: ip, userAgent,
      details: { sessionId },
    });

    return {
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      csrfToken: tokens.csrfToken,
      expiresIn: tokens.expiresIn,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, orgId: user.org_id },
    };
  }

  /** Refresh an access token using a valid refresh token */
  async refreshTokens(refreshToken: string): Promise<{
    success: boolean;
    accessToken?: string;
    csrfToken?: string;
    expiresIn?: number;
    error?: string;
  }> {
    const payload = await this.jwt.verify(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return { success: false, error: 'Invalid refresh token' };
    }

    // Check session exists and isn't revoked
    const session = await this.db.prepare(
      'SELECT * FROM auth_sessions WHERE refresh_token_jti = ? AND revoked_at IS NULL'
    ).bind(payload.jti).first() as any;

    if (!session) {
      return { success: false, error: 'Session not found or revoked' };
    }

    // Create new access token (keep same refresh token)
    const tokens = await this.jwt.createTokenPair({
      id: payload.sub, orgId: payload.org, role: payload.role, email: payload.email,
    });

    // Update session with new access token JTI
    await this.db.prepare(
      'UPDATE auth_sessions SET access_token_jti = ?, csrf_token = ? WHERE id = ?'
    ).bind(tokens.accessJti, tokens.csrfToken, session.id).run();

    await this.eventLogger.log({
      type: 'token_refresh', userId: payload.sub, orgId: payload.org,
      details: { sessionId: session.id },
    });

    return {
      success: true,
      accessToken: tokens.accessToken,
      csrfToken: tokens.csrfToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /** Validate an access token and return the session */
  async validateAccessToken(token: string): Promise<{ valid: boolean; payload?: JWTPayload; error?: string }> {
    const payload = await this.jwt.verify(token);
    if (!payload || payload.type !== 'access') {
      return { valid: false, error: 'Invalid access token' };
    }

    // Verify session isn't revoked (check KV cache first for performance)
    const revokedKey = `revoked:${payload.jti}`;
    const isRevoked = await this.kv.get(revokedKey);
    if (isRevoked) return { valid: false, error: 'Token revoked' };

    return { valid: true, payload };
  }

  /** Logout — revoke the session */
  async logout(accessToken: string): Promise<boolean> {
    const payload = await this.jwt.verify(accessToken);
    if (!payload) return false;

    // Revoke session in D1
    await this.db.prepare(
      "UPDATE auth_sessions SET revoked_at = datetime('now') WHERE access_token_jti = ?"
    ).bind(payload.jti).run();

    // Cache revocation in KV for fast lookup
    await this.kv.put(`revoked:${payload.jti}`, '1', { expirationTtl: ACCESS_TOKEN_TTL });

    await this.eventLogger.log({
      type: 'logout', userId: payload.sub, orgId: payload.org,
      details: { jti: payload.jti },
    });

    return true;
  }

  /** Change password with old password verification */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const user = await this.db.prepare(
      'SELECT password_hash, org_id FROM users WHERE id = ?'
    ).bind(userId).first() as any;

    if (!user) return { success: false, error: 'User not found' };

    const valid = await this.hasher.verify(oldPassword, user.password_hash);
    if (!valid) return { success: false, error: 'Invalid current password' };

    const newHash = await this.hasher.hash(newPassword);
    await this.db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(newHash, userId).run();

    // Revoke all sessions for this user (force re-login)
    await this.db.prepare(
      "UPDATE auth_sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL"
    ).bind(userId).run();

    await this.eventLogger.log({
      type: 'password_change', userId, orgId: user.org_id,
      details: { allSessionsRevoked: true },
    });

    return { success: true };
  }

  private async recordLoginAttempt(email: string, ip: string | undefined, success: boolean): Promise<void> {
    await this.db.prepare(
      'INSERT INTO login_attempts (id, email, ip_address, success) VALUES (?, ?, ?, ?)'
    ).bind(uid(), email, ip || null, success ? 1 : 0).run();
  }
}

// ── Dependency Scanning Config ─────────────────────────────────────────────

export const DEPENDENCY_SCAN_CONFIG = {
  npmAuditConfig: {
    script: 'npm audit --production --audit-level=high',
    ci: 'npm audit --production --audit-level=critical --json',
    fix: 'npm audit fix --production',
  },
  githubDependabot: {
    version: 2,
    updates: [
      { packageEcosystem: 'npm', directory: '/', schedule: { interval: 'weekly' }, openPullRequestsLimit: 10 },
      { packageEcosystem: 'npm', directory: '/nexushr-worker', schedule: { interval: 'weekly' }, openPullRequestsLimit: 5 },
    ],
  },
  snykConfig: {
    severity: 'high',
    failOn: 'upgradable',
    monitor: true,
  },
};

// ── Secure Auth Routes ─────────────────────────────────────────────────────

export async function handleSecureAuth(
  request: Request,
  env: Env,
  path: string,
): Promise<Response> {
  const json = (data: any, status = 200, extraHeaders: Record<string, string> = {}) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...securityHeaders(env), ...extraHeaders };
    return new Response(JSON.stringify(data), { status, headers });
  };

  const jwtSecret = env.CORS_ORIGIN || 'nexushr-jwt-secret-change-in-production';
  const authManager = new AuthSessionManager(env.DB, env.SESSIONS, jwtSecret);
  const sub = path.replace('/api/auth/v2/', '');
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || undefined;
  const userAgent = request.headers.get('User-Agent') || undefined;

  // ── Schema init ──
  if (sub === 'schema/init' && request.method === 'POST') {
    for (const sql of SECURITY_SCHEMA) {
      await env.DB.prepare(sql).run();
    }
    return json({ success: true, tables: SECURITY_SCHEMA.length });
  }

  // ── Register ──
  if (sub === 'register' && request.method === 'POST') {
    const body = await request.json() as { email: string; password: string; name: string; orgId?: string };
    if (!body.email || !body.password || !body.name) {
      return json({ success: false, error: 'Missing required fields' }, 400);
    }
    if (body.password.length < 8) {
      return json({ success: false, error: 'Password must be at least 8 characters' }, 400);
    }
    const result = await authManager.register(body.email, body.password, body.name, body.orgId);
    return json(result, result.success ? 201 : 409);
  }

  // ── Login ──
  if (sub === 'login' && request.method === 'POST') {
    const body = await request.json() as { email: string; password: string };
    if (!body.email || !body.password) {
      return json({ success: false, error: 'Missing email or password' }, 400);
    }

    const result = await authManager.login(body.email, body.password, ip, userAgent);
    if (!result.success) return json(result, 401);

    // Set refresh token in httpOnly cookie
    const cookieHeader = [
      `nexushr_refresh=${result.refreshToken}`,
      'HttpOnly', 'Secure', 'SameSite=Strict',
      `Path=/api/auth/v2`, `Max-Age=${REFRESH_TOKEN_TTL}`,
    ].join('; ');

    return json({
      success: true,
      accessToken: result.accessToken,
      csrfToken: result.csrfToken,
      expiresIn: result.expiresIn,
      user: result.user,
    }, 200, { 'Set-Cookie': cookieHeader });
  }

  // ── Refresh ──
  if (sub === 'refresh' && request.method === 'POST') {
    // Get refresh token from httpOnly cookie
    const cookies = request.headers.get('Cookie') || '';
    const refreshMatch = cookies.match(/nexushr_refresh=([^;]+)/);
    const refreshToken = refreshMatch?.[1];

    if (!refreshToken) return json({ success: false, error: 'No refresh token' }, 401);

    const result = await authManager.refreshTokens(refreshToken);
    return json(result, result.success ? 200 : 401);
  }

  // ── Logout ──
  if (sub === 'logout' && request.method === 'POST') {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    await authManager.logout(token);

    // Clear refresh cookie
    const clearCookie = 'nexushr_refresh=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth/v2; Max-Age=0';
    return json({ success: true }, 200, { 'Set-Cookie': clearCookie });
  }

  // ── Change password ──
  if (sub === 'password' && request.method === 'PUT') {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const validation = await authManager.validateAccessToken(token);
    if (!validation.valid || !validation.payload) return json({ success: false, error: 'Unauthorized' }, 401);

    const body = await request.json() as { oldPassword: string; newPassword: string };
    if (!body.oldPassword || !body.newPassword) {
      return json({ success: false, error: 'Missing passwords' }, 400);
    }
    if (body.newPassword.length < 8) {
      return json({ success: false, error: 'New password must be at least 8 characters' }, 400);
    }

    const result = await authManager.changePassword(validation.payload.sub, body.oldPassword, body.newPassword);
    return json(result, result.success ? 200 : 400);
  }

  // ── Validate token ──
  if (sub === 'validate' && request.method === 'GET') {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const result = await authManager.validateAccessToken(token);
    return json({ valid: result.valid, user: result.payload ? { id: result.payload.sub, orgId: result.payload.org, role: result.payload.role, email: result.payload.email } : null });
  }

  // ── API Keys ──
  if (sub.startsWith('api-keys')) {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const validation = await authManager.validateAccessToken(token);
    if (!validation.valid || !validation.payload) return json({ success: false, error: 'Unauthorized' }, 401);

    const keyManager = new APIKeyManager(env.DB);
    const orgId = validation.payload.org;
    const userId = validation.payload.sub;

    if (sub === 'api-keys' && request.method === 'GET') {
      const keys = await keyManager.list(orgId);
      return json({ success: true, data: keys });
    }

    if (sub === 'api-keys' && request.method === 'POST') {
      const body = await request.json() as { name: string; scopes: string[]; expiresInDays?: number };
      const result = await keyManager.create(orgId, body.name, body.scopes || [], userId, body.expiresInDays);
      return json({ success: true, data: result });
    }

    if (sub.startsWith('api-keys/') && sub.endsWith('/rotate') && request.method === 'POST') {
      const keyId = sub.replace('api-keys/', '').replace('/rotate', '');
      const result = await keyManager.rotate(keyId, orgId, userId);
      if (!result) return json({ success: false, error: 'Key not found' }, 404);
      return json({ success: true, data: result });
    }

    if (sub.startsWith('api-keys/') && request.method === 'DELETE') {
      const keyId = sub.replace('api-keys/', '');
      const ok = await keyManager.revoke(keyId, orgId);
      return json({ success: ok });
    }
  }

  // ── Security Events ──
  if (sub === 'security-events' && request.method === 'GET') {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const validation = await authManager.validateAccessToken(token);
    if (!validation.valid || !validation.payload) return json({ success: false, error: 'Unauthorized' }, 401);

    const logger = new SecurityEventLogger(env.DB);
    const events = await logger.getRecent(validation.payload.org);
    return json({ success: true, data: events });
  }

  return json({ error: 'Not Found' }, 404);
}
