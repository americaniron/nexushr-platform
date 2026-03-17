/**
 * NexusHR Guided Onboarding System
 *
 * Reduces time-to-value to under 10 minutes with an intelligent,
 * multi-step onboarding flow that adapts to the user's industry,
 * company size, and specific needs.
 *
 * Features:
 * 1. Industry Detection & Recommendation Engine
 * 2. Progressive Disclosure Wizard (6-step flow)
 * 3. Auto-Provisioning of AI Employees based on selections
 * 4. Guided First-Task Experience with live AI demo
 * 5. Onboarding Analytics & Drop-off Prevention
 * 6. Team Invitation & Role Assignment
 * 7. Integration Quick-Connect (OAuth one-click)
 * 8. Personalized Dashboard Setup
 * 9. Checklist & Milestone Tracking
 * 10. Re-engagement Drip for Incomplete Onboarding
 */

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

export type OnboardingStepId =
  | 'welcome'
  | 'company_profile'
  | 'industry_select'
  | 'team_setup'
  | 'ai_employees'
  | 'integrations'
  | 'first_task'
  | 'dashboard_customize'
  | 'completed';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned';
export type CompanySize = 'solo' | 'small' | 'medium' | 'large' | 'enterprise';
export type OnboardingGoal = 'automate_hr' | 'reduce_costs' | 'scale_operations' | 'compliance' | 'improve_hiring' | 'employee_engagement';

export interface OnboardingSession {
  id: string;
  user_id: string;
  org_id: string;
  status: OnboardingStatus;
  current_step: OnboardingStepId;
  steps_completed: OnboardingStepId[];
  company_profile: CompanyProfile | null;
  selected_vertical: string | null;
  selected_employees: string[];
  selected_integrations: string[];
  team_invites: TeamInvite[];
  first_task_completed: boolean;
  dashboard_configured: boolean;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  time_spent_seconds: number;
  drop_off_alerts: DropOffAlert[];
  metadata: Record<string, any>;
}

export interface CompanyProfile {
  name: string;
  industry: string;
  industry_sub: string;
  size: CompanySize;
  employee_count: number;
  goals: OnboardingGoal[];
  pain_points: string[];
  current_tools: string[];
  budget_range: string;
  timezone: string;
  country: string;
}

export interface TeamInvite {
  email: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  name: string;
  sent_at: string;
  accepted: boolean;
}

export interface DropOffAlert {
  step: OnboardingStepId;
  idle_seconds: number;
  triggered_at: string;
  action_taken: 'email_sent' | 'in_app_nudge' | 'none';
}

export interface OnboardingRecommendation {
  vertical_id: string;
  confidence: number;
  reasons: string[];
  recommended_employees: RecommendedEmployee[];
  recommended_integrations: RecommendedIntegration[];
  estimated_time_savings_hours: number;
  estimated_cost_savings_monthly: number;
}

export interface RecommendedEmployee {
  employee_id: string;
  role: string;
  title: string;
  match_score: number;
  reason: string;
  priority: 'essential' | 'recommended' | 'optional';
}

export interface RecommendedIntegration {
  integration_id: string;
  name: string;
  icon: string;
  match_score: number;
  reason: string;
  auth_type: 'oauth' | 'api_key' | 'webhook';
  setup_time_minutes: number;
}

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  subtitle: string;
  description: string;
  estimated_minutes: number;
  required: boolean;
  skip_conditions: string[];
  tips: string[];
  progress_weight: number;
}

export interface FirstTaskTemplate {
  id: string;
  vertical: string;
  title: string;
  description: string;
  estimated_minutes: number;
  employee_id: string;
  prompt_template: string;
  expected_outcome: string;
  success_criteria: string[];
  demo_mode: boolean;
}

export interface OnboardingMilestone {
  id: string;
  title: string;
  description: string;
  reward: string;
  achieved: boolean;
  achieved_at: string | null;
}

export interface OnboardingAnalytics {
  total_sessions: number;
  completion_rate: number;
  avg_completion_time_seconds: number;
  median_completion_time_seconds: number;
  drop_off_by_step: Record<OnboardingStepId, number>;
  most_selected_vertical: string;
  most_selected_employees: string[];
  conversion_to_paid: number;
  nps_score: number;
}

// ══════════════════════════════════════════════════════
// ONBOARDING STEPS CONFIGURATION
// ══════════════════════════════════════════════════════

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to NexusHR',
    subtitle: 'Your AI workforce awaits',
    description: 'Quick overview of what NexusHR can do for your organization. Watch a 30-second intro or skip ahead.',
    estimated_minutes: 0.5,
    required: true,
    skip_conditions: [],
    tips: ['You can always revisit this onboarding from Settings → Getting Started'],
    progress_weight: 5,
  },
  {
    id: 'company_profile',
    title: 'Tell Us About Your Company',
    subtitle: 'So we can personalize your experience',
    description: 'Company name, industry, size, and your top goals. This helps us recommend the right AI employees.',
    estimated_minutes: 1.5,
    required: true,
    skip_conditions: [],
    tips: [
      'Be specific about your industry — we have specialized AI packs for many sectors',
      'Select your top 2-3 goals for the best recommendations',
    ],
    progress_weight: 15,
  },
  {
    id: 'industry_select',
    title: 'Choose Your AI Workforce Pack',
    subtitle: 'Pre-built teams for your industry',
    description: 'Based on your profile, we recommend industry-specific AI employee packs. Each comes with trained specialists, compliance rules, and workflows.',
    estimated_minutes: 1,
    required: true,
    skip_conditions: [],
    tips: [
      'Each pack includes 7-10+ AI employees trained for your industry',
      'You can mix employees from multiple packs',
      'All packs include a 14-day free trial',
    ],
    progress_weight: 15,
  },
  {
    id: 'team_setup',
    title: 'Invite Your Team',
    subtitle: 'Collaboration makes AI adoption easier',
    description: 'Invite colleagues to join your NexusHR workspace. Assign roles and permissions.',
    estimated_minutes: 1,
    required: false,
    skip_conditions: ['solo_user', 'trial_mode'],
    tips: [
      'Start with 2-3 team members — you can invite more later',
      'Admins can manage AI employees; Managers can assign tasks',
    ],
    progress_weight: 10,
  },
  {
    id: 'ai_employees',
    title: 'Meet Your AI Team',
    subtitle: 'Select and customize your AI employees',
    description: 'Review recommended AI employees, adjust their personalities, and activate the ones you need most.',
    estimated_minutes: 2,
    required: true,
    skip_conditions: [],
    tips: [
      'Start with 3-5 essential employees — you can add more anytime',
      'Each employee can be customized with your company\'s terminology and processes',
      'AI employees learn and improve over time based on your feedback',
    ],
    progress_weight: 20,
  },
  {
    id: 'integrations',
    title: 'Connect Your Tools',
    subtitle: 'One-click setup for your existing software',
    description: 'Connect your existing tools so AI employees can work with your real data. Most integrations take under 60 seconds.',
    estimated_minutes: 2,
    required: false,
    skip_conditions: ['no_integrations_available'],
    tips: [
      'Start with your most-used tool — you can add more later',
      'OAuth connections are the easiest — just click and authorize',
      'Your data stays encrypted and you control access permissions',
    ],
    progress_weight: 10,
  },
  {
    id: 'first_task',
    title: 'Your First AI Task',
    subtitle: 'See the magic in action',
    description: 'Give your first task to an AI employee and see instant results. We\'ve prepared a guided demo task based on your industry.',
    estimated_minutes: 2,
    required: true,
    skip_conditions: [],
    tips: [
      'This is a real task — the AI will produce actual work product',
      'Try the suggested task first, then experiment with your own',
      'You can chat with any AI employee just like a human colleague',
    ],
    progress_weight: 20,
  },
  {
    id: 'dashboard_customize',
    title: 'Customize Your Dashboard',
    subtitle: 'Your command center, your way',
    description: 'Arrange widgets, set up alerts, and configure your daily view. We\'ll suggest a layout based on your role.',
    estimated_minutes: 1,
    required: false,
    skip_conditions: [],
    tips: [
      'Drag and drop widgets to rearrange your dashboard',
      'Pin your most-used AI employees for quick access',
    ],
    progress_weight: 5,
  },
];

