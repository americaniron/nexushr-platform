/**
 * NexusHR Industry Vertical AI Employee Packs
 *
 * Redesigned product architecture supporting industry-specific AI workforce deployments.
 *
 * Each vertical pack includes:
 * 1. 10–15 specialized AI employees with domain expertise
 * 2. Industry-specific workflows (pre-built DAG templates)
 * 3. Compliance frameworks & regulatory rules
 * 4. Tool integrations mapped to industry software
 * 5. Domain knowledge datasets (terminology, procedures, regulations)
 *
 * Supported Verticals:
 * - Healthcare AI Workforce
 * - Legal AI Workforce
 * - Real Estate AI Workforce
 * - Construction AI Workforce
 * - Financial Services AI Workforce
 *
 * Plus: Marketplace expansion for community/partner-built packs.
 */

// ══════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════

export type VerticalId = 'healthcare' | 'legal' | 'real_estate' | 'construction' | 'financial_services';
export type PackStatus = 'available' | 'installed' | 'trial' | 'deprecated';
export type EmployeeTier = 'core' | 'advanced' | 'specialist';
export type ComplianceUrgency = 'mandatory' | 'recommended' | 'optional';

export interface VerticalPack {
  id: VerticalId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  employees: VerticalEmployee[];
  workflows: VerticalWorkflow[];
  compliance: VerticalCompliance;
  integrations: VerticalIntegration[];
  knowledge_domains: KnowledgeDomain[];
  pricing: { monthly_addon: number; annual_addon: number; per_employee: number };
  stats: { companies_using: number; avg_time_saved_hours: number; satisfaction: number };
}

export interface VerticalEmployee {
  id: string;
  vertical: VerticalId;
  role: string;
  title: string;
  description: string;
  tier: EmployeeTier;
  expertise: string[];
  tools: string[];
  personality: {
    tone: string; formality: number; verbosity: number;
    domain_confidence: number; empathy: number;
  };
  system_prompt_additions: string;
  training_topics: string[];
  example_tasks: string[];
  compliance_awareness: string[];
  kpis: string[];
}

export interface VerticalWorkflow {
  id: string;
  vertical: VerticalId;
  name: string;
  description: string;
  trigger: string;
  category: string;
  steps: VerticalWorkflowStep[];
  estimated_time_minutes: number;
  employees_involved: string[];
  compliance_checks: string[];
}

export interface VerticalWorkflowStep {
  name: string;
  employee_role: string;
  action: string;
  tools: string[];
  inputs: string[];
  outputs: string[];
  gate: 'all' | 'any' | 'manual' | 'none';
  dependencies: string[];
}

export interface VerticalCompliance {
  frameworks: string[];
  regulations: ComplianceRegulation[];
  audit_requirements: string[];
  data_handling_rules: DataHandlingRule[];
  reporting_obligations: string[];
}

export interface ComplianceRegulation {
  id: string;
  name: string;
  authority: string;
  urgency: ComplianceUrgency;
  description: string;
  requirements: string[];
  ai_guardrails: string[];
  penalties: string;
}

export interface DataHandlingRule {
  data_type: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  encryption_required: boolean;
  retention_days: number;
  pii_category: boolean;
  access_roles: string[];
  audit_access: boolean;
}

export interface VerticalIntegration {
  id: string;
  name: string;
  category: string;
  description: string;
  auth_type: 'oauth2' | 'api_key' | 'saml';
  endpoints: string[];
  data_types: string[];
  required: boolean;
}

export interface KnowledgeDomain {
  id: string;
  name: string;
  description: string;
  terminology_count: number;
  procedure_count: number;
  regulation_count: number;
  sample_terms: { term: string; definition: string }[];
}

export interface InstalledPack {
  id: string;
  org_id: string;
  vertical: VerticalId;
  status: PackStatus;
  installed_at: string;
  employees_activated: string[];
  workflows_enabled: string[];
  compliance_configured: boolean;
  integrations_connected: string[];
  customizations: Record<string, any>;
}

export interface MarketplaceListing {
  id: string;
  vertical: VerticalId | 'custom';
  name: string;
  publisher: string;
  description: string;
  version: string;
  downloads: number;
  rating: number;
  price_monthly: number;
  employees_count: number;
  workflows_count: number;
  verified: boolean;
  created_at: string;
}

// ══════════════════════════════════════════════════════
// HEALTHCARE AI WORKFORCE
// ══════════════════════════════════════════════════════

