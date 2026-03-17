/**
 * Frontend Guardrails — Local prompt injection detection, PII redaction,
 * content safety, and hallucination checks.
 *
 * Pattern-based fallback that runs in the browser when Worker is unavailable.
 * Mirrors the Worker guardrails engine with the same API surface.
 */

// ══════════════════════════════════════════════════════
// 1. PROMPT INJECTION DETECTION
// ══════════════════════════════════════════════════════

export interface InjectionResult {
  isInjection: boolean;
  confidence: number;
  type: string;
  sanitizedInput: string;
}

const INJECTION_PATTERNS: Array<{ pattern: RegExp; type: string; severity: number }> = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/i, type: 'system_override', severity: 0.95 },
  { pattern: /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|programming)/i, type: 'system_override', severity: 0.95 },
  { pattern: /forget\s+(everything|all)\s+(you\s+)?(were\s+)?(told|instructed)/i, type: 'system_override', severity: 0.95 },
  { pattern: /you\s+are\s+now\s+(a|an|the)\s+/i, type: 'identity_override', severity: 0.90 },
  { pattern: /pretend\s+(you\s+are|to\s+be|you're)\s+/i, type: 'identity_override', severity: 0.85 },
  { pattern: /new\s+instructions?:?\s/i, type: 'system_override', severity: 0.90 },
  { pattern: /\[system\]|\[INST\]|<<SYS>>/i, type: 'role_injection', severity: 0.90 },
  { pattern: /###\s*(system|instruction|human|assistant)\s*:/i, type: 'role_injection', severity: 0.90 },
  { pattern: /DAN\s*(mode|prompt)/i, type: 'jailbreak', severity: 0.95 },
  { pattern: /developer\s+mode\s+(enabled|activated)/i, type: 'jailbreak', severity: 0.90 },
  { pattern: /bypass\s+(your\s+)?(safety|filter|guardrail|restriction)/i, type: 'jailbreak', severity: 0.90 },
  { pattern: /reveal\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?)/i, type: 'exfiltration', severity: 0.90 },
  { pattern: /repeat\s+(your|the)\s+(system|initial)\s+(prompt|instructions?)/i, type: 'exfiltration', severity: 0.90 },
  { pattern: /<\/?script/i, type: 'xss_attempt', severity: 0.85 },
  { pattern: /javascript\s*:/i, type: 'xss_attempt', severity: 0.85 },
];

export function detectPromptInjection(input: string): InjectionResult {
  let maxSeverity = 0;
  let detectedType = 'none';

  for (const { pattern, type, severity } of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      if (severity > maxSeverity) {
        maxSeverity = severity;
        detectedType = type;
      }
    }
  }

  // Heuristic: authority language
  if (/^\s*(you must|important|critical|override|attention)\s*:/im.test(input)) {
    maxSeverity = Math.max(maxSeverity, 0.3);
    if (detectedType === 'none') detectedType = 'heuristic';
  }

  const isInjection = maxSeverity > 0.6;
  let sanitizedInput = input;

  if (isInjection) {
    sanitizedInput = input
      .replace(/\[system\]|\[INST\]|<<SYS>>|###\s*(system|instruction)\s*:/gi, '[filtered]')
      .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|rules?)/gi, '[filtered]')
      .replace(/you\s+are\s+now\s+(a|an|the)\s+\w+/gi, '[filtered]')
      .replace(/<\/?script[^>]*>/gi, '[filtered]')
      .trim();
  }

  return { isInjection, confidence: maxSeverity, type: detectedType, sanitizedInput };
}

// ══════════════════════════════════════════════════════
// 2. PII DETECTION & REDACTION
// ══════════════════════════════════════════════════════

export interface PIIResult {
  hasPII: boolean;
  detections: Array<{ type: string; redacted: string }>;
  redactedText: string;
}

export function detectAndRedactPII(text: string): PIIResult {
  const detections: PIIResult['detections'] = [];
  let redacted = text;

  // SSN
  const ssnPattern = /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g;
  if (ssnPattern.test(text)) {
    detections.push({ type: 'ssn', redacted: '[SSN REDACTED]' });
    redacted = redacted.replace(ssnPattern, '[SSN REDACTED]');
  }

  // Credit cards
  const ccPattern = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g;
  const ccMatches = redacted.match(ccPattern);
  if (ccMatches) {
    ccMatches.forEach(m => {
      detections.push({ type: 'credit_card', redacted: `[CC ...${m.slice(-4)}]` });
      redacted = redacted.replace(m, `[CC ...${m.slice(-4)}]`);
    });
  }

  // Emails
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = redacted.match(emailPattern);
  if (emailMatches) {
    emailMatches.forEach(m => {
      const [local, domain] = m.split('@');
      const masked = `${local[0]}***@${domain}`;
      detections.push({ type: 'email', redacted: masked });
      redacted = redacted.replace(m, masked);
    });
  }

  // Phone numbers
  const phonePattern = /\b(?:\+?1[-.]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g;
  const phoneMatches = redacted.match(phonePattern);
  if (phoneMatches) {
    phoneMatches.forEach(m => {
      if (m.replace(/\D/g, '').length >= 10) {
        detections.push({ type: 'phone', redacted: `[PHONE ...${m.slice(-4)}]` });
        redacted = redacted.replace(m, `[PHONE ...${m.slice(-4)}]`);
      }
    });
  }

  // API keys
  const apiKeyPattern = /\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|xoxb-[a-zA-Z0-9-]+)\b/g;
  const keyMatches = redacted.match(apiKeyPattern);
  if (keyMatches) {
    keyMatches.forEach(m => {
      detections.push({ type: 'api_key', redacted: `[KEY ...${m.slice(-4)}]` });
      redacted = redacted.replace(m, `[KEY ...${m.slice(-4)}]`);
    });
  }

  return { hasPII: detections.length > 0, detections, redactedText: redacted };
}

