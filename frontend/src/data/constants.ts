import type { JobType, Plan, Subscriber, FleetConfig, LLMModel, ErrorLog } from './types';

export const JOB_TYPES: JobType[] = [
  { id: 'software-engineer', title: 'Software Engineer', icon: '💻', count: 24, color: 'bg-blue-500' },
  { id: 'marketing-manager', title: 'Marketing Manager', icon: '📣', count: 18, color: 'bg-pink-500' },
  { id: 'sales-representative', title: 'Sales Representative', icon: '🤝', count: 21, color: 'bg-orange-500' },
  { id: 'customer-support', title: 'Customer Support', icon: '🎧', count: 30, color: 'bg-cyan-500' },
  { id: 'data-analyst', title: 'Data Analyst', icon: '📊', count: 15, color: 'bg-emerald-500' },
  { id: 'content-writer', title: 'Content Writer', icon: '✍️', count: 22, color: 'bg-indigo-500' },
  { id: 'product-manager', title: 'Product Manager', icon: '🚀', count: 12, color: 'bg-purple-500' },
  { id: 'designer', title: 'UI/UX Designer', icon: '🎨', count: 16, color: 'bg-teal-500' },
];

export const PLANS: Plan[] = [
  { slug: 'starter', name: 'Starter', price: 49, employees: 3, compute: '25h', tasks: '10K', features: ['Up to 3 AI Employees', '10,000 tasks/month', 'Standard response time', 'Email support', 'Basic analytics'], highlighted: false },
  { slug: 'growth', name: 'Growth', price: 199, employees: 15, compute: '166h', tasks: '100K', features: ['Up to 15 AI Employees', '100,000 tasks/month', 'Priority response time', 'Priority support + Slack', 'Advanced analytics', 'Custom configuration', 'API access'], highlighted: true, badge: 'Most Popular' },
  { slug: 'enterprise', name: 'Enterprise', price: 599, employees: 99, compute: '∞', tasks: '∞', features: ['Unlimited AI Employees', 'Unlimited tasks', 'Fastest response time', 'Dedicated success manager', 'Custom AI training', 'SSO & SLA'], highlighted: false },
];

export const STATS = [
  { value: '50,000+', label: 'Tasks Completed Daily' },
  { value: '99.9%', label: 'Uptime Guaranteed' },
  { value: '< 2s', label: 'Average Response Time' },
  { value: '4.96', label: 'Avg. Satisfaction Rating' },
];

export const FEATURES = [
  { icon: '🧠', title: 'Cognitive Intelligence', desc: 'Each AI employee uses advanced reasoning models, understanding context and making decisions autonomously.' },
  { icon: '⚡', title: 'Instant Deployment', desc: 'Hire and deploy an AI employee in under 60 seconds. No onboarding, no training — ready to perform.' },
  { icon: '🔄', title: '24/7 Tireless Operation', desc: 'Your AI employees never sleep, never take breaks. Consistent, reliable performance around the clock.' },
  { icon: '📈', title: 'Infinite Scalability', desc: 'Scale your workforce from 1 to 1,000 instantly. Handle demand spikes without traditional hiring.' },
  { icon: '🔒', title: 'Enterprise Security', desc: 'SOC 2 Type II compliant with end-to-end encryption. Your data is isolated, secure, and private.' },
  { icon: '🎯', title: 'Role Specialization', desc: 'Each AI is purpose-built for their role with domain-specific knowledge and industry best practices.' },
];

export const TESTIMONIALS = [
  { quote: 'We replaced our entire Tier 1 support team with NexusHR agents. Resolution time dropped 80% and CSAT went from 3.8 to 4.9.', name: 'Sarah Chen', role: 'VP of Operations, ScaleUp Inc.', avatar: 'SC' },
  { quote: 'Our AI sales reps generated $2.4M in pipeline in the first quarter. They never miss a follow-up and work every timezone simultaneously.', name: 'Marcus Williams', role: 'CRO, TechForge', avatar: 'MW' },
  { quote: 'Having an AI data analyst that produces executive dashboards at 3am before my board meeting? Game-changing.', name: 'Elena Rodriguez', role: 'CEO, DataStream', avatar: 'ER' },
];

