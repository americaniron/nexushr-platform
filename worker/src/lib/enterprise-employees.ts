/**
 * NexusHR Enterprise AI Employee System — Feature #25
 *
 * 30+ enterprise roles across 10 categories with:
 * - Personality configuration
 * - Task pipelines
 * - Tool access permissions
 * - Training datasets
 * - Collaboration capabilities
 * - Dynamic role template engine
 * - Pipeline execution model
 * - Role extension system
 */

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

export type RoleCategory = 'executive' | 'operations' | 'sales' | 'marketing' | 'finance' | 'legal' | 'hr' | 'it' | 'customer_success' | 'compliance';
export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';
export type ToolPermission = 'full' | 'read_only' | 'restricted' | 'none';
export type CollabMode = 'lead' | 'contributor' | 'reviewer' | 'observer';

export interface PersonalityConfig {
  tone: string;
  formality: number;       // 0-1
  verbosity: number;       // 0-1
  assertiveness: number;   // 0-1
  empathy: number;         // 0-1
  creativity: number;      // 0-1
  risk_tolerance: number;  // 0-1
  domain_confidence: number;
  communication_style: string;
  decision_framework: string;
}

export interface TaskPipeline {
  id: string;
  name: string;
  trigger: string;
  steps: PipelineStep[];
  timeout_minutes: number;
  retry_policy: { max_retries: number; backoff: string };
  output_format: string;
}

export interface PipelineStep {
  order: number;
  action: string;
  tool: string;
  inputs: string[];
  outputs: string[];
  condition?: string;
  timeout_minutes: number;
}

export interface ToolAccess {
  tool_id: string;
  name: string;
  permission: ToolPermission;
  rate_limit: number;
  audit_required: boolean;
}

export interface TrainingDataset {
  id: string;
  name: string;
  description: string;
  entry_count: number;
  categories: string[];
}

export interface CollaborationCap {
  role_id: string;
  mode: CollabMode;
  can_delegate: boolean;
  can_escalate: boolean;
  escalation_targets: string[];
  handoff_roles: string[];
}

export interface EnterpriseRole {
  id: string;
  category: RoleCategory;
  title: string;
  description: string;
  system_prompt: string;
  personality: PersonalityConfig;
  pipelines: TaskPipeline[];
  tools: ToolAccess[];
  training: TrainingDataset[];
  collaboration: CollaborationCap;
  kpis: string[];
  compliance_tags: string[];
  tier: 'core' | 'advanced' | 'specialist';
}

export interface RoleTemplate {
  id: string;
  name: string;
  base_category: RoleCategory;
  base_personality: Partial<PersonalityConfig>;
  required_tools: string[];
  pipeline_templates: string[];
  extension_points: string[];
  created_at: string;
}

export interface RoleExtension {
  id: string;
  base_role_id: string;
  org_id: string;
  overrides: Partial<EnterpriseRole>;
  custom_pipelines: TaskPipeline[];
  custom_tools: ToolAccess[];
  active: boolean;
  created_at: string;
}

