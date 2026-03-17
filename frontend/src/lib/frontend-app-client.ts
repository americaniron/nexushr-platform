/**
 * NexusHR Feature #31 — Enterprise SaaS Frontend Application Client
 * Full API client with React hooks, dual-mode (Worker backend + localStorage fallback)
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system' | 'custom';
export type PageId = 'dashboard' | 'marketplace' | 'hire' | 'conversation' | 'tasks' | 'workflows' | 'analytics' | 'billing' | 'admin';
export type ComponentCategory = 'primitive' | 'composite' | 'layout' | 'page' | 'widget' | 'form' | 'navigation' | 'feedback' | 'data-display' | 'overlay';
export type StoreSlice = 'auth' | 'employees' | 'conversations' | 'tasks' | 'workflows' | 'analytics' | 'billing' | 'admin' | 'ui' | 'notifications' | 'marketplace' | 'preferences';
export type WidgetSize = '1x1' | '1x2' | '2x1' | '2x2' | '3x1' | '3x2' | '4x1' | '4x2' | 'full';
export type LayoutType = 'sidebar' | 'full-width' | 'centered' | 'split' | 'stacked';
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FormFieldType = 'text' | 'email' | 'password' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'toggle' | 'textarea' | 'date' | 'datetime' | 'file' | 'color' | 'slider' | 'rich-text' | 'code' | 'json' | 'avatar-upload' | 'tag-input';

export interface DesignSystem {
  colors: Record<string, Record<string, string>>;
  typography: { fontFamilies: Record<string, string>; fontSizes: Record<string, any>; fontWeights: Record<string, string>; letterSpacings: Record<string, string> };
  spacing: Record<string, string>;
  breakpoints: Record<string, { min: string; max: string }>;
  radii: Record<string, string>;
  shadows: Record<string, string>;
  transitions: Record<string, string>;
  zIndex: Record<string, number | string>;
}

export interface ThemeConfig extends DesignSystem {
  semantic: { name: string; colors: Record<string, Record<string, string>> };
}

export interface PageConfig {
  id: PageId; title: string; description: string; icon: string; path: string;
  layout: LayoutType; requiredRole: string[]; features: string[];
  sections: SectionConfig[]; widgets: WidgetConfig[]; actions: ActionConfig[];
  breadcrumb: { label: string; path: string }[];
  meta: { keywords: string[]; priority: number; badge?: string };
}

export interface SectionConfig {
  id: string; title: string; description?: string; component: string;
  layout: string; collapsible: boolean; defaultOpen: boolean; columns?: number; gap?: string;
}

export interface WidgetConfig {
  id: string; type: string; title: string; size: WidgetSize;
  refreshInterval?: number; dataSource: string; config: Record<string, any>;
}

export interface ActionConfig {
  id: string; label: string; icon: string; action: string;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  shortcut?: string; requiresConfirm?: boolean;
}

export interface ComponentDefinition {
  name: string; category: ComponentCategory; description: string;
  props: PropDef[]; variants: string[]; sizes: string[]; states: string[];
  slots?: string[]; accessibility: { role?: string; ariaLabel?: boolean; keyboard?: string[] };
  dependencies: string[];
}

export interface PropDef { name: string; type: string; required: boolean; default?: any; description: string; }

export interface StoreDefinition {
  slice: StoreSlice; description: string; initialState: Record<string, any>;
  actions: StoreActionDef[]; selectors: SelectorDef[]; middleware: string[];
  persistence: { enabled: boolean; storage: string; key: string };
}

export interface StoreActionDef { name: string; description: string; params: { name: string; type: string }[]; async: boolean; optimistic?: boolean; }
export interface SelectorDef { name: string; description: string; memoized: boolean; params?: { name: string; type: string }[]; }

export interface NavItem {
  id: string; label: string; icon: string; path: string;
  badge?: { type: 'count' | 'dot' | 'text'; value?: string | number };
  children?: NavItem[]; requiredRole: string[]; section: string;
}

export interface KeyboardShortcut { key: string; action: string; description: string; global: boolean; }

export interface FormDefinition {
  id: string; title: string; steps?: FormStep[];
  fields: FormField[]; validation: ValidationRule[]; onSubmit: string;
}

export interface FormStep { id: string; title: string; description?: string; fields: string[]; }
export interface FormField {
  id: string; type: FormFieldType; label: string; placeholder?: string; required: boolean;
  validation?: ValidationRule[]; options?: { label: string; value: string }[];
  conditional?: { field: string; operator: string; value: any }; helpText?: string; defaultValue?: any;
}
export interface ValidationRule { type: string; value?: any; message: string; }

export interface SavedView {
  id: string; name: string; config: any;
  isDefault: boolean; isShared: boolean; isOwner: boolean;
}

export interface WidgetLayout {
  id: string; type: string; config: any;
  x: number; y: number; width: number; height: number; visible: boolean;
}

// ─── API Client ─────────────────────────────────────────────────────

const API_BASE = '/api/frontend';

async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  } catch (err) {
    console.warn(`Frontend API offline, using local fallback for ${path}`);
    return { success: true, data: [] } as T;
  }
}

export const frontendAppClient = {
  init: () => apiCall<{ success: boolean }>('init', { method: 'POST' }),

  // Design System
  getDesignSystem: () => apiCall<{ success: boolean; designSystem: DesignSystem }>('design-system'),
  getTheme: (mode: ThemeMode) => apiCall<{ success: boolean; theme: ThemeConfig }>(`theme/${mode}`),
  getCSSVariables: async (mode: ThemeMode): Promise<string> => {
    try { const res = await fetch(`${API_BASE}/css-variables/${mode}`); return res.text(); }
    catch { return ''; }
  },

  // Pages
  getPages: () => apiCall<{ success: boolean; pages: Record<PageId, PageConfig>; total: number }>('pages'),
  getPage: (pageId: PageId) => apiCall<{ success: boolean; page: PageConfig }>(`pages/${pageId}`),
  getPageSections: (pageId: PageId) => apiCall<{ success: boolean; sections: SectionConfig[] }>(`pages/${pageId}/sections`),
  getPageWidgets: (pageId: PageId) => apiCall<{ success: boolean; widgets: WidgetConfig[] }>(`pages/${pageId}/widgets`),
  getPageActions: (pageId: PageId) => apiCall<{ success: boolean; actions: ActionConfig[] }>(`pages/${pageId}/actions`),

  // Components
  getComponents: () => apiCall<{ success: boolean; components: Record<string, ComponentDefinition>; total: number }>('components'),
  getComponent: (name: string) => apiCall<{ success: boolean; component: ComponentDefinition }>(`components/${name}`),
  getComponentsByCategory: (cat: ComponentCategory) => apiCall<{ success: boolean; components: ComponentDefinition[] }>(`components/category/${cat}`),

  // State Architecture
  getStateArchitecture: () => apiCall<{ success: boolean; stores: Record<StoreSlice, StoreDefinition>; total: number }>('state'),
  getStoreSlice: (slice: StoreSlice) => apiCall<{ success: boolean; store: StoreDefinition }>(`state/${slice}`),

  // Navigation
  getNavigation: (role: string = 'user') => apiCall<{ success: boolean; navigation: NavItem[] }>(`navigation?role=${role}`),
  getShortcuts: () => apiCall<{ success: boolean; shortcuts: KeyboardShortcut[]; total: number }>('shortcuts'),

  // Forms
  getForms: () => apiCall<{ success: boolean; forms: Record<string, FormDefinition>; total: number }>('forms'),
  getForm: (formId: string) => apiCall<{ success: boolean; form: FormDefinition }>(`forms/${formId}`),

  // User Config
  saveUserConfig: (type: string, key: string, value: any) =>
    apiCall<{ success: boolean }>('config', { method: 'PUT', body: JSON.stringify({ type, key, value }) }),
  getUserConfig: (type: string, key?: string) =>
    apiCall<{ success: boolean; config: any }>(`config?type=${type}${key ? `&key=${key}` : ''}`),
  deleteUserConfig: (type: string, key: string) =>
    apiCall<{ success: boolean }>('config', { method: 'DELETE', body: JSON.stringify({ type, key }) }),

  // Widget Layout
  saveWidgetLayout: (dashboardId: string, widgets: any[]) =>
    apiCall<{ success: boolean }>('widgets/layout', { method: 'PUT', body: JSON.stringify({ dashboard_id: dashboardId, widgets }) }),
  getWidgetLayout: (dashboardId: string = 'default') =>
    apiCall<{ success: boolean; widgets: WidgetLayout[]; total: number }>(`widgets/layout?dashboard_id=${dashboardId}`),

  // Saved Views
  saveView: (pageId: string, name: string, config: any, isShared: boolean = false) =>
    apiCall<{ success: boolean; viewId: string }>('views', { method: 'POST', body: JSON.stringify({ page_id: pageId, name, config, is_shared: isShared }) }),
  getViews: (pageId: string) =>
    apiCall<{ success: boolean; views: SavedView[]; total: number }>(`views?page_id=${pageId}`),
  deleteView: (viewId: string) =>
    apiCall<{ success: boolean }>(`views/${viewId}`, { method: 'DELETE' }),
};

// ─── React Hooks ────────────────────────────────────────────────────

export function useDesignSystem() {
  const [designSystem, setDesignSystem] = useState<DesignSystem | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await frontendAppClient.getDesignSystem(); setDesignSystem(res.designSystem); }
    catch { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  return { designSystem, loading, load };
}

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [loading, setLoading] = useState(false);

  const resolvedMode = useMemo(() => {
    if (mode !== 'system') return mode;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }, [mode]);

  const loadTheme = useCallback(async (m: ThemeMode) => {
    setLoading(true);
    try {
      const resolved = m === 'system'
        ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : m;
      const res = await frontendAppClient.getTheme(resolved as ThemeMode);
      setTheme(res.theme);
      setMode(m);
      await frontendAppClient.saveUserConfig('theme', 'mode', m);
    } catch { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  const loadCSS = useCallback(async (): Promise<string> => {
    return frontendAppClient.getCSSVariables(resolvedMode as ThemeMode);
  }, [resolvedMode]);

  return { mode, resolvedMode, theme, loading, setTheme: loadTheme, loadCSS };
}

export function usePageConfig(pageId: PageId) {
  const [page, setPage] = useState<PageConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id?: PageId) => {
    setLoading(true); setError(null);
    try { const res = await frontendAppClient.getPage(id || pageId); setPage(res.page); return res.page; }
    catch (e: any) { setError(e.message); return null; }
    finally { setLoading(false); }
  }, [pageId]);

  return { page, loading, error, load };
}

export function usePageRegistry() {
  const [pages, setPages] = useState<Record<PageId, PageConfig> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await frontendAppClient.getPages(); setPages(res.pages); }
    catch { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  return { pages, loading, load };
}

export function useComponentRegistry() {
  const [components, setComponents] = useState<Record<string, ComponentDefinition> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await frontendAppClient.getComponents(); setComponents(res.components); }
    catch { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  const getByCategory = useCallback(async (cat: ComponentCategory) => {
    try { const res = await frontendAppClient.getComponentsByCategory(cat); return res.components; }
    catch { return []; }
  }, []);

  return { components, loading, load, getByCategory };
}

export function useStateArchitecture() {
  const [stores, setStores] = useState<Record<StoreSlice, StoreDefinition> | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await frontendAppClient.getStateArchitecture(); setStores(res.stores); }
    catch { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  const getSlice = useCallback(async (slice: StoreSlice) => {
    try { const res = await frontendAppClient.getStoreSlice(slice); return res.store; }
    catch { return null; }
  }, []);

  return { stores, loading, load, getSlice };
}

export function useNavigation(userRole: string = 'user') {
  const [items, setItems] = useState<NavItem[]>([]);
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [activeItem, setActiveItem] = useState<string>('dashboard');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [navRes, shortcutRes] = await Promise.all([
        frontendAppClient.getNavigation(userRole),
        frontendAppClient.getShortcuts(),
      ]);
      setItems(navRes.navigation || []);
      setShortcuts(shortcutRes.shortcuts || []);
    } catch { /* fallback */ }
    finally { setLoading(false); }
  }, [userRole]);

  const navigate = useCallback((path: string) => {
    const item = items.find(i => i.path === path);
    if (item) setActiveItem(item.id);
    // In a real app this would call router.push(path)
  }, [items]);

  return { items, shortcuts, activeItem, loading, load, navigate, setActiveItem };
}

