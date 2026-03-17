import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthState, Plan, TrialConversionEvent } from '../data/types';
import { PLANS } from '../data/constants';
import { AI_EMPLOYEES } from '../data/employees';
import { saveAuthState, loadAuthState, clearAuthState, hashPassword, generateSessionToken, saveOnboarding, loadOnboarding, checkRateLimit, recordRateLimitAttempt, addAuditEntry } from '../lib/storage';

interface AuthContextType extends AuthState {
  isLoggedIn: boolean; isAdmin: boolean; isTrial: boolean; isSubscribed: boolean; isExpired: boolean;
  canAccessWorkspace: boolean; sessionToken: string | null;
  login: (mode: string) => void; logout: () => void;
  signup: (name: string, email: string, password: string) => void;
  loginWithCredentials: (email: string, password: string) => { success: boolean; error?: string };
  upgradeToSubscription: (slug: string) => void;
  hireEmployee: (id: string) => void; fireEmployee: (id: string) => void;
  canHire: () => { allowed: boolean; reason?: string };
  showAuth: (mode: 'login' | 'signup') => void;
  completeOnboarding: () => void;
  trackUsage: () => void;
  getTrialConversionEvent: () => TrialConversionEvent | null;
  getUsageSummary: () => { hoursUsed: number; hoursLimit: number; daysRemaining: number; percentUsed: number };
}

const AuthContext = createContext<AuthContextType | null>(null);
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth outside provider'); return ctx; }