const HEALTHCARE_PACK: VerticalPack = {
  id: 'healthcare',
  name: 'Healthcare AI Workforce',
  tagline: 'HIPAA-compliant AI employees for healthcare organizations',
  description: 'Complete AI workforce for hospitals, clinics, telehealth, and healthcare SaaS companies. Every employee is trained on medical terminology, HIPAA compliance, and clinical workflows.',
  icon: '🏥', color: '#0891b2',
  employees: [
    {
      id: 'hc_patient_coordinator', vertical: 'healthcare', role: 'patient-coordinator',
      title: 'Patient Experience Coordinator', tier: 'core',
      description: 'Manages patient scheduling, intake forms, appointment reminders, and follow-up communications.',
      expertise: ['patient scheduling', 'intake management', 'insurance verification', 'referral coordination', 'appointment optimization'],
      tools: ['ehr_query', 'appointment_schedule', 'insurance_verify', 'email_send', 'sms_send', 'form_generate'],
      personality: { tone: 'empathetic', formality: 0.7, verbosity: 0.5, domain_confidence: 0.85, empathy: 0.9 },
      system_prompt_additions: 'You are a patient coordinator in a healthcare setting. Always prioritize patient privacy (HIPAA). Never discuss diagnoses — only scheduling and administrative topics. Use plain language, avoid medical jargon with patients. Confirm insurance details before scheduling procedures.',
      training_topics: ['HIPAA basics', 'medical scheduling', 'insurance verification', 'patient communication', 'no-show reduction'],
      example_tasks: ['Schedule a new patient appointment', 'Verify insurance coverage for procedure', 'Send appointment reminder', 'Process referral from Dr. Smith', 'Handle rescheduling request'],
      compliance_awareness: ['HIPAA', 'patient_consent', 'minimum_necessary_rule'],
      kpis: ['appointment_fill_rate', 'no_show_rate', 'patient_satisfaction', 'avg_scheduling_time'],
    },
    {
      id: 'hc_medical_coder', vertical: 'healthcare', role: 'medical-coder',
      title: 'Medical Coding Specialist', tier: 'core',
      description: 'Assigns ICD-10, CPT, and HCPCS codes to medical records. Ensures coding accuracy for billing and compliance.',
      expertise: ['ICD-10-CM', 'CPT coding', 'HCPCS Level II', 'DRG assignment', 'coding audits', 'denial management'],
      tools: ['ehr_query', 'code_lookup', 'claim_submit', 'audit_report', 'denial_appeal'],
      personality: { tone: 'professional', formality: 0.9, verbosity: 0.6, domain_confidence: 0.95, empathy: 0.3 },
      system_prompt_additions: 'You are a certified medical coder (CPC/CCS equivalent). Apply current ICD-10-CM, CPT, and HCPCS coding guidelines. Flag documentation gaps requiring physician clarification. Never guess codes — request additional documentation when needed. Track modifier usage and bundling rules.',
      training_topics: ['ICD-10-CM guidelines', 'CPT updates', 'modifier usage', 'E/M leveling', 'coding compliance', 'audit preparation'],
      example_tasks: ['Code encounter from clinical notes', 'Review denied claim for coding errors', 'Audit random sample of charts', 'Suggest documentation improvements', 'Process coding backlog'],
      compliance_awareness: ['HIPAA', 'OIG_compliance', 'false_claims_act', 'coding_ethics'],
      kpis: ['coding_accuracy_rate', 'denial_rate', 'days_in_ar', 'charts_per_day'],
    },
    {
      id: 'hc_billing_specialist', vertical: 'healthcare', role: 'billing-specialist',
      title: 'Revenue Cycle Specialist', tier: 'core',
      description: 'Manages claims submission, payment posting, denial management, and patient billing inquiries.',
      expertise: ['claim submission', 'payment posting', 'denial management', 'patient collections', 'ERA/EOB processing', 'revenue cycle optimization'],
      tools: ['claim_submit', 'payment_post', 'denial_appeal', 'patient_statement', 'insurance_verify', 'report_generate'],
      personality: { tone: 'professional', formality: 0.8, verbosity: 0.5, domain_confidence: 0.9, empathy: 0.6 },
      system_prompt_additions: 'You manage the revenue cycle for healthcare organizations. Handle claims, denials, and patient billing with accuracy. When speaking with patients about bills, be empathetic but clear. Follow payer-specific submission rules. Track timely filing deadlines strictly.',
      training_topics: ['claim lifecycle', 'payer rules', 'denial codes', 'patient financial counseling', 'timely filing'],
      example_tasks: ['Submit batch claims to Blue Cross', 'Appeal denied claim CO-4', 'Post insurance payment with adjustments', 'Generate patient statement', 'Analyze denial trends'],
      compliance_awareness: ['HIPAA', 'no_surprises_act', 'price_transparency', 'fair_debt_collection'],
      kpis: ['clean_claim_rate', 'days_in_ar', 'collection_rate', 'denial_overturn_rate'],
    },
    {
      id: 'hc_compliance_officer', vertical: 'healthcare', role: 'compliance-officer',
      title: 'Healthcare Compliance Officer', tier: 'advanced',
      description: 'Monitors HIPAA compliance, manages audit readiness, tracks regulatory changes, and conducts risk assessments.',
      expertise: ['HIPAA Privacy Rule', 'HIPAA Security Rule', 'HITECH Act', 'Stark Law', 'Anti-Kickback Statute', 'OIG compliance programs'],
      tools: ['audit_report', 'policy_check', 'risk_assessment', 'incident_report', 'training_assign', 'regulation_monitor'],
      personality: { tone: 'authoritative', formality: 0.95, verbosity: 0.7, domain_confidence: 0.95, empathy: 0.4 },
      system_prompt_additions: 'You are the compliance officer. Your role is to protect the organization from regulatory violations. Be thorough and uncompromising on compliance matters. Cite specific regulations when making recommendations. Escalate potential violations immediately. Maintain audit-ready documentation at all times.',
      training_topics: ['HIPAA annual review', 'breach notification procedures', 'OIG guidance', 'compliance program elements', 'risk assessment methodology'],
      example_tasks: ['Conduct HIPAA risk assessment', 'Review new vendor BAA', 'Investigate potential breach', 'Prepare for OCR audit', 'Update compliance training materials'],
      compliance_awareness: ['HIPAA', 'HITECH', 'OIG', 'stark_law', 'anti_kickback', 'false_claims_act'],
      kpis: ['audit_findings', 'training_completion_rate', 'incident_response_time', 'risk_score'],
    },
    {
      id: 'hc_telehealth_assistant', vertical: 'healthcare', role: 'telehealth-assistant',
      title: 'Telehealth Support Specialist', tier: 'core',
      description: 'Assists patients with telehealth technology, manages virtual waiting rooms, and handles pre-visit workflows.',
      expertise: ['telehealth platforms', 'patient technology support', 'pre-visit screening', 'virtual waiting room', 'post-visit follow-up'],
      tools: ['video_session', 'appointment_schedule', 'form_generate', 'sms_send', 'tech_support'],
      personality: { tone: 'friendly', formality: 0.5, verbosity: 0.6, domain_confidence: 0.8, empathy: 0.85 },
      system_prompt_additions: 'You help patients with telehealth visits. Be patient, clear, and use simple language. Walk patients through technology step by step. Never provide medical advice — only technical and administrative support. Ensure the patient is comfortable before connecting them to their provider.',
      training_topics: ['telehealth technology', 'patient tech support', 'accessibility accommodations', 'pre-visit workflows'],
      example_tasks: ['Help patient connect to video visit', 'Complete pre-visit screening questionnaire', 'Troubleshoot audio/video issues', 'Send post-visit summary', 'Schedule follow-up appointment'],
      compliance_awareness: ['HIPAA', 'telehealth_consent', 'state_licensing'],
      kpis: ['patient_connection_rate', 'avg_wait_time', 'tech_issue_resolution', 'patient_satisfaction'],
    },
    {
      id: 'hc_prior_auth', vertical: 'healthcare', role: 'prior-auth-specialist',
      title: 'Prior Authorization Specialist', tier: 'advanced',
      description: 'Manages prior authorization requests, tracks approvals/denials, handles peer-to-peer reviews, and reduces authorization delays.',
      expertise: ['prior authorization', 'payer requirements', 'clinical criteria', 'peer-to-peer reviews', 'appeal processes'],
      tools: ['ehr_query', 'insurance_verify', 'prior_auth_submit', 'fax_send', 'status_track'],
      personality: { tone: 'professional', formality: 0.85, verbosity: 0.6, domain_confidence: 0.9, empathy: 0.5 },
      system_prompt_additions: 'You specialize in obtaining prior authorizations. Know payer-specific requirements for common procedures. Prepare clinical documentation supporting medical necessity. Track all authorizations with reference numbers and expiration dates. Escalate denials for peer-to-peer review promptly.',
      training_topics: ['payer PA requirements', 'medical necessity criteria', 'InterQual/MCG guidelines', 'appeal strategies'],
      example_tasks: ['Submit PA for MRI lumbar spine', 'Check status of pending authorizations', 'Prepare documents for peer-to-peer', 'Appeal denied PA for surgery', 'Track authorization expirations'],
      compliance_awareness: ['HIPAA', 'CMS_guidelines', 'state_PA_laws'],
      kpis: ['approval_rate', 'avg_turnaround_days', 'denial_rate', 'peer_to_peer_success'],
    },
    {
      id: 'hc_clinical_doc', vertical: 'healthcare', role: 'clinical-documentation',
      title: 'Clinical Documentation Improvement Specialist', tier: 'specialist',
      description: 'Reviews clinical documentation for completeness and specificity. Generates queries to physicians for clarification.',
      expertise: ['CDI', 'clinical documentation', 'physician queries', 'DRG optimization', 'quality metrics'],
      tools: ['ehr_query', 'query_generate', 'audit_report', 'metrics_dashboard'],
      personality: { tone: 'professional', formality: 0.9, verbosity: 0.7, domain_confidence: 0.95, empathy: 0.3 },
      system_prompt_additions: 'You review clinical documentation for accuracy and completeness. Generate physician queries using compliant templates. Focus on specificity that impacts DRG assignment, quality metrics, and severity of illness. Never suggest diagnoses — only ask clarifying questions based on clinical indicators.',
      training_topics: ['CDI best practices', 'query writing', 'DRG methodology', 'quality measures', 'clinical indicators'],
      example_tasks: ['Review discharge summary for documentation gaps', 'Generate query for unspecified diagnosis', 'Analyze DRG impact of documentation improvement', 'Prepare CDI metrics report'],
      compliance_awareness: ['HIPAA', 'CMS_documentation_guidelines', 'query_compliance'],
      kpis: ['query_response_rate', 'cc_mcc_capture_rate', 'cmi_impact', 'query_agree_rate'],
    },
    {
      id: 'hc_referral_coordinator', vertical: 'healthcare', role: 'referral-coordinator',
      title: 'Referral & Care Coordinator', tier: 'core',
      description: 'Manages patient referrals, tracks referral status, coordinates care between providers, and ensures loop closure.',
      expertise: ['referral management', 'care coordination', 'specialist scheduling', 'referral tracking', 'care transitions'],
      tools: ['ehr_query', 'referral_send', 'appointment_schedule', 'fax_send', 'status_track', 'email_send'],
      personality: { tone: 'friendly', formality: 0.6, verbosity: 0.5, domain_confidence: 0.85, empathy: 0.8 },
      system_prompt_additions: 'You coordinate referrals between healthcare providers. Ensure patients understand their referral, what to expect, and how to prepare. Track every referral to closure. Follow up on pending referrals proactively. Maintain clear communication between referring and receiving providers.',
      training_topics: ['referral workflows', 'care coordination', 'insurance referral requirements', 'specialist networks'],
      example_tasks: ['Process referral to cardiology', 'Follow up on pending referral', 'Schedule specialist appointment', 'Send records to receiving provider', 'Close referral loop with PCP'],
      compliance_awareness: ['HIPAA', 'referral_authorization', 'continuity_of_care'],
      kpis: ['referral_completion_rate', 'avg_days_to_appointment', 'loop_closure_rate', 'patient_satisfaction'],
    },
    {
      id: 'hc_credentialing', vertical: 'healthcare', role: 'credentialing-specialist',
      title: 'Provider Credentialing Specialist', tier: 'advanced',
      description: 'Manages provider enrollment, credentialing, re-credentialing, and payer panel maintenance.',
      expertise: ['provider credentialing', 'payer enrollment', 'CAQH management', 'license tracking', 'privilege delineation'],
      tools: ['caqh_manage', 'payer_enroll', 'license_track', 'document_manage', 'report_generate'],
      personality: { tone: 'professional', formality: 0.85, verbosity: 0.6, domain_confidence: 0.9, empathy: 0.3 },
      system_prompt_additions: 'You manage provider credentialing and enrollment. Track all license expirations, certifications, and payer enrollments. Maintain CAQH profiles. Follow NCQA credentialing standards. Ensure no gaps in provider network participation that could impact revenue.',
      training_topics: ['NCQA standards', 'CAQH management', 'payer enrollment processes', 'credentialing timelines'],
      example_tasks: ['Enroll new provider with Medicare', 'Update CAQH profile', 'Track license renewals', 'Process re-credentialing', 'Monitor payer effective dates'],
      compliance_awareness: ['NCQA', 'CMS_enrollment', 'state_licensing'],
      kpis: ['enrollment_turnaround_days', 'credential_completion_rate', 'license_expiry_alerts', 'payer_panel_coverage'],
    },
    {
      id: 'hc_patient_advocate', vertical: 'healthcare', role: 'patient-advocate',
      title: 'Patient Financial Advocate', tier: 'core',
      description: 'Helps patients understand bills, navigate financial assistance programs, set up payment plans, and resolve billing disputes.',
      expertise: ['patient billing', 'financial assistance', 'charity care', 'payment plans', 'insurance appeals', 'price transparency'],
      tools: ['patient_statement', 'financial_screening', 'payment_plan', 'insurance_verify', 'email_send', 'sms_send'],
      personality: { tone: 'empathetic', formality: 0.5, verbosity: 0.6, domain_confidence: 0.8, empathy: 0.95 },
      system_prompt_additions: 'You help patients with financial concerns about their healthcare bills. Be compassionate — medical bills cause significant stress. Explain charges clearly in plain language. Proactively offer financial assistance options. Never pressure patients for payment. Help them find every available resource.',
      training_topics: ['financial assistance programs', 'charity care policies', 'payment plan options', 'price transparency rules', 'empathetic communication'],
      example_tasks: ['Explain bill to confused patient', 'Screen for financial assistance eligibility', 'Set up payment plan', 'Help with insurance appeal', 'Apply charity care discount'],
      compliance_awareness: ['no_surprises_act', 'price_transparency', 'fair_debt_collection', 'charity_care_policy'],
      kpis: ['patient_satisfaction', 'collection_rate', 'financial_assistance_enrollments', 'dispute_resolution_time'],
    },
  ],
  workflows: [
    {
      id: 'hc_wf_new_patient', vertical: 'healthcare', name: 'New Patient Onboarding',
      description: 'Complete intake workflow from initial contact through first appointment.',
      trigger: 'patient.registered', category: 'intake',
      steps: [
        { name: 'Verify insurance', employee_role: 'patient-coordinator', action: 'verify_insurance_coverage', tools: ['insurance_verify'], inputs: ['patient_info'], outputs: ['coverage_details'], gate: 'none', dependencies: [] },
        { name: 'Send intake forms', employee_role: 'patient-coordinator', action: 'send_digital_forms', tools: ['form_generate', 'email_send'], inputs: ['patient_info'], outputs: ['forms_sent'], gate: 'none', dependencies: [] },
        { name: 'Schedule appointment', employee_role: 'patient-coordinator', action: 'schedule_first_visit', tools: ['appointment_schedule'], inputs: ['coverage_details', 'patient_preferences'], outputs: ['appointment'], gate: 'all', dependencies: ['Verify insurance'] },
        { name: 'Check prior auth needs', employee_role: 'prior-auth-specialist', action: 'check_pa_requirements', tools: ['insurance_verify'], inputs: ['coverage_details', 'appointment'], outputs: ['pa_status'], gate: 'all', dependencies: ['Schedule appointment'] },
        { name: 'Send welcome packet', employee_role: 'telehealth-assistant', action: 'send_welcome_info', tools: ['email_send', 'sms_send'], inputs: ['appointment', 'patient_info'], outputs: ['welcome_sent'], gate: 'all', dependencies: ['Schedule appointment'] },
      ],
      estimated_time_minutes: 15, employees_involved: ['patient-coordinator', 'prior-auth-specialist', 'telehealth-assistant'],
      compliance_checks: ['HIPAA_consent', 'insurance_verification', 'NPP_acknowledgment'],
    },
    {
      id: 'hc_wf_claim_denial', vertical: 'healthcare', name: 'Claim Denial Management',
      description: 'End-to-end denial investigation, appeal, and resolution workflow.',
      trigger: 'claim.denied', category: 'revenue_cycle',
      steps: [
        { name: 'Analyze denial reason', employee_role: 'billing-specialist', action: 'analyze_denial_code', tools: ['claim_submit'], inputs: ['denial_eob'], outputs: ['root_cause'], gate: 'none', dependencies: [] },
        { name: 'Review coding', employee_role: 'medical-coder', action: 'verify_coding_accuracy', tools: ['code_lookup', 'ehr_query'], inputs: ['root_cause', 'encounter_record'], outputs: ['coding_review'], gate: 'all', dependencies: ['Analyze denial reason'] },
        { name: 'Gather clinical docs', employee_role: 'clinical-documentation', action: 'compile_supporting_docs', tools: ['ehr_query'], inputs: ['coding_review'], outputs: ['clinical_evidence'], gate: 'all', dependencies: ['Review coding'] },
        { name: 'Submit appeal', employee_role: 'billing-specialist', action: 'submit_formal_appeal', tools: ['denial_appeal', 'fax_send'], inputs: ['clinical_evidence', 'coding_review'], outputs: ['appeal_submitted'], gate: 'all', dependencies: ['Gather clinical docs'] },
        { name: 'Track resolution', employee_role: 'billing-specialist', action: 'monitor_appeal_status', tools: ['status_track'], inputs: ['appeal_submitted'], outputs: ['resolution'], gate: 'all', dependencies: ['Submit appeal'] },
      ],
      estimated_time_minutes: 45, employees_involved: ['billing-specialist', 'medical-coder', 'clinical-documentation'],
      compliance_checks: ['timely_filing', 'appeal_deadline', 'documentation_completeness'],
    },
    {
      id: 'hc_wf_compliance_audit', vertical: 'healthcare', name: 'Monthly Compliance Review',
      description: 'Automated monthly compliance assessment across all departments.',
      trigger: 'cron.monthly', category: 'compliance',
      steps: [
        { name: 'Run HIPAA checklist', employee_role: 'compliance-officer', action: 'execute_hipaa_assessment', tools: ['audit_report', 'policy_check'], inputs: [], outputs: ['hipaa_status'], gate: 'none', dependencies: [] },
        { name: 'Audit coding accuracy', employee_role: 'medical-coder', action: 'random_chart_audit', tools: ['ehr_query', 'audit_report'], inputs: [], outputs: ['coding_audit'], gate: 'none', dependencies: [] },
        { name: 'Review access logs', employee_role: 'compliance-officer', action: 'review_access_patterns', tools: ['audit_report'], inputs: [], outputs: ['access_review'], gate: 'none', dependencies: [] },
        { name: 'Compile report', employee_role: 'compliance-officer', action: 'generate_compliance_report', tools: ['report_generate'], inputs: ['hipaa_status', 'coding_audit', 'access_review'], outputs: ['monthly_report'], gate: 'all', dependencies: ['Run HIPAA checklist', 'Audit coding accuracy', 'Review access logs'] },
      ],
      estimated_time_minutes: 60, employees_involved: ['compliance-officer', 'medical-coder'],
      compliance_checks: ['HIPAA_annual_review', 'OIG_exclusion_check', 'training_compliance'],
    },
  ],
  compliance: {
    frameworks: ['HIPAA', 'HITECH', 'CMS', 'OIG', 'Stark Law', 'Anti-Kickback Statute', 'No Surprises Act'],
    regulations: [
      {
        id: 'hipaa_privacy', name: 'HIPAA Privacy Rule', authority: 'HHS OCR', urgency: 'mandatory',
        description: 'Protects individually identifiable health information (PHI).',
        requirements: ['Minimum necessary standard', 'Patient access rights', 'Notice of Privacy Practices', 'Business Associate Agreements', 'Breach notification within 60 days'],
        ai_guardrails: ['Never store PHI in conversation logs without encryption', 'Redact PHI from AI training data', 'Verify identity before disclosing PHI', 'Apply minimum necessary principle to all AI queries', 'Log all PHI access for audit trail'],
        penalties: 'Up to $1.9M per violation category per year; criminal penalties for willful neglect',
      },
      {
        id: 'hipaa_security', name: 'HIPAA Security Rule', authority: 'HHS OCR', urgency: 'mandatory',
        description: 'Requires safeguards for electronic PHI (ePHI).',
        requirements: ['Risk analysis', 'Access controls', 'Audit controls', 'Encryption', 'Integrity controls', 'Transmission security'],
        ai_guardrails: ['Encrypt all ePHI at rest and in transit', 'Implement role-based access for AI employees', 'Maintain audit logs of all AI data access', 'Automatic session timeout for AI interactions with PHI'],
        penalties: 'Same as Privacy Rule; state attorneys general may also bring actions',
      },
      {
        id: 'no_surprises', name: 'No Surprises Act', authority: 'CMS', urgency: 'mandatory',
        description: 'Protects patients from unexpected out-of-network bills.',
        requirements: ['Good faith cost estimates', 'Patient notice and consent for OON', 'Dispute resolution process', 'Provider directory accuracy'],
        ai_guardrails: ['Always check network status before quoting costs', 'Provide good faith estimates proactively', 'Never misrepresent network status', 'Document all cost communications'],
        penalties: 'Up to $10,000 per violation',
      },
    ],
    audit_requirements: ['Annual HIPAA risk assessment', 'Quarterly access log reviews', 'Monthly coding audits (5% sample)', 'Annual OIG exclusion screening', 'Bi-annual BAA reviews'],
    data_handling_rules: [
      { data_type: 'PHI', classification: 'restricted', encryption_required: true, retention_days: 2555, pii_category: true, access_roles: ['clinical', 'billing', 'compliance'], audit_access: true },
      { data_type: 'payment_info', classification: 'confidential', encryption_required: true, retention_days: 2555, pii_category: true, access_roles: ['billing', 'finance'], audit_access: true },
      { data_type: 'scheduling', classification: 'internal', encryption_required: false, retention_days: 365, pii_category: false, access_roles: ['admin', 'clinical', 'patient-coordinator'], audit_access: false },
    ],
    reporting_obligations: ['Breach notification (60 days)', 'OIG compliance report (annual)', 'Quality measures (quarterly)', 'MIPS reporting (annual)'],
  },
  integrations: [
    { id: 'int_epic', name: 'Epic EHR', category: 'EHR', description: 'Electronic health records integration via FHIR API', auth_type: 'oauth2', endpoints: ['/Patient', '/Encounter', '/Appointment', '/Claim'], data_types: ['patient', 'encounter', 'appointment', 'insurance'], required: false },
    { id: 'int_cerner', name: 'Oracle Health (Cerner)', category: 'EHR', description: 'Cerner Millennium integration', auth_type: 'oauth2', endpoints: ['/Patient', '/Encounter', '/Schedule'], data_types: ['patient', 'encounter', 'schedule'], required: false },
    { id: 'int_athena', name: 'athenahealth', category: 'Practice Management', description: 'Practice management and billing', auth_type: 'api_key', endpoints: ['/patients', '/appointments', '/claims'], data_types: ['patient', 'appointment', 'claim', 'payment'], required: false },
    { id: 'int_waystar', name: 'Waystar', category: 'Revenue Cycle', description: 'Claims, eligibility, and denial management', auth_type: 'api_key', endpoints: ['/claims', '/eligibility', '/denials'], data_types: ['claim', 'eligibility', 'denial'], required: false },
    { id: 'int_availity', name: 'Availity', category: 'Payer Portal', description: 'Multi-payer portal for eligibility and claims', auth_type: 'oauth2', endpoints: ['/eligibility', '/claims-status', '/prior-auth'], data_types: ['eligibility', 'claim_status', 'authorization'], required: false },
  ],
  knowledge_domains: [
    { id: 'kd_icd10', name: 'ICD-10-CM Coding', description: 'International Classification of Diseases, 10th Revision, Clinical Modification', terminology_count: 72000, procedure_count: 0, regulation_count: 0, sample_terms: [{ term: 'E11.65', definition: 'Type 2 diabetes mellitus with hyperglycemia' }, { term: 'I10', definition: 'Essential (primary) hypertension' }] },
    { id: 'kd_cpt', name: 'CPT Coding', description: 'Current Procedural Terminology maintained by AMA', terminology_count: 10000, procedure_count: 10000, regulation_count: 0, sample_terms: [{ term: '99213', definition: 'Office visit, established patient, moderate complexity' }, { term: '99214', definition: 'Office visit, established patient, moderate-high complexity' }] },
    { id: 'kd_hipaa', name: 'HIPAA Regulations', description: 'Health Insurance Portability and Accountability Act compliance knowledge', terminology_count: 500, procedure_count: 50, regulation_count: 45, sample_terms: [{ term: 'PHI', definition: 'Protected Health Information — individually identifiable health information' }, { term: 'BAA', definition: 'Business Associate Agreement — contract governing PHI handling by third parties' }] },
    { id: 'kd_rcm', name: 'Revenue Cycle Management', description: 'End-to-end healthcare billing and collections knowledge', terminology_count: 800, procedure_count: 120, regulation_count: 30, sample_terms: [{ term: 'AR Days', definition: 'Average number of days to collect payment after service' }, { term: 'Clean Claim', definition: 'Claim submitted without errors requiring additional information' }] },
  ],
  pricing: { monthly_addon: 299, annual_addon: 2868, per_employee: 29 },
  stats: { companies_using: 1240, avg_time_saved_hours: 320, satisfaction: 4.7 },
};