export const KANBAN_DATA: Record<string, { todo: any[]; inProgress: any[]; done: any[] }> = {
  coder: {
    todo: [
      { id: 't1', title: 'Refactor authentication module', priority: 'high', tag: 'Backend', due: 'Mar 15' },
      { id: 't2', title: 'Write unit tests for payment flow', priority: 'medium', tag: 'Testing', due: 'Mar 16' },
      { id: 't3', title: 'Review PR #247 — API rate limiting', priority: 'low', tag: 'Review', due: 'Mar 17' },
    ],
    inProgress: [
      { id: 't4', title: 'Build dashboard analytics endpoint', priority: 'high', tag: 'API', due: 'Mar 14', progress: 65 },
      { id: 't5', title: 'Optimize database queries (N+1)', priority: 'medium', tag: 'Performance', due: 'Mar 15', progress: 40 },
    ],
    done: [
      { id: 't6', title: 'Deploy staging environment v2.4', priority: 'high', tag: 'DevOps', due: 'Mar 13' },
      { id: 't7', title: 'Fix CORS issue on /api/upload', priority: 'medium', tag: 'Bug Fix', due: 'Mar 12' },
    ],
  },
  marketer: {
    todo: [
      { id: 'm1', title: 'Draft Q2 content calendar', priority: 'high', tag: 'Content', due: 'Mar 15' },
      { id: 'm2', title: 'Set up retargeting campaign', priority: 'medium', tag: 'Paid Ads', due: 'Mar 16' },
    ],
    inProgress: [
      { id: 'm4', title: 'A/B test landing page headlines', priority: 'high', tag: 'CRO', due: 'Mar 14', progress: 72 },
      { id: 'm5', title: 'Analyze email open rates Q1', priority: 'medium', tag: 'Analytics', due: 'Mar 15', progress: 50 },
    ],
    done: [
      { id: 'm6', title: 'Launch Product Hunt campaign', priority: 'high', tag: 'Launch', due: 'Mar 12' },
      { id: 'm7', title: 'Redesign email newsletter template', priority: 'medium', tag: 'Design', due: 'Mar 11' },
    ],
  },
};

export const SUBSCRIBERS: Subscriber[] = [
  { id: 'org_001', name: 'Acme Corp', email: 'billing@acme.com', plan: 'Growth', subStatus: 'active', trialStatus: 'converted', acctStatus: 'active', spend: 597, employees: 4, maxEmp: 5 },
  { id: 'org_002', name: 'TechForge Inc', email: 'admin@techforge.io', plan: 'Enterprise', subStatus: 'active', trialStatus: 'converted', acctStatus: 'active', spend: 2396, employees: 12, maxEmp: 99 },
  { id: 'org_003', name: 'StartupXYZ', email: 'founder@startupxyz.com', plan: 'Starter', subStatus: 'active', trialStatus: 'converted', acctStatus: 'active', spend: 147, employees: 1, maxEmp: 3 },
  { id: 'org_004', name: 'DataStream AI', email: 'ops@datastream.ai', plan: null, subStatus: null, trialStatus: 'active', acctStatus: 'active', spend: 0, employees: 1, maxEmp: 1 },
  { id: 'org_005', name: 'CloudNine SaaS', email: 'billing@cloudnine.io', plan: 'Growth', subStatus: 'past_due', trialStatus: 'converted', acctStatus: 'active', spend: 398, employees: 3, maxEmp: 5 },
  { id: 'org_006', name: 'DesignHub', email: 'hello@designhub.co', plan: null, subStatus: null, trialStatus: 'expired', acctStatus: 'active', spend: 0, employees: 0, maxEmp: 0 },
  { id: 'org_007', name: 'ScaleUp Ventures', email: 'admin@scaleup.vc', plan: 'Starter', subStatus: 'canceled', trialStatus: 'converted', acctStatus: 'active', spend: 98, employees: 0, maxEmp: 3 },
  { id: 'org_008', name: 'Nefarious LLC', email: 'abuse@nefarious.biz', plan: 'Starter', subStatus: 'active', trialStatus: 'converted', acctStatus: 'suspended', spend: 49, employees: 0, maxEmp: 0 },
];