// ══════════════════════════════════════════════════════
// INDUSTRY DETECTION & RECOMMENDATION ENGINE
// ══════════════════════════════════════════════════════

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  healthcare: [
    'hospital', 'clinic', 'medical', 'health', 'physician', 'dental', 'pharmacy', 'nursing',
    'patient', 'telehealth', 'ehr', 'epic', 'cerner', 'athena', 'hipaa', 'medicare', 'medicaid',
    'practice', 'surgical', 'diagnostic', 'therapy', 'rehab', 'wellness', 'mental health',
    'pediatric', 'oncology', 'cardiology', 'dermatology', 'optometry', 'veterinary',
  ],
  legal: [
    'law', 'legal', 'attorney', 'lawyer', 'firm', 'litigation', 'counsel', 'paralegal',
    'court', 'compliance', 'regulatory', 'ip', 'patent', 'trademark', 'corporate law',
    'contract', 'mediation', 'arbitration', 'defense', 'prosecution', 'notary',
    'estate planning', 'immigration', 'tax law', 'environmental law', 'labor law',
  ],
  real_estate: [
    'real estate', 'realty', 'property', 'brokerage', 'mls', 'mortgage', 'lending',
    'residential', 'commercial', 'appraisal', 'title', 'escrow', 'leasing', 'rental',
    'development', 'investment property', 'reit', 'property management', 'condo',
    'homebuilder', 'realtor', 'agent', 'broker', 'closing', 'listing',
  ],
  construction: [
    'construction', 'contractor', 'builder', 'general contractor', 'subcontractor',
    'architecture', 'engineering', 'plumbing', 'electrical', 'hvac', 'roofing',
    'excavation', 'concrete', 'steel', 'framing', 'drywall', 'painting',
    'project management', 'estimating', 'bidding', 'osha', 'safety', 'blueprint',
    'procore', 'bluebeam', 'buildertrend', 'heavy civil', 'infrastructure',
  ],
  financial_services: [
    'finance', 'financial', 'banking', 'bank', 'credit union', 'insurance',
    'investment', 'wealth', 'advisory', 'brokerage', 'securities', 'trading',
    'fintech', 'lending', 'mortgage', 'underwriting', 'compliance', 'audit',
    'tax', 'accounting', 'cpa', 'bookkeeping', 'payroll', 'treasury',
    'risk management', 'portfolio', 'hedge fund', 'private equity', 'venture capital',
  ],
};

const COMPANY_SIZE_MAP: Record<string, CompanySize> = {
  '1': 'solo', '2-10': 'small', '11-50': 'medium', '51-200': 'large',
  '201-500': 'enterprise', '500+': 'enterprise',
};

const FIRST_TASK_TEMPLATES: FirstTaskTemplate[] = [
  {
    id: 'healthcare_patient_intake',
    vertical: 'healthcare',
    title: 'Process a Sample Patient Intake Form',
    description: 'Watch your AI Patient Coordinator process a sample intake form, verify insurance eligibility, and create a patient record.',
    estimated_minutes: 2,
    employee_id: 'patient_coordinator',
    prompt_template: 'Process this new patient intake: Name: Jane Smith, DOB: 1985-03-15, Insurance: Blue Cross PPO #BC123456789. Verify eligibility, check for any pre-authorization requirements, and create a preliminary patient record.',
    expected_outcome: 'Complete patient record with verified insurance, flagged pre-auth needs, and scheduled follow-up tasks.',
    success_criteria: ['patient_record_created', 'insurance_verified', 'tasks_generated'],
    demo_mode: true,
  },
  {
    id: 'legal_contract_review',
    vertical: 'legal',
    title: 'Review a Sample NDA',
    description: 'See your AI Contract Analyst review a standard NDA, flag non-standard terms, and suggest redlines.',
    estimated_minutes: 2,
    employee_id: 'contract_analyst',
    prompt_template: 'Review this mutual NDA between Acme Corp and Beta Inc. Flag any non-standard terms, assess risk level, and suggest redline modifications. Pay attention to: term length, definition of confidential information, exclusions, and remedies.',
    expected_outcome: 'Annotated NDA with risk assessment, flagged clauses, and suggested redlines.',
    success_criteria: ['risks_identified', 'redlines_suggested', 'summary_generated'],
    demo_mode: true,
  },
  {
    id: 'real_estate_listing',
    vertical: 'real_estate',
    title: 'Generate a Property Listing',
    description: 'Watch your AI Listing Coordinator create a compelling property listing from basic details.',
    estimated_minutes: 2,
    employee_id: 'listing_coord',
    prompt_template: 'Create a listing for: 4BR/3BA single family home, 2,400 sq ft, built 2018, updated kitchen with quartz counters, hardwood floors, fenced backyard, 2-car garage, near top-rated schools. Price: $485,000. Address: 123 Oak Lane, Springfield.',
    expected_outcome: 'Professional MLS-ready listing with description, highlights, and marketing copy.',
    success_criteria: ['listing_created', 'photos_tagged', 'marketing_copy_generated'],
    demo_mode: true,
  },
  {
    id: 'construction_estimate',
    vertical: 'construction',
    title: 'Generate a Quick Project Estimate',
    description: 'See your AI Estimator create a rough order of magnitude estimate for a sample commercial project.',
    estimated_minutes: 2,
    employee_id: 'estimator',
    prompt_template: 'Create a rough order of magnitude estimate for: 5,000 sq ft commercial office buildout. Scope: demolition of existing interior, new framing, electrical, plumbing, HVAC modifications, drywall, flooring (LVP), paint, and basic finish carpentry. Location: Denver, CO.',
    expected_outcome: 'ROM estimate with line items, labor/material split, and contingency.',
    success_criteria: ['estimate_created', 'line_items_generated', 'total_calculated'],
    demo_mode: true,
  },
  {
    id: 'financial_kyc',
    vertical: 'financial_services',
    title: 'Run a Sample KYC Check',
    description: 'Watch your AI KYC Analyst perform a know-your-customer check on a sample business account application.',
    estimated_minutes: 2,
    employee_id: 'kyc_analyst',
    prompt_template: 'Perform KYC due diligence on new business account application: Company: TechStart LLC, State: Delaware, EIN: 12-3456789, Beneficial Owner: John Doe (CEO, 80% ownership). Check entity verification, beneficial ownership, sanctions screening, and risk categorization.',
    expected_outcome: 'KYC report with risk rating, verification status, and any flags.',
    success_criteria: ['entity_verified', 'risk_rated', 'report_generated'],
    demo_mode: true,
  },
  {
    id: 'general_hr_task',
    vertical: 'general',
    title: 'Draft an Employee Offer Letter',
    description: 'Ask your AI HR Assistant to draft a professional offer letter for a new hire.',
    estimated_minutes: 2,
    employee_id: 'hr_assistant',
    prompt_template: 'Draft an offer letter for: Position: Senior Software Engineer, Salary: $145,000/year, Start Date: April 1, 2026, Benefits: Medical/Dental/Vision, 401k match 4%, 20 days PTO, signing bonus: $10,000. Candidate: Alex Johnson.',
    expected_outcome: 'Professional offer letter ready for review and sending.',
    success_criteria: ['letter_drafted', 'terms_included', 'format_professional'],
    demo_mode: true,
  },
];