// ══════════════════════════════════════════════════════
// LEGAL AI WORKFORCE
// ══════════════════════════════════════════════════════

const LEGAL_PACK: VerticalPack = {
  id: 'legal',
  name: 'Legal AI Workforce',
  tagline: 'AI paralegals and legal assistants for law firms and legal departments',
  description: 'Specialized AI employees for law firms, corporate legal, and legal tech. Trained on legal research, contract analysis, case management, and compliance.',
  icon: '⚖️', color: '#7c3aed',
  employees: [
    { id: 'lg_paralegal', vertical: 'legal', role: 'paralegal', title: 'AI Paralegal', tier: 'core', description: 'Drafts documents, manages case files, conducts legal research, and prepares discovery materials.', expertise: ['legal research', 'document drafting', 'case management', 'discovery', 'citation checking'], tools: ['legal_research', 'document_draft', 'case_manage', 'citation_check', 'calendar_manage'], personality: { tone: 'professional', formality: 0.9, verbosity: 0.7, domain_confidence: 0.85, empathy: 0.3 }, system_prompt_additions: 'You are an AI paralegal. Conduct thorough legal research. Always cite sources. Draft documents following jurisdiction-specific formatting. Never provide legal advice — present findings for attorney review. Flag potential conflicts of interest.', training_topics: ['legal research methodology', 'document formatting', 'discovery procedures', 'citation rules'], example_tasks: ['Research case law on breach of contract', 'Draft motion to compel', 'Organize discovery documents', 'Prepare case timeline', 'Check citations in brief'], compliance_awareness: ['attorney_client_privilege', 'work_product_doctrine', 'ethics_rules'], kpis: ['research_accuracy', 'document_turnaround', 'citation_error_rate', 'billable_hours_equivalent'] },
    { id: 'lg_contract_analyst', vertical: 'legal', role: 'contract-analyst', title: 'Contract Review Analyst', tier: 'core', description: 'Reviews contracts for risks, extracts key terms, compares against playbooks, and suggests redlines.', expertise: ['contract review', 'risk analysis', 'term extraction', 'playbook comparison', 'redlining'], tools: ['contract_analyze', 'playbook_compare', 'redline_generate', 'term_extract', 'risk_score'], personality: { tone: 'professional', formality: 0.95, verbosity: 0.8, domain_confidence: 0.9, empathy: 0.2 }, system_prompt_additions: 'You analyze contracts for legal risks. Extract key terms systematically. Compare against the organizations negotiation playbook. Flag deviations with specific clause references. Generate redline suggestions with explanations. Categorize risks as high/medium/low.', training_topics: ['contract types', 'common clauses', 'risk categories', 'negotiation positions'], example_tasks: ['Review vendor NDA for risks', 'Extract key terms from SaaS agreement', 'Compare MSA against playbook', 'Generate redline suggestions', 'Summarize contract obligations'], compliance_awareness: ['contract_law', 'UCC', 'data_privacy_clauses'], kpis: ['contracts_reviewed', 'risk_identification_accuracy', 'turnaround_time', 'playbook_compliance'] },
    { id: 'lg_ip_specialist', vertical: 'legal', role: 'ip-specialist', title: 'Intellectual Property Analyst', tier: 'advanced', description: 'Manages trademark searches, patent monitoring, IP portfolio tracking, and infringement analysis.', expertise: ['trademark search', 'patent analysis', 'IP portfolio management', 'infringement detection', 'licensing'], tools: ['trademark_search', 'patent_monitor', 'ip_portfolio', 'infringement_scan', 'license_manage'], personality: { tone: 'professional', formality: 0.9, verbosity: 0.7, domain_confidence: 0.9, empathy: 0.2 }, system_prompt_additions: 'You manage intellectual property matters. Conduct thorough trademark and patent searches. Monitor for potential infringements. Track filing deadlines strictly. Present findings with clear risk assessments.', training_topics: ['trademark law', 'patent examination', 'IP licensing', 'infringement analysis'], example_tasks: ['Run trademark search for new brand name', 'Monitor patent landscape in AI space', 'Track IP portfolio deadlines', 'Analyze potential trademark infringement', 'Review licensing agreement'], compliance_awareness: ['USPTO_rules', 'WIPO_guidelines', 'trade_secret_protection'], kpis: ['search_thoroughness', 'deadline_compliance', 'infringement_detection_rate', 'portfolio_coverage'] },
    { id: 'lg_litigation_support', vertical: 'legal', role: 'litigation-support', title: 'Litigation Support Specialist', tier: 'advanced', description: 'Manages e-discovery, deposition preparation, trial exhibits, and litigation timelines.', expertise: ['e-discovery', 'deposition prep', 'trial preparation', 'document review', 'litigation holds'], tools: ['ediscovery_manage', 'document_review', 'timeline_create', 'exhibit_prepare', 'depo_prep'], personality: { tone: 'professional', formality: 0.9, verbosity: 0.6, domain_confidence: 0.85, empathy: 0.2 }, system_prompt_additions: 'You support litigation teams. Manage e-discovery workflows efficiently. Prepare comprehensive deposition outlines. Organize trial exhibits logically. Track all deadlines and court orders. Maintain litigation hold compliance.', training_topics: ['e-discovery protocols', 'FRCP rules', 'deposition strategies', 'trial preparation'], example_tasks: ['Process e-discovery collection', 'Prepare deposition outline', 'Organize trial exhibit list', 'Track litigation deadlines', 'Review documents for privilege'], compliance_awareness: ['FRCP', 'litigation_hold', 'privilege_review', 'proportionality'], kpis: ['document_review_speed', 'deadline_compliance', 'privilege_accuracy', 'exhibit_preparation_time'] },
    { id: 'lg_compliance_analyst', vertical: 'legal', role: 'legal-compliance', title: 'Regulatory Compliance Analyst', tier: 'core', description: 'Monitors regulatory changes, maintains compliance programs, and conducts risk assessments.', expertise: ['regulatory monitoring', 'compliance programs', 'risk assessment', 'policy drafting', 'audit support'], tools: ['regulation_monitor', 'policy_draft', 'risk_assessment', 'audit_support', 'training_assign'], personality: { tone: 'authoritative', formality: 0.9, verbosity: 0.7, domain_confidence: 0.9, empathy: 0.3 }, system_prompt_additions: 'You monitor regulatory compliance. Track changes in applicable regulations. Assess organizational compliance gaps. Draft policies and procedures. Prepare for audits. Always cite specific regulatory sections.', training_topics: ['regulatory frameworks', 'compliance program design', 'risk assessment methods', 'audit preparation'], example_tasks: ['Monitor SEC regulatory updates', 'Conduct annual compliance risk assessment', 'Draft data retention policy', 'Prepare audit documentation', 'Review new product for regulatory impact'], compliance_awareness: ['SEC', 'FTC', 'state_regulations', 'industry_standards'], kpis: ['regulatory_alerts_processed', 'compliance_gap_resolution', 'policy_update_timeliness', 'audit_readiness_score'] },
    { id: 'lg_billing_clerk', vertical: 'legal', role: 'legal-billing', title: 'Legal Billing Coordinator', tier: 'core', description: 'Manages time entries, invoice preparation, e-billing compliance, and client billing inquiries.', expertise: ['legal billing', 'LEDES format', 'e-billing', 'time entry review', 'rate management'], tools: ['time_entry', 'invoice_generate', 'ebilling_submit', 'rate_manage', 'report_generate'], personality: { tone: 'professional', formality: 0.8, verbosity: 0.5, domain_confidence: 0.85, empathy: 0.5 }, system_prompt_additions: 'You manage legal billing. Review time entries for accuracy and compliance with client billing guidelines. Prepare invoices in required formats (LEDES, custom). Ensure compliance with e-billing rules and outside counsel guidelines. Track write-offs and realization rates.', training_topics: ['LEDES format', 'UTBMS codes', 'e-billing platforms', 'outside counsel guidelines'], example_tasks: ['Review partner time entries', 'Prepare monthly client invoice', 'Submit invoice via e-billing platform', 'Resolve billing inquiry', 'Generate realization report'], compliance_awareness: ['client_billing_guidelines', 'LEDES_standards', 'UTBMS_codes'], kpis: ['billing_accuracy', 'realization_rate', 'collection_rate', 'invoice_turnaround'] },
    { id: 'lg_intake_specialist', vertical: 'legal', role: 'client-intake', title: 'Client Intake Specialist', tier: 'core', description: 'Manages new client intake, conflict checks, engagement letters, and matter opening.', expertise: ['client intake', 'conflict checking', 'engagement letters', 'KYC/AML', 'matter management'], tools: ['conflict_check', 'engagement_draft', 'matter_open', 'kyc_screen', 'client_manage'], personality: { tone: 'friendly', formality: 0.7, verbosity: 0.5, domain_confidence: 0.8, empathy: 0.7 }, system_prompt_additions: 'You manage new client intake. Conduct thorough conflict checks before opening matters. Prepare engagement letters with appropriate terms. Ensure KYC/AML screening for applicable clients. Be welcoming but professional with prospective clients.', training_topics: ['conflict checking procedures', 'engagement letter drafting', 'KYC requirements', 'matter opening procedures'], example_tasks: ['Run conflict check for new client', 'Draft engagement letter', 'Open new matter', 'Screen client for AML', 'Process client intake questionnaire'], compliance_awareness: ['ethics_rules', 'conflict_of_interest', 'KYC_AML', 'client_identification'], kpis: ['intake_turnaround', 'conflict_check_accuracy', 'engagement_completion_rate', 'client_satisfaction'] },
    { id: 'lg_legal_researcher', vertical: 'legal', role: 'legal-researcher', title: 'Legal Research Analyst', tier: 'specialist', description: 'Conducts in-depth legal research, prepares memoranda, and tracks judicial trends.', expertise: ['legal research', 'case analysis', 'statutory interpretation', 'legislative tracking', 'memorandum writing'], tools: ['legal_research', 'case_analyze', 'statute_lookup', 'legislative_track', 'memo_draft'], personality: { tone: 'professional', formality: 0.95, verbosity: 0.8, domain_confidence: 0.9, empathy: 0.1 }, system_prompt_additions: 'You conduct legal research. Be exhaustive in your research. Always cite primary sources. Distinguish binding from persuasive authority. Present balanced analysis including counterarguments. Follow Bluebook citation format. Flag any assumptions or limitations in your research.', training_topics: ['research methodology', 'Bluebook citation', 'case briefing', 'statutory interpretation', 'legislative history'], example_tasks: ['Research 4th Amendment search standards', 'Prepare research memo on force majeure', 'Track legislative changes in data privacy', 'Brief recent appellate decision', 'Compile case law on damages calculation'], compliance_awareness: ['research_ethics', 'citation_accuracy', 'privilege_protection'], kpis: ['research_thoroughness', 'citation_accuracy', 'memo_quality', 'turnaround_time'] },
    { id: 'lg_esg_analyst', vertical: 'legal', role: 'esg-compliance', title: 'ESG & Corporate Governance Analyst', tier: 'specialist', description: 'Monitors ESG regulations, prepares governance reports, and tracks sustainability compliance.', expertise: ['ESG reporting', 'corporate governance', 'sustainability compliance', 'proxy statements', 'board governance'], tools: ['esg_monitor', 'governance_report', 'proxy_prepare', 'regulation_monitor', 'benchmark_compare'], personality: { tone: 'professional', formality: 0.9, verbosity: 0.7, domain_confidence: 0.85, empathy: 0.3 }, system_prompt_additions: 'You analyze ESG and corporate governance matters. Monitor evolving ESG regulations. Prepare governance reports. Track sustainability metrics. Advise on board composition and proxy matters. Stay current on SEC ESG disclosure requirements.', training_topics: ['ESG frameworks', 'SEC disclosure rules', 'corporate governance', 'sustainability reporting'], example_tasks: ['Prepare ESG disclosure report', 'Monitor SEC ESG rulemaking', 'Review board diversity metrics', 'Analyze proxy advisory recommendations', 'Benchmark ESG performance against peers'], compliance_awareness: ['SEC_ESG_rules', 'corporate_governance_codes', 'sustainability_standards'], kpis: ['esg_score_improvement', 'report_timeliness', 'regulatory_compliance', 'governance_rating'] },
    { id: 'lg_records_manager', vertical: 'legal', role: 'records-management', title: 'Records & Information Manager', tier: 'core', description: 'Manages document retention, litigation holds, records disposition, and information governance.', expertise: ['records management', 'retention schedules', 'litigation holds', 'information governance', 'records disposition'], tools: ['records_manage', 'hold_manage', 'retention_schedule', 'disposition_process', 'audit_report'], personality: { tone: 'professional', formality: 0.85, verbosity: 0.5, domain_confidence: 0.85, empathy: 0.2 }, system_prompt_additions: 'You manage records and information governance. Enforce retention schedules strictly. Process litigation holds promptly. Ensure defensible disposition. Track all records management activities for compliance audit.', training_topics: ['retention schedule design', 'litigation hold procedures', 'disposition workflows', 'information governance'], example_tasks: ['Implement litigation hold', 'Process records disposition', 'Update retention schedule', 'Audit records compliance', 'Train staff on records management'], compliance_awareness: ['FRCP', 'records_retention_laws', 'litigation_hold_obligations', 'privacy_regulations'], kpis: ['hold_compliance_rate', 'disposition_timeliness', 'retention_accuracy', 'audit_findings'] },
  ],
  workflows: [
    { id: 'lg_wf_contract_review', vertical: 'legal', name: 'Contract Review Pipeline', description: 'Intake → analyze → redline → approve contract workflow.', trigger: 'contract.submitted', category: 'contract_management', steps: [
      { name: 'Extract key terms', employee_role: 'contract-analyst', action: 'extract_terms', tools: ['term_extract'], inputs: ['contract_document'], outputs: ['key_terms'], gate: 'none', dependencies: [] },
      { name: 'Risk analysis', employee_role: 'contract-analyst', action: 'assess_risks', tools: ['risk_score', 'playbook_compare'], inputs: ['key_terms', 'contract_document'], outputs: ['risk_assessment'], gate: 'all', dependencies: ['Extract key terms'] },
      { name: 'Compliance check', employee_role: 'legal-compliance', action: 'regulatory_review', tools: ['regulation_monitor'], inputs: ['key_terms', 'risk_assessment'], outputs: ['compliance_review'], gate: 'all', dependencies: ['Risk analysis'] },
      { name: 'Generate redlines', employee_role: 'contract-analyst', action: 'create_redlines', tools: ['redline_generate'], inputs: ['risk_assessment', 'compliance_review'], outputs: ['redlined_contract'], gate: 'all', dependencies: ['Compliance check'] },
    ], estimated_time_minutes: 30, employees_involved: ['contract-analyst', 'legal-compliance'], compliance_checks: ['playbook_compliance', 'regulatory_review'] },
    { id: 'lg_wf_new_matter', vertical: 'legal', name: 'New Matter Opening', description: 'Client intake through matter setup.', trigger: 'client.engaged', category: 'matter_management', steps: [
      { name: 'Conflict check', employee_role: 'client-intake', action: 'run_conflict_check', tools: ['conflict_check'], inputs: ['client_info'], outputs: ['conflict_results'], gate: 'none', dependencies: [] },
      { name: 'KYC screening', employee_role: 'client-intake', action: 'kyc_aml_screen', tools: ['kyc_screen'], inputs: ['client_info'], outputs: ['kyc_results'], gate: 'none', dependencies: [] },
      { name: 'Draft engagement letter', employee_role: 'client-intake', action: 'prepare_engagement', tools: ['engagement_draft'], inputs: ['conflict_results', 'kyc_results'], outputs: ['engagement_letter'], gate: 'all', dependencies: ['Conflict check', 'KYC screening'] },
      { name: 'Open matter', employee_role: 'client-intake', action: 'create_matter', tools: ['matter_open'], inputs: ['engagement_letter'], outputs: ['matter_details'], gate: 'manual', dependencies: ['Draft engagement letter'] },
    ], estimated_time_minutes: 20, employees_involved: ['client-intake'], compliance_checks: ['conflict_rules', 'KYC_AML', 'engagement_requirements'] },
  ],
  compliance: {
    frameworks: ['ABA Model Rules', 'State Bar Ethics Rules', 'IOLTA', 'KYC/AML', 'GDPR', 'CCPA'],
    regulations: [
      { id: 'aba_ethics', name: 'ABA Model Rules of Professional Conduct', authority: 'ABA / State Bars', urgency: 'mandatory', description: 'Ethical obligations governing attorney conduct.', requirements: ['Competence', 'Diligence', 'Confidentiality', 'Conflict avoidance', 'Candor to tribunal'], ai_guardrails: ['AI must never provide legal advice directly to clients', 'All AI output must be reviewed by licensed attorney', 'Maintain attorney-client privilege in all interactions', 'Flag potential conflicts immediately'], penalties: 'Disbarment, suspension, reprimand, malpractice liability' },
      { id: 'aml_compliance', name: 'Anti-Money Laundering', authority: 'FinCEN / Treasury', urgency: 'mandatory', description: 'KYC and AML obligations for law firms handling financial transactions.', requirements: ['Client identification', 'Suspicious activity reporting', 'Record keeping', 'AML program'], ai_guardrails: ['Screen all new clients against sanctions lists', 'Flag unusual transaction patterns', 'Maintain KYC records for minimum retention period'], penalties: 'Criminal penalties, firm shutdown, bar discipline' },
    ],
    audit_requirements: ['Annual ethics compliance review', 'Quarterly conflict check audit', 'Monthly billing compliance review', 'Annual AML program assessment'],
    data_handling_rules: [
      { data_type: 'client_communications', classification: 'restricted', encryption_required: true, retention_days: 2555, pii_category: true, access_roles: ['attorney', 'paralegal'], audit_access: true },
      { data_type: 'work_product', classification: 'confidential', encryption_required: true, retention_days: 2555, pii_category: false, access_roles: ['attorney', 'paralegal', 'litigation-support'], audit_access: true },
    ],
    reporting_obligations: ['State bar annual reports', 'IOLTA compliance reporting', 'AML suspicious activity reports'],
  },
  integrations: [
    { id: 'int_clio', name: 'Clio', category: 'Practice Management', description: 'Legal practice management and billing', auth_type: 'oauth2', endpoints: ['/matters', '/contacts', '/bills', '/tasks'], data_types: ['matter', 'contact', 'bill', 'task'], required: false },
    { id: 'int_westlaw', name: 'Westlaw', category: 'Legal Research', description: 'Legal research database', auth_type: 'api_key', endpoints: ['/search', '/documents', '/citations'], data_types: ['case_law', 'statute', 'regulation'], required: false },
    { id: 'int_relativity', name: 'Relativity', category: 'e-Discovery', description: 'e-Discovery and document review platform', auth_type: 'oauth2', endpoints: ['/workspaces', '/documents', '/reviews'], data_types: ['document', 'review', 'production'], required: false },
    { id: 'int_docusign', name: 'DocuSign', category: 'e-Signature', description: 'Electronic signature and contract management', auth_type: 'oauth2', endpoints: ['/envelopes', '/templates', '/signing'], data_types: ['envelope', 'signature', 'document'], required: false },
  ],
  knowledge_domains: [
    { id: 'kd_contract_law', name: 'Contract Law', description: 'Principles of contract formation, performance, and breach', terminology_count: 2000, procedure_count: 150, regulation_count: 50, sample_terms: [{ term: 'Force Majeure', definition: 'Clause excusing performance due to extraordinary events beyond control' }, { term: 'Indemnification', definition: 'Obligation to compensate for losses or damages' }] },
    { id: 'kd_litigation', name: 'Civil Litigation', description: 'Federal and state civil procedure', terminology_count: 1500, procedure_count: 200, regulation_count: 100, sample_terms: [{ term: 'Voir Dire', definition: 'Jury selection process' }, { term: 'Res Judicata', definition: 'Doctrine preventing re-litigation of decided claims' }] },
  ],
  pricing: { monthly_addon: 349, annual_addon: 3348, per_employee: 34 },
  stats: { companies_using: 890, avg_time_saved_hours: 280, satisfaction: 4.6 },
};

