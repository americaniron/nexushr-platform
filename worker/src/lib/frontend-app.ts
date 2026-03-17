/**
 * NexusHR Feature #31 — Enterprise SaaS Frontend Application Engine
 *
 * Full UI architecture serving:
 * 1. Design System (tokens, typography, colors, spacing, shadows, breakpoints, components)
 * 2. Page Registry (dashboard, marketplace, hire, conversation, tasks, workflows, analytics, billing, admin)
 * 3. Component Hierarchy (layouts, shells, widgets, composites, primitives)
 * 4. State Management Architecture (stores, slices, middleware, selectors, persistence)
 * 5. Navigation & Routing (sidebar, breadcrumbs, deep links, guards, transitions)
 * 6. Theme Engine (light/dark/custom, CSS variable generation, contrast validation)
 * 7. Layout Engine (responsive grid, panel system, drag-drop zones, widget placement)
 * 8. Widget Registry (dashboard widgets, analytics cards, metric tiles, activity feeds)
 * 9. Form System (field registry, validation rules, multi-step wizards, conditional logic)
 * 10. Notification System (toast, banner, badge, inbox, push, sound, priority routing)
 */

import { Env } from '../index';

// ─── Design System Types ────────────────────────────────────────────

export type ColorScale = '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950';
export type SpacingScale = '0' | '0.5' | '1' | '1.5' | '2' | '2.5' | '3' | '3.5' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '12' | '14' | '16' | '20' | '24' | '28' | '32' | '36' | '40' | '48' | '56' | '64' | '72' | '80' | '96';
export type FontWeight = 'thin' | 'extralight' | 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
export type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type RadiusScale = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
export type ShadowScale = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'inner' | 'none';
export type ThemeMode = 'light' | 'dark' | 'system' | 'custom';
export type PageId = 'dashboard' | 'marketplace' | 'hire' | 'conversation' | 'tasks' | 'workflows' | 'analytics' | 'billing' | 'admin';
export type LayoutType = 'sidebar' | 'full-width' | 'centered' | 'split' | 'stacked';
export type WidgetSize = '1x1' | '1x2' | '2x1' | '2x2' | '3x1' | '3x2' | '4x1' | '4x2' | 'full';
export type ComponentCategory = 'primitive' | 'composite' | 'layout' | 'page' | 'widget' | 'form' | 'navigation' | 'feedback' | 'data-display' | 'overlay';
export type StoreSlice = 'auth' | 'employees' | 'conversations' | 'tasks' | 'workflows' | 'analytics' | 'billing' | 'admin' | 'ui' | 'notifications' | 'marketplace' | 'preferences';
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type NotificationChannel = 'toast' | 'banner' | 'badge' | 'inbox' | 'push' | 'sound';
export type FormFieldType = 'text' | 'email' | 'password' | 'number' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'toggle' | 'textarea' | 'date' | 'datetime' | 'file' | 'color' | 'slider' | 'rich-text' | 'code' | 'json' | 'avatar-upload' | 'tag-input';

// ─── Design Token Definitions ───────────────────────────────────────

const COLOR_PALETTE = {
  brand: {
    '50': '#f0f4ff', '100': '#dbe4fe', '200': '#bfcffd', '300': '#93aefb',
    '400': '#6085f8', '500': '#3b5ef3', '600': '#2540e8', '700': '#1c32d5',
    '800': '#1d2aac', '900': '#1e2988', '950': '#161b53',
  },
  accent: {
    '50': '#fdf4ff', '100': '#fae8ff', '200': '#f5d0fe', '300': '#f0abfc',
    '400': '#e879f9', '500': '#d946ef', '600': '#c026d3', '700': '#a21caf',
    '800': '#86198f', '900': '#701a75', '950': '#4a044e',
  },
  success: {
    '50': '#f0fdf4', '100': '#dcfce7', '200': '#bbf7d0', '300': '#86efac',
    '400': '#4ade80', '500': '#22c55e', '600': '#16a34a', '700': '#15803d',
    '800': '#166534', '900': '#14532d', '950': '#052e16',
  },
  warning: {
    '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
    '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
    '800': '#92400e', '900': '#78350f', '950': '#451a03',
  },
  danger: {
    '50': '#fef2f2', '100': '#fee2e2', '200': '#fecaca', '300': '#fca5a5',
    '400': '#f87171', '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c',
    '800': '#991b1b', '900': '#7f1d1d', '950': '#450a0a',
  },
  neutral: {
    '50': '#fafafa', '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8',
    '400': '#a1a1aa', '500': '#71717a', '600': '#52525b', '700': '#3f3f46',
    '800': '#27272a', '900': '#18181b', '950': '#09090b',
  },
};

const TYPOGRAPHY = {
  fontFamilies: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
    display: "'Cal Sans', 'Inter', sans-serif",
  },
  fontSizes: {
    xs: { size: '0.75rem', lineHeight: '1rem' },
    sm: { size: '0.875rem', lineHeight: '1.25rem' },
    base: { size: '1rem', lineHeight: '1.5rem' },
    lg: { size: '1.125rem', lineHeight: '1.75rem' },
    xl: { size: '1.25rem', lineHeight: '1.75rem' },
    '2xl': { size: '1.5rem', lineHeight: '2rem' },
    '3xl': { size: '1.875rem', lineHeight: '2.25rem' },
    '4xl': { size: '2.25rem', lineHeight: '2.5rem' },
    '5xl': { size: '3rem', lineHeight: '1' },
    '6xl': { size: '3.75rem', lineHeight: '1' },
  },
  fontWeights: {
    thin: '100', extralight: '200', light: '300', normal: '400',
    medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900',
  },
  letterSpacings: {
    tighter: '-0.05em', tight: '-0.025em', normal: '0em',
    wide: '0.025em', wider: '0.05em', widest: '0.1em',
  },
};

const SPACING = {
  '0': '0px', '0.5': '0.125rem', '1': '0.25rem', '1.5': '0.375rem',
  '2': '0.5rem', '2.5': '0.625rem', '3': '0.75rem', '3.5': '0.875rem',
  '4': '1rem', '5': '1.25rem', '6': '1.5rem', '7': '1.75rem',
  '8': '2rem', '9': '2.25rem', '10': '2.5rem', '12': '3rem',
  '14': '3.5rem', '16': '4rem', '20': '5rem', '24': '6rem',
  '28': '7rem', '32': '8rem', '36': '9rem', '40': '10rem',
  '48': '12rem', '56': '14rem', '64': '16rem', '72': '18rem',
  '80': '20rem', '96': '24rem',
};

const BREAKPOINTS = {
  xs: { min: '0px', max: '639px' },
  sm: { min: '640px', max: '767px' },
  md: { min: '768px', max: '1023px' },
  lg: { min: '1024px', max: '1279px' },
  xl: { min: '1280px', max: '1535px' },
  '2xl': { min: '1536px', max: '9999px' },
};

const RADII = {
  none: '0px', sm: '0.125rem', md: '0.375rem', lg: '0.5rem',
  xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem', full: '9999px',
};

const SHADOWS = {
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: '0 0 #0000',
};

const TRANSITIONS = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  bounce: '600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

const Z_INDEX = {
  hide: -1, auto: 'auto', base: 0, docked: 10, dropdown: 1000,
  sticky: 1100, banner: 1200, overlay: 1300, modal: 1400,
  popover: 1500, skipLink: 1600, toast: 1700, tooltip: 1800,
  commandPalette: 1900,
};

// ─── Theme Engine ───────────────────────────────────────────────────

const LIGHT_THEME = {
  name: 'light',
  colors: {
    bg: { primary: '#ffffff', secondary: '#fafafa', tertiary: '#f4f4f5', inverse: '#18181b' },
    fg: { primary: '#18181b', secondary: '#52525b', tertiary: '#a1a1aa', inverse: '#ffffff', muted: '#71717a' },
    border: { primary: '#e4e4e7', secondary: '#d4d4d8', focus: '#3b5ef3', error: '#ef4444' },
    surface: { elevated: '#ffffff', sunken: '#f4f4f5', overlay: 'rgba(0,0,0,0.5)' },
    sidebar: { bg: '#fafafa', border: '#e4e4e7', active: '#f0f4ff', hover: '#f4f4f5' },
    input: { bg: '#ffffff', border: '#d4d4d8', focus: '#3b5ef3', placeholder: '#a1a1aa' },
    table: { header: '#f4f4f5', row: '#ffffff', rowAlt: '#fafafa', hover: '#f0f4ff' },
    code: { bg: '#f4f4f5', border: '#e4e4e7', text: '#18181b' },
  },
};

const DARK_THEME = {
  name: 'dark',
  colors: {
    bg: { primary: '#09090b', secondary: '#18181b', tertiary: '#27272a', inverse: '#fafafa' },
    fg: { primary: '#fafafa', secondary: '#a1a1aa', tertiary: '#71717a', inverse: '#18181b', muted: '#52525b' },
    border: { primary: '#27272a', secondary: '#3f3f46', focus: '#6085f8', error: '#f87171' },
    surface: { elevated: '#18181b', sunken: '#09090b', overlay: 'rgba(0,0,0,0.7)' },
    sidebar: { bg: '#18181b', border: '#27272a', active: '#1e2988', hover: '#27272a' },
    input: { bg: '#18181b', border: '#3f3f46', focus: '#6085f8', placeholder: '#52525b' },
    table: { header: '#27272a', row: '#18181b', rowAlt: '#09090b', hover: '#1e2988' },
    code: { bg: '#27272a', border: '#3f3f46', text: '#fafafa' },
  },
};

// ─── Page Registry ──────────────────────────────────────────────────

interface PageConfig {
  id: PageId;
  title: string;
  description: string;
  icon: string;
  path: string;
  layout: LayoutType;
  requiredRole: string[];
  features: string[];
  sections: SectionConfig[];
  widgets: WidgetConfig[];
  actions: ActionConfig[];
  breadcrumb: { label: string; path: string }[];
  meta: { keywords: string[]; priority: number; badge?: string };
}

interface SectionConfig {
  id: string;
  title: string;
  description?: string;
  component: string;
  layout: 'grid' | 'list' | 'tabs' | 'accordion' | 'kanban' | 'timeline' | 'calendar' | 'split';
  collapsible: boolean;
  defaultOpen: boolean;
  columns?: number;
  gap?: string;
}

interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  size: WidgetSize;
  refreshInterval?: number;
  dataSource: string;
  config: Record<string, any>;
}

interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  action: string;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  shortcut?: string;
  requiresConfirm?: boolean;
}