export const FLEET_CONFIG: FleetConfig[] = [
  { jobType: 'software-engineer', name: 'Software Engineer', icon: '💻', primary: 'claude-sonnet-4-6', fallback: 'gpt-4o', temp: 0.3, maxTok: 16384, enabled: true, stats: { req24h: 34521, lat: 1120, err: 0.08, cost: 8942 } },
  { jobType: 'marketing-manager', name: 'Marketing Manager', icon: '📣', primary: 'gpt-4o', fallback: 'claude-sonnet-4-6', temp: 0.7, maxTok: 8192, enabled: true, stats: { req24h: 22180, lat: 980, err: 0.05, cost: 5230 } },
  { jobType: 'sales-representative', name: 'Sales Rep', icon: '🤝', primary: 'claude-sonnet-4-6', fallback: 'gpt-4o-mini', temp: 0.5, maxTok: 4096, enabled: true, stats: { req24h: 28934, lat: 890, err: 0.11, cost: 4560 } },
  { jobType: 'customer-support', name: 'Customer Support', icon: '🎧', primary: 'claude-haiku-4-5', fallback: 'gpt-4o-mini', temp: 0.4, maxTok: 4096, enabled: true, stats: { req24h: 45120, lat: 420, err: 0.03, cost: 2890 } },
  { jobType: 'data-analyst', name: 'Data Analyst', icon: '📊', primary: 'claude-opus-4-6', fallback: 'claude-sonnet-4-6', temp: 0.2, maxTok: 32768, enabled: true, stats: { req24h: 8240, lat: 2340, err: 0.15, cost: 7840 } },
  { jobType: 'content-writer', name: 'Content Writer', icon: '✍️', primary: 'gpt-4o', fallback: 'claude-sonnet-4-6', temp: 0.8, maxTok: 8192, enabled: true, stats: { req24h: 15670, lat: 1050, err: 0.04, cost: 3420 } },
];

export const MODELS: LLMModel[] = [
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gemini-2-pro', name: 'Gemini 2.0 Pro' },
];

export const ERROR_LOGS: ErrorLog[] = [
  { ts: '2026-03-13 22:14:03', type: 'software-engineer', model: 'claude-sonnet-4-6', error: 'Context window exceeded (204,000 tokens)', severity: 'warn' },
  { ts: '2026-03-13 21:58:47', type: 'data-analyst', model: 'claude-opus-4-6', error: 'Rate limit reached — retrying in 12s', severity: 'warn' },
  { ts: '2026-03-13 21:31:22', type: 'sales-representative', model: 'gpt-4o-mini', error: 'API timeout after 30s', severity: 'error' },
  { ts: '2026-03-13 20:12:05', type: 'customer-support', model: 'claude-haiku-4-5', error: 'Guardrail triggered: PII detected in output', severity: 'error' },
  { ts: '2026-03-13 19:44:18', type: 'content-writer', model: 'gpt-4o', error: 'Output truncated at max_tokens', severity: 'info' },
];

export const ACTIVITY_FEED = [
  { id: 1, type: 'hire', message: 'You hired Atlas as Senior Full-Stack Engineer', time: '2m ago', icon: '⚡' },
  { id: 2, type: 'task', message: 'Atlas completed: Refactor auth module', time: '15m ago', icon: '✅' },
  { id: 3, type: 'chat', message: 'Aurora sent you a campaign report', time: '32m ago', icon: '💬' },
  { id: 4, type: 'alert', message: 'Harmony resolved 12 support tickets', time: '1h ago', icon: '🌟' },
  { id: 5, type: 'billing', message: 'Invoice #INV-2026-03 generated — $199.00', time: '2h ago', icon: '💰' },
  { id: 6, type: 'task', message: 'Vex qualified 8 new enterprise leads', time: '3h ago', icon: '💎' },
];