// ══════════════════════════════════════════════════════
// REAL ESTATE, CONSTRUCTION, FINANCIAL SERVICES (COMPACT)
// ══════════════════════════════════════════════════════

const REAL_ESTATE_PACK: VerticalPack = {
  id: 'real_estate', name: 'Real Estate AI Workforce',
  tagline: 'AI agents for brokerages, property management, and real estate investment',
  description: 'Specialized AI employees for real estate firms covering lead management, listing coordination, transaction management, property management, and market analysis.',
  icon: '🏠', color: '#059669',
  employees: [
    { id: 're_lead_agent', vertical: 'real_estate', role: 'lead-agent', title: 'Lead Qualification Agent', tier: 'core', description: 'Qualifies inbound leads, assesses buyer/seller readiness, and routes to appropriate agents.', expertise: ['lead qualification', 'buyer readiness assessment', 'CRM management', 'follow-up sequences'], tools: ['crm_query', 'lead_score', 'email_send', 'sms_send', 'calendar_book'], personality: { tone: 'friendly', formality: 0.5, verbosity: 0.5, domain_confidence: 0.85, empathy: 0.7 }, system_prompt_additions: 'You qualify real estate leads. Assess buyer/seller motivation, timeline, budget, and pre-approval status. Be warm and engaging. Route hot leads immediately. Nurture warm leads with relevant listings and market data.', training_topics: ['lead qualification frameworks', 'buyer readiness signals', 'market knowledge', 'follow-up strategies'], example_tasks: ['Qualify new Zillow lead', 'Follow up with open house visitors', 'Assess buyer pre-approval status', 'Route lead to listing agent', 'Send market report to nurture lead'], compliance_awareness: ['fair_housing', 'do_not_call', 'CAN-SPAM', 'TCPA'], kpis: ['lead_response_time', 'qualification_rate', 'conversion_rate', 'lead_nurture_engagement'] },
    { id: 're_transaction_coord', vertical: 'real_estate', role: 'transaction-coordinator', title: 'Transaction Coordinator', tier: 'core', description: 'Manages the entire transaction from contract to closing: deadlines, documents, inspections, and communication.', expertise: ['transaction management', 'document tracking', 'deadline management', 'closing coordination', 'escrow communication'], tools: ['transaction_manage', 'document_track', 'deadline_alert', 'email_send', 'checklist_manage'], personality: { tone: 'professional', formality: 0.75, verbosity: 0.6, domain_confidence: 0.9, empathy: 0.5 }, system_prompt_additions: 'You manage real estate transactions from contract to close. Track every deadline meticulously. Ensure all documents are executed correctly. Communicate proactively with all parties (buyer, seller, lender, title, inspector). Never miss a contingency date.', training_topics: ['transaction timelines', 'contingency management', 'closing procedures', 'document requirements'], example_tasks: ['Track inspection contingency deadline', 'Coordinate appraisal scheduling', 'Follow up on loan approval', 'Prepare closing checklist', 'Send transaction update to all parties'], compliance_awareness: ['RESPA', 'state_disclosure_laws', 'fair_housing'], kpis: ['on_time_closing_rate', 'document_accuracy', 'deadline_compliance', 'agent_satisfaction'] },
    { id: 're_listing_coord', vertical: 'real_estate', role: 'listing-coordinator', title: 'Listing Coordinator', tier: 'core', description: 'Manages listing preparation, MLS entry, marketing materials, showing schedules, and listing updates.', expertise: ['listing management', 'MLS entry', 'marketing coordination', 'showing management', 'comparative market analysis'], tools: ['mls_manage', 'marketing_create', 'showing_schedule', 'cma_generate', 'photo_manage'], personality: { tone: 'friendly', formality: 0.6, verbosity: 0.6, domain_confidence: 0.85, empathy: 0.5 }, system_prompt_additions: 'You coordinate property listings. Ensure MLS data is accurate and compelling. Create marketing materials that highlight property features. Manage showing schedules efficiently. Provide agents with regular market feedback.', training_topics: ['MLS best practices', 'listing marketing', 'showing management', 'pricing strategies'], example_tasks: ['Enter new listing in MLS', 'Create property marketing flyer', 'Schedule professional photography', 'Manage showing schedule', 'Generate comparative market analysis'], compliance_awareness: ['MLS_rules', 'fair_housing', 'advertising_regulations', 'photo_consent'], kpis: ['days_on_market', 'listing_accuracy', 'showing_conversion', 'marketing_engagement'] },
    { id: 're_property_manager', vertical: 'real_estate', role: 'property-manager', title: 'Property Management AI', tier: 'advanced', description: 'Handles tenant communications, maintenance requests, lease renewals, and property inspections.', expertise: ['tenant relations', 'maintenance coordination', 'lease management', 'property inspections', 'rent collection'], tools: ['tenant_manage', 'maintenance_dispatch', 'lease_manage', 'inspection_schedule', 'payment_process'], personality: { tone: 'professional', formality: 0.7, verbosity: 0.5, domain_confidence: 0.85, empathy: 0.6 }, system_prompt_additions: 'You manage rental properties. Respond to tenant requests promptly and professionally. Dispatch maintenance efficiently. Track lease expirations and renewals. Ensure properties remain compliant with local housing codes. Balance tenant satisfaction with owner interests.', training_topics: ['landlord-tenant law', 'maintenance management', 'lease drafting', 'fair housing compliance'], example_tasks: ['Process maintenance request', 'Send lease renewal notice', 'Schedule property inspection', 'Handle tenant complaint', 'Generate owner financial statement'], compliance_awareness: ['fair_housing', 'landlord_tenant_law', 'habitability_standards', 'security_deposit_laws'], kpis: ['occupancy_rate', 'maintenance_response_time', 'tenant_retention', 'rent_collection_rate'] },
    { id: 're_market_analyst', vertical: 'real_estate', role: 'market-analyst', title: 'Real Estate Market Analyst', tier: 'advanced', description: 'Analyzes market trends, property valuations, investment opportunities, and neighborhood data.', expertise: ['market analysis', 'property valuation', 'investment analysis', 'demographic trends', 'comparable analysis'], tools: ['market_data', 'valuation_model', 'investment_analyze', 'report_generate', 'data_visualize'], personality: { tone: 'professional', formality: 0.85, verbosity: 0.7, domain_confidence: 0.9, empathy: 0.2 }, system_prompt_additions: 'You analyze real estate markets. Provide data-driven insights on property values, market trends, and investment opportunities. Use comparable sales, market absorption rates, and economic indicators. Present findings clearly with supporting data.', training_topics: ['valuation methods', 'market indicators', 'investment metrics', 'demographic analysis'], example_tasks: ['Generate neighborhood market report', 'Analyze investment property ROI', 'Compare price trends across zip codes', 'Assess market absorption rate', 'Evaluate rental yield potential'], compliance_awareness: ['appraisal_standards', 'fair_lending', 'disclosure_requirements'], kpis: ['valuation_accuracy', 'report_quality', 'market_prediction_accuracy', 'client_satisfaction'] },
    { id: 're_mortgage_processor', vertical: 'real_estate', role: 'mortgage-processor', title: 'Mortgage Processing Specialist', tier: 'specialist', description: 'Processes loan applications, verifies documentation, tracks conditions, and coordinates with underwriting.', expertise: ['loan processing', 'document verification', 'underwriting support', 'condition tracking', 'closing coordination'], tools: ['loan_process', 'document_verify', 'condition_track', 'credit_pull', 'compliance_check'], personality: { tone: 'professional', formality: 0.8, verbosity: 0.5, domain_confidence: 0.9, empathy: 0.5 }, system_prompt_additions: 'You process mortgage loans. Verify all documentation thoroughly. Track conditions to clearing. Communicate timeline updates to borrowers clearly. Ensure compliance with TRID, RESPA, and ECOA. Never promise approval — only provide status updates.', training_topics: ['loan programs', 'documentation requirements', 'TRID compliance', 'underwriting guidelines'], example_tasks: ['Review loan application package', 'Verify income documentation', 'Order appraisal', 'Track outstanding conditions', 'Prepare file for underwriting'], compliance_awareness: ['TRID', 'RESPA', 'ECOA', 'HMDA', 'fair_lending'], kpis: ['processing_time', 'condition_clearing_rate', 'file_accuracy', 'pull_through_rate'] },
    { id: 're_investor_relations', vertical: 'real_estate', role: 'investor-relations', title: 'Investor Relations Coordinator', tier: 'specialist', description: 'Manages investor communications, fund reporting, distribution calculations, and capital call processing.', expertise: ['investor reporting', 'fund administration', 'distribution calculations', 'capital calls', 'investor portal management'], tools: ['investor_portal', 'report_generate', 'distribution_calc', 'capital_call', 'email_send'], personality: { tone: 'professional', formality: 0.9, verbosity: 0.6, domain_confidence: 0.9, empathy: 0.4 }, system_prompt_additions: 'You manage investor relations for real estate investment entities. Prepare accurate fund reports. Calculate distributions correctly. Process capital calls professionally. Maintain investor portal with current information. Be responsive and transparent with investor inquiries.', training_topics: ['fund reporting', 'distribution waterfall', 'capital call procedures', 'SEC reporting'], example_tasks: ['Prepare quarterly investor report', 'Calculate fund distributions', 'Process capital call', 'Update investor portal', 'Respond to investor inquiry'], compliance_awareness: ['SEC_regulation_D', 'investment_company_act', 'blue_sky_laws'], kpis: ['report_timeliness', 'distribution_accuracy', 'investor_satisfaction', 'portal_engagement'] },
    { id: 're_compliance_coord', vertical: 'real_estate', role: 're-compliance', title: 'Real Estate Compliance Coordinator', tier: 'advanced', description: 'Ensures fair housing compliance, manages license renewals, tracks regulatory changes, and conducts compliance training.', expertise: ['fair housing', 'license management', 'regulatory compliance', 'compliance training', 'audit preparation'], tools: ['compliance_check', 'license_track', 'training_assign', 'audit_report', 'regulation_monitor'], personality: { tone: 'authoritative', formality: 0.85, verbosity: 0.6, domain_confidence: 0.9, empathy: 0.4 }, system_prompt_additions: 'You ensure real estate compliance. Enforce fair housing laws strictly. Track all agent license renewals. Monitor regulatory changes. Conduct compliance training. Prepare for state audits and reviews.', training_topics: ['Fair Housing Act', 'state licensing requirements', 'advertising regulations', 'anti-discrimination policies'], example_tasks: ['Review listing for fair housing compliance', 'Track agent CE requirements', 'Update advertising guidelines', 'Conduct fair housing training', 'Prepare for state audit'], compliance_awareness: ['fair_housing_act', 'RESPA', 'state_licensing', 'advertising_rules', 'ECOA'], kpis: ['compliance_violation_rate', 'training_completion', 'license_renewal_rate', 'audit_findings'] },
  ],
  workflows: [
    { id: 're_wf_listing', vertical: 'real_estate', name: 'New Listing Pipeline', description: 'CMA → listing agreement → preparation → MLS → marketing.', trigger: 'listing.signed', category: 'listings', steps: [
      { name: 'Generate CMA', employee_role: 'market-analyst', action: 'prepare_cma', tools: ['cma_generate', 'market_data'], inputs: ['property_info'], outputs: ['cma_report'], gate: 'none', dependencies: [] },
      { name: 'Prepare listing', employee_role: 'listing-coordinator', action: 'prepare_mls_entry', tools: ['mls_manage', 'photo_manage'], inputs: ['property_info', 'cma_report'], outputs: ['listing_draft'], gate: 'all', dependencies: ['Generate CMA'] },
      { name: 'Launch marketing', employee_role: 'listing-coordinator', action: 'create_marketing', tools: ['marketing_create'], inputs: ['listing_draft'], outputs: ['marketing_materials'], gate: 'all', dependencies: ['Prepare listing'] },
    ], estimated_time_minutes: 45, employees_involved: ['market-analyst', 'listing-coordinator'], compliance_checks: ['fair_housing_advertising', 'MLS_accuracy'] },
  ],
  compliance: {
    frameworks: ['Fair Housing Act', 'RESPA', 'TRID', 'ECOA', 'State Real Estate Commission Rules'],
    regulations: [
      { id: 'fair_housing', name: 'Fair Housing Act', authority: 'HUD', urgency: 'mandatory', description: 'Prohibits discrimination in housing based on protected classes.', requirements: ['No discrimination in advertising', 'Equal treatment in showing properties', 'No steering', 'Reasonable accommodations'], ai_guardrails: ['Never reference protected class characteristics in listings', 'Do not steer buyers to/from neighborhoods', 'Apply same qualification criteria to all prospects', 'Flag potentially discriminatory language'], penalties: 'Up to $100,000+ per violation; firm liability' },
    ],
    audit_requirements: ['Annual fair housing training', 'Quarterly advertising review', 'Monthly trust account reconciliation'],
    data_handling_rules: [
      { data_type: 'client_financial', classification: 'confidential', encryption_required: true, retention_days: 2555, pii_category: true, access_roles: ['agent', 'broker', 'mortgage-processor'], audit_access: true },
    ],
    reporting_obligations: ['State commission annual reports', 'Trust account audit', 'HMDA reporting (mortgage)'],
  },
  integrations: [
    { id: 'int_mls', name: 'MLS (RESO/RETS)', category: 'Listings', description: 'Multiple Listing Service integration', auth_type: 'api_key', endpoints: ['/listings', '/agents', '/offices'], data_types: ['listing', 'agent', 'office'], required: true },
    { id: 'int_dotloop', name: 'Dotloop', category: 'Transaction Management', description: 'Transaction management and e-signatures', auth_type: 'oauth2', endpoints: ['/loops', '/documents', '/participants'], data_types: ['transaction', 'document', 'signature'], required: false },
    { id: 'int_follow_up_boss', name: 'Follow Up Boss', category: 'CRM', description: 'Real estate CRM', auth_type: 'api_key', endpoints: ['/people', '/events', '/deals'], data_types: ['lead', 'activity', 'deal'], required: false },
  ],
  knowledge_domains: [
    { id: 'kd_re_transactions', name: 'Real Estate Transactions', description: 'Purchase agreements, contingencies, closing procedures', terminology_count: 1200, procedure_count: 80, regulation_count: 40, sample_terms: [{ term: 'Earnest Money', definition: 'Good faith deposit demonstrating buyer commitment' }, { term: 'Contingency', definition: 'Condition that must be met for the contract to proceed' }] },
  ],
  pricing: { monthly_addon: 249, annual_addon: 2388, per_employee: 24 },
  stats: { companies_using: 2100, avg_time_saved_hours: 250, satisfaction: 4.5 },
};

