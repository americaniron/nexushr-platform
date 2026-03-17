/**
 * Guardrails Engine — Prompt injection detection, PII redaction,
 * content safety filters, and hallucination prevention.
 *
 * Runs on both Worker (LLM-enhanced) and frontend (pattern-based fallback).
 */

// ══════════════════════════════════════════════════════
// 1. PROMPT INJECTION DETECTION & MITIGATION
// ══════════════════════════════════════════════════════

export interface InjectionResult {
  isInjection: boolean;
  confidence: number;
  type: string;
  details: string;
  sanitizedInput: string;
}

// Known injection patterns (compiled once)
const INJECTION_PATTERNS: Array<{ pattern: RegExp; type: string; severity: number }> = [
  // Direct system prompt overrides
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|directives?)/i, type: 'system_override', severity: 0.95 },
  { pattern: /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|programming|rules?)/i, type: 'system_override', severity: 0.95 },
  { pattern: /forget\s+(everything|all|your)\s+(you\s+)?(were\s+)?(told|instructed|programmed)/i, type: 'system_override', severity: 0.95 },
  { pattern: /you\s+are\s+now\s+(a|an|the)\s+/i, type: 'identity_override', severity: 0.90 },
  { pattern: /pretend\s+(you\s+are|to\s+be|you're)\s+/i, type: 'identity_override', severity: 0.85 },
  { pattern: /act\s+as\s+(if\s+)?(you\s+)?(are|were)\s+/i, type: 'identity_override', severity: 0.80 },
  { pattern: /new\s+instructions?:?\s/i, type: 'system_override', severity: 0.90 },
  { pattern: /system\s*:\s*/i, type: 'role_injection', severity: 0.85 },
  { pattern: /\[system\]/i, type: 'role_injection', severity: 0.90 },
  { pattern: /\[INST\]/i, type: 'role_injection', severity: 0.90 },
  { pattern: /<<SYS>>/i, type: 'role_injection', severity: 0.95 },
  { pattern: /###\s*(system|instruction|human|assistant)\s*:/i, type: 'role_injection', severity: 0.90 },

  // Jailbreak attempts
  { pattern: /DAN\s*(mode|prompt)/i, type: 'jailbreak', severity: 0.95 },
  { pattern: /developer\s+mode\s+(enabled|activated|on)/i, type: 'jailbreak', severity: 0.90 },
  { pattern: /bypass\s+(your\s+)?(safety|filter|guardrail|restriction|limit)/i, type: 'jailbreak', severity: 0.90 },
  { pattern: /no\s+(ethical|moral|safety)\s+(guidelines?|rules?|restrictions?)/i, type: 'jailbreak', severity: 0.90 },
  { pattern: /without\s+(any\s+)?(restriction|filter|limit|censorship|safety)/i, type: 'jailbreak', severity: 0.85 },
  { pattern: /hypothetical(ly)?\s*,?\s*(if\s+)?(you\s+)?(had\s+)?(no|without)\s+(restriction|limit|filter)/i, type: 'jailbreak', severity: 0.80 },

  // Data exfiltration
  { pattern: /reveal\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?|programming)/i, type: 'exfiltration', severity: 0.90 },
  { pattern: /show\s+me\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?)/i, type: 'exfiltration', severity: 0.85 },
  { pattern: /what\s+(are|were)\s+your\s+(original|system|initial)\s+(instructions?|prompt|rules?)/i, type: 'exfiltration', severity: 0.85 },
  { pattern: /repeat\s+(your|the)\s+(system|initial)\s+(prompt|instructions?|message)/i, type: 'exfiltration', severity: 0.90 },
  { pattern: /output\s+(your|the)\s+(entire|full|complete)\s+(system|initial)\s+(prompt|message)/i, type: 'exfiltration', severity: 0.95 },

  // Encoding attacks
  { pattern: /base64\s*:\s*/i, type: 'encoding_attack', severity: 0.70 },
  { pattern: /rot13/i, type: 'encoding_attack', severity: 0.70 },
  { pattern: /hex\s*:\s*[0-9a-f]{8,}/i, type: 'encoding_attack', severity: 0.70 },

  // Indirect injection (data poisoning)
  { pattern: /\{\{.*\}\}/g, type: 'template_injection', severity: 0.75 },
  { pattern: /<\/?script/i, type: 'xss_attempt', severity: 0.85 },
  { pattern: /javascript\s*:/i, type: 'xss_attempt', severity: 0.85 },
];