const PAGE_REGISTRY: Record<PageId, PageConfig> = {
  dashboard: {
    id: 'dashboard', title: 'Dashboard', description: 'Command center for your AI workforce',
    icon: 'LayoutDashboard', path: '/', layout: 'sidebar',
    requiredRole: ['user', 'admin', 'owner'],
    features: ['overview', 'quick_actions', 'activity_feed', 'performance_metrics', 'alerts'],
    sections: [
      { id: 'hero-metrics', title: 'Key Metrics', component: 'MetricHero', layout: 'grid', collapsible: false, defaultOpen: true, columns: 4, gap: '6' },
      { id: 'ai-workforce', title: 'AI Workforce Status', component: 'WorkforceGrid', layout: 'grid', collapsible: true, defaultOpen: true, columns: 3 },
      { id: 'activity-feed', title: 'Recent Activity', component: 'ActivityFeed', layout: 'timeline', collapsible: true, defaultOpen: true },
      { id: 'task-overview', title: 'Task Pipeline', component: 'TaskPipeline', layout: 'kanban', collapsible: true, defaultOpen: true },
      { id: 'performance', title: 'Performance Trends', component: 'PerformanceCharts', layout: 'grid', collapsible: true, defaultOpen: true, columns: 2 },
      { id: 'alerts', title: 'Alerts & Notifications', component: 'AlertPanel', layout: 'list', collapsible: true, defaultOpen: true },
    ],
    widgets: [
      { id: 'w-active-employees', type: 'metric', title: 'Active AI Employees', size: '1x1', refreshInterval: 30000, dataSource: '/api/employees/stats', config: { metric: 'active_count', format: 'number', trend: true } },
      { id: 'w-tasks-completed', type: 'metric', title: 'Tasks Completed Today', size: '1x1', refreshInterval: 60000, dataSource: '/api/ai/tasks/stats', config: { metric: 'completed_today', format: 'number', trend: true } },
      { id: 'w-conversations', type: 'metric', title: 'Active Conversations', size: '1x1', refreshInterval: 15000, dataSource: '/api/ai/conversations/stats', config: { metric: 'active', format: 'number' } },
      { id: 'w-cost-savings', type: 'metric', title: 'Cost Savings', size: '1x1', refreshInterval: 300000, dataSource: '/api/analytics/cost-savings', config: { metric: 'monthly', format: 'currency', trend: true } },
      { id: 'w-task-chart', type: 'chart', title: 'Task Completion Trend', size: '2x1', refreshInterval: 300000, dataSource: '/api/analytics/tasks/trend', config: { chartType: 'area', period: '7d' } },
      { id: 'w-satisfaction', type: 'gauge', title: 'Employee Satisfaction', size: '1x1', refreshInterval: 300000, dataSource: '/api/sentiment/analytics', config: { metric: 'avg_satisfaction', min: 0, max: 100 } },
      { id: 'w-activity', type: 'feed', title: 'Live Activity', size: '2x2', refreshInterval: 10000, dataSource: '/api/ai/activity/stream', config: { limit: 20, showAvatar: true } },
    ],
    actions: [
      { id: 'hire-employee', label: 'Hire AI Employee', icon: 'UserPlus', action: 'navigate:/marketplace', variant: 'primary', shortcut: 'Ctrl+N' },
      { id: 'new-task', label: 'Create Task', icon: 'Plus', action: 'modal:create-task', variant: 'secondary', shortcut: 'Ctrl+T' },
      { id: 'quick-chat', label: 'Quick Chat', icon: 'MessageSquare', action: 'modal:quick-chat', variant: 'ghost', shortcut: 'Ctrl+J' },
    ],
    breadcrumb: [{ label: 'Home', path: '/' }],
    meta: { keywords: ['dashboard', 'overview', 'home'], priority: 1 },
  },

  marketplace: {
    id: 'marketplace', title: 'AI Employee Marketplace', description: 'Browse and hire AI employees by role and industry',
    icon: 'Store', path: '/marketplace', layout: 'sidebar',
    requiredRole: ['user', 'admin', 'owner'],
    features: ['browse', 'filter', 'compare', 'preview', 'ratings', 'industry_packs'],
    sections: [
      { id: 'featured', title: 'Featured AI Employees', component: 'FeaturedCarousel', layout: 'grid', collapsible: false, defaultOpen: true, columns: 3 },
      { id: 'categories', title: 'Browse by Category', component: 'CategoryGrid', layout: 'grid', collapsible: false, defaultOpen: true, columns: 5 },
      { id: 'catalog', title: 'All AI Employees', component: 'EmployeeCatalog', layout: 'grid', collapsible: false, defaultOpen: true, columns: 3 },
      { id: 'industry-packs', title: 'Industry Packs', component: 'IndustryPackCards', layout: 'grid', collapsible: true, defaultOpen: true, columns: 3 },
      { id: 'compare', title: 'Compare Employees', component: 'ComparisonTable', layout: 'grid', collapsible: true, defaultOpen: false },
    ],
    widgets: [
      { id: 'w-search', type: 'search', title: 'Search Employees', size: 'full', dataSource: '/api/roles/search', config: { placeholder: 'Search by role, skill, or industry...', filters: ['category', 'industry', 'tier'] } },
      { id: 'w-trending', type: 'list', title: 'Trending Roles', size: '1x2', dataSource: '/api/roles/trending', config: { limit: 10 } },
    ],
    actions: [
      { id: 'filter-toggle', label: 'Filters', icon: 'Filter', action: 'toggle:filter-panel', variant: 'ghost' },
      { id: 'compare-toggle', label: 'Compare', icon: 'GitCompare', action: 'toggle:compare-mode', variant: 'ghost' },
      { id: 'request-custom', label: 'Request Custom Role', icon: 'Wand2', action: 'modal:request-role', variant: 'secondary' },
    ],
    breadcrumb: [{ label: 'Home', path: '/' }, { label: 'Marketplace', path: '/marketplace' }],
    meta: { keywords: ['marketplace', 'browse', 'hire', 'roles'], priority: 2 },
  },

  hire: {
    id: 'hire', title: 'Hire AI Employee', description: 'Configure and deploy a new AI employee',
    icon: 'UserPlus', path: '/hire/:roleId?', layout: 'centered',
    requiredRole: ['admin', 'owner'],
    features: ['role_selection', 'customization', 'avatar_setup', 'training_config', 'deployment', 'preview'],
    sections: [
      { id: 'wizard-progress', title: 'Setup Progress', component: 'WizardStepper', layout: 'grid', collapsible: false, defaultOpen: true },
      { id: 'role-config', title: 'Role Configuration', component: 'RoleConfigurator', layout: 'tabs', collapsible: false, defaultOpen: true },
      { id: 'personality', title: 'Personality & Voice', component: 'PersonalityEditor', layout: 'grid', collapsible: true, defaultOpen: true, columns: 2 },
      { id: 'avatar-setup', title: 'Avatar Setup', component: 'AvatarStudio', layout: 'split', collapsible: true, defaultOpen: true },
      { id: 'integrations', title: 'Integration Setup', component: 'IntegrationPicker', layout: 'grid', collapsible: true, defaultOpen: true, columns: 3 },
      { id: 'preview', title: 'Preview & Deploy', component: 'DeploymentPreview', layout: 'split', collapsible: false, defaultOpen: true },
    ],
    widgets: [
      { id: 'w-cost-estimate', type: 'metric', title: 'Estimated Monthly Cost', size: '1x1', dataSource: '/api/billing/estimate', config: { format: 'currency' } },
      { id: 'w-role-preview', type: 'preview', title: 'Live Preview', size: '2x2', dataSource: 'local', config: { interactive: true } },
    ],
    actions: [
      { id: 'save-draft', label: 'Save Draft', icon: 'Save', action: 'save:draft', variant: 'ghost' },
      { id: 'deploy', label: 'Deploy Employee', icon: 'Rocket', action: 'deploy:employee', variant: 'primary', requiresConfirm: true },
    ],
    breadcrumb: [{ label: 'Home', path: '/' }, { label: 'Marketplace', path: '/marketplace' }, { label: 'Hire', path: '/hire' }],
    meta: { keywords: ['hire', 'deploy', 'configure', 'setup'], priority: 3 },
  },

  conversation: {
    id: 'conversation', title: 'Conversations', description: 'Chat with your AI employees',
    icon: 'MessageSquare', path: '/conversations/:employeeId?', layout: 'split',
    requiredRole: ['user', 'admin', 'owner'],
    features: ['chat', 'voice', 'video', 'file_sharing', 'task_creation', 'history', 'multi_employee'],
    sections: [
      { id: 'sidebar-conversations', title: 'Conversations', component: 'ConversationList', layout: 'list', collapsible: false, defaultOpen: true },
      { id: 'chat-main', title: 'Chat', component: 'ChatInterface', layout: 'grid', collapsible: false, defaultOpen: true },
      { id: 'context-panel', title: 'Context', component: 'ContextPanel', layout: 'tabs', collapsible: true, defaultOpen: true },
    ],
    widgets: [
      { id: 'w-suggested-actions', type: 'action-list', title: 'Suggested Actions', size: '1x1', dataSource: '/api/ai/suggestions', config: { limit: 5 } },
      { id: 'w-related-docs', type: 'list', title: 'Related Documents', size: '1x1', dataSource: '/api/ai/context/docs', config: { limit: 5 } },
      { id: 'w-sentiment-indicator', type: 'indicator', title: 'Conversation Tone', size: '1x1', dataSource: '/api/sentiment/live', config: { realtime: true } },
    ],
    actions: [
      { id: 'voice-call', label: 'Voice Call', icon: 'Phone', action: 'call:voice', variant: 'ghost' },
      { id: 'video-call', label: 'Video Call', icon: 'Video', action: 'call:video', variant: 'ghost' },
      { id: 'create-task', label: 'Create Task', icon: 'ListTodo', action: 'modal:create-task-from-chat', variant: 'secondary' },
      { id: 'export-chat', label: 'Export', icon: 'Download', action: 'export:conversation', variant: 'ghost' },
    ],
    breadcrumb: [{ label: 'Home', path: '/' }, { label: 'Conversations', path: '/conversations' }],
    meta: { keywords: ['chat', 'conversation', 'message', 'talk'], priority: 2 },
  },

  tasks: {
    id: 'tasks', title: 'Task Board', description: 'Manage and track AI employee tasks',
    icon: 'KanbanSquare', path: '/tasks', layout: 'sidebar',
    requiredRole: ['user', 'admin', 'owner'],
    features: ['kanban', 'list', 'calendar', 'timeline', 'filters', 'bulk_actions', 'assignments', 'dependencies'],
    sections: [
      { id: 'task-filters', title: 'Filters', component: 'TaskFilterBar', layout: 'grid', collapsible: false, defaultOpen: true },
      { id: 'task-board', title: 'Board', component: 'KanbanBoard', layout: 'kanban', collapsible: false, defaultOpen: true },
      { id: 'task-timeline', title: 'Timeline', component: 'TaskTimeline', layout: 'timeline', collapsible: true, defaultOpen: false },
      { id: 'task-calendar', title: 'Calendar', component: 'TaskCalendar', layout: 'calendar', collapsible: true, defaultOpen: false },
    ],
    widgets: [
      { id: 'w-task-stats', type: 'metric-group', title: 'Task Statistics', size: 'full', dataSource: '/api/ai/tasks/stats', config: { metrics: ['pending', 'in_progress', 'completed', 'overdue'] } },
      { id: 'w-my-tasks', type: 'list', title: 'My Assigned Tasks', size: '1x2', dataSource: '/api/ai/tasks/mine', config: { limit: 10 } },
    ],
    actions: [
      { id: 'create-task', label: 'New Task', icon: 'Plus', action: 'modal:create-task', variant: 'primary', shortcut: 'Ctrl+T' },
      { id: 'view-toggle', label: 'Toggle View', icon: 'LayoutGrid', action: 'toggle:view-mode', variant: 'ghost' },
      { id: 'bulk-assign', label: 'Bulk Assign', icon: 'Users', action: 'modal:bulk-assign', variant: 'secondary' },
    ],
    breadcrumb: [{ label: 'Home', path: '/' }, { label: 'Tasks', path: '/tasks' }],
    meta: { keywords: ['tasks', 'board', 'kanban', 'todo'], priority: 2 },
  },

  workflows: {
    id: 'workflows', title: 'Workflow Builder', description: 'Design and automate multi-step AI workflows',
    icon: 'GitBranch', path: '/workflows/:workflowId?', layout: 'full-width',
    requiredRole: ['admin', 'owner'],
    features: ['visual_editor', 'dag_builder', 'templates', 'testing', 'versioning', 'scheduling', 'monitoring'],
    sections: [
      { id: 'workflow-list', title: 'Workflows', component: 'WorkflowList', layout: 'list', collapsible: true, defaultOpen: true },
      { id: 'canvas', title: 'Workflow Canvas', component: 'WorkflowCanvas', layout: 'grid', collapsible: false, defaultOpen: true },
      { id: 'node-palette', title: 'Node Palette', component: 'NodePalette', layout: 'list', collapsible: true, defaultOpen: true },
      { id: 'properties', title: 'Properties', component: 'NodeProperties', layout: 'tabs', collapsible: true, defaultOpen: true },
      { id: 'execution-log', title: 'Execution Log', component: 'ExecutionLog', layout: 'list', collapsible: true, defaultOpen: false },
    ],
    widgets: [
      { id: 'w-workflow-stats', type: 'metric-group', title: 'Workflow Stats', size: '2x1', dataSource: '/api/pipelines/stats', config: { metrics: ['active', 'success_rate', 'avg_duration'] } },
      { id: 'w-recent-runs', type: 'list', title: 'Recent Runs', size: '1x2', dataSource: '/api/pipelines/runs/recent', config: { limit: 10 } },
    ],
    actions: [
      { id: 'new-workflow', label: 'New Workflow', icon: 'Plus', action: 'create:workflow', variant: 'primary' },
      { id: 'run-workflow', label: 'Run', icon: 'Play', action: 'execute:workflow', variant: 'primary', shortcut: 'Ctrl+Enter' },
      { id: 'save-workflow', label: 'Save', icon: 'Save', action: 'save:workflow', variant: 'ghost', shortcut: 'Ctrl+S' },
      { id: 'import-template', label: 'Templates', icon: 'Library', action: 'modal:workflow-templates', variant: 'secondary' },
    ],
    breadcrumb: [{ label: 'Home', path: '/' }, { label: 'Workflows', path: '/workflows' }],
    meta: { keywords: ['workflow', 'automation', 'pipeline', 'builder'], priority: 3 },
  },

  analytics: {
    id: 'analytics', title: 'Analytics Dashboard', description: 'Comprehensive analytics and reporting',
    icon: 'BarChart3', path: '/analytics', layout: 'sidebar',
    requiredRole: ['admin', 'owner'],
    features: ['metrics', 'charts', 'reports', 'export', 'custom_dashboards', 'alerts', 'drill_down'],
    sections: [
      { id: 'kpi-row', title: 'Key Performance Indicators', component: 'KPIRow', layout: 'grid', collapsible: false, defaultOpen: true, columns: 4 },
      { id: 'charts', title: 'Analytics Charts', component: 'ChartGrid', layout: 'grid', collapsible: false, defaultOpen: true, columns: 2 },
      { id: 'employee-performance', title: 'Employee Performance', component: 'PerformanceTable', layout: 'grid', collapsible: true, defaultOpen: true },
      { id: 'usage-breakdown', title: 'Usage Breakdown', component: 'UsageBreakdown', layout: 'tabs', collapsible: true, defaultOpen: true },
      { id: 'reports', title: 'Reports', component: 'ReportBuilder', layout: 'grid', collapsible: true, defaultOpen: false },
    ],
    widgets: [
      { id: 'w-total-tasks', type: 'metric', title: 'Total Tasks', size: '1x1', refreshInterval: 60000, dataSource: '/api/analytics/tasks/total', config: { format: 'number', trend: true, period: '30d' } },
      { id: 'w-resolution-rate', type: 'metric', title: 'Resolution Rate', size: '1x1', refreshInterval: 60000, dataSource: '/api/analytics/resolution-rate', config: { format: 'percent', trend: true } },
      { id: 'w-avg-response-time', type: 'metric', title: 'Avg Response Time', size: '1x1', refreshInterval: 60000, dataSource: '/api/analytics/response-time', config: { format: 'duration', trend: true } },
      { id: 'w-roi', type: 'metric', title: 'ROI', size: '1x1', refreshInterval: 300000, dataSource: '/api/analytics/roi', config: { format: 'percent', trend: true } },
      { id: 'w-task-trend', type: 'chart', title: 'Task Volume Trend', size: '2x1', refreshInterval: 300000, dataSource: '/api/analytics/tasks/trend', config: { chartType: 'area', period: '30d' } },
      { id: 'w-category-dist', type: 'chart', title: 'Category Distribution', size: '2x1', refreshInterval: 300000, dataSource: '/api/analytics/categories', config: { chartType: 'donut' } },
      { id: 'w-satisfaction-trend', type: 'chart', title: 'Satisfaction Trend', size: '2x1', refreshInterval: 300000, dataSource: '/api/sentiment/analytics', config: { chartType: 'line', period: '30d' } },
      { id: 'w-employee-ranking', type: 'leaderboard', title: 'Top Performers', size: '1x2', refreshInterval: 300000, dataSource: '/api/analytics/leaderboard', config: { limit: 10 } },
    ],
    actions: [
      { id: 'date-range', label: 'Date Range', icon: 'Calendar', action: 'modal:date-picker', variant: 'ghost' },
      { id: 'export-report', label: 'Export Report', icon: 'Download', action: 'export:analytics', variant: 'secondary' },
      { id: 'custom-dashboard', label: 'Customize', icon: 'Settings2', action: 'modal:customize-dashboard', variant: 'ghost' },
    ],
    breadcrumb: [{ label: 'Home', path: '/' }, { label: 'Analytics', path: '/analytics' }],
    meta: { keywords: ['analytics', 'reports', 'metrics', 'performance'], priority: 2 },
  },

  billing: {
    id: 'billing', title: 'Billing Center', description: 'Manage subscriptions, invoices, and payment methods',
    icon: 'CreditCard', path: '/billing', layout: 'sidebar',
    requiredRole: ['admin', 'owner'],
    features: ['subscription', 'invoices', 'payment_methods', 'usage', 'cost_optimization', 'receipts'],
    sections: [
      { id: 'plan-overview', title: 'Current Plan', component: 'PlanOverview', layout: 'grid', collapsible: false, defaultOpen: true, columns: 2 },
      { id: 'usage-meters', title: 'Usage This Period', component: 'UsageMeters', layout: 'grid', collapsible: false, defaultOpen: true, columns: 4 },
      { id: 'invoices', title: 'Invoices', component: 'InvoiceTable', layout: 'list', collapsible: true, defaultOpen: true },
      { id: 'payment-methods', title: 'Payment Methods', component: 'PaymentMethodList', layout: 'list', collapsible: true, defaultOpen: true },
      { id: 'cost-breakdown', title: 'Cost Breakdown', component: 'CostBreakdownChart', layout: 'grid', collapsible: true, defaultOpen: true, columns: 2 },
    ],
    widgets: [
      { id: 'w-current-bill', type: 'metric', title: 'Current Bill', size: '1x1', refreshInterval: 300000, dataSource: '/api/billing/current', config: { format: 'currency' } },
      { id: 'w-next-payment', type: 'metric', title: 'Next Payment', size: '1x1', dataSource: '/api/billing/next-payment', config: { format: 'date' } },
      { id: 'w-usage-percent', type: 'gauge', title: 'Plan Usage', size: '1x1', refreshInterval: 60000, dataSource: '/api/billing/usage-percent', config: { min: 0, max: 100, thresholds: [75, 90] } },
    ],
    actions: [
      { id: 'upgrade-plan', label: 'Upgrade Plan', icon: 'ArrowUpCircle', action: 'modal:upgrade-plan', variant: 'primary' },
      { id: 'add-payment', label: 'Add Payment Method', icon: 'Plus', action: 'modal:add-payment', variant: 'secondary' },
      { id: 'download-invoice', label: 'Download All', icon: 'Download', action: 'export:invoices', variant: 'ghost' },
    ],
    breadcrumb: [{ label: 'Home', path: '/' }, { label: 'Billing', path: '/billing' }],
    meta: { keywords: ['billing', 'payment', 'subscription', 'invoice'], priority: 3 },
  },

  admin: {
    id: 'admin', title: 'Admin Portal', description: 'System administration and configuration',
    icon: 'Shield', path: '/admin/:section?', layout: 'sidebar',
    requiredRole: ['admin', 'owner'],
    features: ['user_management', 'rbac', 'audit_logs', 'security', 'integrations', 'system_health', 'fleet_config', 'impersonation'],
    sections: [
      { id: 'admin-nav', title: 'Administration', component: 'AdminNav', layout: 'list', collapsible: false, defaultOpen: true },
      { id: 'users', title: 'User Management', component: 'UserManagement', layout: 'grid', collapsible: true, defaultOpen: true },
      { id: 'roles-permissions', title: 'Roles & Permissions', component: 'RBACEditor', layout: 'grid', collapsible: true, defaultOpen: false },
      { id: 'audit-log', title: 'Audit Log', component: 'AuditLogTable', layout: 'list', collapsible: true, defaultOpen: false },
      { id: 'security', title: 'Security Settings', component: 'SecuritySettings', layout: 'tabs', collapsible: true, defaultOpen: false },
      { id: 'integrations', title: 'Integrations', component: 'IntegrationManager', layout: 'grid', collapsible: true, defaultOpen: false, columns: 3 },
      { id: 'system-health', title: 'System Health', component: 'SystemHealthDashboard', layout: 'grid', collapsible: true, defaultOpen: false, columns: 2 },
      { id: 'fleet-config', title: 'Fleet Configuration', component: 'FleetConfigEditor', layout: 'tabs', collapsible: true, defaultOpen: false },
    ],
    widgets: [
      { id: 'w-users-online', type: 'metric', title: 'Users Online', size: '1x1', refreshInterval: 30000, dataSource: '/api/admin-v2/stats/online', config: { format: 'number' } },
      { id: 'w-system-status', type: 'status', title: 'System Status', size: '1x1', refreshInterval: 30000, dataSource: '/api/admin-v2/health', config: {} },
      { id: 'w-security-score', type: 'gauge', title: 'Security Score', size: '1x1', refreshInterval: 300000, dataSource: '/api/security/score', config: { min: 0, max: 100 } },
      { id: 'w-api-usage', type: 'chart', title: 'API Usage', size: '2x1', refreshInterval: 60000, dataSource: '/api/admin-v2/stats/api', config: { chartType: 'bar', period: '24h' } },
    ],
    actions: [
      { id: 'invite-user', label: 'Invite User', icon: 'UserPlus', action: 'modal:invite-user', variant: 'primary' },
      { id: 'export-audit', label: 'Export Audit Log', icon: 'Download', action: 'export:audit-log', variant: 'ghost' },
      { id: 'run-health-check', label: 'Health Check', icon: 'HeartPulse', action: 'run:health-check', variant: 'secondary' },
    ],
    breadcrumb: [{ label: 'Home', path: '/' }, { label: 'Admin', path: '/admin' }],
    meta: { keywords: ['admin', 'settings', 'users', 'security', 'configuration'], priority: 4 },
  },
};