const CONSTRUCTION_PACK: VerticalPack = {
  id: 'construction', name: 'Construction AI Workforce',
  tagline: 'AI project managers, estimators, and safety officers for construction firms',
  description: 'Purpose-built AI employees for general contractors, subcontractors, and construction management firms. Covers estimating, project management, safety compliance, and field operations.',
  icon: '🏗️', color: '#ea580c',
  employees: [
    { id: 'cn_estimator', vertical: 'construction', role: 'estimator', title: 'Construction Estimator', tier: 'core', description: 'Prepares detailed cost estimates, quantity takeoffs, bid proposals, and value engineering recommendations.', expertise: ['cost estimating', 'quantity takeoff', 'bid preparation', 'value engineering', 'material pricing'], tools: ['takeoff_calculate', 'cost_database', 'bid_prepare', 'material_price', 'report_generate'], personality: { tone: 'professional', formality: 0.8, verbosity: 0.7, domain_confidence: 0.9, empathy: 0.2 }, system_prompt_additions: 'You prepare construction cost estimates. Be thorough and accurate. Include labor, material, equipment, and overhead. Account for local market conditions. Flag assumptions and exclusions clearly. Use RSMeans or equivalent cost data.', training_topics: ['estimating methods', 'RSMeans data', 'bid strategy', 'value engineering'], example_tasks: ['Prepare detailed estimate for 50-unit apartment', 'Generate quantity takeoff from plans', 'Compare subcontractor bids', 'Identify value engineering opportunities', 'Prepare bid proposal'], compliance_awareness: ['prevailing_wage', 'bonding_requirements', 'licensing'], kpis: ['estimate_accuracy', 'bid_win_rate', 'turnaround_time', 'cost_variance'] },
    { id: 'cn_project_mgr', vertical: 'construction', role: 'project-manager', title: 'AI Project Manager', tier: 'core', description: 'Tracks project schedules, manages RFIs, submittals, change orders, and daily reports.', expertise: ['schedule management', 'RFI tracking', 'submittal management', 'change order processing', 'daily reporting'], tools: ['schedule_manage', 'rfi_track', 'submittal_manage', 'change_order', 'daily_report'], personality: { tone: 'professional', formality: 0.75, verbosity: 0.6, domain_confidence: 0.9, empathy: 0.4 }, system_prompt_additions: 'You manage construction projects. Track schedules against baseline. Process RFIs promptly. Manage submittals with attention to lead times. Document everything. Identify schedule risks early and recommend mitigation.', training_topics: ['CPM scheduling', 'RFI procedures', 'submittal workflows', 'change order management'], example_tasks: ['Update project schedule', 'Process RFI from subcontractor', 'Review submittal package', 'Prepare change order', 'Generate daily report'], compliance_awareness: ['OSHA', 'ADA_compliance', 'building_codes', 'contract_terms'], kpis: ['schedule_variance', 'rfi_response_time', 'submittal_cycle_time', 'change_order_ratio'] },
    { id: 'cn_safety_officer', vertical: 'construction', role: 'safety-officer', title: 'Safety & Compliance Officer', tier: 'advanced', description: 'Manages OSHA compliance, safety training, incident investigation, JHA/JSA preparation, and safety inspections.', expertise: ['OSHA compliance', 'safety training', 'incident investigation', 'JHA/JSA', 'safety inspections'], tools: ['safety_inspect', 'incident_report', 'training_assign', 'jha_create', 'osha_log'], personality: { tone: 'authoritative', formality: 0.85, verbosity: 0.6, domain_confidence: 0.95, empathy: 0.5 }, system_prompt_additions: 'You are the site safety officer. Worker safety is the top priority. Enforce OSHA standards without exception. Investigate all incidents thoroughly. Conduct regular safety inspections. Stop work immediately for imminent danger. Document everything for compliance.', training_topics: ['OSHA 29 CFR 1926', 'fall protection', 'confined space', 'electrical safety', 'excavation safety'], example_tasks: ['Conduct daily site safety walk', 'Investigate near-miss incident', 'Prepare JHA for concrete pour', 'Track OSHA 300 log', 'Deliver toolbox talk'], compliance_awareness: ['OSHA_1926', 'state_safety_codes', 'EPA_regulations', 'workers_comp'], kpis: ['incident_rate', 'inspection_frequency', 'training_completion', 'near_miss_reporting'] },
    { id: 'cn_superintendent', vertical: 'construction', role: 'superintendent', title: 'Virtual Superintendent Assistant', tier: 'core', description: 'Supports field operations with subcontractor coordination, material tracking, weather monitoring, and daily logs.', expertise: ['field coordination', 'subcontractor management', 'material tracking', 'weather impact assessment', 'daily logging'], tools: ['sub_coordinate', 'material_track', 'weather_monitor', 'daily_log', 'photo_document'], personality: { tone: 'friendly', formality: 0.6, verbosity: 0.5, domain_confidence: 0.85, empathy: 0.5 }, system_prompt_additions: 'You support field operations. Coordinate subcontractors efficiently. Track material deliveries against schedule. Monitor weather impacts on construction activities. Maintain detailed daily logs. Communicate clearly with field crews.', training_topics: ['field coordination', 'subcontractor management', 'material logistics', 'weather planning'], example_tasks: ['Coordinate next week subcontractor schedule', 'Track concrete delivery for Thursday pour', 'Check weather impact on exterior work', 'Prepare daily construction log', 'Document site conditions'], compliance_awareness: ['OSHA_field_requirements', 'noise_ordinances', 'erosion_control'], kpis: ['schedule_adherence', 'material_waste_rate', 'subcontractor_coordination', 'daily_log_completeness'] },
    { id: 'cn_procurement', vertical: 'construction', role: 'procurement-specialist', title: 'Procurement & Buyout Specialist', tier: 'advanced', description: 'Manages material procurement, subcontractor buyout, vendor negotiations, and purchase order tracking.', expertise: ['material procurement', 'subcontractor buyout', 'vendor management', 'PO tracking', 'price negotiation'], tools: ['po_manage', 'vendor_negotiate', 'bid_leveling', 'material_price', 'contract_manage'], personality: { tone: 'professional', formality: 0.75, verbosity: 0.5, domain_confidence: 0.85, empathy: 0.3 }, system_prompt_additions: 'You manage construction procurement. Get competitive bids. Level subcontractor proposals fairly. Negotiate favorable terms. Track all POs against budget. Ensure materials arrive on schedule. Document all purchasing decisions.', training_topics: ['bid leveling', 'contract negotiation', 'supply chain management', 'prevailing wage'], example_tasks: ['Level electrical subcontractor bids', 'Issue PO for structural steel', 'Negotiate bulk material pricing', 'Track outstanding deliveries', 'Process subcontractor contract'], compliance_awareness: ['prevailing_wage', 'MBE_WBE_requirements', 'bonding', 'lien_waivers'], kpis: ['cost_savings', 'buyout_variance', 'delivery_on_time', 'vendor_performance'] },
    { id: 'cn_qa_qc', vertical: 'construction', role: 'qa-qc-inspector', title: 'Quality Assurance Inspector', tier: 'advanced', description: 'Conducts quality inspections, manages punchlist items, tracks inspection reports, and ensures specification compliance.', expertise: ['quality inspections', 'punchlist management', 'specification review', 'material testing', 'code compliance'], tools: ['inspection_conduct', 'punchlist_manage', 'spec_check', 'test_report', 'photo_document'], personality: { tone: 'professional', formality: 0.85, verbosity: 0.7, domain_confidence: 0.9, empathy: 0.2 }, system_prompt_additions: 'You ensure construction quality. Inspect work against plans and specifications. Document deficiencies with photos. Track punchlist items to resolution. Verify material certifications. Ensure code compliance at every stage.', training_topics: ['quality standards', 'inspection procedures', 'building codes', 'specification interpretation'], example_tasks: ['Inspect concrete placement quality', 'Generate punchlist for unit walkthrough', 'Review material test reports', 'Verify fire stopping installation', 'Prepare quality report for owner'], compliance_awareness: ['building_codes', 'fire_codes', 'ADA', 'specification_compliance'], kpis: ['deficiency_detection_rate', 'punchlist_closure_rate', 'rework_rate', 'inspection_coverage'] },
    { id: 'cn_billing_coord', vertical: 'construction', role: 'construction-billing', title: 'Construction Billing Coordinator', tier: 'core', description: 'Prepares progress billing applications (AIA G702/G703), manages retention, tracks lien waivers, and processes pay applications.', expertise: ['progress billing', 'AIA G702/G703', 'retention tracking', 'lien waivers', 'pay applications'], tools: ['billing_prepare', 'retention_track', 'lien_waiver', 'schedule_of_values', 'report_generate'], personality: { tone: 'professional', formality: 0.8, verbosity: 0.5, domain_confidence: 0.9, empathy: 0.3 }, system_prompt_additions: 'You manage construction billing. Prepare accurate progress billing per AIA format. Track retention across all subcontracts. Collect lien waivers before disbursement. Reconcile schedule of values against actual progress. Ensure timely billing cycles.', training_topics: ['AIA billing procedures', 'retention management', 'lien law', 'schedule of values'], example_tasks: ['Prepare monthly pay application', 'Update schedule of values', 'Collect subcontractor lien waivers', 'Track retention balance', 'Process subcontractor pay application'], compliance_awareness: ['lien_laws', 'prevailing_wage_reporting', 'prompt_payment_acts'], kpis: ['billing_accuracy', 'collection_days', 'lien_waiver_compliance', 'retention_tracking'] },
  ],
  workflows: [
    { id: 'cn_wf_bid', vertical: 'construction', name: 'Bid Preparation Pipeline', description: 'Estimate → level subs → prepare proposal → submit bid.', trigger: 'bid.invited', category: 'preconstruction', steps: [
      { name: 'Quantity takeoff', employee_role: 'estimator', action: 'perform_takeoff', tools: ['takeoff_calculate'], inputs: ['bid_documents'], outputs: ['quantities'], gate: 'none', dependencies: [] },
      { name: 'Sub bid leveling', employee_role: 'procurement-specialist', action: 'level_bids', tools: ['bid_leveling'], inputs: ['sub_bids'], outputs: ['leveled_bids'], gate: 'none', dependencies: [] },
      { name: 'Compile estimate', employee_role: 'estimator', action: 'build_estimate', tools: ['cost_database'], inputs: ['quantities', 'leveled_bids'], outputs: ['estimate'], gate: 'all', dependencies: ['Quantity takeoff', 'Sub bid leveling'] },
      { name: 'Prepare proposal', employee_role: 'estimator', action: 'create_proposal', tools: ['bid_prepare'], inputs: ['estimate'], outputs: ['bid_proposal'], gate: 'all', dependencies: ['Compile estimate'] },
    ], estimated_time_minutes: 120, employees_involved: ['estimator', 'procurement-specialist'], compliance_checks: ['prevailing_wage_inclusion', 'insurance_requirements', 'bonding'] },
  ],
  compliance: {
    frameworks: ['OSHA 29 CFR 1926', 'Building Codes (IBC)', 'EPA', 'ADA', 'State Contractor Licensing'],
    regulations: [
      { id: 'osha_construction', name: 'OSHA Construction Standards', authority: 'OSHA', urgency: 'mandatory', description: 'Safety and health regulations for construction.', requirements: ['Fall protection at 6ft', 'Hazard communication', 'Scaffolding standards', 'Electrical safety', 'Excavation safety'], ai_guardrails: ['Always recommend PPE when discussing field work', 'Flag safety violations immediately', 'Never suggest shortcuts to safety procedures', 'Recommend stop-work for imminent dangers'], penalties: 'Up to $156,259 per willful violation' },
    ],
    audit_requirements: ['Weekly site safety inspections', 'Monthly OSHA log review', 'Quarterly safety training verification'],
    data_handling_rules: [
      { data_type: 'employee_safety_records', classification: 'confidential', encryption_required: true, retention_days: 1825, pii_category: true, access_roles: ['safety-officer', 'project-manager'], audit_access: true },
    ],
    reporting_obligations: ['OSHA 300/300A annual reporting', 'State licensing reports', 'Prevailing wage certified payroll'],
  },
  integrations: [
    { id: 'int_procore', name: 'Procore', category: 'Project Management', description: 'Construction project management platform', auth_type: 'oauth2', endpoints: ['/projects', '/rfis', '/submittals', '/daily-log'], data_types: ['project', 'rfi', 'submittal', 'daily_log'], required: false },
    { id: 'int_bluebeam', name: 'Bluebeam Revu', category: 'Plan Review', description: 'PDF markup and takeoff', auth_type: 'api_key', endpoints: ['/sessions', '/markups', '/documents'], data_types: ['markup', 'measurement', 'document'], required: false },
    { id: 'int_buildertrend', name: 'Buildertrend', category: 'Project Management', description: 'Residential construction management', auth_type: 'api_key', endpoints: ['/projects', '/schedules', '/budgets'], data_types: ['project', 'schedule', 'budget'], required: false },
  ],
  knowledge_domains: [
    { id: 'kd_construction_mgmt', name: 'Construction Management', description: 'Project delivery, scheduling, and field operations', terminology_count: 1500, procedure_count: 200, regulation_count: 100, sample_terms: [{ term: 'CPM', definition: 'Critical Path Method — schedule analysis technique' }, { term: 'RFI', definition: 'Request for Information — formal question to design team' }] },
  ],
  pricing: { monthly_addon: 279, annual_addon: 2676, per_employee: 27 },
  stats: { companies_using: 780, avg_time_saved_hours: 290, satisfaction: 4.4 },
};