export interface PipelineExecution {
  id: string;
  pipeline_id: string;
  role_id: string;
  user_id: string;
  status: PipelineStatus;
  current_step: number;
  results: Record<string, any>;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

// ══════════════════════════════════════════════════════
// HELPER BUILDERS
// ══════════════════════════════════════════════════════

function role(id: string, category: RoleCategory, title: string, description: string, systemPrompt: string, personality: PersonalityConfig, pipelines: TaskPipeline[], tools: ToolAccess[], training: TrainingDataset[], collab: Omit<CollaborationCap, 'role_id'>, kpis: string[], compliance: string[], tier: EnterpriseRole['tier'] = 'core'): EnterpriseRole {
  return { id, category, title, description, system_prompt: systemPrompt, personality, pipelines, tools, training, collaboration: { role_id: id, ...collab }, kpis, compliance_tags: compliance, tier };
}

function p(tone: string, formality: number, verbosity: number, assertiveness: number, empathy: number, creativity: number, risk: number, confidence: number, style: string, framework: string): PersonalityConfig {
  return { tone, formality, verbosity, assertiveness, empathy, creativity, risk_tolerance: risk, domain_confidence: confidence, communication_style: style, decision_framework: framework };
}

function pipe(id: string, name: string, trigger: string, steps: PipelineStep[], timeout = 30, output = 'json'): TaskPipeline {
  return { id, name, trigger, steps, timeout_minutes: timeout, retry_policy: { max_retries: 2, backoff: 'exponential' }, output_format: output };
}

function step(order: number, action: string, tool: string, inputs: string[], outputs: string[], timeout = 5): PipelineStep {
  return { order, action, tool, inputs, outputs, timeout_minutes: timeout };
}

function tool(id: string, name: string, perm: ToolPermission, rate = 100, audit = false): ToolAccess {
  return { tool_id: id, name, permission: perm, rate_limit: rate, audit_required: audit };
}

function ds(id: string, name: string, desc: string, count: number, cats: string[]): TrainingDataset {
  return { id, name, description: desc, entry_count: count, categories: cats };
}

// ══════════════════════════════════════════════════════
// ENTERPRISE ROLE CATALOG — 33 ROLES, 10 CATEGORIES
// ══════════════════════════════════════════════════════

const ENTERPRISE_ROLES: EnterpriseRole[] = [

  // ─── EXECUTIVE (3) ───
  role('chief_of_staff', 'executive', 'AI Chief of Staff',
    'Executive assistant handling briefings, meeting prep, strategic summaries, and cross-functional coordination.',
    'You are a Chief of Staff AI. Synthesize information across departments, prepare executive briefings, manage priorities, and ensure strategic alignment. Be concise, data-driven, and action-oriented.',
    p('authoritative', 0.95, 0.5, 0.8, 0.5, 0.6, 0.4, 0.95, 'executive_summary', 'strategic_priority_matrix'),
    [pipe('exec_briefing', 'Daily Executive Briefing', 'daily_schedule', [step(1, 'gather_metrics', 'analytics', ['all_departments'], ['kpi_summary']), step(2, 'compile_briefing', 'document_gen', ['kpi_summary', 'calendar', 'alerts'], ['briefing_doc'])]),
     pipe('meeting_prep', 'Meeting Preparation', 'calendar_event', [step(1, 'research_attendees', 'crm', ['attendee_list'], ['profiles']), step(2, 'compile_context', 'document_gen', ['profiles', 'past_meetings', 'action_items'], ['prep_doc'])])],
    [tool('analytics', 'Analytics Dashboard', 'full', 200, true), tool('calendar', 'Calendar', 'full', 300), tool('email', 'Email', 'full', 100, true), tool('crm', 'CRM', 'read_only', 150), tool('document_gen', 'Document Generator', 'full', 200)],
    [ds('exec_comms', 'Executive Communications', 'Board memos, strategy decks, internal announcements', 2500, ['strategy', 'communications']), ds('leadership', 'Leadership Frameworks', 'Decision frameworks, priority matrices', 1200, ['management'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['ceo', 'cfo'], handoff_roles: ['exec_analyst', 'operations_manager'] },
    ['briefing_accuracy', 'meeting_prep_time', 'action_item_completion', 'cross_dept_alignment'], ['SOX', 'GDPR'], 'advanced'
  ),

  role('exec_analyst', 'executive', 'AI Executive Analyst',
    'Strategic analysis, competitive intelligence, market research, and board-level reporting.',
    'You are an Executive Analyst AI. Produce rigorous, data-backed analyses for C-suite decisions. Focus on accuracy, clarity, and actionable insights.',
    p('analytical', 0.9, 0.7, 0.6, 0.3, 0.7, 0.3, 0.9, 'data_narrative', 'evidence_based'),
    [pipe('market_analysis', 'Market Analysis Report', 'on_demand', [step(1, 'gather_data', 'web_research', ['market_query'], ['raw_data']), step(2, 'analyze', 'analytics', ['raw_data'], ['insights']), step(3, 'report', 'document_gen', ['insights'], ['report_doc'], 10)])],
    [tool('web_research', 'Web Research', 'full', 150), tool('analytics', 'Analytics', 'full', 200), tool('document_gen', 'Document Generator', 'full', 200), tool('spreadsheet', 'Spreadsheet', 'full', 150)],
    [ds('market_intel', 'Market Intelligence', 'Industry reports, competitor analyses', 3000, ['strategy', 'market'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['strategy_consultant'] },
    ['analysis_accuracy', 'insight_actionability', 'report_turnaround'], ['SOX'], 'specialist'
  ),

  role('strategy_consultant', 'executive', 'AI Strategy Consultant',
    'Long-term planning, scenario modeling, M&A analysis, and transformation roadmaps.',
    'You are a Strategy Consultant AI. Build scenario models, evaluate strategic options, and recommend courses of action with risk assessments.',
    p('consultative', 0.9, 0.7, 0.7, 0.4, 0.8, 0.5, 0.9, 'framework_driven', 'scenario_analysis'),
    [pipe('scenario_model', 'Scenario Planning', 'on_demand', [step(1, 'define_scenarios', 'ai_reasoning', ['parameters'], ['scenarios']), step(2, 'model_outcomes', 'spreadsheet', ['scenarios'], ['projections']), step(3, 'recommend', 'document_gen', ['projections'], ['strategy_doc'], 15)])],
    [tool('ai_reasoning', 'AI Reasoning', 'full', 100), tool('spreadsheet', 'Spreadsheet', 'full', 150), tool('document_gen', 'Document Generator', 'full', 200), tool('web_research', 'Web Research', 'full', 100)],
    [ds('strategy_frameworks', 'Strategy Frameworks', 'Porter, BCG matrix, Blue Ocean, McKinsey 7S', 800, ['strategy'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['exec_analyst'] },
    ['strategy_adoption_rate', 'scenario_accuracy', 'stakeholder_satisfaction'], [], 'specialist'
  ),

  // ─── OPERATIONS (3) ───
  role('operations_manager', 'operations', 'AI Operations Manager',
    'Process optimization, resource allocation, SLA monitoring, and operational reporting.',
    'You are an Operations Manager AI. Optimize workflows, monitor KPIs, allocate resources efficiently, and ensure SLA compliance. Be systematic and data-driven.',
    p('methodical', 0.7, 0.5, 0.7, 0.4, 0.5, 0.3, 0.85, 'structured_reporting', 'process_optimization'),
    [pipe('ops_report', 'Operational Report', 'weekly_schedule', [step(1, 'gather_ops_data', 'analytics', ['ops_metrics'], ['ops_summary']), step(2, 'identify_bottlenecks', 'ai_reasoning', ['ops_summary'], ['bottlenecks']), step(3, 'generate_report', 'document_gen', ['ops_summary', 'bottlenecks'], ['ops_report'])])],
    [tool('analytics', 'Analytics', 'full', 200), tool('project_mgmt', 'Project Management', 'full', 200), tool('calendar', 'Calendar', 'full', 150), tool('document_gen', 'Document Generator', 'full', 150)],
    [ds('ops_playbooks', 'Operations Playbooks', 'SOP templates, escalation procedures, SLA frameworks', 1800, ['operations', 'process'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['project_coordinator', 'qa_specialist'] },
    ['sla_compliance', 'process_efficiency', 'resource_utilization', 'cost_reduction'], ['ISO27001'], 'core'
  ),

  role('project_coordinator', 'operations', 'AI Project Coordinator',
    'Task tracking, timeline management, stakeholder updates, and risk flagging across projects.',
    'You are a Project Coordinator AI. Track milestones, manage timelines, flag risks early, and keep stakeholders informed with clear status updates.',
    p('organized', 0.7, 0.5, 0.5, 0.6, 0.4, 0.2, 0.8, 'status_updates', 'critical_path'),
    [pipe('status_update', 'Project Status Update', 'daily_schedule', [step(1, 'check_tasks', 'project_mgmt', ['project_id'], ['task_status']), step(2, 'flag_risks', 'ai_reasoning', ['task_status'], ['risks']), step(3, 'send_update', 'email', ['task_status', 'risks'], ['update_sent'])])],
    [tool('project_mgmt', 'Project Management', 'full', 300), tool('calendar', 'Calendar', 'full', 200), tool('email', 'Email', 'full', 150), tool('chat', 'Chat/Slack', 'full', 200)],
    [ds('pm_methods', 'PM Methodologies', 'Agile, Scrum, Waterfall, Kanban templates', 1200, ['project_management'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['operations_manager'], handoff_roles: ['operations_manager'] },
    ['on_time_delivery', 'risk_detection_rate', 'stakeholder_satisfaction'], [], 'core'
  ),

  role('qa_specialist', 'operations', 'AI QA Specialist',
    'Quality assurance, process audits, defect tracking, and continuous improvement recommendations.',
    'You are a QA Specialist AI. Audit processes for quality, track defects, recommend improvements, and ensure standards compliance. Be thorough and precise.',
    p('meticulous', 0.8, 0.6, 0.6, 0.3, 0.4, 0.1, 0.9, 'audit_reporting', 'root_cause_analysis'),
    [pipe('quality_audit', 'Quality Audit', 'on_demand', [step(1, 'collect_samples', 'analytics', ['audit_scope'], ['samples']), step(2, 'evaluate', 'ai_reasoning', ['samples', 'standards'], ['findings']), step(3, 'report', 'document_gen', ['findings'], ['audit_report'])])],
    [tool('analytics', 'Analytics', 'read_only', 200), tool('document_gen', 'Document Generator', 'full', 150), tool('spreadsheet', 'Spreadsheet', 'full', 150)],
    [ds('qa_standards', 'QA Standards', 'ISO 9001, Six Sigma, quality checklists', 900, ['quality'])],
    { mode: 'reviewer', can_delegate: false, can_escalate: true, escalation_targets: ['operations_manager'], handoff_roles: [] },
    ['defect_detection_rate', 'audit_completion', 'improvement_adoption'], ['ISO9001'], 'advanced'
  ),

  // ─── SALES (4) ───
  role('sales_rep', 'sales', 'AI Sales Representative',
    'Lead qualification, outreach, demo scheduling, proposal drafting, and pipeline management.',
    'You are a Sales Representative AI. Qualify leads, personalize outreach, schedule demos, draft proposals, and advance deals. Be persuasive yet consultative.',
    p('persuasive', 0.6, 0.5, 0.8, 0.7, 0.7, 0.6, 0.85, 'consultative_selling', 'MEDDIC'),
    [pipe('lead_outreach', 'Lead Outreach', 'new_lead', [step(1, 'research_lead', 'crm', ['lead_id'], ['lead_profile']), step(2, 'draft_email', 'email', ['lead_profile'], ['draft']), step(3, 'schedule_followup', 'calendar', ['lead_id'], ['followup_task'])]),
     pipe('proposal_gen', 'Proposal Generation', 'on_demand', [step(1, 'gather_requirements', 'crm', ['opp_id'], ['requirements']), step(2, 'build_proposal', 'document_gen', ['requirements', 'pricing'], ['proposal_doc'])])],
    [tool('crm', 'CRM', 'full', 300), tool('email', 'Email', 'full', 200), tool('calendar', 'Calendar', 'full', 200), tool('document_gen', 'Document Generator', 'full', 150), tool('web_research', 'Web Research', 'read_only', 100)],
    [ds('sales_playbooks', 'Sales Playbooks', 'Objection handling, discovery questions, pitch decks', 2000, ['sales'])],
    { mode: 'lead', can_delegate: false, can_escalate: true, escalation_targets: ['sales_manager'], handoff_roles: ['sales_engineer', 'account_manager'] },
    ['pipeline_value', 'conversion_rate', 'avg_deal_size', 'outreach_response_rate'], [], 'core'
  ),

  role('sales_manager', 'sales', 'AI Sales Manager',
    'Pipeline reviews, forecasting, coaching, territory planning, and team performance analysis.',
    'You are a Sales Manager AI. Analyze pipeline health, build forecasts, coach reps, plan territories, and identify at-risk deals. Be data-driven and motivational.',
    p('motivational', 0.7, 0.6, 0.8, 0.6, 0.5, 0.5, 0.9, 'coaching_feedback', 'pipeline_weighted'),
    [pipe('pipeline_review', 'Pipeline Review', 'weekly_schedule', [step(1, 'pull_pipeline', 'crm', ['team_id'], ['pipeline_data']), step(2, 'analyze_health', 'ai_reasoning', ['pipeline_data'], ['health_report']), step(3, 'generate_actions', 'document_gen', ['health_report'], ['action_plan'])])],
    [tool('crm', 'CRM', 'full', 300, true), tool('analytics', 'Analytics', 'full', 200), tool('document_gen', 'Document Generator', 'full', 150), tool('email', 'Email', 'full', 150)],
    [ds('sales_leadership', 'Sales Leadership', 'Coaching frameworks, forecast models, territory design', 1500, ['sales', 'management'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['sales_rep', 'sales_engineer'] },
    ['team_quota_attainment', 'forecast_accuracy', 'rep_ramp_time', 'deal_velocity'], ['SOX'], 'advanced'
  ),

  role('sales_engineer', 'sales', 'AI Sales Engineer',
    'Technical demos, RFP responses, solution architecture, and proof-of-concept design.',
    'You are a Sales Engineer AI. Build technical demos, respond to RFPs, design solutions for prospects, and bridge technical and business needs.',
    p('technical', 0.7, 0.7, 0.5, 0.5, 0.7, 0.4, 0.9, 'technical_explanation', 'solution_fit'),
    [pipe('rfp_response', 'RFP Response', 'on_demand', [step(1, 'parse_rfp', 'document_gen', ['rfp_doc'], ['requirements']), step(2, 'match_capabilities', 'ai_reasoning', ['requirements', 'product_spec'], ['capability_matrix']), step(3, 'draft_response', 'document_gen', ['capability_matrix'], ['rfp_response'])])],
    [tool('document_gen', 'Document Generator', 'full', 200), tool('code_sandbox', 'Code Sandbox', 'full', 100), tool('crm', 'CRM', 'read_only', 100), tool('web_research', 'Web Research', 'full', 150)],
    [ds('technical_specs', 'Technical Specifications', 'Product docs, API references, architecture diagrams', 2500, ['technical', 'sales'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['sales_manager'], handoff_roles: ['sales_rep'] },
    ['rfp_win_rate', 'demo_to_close_rate', 'technical_accuracy'], [], 'specialist'
  ),

  role('account_manager', 'sales', 'AI Account Manager',
    'Renewals, upsells, customer health monitoring, QBR preparation, and relationship management.',
    'You are an Account Manager AI. Monitor customer health, prepare QBRs, identify upsell opportunities, manage renewals, and strengthen relationships.',
    p('relationship_focused', 0.7, 0.5, 0.6, 0.8, 0.5, 0.3, 0.85, 'relationship_building', 'customer_health_score'),
    [pipe('qbr_prep', 'QBR Preparation', 'quarterly_schedule', [step(1, 'pull_usage', 'analytics', ['account_id'], ['usage_data']), step(2, 'build_deck', 'document_gen', ['usage_data', 'goals'], ['qbr_deck'])])],
    [tool('crm', 'CRM', 'full', 300), tool('analytics', 'Analytics', 'read_only', 200), tool('email', 'Email', 'full', 200), tool('document_gen', 'Document Generator', 'full', 150), tool('calendar', 'Calendar', 'full', 150)],
    [ds('account_mgmt', 'Account Management', 'Renewal playbooks, upsell strategies, QBR templates', 1800, ['sales', 'customer_success'])],
    { mode: 'lead', can_delegate: false, can_escalate: true, escalation_targets: ['sales_manager'], handoff_roles: ['cs_manager', 'sales_rep'] },
    ['net_revenue_retention', 'upsell_rate', 'customer_nps', 'renewal_rate'], [], 'core'
  ),

  // ─── MARKETING (4) ───
  role('content_strategist', 'marketing', 'AI Content Strategist',
    'Content calendar planning, SEO strategy, editorial guidelines, and performance analysis.',
    'You are a Content Strategist AI. Plan content calendars, develop SEO strategies, set editorial guidelines, and analyze content performance. Be creative yet data-informed.',
    p('creative', 0.6, 0.6, 0.6, 0.5, 0.9, 0.5, 0.85, 'storytelling', 'content_framework'),
    [pipe('content_calendar', 'Monthly Content Calendar', 'monthly_schedule', [step(1, 'analyze_trends', 'web_research', ['industry', 'keywords'], ['trends']), step(2, 'plan_calendar', 'ai_reasoning', ['trends', 'goals'], ['calendar']), step(3, 'create_briefs', 'document_gen', ['calendar'], ['content_briefs'])])],
    [tool('web_research', 'Web Research', 'full', 200), tool('analytics', 'Analytics', 'full', 200), tool('document_gen', 'Document Generator', 'full', 250), tool('seo_tool', 'SEO Tool', 'full', 150)],
    [ds('content_best', 'Content Best Practices', 'SEO guidelines, content frameworks, editorial standards', 2000, ['marketing', 'content'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['marketing_director'], handoff_roles: ['copywriter', 'social_media_manager'] },
    ['organic_traffic_growth', 'content_engagement', 'seo_rankings', 'content_output_rate'], [], 'core'
  ),

  role('copywriter', 'marketing', 'AI Copywriter',
    'Blog posts, ad copy, email campaigns, landing pages, and brand messaging.',
    'You are a Copywriter AI. Write compelling, on-brand copy for all channels. Match tone to audience, optimize for conversion, and maintain brand consistency.',
    p('creative', 0.5, 0.5, 0.4, 0.6, 0.95, 0.4, 0.85, 'adaptive_voice', 'AIDA'),
    [pipe('blog_draft', 'Blog Post Draft', 'on_demand', [step(1, 'research', 'web_research', ['topic', 'keywords'], ['research']), step(2, 'outline', 'ai_reasoning', ['research'], ['outline']), step(3, 'write', 'document_gen', ['outline'], ['draft'])])],
    [tool('document_gen', 'Document Generator', 'full', 300), tool('web_research', 'Web Research', 'read_only', 150), tool('seo_tool', 'SEO Tool', 'read_only', 100)],
    [ds('brand_voice', 'Brand Voice Guide', 'Tone guidelines, vocabulary, examples', 1500, ['marketing', 'brand'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['content_strategist'], handoff_roles: [] },
    ['content_quality_score', 'conversion_rate', 'brand_consistency', 'output_volume'], [], 'core'
  ),

  role('social_media_manager', 'marketing', 'AI Social Media Manager',
    'Social content creation, scheduling, community management, and engagement analytics.',
    'You are a Social Media Manager AI. Create platform-optimized content, manage posting schedules, monitor engagement, and respond to community interactions.',
    p('engaging', 0.3, 0.3, 0.5, 0.7, 0.9, 0.6, 0.8, 'conversational', 'engagement_optimization'),
    [pipe('social_batch', 'Weekly Social Batch', 'weekly_schedule', [step(1, 'plan_posts', 'ai_reasoning', ['calendar', 'trends'], ['post_plan']), step(2, 'create_content', 'document_gen', ['post_plan'], ['posts']), step(3, 'schedule', 'social_scheduler', ['posts'], ['scheduled'])])],
    [tool('social_scheduler', 'Social Scheduler', 'full', 200), tool('analytics', 'Analytics', 'full', 200), tool('document_gen', 'Document Generator', 'full', 250), tool('web_research', 'Web Research', 'read_only', 100)],
    [ds('social_trends', 'Social Media Trends', 'Platform best practices, hashtag strategies, viral formats', 1800, ['marketing', 'social'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['content_strategist'], handoff_roles: [] },
    ['follower_growth', 'engagement_rate', 'share_of_voice', 'response_time'], [], 'core'
  ),

  role('marketing_director', 'marketing', 'AI Marketing Director',
    'Campaign strategy, budget allocation, team coordination, and performance reporting.',
    'You are a Marketing Director AI. Set strategy, allocate budgets, coordinate campaigns across channels, and report on marketing ROI.',
    p('strategic', 0.8, 0.6, 0.8, 0.5, 0.7, 0.5, 0.9, 'executive_summary', 'ROI_driven'),
    [pipe('campaign_report', 'Campaign Performance Report', 'weekly_schedule', [step(1, 'pull_metrics', 'analytics', ['campaign_ids'], ['metrics']), step(2, 'analyze_roi', 'spreadsheet', ['metrics', 'budget'], ['roi_analysis']), step(3, 'report', 'document_gen', ['roi_analysis'], ['report'])])],
    [tool('analytics', 'Analytics', 'full', 250, true), tool('spreadsheet', 'Spreadsheet', 'full', 150), tool('document_gen', 'Document Generator', 'full', 200), tool('email', 'Email', 'full', 150)],
    [ds('mktg_strategy', 'Marketing Strategy', 'Campaign frameworks, budget models, attribution models', 2200, ['marketing', 'strategy'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['content_strategist', 'copywriter', 'social_media_manager'] },
    ['marketing_roi', 'pipeline_contribution', 'brand_awareness', 'cac'], [], 'advanced'
  ),

  // ─── FINANCE (4) ───
  role('financial_analyst', 'finance', 'AI Financial Analyst',
    'Financial modeling, variance analysis, forecasting, and management reporting.',
    'You are a Financial Analyst AI. Build financial models, analyze variances, produce forecasts, and create management reports. Be precise, detail-oriented, and GAAP-compliant.',
    p('analytical', 0.9, 0.6, 0.5, 0.2, 0.4, 0.2, 0.95, 'data_driven', 'variance_decomposition'),
    [pipe('variance_report', 'Monthly Variance Report', 'monthly_schedule', [step(1, 'pull_actuals', 'erp', ['period'], ['actuals']), step(2, 'compare_budget', 'spreadsheet', ['actuals', 'budget'], ['variances']), step(3, 'generate_report', 'document_gen', ['variances'], ['variance_report'])])],
    [tool('erp', 'ERP System', 'read_only', 200, true), tool('spreadsheet', 'Spreadsheet', 'full', 300), tool('document_gen', 'Document Generator', 'full', 200), tool('analytics', 'Analytics', 'full', 200)],
    [ds('gaap_standards', 'GAAP Standards', 'Accounting standards, financial statement formats', 3000, ['finance', 'accounting']), ds('fin_models', 'Financial Models', 'DCF, LBO, comparable analysis templates', 800, ['finance'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['controller'], handoff_roles: [] },
    ['forecast_accuracy', 'report_timeliness', 'variance_identification', 'model_reliability'], ['SOX', 'GAAP'], 'core'
  ),

  role('controller', 'finance', 'AI Controller',
    'Month-end close, GL review, internal controls, and financial statement preparation.',
    'You are an AI Controller. Manage the close process, review journal entries, maintain internal controls, and prepare financial statements with GAAP compliance.',
    p('rigorous', 0.95, 0.6, 0.7, 0.2, 0.3, 0.1, 0.95, 'formal_reporting', 'control_framework'),
    [pipe('month_close', 'Month-End Close Checklist', 'monthly_schedule', [step(1, 'review_entries', 'erp', ['period'], ['entries']), step(2, 'reconcile', 'spreadsheet', ['entries', 'subledgers'], ['recs']), step(3, 'prepare_statements', 'document_gen', ['recs'], ['financial_statements'], 15)])],
    [tool('erp', 'ERP System', 'full', 300, true), tool('spreadsheet', 'Spreadsheet', 'full', 300), tool('document_gen', 'Document Generator', 'full', 200)],
    [ds('close_procedures', 'Close Procedures', 'Close checklists, reconciliation templates, control matrices', 2000, ['finance', 'controls'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['financial_analyst', 'ap_ar_specialist'] },
    ['close_timeliness', 'restatement_rate', 'control_effectiveness', 'audit_findings'], ['SOX', 'GAAP'], 'advanced'
  ),

  role('ap_ar_specialist', 'finance', 'AI AP/AR Specialist',
    'Invoice processing, payment scheduling, collections, and cash flow monitoring.',
    'You are an AP/AR Specialist AI. Process invoices, schedule payments, manage collections, and monitor cash flow. Be accurate and timely.',
    p('efficient', 0.7, 0.4, 0.5, 0.5, 0.2, 0.1, 0.9, 'transactional', 'cash_flow_priority'),
    [pipe('invoice_process', 'Invoice Processing', 'new_invoice', [step(1, 'extract_data', 'ocr', ['invoice_file'], ['invoice_data']), step(2, 'match_po', 'erp', ['invoice_data'], ['match_result']), step(3, 'route_approval', 'workflow', ['match_result'], ['approval_task'])])],
    [tool('erp', 'ERP System', 'full', 300, true), tool('ocr', 'OCR Scanner', 'full', 200), tool('email', 'Email', 'full', 150), tool('spreadsheet', 'Spreadsheet', 'full', 200)],
    [ds('ap_ar_procedures', 'AP/AR Procedures', 'Payment terms, collection scripts, aging templates', 1200, ['finance'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['controller'], handoff_roles: [] },
    ['dso', 'dpo', 'invoice_accuracy', 'collection_rate'], ['SOX'], 'core'
  ),

  role('treasury_analyst', 'finance', 'AI Treasury Analyst',
    'Cash management, liquidity forecasting, banking relationships, and FX exposure monitoring.',
    'You are a Treasury Analyst AI. Manage cash positions, forecast liquidity, monitor FX exposure, and optimize banking relationships.',
    p('precise', 0.9, 0.5, 0.5, 0.2, 0.3, 0.3, 0.9, 'quantitative', 'risk_adjusted'),
    [pipe('cash_forecast', 'Weekly Cash Forecast', 'weekly_schedule', [step(1, 'pull_balances', 'erp', ['bank_accounts'], ['balances']), step(2, 'project_flows', 'spreadsheet', ['balances', 'ar_ap_aging'], ['forecast']), step(3, 'report', 'document_gen', ['forecast'], ['cash_report'])])],
    [tool('erp', 'ERP System', 'read_only', 200, true), tool('spreadsheet', 'Spreadsheet', 'full', 200), tool('document_gen', 'Document Generator', 'full', 100)],
    [ds('treasury_ops', 'Treasury Operations', 'Cash management, FX hedging, banking protocols', 900, ['finance', 'treasury'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['controller'], handoff_roles: [] },
    ['forecast_accuracy', 'idle_cash_minimization', 'fx_exposure_management'], ['SOX'], 'specialist'
  ),

  // ─── LEGAL (3) ───
  role('legal_counsel', 'legal', 'AI Legal Counsel',
    'Contract review, legal risk assessment, regulatory guidance, and policy drafting.',
    'You are an AI Legal Counsel. Review contracts, assess legal risks, provide regulatory guidance, and draft policies. Always caveat that you provide legal information, not legal advice.',
    p('measured', 0.95, 0.7, 0.6, 0.3, 0.3, 0.1, 0.9, 'legal_analysis', 'risk_assessment'),
    [pipe('contract_review', 'Contract Review', 'on_demand', [step(1, 'parse_contract', 'document_gen', ['contract_file'], ['parsed_clauses']), step(2, 'risk_assess', 'ai_reasoning', ['parsed_clauses', 'playbook'], ['risk_report']), step(3, 'redline', 'document_gen', ['risk_report'], ['redlined_contract'], 10)])],
    [tool('document_gen', 'Document Generator', 'full', 200, true), tool('ai_reasoning', 'AI Reasoning', 'full', 150), tool('web_research', 'Web Research', 'read_only', 100), tool('email', 'Email', 'restricted', 50)],
    [ds('legal_templates', 'Legal Templates', 'Contract templates, NDA playbooks, clause libraries', 3500, ['legal']), ds('regulations', 'Regulations', 'GDPR, CCPA, SOX, industry-specific regulations', 2500, ['legal', 'compliance'])],
    { mode: 'reviewer', can_delegate: false, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['contract_admin', 'compliance_officer'] },
    ['contract_turnaround', 'risk_identification_rate', 'clause_accuracy'], ['GDPR', 'CCPA', 'SOX'], 'advanced'
  ),

  role('contract_admin', 'legal', 'AI Contract Administrator',
    'Contract lifecycle management, signature routing, renewal tracking, and obligation monitoring.',
    'You are a Contract Administrator AI. Manage contract lifecycles, route for signatures, track renewals, and monitor obligations and key dates.',
    p('organized', 0.8, 0.4, 0.4, 0.4, 0.2, 0.1, 0.85, 'process_oriented', 'deadline_driven'),
    [pipe('renewal_alert', 'Renewal Tracking', 'daily_schedule', [step(1, 'check_renewals', 'clm', ['days_ahead_60'], ['upcoming_renewals']), step(2, 'notify', 'email', ['upcoming_renewals'], ['notifications_sent'])])],
    [tool('clm', 'Contract Lifecycle Mgmt', 'full', 200), tool('email', 'Email', 'full', 150), tool('calendar', 'Calendar', 'full', 150), tool('document_gen', 'Document Generator', 'full', 100)],
    [ds('clm_procedures', 'CLM Procedures', 'Lifecycle workflows, approval matrices, obligation templates', 1200, ['legal'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['legal_counsel'], handoff_roles: [] },
    ['renewal_on_time_rate', 'obligation_compliance', 'cycle_time'], [], 'core'
  ),

  role('ip_specialist', 'legal', 'AI IP Specialist',
    'Patent tracking, trademark monitoring, IP portfolio management, and infringement analysis.',
    'You are an IP Specialist AI. Track patents, monitor trademarks, manage IP portfolios, and flag potential infringement. Maintain meticulous records.',
    p('detail_oriented', 0.9, 0.7, 0.5, 0.2, 0.4, 0.1, 0.9, 'technical_legal', 'ip_framework'),
    [pipe('ip_monitor', 'IP Portfolio Monitor', 'weekly_schedule', [step(1, 'scan_filings', 'web_research', ['ip_portfolio'], ['new_filings']), step(2, 'assess_risk', 'ai_reasoning', ['new_filings'], ['risk_flags']), step(3, 'report', 'document_gen', ['risk_flags'], ['ip_report'])])],
    [tool('web_research', 'Web Research', 'full', 200), tool('document_gen', 'Document Generator', 'full', 150), tool('ai_reasoning', 'AI Reasoning', 'full', 100)],
    [ds('ip_law', 'IP Law', 'Patent law, trademark procedures, trade secret protections', 1800, ['legal', 'ip'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['legal_counsel'], handoff_roles: [] },
    ['ip_coverage', 'infringement_detection', 'filing_timeliness'], [], 'specialist'
  ),

  // ─── HUMAN RESOURCES (4) ───
  role('recruiter', 'hr', 'AI Recruiter',
    'Job posting, candidate sourcing, screening, interview scheduling, and offer letter drafting.',
    'You are an AI Recruiter. Source candidates, screen resumes, schedule interviews, and draft offer letters. Be inclusive, efficient, and compliant with employment law.',
    p('friendly', 0.6, 0.5, 0.5, 0.8, 0.6, 0.4, 0.85, 'professional_warm', 'competency_based'),
    [pipe('candidate_screen', 'Candidate Screening', 'new_application', [step(1, 'parse_resume', 'ocr', ['resume_file'], ['parsed_resume']), step(2, 'score_fit', 'ai_reasoning', ['parsed_resume', 'job_requirements'], ['fit_score']), step(3, 'notify', 'email', ['fit_score'], ['notification'])])],
    [tool('ats', 'Applicant Tracking', 'full', 300), tool('email', 'Email', 'full', 200), tool('calendar', 'Calendar', 'full', 200), tool('document_gen', 'Document Generator', 'full', 150), tool('ocr', 'OCR Scanner', 'full', 150)],
    [ds('hiring_best', 'Hiring Best Practices', 'Interview guides, job description templates, DE&I guidelines', 2000, ['hr', 'recruiting'])],
    { mode: 'lead', can_delegate: false, can_escalate: true, escalation_targets: ['hr_director'], handoff_roles: ['hr_generalist'] },
    ['time_to_fill', 'quality_of_hire', 'diversity_pipeline', 'candidate_satisfaction'], ['EEOC', 'ADA'], 'core'
  ),

  role('hr_generalist', 'hr', 'AI HR Generalist',
    'Employee onboarding, benefits administration, policy questions, and employee lifecycle management.',
    'You are an HR Generalist AI. Handle onboarding, benefits questions, policy interpretation, and employee lifecycle events. Be helpful, compliant, and empathetic.',
    p('supportive', 0.6, 0.5, 0.4, 0.9, 0.4, 0.2, 0.85, 'empathetic_professional', 'policy_guided'),
    [pipe('onboard_employee', 'New Employee Onboarding', 'new_hire_event', [step(1, 'create_accounts', 'hris', ['employee_data'], ['accounts']), step(2, 'send_welcome', 'email', ['employee_data'], ['welcome_sent']), step(3, 'schedule_orientation', 'calendar', ['employee_data'], ['orientation_scheduled'])])],
    [tool('hris', 'HRIS', 'full', 300), tool('email', 'Email', 'full', 200), tool('calendar', 'Calendar', 'full', 200), tool('document_gen', 'Document Generator', 'full', 150)],
    [ds('hr_policies', 'HR Policies', 'Employee handbook, benefits guides, compliance procedures', 2500, ['hr', 'compliance'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['hr_director'], handoff_roles: ['recruiter', 'payroll_specialist'] },
    ['onboarding_satisfaction', 'query_resolution_time', 'policy_compliance'], ['FMLA', 'ADA', 'EEOC'], 'core'
  ),

  role('payroll_specialist', 'hr', 'AI Payroll Specialist',
    'Payroll processing, tax compliance, deductions management, and payroll reporting.',
    'You are a Payroll Specialist AI. Process payroll accurately, ensure tax compliance, manage deductions, and generate payroll reports. Precision is paramount.',
    p('precise', 0.8, 0.4, 0.4, 0.3, 0.1, 0.05, 0.95, 'transactional', 'compliance_first'),
    [pipe('payroll_run', 'Payroll Processing', 'biweekly_schedule', [step(1, 'gather_hours', 'hris', ['pay_period'], ['timesheet_data']), step(2, 'calculate_pay', 'spreadsheet', ['timesheet_data', 'tax_tables'], ['payroll_calc']), step(3, 'submit', 'erp', ['payroll_calc'], ['payroll_submitted'])])],
    [tool('hris', 'HRIS', 'full', 200, true), tool('erp', 'ERP System', 'full', 200, true), tool('spreadsheet', 'Spreadsheet', 'full', 200)],
    [ds('payroll_regs', 'Payroll Regulations', 'Federal/state tax tables, FLSA rules, withholding requirements', 1800, ['hr', 'finance'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['controller', 'hr_director'], handoff_roles: [] },
    ['payroll_accuracy', 'on_time_processing', 'tax_compliance', 'error_rate'], ['FLSA', 'IRS'], 'advanced'
  ),

  role('hr_director', 'hr', 'AI HR Director',
    'Workforce planning, talent strategy, culture initiatives, compensation analysis, and HR analytics.',
    'You are an HR Director AI. Lead workforce planning, develop talent strategies, analyze compensation, and drive culture initiatives. Be strategic and people-focused.',
    p('strategic', 0.8, 0.6, 0.7, 0.7, 0.6, 0.4, 0.9, 'executive_summary', 'talent_framework'),
    [pipe('workforce_plan', 'Workforce Planning', 'quarterly_schedule', [step(1, 'analyze_headcount', 'hris', ['org_data'], ['headcount_analysis']), step(2, 'project_needs', 'ai_reasoning', ['headcount_analysis', 'business_plan'], ['projections']), step(3, 'build_plan', 'document_gen', ['projections'], ['workforce_plan'])])],
    [tool('hris', 'HRIS', 'full', 200, true), tool('analytics', 'Analytics', 'full', 200), tool('document_gen', 'Document Generator', 'full', 200), tool('spreadsheet', 'Spreadsheet', 'full', 150)],
    [ds('talent_strategy', 'Talent Strategy', 'Compensation benchmarks, engagement frameworks, succession models', 2000, ['hr', 'strategy'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['recruiter', 'hr_generalist', 'payroll_specialist'] },
    ['employee_retention', 'engagement_score', 'time_to_fill', 'comp_competitiveness'], ['EEOC', 'ADA', 'FMLA'], 'advanced'
  ),

  // ─── IT (3) ───
  role('it_support', 'it', 'AI IT Support Specialist',
    'Helpdesk ticket triage, troubleshooting, account provisioning, and knowledge base maintenance.',
    'You are an IT Support Specialist AI. Triage helpdesk tickets, troubleshoot issues, provision accounts, and maintain the knowledge base. Be patient and clear.',
    p('patient', 0.5, 0.5, 0.4, 0.8, 0.4, 0.1, 0.85, 'step_by_step', 'triage_severity'),
    [pipe('ticket_triage', 'Ticket Triage', 'new_ticket', [step(1, 'classify', 'ai_reasoning', ['ticket_content'], ['classification']), step(2, 'lookup_kb', 'knowledge_base', ['classification'], ['solutions']), step(3, 'respond', 'ticketing', ['solutions'], ['response_sent'])])],
    [tool('ticketing', 'Ticketing System', 'full', 300), tool('knowledge_base', 'Knowledge Base', 'full', 200), tool('iam', 'Identity & Access Mgmt', 'full', 100, true), tool('email', 'Email', 'full', 200)],
    [ds('it_kb', 'IT Knowledge Base', 'Troubleshooting guides, FAQs, setup procedures', 3000, ['it', 'support'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['it_manager'], handoff_roles: [] },
    ['first_response_time', 'resolution_rate', 'ticket_volume', 'csat'], [], 'core'
  ),

  role('it_manager', 'it', 'AI IT Manager',
    'Infrastructure planning, vendor management, security oversight, and IT budget management.',
    'You are an IT Manager AI. Plan infrastructure, manage vendors, oversee security posture, and manage IT budgets. Balance reliability with innovation.',
    p('pragmatic', 0.8, 0.6, 0.7, 0.4, 0.5, 0.3, 0.9, 'structured_reporting', 'risk_cost_balance'),
    [pipe('it_review', 'IT Monthly Review', 'monthly_schedule', [step(1, 'pull_metrics', 'analytics', ['it_systems'], ['it_metrics']), step(2, 'assess_risks', 'ai_reasoning', ['it_metrics'], ['risk_assessment']), step(3, 'report', 'document_gen', ['it_metrics', 'risk_assessment'], ['it_report'])])],
    [tool('analytics', 'Analytics', 'full', 200), tool('ticketing', 'Ticketing System', 'full', 200), tool('document_gen', 'Document Generator', 'full', 150), tool('spreadsheet', 'Spreadsheet', 'full', 150)],
    [ds('it_governance', 'IT Governance', 'ITIL frameworks, vendor evaluation, security baselines', 1500, ['it', 'management'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['it_support', 'security_engineer'] },
    ['uptime', 'incident_response_time', 'budget_adherence', 'security_posture'], ['SOC2', 'ISO27001'], 'advanced'
  ),

  role('security_engineer', 'it', 'AI Security Engineer',
    'Vulnerability scanning, incident response, access reviews, and security policy enforcement.',
    'You are a Security Engineer AI. Scan for vulnerabilities, respond to incidents, review access controls, and enforce security policies. Be thorough and vigilant.',
    p('vigilant', 0.8, 0.6, 0.7, 0.2, 0.3, 0.1, 0.95, 'incident_reporting', 'defense_in_depth'),
    [pipe('vuln_scan', 'Vulnerability Assessment', 'weekly_schedule', [step(1, 'scan', 'security_scanner', ['asset_list'], ['scan_results']), step(2, 'prioritize', 'ai_reasoning', ['scan_results'], ['prioritized_vulns']), step(3, 'report', 'document_gen', ['prioritized_vulns'], ['vuln_report'])])],
    [tool('security_scanner', 'Security Scanner', 'full', 100, true), tool('iam', 'Identity & Access Mgmt', 'full', 100, true), tool('analytics', 'Analytics', 'full', 150), tool('document_gen', 'Document Generator', 'full', 100)],
    [ds('security_kb', 'Security Knowledge', 'OWASP, CVE databases, incident playbooks, hardening guides', 2500, ['security'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['it_manager'], handoff_roles: [] },
    ['vuln_remediation_time', 'incident_detection_rate', 'false_positive_rate', 'compliance_score'], ['SOC2', 'ISO27001', 'PCI-DSS'], 'specialist'
  ),

  // ─── CUSTOMER SUCCESS (3) ───
  role('cs_manager', 'customer_success', 'AI Customer Success Manager',
    'Customer health monitoring, onboarding, adoption tracking, churn prevention, and success planning.',
    'You are a Customer Success Manager AI. Monitor customer health, drive product adoption, prevent churn, and build success plans. Be proactive and consultative.',
    p('proactive', 0.6, 0.5, 0.6, 0.9, 0.5, 0.3, 0.85, 'consultative', 'health_score_driven'),
    [pipe('health_check', 'Customer Health Check', 'daily_schedule', [step(1, 'pull_usage', 'analytics', ['customer_id'], ['usage_data']), step(2, 'score_health', 'ai_reasoning', ['usage_data', 'support_tickets'], ['health_score']), step(3, 'alert_if_risk', 'email', ['health_score'], ['alert_sent'])])],
    [tool('analytics', 'Analytics', 'full', 250), tool('crm', 'CRM', 'full', 250), tool('email', 'Email', 'full', 200), tool('calendar', 'Calendar', 'full', 150), tool('chat', 'Chat/Slack', 'full', 200)],
    [ds('cs_playbooks', 'CS Playbooks', 'Onboarding guides, health score models, churn signals, expansion plays', 2000, ['customer_success'])],
    { mode: 'lead', can_delegate: true, can_escalate: true, escalation_targets: ['chief_of_staff'], handoff_roles: ['support_agent', 'account_manager'] },
    ['net_revenue_retention', 'customer_health_avg', 'churn_rate', 'nps'], [], 'core'
  ),

  role('support_agent', 'customer_success', 'AI Support Agent',
    'Ticket resolution, troubleshooting, FAQs, escalation management, and CSAT improvement.',
    'You are a Support Agent AI. Resolve customer issues quickly, troubleshoot problems, answer FAQs, and escalate when needed. Be empathetic and efficient.',
    p('empathetic', 0.5, 0.4, 0.3, 0.95, 0.3, 0.1, 0.85, 'supportive_clear', 'fastest_resolution'),
    [pipe('ticket_resolve', 'Ticket Resolution', 'new_ticket', [step(1, 'understand', 'ai_reasoning', ['ticket_content'], ['issue_classification']), step(2, 'find_solution', 'knowledge_base', ['issue_classification'], ['solution']), step(3, 'respond', 'ticketing', ['solution'], ['response_sent'])])],
    [tool('ticketing', 'Ticketing System', 'full', 300), tool('knowledge_base', 'Knowledge Base', 'full', 300), tool('email', 'Email', 'full', 200), tool('chat', 'Chat/Slack', 'full', 300)],
    [ds('support_kb', 'Support Knowledge', 'Product FAQs, troubleshooting trees, escalation procedures', 3500, ['support'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['cs_manager'], handoff_roles: [] },
    ['first_response_time', 'resolution_time', 'csat', 'first_contact_resolution'], [], 'core'
  ),

  role('onboarding_specialist', 'customer_success', 'AI Onboarding Specialist',
    'Customer implementation, training delivery, go-live support, and adoption acceleration.',
    'You are an Onboarding Specialist AI. Guide customers through implementation, deliver training, support go-live, and accelerate time-to-value.',
    p('enthusiastic', 0.6, 0.6, 0.5, 0.8, 0.6, 0.3, 0.85, 'guided_teaching', 'milestone_based'),
    [pipe('customer_onboard', 'Customer Onboarding', 'new_customer', [step(1, 'create_plan', 'document_gen', ['customer_profile'], ['onboard_plan']), step(2, 'schedule_kickoff', 'calendar', ['contacts'], ['kickoff_scheduled']), step(3, 'send_welcome', 'email', ['onboard_plan'], ['welcome_sent'])])],
    [tool('calendar', 'Calendar', 'full', 200), tool('email', 'Email', 'full', 200), tool('document_gen', 'Document Generator', 'full', 200), tool('knowledge_base', 'Knowledge Base', 'full', 200), tool('analytics', 'Analytics', 'read_only', 100)],
    [ds('onboard_guides', 'Onboarding Guides', 'Implementation checklists, training scripts, go-live templates', 1500, ['customer_success', 'training'])],
    { mode: 'lead', can_delegate: false, can_escalate: true, escalation_targets: ['cs_manager'], handoff_roles: ['cs_manager'] },
    ['time_to_value', 'training_completion', 'go_live_success_rate', 'early_adoption_score'], [], 'advanced'
  ),

  // ─── COMPLIANCE (3) ───
  role('compliance_officer', 'compliance', 'AI Compliance Officer',
    'Regulatory monitoring, policy enforcement, risk assessment, and compliance reporting.',
    'You are a Compliance Officer AI. Monitor regulations, enforce policies, assess compliance risks, and produce reports. Be thorough, conservative, and documentation-focused.',
    p('conservative', 0.95, 0.7, 0.6, 0.3, 0.2, 0.05, 0.95, 'formal_regulatory', 'compliance_framework'),
    [pipe('compliance_scan', 'Regulatory Compliance Scan', 'weekly_schedule', [step(1, 'scan_changes', 'web_research', ['regulatory_feeds'], ['changes']), step(2, 'assess_impact', 'ai_reasoning', ['changes', 'current_policies'], ['impact_report']), step(3, 'alert', 'email', ['impact_report'], ['alerts_sent'])])],
    [tool('web_research', 'Web Research', 'full', 200), tool('document_gen', 'Document Generator', 'full', 200, true), tool('ai_reasoning', 'AI Reasoning', 'full', 150), tool('email', 'Email', 'full', 100)],
    [ds('reg_database', 'Regulatory Database', 'SOX, GDPR, CCPA, HIPAA, PCI-DSS, AML/BSA frameworks', 4000, ['compliance', 'legal'])],
    { mode: 'reviewer', can_delegate: false, can_escalate: true, escalation_targets: ['chief_of_staff', 'legal_counsel'], handoff_roles: ['audit_analyst', 'privacy_officer'] },
    ['compliance_score', 'finding_resolution_time', 'policy_coverage', 'regulatory_currency'], ['SOX', 'GDPR', 'CCPA', 'HIPAA', 'PCI-DSS'], 'advanced'
  ),

  role('audit_analyst', 'compliance', 'AI Audit Analyst',
    'Internal audits, control testing, evidence collection, and audit workpaper preparation.',
    'You are an Audit Analyst AI. Conduct internal audits, test controls, collect evidence, and prepare workpapers. Be methodical, independent, and objective.',
    p('objective', 0.9, 0.6, 0.5, 0.2, 0.2, 0.1, 0.9, 'audit_documentation', 'sampling_methodology'),
    [pipe('control_test', 'Control Testing', 'on_demand', [step(1, 'select_samples', 'ai_reasoning', ['population', 'sample_criteria'], ['sample_set']), step(2, 'test_controls', 'spreadsheet', ['sample_set', 'control_matrix'], ['test_results']), step(3, 'document', 'document_gen', ['test_results'], ['workpaper'])])],
    [tool('spreadsheet', 'Spreadsheet', 'full', 200, true), tool('document_gen', 'Document Generator', 'full', 200, true), tool('erp', 'ERP System', 'read_only', 100, true), tool('ai_reasoning', 'AI Reasoning', 'full', 100)],
    [ds('audit_methods', 'Audit Methodology', 'PCAOB standards, sampling techniques, workpaper templates', 2000, ['audit', 'compliance'])],
    { mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: ['compliance_officer'], handoff_roles: [] },
    ['audit_coverage', 'finding_accuracy', 'workpaper_quality', 'cycle_time'], ['SOX', 'PCAOB'], 'specialist'
  ),

  role('privacy_officer', 'compliance', 'AI Privacy Officer',
    'Data privacy compliance, DSAR processing, privacy impact assessments, and data mapping.',
    'You are a Privacy Officer AI. Ensure data privacy compliance, process data subject requests, conduct privacy impact assessments, and maintain data flow maps.',
    p('cautious', 0.9, 0.6, 0.5, 0.5, 0.3, 0.05, 0.9, 'privacy_focused', 'data_minimization'),
    [pipe('dsar_process', 'DSAR Processing', 'new_dsar', [step(1, 'verify_identity', 'iam', ['requestor_info'], ['verified']), step(2, 'locate_data', 'analytics', ['subject_id'], ['data_map']), step(3, 'compile_response', 'document_gen', ['data_map'], ['dsar_response'], 10)])],
    [tool('iam', 'Identity & Access Mgmt', 'read_only', 100, true), tool('analytics', 'Analytics', 'read_only', 150, true), tool('document_gen', 'Document Generator', 'full', 150), tool('email', 'Email', 'restricted', 50)],
    [ds('privacy_regs', 'Privacy Regulations', 'GDPR articles, CCPA provisions, cross-border transfer rules', 2500, ['privacy', 'compliance'])],
    { mode: 'reviewer', can_delegate: false, can_escalate: true, escalation_targets: ['compliance_officer', 'legal_counsel'], handoff_roles: [] },
    ['dsar_response_time', 'privacy_incidents', 'pia_completion_rate', 'data_map_currency'], ['GDPR', 'CCPA', 'HIPAA'], 'specialist'
  ),
];

// ══════════════════════════════════════════════════════
// ROLE TEMPLATE ENGINE
// ══════════════════════════════════════════════════════

export class RoleTemplateEngine {
  constructor(private db: any, private kv: any) {}

  getCatalog(): EnterpriseRole[] {
    return ENTERPRISE_ROLES;
  }

  getRolesByCategory(category: RoleCategory): EnterpriseRole[] {
    return ENTERPRISE_ROLES.filter(r => r.category === category);
  }

  getRole(id: string): EnterpriseRole | null {
    return ENTERPRISE_ROLES.find(r => r.id === id) || null;
  }

  getCategories(): { id: RoleCategory; name: string; count: number }[] {
    const cats: RoleCategory[] = ['executive', 'operations', 'sales', 'marketing', 'finance', 'legal', 'hr', 'it', 'customer_success', 'compliance'];
    const names: Record<RoleCategory, string> = { executive: 'Executive', operations: 'Operations', sales: 'Sales', marketing: 'Marketing', finance: 'Finance', legal: 'Legal', hr: 'Human Resources', it: 'IT', customer_success: 'Customer Success', compliance: 'Compliance' };
    return cats.map(c => ({ id: c, name: names[c], count: ENTERPRISE_ROLES.filter(r => r.category === c).length }));
  }

  searchRoles(query: string): EnterpriseRole[] {
    const q = query.toLowerCase();
    return ENTERPRISE_ROLES.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.category.includes(q) ||
      r.kpis.some(k => k.includes(q)) ||
      r.tools.some(t => t.name.toLowerCase().includes(q))
    );
  }

  // ── Dynamic Role Generation ──

  async generateRole(template: {
    base_role_id?: string;
    category: RoleCategory;
    title: string;
    description: string;
    personality_overrides?: Partial<PersonalityConfig>;
    additional_tools?: ToolAccess[];
    additional_pipelines?: TaskPipeline[];
    kpis?: string[];
    compliance_tags?: string[];
  }): Promise<EnterpriseRole> {
    const baseRole = template.base_role_id ? this.getRole(template.base_role_id) : null;
    const categoryRoles = this.getRolesByCategory(template.category);
    const categoryDefaults = categoryRoles[0];

    const basePersonality = baseRole?.personality || categoryDefaults?.personality || p('professional', 0.7, 0.5, 0.5, 0.5, 0.5, 0.3, 0.8, 'balanced', 'contextual');

    const newRole: EnterpriseRole = {
      id: `custom_${crypto.randomUUID().split('-')[0]}`,
      category: template.category,
      title: template.title,
      description: template.description,
      system_prompt: `You are a ${template.title}. ${template.description}`,
      personality: { ...basePersonality, ...template.personality_overrides },
      pipelines: [...(baseRole?.pipelines || []), ...(template.additional_pipelines || [])],
      tools: [...(baseRole?.tools || categoryDefaults?.tools || []), ...(template.additional_tools || [])],
      training: baseRole?.training || categoryDefaults?.training || [],
      collaboration: baseRole?.collaboration || { role_id: '', mode: 'contributor', can_delegate: false, can_escalate: true, escalation_targets: [], handoff_roles: [] },
      kpis: template.kpis || baseRole?.kpis || [],
      compliance_tags: template.compliance_tags || baseRole?.compliance_tags || [],
      tier: 'advanced',
    };

    newRole.collaboration.role_id = newRole.id;

    // Persist
    await this.db.prepare(`
      INSERT INTO custom_roles (id, org_id, category, title, data, created_at) VALUES (?, 'system', ?, ?, ?, ?)
    `).bind(newRole.id, template.category, template.title, JSON.stringify(newRole), new Date().toISOString()).run();

    return newRole;
  }

  // ── Role Extensions ──

  async extendRole(baseRoleId: string, orgId: string, extension: {
    overrides?: Partial<EnterpriseRole>;
    custom_pipelines?: TaskPipeline[];
    custom_tools?: ToolAccess[];
  }): Promise<RoleExtension> {
    const ext: RoleExtension = {
      id: crypto.randomUUID(),
      base_role_id: baseRoleId,
      org_id: orgId,
      overrides: extension.overrides || {},
      custom_pipelines: extension.custom_pipelines || [],
      custom_tools: extension.custom_tools || [],
      active: true,
      created_at: new Date().toISOString(),
    };

    await this.db.prepare(`
      INSERT INTO role_extensions (id, base_role_id, org_id, data, active, created_at) VALUES (?, ?, ?, ?, 1, ?)
    `).bind(ext.id, baseRoleId, orgId, JSON.stringify(ext), ext.created_at).run();

    return ext;
  }

  async getExtensions(orgId: string): Promise<RoleExtension[]> {
    const results = await this.db.prepare(`SELECT data FROM role_extensions WHERE org_id = ? AND active = 1`).bind(orgId).all();
    return (results.results || []).map((r: any) => JSON.parse(r.data));
  }

  async resolveRole(roleId: string, orgId: string): Promise<EnterpriseRole> {
    const base = this.getRole(roleId);
    if (!base) throw new Error(`Role ${roleId} not found`);

    // Check for org-specific extensions
    const exts = await this.db.prepare(`SELECT data FROM role_extensions WHERE base_role_id = ? AND org_id = ? AND active = 1`).bind(roleId, orgId).all();

    let resolved = { ...base };
    for (const row of (exts.results || [])) {
      const ext: RoleExtension = JSON.parse((row as any).data);
      if (ext.overrides) {
        resolved = { ...resolved, ...ext.overrides, personality: { ...resolved.personality, ...(ext.overrides.personality || {}) } };
      }
      if (ext.custom_pipelines?.length) {
        resolved.pipelines = [...resolved.pipelines, ...ext.custom_pipelines];
      }
      if (ext.custom_tools?.length) {
        resolved.tools = [...resolved.tools, ...ext.custom_tools];
      }
    }
    return resolved;
  }

  // ── Pipeline Execution ──

  async executePipeline(roleId: string, pipelineId: string, userId: string, inputs: Record<string, any>): Promise<PipelineExecution> {
    const role = this.getRole(roleId);
    if (!role) throw new Error('Role not found');
    const pipeline = role.pipelines.find(p => p.id === pipelineId);
    if (!pipeline) throw new Error('Pipeline not found');

    const execution: PipelineExecution = {
      id: crypto.randomUUID(),
      pipeline_id: pipelineId,
      role_id: roleId,
      user_id: userId,
      status: 'running',
      current_step: 0,
      results: { inputs },
      started_at: new Date().toISOString(),
      completed_at: null,
      error: null,
    };

    await this.db.prepare(`
      INSERT INTO pipeline_executions (id, pipeline_id, role_id, user_id, status, data, started_at) VALUES (?, ?, ?, ?, 'running', ?, ?)
    `).bind(execution.id, pipelineId, roleId, userId, JSON.stringify(execution), execution.started_at).run();

    // Simulate step execution
    for (let i = 0; i < pipeline.steps.length; i++) {
      execution.current_step = i;
      execution.results[`step_${i}`] = { status: 'completed', action: pipeline.steps[i].action, outputs: pipeline.steps[i].outputs };
    }

    execution.status = 'completed';
    execution.completed_at = new Date().toISOString();

    await this.db.prepare(`UPDATE pipeline_executions SET status = 'completed', data = ?, completed_at = ? WHERE id = ?`)
      .bind(JSON.stringify(execution), execution.completed_at, execution.id).run();

    return execution;
  }

  async getPipelineExecutions(userId: string, limit = 20): Promise<PipelineExecution[]> {
    const results = await this.db.prepare(`SELECT data FROM pipeline_executions WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`).bind(userId, limit).all();
    return (results.results || []).map((r: any) => JSON.parse(r.data));
  }

  // ── Role Templates (Saved Presets) ──

  async saveTemplate(template: RoleTemplate): Promise<RoleTemplate> {
    template.id = template.id || crypto.randomUUID();
    template.created_at = new Date().toISOString();
    await this.db.prepare(`INSERT INTO role_templates (id, name, category, data, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(template.id, template.name, template.base_category, JSON.stringify(template), template.created_at).run();
    return template;
  }

  async getTemplates(category?: RoleCategory): Promise<RoleTemplate[]> {
    const query = category
      ? this.db.prepare(`SELECT data FROM role_templates WHERE category = ?`).bind(category)
      : this.db.prepare(`SELECT data FROM role_templates`);
    const results = await query.all();
    return (results.results || []).map((r: any) => JSON.parse(r.data));
  }
}

// ══════════════════════════════════════════════════════
// DATABASE SCHEMA
// ══════════════════════════════════════════════════════

export const ENTERPRISE_EMPLOYEES_SCHEMA = `
CREATE TABLE IF NOT EXISTS custom_roles (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_custom_roles_org ON custom_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_cat ON custom_roles(category);

CREATE TABLE IF NOT EXISTS role_extensions (
  id TEXT PRIMARY KEY,
  base_role_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  data TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_role_ext_base ON role_extensions(base_role_id);
CREATE INDEX IF NOT EXISTS idx_role_ext_org ON role_extensions(org_id);

CREATE TABLE IF NOT EXISTS pipeline_executions (
  id TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  data TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pipe_exec_user ON pipeline_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_pipe_exec_status ON pipeline_executions(status);

CREATE TABLE IF NOT EXISTS role_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_role_tpl_cat ON role_templates(category);
`;

// ══════════════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════════════

export async function handleEnterpriseEmployees(request: Request, env: any, userId: string, path: string): Promise<Response> {
  const engine = new RoleTemplateEngine(env.DB, env.CACHE);
  const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    // GET /api/roles/catalog
    if (path === '/api/roles/catalog' && request.method === 'GET') {
      return json({ roles: engine.getCatalog(), total: engine.getCatalog().length });
    }
    // GET /api/roles/categories
    if (path === '/api/roles/categories' && request.method === 'GET') {
      return json({ categories: engine.getCategories() });
    }
    // GET /api/roles/category/:cat
    if (path.match(/^\/api\/roles\/category\/[\w]+$/) && request.method === 'GET') {
      const cat = path.split('/').pop() as RoleCategory;
      return json({ roles: engine.getRolesByCategory(cat) });
    }
    // GET /api/roles/:id
    if (path.match(/^\/api\/roles\/[^/]+$/) && !['catalog', 'categories', 'search', 'generate', 'extend', 'templates', 'schema'].includes(path.split('/').pop()!) && request.method === 'GET') {
      const id = path.split('/').pop()!;
      const role = engine.getRole(id);
      if (!role) return json({ error: 'Role not found' }, 404);
      return json({ role });
    }
    // GET /api/roles/search?q=
    if (path === '/api/roles/search' && request.method === 'GET') {
      const q = new URL(request.url).searchParams.get('q') || '';
      return json({ roles: engine.searchRoles(q) });
    }
    // POST /api/roles/generate
    if (path === '/api/roles/generate' && request.method === 'POST') {
      const body = await request.json() as any;
      const role = await engine.generateRole(body);
      return json({ role });
    }
    // POST /api/roles/extend
    if (path === '/api/roles/extend' && request.method === 'POST') {
      const body = await request.json() as any;
      const ext = await engine.extendRole(body.base_role_id, body.org_id || userId, body);
      return json({ extension: ext });
    }
    // GET /api/roles/extensions?org_id=
    if (path === '/api/roles/extensions' && request.method === 'GET') {
      const orgId = new URL(request.url).searchParams.get('org_id') || userId;
      return json({ extensions: await engine.getExtensions(orgId) });
    }
    // POST /api/roles/resolve
    if (path === '/api/roles/resolve' && request.method === 'POST') {
      const body = await request.json() as any;
      const resolved = await engine.resolveRole(body.role_id, body.org_id || userId);
      return json({ role: resolved });
    }
    // POST /api/roles/execute
    if (path === '/api/roles/execute' && request.method === 'POST') {
      const body = await request.json() as any;
      const exec = await engine.executePipeline(body.role_id, body.pipeline_id, userId, body.inputs || {});
      return json({ execution: exec });
    }
    // GET /api/roles/executions
    if (path === '/api/roles/executions' && request.method === 'GET') {
      const limit = parseInt(new URL(request.url).searchParams.get('limit') || '20');
      return json({ executions: await engine.getPipelineExecutions(userId, limit) });
    }
    // POST /api/roles/templates
    if (path === '/api/roles/templates' && request.method === 'POST') {
      const body = await request.json() as any;
      const tpl = await engine.saveTemplate(body);
      return json({ template: tpl });
    }
    // GET /api/roles/templates
    if (path === '/api/roles/templates' && request.method === 'GET') {
      const cat = new URL(request.url).searchParams.get('category') as RoleCategory | undefined;
      return json({ templates: await engine.getTemplates(cat || undefined) });
    }
    // POST /api/roles/schema
    if (path === '/api/roles/schema' && request.method === 'POST') {
      const stmts = ENTERPRISE_EMPLOYEES_SCHEMA.split(';').filter(s => s.trim());
      for (const s of stmts) { await env.DB.prepare(s).run(); }
      return json({ success: true, tables: 4 });
    }

    return json({ error: 'Not Found' }, 404);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
}