// ─── Component Hierarchy ────────────────────────────────────────────

interface ComponentDefinition {
  name: string;
  category: ComponentCategory;
  description: string;
  props: PropDefinition[];
  variants: string[];
  sizes: string[];
  states: string[];
  slots?: string[];
  accessibility: { role?: string; ariaLabel?: boolean; keyboard?: string[] };
  dependencies: string[];
}

interface PropDefinition {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  description: string;
}

const COMPONENT_REGISTRY: Record<string, ComponentDefinition> = {
  // Primitives
  Button: {
    name: 'Button', category: 'primitive', description: 'Interactive button element',
    props: [
      { name: 'variant', type: "'primary' | 'secondary' | 'ghost' | 'danger' | 'link'", required: false, default: 'primary', description: 'Visual style variant' },
      { name: 'size', type: "'xs' | 'sm' | 'md' | 'lg' | 'xl'", required: false, default: 'md', description: 'Button size' },
      { name: 'loading', type: 'boolean', required: false, default: false, description: 'Show loading spinner' },
      { name: 'disabled', type: 'boolean', required: false, default: false, description: 'Disable interaction' },
      { name: 'icon', type: 'ReactNode', required: false, description: 'Leading icon' },
      { name: 'iconRight', type: 'ReactNode', required: false, description: 'Trailing icon' },
      { name: 'fullWidth', type: 'boolean', required: false, default: false, description: 'Full container width' },
    ],
    variants: ['primary', 'secondary', 'ghost', 'danger', 'link'], sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
    states: ['default', 'hover', 'active', 'focus', 'disabled', 'loading'],
    accessibility: { role: 'button', ariaLabel: true, keyboard: ['Enter', 'Space'] },
    dependencies: [],
  },
  Input: {
    name: 'Input', category: 'primitive', description: 'Text input field',
    props: [
      { name: 'type', type: 'string', required: false, default: 'text', description: 'Input type' },
      { name: 'label', type: 'string', required: false, description: 'Field label' },
      { name: 'error', type: 'string', required: false, description: 'Error message' },
      { name: 'hint', type: 'string', required: false, description: 'Helper text' },
      { name: 'prefix', type: 'ReactNode', required: false, description: 'Prefix element' },
      { name: 'suffix', type: 'ReactNode', required: false, description: 'Suffix element' },
    ],
    variants: ['default', 'filled', 'flushed'], sizes: ['sm', 'md', 'lg'],
    states: ['default', 'focus', 'error', 'disabled', 'readonly'],
    accessibility: { role: 'textbox', ariaLabel: true, keyboard: ['Tab'] },
    dependencies: [],
  },
  Badge: {
    name: 'Badge', category: 'primitive', description: 'Status indicator badge',
    props: [
      { name: 'variant', type: "'solid' | 'subtle' | 'outline' | 'dot'", required: false, default: 'subtle', description: 'Style variant' },
      { name: 'color', type: "'brand' | 'success' | 'warning' | 'danger' | 'neutral'", required: false, default: 'neutral', description: 'Color theme' },
    ],
    variants: ['solid', 'subtle', 'outline', 'dot'], sizes: ['sm', 'md', 'lg'],
    states: ['default'], accessibility: { role: 'status', ariaLabel: true, keyboard: [] },
    dependencies: [],
  },
  Avatar: {
    name: 'Avatar', category: 'primitive', description: 'User or AI employee avatar',
    props: [
      { name: 'src', type: 'string', required: false, description: 'Image URL' },
      { name: 'name', type: 'string', required: true, description: 'Display name for fallback' },
      { name: 'status', type: "'online' | 'offline' | 'busy' | 'away'", required: false, description: 'Status indicator' },
      { name: 'isAI', type: 'boolean', required: false, default: false, description: 'Show AI badge' },
    ],
    variants: ['circle', 'rounded', 'square'], sizes: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
    states: ['default', 'loading', 'error'], accessibility: { role: 'img', ariaLabel: true, keyboard: [] },
    dependencies: [],
  },

  // Composites
  DataTable: {
    name: 'DataTable', category: 'composite', description: 'Sortable, filterable data table with pagination',
    props: [
      { name: 'columns', type: 'ColumnDef[]', required: true, description: 'Column definitions' },
      { name: 'data', type: 'T[]', required: true, description: 'Row data' },
      { name: 'sortable', type: 'boolean', required: false, default: true, description: 'Enable sorting' },
      { name: 'filterable', type: 'boolean', required: false, default: true, description: 'Enable filtering' },
      { name: 'paginated', type: 'boolean', required: false, default: true, description: 'Enable pagination' },
      { name: 'selectable', type: 'boolean', required: false, default: false, description: 'Enable row selection' },
      { name: 'onRowClick', type: '(row: T) => void', required: false, description: 'Row click handler' },
    ],
    variants: ['default', 'compact', 'comfortable'], sizes: ['sm', 'md', 'lg'],
    states: ['default', 'loading', 'empty', 'error'],
    accessibility: { role: 'grid', ariaLabel: true, keyboard: ['ArrowUp', 'ArrowDown', 'Enter', 'Space'] },
    dependencies: ['Button', 'Input', 'Badge', 'Checkbox'],
  },
  KanbanBoard: {
    name: 'KanbanBoard', category: 'composite', description: 'Drag-and-drop Kanban board',
    props: [
      { name: 'columns', type: 'KanbanColumn[]', required: true, description: 'Column definitions with cards' },
      { name: 'onCardMove', type: '(cardId, fromCol, toCol) => void', required: true, description: 'Card move handler' },
      { name: 'renderCard', type: '(card) => ReactNode', required: false, description: 'Custom card renderer' },
    ],
    variants: ['default', 'compact', 'swimlane'], sizes: ['sm', 'md'],
    states: ['default', 'loading', 'dragging', 'empty'],
    accessibility: { role: 'application', ariaLabel: true, keyboard: ['ArrowLeft', 'ArrowRight', 'Space'] },
    dependencies: ['Card', 'Badge', 'Avatar', 'Button'],
  },
  ChatInterface: {
    name: 'ChatInterface', category: 'composite', description: 'Real-time chat interface with AI employees',
    props: [
      { name: 'employeeId', type: 'string', required: true, description: 'AI employee ID' },
      { name: 'conversationId', type: 'string', required: false, description: 'Existing conversation' },
      { name: 'onTaskCreate', type: '(task) => void', required: false, description: 'Task creation from chat' },
      { name: 'showAvatar', type: 'boolean', required: false, default: true, description: 'Show 3D avatar' },
    ],
    variants: ['full', 'compact', 'embedded'], sizes: ['sm', 'md', 'lg'],
    states: ['default', 'loading', 'streaming', 'error', 'offline'],
    slots: ['header', 'messages', 'input', 'sidebar', 'avatar-panel'],
    accessibility: { role: 'log', ariaLabel: true, keyboard: ['Enter', 'Shift+Enter', 'Escape'] },
    dependencies: ['Avatar', 'Button', 'Input', 'Badge', 'MarkdownRenderer', 'FileUpload', 'VoiceRecorder'],
  },
  WorkflowCanvas: {
    name: 'WorkflowCanvas', category: 'composite', description: 'Visual DAG workflow editor',
    props: [
      { name: 'workflow', type: 'Workflow', required: true, description: 'Workflow definition' },
      { name: 'onNodeAdd', type: '(type, position) => void', required: true, description: 'Node add handler' },
      { name: 'onEdgeConnect', type: '(from, to) => void', required: true, description: 'Edge connect handler' },
      { name: 'readOnly', type: 'boolean', required: false, default: false, description: 'Read-only mode' },
    ],
    variants: ['default', 'minimap', 'fullscreen'], sizes: ['md', 'lg'],
    states: ['default', 'editing', 'running', 'error', 'readonly'],
    accessibility: { role: 'application', ariaLabel: true, keyboard: ['Delete', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+C', 'Ctrl+V'] },
    dependencies: ['Button', 'Input', 'Badge', 'ContextMenu', 'Tooltip'],
  },

  // Layout
  AppShell: {
    name: 'AppShell', category: 'layout', description: 'Main application shell with sidebar and header',
    props: [
      { name: 'sidebar', type: 'ReactNode', required: true, description: 'Sidebar content' },
      { name: 'header', type: 'ReactNode', required: true, description: 'Header content' },
      { name: 'sidebarCollapsed', type: 'boolean', required: false, default: false, description: 'Sidebar collapsed state' },
    ],
    variants: ['default', 'compact', 'full-width'], sizes: [],
    states: ['default', 'sidebar-collapsed', 'sidebar-hidden', 'fullscreen'],
    slots: ['sidebar', 'header', 'main', 'footer', 'command-palette'],
    accessibility: { role: 'application', ariaLabel: true, keyboard: ['Ctrl+B', 'Ctrl+K'] },
    dependencies: ['Sidebar', 'Header', 'Breadcrumb', 'CommandPalette'],
  },
  Sidebar: {
    name: 'Sidebar', category: 'navigation', description: 'Collapsible navigation sidebar',
    props: [
      { name: 'items', type: 'NavItem[]', required: true, description: 'Navigation items' },
      { name: 'collapsed', type: 'boolean', required: false, default: false, description: 'Collapsed state' },
      { name: 'activeItem', type: 'string', required: false, description: 'Active navigation item' },
    ],
    variants: ['default', 'compact', 'floating'], sizes: [],
    states: ['expanded', 'collapsed', 'mobile-open', 'mobile-closed'],
    accessibility: { role: 'navigation', ariaLabel: true, keyboard: ['ArrowUp', 'ArrowDown', 'Enter'] },
    dependencies: ['Avatar', 'Badge', 'Tooltip'],
  },
  Header: {
    name: 'Header', category: 'navigation', description: 'Application header with search and actions',
    props: [
      { name: 'title', type: 'string', required: false, description: 'Page title' },
      { name: 'breadcrumbs', type: 'Breadcrumb[]', required: false, description: 'Breadcrumb items' },
      { name: 'actions', type: 'ReactNode', required: false, description: 'Action buttons' },
    ],
    variants: ['default', 'transparent', 'sticky'], sizes: [],
    states: ['default', 'scrolled', 'search-active'],
    accessibility: { role: 'banner', ariaLabel: true, keyboard: ['Ctrl+K'] },
    dependencies: ['Button', 'Input', 'Avatar', 'Badge', 'Breadcrumb', 'NotificationBell'],
  },

  // Feedback
  Toast: {
    name: 'Toast', category: 'feedback', description: 'Temporary notification toast',
    props: [
      { name: 'type', type: "'success' | 'error' | 'warning' | 'info'", required: true, description: 'Toast type' },
      { name: 'title', type: 'string', required: true, description: 'Toast title' },
      { name: 'description', type: 'string', required: false, description: 'Toast description' },
      { name: 'duration', type: 'number', required: false, default: 5000, description: 'Auto-dismiss duration' },
      { name: 'action', type: '{ label: string; onClick: () => void }', required: false, description: 'Action button' },
    ],
    variants: ['default', 'compact', 'persistent'], sizes: ['sm', 'md'],
    states: ['entering', 'visible', 'exiting'],
    accessibility: { role: 'alert', ariaLabel: true, keyboard: ['Escape'] },
    dependencies: ['Button'],
  },
  CommandPalette: {
    name: 'CommandPalette', category: 'overlay', description: 'Global command palette (Ctrl+K)',
    props: [
      { name: 'commands', type: 'Command[]', required: true, description: 'Available commands' },
      { name: 'recentCommands', type: 'Command[]', required: false, description: 'Recently used' },
      { name: 'onSelect', type: '(command) => void', required: true, description: 'Command select handler' },
    ],
    variants: ['default'], sizes: ['md', 'lg'],
    states: ['closed', 'open', 'loading', 'empty'],
    accessibility: { role: 'dialog', ariaLabel: true, keyboard: ['Ctrl+K', 'Escape', 'ArrowUp', 'ArrowDown', 'Enter'] },
    dependencies: ['Input', 'Badge'],
  },
};

// ─── State Management Architecture ─────────────────────────────────

interface StoreDefinition {
  slice: StoreSlice;
  description: string;
  initialState: Record<string, any>;
  actions: StoreAction[];
  selectors: StoreSelector[];
  middleware: string[];
  persistence: { enabled: boolean; storage: 'localStorage' | 'indexedDB' | 'none'; key: string };
}

interface StoreAction {
  name: string;
  description: string;
  params: { name: string; type: string }[];
  async: boolean;
  optimistic?: boolean;
}

interface StoreSelector {
  name: string;
  description: string;
  memoized: boolean;
  params?: { name: string; type: string }[];
}

const STATE_ARCHITECTURE: Record<StoreSlice, StoreDefinition> = {
  auth: {
    slice: 'auth', description: 'Authentication and session state',
    initialState: { user: null, token: null, isAuthenticated: false, isLoading: true, permissions: [], tenantId: null },
    actions: [
      { name: 'login', description: 'Authenticate user', params: [{ name: 'credentials', type: 'LoginCredentials' }], async: true },
      { name: 'logout', description: 'Clear session', params: [], async: true },
      { name: 'refreshToken', description: 'Refresh auth token', params: [], async: true },
      { name: 'setPermissions', description: 'Update RBAC permissions', params: [{ name: 'permissions', type: 'Permission[]' }], async: false },
      { name: 'impersonate', description: 'Impersonate another user (admin)', params: [{ name: 'userId', type: 'string' }], async: true },
    ],
    selectors: [
      { name: 'selectUser', description: 'Current user', memoized: true },
      { name: 'selectIsAuthenticated', description: 'Auth status', memoized: true },
      { name: 'selectHasPermission', description: 'Check specific permission', memoized: true, params: [{ name: 'permission', type: 'string' }] },
      { name: 'selectIsAdmin', description: 'Admin status', memoized: true },
    ],
    middleware: ['auth-interceptor', 'token-refresh'],
    persistence: { enabled: true, storage: 'localStorage', key: 'nxh:auth' },
  },
  employees: {
    slice: 'employees', description: 'AI employee state',
    initialState: { employees: [], selectedEmployee: null, isLoading: false, filters: {}, total: 0 },
    actions: [
      { name: 'fetchEmployees', description: 'Load employee list', params: [{ name: 'filters', type: 'EmployeeFilters' }], async: true },
      { name: 'hireEmployee', description: 'Deploy new AI employee', params: [{ name: 'config', type: 'HireConfig' }], async: true },
      { name: 'updateEmployee', description: 'Update employee config', params: [{ name: 'id', type: 'string' }, { name: 'updates', type: 'Partial<Employee>' }], async: true },
      { name: 'terminateEmployee', description: 'Deactivate AI employee', params: [{ name: 'id', type: 'string' }], async: true },
      { name: 'selectEmployee', description: 'Set selected employee', params: [{ name: 'id', type: 'string' }], async: false },
    ],
    selectors: [
      { name: 'selectEmployees', description: 'All employees', memoized: true },
      { name: 'selectActiveEmployees', description: 'Active employees only', memoized: true },
      { name: 'selectEmployeeById', description: 'Employee by ID', memoized: true, params: [{ name: 'id', type: 'string' }] },
      { name: 'selectEmployeesByCategory', description: 'Employees by category', memoized: true, params: [{ name: 'category', type: 'string' }] },
    ],
    middleware: ['optimistic-update', 'cache'],
    persistence: { enabled: true, storage: 'indexedDB', key: 'nxh:employees' },
  },
  conversations: {
    slice: 'conversations', description: 'Chat conversation state',
    initialState: { conversations: [], activeConversation: null, messages: {}, isStreaming: false, unreadCount: 0 },
    actions: [
      { name: 'fetchConversations', description: 'Load conversation list', params: [], async: true },
      { name: 'openConversation', description: 'Open/create conversation', params: [{ name: 'employeeId', type: 'string' }], async: true },
      { name: 'sendMessage', description: 'Send message', params: [{ name: 'content', type: 'string' }, { name: 'attachments', type: 'File[]' }], async: true, optimistic: true },
      { name: 'streamResponse', description: 'Handle streaming AI response', params: [{ name: 'conversationId', type: 'string' }], async: true },
      { name: 'markRead', description: 'Mark conversation as read', params: [{ name: 'conversationId', type: 'string' }], async: true, optimistic: true },
    ],
    selectors: [
      { name: 'selectConversations', description: 'All conversations', memoized: true },
      { name: 'selectActiveConversation', description: 'Current conversation', memoized: true },
      { name: 'selectMessages', description: 'Messages for conversation', memoized: true, params: [{ name: 'conversationId', type: 'string' }] },
      { name: 'selectUnreadCount', description: 'Total unread messages', memoized: true },
    ],
    middleware: ['websocket-sync', 'optimistic-update', 'message-queue'],
    persistence: { enabled: true, storage: 'indexedDB', key: 'nxh:conversations' },
  },
  tasks: {
    slice: 'tasks', description: 'Task management state',
    initialState: { tasks: [], selectedTask: null, filters: { status: 'all', assignee: 'all' }, viewMode: 'kanban', total: 0 },
    actions: [
      { name: 'fetchTasks', description: 'Load tasks', params: [{ name: 'filters', type: 'TaskFilters' }], async: true },
      { name: 'createTask', description: 'Create new task', params: [{ name: 'task', type: 'CreateTaskInput' }], async: true },
      { name: 'updateTask', description: 'Update task', params: [{ name: 'id', type: 'string' }, { name: 'updates', type: 'Partial<Task>' }], async: true, optimistic: true },
      { name: 'moveTask', description: 'Move task between columns', params: [{ name: 'id', type: 'string' }, { name: 'status', type: 'TaskStatus' }], async: true, optimistic: true },
      { name: 'assignTask', description: 'Assign task to employee', params: [{ name: 'taskId', type: 'string' }, { name: 'employeeId', type: 'string' }], async: true },
      { name: 'setViewMode', description: 'Toggle view mode', params: [{ name: 'mode', type: "'kanban' | 'list' | 'calendar' | 'timeline'" }], async: false },
    ],
    selectors: [
      { name: 'selectTasks', description: 'Filtered tasks', memoized: true },
      { name: 'selectTasksByStatus', description: 'Tasks grouped by status', memoized: true },
      { name: 'selectOverdueTasks', description: 'Overdue tasks', memoized: true },
      { name: 'selectTaskStats', description: 'Task statistics', memoized: true },
    ],
    middleware: ['optimistic-update', 'realtime-sync'],
    persistence: { enabled: true, storage: 'indexedDB', key: 'nxh:tasks' },
  },
  workflows: {
    slice: 'workflows', description: 'Workflow builder state',
    initialState: { workflows: [], activeWorkflow: null, nodes: [], edges: [], selectedNode: null, isRunning: false, history: [] },
    actions: [
      { name: 'fetchWorkflows', description: 'Load workflows', params: [], async: true },
      { name: 'createWorkflow', description: 'Create new workflow', params: [{ name: 'config', type: 'WorkflowConfig' }], async: true },
      { name: 'addNode', description: 'Add node to canvas', params: [{ name: 'type', type: 'string' }, { name: 'position', type: 'Position' }], async: false },
      { name: 'connectNodes', description: 'Add edge between nodes', params: [{ name: 'from', type: 'string' }, { name: 'to', type: 'string' }], async: false },
      { name: 'executeWorkflow', description: 'Run workflow', params: [{ name: 'id', type: 'string' }], async: true },
      { name: 'undo', description: 'Undo last action', params: [], async: false },
      { name: 'redo', description: 'Redo last undone action', params: [], async: false },
    ],
    selectors: [
      { name: 'selectWorkflows', description: 'All workflows', memoized: true },
      { name: 'selectActiveWorkflow', description: 'Current workflow', memoized: true },
      { name: 'selectNodes', description: 'Canvas nodes', memoized: true },
      { name: 'selectEdges', description: 'Canvas edges', memoized: true },
      { name: 'selectCanUndo', description: 'Undo available', memoized: true },
    ],
    middleware: ['undo-redo', 'autosave', 'validation'],
    persistence: { enabled: true, storage: 'indexedDB', key: 'nxh:workflows' },
  },
  analytics: {
    slice: 'analytics', description: 'Analytics and reporting state',
    initialState: { metrics: {}, charts: {}, dateRange: { start: null, end: null, preset: '30d' }, isLoading: false, customDashboard: null },
    actions: [
      { name: 'fetchMetrics', description: 'Load analytics metrics', params: [{ name: 'dateRange', type: 'DateRange' }], async: true },
      { name: 'fetchChart', description: 'Load chart data', params: [{ name: 'chartId', type: 'string' }, { name: 'params', type: 'ChartParams' }], async: true },
      { name: 'setDateRange', description: 'Update date range', params: [{ name: 'range', type: 'DateRange' }], async: false },
      { name: 'exportReport', description: 'Generate and export report', params: [{ name: 'format', type: "'pdf' | 'csv' | 'xlsx'" }], async: true },
      { name: 'saveDashboard', description: 'Save custom dashboard', params: [{ name: 'config', type: 'DashboardConfig' }], async: true },
    ],
    selectors: [
      { name: 'selectMetrics', description: 'All metrics', memoized: true },
      { name: 'selectChart', description: 'Chart data by ID', memoized: true, params: [{ name: 'chartId', type: 'string' }] },
      { name: 'selectDateRange', description: 'Current date range', memoized: true },
      { name: 'selectTrend', description: 'Metric trend', memoized: true, params: [{ name: 'metric', type: 'string' }] },
    ],
    middleware: ['cache', 'debounce'],
    persistence: { enabled: false, storage: 'none', key: '' },
  },
  billing: {
    slice: 'billing', description: 'Billing and subscription state',
    initialState: { subscription: null, invoices: [], paymentMethods: [], usage: {}, isLoading: false },
    actions: [
      { name: 'fetchSubscription', description: 'Load subscription', params: [], async: true },
      { name: 'fetchInvoices', description: 'Load invoices', params: [{ name: 'page', type: 'number' }], async: true },
      { name: 'changePlan', description: 'Change subscription plan', params: [{ name: 'planId', type: 'string' }], async: true },
      { name: 'addPaymentMethod', description: 'Add payment method', params: [{ name: 'token', type: 'string' }], async: true },
      { name: 'fetchUsage', description: 'Load usage data', params: [], async: true },
    ],
    selectors: [
      { name: 'selectSubscription', description: 'Current subscription', memoized: true },
      { name: 'selectInvoices', description: 'Invoice list', memoized: true },
      { name: 'selectUsage', description: 'Usage data', memoized: true },
      { name: 'selectIsOverLimit', description: 'Usage limit check', memoized: true },
    ],
    middleware: ['stripe-integration'],
    persistence: { enabled: false, storage: 'none', key: '' },
  },
  admin: {
    slice: 'admin', description: 'Administration state',
    initialState: { users: [], auditLog: [], securityConfig: {}, systemHealth: {}, isLoading: false },
    actions: [
      { name: 'fetchUsers', description: 'Load users', params: [{ name: 'filters', type: 'UserFilters' }], async: true },
      { name: 'inviteUser', description: 'Invite new user', params: [{ name: 'email', type: 'string' }, { name: 'role', type: 'string' }], async: true },
      { name: 'updateUserRole', description: 'Change user role', params: [{ name: 'userId', type: 'string' }, { name: 'role', type: 'string' }], async: true },
      { name: 'fetchAuditLog', description: 'Load audit entries', params: [{ name: 'filters', type: 'AuditFilters' }], async: true },
      { name: 'runHealthCheck', description: 'Run system health check', params: [], async: true },
    ],
    selectors: [
      { name: 'selectUsers', description: 'All users', memoized: true },
      { name: 'selectAuditLog', description: 'Audit log entries', memoized: true },
      { name: 'selectSystemHealth', description: 'System health', memoized: true },
    ],
    middleware: ['audit-log', 'rbac-enforcement'],
    persistence: { enabled: false, storage: 'none', key: '' },
  },
  ui: {
    slice: 'ui', description: 'UI state management',
    initialState: { theme: 'system', sidebarCollapsed: false, commandPaletteOpen: false, activeModal: null, toasts: [], breadcrumbs: [], isMobile: false },
    actions: [
      { name: 'setTheme', description: 'Change theme', params: [{ name: 'theme', type: 'ThemeMode' }], async: false },
      { name: 'toggleSidebar', description: 'Toggle sidebar', params: [], async: false },
      { name: 'openModal', description: 'Open modal', params: [{ name: 'modal', type: 'ModalConfig' }], async: false },
      { name: 'closeModal', description: 'Close modal', params: [], async: false },
      { name: 'addToast', description: 'Show toast notification', params: [{ name: 'toast', type: 'ToastConfig' }], async: false },
      { name: 'removeToast', description: 'Dismiss toast', params: [{ name: 'id', type: 'string' }], async: false },
      { name: 'toggleCommandPalette', description: 'Toggle command palette', params: [], async: false },
    ],
    selectors: [
      { name: 'selectTheme', description: 'Current theme', memoized: true },
      { name: 'selectIsSidebarCollapsed', description: 'Sidebar state', memoized: true },
      { name: 'selectToasts', description: 'Active toasts', memoized: true },
      { name: 'selectActiveModal', description: 'Current modal', memoized: true },
    ],
    middleware: ['theme-sync', 'responsive-observer'],
    persistence: { enabled: true, storage: 'localStorage', key: 'nxh:ui' },
  },
  notifications: {
    slice: 'notifications', description: 'Notification center state',
    initialState: { notifications: [], unreadCount: 0, preferences: {}, isLoading: false },
    actions: [
      { name: 'fetchNotifications', description: 'Load notifications', params: [{ name: 'page', type: 'number' }], async: true },
      { name: 'markAsRead', description: 'Mark notification read', params: [{ name: 'id', type: 'string' }], async: true, optimistic: true },
      { name: 'markAllRead', description: 'Mark all as read', params: [], async: true, optimistic: true },
      { name: 'updatePreferences', description: 'Update notification prefs', params: [{ name: 'prefs', type: 'NotificationPrefs' }], async: true },
      { name: 'dismiss', description: 'Dismiss notification', params: [{ name: 'id', type: 'string' }], async: true, optimistic: true },
    ],
    selectors: [
      { name: 'selectNotifications', description: 'All notifications', memoized: true },
      { name: 'selectUnreadCount', description: 'Unread count', memoized: true },
      { name: 'selectByPriority', description: 'Notifications by priority', memoized: true, params: [{ name: 'priority', type: 'NotificationPriority' }] },
    ],
    middleware: ['websocket-sync', 'push-notification'],
    persistence: { enabled: true, storage: 'indexedDB', key: 'nxh:notifications' },
  },
  marketplace: {
    slice: 'marketplace', description: 'AI employee marketplace state',
    initialState: { roles: [], categories: [], filters: {}, selectedRole: null, compareList: [], isLoading: false },
    actions: [
      { name: 'fetchRoles', description: 'Load available roles', params: [{ name: 'filters', type: 'RoleFilters' }], async: true },
      { name: 'fetchCategories', description: 'Load role categories', params: [], async: true },
      { name: 'searchRoles', description: 'Search roles', params: [{ name: 'query', type: 'string' }], async: true },
      { name: 'addToCompare', description: 'Add role to comparison', params: [{ name: 'roleId', type: 'string' }], async: false },
      { name: 'removeFromCompare', description: 'Remove from comparison', params: [{ name: 'roleId', type: 'string' }], async: false },
      { name: 'selectRole', description: 'Select role for details', params: [{ name: 'roleId', type: 'string' }], async: true },
    ],
    selectors: [
      { name: 'selectRoles', description: 'Filtered roles', memoized: true },
      { name: 'selectCategories', description: 'Role categories', memoized: true },
      { name: 'selectCompareList', description: 'Comparison list', memoized: true },
      { name: 'selectSelectedRole', description: 'Selected role details', memoized: true },
    ],
    middleware: ['search-debounce', 'cache'],
    persistence: { enabled: false, storage: 'none', key: '' },
  },
  preferences: {
    slice: 'preferences', description: 'User preferences state',
    initialState: { locale: 'en', timezone: 'auto', dateFormat: 'MM/DD/YYYY', notifications: {}, accessibility: {} },
    actions: [
      { name: 'fetchPreferences', description: 'Load preferences', params: [], async: true },
      { name: 'updatePreference', description: 'Update single preference', params: [{ name: 'key', type: 'string' }, { name: 'value', type: 'any' }], async: true },
      { name: 'resetPreferences', description: 'Reset to defaults', params: [], async: true },
    ],
    selectors: [
      { name: 'selectPreference', description: 'Get preference by key', memoized: true, params: [{ name: 'key', type: 'string' }] },
      { name: 'selectLocale', description: 'Current locale', memoized: true },
      { name: 'selectTimezone', description: 'Current timezone', memoized: true },
    ],
    middleware: ['sync-to-server'],
    persistence: { enabled: true, storage: 'localStorage', key: 'nxh:preferences' },
  },
};

// ─── Navigation Architecture ────────────────────────────────────────

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: { type: 'count' | 'dot' | 'text'; value?: string | number };
  children?: NavItem[];
  requiredRole: string[];
  section: 'main' | 'secondary' | 'footer';
}

const NAVIGATION: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', path: '/', requiredRole: ['user', 'admin', 'owner'], section: 'main' },
  { id: 'marketplace', label: 'Marketplace', icon: 'Store', path: '/marketplace', requiredRole: ['user', 'admin', 'owner'], section: 'main', badge: { type: 'text', value: 'New' } },
  { id: 'conversations', label: 'Conversations', icon: 'MessageSquare', path: '/conversations', requiredRole: ['user', 'admin', 'owner'], section: 'main', badge: { type: 'count' } },
  { id: 'tasks', label: 'Tasks', icon: 'KanbanSquare', path: '/tasks', requiredRole: ['user', 'admin', 'owner'], section: 'main', badge: { type: 'count' } },
  { id: 'workflows', label: 'Workflows', icon: 'GitBranch', path: '/workflows', requiredRole: ['admin', 'owner'], section: 'main' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3', path: '/analytics', requiredRole: ['admin', 'owner'], section: 'secondary' },
  { id: 'billing', label: 'Billing', icon: 'CreditCard', path: '/billing', requiredRole: ['admin', 'owner'], section: 'secondary' },
  { id: 'admin', label: 'Admin', icon: 'Shield', path: '/admin', requiredRole: ['admin', 'owner'], section: 'secondary', children: [
    { id: 'admin-users', label: 'Users', icon: 'Users', path: '/admin/users', requiredRole: ['admin', 'owner'], section: 'secondary' },
    { id: 'admin-roles', label: 'Roles & Permissions', icon: 'Key', path: '/admin/roles', requiredRole: ['owner'], section: 'secondary' },
    { id: 'admin-security', label: 'Security', icon: 'Lock', path: '/admin/security', requiredRole: ['admin', 'owner'], section: 'secondary' },
    { id: 'admin-integrations', label: 'Integrations', icon: 'Plug', path: '/admin/integrations', requiredRole: ['admin', 'owner'], section: 'secondary' },
    { id: 'admin-audit', label: 'Audit Log', icon: 'FileText', path: '/admin/audit', requiredRole: ['admin', 'owner'], section: 'secondary' },
    { id: 'admin-health', label: 'System Health', icon: 'HeartPulse', path: '/admin/health', requiredRole: ['admin', 'owner'], section: 'secondary' },
  ]},
  { id: 'help', label: 'Help Center', icon: 'HelpCircle', path: '/help', requiredRole: ['user', 'admin', 'owner'], section: 'footer' },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings', requiredRole: ['user', 'admin', 'owner'], section: 'footer' },
];

// ─── Keyboard Shortcuts ─────────────────────────────────────────────

const KEYBOARD_SHORTCUTS = [
  { key: 'Ctrl+K', action: 'open:command-palette', description: 'Open command palette', global: true },
  { key: 'Ctrl+B', action: 'toggle:sidebar', description: 'Toggle sidebar', global: true },
  { key: 'Ctrl+N', action: 'navigate:/marketplace', description: 'Hire new employee', global: true },
  { key: 'Ctrl+T', action: 'modal:create-task', description: 'Create new task', global: true },
  { key: 'Ctrl+J', action: 'modal:quick-chat', description: 'Quick chat', global: true },
  { key: 'Ctrl+/', action: 'open:shortcuts-modal', description: 'Show keyboard shortcuts', global: true },
  { key: 'Escape', action: 'close:modal', description: 'Close modal/overlay', global: true },
  { key: 'G then D', action: 'navigate:/', description: 'Go to Dashboard', global: true },
  { key: 'G then M', action: 'navigate:/marketplace', description: 'Go to Marketplace', global: true },
  { key: 'G then C', action: 'navigate:/conversations', description: 'Go to Conversations', global: true },
  { key: 'G then T', action: 'navigate:/tasks', description: 'Go to Tasks', global: true },
  { key: 'G then W', action: 'navigate:/workflows', description: 'Go to Workflows', global: true },
  { key: 'G then A', action: 'navigate:/analytics', description: 'Go to Analytics', global: true },
];

// ─── Form System ────────────────────────────────────────────────────

interface FormDefinition {
  id: string;
  title: string;
  steps?: FormStep[];
  fields: FormField[];
  validation: ValidationRule[];
  onSubmit: string;
}

interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: string[];
  validationGroup?: string;
}

interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: ValidationRule[];
  options?: { label: string; value: string }[];
  conditional?: { field: string; operator: 'eq' | 'neq' | 'in'; value: any };
  helpText?: string;
  defaultValue?: any;
}

interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'min' | 'max' | 'custom';
  value?: any;
  message: string;
}

const FORM_REGISTRY: Record<string, FormDefinition> = {
  'create-task': {
    id: 'create-task', title: 'Create New Task',
    fields: [
      { id: 'title', type: 'text', label: 'Task Title', placeholder: 'Enter task title...', required: true, validation: [{ type: 'required', message: 'Title is required' }, { type: 'maxLength', value: 200, message: 'Max 200 characters' }] },
      { id: 'description', type: 'rich-text', label: 'Description', placeholder: 'Describe the task...', required: false },
      { id: 'assignee', type: 'select', label: 'Assign To', required: true, options: [] },
      { id: 'priority', type: 'select', label: 'Priority', required: true, options: [{ label: 'Urgent', value: 'urgent' }, { label: 'High', value: 'high' }, { label: 'Medium', value: 'medium' }, { label: 'Low', value: 'low' }], defaultValue: 'medium' },
      { id: 'due_date', type: 'datetime', label: 'Due Date', required: false },
      { id: 'tags', type: 'tag-input', label: 'Tags', required: false },
      { id: 'attachments', type: 'file', label: 'Attachments', required: false },
    ],
    validation: [{ type: 'required', message: 'Title and assignee are required' }],
    onSubmit: 'tasks/createTask',
  },
  'hire-employee': {
    id: 'hire-employee', title: 'Hire AI Employee',
    steps: [
      { id: 'role', title: 'Select Role', description: 'Choose the AI employee role', fields: ['role_id', 'industry'] },
      { id: 'config', title: 'Configure', description: 'Customize the AI employee', fields: ['name', 'personality', 'language', 'skills'] },
      { id: 'avatar', title: 'Avatar', description: 'Set up the visual appearance', fields: ['avatar_source', 'avatar_config'] },
      { id: 'integrations', title: 'Integrations', description: 'Connect tools and services', fields: ['integrations'] },
      { id: 'review', title: 'Review & Deploy', description: 'Review and deploy', fields: [] },
    ],
    fields: [
      { id: 'role_id', type: 'select', label: 'Role', required: true, options: [] },
      { id: 'industry', type: 'select', label: 'Industry', required: false, options: [{ label: 'General', value: 'general' }, { label: 'Healthcare', value: 'healthcare' }, { label: 'Legal', value: 'legal' }, { label: 'Real Estate', value: 'real_estate' }, { label: 'Construction', value: 'construction' }, { label: 'Financial Services', value: 'financial' }] },
      { id: 'name', type: 'text', label: 'Employee Name', placeholder: 'e.g., Sarah (Sales Lead)', required: true },
      { id: 'personality', type: 'select', label: 'Personality', required: true, options: [{ label: 'Professional', value: 'professional' }, { label: 'Friendly', value: 'friendly' }, { label: 'Assertive', value: 'assertive' }, { label: 'Empathetic', value: 'empathetic' }, { label: 'Technical', value: 'technical' }] },
      { id: 'language', type: 'multiselect', label: 'Languages', required: true, options: [{ label: 'English', value: 'en' }, { label: 'Spanish', value: 'es' }, { label: 'French', value: 'fr' }, { label: 'German', value: 'de' }, { label: 'Arabic', value: 'ar' }, { label: 'Chinese', value: 'zh' }, { label: 'Japanese', value: 'ja' }] },
      { id: 'skills', type: 'multiselect', label: 'Additional Skills', required: false, options: [] },
      { id: 'avatar_source', type: 'radio', label: 'Avatar Source', required: true, options: [{ label: 'Ready Player Me', value: 'rpm' }, { label: 'Template', value: 'template' }, { label: 'Custom Upload', value: 'custom' }] },
      { id: 'avatar_config', type: 'json', label: 'Avatar Configuration', required: false },
      { id: 'integrations', type: 'multiselect', label: 'Integrations', required: false, options: [{ label: 'Email', value: 'email' }, { label: 'Slack', value: 'slack' }, { label: 'Calendar', value: 'calendar' }, { label: 'CRM', value: 'crm' }, { label: 'Jira', value: 'jira' }] },
    ],
    validation: [{ type: 'required', message: 'Role and name are required' }],
    onSubmit: 'employees/hireEmployee',
  },
};