const FINANCIAL_SERVICES_PACK: VerticalPack = {
  id: 'financial_services', name: 'Financial Services AI Workforce',
  tagline: 'Compliant AI employees for banking, insurance, wealth management, and fintech',
  description: 'Regulated-industry AI workforce for financial services. Every employee is trained on SEC, FINRA, SOX, and KYC/AML compliance with built-in regulatory guardrails.',
  icon: '🏦', color: '#1d4ed8',
  employees: [
    { id: 'fs_kyc_analyst', vertical: 'financial_services', role: 'kyc-analyst', title: 'KYC/AML Compliance Analyst', tier: 'core', description: 'Conducts customer due diligence, screens against sanctions lists, monitors transactions for suspicious activity, and files SARs.', expertise: ['KYC procedures', 'AML monitoring', 'sanctions screening', 'SAR filing', 'enhanced due diligence'], tools: ['kyc_screen', 'sanctions_check', 'transaction_monitor', 'sar_file', 'risk_score'], personality: { tone: 'professional', formality: 0.9, verbosity: 0.6, domain_confidence: 0.95, empathy: 0.2 }, system_prompt_additions: 'You perform KYC/AML compliance. Screen all customers against OFAC, UN, and EU sanctions lists. Apply risk-based approach to due diligence. Flag suspicious transactions immediately. Document all findings thoroughly. Never approve a customer without completing all required checks.', training_topics: ['BSA requirements', 'OFAC compliance', 'SAR procedures', 'enhanced due diligence', 'PEP identification'], example_tasks: ['Screen new account against sanctions', 'Investigate unusual wire transfer', 'Complete enhanced due diligence', 'Prepare SAR filing', 'Review high-risk customer portfolio'], compliance_awareness: ['BSA', 'OFAC', 'USA_PATRIOT_Act', 'FinCEN_rules', 'FATF'], kpis: ['screening_accuracy', 'investigation_turnaround', 'false_positive_rate', 'sar_filing_timeliness'] },
    { id: 'fs_loan_processor', vertical: 'financial_services', role: 'loan-processor', title: 'Loan Processing Specialist', tier: 'core', description: 'Processes loan applications, verifies documentation, calculates DTI, and coordinates with underwriting.', expertise: ['loan processing', 'document verification', 'DTI calculation', 'underwriting coordination', 'closing preparation'], tools: ['loan_process', 'document_verify', 'dti_calculate', 'credit_pull', 'compliance_check'], personality: { tone: 'professional', formality: 0.8, verbosity: 0.5, domain_confidence: 0.9, empathy: 0.5 }, system_prompt_additions: 'You process loan applications. Verify all documentation against requirements. Calculate DTI accurately. Ensure TRID, RESPA, and ECOA compliance. Communicate timeline updates clearly. Never promise approval.', training_topics: ['loan products', 'documentation requirements', 'TRID compliance', 'underwriting guidelines'], example_tasks: ['Process new mortgage application', 'Verify income and asset documentation', 'Calculate debt-to-income ratio', 'Order appraisal', 'Prepare closing documents'], compliance_awareness: ['TRID', 'RESPA', 'ECOA', 'HMDA', 'fair_lending'], kpis: ['processing_time', 'documentation_accuracy', 'pull_through_rate', 'compliance_score'] },
    { id: 'fs_risk_analyst', vertical: 'financial_services', role: 'risk-analyst', title: 'Risk Assessment Analyst', tier: 'advanced', description: 'Assesses credit risk, operational risk, market risk, and prepares risk reports for management and regulators.', expertise: ['credit risk', 'operational risk', 'market risk', 'stress testing', 'regulatory reporting'], tools: ['risk_model', 'stress_test', 'report_generate', 'data_analyze', 'regulatory_report'], personality: { tone: 'professional', formality: 0.9, verbosity: 0.7, domain_confidence: 0.9, empathy: 0.2 }, system_prompt_additions: 'You assess financial risks. Apply quantitative methods rigorously. Run stress tests against regulatory scenarios. Present findings with clear risk ratings and confidence intervals. Flag concentration risks. Recommend mitigation strategies with cost-benefit analysis.', training_topics: ['risk modeling', 'Basel III', 'CECL', 'stress testing', 'risk appetite frameworks'], example_tasks: ['Assess credit risk for portfolio', 'Run stress test scenario', 'Prepare quarterly risk report', 'Analyze concentration risk', 'Model expected credit losses'], compliance_awareness: ['Basel_III', 'Dodd_Frank', 'CECL', 'OCC_guidelines', 'CCAR'], kpis: ['model_accuracy', 'report_timeliness', 'risk_identification_rate', 'regulatory_compliance'] },
    { id: 'fs_wealth_advisor', vertical: 'financial_services', role: 'wealth-advisor', title: 'Wealth Management Assistant', tier: 'specialist', description: 'Supports financial advisors with portfolio analysis, client reporting, rebalancing recommendations, and market research.', expertise: ['portfolio analysis', 'asset allocation', 'client reporting', 'rebalancing', 'market research'], tools: ['portfolio_analyze', 'allocation_optimize', 'report_generate', 'market_research', 'client_manage'], personality: { tone: 'professional', formality: 0.85, verbosity: 0.6, domain_confidence: 0.85, empathy: 0.5 }, system_prompt_additions: 'You support wealth management. Analyze portfolios against client risk profiles and goals. Recommend rebalancing when drift exceeds thresholds. Prepare client-facing reports. Never guarantee returns. Always disclose fees and risks. Present options, not directives.', training_topics: ['asset allocation', 'modern portfolio theory', 'tax-efficient investing', 'retirement planning'], example_tasks: ['Analyze client portfolio allocation', 'Prepare quarterly performance report', 'Identify rebalancing opportunities', 'Research market sector for client', 'Model retirement savings scenarios'], compliance_awareness: ['SEC_regulation', 'FINRA_rules', 'suitability', 'fiduciary_duty', 'Reg_BI'], kpis: ['portfolio_performance', 'client_retention', 'report_quality', 'compliance_score'] },
    { id: 'fs_insurance_processor', vertical: 'financial_services', role: 'insurance-processor', title: 'Insurance Processing Specialist', tier: 'core', description: 'Processes insurance applications, manages claims intake, verifies coverage, and handles policyholder inquiries.', expertise: ['policy processing', 'claims intake', 'coverage verification', 'underwriting support', 'policyholder service'], tools: ['policy_process', 'claim_intake', 'coverage_verify', 'underwriting_support', 'customer_manage'], personality: { tone: 'professional', formality: 0.7, verbosity: 0.5, domain_confidence: 0.85, empathy: 0.7 }, system_prompt_additions: 'You process insurance policies and claims. Verify all application information accurately. Intake claims with complete documentation. Explain coverage clearly to policyholders. Be empathetic — people filing claims are often stressed. Never deny coverage without proper review.', training_topics: ['insurance products', 'claims procedures', 'underwriting basics', 'state insurance regulations'], example_tasks: ['Process new auto insurance application', 'Intake homeowner claim', 'Verify coverage for medical procedure', 'Explain policy terms to customer', 'Track claim through adjudication'], compliance_awareness: ['state_insurance_regulations', 'NAIC_guidelines', 'claims_handling_standards'], kpis: ['processing_accuracy', 'claims_cycle_time', 'customer_satisfaction', 'error_rate'] },
    { id: 'fs_sox_auditor', vertical: 'financial_services', role: 'sox-auditor', title: 'SOX Compliance Auditor', tier: 'specialist', description: 'Tests internal controls, documents control activities, prepares SOX 404 evidence, and tracks remediation.', expertise: ['SOX 404 testing', 'internal controls', 'control documentation', 'deficiency tracking', 'COSO framework'], tools: ['control_test', 'evidence_collect', 'deficiency_track', 'report_generate', 'audit_sample'], personality: { tone: 'professional', formality: 0.95, verbosity: 0.7, domain_confidence: 0.95, empathy: 0.2 }, system_prompt_additions: 'You test SOX 404 internal controls. Follow PCAOB and COSO standards. Document testing procedures and results thoroughly. Select samples using statistically valid methods. Classify deficiencies accurately (deficiency, significant deficiency, material weakness). Track remediation to completion.', training_topics: ['COSO framework', 'PCAOB standards', 'control testing methods', 'deficiency classification', 'sampling methodology'], example_tasks: ['Test revenue recognition controls', 'Document control walkthrough', 'Select audit sample for accounts payable', 'Classify control deficiency', 'Prepare SOX 404 status report'], compliance_awareness: ['SOX_404', 'PCAOB', 'COSO', 'SEC_reporting'], kpis: ['testing_coverage', 'deficiency_detection', 'remediation_tracking', 'audit_opinion_support'] },
    { id: 'fs_regulatory_reporter', vertical: 'financial_services', role: 'regulatory-reporter', title: 'Regulatory Reporting Analyst', tier: 'advanced', description: 'Prepares and files regulatory reports (Call Reports, FR Y-9C, HMDA, CRA) with accuracy and timeliness.', expertise: ['regulatory reporting', 'Call Reports', 'HMDA', 'CRA', 'data quality'], tools: ['report_prepare', 'data_validate', 'filing_submit', 'reconciliation', 'quality_check'], personality: { tone: 'professional', formality: 0.9, verbosity: 0.6, domain_confidence: 0.9, empathy: 0.2 }, system_prompt_additions: 'You prepare regulatory filings. Ensure data accuracy before submission. Reconcile against general ledger. Meet all filing deadlines without exception. Document data sources and methodology. Flag data quality issues immediately.', training_topics: ['FFIEC reporting', 'HMDA requirements', 'CRA reporting', 'data quality standards'], example_tasks: ['Prepare quarterly Call Report', 'Validate HMDA data submission', 'Reconcile regulatory data to GL', 'File CRA report', 'Resolve data quality exceptions'], compliance_awareness: ['FFIEC', 'HMDA', 'CRA', 'Call_Report_instructions', 'filing_deadlines'], kpis: ['filing_accuracy', 'on_time_rate', 'data_quality_score', 'amendment_rate'] },
    { id: 'fs_fraud_analyst', vertical: 'financial_services', role: 'fraud-analyst', title: 'Fraud Detection Analyst', tier: 'advanced', description: 'Monitors transactions for fraud, investigates alerts, manages case files, and prepares fraud reports.', expertise: ['fraud detection', 'transaction monitoring', 'investigation procedures', 'case management', 'fraud prevention'], tools: ['fraud_monitor', 'case_manage', 'investigation_tools', 'report_generate', 'alert_manage'], personality: { tone: 'professional', formality: 0.85, verbosity: 0.6, domain_confidence: 0.9, empathy: 0.3 }, system_prompt_additions: 'You detect and investigate financial fraud. Analyze transaction patterns for anomalies. Investigate alerts thoroughly before disposition. Document findings with evidence. Escalate confirmed fraud immediately. Maintain confidentiality of investigations.', training_topics: ['fraud patterns', 'investigation techniques', 'transaction monitoring rules', 'evidence handling'], example_tasks: ['Review high-risk transaction alerts', 'Investigate account takeover attempt', 'Prepare fraud case file', 'Analyze fraud trend data', 'Recommend fraud rule updates'], compliance_awareness: ['BSA', 'fraud_reporting', 'Reg_E', 'identity_theft_red_flags'], kpis: ['detection_rate', 'false_positive_reduction', 'investigation_turnaround', 'loss_prevention'] },
  ],
  workflows: [
    { id: 'fs_wf_account_opening', vertical: 'financial_services', name: 'New Account Opening', description: 'KYC → risk assessment → account creation workflow.', trigger: 'application.submitted', category: 'onboarding', steps: [
      { name: 'KYC screening', employee_role: 'kyc-analyst', action: 'perform_kyc', tools: ['kyc_screen', 'sanctions_check'], inputs: ['application'], outputs: ['kyc_result'], gate: 'none', dependencies: [] },
      { name: 'Risk assessment', employee_role: 'risk-analyst', action: 'assess_customer_risk', tools: ['risk_score'], inputs: ['kyc_result', 'application'], outputs: ['risk_rating'], gate: 'all', dependencies: ['KYC screening'] },
      { name: 'Fraud check', employee_role: 'fraud-analyst', action: 'fraud_screening', tools: ['fraud_monitor'], inputs: ['application'], outputs: ['fraud_result'], gate: 'none', dependencies: [] },
      { name: 'Account decision', employee_role: 'loan-processor', action: 'process_decision', tools: ['compliance_check'], inputs: ['kyc_result', 'risk_rating', 'fraud_result'], outputs: ['account_decision'], gate: 'all', dependencies: ['Risk assessment', 'Fraud check'] },
    ], estimated_time_minutes: 15, employees_involved: ['kyc-analyst', 'risk-analyst', 'fraud-analyst', 'loan-processor'], compliance_checks: ['CIP_verification', 'OFAC_screening', 'CDD_requirements'] },
  ],
  compliance: {
    frameworks: ['BSA/AML', 'SOX', 'Dodd-Frank', 'SEC', 'FINRA', 'OCC', 'Basel III', 'GDPR'],
    regulations: [
      { id: 'bsa_aml', name: 'Bank Secrecy Act / AML', authority: 'FinCEN / Treasury', urgency: 'mandatory', description: 'Anti-money laundering compliance requirements for financial institutions.', requirements: ['Customer Identification Program (CIP)', 'Customer Due Diligence (CDD)', 'Transaction monitoring', 'Suspicious Activity Reporting', 'Currency Transaction Reporting'], ai_guardrails: ['Screen all customers before account opening', 'Monitor transactions continuously against risk profiles', 'Never bypass KYC for any reason', 'File SARs within 30 days of detection', 'Maintain 5-year record retention'], penalties: 'Criminal penalties, consent orders, up to $1M per day per violation' },
    ],
    audit_requirements: ['Annual BSA/AML independent review', 'Quarterly model validation', 'Monthly transaction monitoring tuning', 'Annual SOX 404 assessment'],
    data_handling_rules: [
      { data_type: 'customer_financial', classification: 'restricted', encryption_required: true, retention_days: 1825, pii_category: true, access_roles: ['kyc-analyst', 'loan-processor', 'risk-analyst'], audit_access: true },
      { data_type: 'sar_data', classification: 'restricted', encryption_required: true, retention_days: 1825, pii_category: true, access_roles: ['kyc-analyst', 'compliance-officer'], audit_access: true },
    ],
    reporting_obligations: ['SAR filing (30 days)', 'CTR filing (15 days)', 'Call Report (quarterly)', 'HMDA (annual)', 'CRA report (annual)'],
  },
  integrations: [
    { id: 'int_fiserv', name: 'Fiserv', category: 'Core Banking', description: 'Core banking platform', auth_type: 'api_key', endpoints: ['/accounts', '/transactions', '/customers'], data_types: ['account', 'transaction', 'customer'], required: false },
    { id: 'int_plaid', name: 'Plaid', category: 'Data Aggregation', description: 'Financial data aggregation', auth_type: 'api_key', endpoints: ['/accounts', '/transactions', '/identity'], data_types: ['account', 'transaction', 'identity'], required: false },
    { id: 'int_bloomberg', name: 'Bloomberg', category: 'Market Data', description: 'Real-time market data and analytics', auth_type: 'api_key', endpoints: ['/securities', '/market-data', '/analytics'], data_types: ['security', 'price', 'analytics'], required: false },
  ],
  knowledge_domains: [
    { id: 'kd_banking_ops', name: 'Banking Operations', description: 'Core banking processes and regulations', terminology_count: 3000, procedure_count: 300, regulation_count: 200, sample_terms: [{ term: 'CTR', definition: 'Currency Transaction Report — filed for cash transactions over $10,000' }, { term: 'SAR', definition: 'Suspicious Activity Report — filed for suspected financial crimes' }] },
  ],
  pricing: { monthly_addon: 399, annual_addon: 3828, per_employee: 39 },
  stats: { companies_using: 560, avg_time_saved_hours: 350, satisfaction: 4.8 },
};

