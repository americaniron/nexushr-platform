/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR Theme Engine — Dark mode with CSS variables & system preference
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Features:
 * 1. Light/Dark/System theme modes
 * 2. CSS custom property driven — zero re-renders on theme change
 * 3. System preference detection with matchMedia listener
 * 4. localStorage persistence with Worker sync
 * 5. Smooth transition between themes
 */

import { isWorkerConnected } from './worker-api';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Surface colors
  bgPrimary: string;
  bgSecondary: string;
  bgCard: string;
  bgHover: string;
  bgOverlay: string;

  // Border colors
  border: string;
  borderLight: string;
  borderFocus: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  // Brand
  golden: string;
  goldenDark: string;
  goldenLight: string;

  // Semantic
  success: string;
  warn: string;
  danger: string;
  info: string;

  // Scrollbar
  scrollbarThumb: string;
  scrollbarTrack: string;

  // Shadow
  shadowColor: string;
  shadowStrength: string;
}

const LIGHT_THEME: ThemeColors = {
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F9FAFB',
  bgCard: '#FFFFFF',
  bgHover: '#F3F4F6',
  bgOverlay: 'rgba(0, 0, 0, 0.5)',
  border: '#E5E7EB',
  borderLight: 'rgba(0, 0, 0, 0.06)',
  borderFocus: '#FBCC00',
  textPrimary: '#0F0F0F',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  textInverse: '#FFFFFF',
  golden: '#FBCC00',
  goldenDark: '#E5BA00',
  goldenLight: '#FDE68A',
  success: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  scrollbarThumb: '#D1D5DB',
  scrollbarTrack: 'transparent',
  shadowColor: '0, 0, 0',
  shadowStrength: '0.08',
};

const DARK_THEME: ThemeColors = {
  bgPrimary: '#0F0F0F',
  bgSecondary: '#1A1A2E',
  bgCard: '#1E1E32',
  bgHover: '#2A2A40',
  bgOverlay: 'rgba(0, 0, 0, 0.7)',
  border: '#333350',
  borderLight: 'rgba(255, 255, 255, 0.08)',
  borderFocus: '#FBCC00',
  textPrimary: '#F3F4F6',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  textInverse: '#0F0F0F',
  golden: '#FBCC00',
  goldenDark: '#E5BA00',
  goldenLight: '#FDE68A',
  success: '#34D399',
  warn: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
  scrollbarThumb: '#4B5563',
  scrollbarTrack: 'transparent',
  shadowColor: '0, 0, 0',
  shadowStrength: '0.3',
};

// ── CSS Variable Mapping ──

function applyThemeToDOM(colors: ThemeColors): void {
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', colors.bgPrimary);
  root.style.setProperty('--bg-secondary', colors.bgSecondary);
  root.style.setProperty('--bg-card', colors.bgCard);
  root.style.setProperty('--bg-hover', colors.bgHover);
  root.style.setProperty('--bg-overlay', colors.bgOverlay);
  root.style.setProperty('--border-color', colors.border);
  root.style.setProperty('--border-light', colors.borderLight);
  root.style.setProperty('--border-focus', colors.borderFocus);
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--text-inverse', colors.textInverse);
  root.style.setProperty('--color-golden', colors.golden);
  root.style.setProperty('--color-golden-dark', colors.goldenDark);
  root.style.setProperty('--color-golden-light', colors.goldenLight);
  root.style.setProperty('--color-success', colors.success);
  root.style.setProperty('--color-warn', colors.warn);
  root.style.setProperty('--color-danger', colors.danger);
  root.style.setProperty('--color-info', colors.info);
  root.style.setProperty('--scrollbar-thumb', colors.scrollbarThumb);
  root.style.setProperty('--scrollbar-track', colors.scrollbarTrack);
  root.style.setProperty('--shadow-color', colors.shadowColor);
  root.style.setProperty('--shadow-strength', colors.shadowStrength);

  // Set data attribute for CSS selectors
  const isDark = colors.bgPrimary === DARK_THEME.bgPrimary;
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  root.classList.toggle('dark', isDark);
}

// ── System Preference Detection ──

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ThemeColors {
  if (mode === 'system') {
    return getSystemPreference() === 'dark' ? DARK_THEME : LIGHT_THEME;
  }
  return mode === 'dark' ? DARK_THEME : LIGHT_THEME;
}

// ── Persistence ──

const LOCAL_THEME_KEY = 'nexushr_theme_mode';

function loadSavedMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(LOCAL_THEME_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch { /* fallthrough */ }
  return 'system';
}

function saveMode(mode: ThemeMode): void {
  localStorage.setItem(LOCAL_THEME_KEY, mode);
}

// ── Theme Manager ──

type ThemeListener = (mode: ThemeMode, resolved: 'light' | 'dark') => void;

class ThemeManager {
  private mode: ThemeMode = 'system';
  private listeners: Set<ThemeListener> = new Set();
  private mediaQuery: MediaQueryList | null = null;

  init(): void {
    this.mode = loadSavedMode();
    applyThemeToDOM(resolveTheme(this.mode));

    // Listen for system preference changes
    if (typeof window !== 'undefined') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', this.onSystemChange);
    }

    // Add transition class after initial paint to prevent flash
    requestAnimationFrame(() => {
      document.documentElement.classList.add('theme-transition');
    });
  }

  destroy(): void {
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.onSystemChange);
    }
    this.listeners.clear();
  }

  getMode(): ThemeMode { return this.mode; }

  getResolved(): 'light' | 'dark' {
    if (this.mode === 'system') return getSystemPreference();
    return this.mode;
  }

  isDark(): boolean { return this.getResolved() === 'dark'; }

  setMode(mode: ThemeMode): void {
    this.mode = mode;
    saveMode(mode);
    applyThemeToDOM(resolveTheme(mode));
    this.notifyListeners();
    this.syncToWorker(mode);
  }

  subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const resolved = this.getResolved();
    this.listeners.forEach(fn => fn(this.mode, resolved));
  }

  private onSystemChange = (): void => {
    if (this.mode === 'system') {
      applyThemeToDOM(resolveTheme('system'));
      this.notifyListeners();
    }
  };

  private async syncToWorker(mode: ThemeMode): Promise<void> {
    if (!isWorkerConnected()) return;
    try {
      await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: mode }),
      });
    } catch { /* silent fail */ }
  }
}

export const themeManager = new ThemeManager();

// ── React Hook ──

import { useState, useEffect } from 'react';

export function useTheme(): {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
} {
  const [mode, setModeState] = useState<ThemeMode>(themeManager.getMode());
  const [resolved, setResolved] = useState<'light' | 'dark'>(themeManager.getResolved());

  useEffect(() => {
    return themeManager.subscribe((newMode, newResolved) => {
      setModeState(newMode);
      setResolved(newResolved);
    });
  }, []);

  return {
    mode,
    resolved,
    isDark: resolved === 'dark',
    setMode: (m: ThemeMode) => themeManager.setMode(m),
    toggle: () => themeManager.setMode(themeManager.isDark() ? 'light' : 'dark'),
  };
}

// ── Theme Toggle Component Colors ──

export function getThemeIcon(mode: ThemeMode): string {
  switch (mode) {
    case 'light': return '☀️';
    case 'dark': return '🌙';
    case 'system': return '💻';
  }
}