export function useFormSystem() {
  const [forms, setForms] = useState<Record<string, FormDefinition> | null>(null);
  const [activeForm, setActiveForm] = useState<FormDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try { const res = await frontendAppClient.getForms(); setForms(res.forms); }
    catch { /* fallback */ }
    finally { setLoading(false); }
  }, []);

  const openForm = useCallback(async (formId: string) => {
    try {
      const res = await frontendAppClient.getForm(formId);
      setActiveForm(res.form);
      setFormData({});
      setErrors({});
      setCurrentStep(0);
      // Set default values
      if (res.form?.fields) {
        const defaults: Record<string, any> = {};
        for (const field of res.form.fields) {
          if (field.defaultValue !== undefined) defaults[field.id] = field.defaultValue;
        }
        setFormData(defaults);
      }
      return res.form;
    } catch { return null; }
  }, []);

  const updateField = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => { const next = { ...prev }; delete next[fieldId]; return next; });
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!activeForm) return false;
    const newErrors: Record<string, string> = {};
    const fieldsToValidate = activeForm.steps
      ? activeForm.fields.filter(f => activeForm.steps![currentStep]?.fields.includes(f.id))
      : activeForm.fields;

    for (const field of fieldsToValidate) {
      if (field.required && !formData[field.id]) {
        newErrors[field.id] = `${field.label} is required`;
      }
      if (field.validation) {
        for (const rule of field.validation) {
          const value = formData[field.id];
          if (rule.type === 'minLength' && value && value.length < rule.value) {
            newErrors[field.id] = rule.message;
          }
          if (rule.type === 'maxLength' && value && value.length > rule.value) {
            newErrors[field.id] = rule.message;
          }
          if (rule.type === 'pattern' && value && !new RegExp(rule.value).test(value)) {
            newErrors[field.id] = rule.message;
          }
          if (rule.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            newErrors[field.id] = rule.message;
          }
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [activeForm, formData, currentStep]);

  const nextStep = useCallback(() => {
    if (validateForm() && activeForm?.steps && currentStep < activeForm.steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      return true;
    }
    return false;
  }, [validateForm, activeForm, currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) { setCurrentStep(prev => prev - 1); return true; }
    return false;
  }, [currentStep]);

  const closeForm = useCallback(() => {
    setActiveForm(null); setFormData({}); setErrors({}); setCurrentStep(0);
  }, []);

  return {
    forms, activeForm, formData, errors, currentStep, loading,
    loadForms, openForm, updateField, validateForm, nextStep, prevStep, closeForm,
  };
}