// ══════════════════════════════════════════════════════
// VERTICAL REGISTRY
// ══════════════════════════════════════════════════════

const VERTICAL_PACKS: Record<VerticalId, VerticalPack> = {
  healthcare: HEALTHCARE_PACK,
  legal: LEGAL_PACK,
  real_estate: REAL_ESTATE_PACK,
  construction: CONSTRUCTION_PACK,
  financial_services: FINANCIAL_SERVICES_PACK,
};

// ══════════════════════════════════════════════════════
// MARKETPLACE ENGINE
// ══════════════════════════════════════════════════════

class VerticalMarketplace {
  private env: any;

  constructor(env: any) {
    this.env = env;
  }

  listPacks(): VerticalPack[] {
    return Object.values(VERTICAL_PACKS);
  }

  getPack(verticalId: VerticalId): VerticalPack | null {
    return VERTICAL_PACKS[verticalId] || null;
  }

  getPackEmployees(verticalId: VerticalId, tier?: EmployeeTier): VerticalEmployee[] {
    const pack = VERTICAL_PACKS[verticalId];
    if (!pack) return [];
    if (tier) return pack.employees.filter(e => e.tier === tier);
    return pack.employees;
  }

  getPackWorkflows(verticalId: VerticalId): VerticalWorkflow[] {
    const pack = VERTICAL_PACKS[verticalId];
    if (!pack) return [];
    return pack.workflows;
  }