const DEFAULT_STATE: AuthState = { status: 'logged_out', user: null, trial: null, subscription: null, plan: null, hiredEmployees: [], usage: [], onboardingComplete: false };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => loadAuthState() || DEFAULT_STATE);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => { saveAuthState(authState); }, [authState]);

  // Auto-check trial expiry
  useEffect(() => {
    if (authState.status === 'trial' && authState.trial) {
      const started = new Date(authState.trial.startedAt).getTime();
      const now = Date.now();
      const daysPassed = Math.floor((now - started) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, 7 - daysPassed);

      if (daysRemaining !== authState.trial.daysRemaining) {
        setAuthState(p => ({
          ...p,
          trial: p.trial ? { ...p.trial, daysRemaining } : null,
          status: daysRemaining <= 0 ? 'trial_expired' : p.status,
        }));
      }
    }
  }, [authState.status, authState.trial?.startedAt]);

  const login = useCallback((mode: string) => {
    const token = generateSessionToken();
    setSessionToken(token);
    if (mode === 'trial') {
      setAuthState({
        status: 'trial', user: { id: 'usr_001', name: 'Ahmed', email: 'adam@americaniron1.com', password: '', role: 'owner', systemRole: 'member' },
        trial: { startedAt: new Date().toISOString(), daysRemaining: 7, hoursUsed: 0, dailyLimit: 30 },
        subscription: null, plan: null, hiredEmployees: ['atlas'], usage: [], onboardingComplete: loadOnboarding(),
      });
      addAuditEntry('login', 'ahmed', 'session', 'Trial login');
    } else if (mode === 'subscribed') {
      setAuthState({
        status: 'subscribed', user: { id: 'usr_001', name: 'Ahmed', email: 'adam@americaniron1.com', password: '', role: 'owner', systemRole: 'member' },
        trial: { startedAt: '', daysRemaining: 0, hoursUsed: 0, dailyLimit: 999 },
        subscription: { status: 'active', periodEnd: 'Apr 1, 2026' }, plan: PLANS[1],
        hiredEmployees: ['atlas', 'aurora', 'vex', 'harmony', 'prism'], usage: [], onboardingComplete: true,
      });
      addAuditEntry('login', 'ahmed', 'session', 'Subscriber login');
    } else if (mode === 'admin') {
      setAuthState({
        status: 'admin', user: { id: 'usr_admin', name: 'Platform Admin', email: 'admin@nexushr.ai', password: '', role: 'owner', systemRole: 'super_admin' },
        trial: null, subscription: { status: 'active', periodEnd: '' }, plan: PLANS[2],
        hiredEmployees: AI_EMPLOYEES.map(e => e.id), usage: [], onboardingComplete: true,
      });
      addAuditEntry('login', 'admin', 'session', 'Admin login');
    } else if (mode === 'expired') {
      setAuthState({
        status: 'trial_expired', user: { id: 'usr_001', name: 'Ahmed', email: 'adam@americaniron1.com', password: '', role: 'owner', systemRole: 'member' },
        trial: { startedAt: '', daysRemaining: 0, hoursUsed: 30, dailyLimit: 30 },
        subscription: null, plan: null, hiredEmployees: [], usage: [], onboardingComplete: true,
      });
    }
  }, []);

  const signup = useCallback((name: string, email: string, password: string) => {
    const hashed = hashPassword(password);
    const token = generateSessionToken();
    setSessionToken(token);
    setAuthState({
      status: 'trial', user: { id: 'usr_' + Date.now(), name, email, password: hashed, role: 'owner', systemRole: 'member' },
      trial: { startedAt: new Date().toISOString(), daysRemaining: 7, hoursUsed: 0, dailyLimit: 30 },
      subscription: null, plan: null, hiredEmployees: [], usage: [], onboardingComplete: false,
    });
    addAuditEntry('signup', email, 'account', `New signup: ${name}`);
  }, []);

  const loginWithCredentials = useCallback((email: string, password: string): { success: boolean; error?: string } => {
    // Rate limiting
    const rateCheck = checkRateLimit('login');
    if (!rateCheck.allowed) {
      return { success: false, error: `Too many login attempts. Try again after ${rateCheck.lockedUntil || '30 minutes'}.` };
    }

    const saved = loadAuthState();
    if (saved?.user && saved.user.email === email && saved.user.password === hashPassword(password)) {
      setAuthState(saved);
      setSessionToken(generateSessionToken());
      recordRateLimitAttempt('login', true);
      addAuditEntry('login', email, 'session', 'Credential login success');
      return { success: true };
    }

    // Demo fallback
    if (email === 'admin@nexushr.ai' && password === 'admin') {
      login('admin');
      recordRateLimitAttempt('login', true);
      return { success: true };
    }
    if (email === 'demo@nexushr.ai' && password === 'demo') {
      login('subscribed');
      recordRateLimitAttempt('login', true);
      return { success: true };
    }

    recordRateLimitAttempt('login', false);
    const remaining = checkRateLimit('login');
    addAuditEntry('login_failed', email, 'session', `Failed login attempt (${remaining.attemptsRemaining} remaining)`);
    return {
      success: false,
      error: remaining.attemptsRemaining <= 2
        ? `Invalid credentials. ${remaining.attemptsRemaining} attempts remaining before lockout.`
        : 'Invalid email or password.',
    };
  }, [login]);

  const logout = useCallback(() => {
    addAuditEntry('logout', authState.user?.email || 'unknown', 'session', 'User logged out');
    setAuthState(DEFAULT_STATE);
    clearAuthState();
    setSessionToken(null);
  }, [authState.user?.email]);

  const upgradeToSubscription = useCallback((slug: string) => {
    const plan = PLANS.find(p => p.slug === slug) || PLANS[0];
    addAuditEntry('upgrade', authState.user?.email || 'unknown', 'subscription', `Upgraded to ${plan.name}`);
    setAuthState(p => ({
      ...p,
      status: 'subscribed',
      trial: { startedAt: '', daysRemaining: 0, hoursUsed: 0, dailyLimit: 999 },
      subscription: { status: 'active', periodEnd: 'Apr 1, 2026' },
      plan,
    }));
  }, [authState.user?.email]);

  const hireEmployee = useCallback((id: string) => {
    setAuthState(p => {
      if (p.hiredEmployees.includes(id)) return p;
      const max = p.status === 'trial' ? 1 : (typeof p.plan?.employees === 'number' ? p.plan.employees : 99);
      if (p.hiredEmployees.length >= max) return p;
      addAuditEntry('hire', p.user?.email || 'unknown', id, `Hired employee ${id}`);
      return { ...p, hiredEmployees: [...p.hiredEmployees, id] };
    });
  }, []);

  const fireEmployee = useCallback((id: string) => {
    addAuditEntry('fire', authState.user?.email || 'unknown', id, `Removed employee ${id}`);
    setAuthState(p => ({ ...p, hiredEmployees: p.hiredEmployees.filter(x => x !== id) }));
  }, [authState.user?.email]);

  const showAuth = useCallback((mode: 'login' | 'signup') => setAuthState(p => ({ ...p, status: mode as any })), []);

  const completeOnboarding = useCallback(() => {
    saveOnboarding(true);
    setAuthState(p => ({ ...p, onboardingComplete: true }));
  }, []);

  const trackUsage = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    setAuthState(p => {
      const usage = [...p.usage];
      const existing = usage.find(u => u.date === today);
      if (existing) { existing.tasks += 1; existing.compute += 0.02; existing.cost += 0.03; }
      else { usage.push({ date: today, tasks: 1, compute: 0.02, cost: 0.03 }); }
      const trial = p.trial ? { ...p.trial, hoursUsed: p.trial.hoursUsed + 0.02 } : null;
      return { ...p, usage, trial };
    });
  }, []);

  // ── Trial Conversion Events ──
  const getTrialConversionEvent = useCallback((): TrialConversionEvent | null => {
    if (authState.status !== 'trial' || !authState.trial) return null;

    const { hoursUsed, dailyLimit, daysRemaining } = authState.trial;
    const usagePercent = (hoursUsed / dailyLimit) * 100;
    const employeePercent = (authState.hiredEmployees.length / 1) * 100;

    // Time-based triggers
    if (daysRemaining <= 1) {
      return { type: 'time_limit', message: 'Your trial expires tomorrow! Upgrade to keep your AI team.', ctaText: 'Upgrade Now — Save 20%', urgency: 'high', percentUsed: ((7 - daysRemaining) / 7) * 100 };
    }
    if (daysRemaining <= 3) {
      return { type: 'time_limit', message: `${daysRemaining} days left in your trial.`, ctaText: 'View Plans', urgency: 'medium', percentUsed: ((7 - daysRemaining) / 7) * 100 };
    }

    // Usage-based triggers
    if (usagePercent >= 80) {
      return { type: 'usage_limit', message: `You've used ${Math.round(usagePercent)}% of your trial hours. Upgrade for unlimited compute.`, ctaText: 'Unlock Unlimited Hours', urgency: 'high', percentUsed: usagePercent };
    }
    if (usagePercent >= 50) {
      return { type: 'usage_limit', message: 'You\'re making great use of your trial! Upgrade to unlock the full platform.', ctaText: 'See Plans', urgency: 'low', percentUsed: usagePercent };
    }

    // Employee limit trigger
    if (employeePercent >= 100) {
      return { type: 'employee_limit', message: 'You\'ve reached your trial employee limit. Upgrade to hire more AI talent.', ctaText: 'Hire More Employees', urgency: 'medium', percentUsed: employeePercent };
    }

    return null;
  }, [authState]);

  const getUsageSummary = useCallback(() => {
    const hoursUsed = authState.trial?.hoursUsed || 0;
    const hoursLimit = authState.trial?.dailyLimit || 30;
    const daysRemaining = authState.trial?.daysRemaining || 0;
    return {
      hoursUsed,
      hoursLimit,
      daysRemaining,
      percentUsed: (hoursUsed / hoursLimit) * 100,
    };
  }, [authState.trial]);

  const isLoggedIn = !['logged_out', 'login', 'signup'].includes(authState.status);
  const isAdmin = authState.user?.systemRole === 'super_admin';
  const isTrial = authState.status === 'trial';
  const isSubscribed = authState.status === 'subscribed' || authState.status === 'admin';
  const isExpired = authState.status === 'trial_expired';
  const canAccessWorkspace = isTrial || isSubscribed;

  const canHire = useCallback(() => {
    if (isSubscribed) return { allowed: true };
    if (isTrial && authState.hiredEmployees.length >= 1) return { allowed: false, reason: 'Free trial limited to 1 AI employee. Upgrade to hire more!' };
    if (isTrial) return { allowed: true };
    return { allowed: false, reason: 'Please sign up first' };
  }, [isSubscribed, isTrial, authState.hiredEmployees.length]);

  return (
    <AuthContext.Provider value={{
      ...authState, isLoggedIn, isAdmin, isTrial, isSubscribed, isExpired, canAccessWorkspace,
      sessionToken, login, logout, signup, loginWithCredentials, upgradeToSubscription,
      hireEmployee, fireEmployee, canHire, showAuth, completeOnboarding, trackUsage,
      getTrialConversionEvent, getUsageSummary,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