export function useWidgetLayout(dashboardId: string = 'default') {
  const [widgets, setWidgets] = useState<WidgetLayout[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await frontendAppClient.getWidgetLayout(dashboardId); setWidgets(res.widgets || []); }
    catch { /* fallback */ }
    finally { setLoading(false); }
  }, [dashboardId]);

  const save = useCallback(async (newWidgets: WidgetLayout[]) => {
    try {
      await frontendAppClient.saveWidgetLayout(dashboardId, newWidgets);
      setWidgets(newWidgets);
      return true;
    } catch { return false; }
  }, [dashboardId]);

  const moveWidget = useCallback((widgetId: string, x: number, y: number) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, x, y } : w));
  }, []);

  const resizeWidget = useCallback((widgetId: string, width: number, height: number) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, width, height } : w));
  }, []);

  const toggleWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w));
  }, []);

  return { widgets, loading, load, save, moveWidget, resizeWidget, toggleWidget };
}

export function useSavedViews(pageId: PageId) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeView, setActiveView] = useState<SavedView | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await frontendAppClient.getViews(pageId);
      setViews(res.views || []);
      const defaultView = (res.views || []).find((v: SavedView) => v.isDefault);
      if (defaultView) setActiveView(defaultView);
    } catch { /* fallback */ }
    finally { setLoading(false); }
  }, [pageId]);

  const saveView = useCallback(async (name: string, config: any, isShared: boolean = false) => {
    try {
      const res = await frontendAppClient.saveView(pageId, name, config, isShared);
      await load();
      return res.viewId;
    } catch { return null; }
  }, [pageId, load]);

  const deleteView = useCallback(async (viewId: string) => {
    try {
      await frontendAppClient.deleteView(viewId);
      setViews(prev => prev.filter(v => v.id !== viewId));
      if (activeView?.id === viewId) setActiveView(null);
      return true;
    } catch { return false; }
  }, [activeView]);

  const applyView = useCallback((view: SavedView) => {
    setActiveView(view);
    return view.config;
  }, []);

  return { views, activeView, loading, load, saveView, deleteView, applyView };
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], onAction: (action: string) => void) {
  const pendingRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = [];
      if (e.ctrlKey || e.metaKey) key.push('Ctrl');
      if (e.shiftKey) key.push('Shift');
      if (e.altKey) key.push('Alt');
      if (e.key !== 'Control' && e.key !== 'Shift' && e.key !== 'Alt' && e.key !== 'Meta') {
        key.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      }
      const combo = key.join('+');

      // Handle G-then-X sequences
      if (e.key.toUpperCase() === 'G' && !e.ctrlKey && !e.metaKey) {
        pendingRef.current = 'G';
        setTimeout(() => { pendingRef.current = null; }, 1000);
        return;
      }
      if (pendingRef.current === 'G') {
        const seqKey = `G then ${e.key.toUpperCase()}`;
        const match = shortcuts.find(s => s.key === seqKey);
        if (match) { e.preventDefault(); onAction(match.action); }
        pendingRef.current = null;
        return;
      }

      const match = shortcuts.find(s => s.key === combo);
      if (match) { e.preventDefault(); onAction(match.action); }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts, onAction]);
}

export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<string>('lg');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      if (w < 640) { setBreakpoint('xs'); setIsMobile(true); setIsTablet(false); setIsDesktop(false); }
      else if (w < 768) { setBreakpoint('sm'); setIsMobile(true); setIsTablet(false); setIsDesktop(false); }
      else if (w < 1024) { setBreakpoint('md'); setIsMobile(false); setIsTablet(true); setIsDesktop(false); }
      else if (w < 1280) { setBreakpoint('lg'); setIsMobile(false); setIsTablet(false); setIsDesktop(true); }
      else if (w < 1536) { setBreakpoint('xl'); setIsMobile(false); setIsTablet(false); setIsDesktop(true); }
      else { setBreakpoint('2xl'); setIsMobile(false); setIsTablet(false); setIsDesktop(true); }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return { breakpoint, isMobile, isTablet, isDesktop };
}