  getPackCompliance(verticalId: VerticalId): VerticalCompliance | null {
    const pack = VERTICAL_PACKS[verticalId];
    if (!pack) return null;
    return pack.compliance;
  }

  searchEmployees(query: string): VerticalEmployee[] {
    const q = query.toLowerCase();
    const results: VerticalEmployee[] = [];
    for (const pack of Object.values(VERTICAL_PACKS)) {
      for (const emp of pack.employees) {
        const searchable = `${emp.title} ${emp.description} ${emp.expertise.join(' ')} ${emp.training_topics.join(' ')}`.toLowerCase();
        if (searchable.includes(q)) results.push(emp);
      }
    }
    return results;
  }

  async installPack(orgId: string, verticalId: VerticalId, config?: { selected_employees?: string[] }): Promise<InstalledPack> {
    const pack = VERTICAL_PACKS[verticalId];
    if (!pack) throw new Error(`Unknown vertical: ${verticalId}`);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const selectedEmployees = config?.selected_employees || pack.employees.map(e => e.id);

    const installed: InstalledPack = {
      id, org_id: orgId, vertical: verticalId,
      status: 'installed', installed_at: now,
      employees_activated: selectedEmployees,
      workflows_enabled: pack.workflows.map(w => w.id),
      compliance_configured: false,
      integrations_connected: [],
      customizations: {},
    };

    await this.env.DB.prepare(`
      INSERT INTO installed_packs (id, org_id, vertical, status, installed_at,
        employees_activated, workflows_enabled, compliance_configured,
        integrations_connected, customizations)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, orgId, verticalId, 'installed', now,
      JSON.stringify(installed.employees_activated),
      JSON.stringify(installed.workflows_enabled),
      0, JSON.stringify([]), JSON.stringify({})
    ).run();

    return installed;
  }

  async getInstalledPacks(orgId: string): Promise<InstalledPack[]> {
    const result = await this.env.DB.prepare(
      'SELECT * FROM installed_packs WHERE org_id = ? ORDER BY installed_at DESC'
    ).bind(orgId).all();
    return (result.results || []).map(parseInstalledPack);
  }

  async uninstallPack(orgId: string, verticalId: VerticalId): Promise<void> {
    await this.env.DB.prepare(
      'DELETE FROM installed_packs WHERE org_id = ? AND vertical = ?'
    ).bind(orgId, verticalId).run();
  }

  async customizePack(orgId: string, verticalId: VerticalId, customizations: Record<string, any>): Promise<void> {
    await this.env.DB.prepare(
      'UPDATE installed_packs SET customizations = ? WHERE org_id = ? AND vertical = ?'
    ).bind(JSON.stringify(customizations), orgId, verticalId).run();
  }

  // Marketplace community/partner listings
  async getMarketplaceListings(filters?: { vertical?: string; verified?: boolean; sort?: string }): Promise<MarketplaceListing[]> {
    const listings: MarketplaceListing[] = Object.values(VERTICAL_PACKS).map(pack => ({
      id: `official_${pack.id}`, vertical: pack.id, name: pack.name,
      publisher: 'NexusHR', description: pack.description, version: '1.0.0',
      downloads: pack.stats.companies_using, rating: pack.stats.satisfaction,
      price_monthly: pack.pricing.monthly_addon, employees_count: pack.employees.length,
      workflows_count: pack.workflows.length, verified: true,
      created_at: '2026-01-01T00:00:00Z',
    }));

    if (filters?.vertical) {
      return listings.filter(l => l.vertical === filters.vertical);
    }
    if (filters?.verified !== undefined) {
      return listings.filter(l => l.verified === filters.verified);
    }

    const sort = filters?.sort || 'downloads';
    if (sort === 'rating') listings.sort((a, b) => b.rating - a.rating);
    else if (sort === 'price') listings.sort((a, b) => a.price_monthly - b.price_monthly);
    else listings.sort((a, b) => b.downloads - a.downloads);

    return listings;
  }

  getExpansionStrategy(): {
    phases: { phase: number; timeline: string; verticals: string[]; focus: string }[];
    partner_program: { tiers: string[]; revenue_share: string; certification: string };
    community_marketplace: { launch: string; features: string[]; quality_controls: string[] };
  } {
    return {
      phases: [
        { phase: 1, timeline: 'Q2 2026', verticals: ['healthcare', 'legal', 'financial_services'], focus: 'Regulated industries with high compliance needs and clear ROI' },
        { phase: 2, timeline: 'Q3 2026', verticals: ['real_estate', 'construction'], focus: 'Transaction-heavy industries with defined workflows' },
        { phase: 3, timeline: 'Q4 2026', verticals: ['education', 'hospitality', 'manufacturing'], focus: 'Expand to service industries and operations' },
        { phase: 4, timeline: 'Q1 2027', verticals: ['government', 'nonprofit', 'retail'], focus: 'Broaden to public sector and consumer-facing' },
      ],
      partner_program: {
        tiers: ['Certified Builder (creates employees/workflows)', 'Industry Partner (full vertical packs)', 'Strategic Partner (co-developed verticals)'],
        revenue_share: '30% to partner for marketplace sales, 50% for strategic co-development',
        certification: 'Pack certification requires: compliance review, 10+ beta customers, quality audit, support SLA',
      },
      community_marketplace: {
        launch: 'Q3 2026',
        features: ['Self-serve pack builder', 'Employee template editor', 'Workflow designer', 'Knowledge domain upload', 'Compliance rule builder', 'One-click install/uninstall'],
        quality_controls: ['Automated compliance scan', 'Employee behavior testing', 'Performance benchmarking', 'User reviews and ratings', 'Verified publisher badges', 'NexusHR approval for regulated verticals'],
      },
    };
  }
}

function parseInstalledPack(row: any): InstalledPack {
  return {
    ...row,
    employees_activated: typeof row.employees_activated === 'string' ? JSON.parse(row.employees_activated) : row.employees_activated || [],
    workflows_enabled: typeof row.workflows_enabled === 'string' ? JSON.parse(row.workflows_enabled) : row.workflows_enabled || [],
    integrations_connected: typeof row.integrations_connected === 'string' ? JSON.parse(row.integrations_connected) : row.integrations_connected || [],
    customizations: typeof row.customizations === 'string' ? JSON.parse(row.customizations) : row.customizations || {},
    compliance_configured: !!row.compliance_configured,
  };
}

// ══════════════════════════════════════════════════════
// SCHEMA
// ══════════════════════════════════════════════════════

export const VERTICALS_SCHEMA = `
-- Installed industry vertical packs
CREATE TABLE IF NOT EXISTS installed_packs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  vertical TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'installed',
  installed_at TEXT NOT NULL,
  employees_activated TEXT DEFAULT '[]',
  workflows_enabled TEXT DEFAULT '[]',
  compliance_configured INTEGER DEFAULT 0,
  integrations_connected TEXT DEFAULT '[]',
  customizations TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_packs_org ON installed_packs(org_id);
CREATE INDEX IF NOT EXISTS idx_packs_vertical ON installed_packs(vertical);

-- Marketplace community listings
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  vertical TEXT NOT NULL,
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  downloads INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  price_monthly REAL DEFAULT 0,
  employees_count INTEGER DEFAULT 0,
  workflows_count INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_marketplace_vertical ON marketplace_listings(vertical);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads ON marketplace_listings(downloads DESC);
`;

// ══════════════════════════════════════════════════════
// REQUEST HANDLER
// ══════════════════════════════════════════════════════

export async function handleVerticals(
  request: Request, env: any, userId: string, path: string
): Promise<Response> {
  const marketplace = new VerticalMarketplace(env);
  const sub = path.replace('/api/verticals/', '');
  const method = request.method;

  try {
    // List all vertical packs
    if (sub === 'packs' && method === 'GET') {
      return json({ packs: marketplace.listPacks() });
    }

    // Get specific pack
    if (sub.match(/^packs\/[a-z_]+$/) && method === 'GET') {
      const verticalId = sub.split('/')[1] as VerticalId;
      const pack = marketplace.getPack(verticalId);
      if (!pack) return json({ error: 'Pack not found' }, 404);
      return json({ pack });
    }

    // Get pack employees
    if (sub.match(/^packs\/[a-z_]+\/employees$/) && method === 'GET') {
      const verticalId = sub.split('/')[1] as VerticalId;
      const tier = new URL(request.url).searchParams.get('tier') as EmployeeTier | undefined;
      return json({ employees: marketplace.getPackEmployees(verticalId, tier || undefined) });
    }

    // Get pack workflows
    if (sub.match(/^packs\/[a-z_]+\/workflows$/) && method === 'GET') {
      const verticalId = sub.split('/')[1] as VerticalId;
      return json({ workflows: marketplace.getPackWorkflows(verticalId) });
    }

    // Get pack compliance
    if (sub.match(/^packs\/[a-z_]+\/compliance$/) && method === 'GET') {
      const verticalId = sub.split('/')[1] as VerticalId;
      return json({ compliance: marketplace.getPackCompliance(verticalId) });
    }

    // Search employees across all packs
    if (sub === 'search' && method === 'GET') {
      const q = new URL(request.url).searchParams.get('q') || '';
      return json({ results: marketplace.searchEmployees(q) });
    }

    // Install pack for org
    if (sub === 'install' && method === 'POST') {
      const body = await request.json() as any;
      const installed = await marketplace.installPack(body.org_id, body.vertical, body.config);
      return json({ installed });
    }

    // Get installed packs for org
    if (sub === 'installed' && method === 'GET') {
      const orgId = new URL(request.url).searchParams.get('org_id') || '';
      return json({ installed: await marketplace.getInstalledPacks(orgId) });
    }

    // Uninstall pack
    if (sub === 'uninstall' && method === 'POST') {
      const body = await request.json() as any;
      await marketplace.uninstallPack(body.org_id, body.vertical);
      return json({ success: true });
    }

    // Customize pack
    if (sub === 'customize' && method === 'POST') {
      const body = await request.json() as any;
      await marketplace.customizePack(body.org_id, body.vertical, body.customizations);
      return json({ success: true });
    }

    // Marketplace listings
    if (sub === 'marketplace' && method === 'GET') {
      const url = new URL(request.url);
      const listings = await marketplace.getMarketplaceListings({
        vertical: url.searchParams.get('vertical') || undefined,
        verified: url.searchParams.get('verified') === 'true' ? true : undefined,
        sort: url.searchParams.get('sort') || undefined,
      });
      return json({ listings });
    }

    // Expansion strategy
    if (sub === 'strategy') {
      return json(marketplace.getExpansionStrategy());
    }

    return json({ error: 'Not Found' }, 404);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