// ─── D1 Schema ──────────────────────────────────────────────────────

const FRONTEND_APP_SCHEMA = `
-- Frontend application configuration storage
CREATE TABLE IF NOT EXISTS frontend_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  config_type TEXT NOT NULL CHECK (config_type IN ('theme', 'layout', 'dashboard', 'navigation', 'widget', 'form', 'shortcut', 'branding')),
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL DEFAULT '{}',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, config_type, config_key)
);

CREATE TABLE IF NOT EXISTS frontend_user_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  config_type TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, user_id, config_type, config_key)
);

CREATE TABLE IF NOT EXISTS frontend_widgets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  dashboard_id TEXT NOT NULL DEFAULT 'default',
  widget_type TEXT NOT NULL,
  widget_config TEXT NOT NULL DEFAULT '{}',
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1,
  height INTEGER NOT NULL DEFAULT 1,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS frontend_saved_views (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  view_name TEXT NOT NULL,
  view_config TEXT NOT NULL DEFAULT '{}',
  is_default INTEGER NOT NULL DEFAULT 0,
  is_shared INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_frontend_configs_tenant ON frontend_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_frontend_configs_type ON frontend_configs(tenant_id, config_type);
CREATE INDEX IF NOT EXISTS idx_frontend_user_configs_user ON frontend_user_configs(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_frontend_user_configs_type ON frontend_user_configs(tenant_id, user_id, config_type);
CREATE INDEX IF NOT EXISTS idx_frontend_widgets_user ON frontend_widgets(tenant_id, user_id, dashboard_id);
CREATE INDEX IF NOT EXISTS idx_frontend_saved_views_user ON frontend_saved_views(tenant_id, user_id, page_id);
CREATE INDEX IF NOT EXISTS idx_frontend_saved_views_shared ON frontend_saved_views(tenant_id, page_id, is_shared);
`;