const ONBOARDING_MILESTONES: OnboardingMilestone[] = [
  { id: 'profile_complete', title: 'Profile Complete', description: 'Set up your company profile', reward: 'Personalized AI recommendations unlocked', achieved: false, achieved_at: null },
  { id: 'first_employee', title: 'First Hire', description: 'Activate your first AI employee', reward: '100 bonus AI credits', achieved: false, achieved_at: null },
  { id: 'first_task', title: 'First Task', description: 'Complete your first AI task', reward: 'Achievement badge: AI Pioneer', achieved: false, achieved_at: null },
  { id: 'team_player', title: 'Team Player', description: 'Invite a team member', reward: 'Unlock team collaboration features', achieved: false, achieved_at: null },
  { id: 'connected', title: 'Connected', description: 'Set up your first integration', reward: 'Priority support for 30 days', achieved: false, achieved_at: null },
  { id: 'power_user', title: 'Power User', description: 'Complete all onboarding steps', reward: '500 bonus AI credits + Power User badge', achieved: false, achieved_at: null },
];

// ══════════════════════════════════════════════════════
// RE-ENGAGEMENT DRIP CONFIGURATION
// ══════════════════════════════════════════════════════

interface DripMessage {
  trigger: string;
  delay_hours: number;
  subject: string;
  template: string;
  channel: 'email' | 'in_app' | 'both';
}

const REENGAGEMENT_DRIPS: DripMessage[] = [
  {
    trigger: 'idle_1h',
    delay_hours: 1,
    subject: 'Your AI team is waiting! 🤖',
    template: 'Hi {{name}}, you started setting up your NexusHR workspace but didn\'t finish. You\'re {{progress}}% done — pick up where you left off and meet your AI team in under {{remaining_minutes}} minutes.',
    channel: 'in_app',
  },
  {
    trigger: 'idle_24h',
    delay_hours: 24,
    subject: 'Your AI employees are ready to work',
    template: 'Hi {{name}}, your NexusHR workspace is {{progress}}% set up. Your {{vertical}} AI team is pre-trained and ready to start saving you {{estimated_hours}} hours per week. Complete setup now — it takes less than {{remaining_minutes}} minutes.',
    channel: 'email',
  },
  {
    trigger: 'idle_72h',
    delay_hours: 72,
    subject: '{{name}}, see what you\'re missing',
    template: 'Hi {{name}}, companies like yours save an average of {{avg_savings}} per month with NexusHR. Your {{vertical}} pack includes {{employee_count}} AI employees ready to handle {{top_task}}. Complete your setup in {{remaining_minutes}} minutes.',
    channel: 'email',
  },
  {
    trigger: 'idle_168h',
    delay_hours: 168,
    subject: 'Last chance: Your trial is running',
    template: 'Hi {{name}}, your 14-day trial is ticking. You\'ve only used {{days_used}} of 14 days. Set up takes {{remaining_minutes}} minutes and your AI team can start delivering value today.',
    channel: 'both',
  },
];

// ══════════════════════════════════════════════════════
// GUIDED ONBOARDING ENGINE
// ══════════════════════════════════════════════════════

export class GuidedOnboardingEngine {
  constructor(private db: any, private kv: any) {}

  // ── Session Management ──

  async startOnboarding(userId: string, orgId: string): Promise<OnboardingSession> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const session: OnboardingSession = {
      id,
      user_id: userId,
      org_id: orgId,
      status: 'in_progress',
      current_step: 'welcome',
      steps_completed: [],
      company_profile: null,
      selected_vertical: null,
      selected_employees: [],
      selected_integrations: [],
      team_invites: [],
      first_task_completed: false,
      dashboard_configured: false,
      started_at: now,
      updated_at: now,
      completed_at: null,
      time_spent_seconds: 0,
      drop_off_alerts: [],
      metadata: {},
    };

