/**
 * Guardrails Route — API endpoints for prompt safety, PII detection,
 * content safety, and hallucination checks.
 */
import type { Env } from '../index';
import { json, generateId, parseBody } from '../lib/helpers';
import { runInputGuardrails, runOutputGuardrails, detectPromptInjection, detectAndRedactPII, checkContentSafety, checkForHallucinations } from '../lib/guardrails';

export async function handleGuardrails(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  // Full input guardrail pipeline
  if (path === '/api/guardrails/input' && request.method === 'POST') {
    const { message } = await parseBody<{ message: string }>(request);
    if (!message) return json({ error: 'message is required' }, 400);

    const result = runInputGuardrails(message);

    // Log blocked attempts
    if (result.blocked) {
      await env.DB.prepare(
        'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        generateId('aud'), userId, 'guardrail_block', userId, 'input',
        `Type: ${result.injection.type}, Confidence: ${result.injection.confidence.toFixed(2)}, Reason: ${result.blockReason}`
      ).run();
    }

    return json({ success: true, data: result });
  }

  // Full output guardrail pipeline
  if (path === '/api/guardrails/output' && request.method === 'POST') {
    const { response } = await parseBody<{ response: string }>(request);
    if (!response) return json({ error: 'response is required' }, 400);

    const result = runOutputGuardrails(response);
    return json({ success: true, data: result });
  }

  // Individual checks
  if (path === '/api/guardrails/injection' && request.method === 'POST') {
    const { message } = await parseBody<{ message: string }>(request);
    if (!message) return json({ error: 'message is required' }, 400);
    return json({ success: true, data: detectPromptInjection(message) });
  }

  if (path === '/api/guardrails/pii' && request.method === 'POST') {
    const { text, mode } = await parseBody<{ text: string; mode?: 'detect' | 'redact' }>(request);
    if (!text) return json({ error: 'text is required' }, 400);
    return json({ success: true, data: detectAndRedactPII(text, mode || 'redact') });
  }

  if (path === '/api/guardrails/safety' && request.method === 'POST') {
    const { text } = await parseBody<{ text: string }>(request);
    if (!text) return json({ error: 'text is required' }, 400);
    return json({ success: true, data: checkContentSafety(text) });
  }

  if (path === '/api/guardrails/hallucination' && request.method === 'POST') {
    const { text } = await parseBody<{ text: string }>(request);
    if (!text) return json({ error: 'text is required' }, 400);
    return json({ success: true, data: checkForHallucinations(text) });
  }

  return json({ error: 'Not found' }, 404);
}