// ─── Frontend App Engine ────────────────────────────────────────────

class FrontendAppEngine {
  constructor(private env: Env) {}

  // ── Design System API ──
  getDesignSystem() {
    return {
      colors: COLOR_PALETTE,
      typography: TYPOGRAPHY,
      spacing: SPACING,
      breakpoints: BREAKPOINTS,
      radii: RADII,
      shadows: SHADOWS,
      transitions: TRANSITIONS,
      zIndex: Z_INDEX,
    };
  }

  getTheme(mode: ThemeMode) {
    if (mode === 'dark') return { ...this.getDesignSystem(), semantic: DARK_THEME };
    return { ...this.getDesignSystem(), semantic: LIGHT_THEME };
  }

  generateCSSVariables(mode: ThemeMode): string {
    const theme = mode === 'dark' ? DARK_THEME : LIGHT_THEME;
    const vars: string[] = [':root {'];
    const flatten = (obj: any, prefix: string) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) { flatten(value, `${prefix}-${key}`); }
        else { vars.push(`  --${prefix}-${key}: ${value};`); }
      }
    };
    flatten(theme.colors, 'color');
    flatten(COLOR_PALETTE, 'palette');
    flatten(SPACING, 'space');
    flatten(RADII, 'radius');
    flatten(SHADOWS, 'shadow');
    vars.push('}');
    return vars.join('\n');
  }

  // ── Page API ──
  getPageRegistry() { return PAGE_REGISTRY; }
  getPage(pageId: PageId) { return PAGE_REGISTRY[pageId] || null; }
  getPageSections(pageId: PageId) { return PAGE_REGISTRY[pageId]?.sections || []; }
  getPageWidgets(pageId: PageId) { return PAGE_REGISTRY[pageId]?.widgets || []; }
  getPageActions(pageId: PageId) { return PAGE_REGISTRY[pageId]?.actions || []; }

  // ── Component API ──
  getComponentRegistry() { return COMPONENT_REGISTRY; }
  getComponent(name: string) { return COMPONENT_REGISTRY[name] || null; }
  getComponentsByCategory(category: ComponentCategory) {
    return Object.values(COMPONENT_REGISTRY).filter(c => c.category === category);
  }

  // ── State API ──
  getStateArchitecture() { return STATE_ARCHITECTURE; }
  getStoreSlice(slice: StoreSlice) { return STATE_ARCHITECTURE[slice] || null; }

  // ── Navigation API ──
  getNavigation(userRole: string) {
    return NAVIGATION.filter(item => item.requiredRole.includes(userRole)).map(item => ({
      ...item,
      children: item.children?.filter(child => child.requiredRole.includes(userRole)),
    }));
  }
  getKeyboardShortcuts() { return KEYBOARD_SHORTCUTS; }

  // ── Form API ──
  getFormRegistry() { return FORM_REGISTRY; }
  getForm(formId: string) { return FORM_REGISTRY[formId] || null; }

  // ── User Config Persistence ──
  async saveUserConfig(userId: string, tenantId: string, configType: string, configKey: string, configValue: any) {
    await this.env.DB.prepare(`
      INSERT INTO frontend_user_configs (tenant_id, user_id, config_type, config_key, config_value)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(tenant_id, user_id, config_type, config_key)
      DO UPDATE SET config_value = excluded.config_value, updated_at = datetime('now')
    `).bind(tenantId, userId, configType, configKey, JSON.stringify(configValue)).run();
    return { success: true };
  }

  async getUserConfig(userId: string, tenantId: string, configType: string, configKey?: string) {
    if (configKey) {
      const row = await this.env.DB.prepare(`SELECT * FROM frontend_user_configs WHERE tenant_id = ? AND user_id = ? AND config_type = ? AND config_key = ?`)
        .bind(tenantId, userId, configType, configKey).first();
      return row ? JSON.parse(row.config_value as string) : null;
    }
    const rows = await this.env.DB.prepare(`SELECT * FROM frontend_user_configs WHERE tenant_id = ? AND user_id = ? AND config_type = ?`)
      .bind(tenantId, userId, configType).all();
    return (rows.results || []).map((r: any) => ({ key: r.config_key, value: JSON.parse(r.config_value) }));
  }

  async deleteUserConfig(userId: string, tenantId: string, configType: string, configKey: string) {
    await this.env.DB.prepare(`DELETE FROM frontend_user_configs WHERE tenant_id = ? AND user_id = ? AND config_type = ? AND config_key = ?`)
      .bind(tenantId, userId, configType, configKey).run();
    return { success: true };
  }

  // ── Widget Layout Persistence ──
  async saveWidgetLayout(userId: string, tenantId: string, dashboardId: string, widgets: any[]) {
    await this.env.DB.prepare(`DELETE FROM frontend_widgets WHERE tenant_id = ? AND user_id = ? AND dashboard_id = ?`)
      .bind(tenantId, userId, dashboardId).run();
    for (const w of widgets) {
      await this.env.DB.prepare(`
        INSERT INTO frontend_widgets (tenant_id, user_id, dashboard_id, widget_type, widget_config, position_x, position_y, width, height, is_visible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(tenantId, userId, dashboardId, w.type, JSON.stringify(w.config || {}), w.x || 0, w.y || 0, w.width || 1, w.height || 1, w.visible !== false ? 1 : 0).run();
    }
    return { success: true };
  }

  async getWidgetLayout(userId: string, tenantId: string, dashboardId: string) {
    const rows = await this.env.DB.prepare(`SELECT * FROM frontend_widgets WHERE tenant_id = ? AND user_id = ? AND dashboard_id = ? ORDER BY position_y, position_x`)
      .bind(tenantId, userId, dashboardId).all();
    return (rows.results || []).map((r: any) => ({
      id: r.id, type: r.widget_type, config: JSON.parse(r.widget_config),
      x: r.position_x, y: r.position_y, width: r.width, height: r.height, visible: r.is_visible === 1,
    }));
  }

  // ── Saved Views ──
  async saveView(userId: string, tenantId: string, pageId: string, viewName: string, viewConfig: any, isShared: boolean = false) {
    const id = crypto.randomUUID().replace(/-/g, '');
    await this.env.DB.prepare(`
      INSERT INTO frontend_saved_views (id, tenant_id, user_id, page_id, view_name, view_config, is_shared)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, tenantId, userId, pageId, viewName, JSON.stringify(viewConfig), isShared ? 1 : 0).run();
    return { success: true, viewId: id };
  }

  async getViews(userId: string, tenantId: string, pageId: string) {
    const rows = await this.env.DB.prepare(`
      SELECT * FROM frontend_saved_views WHERE tenant_id = ? AND page_id = ? AND (user_id = ? OR is_shared = 1)
      ORDER BY is_default DESC, view_name
    `).bind(tenantId, pageId, userId).all();
    return (rows.results || []).map((r: any) => ({
      id: r.id, name: r.view_name, config: JSON.parse(r.view_config),
      isDefault: r.is_default === 1, isShared: r.is_shared === 1, isOwner: r.user_id === userId,
    }));
  }

  async deleteView(userId: string, tenantId: string, viewId: string) {
    await this.env.DB.prepare(`DELETE FROM frontend_saved_views WHERE id = ? AND tenant_id = ? AND user_id = ?`)
      .bind(viewId, tenantId, userId).run();
    return { success: true };
  }

  // ── Schema Init ──
  async initSchema() {
    const statements = FRONTEND_APP_SCHEMA.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of statements) { await this.env.DB.prepare(stmt).run(); }
    return { success: true, tables: 4, indexes: 7 };
  }
}

