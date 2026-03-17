/**
 * NexusHR AI Platform — Cloudflare Worker API
 *
 * Features:
 * 1. LLM API Proxy (Claude, GPT-4) with role-specific system prompts
 * 2. Tool-Use Capabilities (code sandbox, email, CRM calls)
 * 3. Integration Marketplace with OAuth connectors
 * 4. WebRTC Voice/Video signaling + TTS/STT proxy
 * 5. Multi-Agent Collaboration Engine
 * 6. NLU Engine (LLM intent classification, sentiment, RAG, state machine)
 * 7. Billing & Payment (Stripe, usage metering, dunning, multi-currency)
 * 8. Trial & Conversion (server-side trials, abuse detection, email drip, A/B testing)
 * 9. User Preferences (theme, locale, notifications sync)
 * 10. Admin V2 (RBAC, impersonation, alerting, fleet config, AI employee mgmt, health)
 * 11. Database Layer (normalized schema, migrations, RLS, encryption, backups)
 * 12. Security (JWT auth, PBKDF2 hashing, CSRF, security headers, API keys, E2E encryption)
 * 13. Scalability (multi-tenant, caching, task queue, WebSocket, CDN, auto-scaling, multi-region)
 * 14. Business Model (pricing engine, unit economics, expansion playbook, enterprise sales, partners, break-even)
 * 15. AI Core (conversational AI, task execution, document processing, voice/video, learning)
 * 16. External Integrations (email, CRM, calendar, Slack connectors)
 * 17. Platform (notifications, search, settings, help center, i18n, a11y, onboarding, data import/export, API docs, PWA)
 * 18. Training Datasets (role personas, conversations, workflows, policies, tone guidelines, fine-tuning pipeline)
 * 19. Real-Time Voice AI (STT/TTS pipeline, emotional tone, VAD, conversation memory, avatar lip sync, WebRTC)
 * 20. Memory System (short-term/session/long-term memory, retrieval engine, workflow learning, consolidation)
 * 21. Multi-Agent Collaboration (task queues, inter-agent messaging, DAG workflows, delegation, event bus)
 * 22. Enterprise Security (threat detection, audit trail, DLP, rate limiting, IP intelligence, incidents, compliance)
 * 23. Industry Vertical AI Employee Packs (healthcare, legal, real estate, construction, financial services, marketplace)
 * 24. Guided Onboarding System (wizard, industry detection, auto-provisioning, first-task, milestones, re-engagement)
 * 25. Enterprise AI Employee System (33 roles, 10 categories, role template engine, pipeline execution, role extensions)
 * 26. Advanced Pipeline Engine (DAG scheduler, parallel execution, conditional branching, failure recovery, rollback, dead-letter queue)
 * 27. Continuous Learning Engine (performance scoring, feedback loops, prompt calibration, workflow patterns, skill evolution, delegation scoring)
 * 28. Advanced NLP Sentiment Engine (transformer ensemble, context analysis, sarcasm detection, intent classification, conversation trajectory, emotional intelligence)
 * 29. Secure Prompt Engine (isolation layers, context sanitization, system prompt boundaries, versioning, A/B testing, rollback, prompt firewall)
 * 30. Real-Time Avatar Rendering Engine (WebGL/Three.js, RPM, facial animation, lip sync, expressions, gestures, asset pipeline, branding)
 * 31. Enterprise SaaS Frontend App (design system, page registry, component hierarchy, state management, navigation, forms, widgets, themes)
 * 32. Enterprise Security Vault (Argon2id hashing, MFA/TOTP, HSM key hierarchy, AES-256-GCM vault, SSRF guard, webhook verification, OAuth PKCE, code sandbox)
 * 33. Scalable Data Architecture (multi-region fabric, tenant sharding, storage lifecycle, vector DB, analytics warehouse)
 * 34. Real-Time Infrastructure (WebSocket architecture, Durable Objects sessions, TURN cluster, WebRTC scaling, latency optimization)
 * 35. Enterprise Admin Control Center (AI employee monitoring, conversation review, content moderation, system health, usage analytics, security alerts, observability)
 */

