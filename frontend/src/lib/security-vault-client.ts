/**
 * NexusHR Feature #32 — Enterprise Security Vault Client
 * Full API client with React hooks, dual-mode (Worker backend + localStorage fallback)
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

export type MFAMethod = 'totp' | 'webauthn' | 'backup_codes' | 'sms' | 'email';
export type MFAStatus = 'disabled' | 'pending_setup' | 'enabled' | 'locked';
export type SessionStatus = 'active' | 'expired' | 'revoked' | 'suspended';
export type KeyType = 'master' | 'data_encryption' | 'key_encryption' | 'signing' | 'hmac' | 'api';
export type KeyStatus = 'active' | 'rotated' | 'revoked' | 'destroyed' | 'pending_rotation';
export type SecretType = 'api_key' | 'oauth_token' | 'webhook_secret' | 'database_credential' | 'encryption_key' | 'certificate' | 'custom';
export type SecretAccessPolicy = 'owner_only' | 'role_based' | 'service_account' | 'time_limited' | 'ip_restricted';
export type SandboxTier = 'strict' | 'standard' | 'permissive';
export type WebhookProvider = 'stripe' | 'github' | 'slack' | 'hmac';

export interface AuthResult {
  success: boolean;
  requiresMFA: boolean;
  sessionToken?: string;
  mfaChallenge?: string;
  userId?: string;
}

export interface MFASetup {
  secret: string;
  otpauthURI: string;
  backupCodes: string[];
  qrData: string;
}

export interface PasswordStrength {
  valid: boolean;
  score: number;
  reasons: string[];
}

export interface SessionInfo {
  id: string;
  fingerprint: string;
  status: SessionStatus;
  expires_at: string;
  last_active: string;
  created_at: string;
}

export interface KeyInfo {
  id: string;
  key_type: KeyType;
  key_status: KeyStatus;
  parent_key_id: string | null;
  rotation_days: number;
  created_at: string;
  rotated_at: string | null;
}

export interface SecretInfo {
  id: string;
  name: string;
  secret_type: SecretType;
  access_policy: SecretAccessPolicy;
  version: number;
  lease_expires_at: string | null;
  created_at: string;
  rotated_at: string | null;
  accessed_at: string | null;
  access_count: number;
  is_expired: boolean;
}

export interface SecretValue {
  name: string;
  value: string;
  type: SecretType;
  version: number;
  metadata: Record<string, any>;
}

export interface SSRFValidation {
  safe: boolean;
  url: string | null;
  violations: string[];
}

export interface SandboxResult {
  output: string;
  error: string | null;
  duration: number;
  memoryEstimate: number;
}

export interface PKCEParams {
  verifier: string;
  challenge: string;
  state: string;
}

export interface AuditEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  secret_id: string;
  secret_name: string;
  details: string;
  created_at: string;
}

// ─── API Client ─────────────────────────────────────────────────────

const API_BASE = '/api/vault';

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}/${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((errorBody as any).error || `API error: ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    if (err.message?.startsWith('API error') || err.message?.includes('vault')) throw err;
    console.warn(`Security Vault API offline for ${path}`);
    throw new Error('Security service unavailable');
  }
}

export const securityVaultClient = {
  init: () => apiCall<{ success: boolean }>('init', { method: 'POST' }),

  // ── Authentication ──
  register: (email: string, password: string) =>
    apiCall<{ success: boolean; userId: string; mfaRequired: boolean }>('auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

  login: (email: string, password: string, fingerprint?: string) =>
    apiCall<AuthResult>('auth/login', { method: 'POST', body: JSON.stringify({ email, password, fingerprint: fingerprint || generateFingerprint() }) }),

  verifyMFA: (challenge: string, code: string, fingerprint?: string) =>
    apiCall<{ success: boolean; sessionToken?: string }>('auth/mfa/verify', { method: 'POST', body: JSON.stringify({ challenge, code, fingerprint: fingerprint || generateFingerprint() }) }),

  setupMFA: () =>
    apiCall<{ success: boolean } & MFASetup>('auth/mfa/setup', { method: 'POST' }),

  confirmMFA: (code: string) =>
    apiCall<{ success: boolean }>('auth/mfa/confirm', { method: 'POST', body: JSON.stringify({ code }) }),

  disableMFA: (password: string) =>
    apiCall<{ success: boolean }>('auth/mfa/disable', { method: 'POST', body: JSON.stringify({ password }) }),

  checkPasswordStrength: (password: string) =>
    apiCall<PasswordStrength>('auth/password/strength', { method: 'POST', body: JSON.stringify({ password }) }),

  // ── Sessions ──
  getSessions: () =>
    apiCall<{ success: boolean; sessions: SessionInfo[]; total: number }>('sessions'),

  validateSession: (token: string, fingerprint?: string) =>
    apiCall<{ valid: boolean; userId?: string; tenantId?: string }>('sessions/validate', { method: 'POST', body: JSON.stringify({ token, fingerprint: fingerprint || generateFingerprint() }) }),

  revokeSession: (token: string) =>
    apiCall<{ success: boolean }>('sessions/revoke', { method: 'POST', body: JSON.stringify({ token }) }),

  revokeAllSessions: () =>
    apiCall<{ success: boolean; revoked: number }>('sessions/revoke-all', { method: 'POST' }),

  // ── HSM / Key Management ──
  initKeyHierarchy: () =>
    apiCall<{ success: boolean; masterId: string; kekId: string; dekId: string }>('hsm/init', { method: 'POST' }),

  listKeys: () =>
    apiCall<{ success: boolean; keys: KeyInfo[]; total: number }>('hsm/keys'),

  rotateDEK: () =>
    apiCall<{ success: boolean; newDekId: string; oldDekId: string }>('hsm/rotate-dek', { method: 'POST' }),

  getKeyHierarchy: () =>
    apiCall<{ success: boolean; hierarchy: any }>('hsm/hierarchy'),

  // ── Secret Vault ──
  putSecret: (name: string, value: string, type: SecretType = 'custom', accessPolicy: SecretAccessPolicy = 'owner_only', leaseDuration?: number, metadata?: Record<string, any>) =>
    apiCall<{ success: boolean; id: string; version: number }>('secrets', { method: 'POST', body: JSON.stringify({ name, value, type, access_policy: accessPolicy, lease_duration: leaseDuration, metadata }) }),

  listSecrets: (type?: SecretType) =>
    apiCall<{ success: boolean; secrets: SecretInfo[]; total: number }>(`secrets${type ? `?type=${type}` : ''}`),

  getSecret: (secretId: string) =>
    apiCall<{ success: boolean; secret: SecretValue }>(`secrets/${secretId}`),

  rotateSecret: (secretId: string, newValue: string) =>
    apiCall<{ success: boolean; version: number }>(`secrets/${secretId}`, { method: 'PUT', body: JSON.stringify({ value: newValue }) }),

  deleteSecret: (secretId: string) =>
    apiCall<{ success: boolean }>(`secrets/${secretId}`, { method: 'DELETE' }),

  renewLease: (secretId: string, seconds: number = 3600) =>
    apiCall<{ success: boolean; newExpiry: string }>(`secrets/${secretId}/renew`, { method: 'POST', body: JSON.stringify({ seconds }) }),

  getAuditLog: (limit: number = 100, offset: number = 0) =>
    apiCall<{ success: boolean; log: AuditEntry[]; total: number }>(`audit?limit=${limit}&offset=${offset}`),

  // ── SSRF Guard ──
  validateURL: (url: string) =>
    apiCall<{ success: boolean } & SSRFValidation>('ssrf/validate', { method: 'POST', body: JSON.stringify({ url }) }),

  getSSRFConfig: () =>
    apiCall<{ success: boolean; config: any }>('ssrf/config'),

  // ── Webhook Verification ──
  verifyWebhook: (provider: WebhookProvider, payload: any) =>
    apiCall<{ success: boolean; valid: boolean }>(`webhooks/verify/${provider}`, { method: 'POST', body: JSON.stringify(payload) }),

  // ── OAuth PKCE ──
  generatePKCE: () =>
    apiCall<{ success: boolean } & PKCEParams>('oauth/pkce/generate', { method: 'POST' }),

  buildAuthURL: (authEndpoint: string, clientId: string, redirectUri: string, scope: string, codeChallenge: string, state: string) =>
    apiCall<{ success: boolean; url: string }>('oauth/authorize-url', { method: 'POST', body: JSON.stringify({ auth_endpoint: authEndpoint, client_id: clientId, redirect_uri: redirectUri, scope, code_challenge: codeChallenge, state }) }),

  exchangeCode: (tokenEndpoint: string, clientId: string, clientSecret: string, code: string, redirectUri: string, codeVerifier: string) =>
    apiCall<{ success: boolean; tokens: any }>('oauth/exchange', { method: 'POST', body: JSON.stringify({ token_endpoint: tokenEndpoint, client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, code_verifier: codeVerifier }) }),

  refreshToken: (tokenEndpoint: string, clientId: string, clientSecret: string, refreshToken: string) =>
    apiCall<{ success: boolean; tokens: any }>('oauth/refresh', { method: 'POST', body: JSON.stringify({ token_endpoint: tokenEndpoint, client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }) }),

  // ── Code Sandbox ──
  executeCode: (code: string, tier: SandboxTier = 'standard') =>
    apiCall<{ success: boolean } & SandboxResult>('sandbox/execute', { method: 'POST', body: JSON.stringify({ code, tier }) }),

  getSandboxConfig: () =>
    apiCall<{ success: boolean; configs: any }>('sandbox/config'),
};

// ─── Device Fingerprint ─────────────────────────────────────────────

function generateFingerprint(): string {
  if (typeof window === 'undefined') return 'server';
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth?.toString() || '',
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || '',
  ];
  // Simple hash — in production use a proper fingerprinting library
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// ─── React Hooks ────────────────────────────────────────────────────

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const result = await securityVaultClient.login(email, password);
      if (result.requiresMFA) {
        setMfaRequired(true);
        setMfaChallenge(result.mfaChallenge || null);
        setUserId(result.userId || null);
        return { requiresMFA: true };
      }
      setSessionToken(result.sessionToken || null);
      setUserId(result.userId || null);
      setIsAuthenticated(result.success);
      return { requiresMFA: false, success: result.success };
    } catch (e: any) { setError(e.message); return { requiresMFA: false, success: false }; }
    finally { setLoading(false); }
  }, []);

  const verifyMFA = useCallback(async (code: string) => {
    if (!mfaChallenge) return false;
    setLoading(true); setError(null);
    try {
      const result = await securityVaultClient.verifyMFA(mfaChallenge, code);
      if (result.success) {
        setSessionToken(result.sessionToken || null);
        setIsAuthenticated(true);
        setMfaRequired(false);
        setMfaChallenge(null);
      }
      return result.success;
    } catch (e: any) { setError(e.message); return false; }
    finally { setLoading(false); }
  }, [mfaChallenge]);

  const logout = useCallback(async () => {
    if (sessionToken) {
      try { await securityVaultClient.revokeSession(sessionToken); } catch {}
    }
    setIsAuthenticated(false); setSessionToken(null); setUserId(null);
    setMfaRequired(false); setMfaChallenge(null);
  }, [sessionToken]);

  const register = useCallback(async (email: string, password: string) => {
    setLoading(true); setError(null);
    try {
      const result = await securityVaultClient.register(email, password);
      return result;
    } catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  return {
    isAuthenticated, userId, sessionToken, mfaRequired, mfaChallenge,
    loading, error, login, verifyMFA, logout, register,
  };
}

export function useMFA() {
  const [setup, setSetup] = useState<MFASetup | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const beginSetup = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await securityVaultClient.setupMFA();
      setSetup({ secret: result.secret, otpauthURI: result.otpauthURI, backupCodes: result.backupCodes, qrData: result.qrData });
      return result;
    } catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  const confirm = useCallback(async (code: string) => {
    setLoading(true); setError(null);
    try {
      const result = await securityVaultClient.confirmMFA(code);
      if (result.success) setSetup(null);
      return result.success;
    } catch (e: any) { setError(e.message); return false; }
    finally { setLoading(false); }
  }, []);

  const disable = useCallback(async (password: string) => {
    setLoading(true); setError(null);
    try {
      const result = await securityVaultClient.disableMFA(password);
      return result.success;
    } catch (e: any) { setError(e.message); return false; }
    finally { setLoading(false); }
  }, []);

  return { setup, loading, error, beginSetup, confirm, disable };
}

export function useSessionManagement() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await securityVaultClient.getSessions(); setSessions(res.sessions || []); }
    catch {}
    finally { setLoading(false); }
  }, []);

  const revoke = useCallback(async (token: string) => {
    try { await securityVaultClient.revokeSession(token); await load(); return true; }
    catch { return false; }
  }, [load]);

  const revokeAll = useCallback(async () => {
    try { const res = await securityVaultClient.revokeAllSessions(); await load(); return res.revoked; }
    catch { return 0; }
  }, [load]);

  return { sessions, loading, load, revoke, revokeAll };
}

export function useSecretVault() {
  const [secrets, setSecrets] = useState<SecretInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (type?: SecretType) => {
    setLoading(true); setError(null);
    try { const res = await securityVaultClient.listSecrets(type); setSecrets(res.secrets || []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const put = useCallback(async (name: string, value: string, type: SecretType = 'custom', accessPolicy: SecretAccessPolicy = 'owner_only', leaseDuration?: number) => {
    try { const res = await securityVaultClient.putSecret(name, value, type, accessPolicy, leaseDuration); await load(); return res; }
    catch (e: any) { setError(e.message); return null; }
  }, [load]);

  const get = useCallback(async (secretId: string) => {
    try { const res = await securityVaultClient.getSecret(secretId); return res.secret; }
    catch (e: any) { setError(e.message); return null; }
  }, []);

  const rotate = useCallback(async (secretId: string, newValue: string) => {
    try { const res = await securityVaultClient.rotateSecret(secretId, newValue); await load(); return res; }
    catch (e: any) { setError(e.message); return null; }
  }, [load]);

  const remove = useCallback(async (secretId: string) => {
    try { await securityVaultClient.deleteSecret(secretId); await load(); return true; }
    catch { return false; }
  }, [load]);

  const renewLease = useCallback(async (secretId: string, seconds: number = 3600) => {
    try { const res = await securityVaultClient.renewLease(secretId, seconds); await load(); return res; }
    catch (e: any) { setError(e.message); return null; }
  }, [load]);

  return { secrets, loading, error, load, put, get, rotate, remove, renewLease };
}

export function useKeyManagement() {
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, hierRes] = await Promise.all([
        securityVaultClient.listKeys(),
        securityVaultClient.getKeyHierarchy(),
      ]);
      setKeys(keysRes.keys || []);
      setHierarchy(hierRes.hierarchy);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const initHierarchy = useCallback(async () => {
    try { const res = await securityVaultClient.initKeyHierarchy(); await load(); return res; }
    catch { return null; }
  }, [load]);

  const rotateDEK = useCallback(async () => {
    try { const res = await securityVaultClient.rotateDEK(); await load(); return res; }
    catch { return null; }
  }, [load]);

  return { keys, hierarchy, loading, load, initHierarchy, rotateDEK };
}

export function useVaultAudit() {
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (limit: number = 100, offset: number = 0) => {
    setLoading(true);
    try { const res = await securityVaultClient.getAuditLog(limit, offset); setLog(res.log || []); }
    catch {}
    finally { setLoading(false); }
  }, []);

  return { log, loading, load };
}

export function usePasswordStrength() {
  const [strength, setStrength] = useState<PasswordStrength | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const check = useCallback((password: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (password.length < 4) { setStrength(null); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try { const res = await securityVaultClient.checkPasswordStrength(password); setStrength(res); }
      catch { /* local fallback */ setStrength({ valid: password.length >= 12, score: Math.min(100, password.length * 7), reasons: password.length < 12 ? ['Minimum 12 characters'] : [] }); }
      finally { setLoading(false); }
    }, 300);
  }, []);

  useEffect(() => { return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; }, []);

  return { strength, loading, check };
}

export function useCodeSandbox() {
  const [result, setResult] = useState<SandboxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (code: string, tier: SandboxTier = 'standard') => {
    setLoading(true); setError(null);
    try { const res = await securityVaultClient.executeCode(code, tier); setResult(res); return res; }
    catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, []);

  return { result, loading, error, execute };
}
