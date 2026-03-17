/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Secure Auth Client — JWT + CSRF + httpOnly Refresh Cookies
 * Worker-side auth primary, IndexedDB-cached token validation for offline
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  csrfToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  expiresAt: number | null;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface APIKeyInfo {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  active: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const API_BASE = '/api/auth/v2';
const TOKEN_REFRESH_BUFFER = 120; // refresh 2 minutes before expiry
const IDB_AUTH_STORE = 'nexushr_auth';

// ── Secure Token Storage (memory-only for access tokens) ───────────────────

let _accessToken: string | null = null;
let _csrfToken: string | null = null;
let _expiresAt: number | null = null;
let _refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Store tokens in memory only — never localStorage */
function setTokens(accessToken: string, csrfToken: string, expiresIn: number): void {
  _accessToken = accessToken;
  _csrfToken = csrfToken;
  _expiresAt = Date.now() + (expiresIn * 1000);

  // Schedule auto-refresh
  scheduleRefresh(expiresIn);
}

function clearTokens(): void {
  _accessToken = null;
  _csrfToken = null;
  _expiresAt = null;
  if (_refreshTimer) {
    clearTimeout(_refreshTimer);
    _refreshTimer = null;
  }
}

function scheduleRefresh(expiresIn: number): void {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  const refreshInMs = Math.max(0, (expiresIn - TOKEN_REFRESH_BUFFER) * 1000);
  _refreshTimer = setTimeout(() => {
    authClient.refreshToken().catch(() => {
      // Refresh failed — user will need to re-login
      clearTokens();
    });
  }, refreshInMs);
}

// ── IndexedDB for Offline Auth Cache ───────────────────────────────────────

async function cacheUserForOffline(user: AuthUser): Promise<void> {
  try {
    const request = indexedDB.open(IDB_AUTH_STORE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('auth', { keyPath: 'key' });
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction('auth', 'readwrite');
    tx.objectStore('auth').put({ key: 'cached_user', user, cachedAt: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch { /* IndexedDB not available */ }
}

async function getCachedUser(): Promise<AuthUser | null> {
  try {
    const request = indexedDB.open(IDB_AUTH_STORE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('auth', { keyPath: 'key' });
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction('auth', 'readonly');
    const result = await new Promise<any>((resolve, reject) => {
      const req = tx.objectStore('auth').get('cached_user');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (!result) return null;

    // Cache valid for 24 hours for offline access
    const ageMs = Date.now() - (result.cachedAt || 0);
    if (ageMs > 24 * 60 * 60 * 1000) return null;

    return result.user;
  } catch {
    return null;
  }
}

async function clearCachedUser(): Promise<void> {
  try {
    const request = indexedDB.open(IDB_AUTH_STORE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('auth', { keyPath: 'key' });
    };
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction('auth', 'readwrite');
    tx.objectStore('auth').delete('cached_user');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
}

// ── Secure Fetch Helper ────────────────────────────────────────────────────

/** Make an authenticated API call with CSRF token */
export async function secureFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  // Add CSRF token for state-changing requests
  if (_csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((opts.method || 'GET').toUpperCase())) {
    headers['X-CSRF-Token'] = _csrfToken;
  }

  const response = await fetch(url, {
    ...opts,
    headers,
    credentials: 'same-origin', // Include httpOnly cookies
  });

  // If 401, try to refresh and retry once
  if (response.status === 401 && url !== `${API_BASE}/refresh`) {
    const refreshed = await authClient.refreshToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${_accessToken}`;
      if (_csrfToken) headers['X-CSRF-Token'] = _csrfToken;
      return fetch(url, { ...opts, headers, credentials: 'same-origin' });
    }
  }

  return response;
}

// ── Auth Client ────────────────────────────────────────────────────────────

export const authClient = {
  /** Register a new account */
  async register(email: string, password: string, name: string): Promise<LoginResult> {
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json() as any;
      if (!data.success) return { success: false, error: data.error };

      // Auto-login after registration
      return this.login(email, password);
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  },

  /** Login with email and password */
  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin', // Accept httpOnly cookies
      });

      const data = await res.json() as any;
      if (!data.success) return { success: false, error: data.error };

      // Store tokens in memory
      setTokens(data.accessToken, data.csrfToken, data.expiresIn);

      // Cache user in IndexedDB for offline
      await cacheUserForOffline(data.user);

      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  },

  /** Refresh the access token using httpOnly refresh cookie */
  async refreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', // Send httpOnly cookie
      });

      const data = await res.json() as any;
      if (!data.success) return false;

      setTokens(data.accessToken, data.csrfToken, data.expiresIn);
      return true;
    } catch {
      return false;
    }
  },

  /** Logout — clear tokens and revoke session */
  async logout(): Promise<void> {
    try {
      if (_accessToken) {
        await fetch(`${API_BASE}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${_accessToken}`,
          },
          credentials: 'same-origin',
        });
      }
    } catch { /* Best-effort logout */ }

    clearTokens();
    await clearCachedUser();
  },

  /** Check if currently authenticated (memory + offline fallback) */
  async checkAuth(): Promise<{ authenticated: boolean; user: AuthUser | null }> {
    // Check memory first
    if (_accessToken && _expiresAt && _expiresAt > Date.now()) {
      // Validate with server
      try {
        const res = await fetch(`${API_BASE}/validate`, {
          headers: { 'Authorization': `Bearer ${_accessToken}` },
        });
        const data = await res.json() as any;
        if (data.valid) return { authenticated: true, user: data.user };
      } catch { /* Offline — check cache */ }
    }

    // Try refresh
    const refreshed = await this.refreshToken();
    if (refreshed) {
      try {
        const res = await fetch(`${API_BASE}/validate`, {
          headers: { 'Authorization': `Bearer ${_accessToken}` },
        });
        const data = await res.json() as any;
        if (data.valid) {
          await cacheUserForOffline(data.user);
          return { authenticated: true, user: data.user };
        }
      } catch {}
    }

    // Offline fallback: use cached user for read-only access
    if (!navigator.onLine) {
      const cached = await getCachedUser();
      if (cached) return { authenticated: true, user: cached };
    }

    return { authenticated: false, user: null };
  },

  /** Change password */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await secureFetch(`${API_BASE}/password`, {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      return await res.json() as any;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /** Get current access token (for components that need it) */
  getAccessToken(): string | null {
    return _accessToken;
  },

  /** Get CSRF token */
  getCsrfToken(): string | null {
    return _csrfToken;
  },

  /** Check if token is about to expire */
  isTokenExpiringSoon(): boolean {
    if (!_expiresAt) return true;
    return _expiresAt - Date.now() < TOKEN_REFRESH_BUFFER * 1000;
  },
};

// ── API Key Client ─────────────────────────────────────────────────────────

export const apiKeyClient = {
  async list(): Promise<APIKeyInfo[]> {
    const res = await secureFetch(`${API_BASE}/api-keys`);
    const data = await res.json() as any;
    return data.success ? data.data : [];
  },

  async create(name: string, scopes: string[], expiresInDays?: number): Promise<{ key: string; id: string; prefix: string } | null> {
    const res = await secureFetch(`${API_BASE}/api-keys`, {
      method: 'POST',
      body: JSON.stringify({ name, scopes, expiresInDays }),
    });
    const data = await res.json() as any;
    return data.success ? data.data : null;
  },

  async rotate(keyId: string): Promise<{ key: string; id: string; prefix: string } | null> {
    const res = await secureFetch(`${API_BASE}/api-keys/${keyId}/rotate`, { method: 'POST' });
    const data = await res.json() as any;
    return data.success ? data.data : null;
  },

  async revoke(keyId: string): Promise<boolean> {
    const res = await secureFetch(`${API_BASE}/api-keys/${keyId}`, { method: 'DELETE' });
    const data = await res.json() as any;
    return data.success;
  },
};

// ── Security Events Client ─────────────────────────────────────────────────

export const securityEventsClient = {
  async getRecent(): Promise<any[]> {
    const res = await secureFetch(`${API_BASE}/security-events`);
    const data = await res.json() as any;
    return data.success ? data.data : [];
  },
};

// ── React Auth Context & Hooks ─────────────────────────────────────────────

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, password: string, name: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  changePassword: (oldPw: string, newPw: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, accessToken: null, csrfToken: null,
    isAuthenticated: false, isLoading: true, expiresAt: null,
  });

  // Check auth on mount
  useEffect(() => {
    authClient.checkAuth().then(({ authenticated, user }) => {
      setState({
        user, accessToken: _accessToken, csrfToken: _csrfToken,
        isAuthenticated: authenticated, isLoading: false, expiresAt: _expiresAt,
      });
    });
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const result = await authClient.login(email, password);
    if (result.success && result.user) {
      setState({
        user: result.user, accessToken: _accessToken, csrfToken: _csrfToken,
        isAuthenticated: true, isLoading: false, expiresAt: _expiresAt,
      });
    }
    return result;
  }, []);

  const register = useCallback(async (email: string, password: string, name: string): Promise<LoginResult> => {
    const result = await authClient.register(email, password, name);
    if (result.success && result.user) {
      setState({
        user: result.user, accessToken: _accessToken, csrfToken: _csrfToken,
        isAuthenticated: true, isLoading: false, expiresAt: _expiresAt,
      });
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setState({
      user: null, accessToken: null, csrfToken: null,
      isAuthenticated: false, isLoading: false, expiresAt: null,
    });
  }, []);

  const changePassword = useCallback(async (oldPw: string, newPw: string) => {
    return authClient.changePassword(oldPw, newPw);
  }, []);

  // Auto-refresh listener
  useEffect(() => {
    const onOnline = () => {
      authClient.refreshToken().then(ok => {
        if (ok) {
          setState(prev => ({
            ...prev, accessToken: _accessToken,
            csrfToken: _csrfToken, expiresAt: _expiresAt,
          }));
        }
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, register, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access auth state and actions */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Hook for API key management */
export function useAPIKeys() {
  const [keys, setKeys] = useState<APIKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await apiKeyClient.list();
    setKeys(data);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return {
    keys, loading, refresh,
    create: async (name: string, scopes: string[], days?: number) => {
      const result = await apiKeyClient.create(name, scopes, days);
      await refresh();
      return result;
    },
    rotate: async (keyId: string) => {
      const result = await apiKeyClient.rotate(keyId);
      await refresh();
      return result;
    },
    revoke: async (keyId: string) => {
      await apiKeyClient.revoke(keyId);
      await refresh();
    },
  };
}