import { handleLLM } from './routes/llm';
import { handleTools } from './routes/tools';
import { handleIntegrations } from './routes/integrations';
import { handleVoice } from './routes/voice';
import { handleAgents } from './routes/agents';
import { handleAuth } from './routes/auth';
import { handleAdmin } from './routes/admin';
import { handleEmployees } from './routes/employees';
import { handleNLU } from './routes/nlu';
import { handleGuardrails } from './routes/guardrails';
import { handleOrchestration } from './routes/orchestration';
import { handleBilling } from './routes/billing';
import { handleTrial } from './routes/trial';
import { handlePreferences } from './routes/preferences';
import { handleAdminV2 } from './routes/admin-v2';
import { handleDatabase } from './lib/database';
import { handleSecureAuth, securityHeaders as getSecurityHeaders } from './lib/security';
import { handleScalability } from './lib/scalability';
import { handleBusinessModel } from './lib/business-model';
import { handleAICore } from './lib/ai-core';
import { handleExternalIntegrations } from './lib/integrations';
import { handlePlatform } from './lib/platform';
import { handleTrainingDatasets } from './lib/training-datasets';
import { handleVoiceAI } from './lib/voice-ai';
import { handleMemorySystem } from './lib/memory-system';
import { handleCollaboration } from './lib/collaboration';
import { handleSecurityEnterprise } from './lib/security-enterprise';
import { handleVerticals } from './lib/verticals';
import { handleOnboarding } from './lib/guided-onboarding';
import { handleEnterpriseEmployees } from './lib/enterprise-employees';
import { handlePipelineEngine } from './lib/pipeline-engine';
import { handleLearningEngine } from './lib/learning-engine';
import { handleSentimentEngine } from './lib/sentiment-engine';
import { handlePromptEngine } from './lib/prompt-engine';
import { handleAvatarEngine } from './lib/avatar-engine';
import { handleFrontendApp } from './lib/frontend-app';
import { handleSecurityVault } from './lib/security-vault';
import { handleDataArchitecture } from './lib/data-architecture';
import { handleRealtimeInfrastructure } from './lib/realtime-infrastructure';
import { handleAdminControlCenter } from './lib/admin-control-center';
import { corsHeaders, handleCORS } from './lib/cors';
import { authenticate } from './lib/auth';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  API_KEYS: KVNamespace;
  CACHE: KVNamespace;
  CORS_ORIGIN: string;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check
      if (path === '/api/health') {
        return json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
      }

      // Secure auth V2 routes (no auth required)
      if (path.startsWith('/api/auth/v2/')) {
        return addCors(await handleSecureAuth(request, env, path), env);
      }

      // Legacy auth routes (no auth required)
      if (path.startsWith('/api/auth/')) {
        return addCors(await handleAuth(request, env, path), env);
      }

      // All other routes require authentication
      const authResult = await authenticate(request, env);
      if (!authResult.authenticated) {
        return addCors(json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, 401), env);
      }

      const userId = authResult.userId!;

      // Route to feature handlers
      if (path.startsWith('/api/llm/')) {
        return addCors(await handleLLM(request, env, userId, path), env);
      }
      if (path.startsWith('/api/tools/')) {
        return addCors(await handleTools(request, env, userId, path), env);
      }
      if (path.startsWith('/api/integrations/')) {
        return addCors(await handleIntegrations(request, env, userId, path), env);
      }
      if (path.startsWith('/api/voice/')) {
        return addCors(await handleVoice(request, env, userId, path), env);
      }
      if (path.startsWith('/api/agents/')) {
        return addCors(await handleAgents(request, env, userId, path), env);
      }
      if (path.startsWith('/api/nlu/')) {
        return addCors(await handleNLU(request, env, userId, path), env);
      }
      if (path.startsWith('/api/guardrails/')) {
        return addCors(await handleGuardrails(request, env, userId, path), env);
      }
      if (path.startsWith('/api/orchestration/')) {
        return addCors(await handleOrchestration(request, env, userId, path), env);
      }
      if (path.startsWith('/api/employees/')) {
        return addCors(await handleEmployees(request, env, userId, path), env);
      }
      if (path.startsWith('/api/billing/')) {
        return addCors(await handleBilling(request, env, userId, path), env);
      }
      if (path.startsWith('/api/trial/')) {
        return addCors(await handleTrial(request, env, userId, path), env);
      }
      if (path.startsWith('/api/preferences')) {
        return addCors(await handlePreferences(request, env, userId, path), env);
      }
      if (path.startsWith('/api/database/')) {
        return addCors(await handleDatabase(request, env, userId, path), env);
      }
      if (path.startsWith('/api/scale/')) {
        return addCors(await handleScalability(request, env, userId, path), env);
      }
      if (path.startsWith('/api/business/')) {
        return addCors(await handleBusinessModel(request, env, userId, path), env);
      }
      if (path.startsWith('/api/ai/')) {
        return addCors(await handleAICore(request, env, userId, path), env);
      }
      if (path.startsWith('/api/connect/')) {
        return addCors(await handleExternalIntegrations(request, env, userId, path), env);
      }
      if (path.startsWith('/api/platform/')) {
        return addCors(await handlePlatform(request, env, userId, path), env);
      }
      if (path.startsWith('/api/training/')) {
        return addCors(await handleTrainingDatasets(request, env, userId, path), env);
      }
      if (path.startsWith('/api/voice-ai/')) {
        return addCors(await handleVoiceAI(request, env, userId, path), env);
      }
      if (path.startsWith('/api/memory/')) {
        return addCors(await handleMemorySystem(request, env, userId, path), env);
      }
      if (path.startsWith('/api/collab/')) {
        return addCors(await handleCollaboration(request, env, userId, path), env);
      }
      if (path.startsWith('/api/security/')) {
        return addCors(await handleSecurityEnterprise(request, env, userId, path), env);
      }
      if (path.startsWith('/api/verticals/')) {
        return addCors(await handleVerticals(request, env, userId, path), env);
      }
      if (path.startsWith('/api/onboarding/')) {
        return addCors(await handleOnboarding(request, env, userId, path), env);
      }
      if (path.startsWith('/api/roles/')) {
        return addCors(await handleEnterpriseEmployees(request, env, userId, path), env);
      }
      if (path.startsWith('/api/pipelines/')) {
        return addCors(await handlePipelineEngine(request, env, userId, path), env);
      }
      if (path.startsWith('/api/learning/')) {
        return addCors(await handleLearningEngine(request, env, userId, path), env);
      }
      if (path.startsWith('/api/sentiment/')) {
        return addCors(await handleSentimentEngine(request, env, userId, path), env);
      }
      if (path.startsWith('/api/prompts/')) {
        return addCors(await handlePromptEngine(request, env, userId, path), env);
      }
      if (path.startsWith('/api/avatars/')) {
        return addCors(await handleAvatarEngine(request, env, userId, path), env);
      }
      if (path.startsWith('/api/frontend/')) {
        return addCors(await handleFrontendApp(request, env, userId, path), env);
      }
      if (path.startsWith('/api/vault/')) {
        return addCors(await handleSecurityVault(request, env, userId, path), env);
      }
      if (path.startsWith('/api/data-arch/')) {
        return addCors(await handleDataArchitecture(request, env, userId, path), env);
      }
      if (path.startsWith('/api/realtime/')) {
        return addCors(await handleRealtimeInfrastructure(request, env, userId, path), env);
      }
      if (path.startsWith('/api/admin-center/')) {
        return addCors(await handleAdminControlCenter(request, env, userId, path), env);
      }
      if (path.startsWith('/api/admin-v2/')) {
        return addCors(await handleAdminV2(request, env, userId, path), env);
      }
      if (path.startsWith('/api/admin/')) {
        return addCors(await handleAdmin(request, env, userId, path), env);
      }

      return addCors(json({ error: 'Not Found', code: 'NOT_FOUND' }, 404), env);
    } catch (err: any) {
      console.error('Worker error:', err);
      return addCors(json({ error: 'Internal Server Error', message: err.message, code: 'INTERNAL_ERROR' }, 500), env);
    }
  },
};

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function addCors(response: Response, env: Env): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(env))) {
    headers.set(key, value);
  }
  // Add security headers to all responses
  for (const [key, value] of Object.entries(getSecurityHeaders(env))) {
    if (value) headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