// ─── Request Handler ────────────────────────────────────────────────

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

export async function handleFrontendApp(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const engine = new FrontendAppEngine(env);
  const method = request.method;
  const tenantId = 'default';

  // ── Schema Init ──
  if (path === '/api/frontend/init' && method === 'POST') {
    const result = await engine.initSchema();
    return json({ success: true, message: 'Frontend app schema initialized', tables: result.tables, indexes: result.indexes });
  }

  // ── Design System ──
  if (path === '/api/frontend/design-system') {
    return json({ success: true, designSystem: engine.getDesignSystem() });
  }
  if (path === '/api/frontend/theme/light') {
    return json({ success: true, theme: engine.getTheme('light') });
  }
  if (path === '/api/frontend/theme/dark') {
    return json({ success: true, theme: engine.getTheme('dark') });
  }
  if (path === '/api/frontend/css-variables/light') {
    return new Response(engine.generateCSSVariables('light'), { headers: { 'Content-Type': 'text/css' } });
  }
  if (path === '/api/frontend/css-variables/dark') {
    return new Response(engine.generateCSSVariables('dark'), { headers: { 'Content-Type': 'text/css' } });
  }

  // ── Pages ──
  if (path === '/api/frontend/pages') {
    return json({ success: true, pages: engine.getPageRegistry(), total: Object.keys(PAGE_REGISTRY).length });
  }
  const pageMatch = path.match(/^\/api\/frontend\/pages\/([a-z-]+)$/);
  if (pageMatch) {
    const page = engine.getPage(pageMatch[1] as PageId);
    if (!page) return json({ error: 'Page not found' }, 404);
    return json({ success: true, page });
  }
  const pageSectionsMatch = path.match(/^\/api\/frontend\/pages\/([a-z-]+)\/sections$/);
  if (pageSectionsMatch) {
    return json({ success: true, sections: engine.getPageSections(pageSectionsMatch[1] as PageId) });
  }
  const pageWidgetsMatch = path.match(/^\/api\/frontend\/pages\/([a-z-]+)\/widgets$/);
  if (pageWidgetsMatch) {
    return json({ success: true, widgets: engine.getPageWidgets(pageWidgetsMatch[1] as PageId) });
  }
  const pageActionsMatch = path.match(/^\/api\/frontend\/pages\/([a-z-]+)\/actions$/);
  if (pageActionsMatch) {
    return json({ success: true, actions: engine.getPageActions(pageActionsMatch[1] as PageId) });
  }

  // ── Components ──
  if (path === '/api/frontend/components') {
    return json({ success: true, components: engine.getComponentRegistry(), total: Object.keys(COMPONENT_REGISTRY).length });
  }
  const compMatch = path.match(/^\/api\/frontend\/components\/([A-Za-z]+)$/);
  if (compMatch) {
    const comp = engine.getComponent(compMatch[1]);
    if (!comp) return json({ error: 'Component not found' }, 404);
    return json({ success: true, component: comp });
  }
  const compCatMatch = path.match(/^\/api\/frontend\/components\/category\/([a-z-]+)$/);
  if (compCatMatch) {
    return json({ success: true, components: engine.getComponentsByCategory(compCatMatch[1] as ComponentCategory) });
  }

  // ── State Architecture ──
  if (path === '/api/frontend/state') {
    return json({ success: true, stores: engine.getStateArchitecture(), total: Object.keys(STATE_ARCHITECTURE).length });
  }
  const storeMatch = path.match(/^\/api\/frontend\/state\/([a-z]+)$/);
  if (storeMatch) {
    const store = engine.getStoreSlice(storeMatch[1] as StoreSlice);
    if (!store) return json({ error: 'Store slice not found' }, 404);
    return json({ success: true, store });
  }

  // ── Navigation ──
  if (path === '/api/frontend/navigation') {
    const role = new URL(request.url).searchParams.get('role') || 'user';
    return json({ success: true, navigation: engine.getNavigation(role) });
  }
  if (path === '/api/frontend/shortcuts') {
    return json({ success: true, shortcuts: engine.getKeyboardShortcuts(), total: KEYBOARD_SHORTCUTS.length });
  }

  // ── Forms ──
  if (path === '/api/frontend/forms') {
    return json({ success: true, forms: engine.getFormRegistry(), total: Object.keys(FORM_REGISTRY).length });
  }
  const formMatch = path.match(/^\/api\/frontend\/forms\/([a-z-]+)$/);
  if (formMatch) {
    const form = engine.getForm(formMatch[1]);
    if (!form) return json({ error: 'Form not found' }, 404);
    return json({ success: true, form });
  }

  // ── User Config ──
  if (path === '/api/frontend/config' && method === 'PUT') {
    const body = await request.json() as any;
    const result = await engine.saveUserConfig(userId, tenantId, body.type, body.key, body.value);
    return json(result);
  }
  if (path === '/api/frontend/config' && method === 'GET') {
    const params = new URL(request.url).searchParams;
    const configType = params.get('type') || 'theme';
    const configKey = params.get('key') || undefined;
    const result = await engine.getUserConfig(userId, tenantId, configType, configKey);
    return json({ success: true, config: result });
  }
  if (path === '/api/frontend/config' && method === 'DELETE') {
    const body = await request.json() as any;
    const result = await engine.deleteUserConfig(userId, tenantId, body.type, body.key);
    return json(result);
  }

  // ── Widget Layout ──
  if (path === '/api/frontend/widgets/layout' && method === 'PUT') {
    const body = await request.json() as any;
    const result = await engine.saveWidgetLayout(userId, tenantId, body.dashboard_id || 'default', body.widgets);
    return json(result);
  }
  if (path === '/api/frontend/widgets/layout' && method === 'GET') {
    const dashboardId = new URL(request.url).searchParams.get('dashboard_id') || 'default';
    const widgets = await engine.getWidgetLayout(userId, tenantId, dashboardId);
    return json({ success: true, widgets, total: widgets.length });
  }

  // ── Saved Views ──
  if (path === '/api/frontend/views' && method === 'POST') {
    const body = await request.json() as any;
    const result = await engine.saveView(userId, tenantId, body.page_id, body.name, body.config, body.is_shared);
    return json(result);
  }
  if (path === '/api/frontend/views' && method === 'GET') {
    const pageId = new URL(request.url).searchParams.get('page_id') || 'dashboard';
    const views = await engine.getViews(userId, tenantId, pageId);
    return json({ success: true, views, total: views.length });
  }
  if (path.match(/^\/api\/frontend\/views\/[a-f0-9]+$/) && method === 'DELETE') {
    const viewId = path.split('/').pop()!;
    const result = await engine.deleteView(userId, tenantId, viewId);
    return json(result);
  }

  return json({ error: 'Frontend endpoint not found', code: 'FRONTEND_NOT_FOUND' }, 404);
}