    await this.db.prepare(`
      INSERT INTO onboarding_sessions (id, user_id, org_id, status, current_step, data, started_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, orgId, 'in_progress', 'welcome', JSON.stringify(session), now, now).run();

    // Cache for fast access
    await this.kv.put(`onboarding:${userId}`, JSON.stringify(session), { expirationTtl: 86400 * 30 });

    return session;
  }

  async getSession(userId: string): Promise<OnboardingSession | null> {
    // Try cache first
    const cached = await this.kv.get(`onboarding:${userId}`);
    if (cached) return JSON.parse(cached);

    const result = await this.db.prepare(`
      SELECT data FROM onboarding_sessions WHERE user_id = ? AND status != 'abandoned' ORDER BY started_at DESC LIMIT 1
    `).bind(userId).first();

    if (!result) return null;
    const session = JSON.parse(result.data as string);
    await this.kv.put(`onboarding:${userId}`, JSON.stringify(session), { expirationTtl: 86400 * 30 });
    return session;
  }

  async updateSession(userId: string, updates: Partial<OnboardingSession>): Promise<OnboardingSession> {
    const session = await this.getSession(userId);
    if (!session) throw new Error('No onboarding session found');

    const updated = { ...session, ...updates, updated_at: new Date().toISOString() };

    await this.db.prepare(`
      UPDATE onboarding_sessions SET data = ?, current_step = ?, status = ?, updated_at = ? WHERE id = ?
    `).bind(JSON.stringify(updated), updated.current_step, updated.status, updated.updated_at, session.id).run();

    await this.kv.put(`onboarding:${userId}`, JSON.stringify(updated), { expirationTtl: 86400 * 30 });
    return updated;
  }

  // ── Step Progression ──

  async completeStep(userId: string, stepId: OnboardingStepId, stepData?: Record<string, any>): Promise<OnboardingSession> {
    const session = await this.getSession(userId);
    if (!session) throw new Error('No onboarding session found');

    const stepsCompleted = [...new Set([...session.steps_completed, stepId])];
    const nextStep = this.getNextStep(stepId, session);

    const updates: Partial<OnboardingSession> = {
      steps_completed: stepsCompleted,
      current_step: nextStep,
    };

    // Process step-specific data
    if (stepId === 'company_profile' && stepData?.profile) {
      updates.company_profile = stepData.profile as CompanyProfile;
    }
    if (stepId === 'industry_select' && stepData?.vertical) {
      updates.selected_vertical = stepData.vertical;
    }
    if (stepId === 'ai_employees' && stepData?.employees) {
      updates.selected_employees = stepData.employees;
    }
    if (stepId === 'integrations' && stepData?.integrations) {
      updates.selected_integrations = stepData.integrations;
    }
    if (stepId === 'team_setup' && stepData?.invites) {
      updates.team_invites = stepData.invites;
    }
    if (stepId === 'first_task') {
      updates.first_task_completed = true;
    }
    if (stepId === 'dashboard_customize') {
      updates.dashboard_configured = true;
    }

    // Check if onboarding is complete
    if (nextStep === 'completed') {
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
    }

    // Update metadata with step timing
    if (stepData?.time_spent_seconds) {
      updates.time_spent_seconds = (session.time_spent_seconds || 0) + stepData.time_spent_seconds;
    }

    return this.updateSession(userId, updates);
  }

  private getNextStep(currentStep: OnboardingStepId, session: OnboardingSession): OnboardingStepId {
    const stepOrder: OnboardingStepId[] = ONBOARDING_STEPS.map(s => s.id);
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex >= stepOrder.length - 1) return 'completed';

    // Skip optional steps if conditions met
    for (let i = currentIndex + 1; i < stepOrder.length; i++) {
      const step = ONBOARDING_STEPS[i];
      if (!step.required && this.shouldSkipStep(step, session)) continue;
      return step.id;
    }
    return 'completed';
  }

  private shouldSkipStep(step: OnboardingStep, session: OnboardingSession): boolean {
    if (step.id === 'team_setup' && session.company_profile?.size === 'solo') return true;
    if (step.id === 'integrations' && session.selected_vertical === null) return true;
    return false;
  }

  async skipStep(userId: string, stepId: OnboardingStepId): Promise<OnboardingSession> {
    const session = await this.getSession(userId);
    if (!session) throw new Error('No onboarding session found');

    const step = ONBOARDING_STEPS.find(s => s.id === stepId);
    if (step?.required) throw new Error('Cannot skip required step');

    const nextStep = this.getNextStep(stepId, session);
    return this.updateSession(userId, {
      current_step: nextStep,
      steps_completed: [...new Set([...session.steps_completed, stepId])],
    });
  }

  // ── Industry Detection & Recommendations ──

  detectIndustry(profile: CompanyProfile): OnboardingRecommendation[] {
    const recommendations: OnboardingRecommendation[] = [];
    const searchText = `${profile.industry} ${profile.industry_sub} ${profile.pain_points.join(' ')} ${profile.current_tools.join(' ')}`.toLowerCase();

    for (const [verticalId, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
      const matchedKeywords = keywords.filter(kw => searchText.includes(kw));
      if (matchedKeywords.length === 0) continue;

      const confidence = Math.min(matchedKeywords.length / 5, 1);
      const goalBoost = this.calculateGoalBoost(profile.goals, verticalId);
      const toolBoost = this.calculateToolBoost(profile.current_tools, verticalId);

      recommendations.push({
        vertical_id: verticalId,
        confidence: Math.min(confidence + goalBoost + toolBoost, 1),
        reasons: this.generateReasons(verticalId, matchedKeywords, profile),
        recommended_employees: this.getRecommendedEmployees(verticalId, profile),
        recommended_integrations: this.getRecommendedIntegrations(verticalId, profile),
        estimated_time_savings_hours: this.estimateTimeSavings(verticalId, profile),
        estimated_cost_savings_monthly: this.estimateCostSavings(verticalId, profile),
      });
    }

    // Sort by confidence, return top 3
    return recommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }

  private calculateGoalBoost(goals: OnboardingGoal[], vertical: string): number {
    const goalMap: Record<string, string[]> = {
      healthcare: ['compliance', 'reduce_costs', 'automate_hr'],
      legal: ['compliance', 'automate_hr', 'reduce_costs'],
      real_estate: ['scale_operations', 'improve_hiring', 'automate_hr'],
      construction: ['compliance', 'scale_operations', 'reduce_costs'],
      financial_services: ['compliance', 'reduce_costs', 'automate_hr'],
    };
    const matches = goals.filter(g => goalMap[vertical]?.includes(g));
    return matches.length * 0.1;
  }

  private calculateToolBoost(tools: string[], vertical: string): number {
    const toolMap: Record<string, string[]> = {
      healthcare: ['epic', 'cerner', 'athena', 'waystar', 'availity', 'meditech', 'allscripts'],
      legal: ['clio', 'westlaw', 'lexisnexis', 'relativity', 'docusign', 'lawpay'],
      real_estate: ['mls', 'dotloop', 'followupboss', 'zillow', 'boomtown', 'kvcore'],
      construction: ['procore', 'bluebeam', 'buildertrend', 'plangrid', 'fieldwire'],
      financial_services: ['fiserv', 'plaid', 'bloomberg', 'salesforce', 'morningstar'],
    };
    const matches = tools.map(t => t.toLowerCase()).filter(t => toolMap[vertical]?.some(tw => t.includes(tw)));
    return matches.length * 0.15;
  }

  private generateReasons(vertical: string, matchedKeywords: string[], profile: CompanyProfile): string[] {
    const reasons: string[] = [];
    reasons.push(`Your industry profile matches our ${vertical.replace('_', ' ')} vertical (${matchedKeywords.length} keyword matches)`);

    if (profile.goals.includes('compliance')) {
      reasons.push(`Our ${vertical.replace('_', ' ')} pack includes built-in compliance frameworks for your industry regulations`);
    }
    if (profile.goals.includes('reduce_costs')) {
      reasons.push('AI employees in this pack can automate high-volume, repetitive tasks in your workflow');
    }
    if (profile.employee_count > 50) {
      reasons.push('Your company size will benefit from the full-scale workforce automation this pack provides');
    }
    return reasons;
  }

  private getRecommendedEmployees(vertical: string, profile: CompanyProfile): RecommendedEmployee[] {
    const employeeMaps: Record<string, RecommendedEmployee[]> = {
      healthcare: [
        { employee_id: 'patient_coordinator', role: 'patient_coordinator', title: 'AI Patient Coordinator', match_score: 0.95, reason: 'Handles intake, scheduling, and patient communications', priority: 'essential' },
        { employee_id: 'medical_coder', role: 'medical_coder', title: 'AI Medical Coder', match_score: 0.92, reason: 'Automates ICD-10/CPT coding for faster billing', priority: 'essential' },
        { employee_id: 'billing_specialist', role: 'billing_specialist', title: 'AI Billing Specialist', match_score: 0.90, reason: 'Processes claims, handles denials, verifies insurance', priority: 'essential' },
        { employee_id: 'compliance_officer', role: 'compliance_officer', title: 'AI HIPAA Compliance Officer', match_score: 0.88, reason: 'Monitors HIPAA compliance and flags violations', priority: 'recommended' },
        { employee_id: 'telehealth_assistant', role: 'telehealth_assistant', title: 'AI Telehealth Assistant', match_score: 0.75, reason: 'Manages virtual visit scheduling and follow-ups', priority: 'optional' },
      ],
      legal: [
        { employee_id: 'contract_analyst', role: 'contract_analyst', title: 'AI Contract Analyst', match_score: 0.95, reason: 'Reviews, redlines, and summarizes contracts', priority: 'essential' },
        { employee_id: 'paralegal', role: 'paralegal', title: 'AI Paralegal', match_score: 0.93, reason: 'Handles document prep, case research, and filing', priority: 'essential' },
        { employee_id: 'billing_clerk', role: 'billing_clerk', title: 'AI Legal Billing Clerk', match_score: 0.85, reason: 'Automates time tracking and client invoicing', priority: 'recommended' },
        { employee_id: 'compliance_analyst', role: 'compliance_analyst', title: 'AI Compliance Analyst', match_score: 0.82, reason: 'Tracks regulatory changes and ensures compliance', priority: 'recommended' },
        { employee_id: 'legal_researcher', role: 'legal_researcher', title: 'AI Legal Researcher', match_score: 0.78, reason: 'Deep research on case law and precedents', priority: 'optional' },
      ],
      real_estate: [
        { employee_id: 'lead_agent', role: 'lead_agent', title: 'AI Lead Agent', match_score: 0.95, reason: 'Qualifies and nurtures leads 24/7', priority: 'essential' },
        { employee_id: 'transaction_coord', role: 'transaction_coord', title: 'AI Transaction Coordinator', match_score: 0.92, reason: 'Manages deal pipeline from offer to closing', priority: 'essential' },
        { employee_id: 'listing_coord', role: 'listing_coord', title: 'AI Listing Coordinator', match_score: 0.88, reason: 'Creates listings, manages photos, coordinates showings', priority: 'essential' },
        { employee_id: 'market_analyst', role: 'market_analyst', title: 'AI Market Analyst', match_score: 0.80, reason: 'Provides CMA reports and market insights', priority: 'recommended' },
        { employee_id: 'property_manager', role: 'property_manager', title: 'AI Property Manager', match_score: 0.72, reason: 'Handles tenant communications and maintenance', priority: 'optional' },
      ],
      construction: [
        { employee_id: 'estimator', role: 'estimator', title: 'AI Estimator', match_score: 0.95, reason: 'Generates accurate cost estimates and takeoffs', priority: 'essential' },
        { employee_id: 'project_mgr', role: 'project_mgr', title: 'AI Project Manager', match_score: 0.93, reason: 'Tracks schedules, budgets, and change orders', priority: 'essential' },
        { employee_id: 'safety_officer', role: 'safety_officer', title: 'AI Safety Officer', match_score: 0.90, reason: 'Monitors OSHA compliance and safety incidents', priority: 'essential' },
        { employee_id: 'procurement', role: 'procurement', title: 'AI Procurement Specialist', match_score: 0.82, reason: 'Manages material ordering and vendor quotes', priority: 'recommended' },
        { employee_id: 'billing_coord', role: 'billing_coord', title: 'AI Billing Coordinator', match_score: 0.75, reason: 'Handles AIA billing and lien waivers', priority: 'optional' },
      ],
      financial_services: [
        { employee_id: 'kyc_analyst', role: 'kyc_analyst', title: 'AI KYC Analyst', match_score: 0.95, reason: 'Automates customer verification and due diligence', priority: 'essential' },
        { employee_id: 'risk_analyst', role: 'risk_analyst', title: 'AI Risk Analyst', match_score: 0.93, reason: 'Monitors risk exposure and generates reports', priority: 'essential' },
        { employee_id: 'loan_processor', role: 'loan_processor', title: 'AI Loan Processor', match_score: 0.88, reason: 'Accelerates loan application processing', priority: 'essential' },
        { employee_id: 'sox_auditor', role: 'sox_auditor', title: 'AI SOX Auditor', match_score: 0.85, reason: 'Continuous SOX compliance monitoring', priority: 'recommended' },
        { employee_id: 'fraud_analyst', role: 'fraud_analyst', title: 'AI Fraud Analyst', match_score: 0.80, reason: 'Real-time transaction monitoring for fraud patterns', priority: 'optional' },
      ],
    };

    return employeeMaps[vertical] || [];
  }

  private getRecommendedIntegrations(vertical: string, profile: CompanyProfile): RecommendedIntegration[] {
    const integrationMaps: Record<string, RecommendedIntegration[]> = {
      healthcare: [
        { integration_id: 'epic', name: 'Epic EHR', icon: '🏥', match_score: 0.95, reason: 'Connect your patient records for seamless data flow', auth_type: 'oauth', setup_time_minutes: 3 },
        { integration_id: 'waystar', name: 'Waystar RCM', icon: '💰', match_score: 0.85, reason: 'Automate claims and revenue cycle management', auth_type: 'api_key', setup_time_minutes: 5 },
        { integration_id: 'availity', name: 'Availity', icon: '✅', match_score: 0.80, reason: 'Real-time insurance eligibility verification', auth_type: 'api_key', setup_time_minutes: 5 },
      ],
      legal: [
        { integration_id: 'clio', name: 'Clio', icon: '⚖️', match_score: 0.95, reason: 'Sync matters, contacts, and billing data', auth_type: 'oauth', setup_time_minutes: 2 },
        { integration_id: 'docusign', name: 'DocuSign', icon: '✍️', match_score: 0.90, reason: 'E-signature workflows for contracts and agreements', auth_type: 'oauth', setup_time_minutes: 2 },
        { integration_id: 'westlaw', name: 'Westlaw', icon: '📚', match_score: 0.80, reason: 'Legal research and case law access', auth_type: 'api_key', setup_time_minutes: 5 },
      ],
      real_estate: [
        { integration_id: 'mls', name: 'MLS', icon: '🏠', match_score: 0.95, reason: 'Pull listing data and market analytics', auth_type: 'api_key', setup_time_minutes: 5 },
        { integration_id: 'dotloop', name: 'Dotloop', icon: '🔄', match_score: 0.88, reason: 'Transaction management and document signing', auth_type: 'oauth', setup_time_minutes: 2 },
        { integration_id: 'followupboss', name: 'Follow Up Boss', icon: '📞', match_score: 0.82, reason: 'CRM integration for lead management', auth_type: 'oauth', setup_time_minutes: 2 },
      ],
      construction: [
        { integration_id: 'procore', name: 'Procore', icon: '🏗️', match_score: 0.95, reason: 'Project management and field productivity', auth_type: 'oauth', setup_time_minutes: 3 },
        { integration_id: 'bluebeam', name: 'Bluebeam Revu', icon: '📐', match_score: 0.85, reason: 'Plan review and markup workflows', auth_type: 'api_key', setup_time_minutes: 5 },
        { integration_id: 'buildertrend', name: 'Buildertrend', icon: '🏡', match_score: 0.80, reason: 'Construction project management for residential', auth_type: 'oauth', setup_time_minutes: 3 },
      ],
      financial_services: [
        { integration_id: 'plaid', name: 'Plaid', icon: '🔗', match_score: 0.95, reason: 'Bank account verification and transaction data', auth_type: 'api_key', setup_time_minutes: 3 },
        { integration_id: 'fiserv', name: 'Fiserv', icon: '🏦', match_score: 0.88, reason: 'Core banking and payment processing', auth_type: 'api_key', setup_time_minutes: 5 },
        { integration_id: 'bloomberg', name: 'Bloomberg', icon: '📊', match_score: 0.80, reason: 'Market data and financial analytics', auth_type: 'api_key', setup_time_minutes: 5 },
      ],
    };
    return integrationMaps[vertical] || [];
  }

  private estimateTimeSavings(vertical: string, profile: CompanyProfile): number {
    const baseSavings: Record<string, number> = {
      healthcare: 25, legal: 30, real_estate: 20, construction: 22, financial_services: 28,
    };
    const base = baseSavings[vertical] || 15;
    const sizeMultiplier = profile.employee_count > 100 ? 2.5 : profile.employee_count > 50 ? 1.8 : profile.employee_count > 10 ? 1.3 : 1;
    return Math.round(base * sizeMultiplier);
  }

  private estimateCostSavings(vertical: string, profile: CompanyProfile): number {
    const hours = this.estimateTimeSavings(vertical, profile);
    const avgHourlyRate: Record<string, number> = {
      healthcare: 45, legal: 85, real_estate: 55, construction: 50, financial_services: 75,
    };
    return Math.round(hours * 4.3 * (avgHourlyRate[vertical] || 40));
  }

  // ── First Task Experience ──

  getFirstTaskTemplates(vertical: string | null): FirstTaskTemplate[] {
    if (!vertical) return FIRST_TASK_TEMPLATES.filter(t => t.vertical === 'general');
    return FIRST_TASK_TEMPLATES.filter(t => t.vertical === vertical || t.vertical === 'general');
  }

  async completeFirstTask(userId: string, taskId: string, result: Record<string, any>): Promise<{ success: boolean; feedback: string; nextSteps: string[] }> {
    const template = FIRST_TASK_TEMPLATES.find(t => t.id === taskId);
    if (!template) throw new Error('Task template not found');

    const criteriaMetCount = template.success_criteria.filter(c => result[c] === true).length;
    const success = criteriaMetCount >= Math.ceil(template.success_criteria.length / 2);

    await this.completeStep(userId, 'first_task', { time_spent_seconds: result.time_spent_seconds || 120 });

    return {
      success,
      feedback: success
        ? `Great work! Your AI ${template.employee_id.replace('_', ' ')} completed the task successfully. This is just a sample of what it can do with your real data.`
        : `The task was partially completed. Don't worry — AI employees improve as they learn your specific workflows and preferences.`,
      nextSteps: [
        'Try a task with your own real data',
        'Explore other AI employees in your pack',
        'Set up automated workflows for recurring tasks',
        'Customize AI employee personalities and terminology',
      ],
    };
  }

  // ── Milestones & Progress ──

  getMilestones(session: OnboardingSession): OnboardingMilestone[] {
    const milestones = JSON.parse(JSON.stringify(ONBOARDING_MILESTONES));

    if (session.company_profile) {
      const m = milestones.find((m: any) => m.id === 'profile_complete');
      if (m) { m.achieved = true; m.achieved_at = session.updated_at; }
    }
    if (session.selected_employees.length > 0) {
      const m = milestones.find((m: any) => m.id === 'first_employee');
      if (m) { m.achieved = true; m.achieved_at = session.updated_at; }
    }
    if (session.first_task_completed) {
      const m = milestones.find((m: any) => m.id === 'first_task');
      if (m) { m.achieved = true; m.achieved_at = session.updated_at; }
    }
    if (session.team_invites.length > 0) {
      const m = milestones.find((m: any) => m.id === 'team_player');
      if (m) { m.achieved = true; m.achieved_at = session.updated_at; }
    }
    if (session.selected_integrations.length > 0) {
      const m = milestones.find((m: any) => m.id === 'connected');
      if (m) { m.achieved = true; m.achieved_at = session.updated_at; }
    }
    if (session.status === 'completed') {
      const m = milestones.find((m: any) => m.id === 'power_user');
      if (m) { m.achieved = true; m.achieved_at = session.completed_at; }
    }

    return milestones;
  }

  getProgress(session: OnboardingSession): { percentage: number; current_step: OnboardingStep | null; steps_remaining: number; estimated_minutes_remaining: number } {
    const totalWeight = ONBOARDING_STEPS.reduce((sum, s) => sum + s.progress_weight, 0);
    const completedWeight = ONBOARDING_STEPS
      .filter(s => session.steps_completed.includes(s.id))
      .reduce((sum, s) => sum + s.progress_weight, 0);

    const currentStep = ONBOARDING_STEPS.find(s => s.id === session.current_step) || null;
    const remainingSteps = ONBOARDING_STEPS.filter(s => !session.steps_completed.includes(s.id) && s.id !== 'completed');

    return {
      percentage: Math.round((completedWeight / totalWeight) * 100),
      current_step: currentStep,
      steps_remaining: remainingSteps.length,
      estimated_minutes_remaining: remainingSteps.reduce((sum, s) => sum + s.estimated_minutes, 0),
    };
  }

  // ── Onboarding Steps Data ──

  getSteps(): OnboardingStep[] {
    return ONBOARDING_STEPS;
  }

  getStepById(stepId: OnboardingStepId): OnboardingStep | null {
    return ONBOARDING_STEPS.find(s => s.id === stepId) || null;
  }

  // ── Re-engagement ──

  async checkForDropOff(userId: string): Promise<DripMessage | null> {
    const session = await this.getSession(userId);
    if (!session || session.status === 'completed') return null;

    const lastUpdate = new Date(session.updated_at).getTime();
    const now = Date.now();
    const idleHours = (now - lastUpdate) / (1000 * 60 * 60);

    // Find the appropriate drip message
    const applicableDrips = REENGAGEMENT_DRIPS
      .filter(d => idleHours >= d.delay_hours)
      .sort((a, b) => b.delay_hours - a.delay_hours);

    if (applicableDrips.length === 0) return null;

    // Check if we already sent this one
    const latestDrip = applicableDrips[0];
    const alreadySent = session.drop_off_alerts.some(
      a => a.step === session.current_step && a.idle_seconds >= latestDrip.delay_hours * 3600
    );

    if (alreadySent) return null;

    // Record the alert
    session.drop_off_alerts.push({
      step: session.current_step,
      idle_seconds: Math.round(idleHours * 3600),
      triggered_at: new Date().toISOString(),
      action_taken: latestDrip.channel === 'in_app' ? 'in_app_nudge' : 'email_sent',
    });

    await this.updateSession(userId, { drop_off_alerts: session.drop_off_alerts });
    return latestDrip;
  }

  // ── Analytics ──

  async getAnalytics(orgId?: string): Promise<OnboardingAnalytics> {
    const whereClause = orgId ? `WHERE org_id = '${orgId}'` : '';

    const total = await this.db.prepare(`SELECT COUNT(*) as cnt FROM onboarding_sessions ${whereClause}`).first();
    const completed = await this.db.prepare(`SELECT COUNT(*) as cnt FROM onboarding_sessions ${whereClause ? whereClause + " AND" : "WHERE"} status = 'completed'`).first();

    const timings = await this.db.prepare(`
      SELECT data FROM onboarding_sessions ${whereClause ? whereClause + " AND" : "WHERE"} status = 'completed' ORDER BY completed_at DESC LIMIT 100
    `).all();

    const times = (timings.results || []).map((r: any) => {
      const d = JSON.parse(r.data);
      return d.time_spent_seconds || 0;
    }).sort((a: number, b: number) => a - b);

    const avgTime = times.length > 0 ? times.reduce((a: number, b: number) => a + b, 0) / times.length : 0;
    const medianTime = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;

    // Compute drop-off by step
    const allSessions = await this.db.prepare(`SELECT data FROM onboarding_sessions ${whereClause} LIMIT 500`).all();
    const dropOffByStep: Record<string, number> = {};
    for (const step of ONBOARDING_STEPS) {
      dropOffByStep[step.id] = 0;
    }
    for (const row of (allSessions.results || [])) {
      const s = JSON.parse((row as any).data);
      if (s.status === 'abandoned' || (s.status === 'in_progress' && new Date(s.updated_at).getTime() < Date.now() - 7 * 86400000)) {
        dropOffByStep[s.current_step] = (dropOffByStep[s.current_step] || 0) + 1;
      }
    }

    // Most selected vertical
    const verticalCounts: Record<string, number> = {};
    const employeeCounts: Record<string, number> = {};
    for (const row of (allSessions.results || [])) {
      const s = JSON.parse((row as any).data);
      if (s.selected_vertical) {
        verticalCounts[s.selected_vertical] = (verticalCounts[s.selected_vertical] || 0) + 1;
      }
      for (const emp of s.selected_employees || []) {
        employeeCounts[emp] = (employeeCounts[emp] || 0) + 1;
      }
    }

    const topVertical = Object.entries(verticalCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
    const topEmployees = Object.entries(employeeCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([e]) => e);

    return {
      total_sessions: (total as any)?.cnt || 0,
      completion_rate: (total as any)?.cnt > 0 ? ((completed as any)?.cnt || 0) / (total as any).cnt : 0,
      avg_completion_time_seconds: Math.round(avgTime),
      median_completion_time_seconds: Math.round(medianTime),
      drop_off_by_step: dropOffByStep as any,
      most_selected_vertical: topVertical,
      most_selected_employees: topEmployees,
      conversion_to_paid: 0, // Computed from billing data
      nps_score: 0, // Computed from surveys
    };
  }

  // ── Auto-Provisioning ──

  async provisionAIEmployees(userId: string, orgId: string, employeeIds: string[], vertical: string): Promise<{ provisioned: string[]; failed: string[]; message: string }> {
    const provisioned: string[] = [];
    const failed: string[] = [];

    for (const empId of employeeIds) {
      try {
        await this.db.prepare(`
          INSERT INTO provisioned_employees (id, user_id, org_id, employee_id, vertical, status, provisioned_at)
          VALUES (?, ?, ?, ?, ?, 'active', ?)
        `).bind(crypto.randomUUID(), userId, orgId, empId, vertical, new Date().toISOString()).run();
        provisioned.push(empId);
      } catch (e) {
        failed.push(empId);
      }
    }

    return {
      provisioned,
      failed,
      message: `Successfully activated ${provisioned.length} AI employee${provisioned.length !== 1 ? 's' : ''}${failed.length > 0 ? `. ${failed.length} failed to activate.` : '.'}`,
    };
  }

  // ── Team Invitation ──

  async sendTeamInvites(userId: string, invites: TeamInvite[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const invite of invites) {
      try {
        await this.db.prepare(`
          INSERT INTO team_invites (id, org_id, inviter_id, email, role, name, sent_at, status)
          VALUES (?, (SELECT org_id FROM onboarding_sessions WHERE user_id = ? LIMIT 1), ?, ?, ?, ?, ?, 'pending')
        `).bind(crypto.randomUUID(), userId, userId, invite.email, invite.role, invite.name, new Date().toISOString()).run();
        sent++;
      } catch (e) {
        failed++;
      }
    }

    // Update the onboarding session with the invites
    const session = await this.getSession(userId);
    if (session) {
      await this.updateSession(userId, {
        team_invites: [...session.team_invites, ...invites.map(i => ({ ...i, sent_at: new Date().toISOString(), accepted: false }))],
      });
    }

    return { sent, failed };
  }

  // ── Dashboard Quick Setup ──

  async configureDashboard(userId: string, config: {
    layout: 'default' | 'compact' | 'wide';
    pinned_employees: string[];
    visible_widgets: string[];
    theme: 'light' | 'dark' | 'system';
    notifications: { email: boolean; in_app: boolean; slack: boolean };
  }): Promise<{ success: boolean }> {
    await this.db.prepare(`
      INSERT OR REPLACE INTO user_dashboard_config (user_id, layout, pinned_employees, visible_widgets, theme, notifications, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      config.layout,
      JSON.stringify(config.pinned_employees),
      JSON.stringify(config.visible_widgets),
      config.theme,
      JSON.stringify(config.notifications),
      new Date().toISOString()
    ).run();

    await this.completeStep(userId, 'dashboard_customize', { time_spent_seconds: 60 });
    return { success: true };
  }
}

// ══════════════════════════════════════════════════════
// DATABASE SCHEMA
// ══════════════════════════════════════════════════════

export const ONBOARDING_SCHEMA = `
-- Onboarding sessions
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  current_step TEXT NOT NULL DEFAULT 'welcome',
  data TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_org ON onboarding_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_sessions(status);

-- Provisioned AI employees per org
CREATE TABLE IF NOT EXISTS provisioned_employees (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  vertical TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  provisioned_at TEXT NOT NULL,
  deactivated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_prov_emp_org ON provisioned_employees(org_id);
CREATE INDEX IF NOT EXISTS idx_prov_emp_vertical ON provisioned_employees(vertical);

-- Team invitations
CREATE TABLE IF NOT EXISTS team_invites (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  inviter_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT,
  sent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_team_invite_org ON team_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_team_invite_email ON team_invites(email);

-- Dashboard configuration
CREATE TABLE IF NOT EXISTS user_dashboard_config (
  user_id TEXT PRIMARY KEY,
  layout TEXT NOT NULL DEFAULT 'default',
  pinned_employees TEXT NOT NULL DEFAULT '[]',
  visible_widgets TEXT NOT NULL DEFAULT '[]',
  theme TEXT NOT NULL DEFAULT 'system',
  notifications TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

-- Onboarding analytics events
CREATE TABLE IF NOT EXISTS onboarding_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  step_id TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_onboard_evt_session ON onboarding_events(session_id);
CREATE INDEX IF NOT EXISTS idx_onboard_evt_type ON onboarding_events(event_type);
`;

// ══════════════════════════════════════════════════════
// ROUTE HANDLER
// ══════════════════════════════════════════════════════

export async function handleOnboarding(request: Request, env: any, userId: string, path: string): Promise<Response> {
  const engine = new GuidedOnboardingEngine(env.DB, env.CACHE);
  const url = new URL(request.url);

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    // ── GET /api/onboarding/steps — List all onboarding steps
    if (path === '/api/onboarding/steps' && request.method === 'GET') {
      return json({ steps: engine.getSteps() });
    }

    // ── GET /api/onboarding/steps/:id — Get a single step
    if (path.match(/^\/api\/onboarding\/steps\/[\w]+$/) && request.method === 'GET') {
      const stepId = path.split('/').pop() as OnboardingStepId;
      const step = engine.getStepById(stepId);
      if (!step) return json({ error: 'Step not found' }, 404);
      return json({ step });
    }

    // ── POST /api/onboarding/start — Start onboarding session
    if (path === '/api/onboarding/start' && request.method === 'POST') {
      const body = await request.json() as any;
      const session = await engine.startOnboarding(userId, body.org_id || userId);
      return json({ session });
    }

    // ── GET /api/onboarding/session — Get current session
    if (path === '/api/onboarding/session' && request.method === 'GET') {
      const session = await engine.getSession(userId);
      if (!session) return json({ error: 'No onboarding session found', code: 'NO_SESSION' }, 404);
      return json({ session });
    }

    // ── GET /api/onboarding/progress — Get progress overview
    if (path === '/api/onboarding/progress' && request.method === 'GET') {
      const session = await engine.getSession(userId);
      if (!session) return json({ error: 'No onboarding session found' }, 404);
      const progress = engine.getProgress(session);
      const milestones = engine.getMilestones(session);
      return json({ progress, milestones });
    }

    // ── POST /api/onboarding/complete-step — Complete a step
    if (path === '/api/onboarding/complete-step' && request.method === 'POST') {
      const body = await request.json() as any;
      const session = await engine.completeStep(userId, body.step_id, body.data);
      const progress = engine.getProgress(session);
      return json({ session, progress });
    }

    // ── POST /api/onboarding/skip-step — Skip an optional step
    if (path === '/api/onboarding/skip-step' && request.method === 'POST') {
      const body = await request.json() as any;
      const session = await engine.skipStep(userId, body.step_id);
      const progress = engine.getProgress(session);
      return json({ session, progress });
    }

    // ── POST /api/onboarding/detect-industry — Detect industry & get recommendations
    if (path === '/api/onboarding/detect-industry' && request.method === 'POST') {
      const body = await request.json() as any;
      const recommendations = engine.detectIndustry(body.profile as CompanyProfile);
      return json({ recommendations });
    }

    // ── GET /api/onboarding/first-tasks — Get available first task templates
    if (path === '/api/onboarding/first-tasks' && request.method === 'GET') {
      const session = await engine.getSession(userId);
      const templates = engine.getFirstTaskTemplates(session?.selected_vertical || null);
      return json({ templates });
    }

    // ── POST /api/onboarding/first-tasks/complete — Complete first task
    if (path === '/api/onboarding/first-tasks/complete' && request.method === 'POST') {
      const body = await request.json() as any;
      const result = await engine.completeFirstTask(userId, body.task_id, body.result);
      return json(result);
    }

    // ── POST /api/onboarding/provision-employees — Auto-provision AI employees
    if (path === '/api/onboarding/provision-employees' && request.method === 'POST') {
      const body = await request.json() as any;
      const result = await engine.provisionAIEmployees(userId, body.org_id || userId, body.employee_ids, body.vertical);
      return json(result);
    }

    // ── POST /api/onboarding/invite-team — Send team invites
    if (path === '/api/onboarding/invite-team' && request.method === 'POST') {
      const body = await request.json() as any;
      const result = await engine.sendTeamInvites(userId, body.invites);
      return json(result);
    }

    // ── POST /api/onboarding/dashboard — Configure dashboard
    if (path === '/api/onboarding/dashboard' && request.method === 'POST') {
      const body = await request.json() as any;
      const result = await engine.configureDashboard(userId, body.config);
      return json(result);
    }

    // ── GET /api/onboarding/milestones — Get milestones
    if (path === '/api/onboarding/milestones' && request.method === 'GET') {
      const session = await engine.getSession(userId);
      if (!session) return json({ error: 'No onboarding session found' }, 404);
      return json({ milestones: engine.getMilestones(session) });
    }

    // ── GET /api/onboarding/check-dropoff — Check for drop-off re-engagement
    if (path === '/api/onboarding/check-dropoff' && request.method === 'GET') {
      const drip = await engine.checkForDropOff(userId);
      return json({ needs_reengagement: !!drip, drip_message: drip });
    }

    // ── GET /api/onboarding/analytics — Get onboarding analytics
    if (path === '/api/onboarding/analytics' && request.method === 'GET') {
      const orgId = url.searchParams.get('org_id') || undefined;
      const analytics = await engine.getAnalytics(orgId);
      return json({ analytics });
    }

    // ── POST /api/onboarding/schema — Initialize schema
    if (path === '/api/onboarding/schema' && request.method === 'POST') {
      const statements = ONBOARDING_SCHEMA.split(';').filter(s => s.trim());
      for (const stmt of statements) {
        await env.DB.prepare(stmt).run();
      }
      return json({ success: true, tables: 5, message: 'Onboarding schema initialized' });
    }

    return json({ error: 'Not Found', code: 'NOT_FOUND' }, 404);
  } catch (err: any) {
    return json({ error: err.message, code: 'ONBOARDING_ERROR' }, 500);
  }
}