// ══════════════════════════════════════════════════════
// 3. CONTENT SAFETY CHECK
// ══════════════════════════════════════════════════════

export interface SafetyResult {
  isSafe: boolean;
  flags: string[];
}

export function checkContentSafety(text: string): SafetyResult {
  const flags: string[] = [];

  if (/how\s+to\s+(hack|exploit|break\s+into|ddos|phish)/i.test(text)) flags.push('harmful_instructions');
  if (/create\s+(a\s+)?(malware|virus|trojan|ransomware)/i.test(text)) flags.push('harmful_instructions');
  if (/dump\s+(all|the)\s+(database|data|passwords?)/i.test(text)) flags.push('data_exfiltration');
  if (/bypass\s+(authentication|authorization|access\s+control|mfa)/i.test(text)) flags.push('unauthorized_access');
  if (/impersonate\s+(a|the)\s+(employee|admin|executive)/i.test(text)) flags.push('social_engineering');

  return { isSafe: flags.length === 0, flags };
}

// ══════════════════════════════════════════════════════
// 4. HALLUCINATION DETECTION (on AI output)
// ══════════════════════════════════════════════════════

export interface HallucinationResult {
  risk: 'low' | 'medium' | 'high';
  flags: string[];
}

export function checkHallucinations(response: string): HallucinationResult {
  const flags: string[] = [];

  if (/studies?\s+show|research\s+(shows?|indicates?|proves?)/i.test(response)) {
    flags.push('Cites research — verify source');
  }
  if (/according\s+to\s+(a\s+)?(recent\s+)?(study|survey|report)/i.test(response)) {
    flags.push('References specific study');
  }
  if (/\b\d{1,3}(\.\d+)?%\s+of\s+(companies?|users?|people|customers?)/i.test(response)) {
    flags.push('Specific statistic — verify');
  }
  if (/"[^"]{20,}"\s*[-—]\s*[A-Z][a-z]+\s+[A-Z][a-z]+/.test(response)) {
    flags.push('Attributed quote — verify');
  }
  if (/\$\d+(\.\d+)?\s*(million|billion|M|B)\s+(in\s+)?(revenue|funding)/i.test(response)) {
    flags.push('Specific financial figure — verify');
  }

  let risk: HallucinationResult['risk'] = 'low';
  if (flags.length >= 3) risk = 'high';
  else if (flags.length >= 1) risk = 'medium';

  return { risk, flags };
}

// ══════════════════════════════════════════════════════
// 5. COMBINED PIPELINE
// ══════════════════════════════════════════════════════

export interface InputGuardResult {
  blocked: boolean;
  blockReason?: string;
  sanitizedMessage: string;
  injection: InjectionResult;
  pii: PIIResult;
  safety: SafetyResult;
}

export interface OutputGuardResult {
  cleanedResponse: string;
  warnings: string[];
  pii: PIIResult;
  hallucination: HallucinationResult;
}

export function runInputGuardrails(message: string): InputGuardResult {
  const injection = detectPromptInjection(message);
  const pii = detectAndRedactPII(message);
  const safety = checkContentSafety(message);

  let blocked = false;
  let blockReason: string | undefined;

  if (injection.isInjection && injection.confidence > 0.85) {
    blocked = true;
    blockReason = `Prompt injection detected (${injection.type}). Your message has been filtered for safety.`;
  }
  if (!safety.isSafe && safety.flags.includes('harmful_instructions')) {
    blocked = true;
    blockReason = 'This request cannot be processed due to safety concerns.';
  }

  return {
    blocked,
    blockReason,
    sanitizedMessage: injection.isInjection ? injection.sanitizedInput : message,
    injection,
    pii,
    safety,
  };
}

export function runOutputGuardrails(response: string): OutputGuardResult {
  const pii = detectAndRedactPII(response);
  const hallucination = checkHallucinations(pii.redactedText);
  const warnings: string[] = [];

  if (pii.hasPII) {
    warnings.push(`PII detected and redacted: ${pii.detections.map(d => d.type).join(', ')}`);
  }
  if (hallucination.risk !== 'low') {
    warnings.push(`Potential hallucination: ${hallucination.flags.slice(0, 2).join('; ')}`);
  }

  return { cleanedResponse: pii.redactedText, warnings, pii, hallucination };
}