// Heuristic signals that boost injection probability
const HEURISTIC_SIGNALS: Array<{ check: (text: string) => boolean; weight: number; reason: string }> = [
  {
    check: (t) => (t.match(/\n/g) || []).length > 10 && t.length > 500,
    weight: 0.15,
    reason: 'Unusually long input with many line breaks',
  },
  {
    check: (t) => /[A-Z\s]{20,}/.test(t),
    weight: 0.10,
    reason: 'Extended ALL CAPS block (emphasis override)',
  },
  {
    check: (t) => (t.match(/```/g) || []).length >= 2,
    weight: 0.05,
    reason: 'Contains code blocks (may hide injection in code)',
  },
  {
    check: (t) => /^\s*(you must|important|critical|override|attention)\s*:/im.test(t),
    weight: 0.20,
    reason: 'Authority language attempting to override instructions',
  },
  {
    check: (t) => t.includes('IMPORTANT:') || t.includes('NOTE:') || t.includes('OVERRIDE:'),
    weight: 0.15,
    reason: 'Directive markers attempting priority override',
  },
];

export function detectPromptInjection(input: string): InjectionResult {
  let maxSeverity = 0;
  let detectedType = 'none';
  let details = '';

  // Check against known patterns
  for (const { pattern, type, severity } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      if (severity > maxSeverity) {
        maxSeverity = severity;
        detectedType = type;
        details = `Matched pattern: ${type}`;
      }
    }
  }

  // Apply heuristic signals
  let heuristicScore = 0;
  const heuristicReasons: string[] = [];
  for (const signal of HEURISTIC_SIGNALS) {
    if (signal.check(input)) {
      heuristicScore += signal.weight;
      heuristicReasons.push(signal.reason);
    }
  }

  // Combine pattern + heuristic scores
  const confidence = Math.min(1, maxSeverity + heuristicScore * 0.5);

  if (confidence > 0.5 && detectedType === 'none') {
    detectedType = 'heuristic';
    details = `Heuristic signals: ${heuristicReasons.join('; ')}`;
  }

  // Sanitize input if injection detected
  let sanitizedInput = input;
  if (confidence > 0.5) {
    sanitizedInput = sanitizeInjection(input);
  }

  return {
    isInjection: confidence > 0.6,
    confidence,
    type: detectedType,
    details: details || 'No injection detected',
    sanitizedInput,
  };
}

function sanitizeInjection(input: string): string {
  let sanitized = input;

  // Remove system/role markers
  sanitized = sanitized.replace(/\[system\]|\[INST\]|<<SYS>>|###\s*(system|instruction|human|assistant)\s*:/gi, '[filtered]');

  // Remove override commands
  sanitized = sanitized.replace(/ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi, '[override attempt removed]');
  sanitized = sanitized.replace(/disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|programming)/gi, '[override attempt removed]');
  sanitized = sanitized.replace(/forget\s+(everything|all)\s+(you\s+)?(were\s+)?(told|instructed)/gi, '[override attempt removed]');

  // Remove identity overrides
  sanitized = sanitized.replace(/you\s+are\s+now\s+(a|an|the)\s+\w+/gi, '[identity override removed]');

  // Remove template injection
  sanitized = sanitized.replace(/\{\{.*?\}\}/g, '[template removed]');

  // Remove script tags
  sanitized = sanitized.replace(/<\/?script[^>]*>/gi, '[script removed]');

  return sanitized.trim();
}

// ══════════════════════════════════════════════════════
// 2. PII DETECTION & REDACTION
// ══════════════════════════════════════════════════════

export interface PIIResult {
  hasPII: boolean;
  detections: Array<{ type: string; value: string; redacted: string; position: number }>;
  redactedText: string;
  riskLevel: 'none' | 'low' | 'medium' | 'high';
}

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; risk: 'low' | 'medium' | 'high'; redact: (match: string) => string }> = [
  // SSN
  {
    name: 'ssn',
    pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
    risk: 'high',
    redact: () => '[SSN REDACTED]',
  },
  // Credit card numbers (basic Luhn-compatible patterns)
  {
    name: 'credit_card',
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    risk: 'high',
    redact: (m) => `[CC ...${m.slice(-4)}]`,
  },
  // Email addresses
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    risk: 'medium',
    redact: (m) => {
      const [local, domain] = m.split('@');
      return `${local[0]}***@${domain}`;
    },
  },
  // Phone numbers (US + international)
  {
    name: 'phone',
    pattern: /\b(?:\+?1[-.]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    risk: 'medium',
    redact: (m) => `[PHONE ...${m.slice(-4)}]`,
  },
  // IP addresses
  {
    name: 'ip_address',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    risk: 'low',
    redact: () => '[IP REDACTED]',
  },
  // Date of birth patterns
  {
    name: 'dob',
    pattern: /\b(?:date\s+of\s+birth|dob|born\s+on)\s*:?\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/gi,
    risk: 'high',
    redact: () => '[DOB REDACTED]',
  },
  // API keys / tokens (common patterns)
  {
    name: 'api_key',
    pattern: /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|xoxb-[a-zA-Z0-9-]+|AIza[a-zA-Z0-9_-]{35})\b/g,
    risk: 'high',
    redact: (m) => `[API_KEY ...${m.slice(-4)}]`,
  },
  // AWS access keys
  {
    name: 'aws_key',
    pattern: /\b(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}\b/g,
    risk: 'high',
    redact: () => '[AWS_KEY REDACTED]',
  },
  // Passport numbers
  {
    name: 'passport',
    pattern: /\b(?:passport\s*(?:no|number|#)\s*:?\s*)[A-Z0-9]{6,9}\b/gi,
    risk: 'high',
    redact: () => '[PASSPORT REDACTED]',
  },
  // Bank account / routing numbers
  {
    name: 'bank_account',
    pattern: /\b(?:account|routing)\s*(?:no|number|#)\s*:?\s*\d{8,17}\b/gi,
    risk: 'high',
    redact: () => '[BANK_ACCOUNT REDACTED]',
  },
];

export function detectAndRedactPII(text: string, mode: 'detect' | 'redact' = 'redact'): PIIResult {
  const detections: PIIResult['detections'] = [];
  let redactedText = text;
  let highestRisk: PIIResult['riskLevel'] = 'none';

  const riskOrder = { none: 0, low: 1, medium: 2, high: 3 };

  for (const piiPattern of PII_PATTERNS) {
    const matches = text.matchAll(piiPattern.pattern);
    for (const match of matches) {
      if (!match[0] || match.index === undefined) continue;

      // Avoid false positives: skip very short matches and common non-PII patterns
      if (piiPattern.name === 'phone' && match[0].replace(/\D/g, '').length < 10) continue;
      if (piiPattern.name === 'ssn') {
        const digits = match[0].replace(/\D/g, '');
        // Avoid false positives with common number patterns
        if (digits === '000000000' || digits === '123456789') continue;
      }

      const redacted = piiPattern.redact(match[0]);
      detections.push({
        type: piiPattern.name,
        value: match[0],
        redacted,
        position: match.index,
      });

      if (riskOrder[piiPattern.risk] > riskOrder[highestRisk]) {
        highestRisk = piiPattern.risk;
      }

      if (mode === 'redact') {
        redactedText = redactedText.replace(match[0], redacted);
      }
    }
  }

  return {
    hasPII: detections.length > 0,
    detections,
    redactedText: mode === 'redact' ? redactedText : text,
    riskLevel: highestRisk,
  };
}

// ══════════════════════════════════════════════════════
// 3. CONTENT SAFETY FILTERS
// ══════════════════════════════════════════════════════

export interface ContentSafetyResult {
  isSafe: boolean;
  flags: Array<{ category: string; severity: 'low' | 'medium' | 'high'; snippet: string }>;
  overallRisk: 'safe' | 'caution' | 'unsafe';
}

const SAFETY_CATEGORIES: Array<{ name: string; patterns: RegExp[]; severity: 'low' | 'medium' | 'high' }> = [
  {
    name: 'harmful_instructions',
    patterns: [
      /how\s+to\s+(hack|exploit|break\s+into|ddos|phish)/i,
      /create\s+(a\s+)?(malware|virus|trojan|ransomware|keylogger)/i,
      /(?:sql|code)\s+injection\s+(attack|exploit|technique)/i,
    ],
    severity: 'high',
  },
  {
    name: 'data_exfiltration_risk',
    patterns: [
      /dump\s+(all|the)\s+(database|data|records|users?|passwords?)/i,
      /extract\s+(all|every)\s+(customer|user|employee)\s+(data|records?|info)/i,
      /export\s+all\s+(credentials?|passwords?|secrets?|keys?)/i,
    ],
    severity: 'high',
  },
  {
    name: 'social_engineering',
    patterns: [
      /pretend\s+to\s+be\s+(the\s+)?(ceo|admin|manager|executive)/i,
      /impersonate\s+(a|the|an)\s+(employee|admin|executive|manager)/i,
      /send\s+(as|from)\s+(the\s+)?(ceo|admin|boss)/i,
    ],
    severity: 'medium',
  },
  {
    name: 'unauthorized_access',
    patterns: [
      /bypass\s+(authentication|authorization|access\s+control|login|mfa|2fa)/i,
      /escalate\s+(my\s+)?privileges?/i,
      /access\s+(admin|root|superuser|sudo)\s+(panel|account|privileges?)/i,
    ],
    severity: 'high',
  },
  {
    name: 'bias_risk',
    patterns: [
      /(?:discriminate|filter)\s+(?:by|based\s+on)\s+(race|gender|age|religion|ethnicity|disability)/i,
      /exclude\s+(candidates?|people|applicants?)\s+(who|that)\s+(are|have)\s/i,
    ],
    severity: 'medium',
  },
];

export function checkContentSafety(text: string): ContentSafetyResult {
  const flags: ContentSafetyResult['flags'] = [];

  for (const category of SAFETY_CATEGORIES) {
    for (const pattern of category.patterns) {
      const match = text.match(pattern);
      if (match) {
        flags.push({
          category: category.name,
          severity: category.severity,
          snippet: match[0].slice(0, 50),
        });
        break; // One flag per category is enough
      }
    }
  }

  const hasHigh = flags.some(f => f.severity === 'high');
  const hasMedium = flags.some(f => f.severity === 'medium');

  return {
    isSafe: flags.length === 0,
    flags,
    overallRisk: hasHigh ? 'unsafe' : hasMedium ? 'caution' : 'safe',
  };
}

// ══════════════════════════════════════════════════════
// 4. HALLUCINATION PREVENTION & DETECTION
// ══════════════════════════════════════════════════════

export interface HallucinationCheck {
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
  mitigations: string[];
}

const HALLUCINATION_INDICATORS: Array<{ pattern: RegExp; flag: string; risk: 'medium' | 'high' }> = [
  // Fabricated statistics
  { pattern: /\b(studies?\s+show|research\s+(shows?|indicates?|proves?|suggests?))\b/i, flag: 'Cites research — verify source exists', risk: 'medium' },
  { pattern: /\b(according\s+to\s+(a\s+)?(recent\s+)?(study|survey|report|analysis))\b/i, flag: 'References specific study — verify citation', risk: 'medium' },
  { pattern: /\b\d{1,3}(\.\d+)?%\s+(of\s+)?(companies?|businesses?|organizations?|users?|people|customers?)\b/i, flag: 'Specific statistic — verify data source', risk: 'medium' },

  // Fabricated quotes
  { pattern: /"[^"]{20,}"\s*[-—]\s*[A-Z][a-z]+\s+[A-Z][a-z]+/g, flag: 'Attributed quote — verify authenticity', risk: 'high' },

  // Fabricated URLs
  { pattern: /https?:\/\/[a-z0-9.-]+\.[a-z]{2,}\/([\w/-]+){3,}/gi, flag: 'Specific URL — verify it exists', risk: 'medium' },

  // Exact revenue/funding claims
  { pattern: /\$\d+(\.\d+)?\s*(million|billion|M|B|k)\s+(in\s+)?(revenue|funding|ARR|MRR|valuation)/i, flag: 'Specific financial figure — verify from public source', risk: 'high' },

  // Claims about named companies
  { pattern: /(Google|Apple|Microsoft|Amazon|Meta|Netflix|Salesforce|HubSpot)\s+(recently\s+)?(launched|released|announced|introduced)/i, flag: 'Company announcement — verify recency and accuracy', risk: 'medium' },
];

export function checkForHallucinations(response: string): HallucinationCheck {
  const flags: string[] = [];
  let highestRisk: 'low' | 'medium' | 'high' = 'low';
  const riskOrder = { low: 0, medium: 1, high: 2 };

  for (const indicator of HALLUCINATION_INDICATORS) {
    if (indicator.pattern.test(response)) {
      flags.push(indicator.flag);
      if (riskOrder[indicator.risk] > riskOrder[highestRisk]) {
        highestRisk = indicator.risk;
      }
    }
  }

  const mitigations: string[] = [];
  if (flags.length > 0) {
    mitigations.push('Verify all cited statistics and sources before sharing');
    if (highestRisk === 'high') {
      mitigations.push('Consider adding disclaimers: "Based on my analysis" or "Estimated figures"');
      mitigations.push('Cross-reference claims with reliable data sources');
    }
  }

  return { riskLevel: highestRisk, flags, mitigations };
}

// ══════════════════════════════════════════════════════
// 5. COMBINED GUARDRAILS PIPELINE
// ══════════════════════════════════════════════════════

export interface GuardrailsResult {
  input: {
    injection: InjectionResult;
    pii: PIIResult;
    safety: ContentSafetyResult;
    sanitizedMessage: string;
    blocked: boolean;
    blockReason?: string;
  };
  output: {
    pii: PIIResult;
    hallucination: HallucinationCheck;
    safety: ContentSafetyResult;
    cleanedResponse: string;
    warnings: string[];
  };
}

export function runInputGuardrails(userMessage: string): GuardrailsResult['input'] {
  // 1. Prompt injection check
  const injection = detectPromptInjection(userMessage);

  // 2. PII detection (detect-only for input, don't redact user's own message)
  const pii = detectAndRedactPII(userMessage, 'detect');

  // 3. Content safety check
  const safety = checkContentSafety(userMessage);

  // Determine if message should be blocked
  let blocked = false;
  let blockReason: string | undefined;

  if (injection.isInjection && injection.confidence > 0.85) {
    blocked = true;
    blockReason = `Prompt injection detected (${injection.type}). Your message has been filtered for safety.`;
  }

  if (safety.overallRisk === 'unsafe') {
    blocked = true;
    blockReason = `Content safety concern detected (${safety.flags.map(f => f.category).join(', ')}). This request cannot be processed.`;
  }

  // Use sanitized message if injection detected but not blocked
  const sanitizedMessage = injection.isInjection ? injection.sanitizedInput : userMessage;

  return { injection, pii, safety, sanitizedMessage, blocked, blockReason };
}

export function runOutputGuardrails(aiResponse: string): GuardrailsResult['output'] {
  // 1. PII redaction (actively redact in output)
  const pii = detectAndRedactPII(aiResponse, 'redact');

  // 2. Hallucination check
  const hallucination = checkForHallucinations(aiResponse);

  // 3. Content safety check on output
  const safety = checkContentSafety(aiResponse);

  const warnings: string[] = [];

  if (pii.hasPII) {
    warnings.push(`⚠️ PII detected and redacted: ${pii.detections.map(d => d.type).join(', ')}`);
  }

  if (hallucination.riskLevel !== 'low') {
    warnings.push(`ℹ️ Potential hallucination risk: ${hallucination.flags.slice(0, 2).join('; ')}`);
  }

  if (!safety.isSafe) {
    warnings.push(`⚠️ Content safety flag: ${safety.flags.map(f => f.category).join(', ')}`);
  }

  return {
    pii,
    hallucination,
    safety,
    cleanedResponse: pii.redactedText,
    warnings,
  };
}
