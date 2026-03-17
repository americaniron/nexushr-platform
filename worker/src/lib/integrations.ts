/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NexusHR External Integrations — Email, CRM, Calendar, Slack connectors
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Env } from '../index';

// ══════════════════════════════════════════════════════
// 1. TYPES
// ══════════════════════════════════════════════════════

export type IntegrationType = 'email' | 'crm' | 'calendar' | 'slack' | 'webhook';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface IntegrationConfig {
  id: string;
  org_id: string;
  type: IntegrationType;
  provider: string;
  status: IntegrationStatus;
  credentials_key: string; // KV reference, never stored in D1
  settings: Record<string, any>;
  last_sync_at: string | null;
  created_at: string;
}

export interface EmailMessage {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  html?: boolean;
}

export interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  attendees: string[];
  location?: string;
  description?: string;
}

export interface CRMContact {
  name: string;
  email: string;
  company: string;
  phone?: string;
  stage?: string;
  notes?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  thread_ts?: string;
}

// ══════════════════════════════════════════════════════
// 2. INTEGRATION MANAGER
// ══════════════════════════════════════════════════════

export class IntegrationManager {
  constructor(private env: Env) {}

  async connect(orgId: string, type: IntegrationType, provider: string, credentials: Record<string, string>, settings?: Record<string, any>): Promise<IntegrationConfig> {
    const id = `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const credKey = `integration:${id}:creds`;
    const now = new Date().toISOString();

    // Store credentials in KV (encrypted at rest by Cloudflare)
    await this.env.API_KEYS.put(credKey, JSON.stringify(credentials), { expirationTtl: 86400 * 365 });

    const config: IntegrationConfig = {
      id, org_id: orgId, type, provider, status: 'connected',
      credentials_key: credKey, settings: settings || {}, last_sync_at: null, created_at: now,
    };

    await this.env.DB.prepare(
      `INSERT INTO external_integrations (id, org_id, type, provider, status, credentials_key, settings, last_sync_at, created_at)
       VALUES (?, ?, ?, ?, 'connected', ?, ?, NULL, ?)`
    ).bind(id, orgId, type, provider, credKey, JSON.stringify(settings || {}), now).run();

    return config;
  }

  async disconnect(integrationId: string): Promise<void> {
    const config = await this.env.DB.prepare(
      `SELECT credentials_key FROM external_integrations WHERE id = ?`
    ).bind(integrationId).first<{ credentials_key: string }>();

    if (config?.credentials_key) {
      await this.env.API_KEYS.delete(config.credentials_key);
    }

    await this.env.DB.prepare(
      `UPDATE external_integrations SET status = 'disconnected' WHERE id = ?`
    ).bind(integrationId).run();
  }

  async listIntegrations(orgId: string): Promise<IntegrationConfig[]> {
    const result = await this.env.DB.prepare(
      `SELECT * FROM external_integrations WHERE org_id = ? ORDER BY created_at DESC`
    ).bind(orgId).all();

    return (result.results || []).map((r: any) => ({
      ...r, settings: JSON.parse(r.settings || '{}'),
    }));
  }

  async getCredentials(integrationId: string): Promise<Record<string, string> | null> {
    const config = await this.env.DB.prepare(
      `SELECT credentials_key FROM external_integrations WHERE id = ?`
    ).bind(integrationId).first<{ credentials_key: string }>();
    if (!config) return null;
    const raw = await this.env.API_KEYS.get(config.credentials_key);
    return raw ? JSON.parse(raw) : null;
  }
}

// ══════════════════════════════════════════════════════
// 3. EMAIL CONNECTOR
// ══════════════════════════════════════════════════════

export class EmailConnector {
  constructor(private env: Env, private manager: IntegrationManager) {}

  async send(integrationId: string, message: EmailMessage): Promise<{ id: string; status: string }> {
    const creds = await this.manager.getCredentials(integrationId);
    if (!creds) throw new Error('Email integration not configured');

    // Would call SMTP/SendGrid/Mailgun API with creds
    const msgId = `email-${Date.now()}`;
    await this.env.DB.prepare(
      `INSERT INTO integration_logs (id, integration_id, action, payload, status, created_at) VALUES (?, ?, 'send_email', ?, 'sent', ?)`
    ).bind(msgId, integrationId, JSON.stringify({ to: message.to, subject: message.subject }), new Date().toISOString()).run();

    return { id: msgId, status: 'sent' };
  }

  async listInbox(integrationId: string, limit: number = 20): Promise<{ messages: { id: string; from: string; subject: string; date: string; preview: string }[] }> {
    // Would fetch from IMAP/API
    return { messages: [] };
  }
}

// ══════════════════════════════════════════════════════
// 4. CALENDAR CONNECTOR
// ══════════════════════════════════════════════════════

export class CalendarConnector {
  constructor(private env: Env, private manager: IntegrationManager) {}

  async createEvent(integrationId: string, event: CalendarEvent): Promise<{ id: string; link: string }> {
    const creds = await this.manager.getCredentials(integrationId);
    if (!creds) throw new Error('Calendar integration not configured');

    const eventId = `cal-${Date.now()}`;
    await this.env.DB.prepare(
      `INSERT INTO integration_logs (id, integration_id, action, payload, status, created_at) VALUES (?, ?, 'create_event', ?, 'created', ?)`
    ).bind(eventId, integrationId, JSON.stringify(event), new Date().toISOString()).run();

    return { id: eventId, link: `https://calendar.example.com/event/${eventId}` };
  }

  async listEvents(integrationId: string, start: string, end: string): Promise<CalendarEvent[]> {
    return [];
  }

  async checkAvailability(integrationId: string, attendees: string[], date: string): Promise<{ available_slots: { start: string; end: string }[] }> {
    return { available_slots: [
      { start: `${date}T09:00:00`, end: `${date}T10:00:00` },
      { start: `${date}T14:00:00`, end: `${date}T15:00:00` },
    ] };
  }
}

// ══════════════════════════════════════════════════════
// 5. CRM CONNECTOR
// ══════════════════════════════════════════════════════

export class CRMConnector {
  constructor(private env: Env, private manager: IntegrationManager) {}

  async createContact(integrationId: string, contact: CRMContact): Promise<{ id: string }> {
    const contactId = `crm-${Date.now()}`;
    await this.env.DB.prepare(
      `INSERT INTO integration_logs (id, integration_id, action, payload, status, created_at) VALUES (?, ?, 'create_contact', ?, 'created', ?)`
    ).bind(contactId, integrationId, JSON.stringify(contact), new Date().toISOString()).run();
    return { id: contactId };
  }

  async searchContacts(integrationId: string, query: string): Promise<CRMContact[]> {
    return [];
  }

  async updateDealStage(integrationId: string, dealId: string, stage: string): Promise<void> {
    await this.env.DB.prepare(
      `INSERT INTO integration_logs (id, integration_id, action, payload, status, created_at) VALUES (?, ?, 'update_deal', ?, 'updated', ?)`
    ).bind(`log-${Date.now()}`, integrationId, JSON.stringify({ dealId, stage }), new Date().toISOString()).run();
  }
}

// ══════════════════════════════════════════════════════
// 6. SLACK CONNECTOR
// ══════════════════════════════════════════════════════

export class SlackConnector {
  constructor(private env: Env, private manager: IntegrationManager) {}

  async sendMessage(integrationId: string, message: SlackMessage): Promise<{ ts: string }> {
    const creds = await this.manager.getCredentials(integrationId);
    if (!creds) throw new Error('Slack integration not configured');

    // Would call Slack Web API
    const ts = `${Date.now()}.000`;
    await this.env.DB.prepare(
      `INSERT INTO integration_logs (id, integration_id, action, payload, status, created_at) VALUES (?, ?, 'send_slack', ?, 'sent', ?)`
    ).bind(`slack-${Date.now()}`, integrationId, JSON.stringify(message), new Date().toISOString()).run();

    return { ts };
  }

  async listChannels(integrationId: string): Promise<{ id: string; name: string }[]> {
    return [];
  }
}

// ══════════════════════════════════════════════════════
// 7. SCHEMA
// ══════════════════════════════════════════════════════

export const INTEGRATIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS external_integrations (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected',
    credentials_key TEXT,
    settings TEXT DEFAULT '{}',
    last_sync_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS integration_logs (
    id TEXT PRIMARY KEY,
    integration_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload TEXT,
    status TEXT,
    error TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_ext_int_org ON external_integrations(org_id);
  CREATE INDEX IF NOT EXISTS idx_int_logs ON integration_logs(integration_id);
`;

// ══════════════════════════════════════════════════════
// 8. ROUTE HANDLER
// ══════════════════════════════════════════════════════

export async function handleExternalIntegrations(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  const method = request.method;
  const subPath = path.replace('/api/connect/', '');
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const manager = new IntegrationManager(env);

    if (subPath === 'integrations' && method === 'POST') {
      const body = await request.json() as any;
      const config = await manager.connect(body.org_id, body.type, body.provider, body.credentials, body.settings);
      return json(config, 201);
    }

    if (subPath.startsWith('integrations/') && subPath.endsWith('/disconnect') && method === 'POST') {
      const id = subPath.replace('integrations/', '').replace('/disconnect', '');
      await manager.disconnect(id);
      return json({ success: true });
    }

    if (subPath.startsWith('integrations/org/') && method === 'GET') {
      const orgId = subPath.replace('integrations/org/', '');
      const list = await manager.listIntegrations(orgId);
      return json({ integrations: list });
    }

    // Email
    if (subPath === 'email/send' && method === 'POST') {
      const body = await request.json() as any;
      const connector = new EmailConnector(env, manager);
      const result = await connector.send(body.integration_id, body.message);
      return json(result);
    }

    // Calendar
    if (subPath === 'calendar/event' && method === 'POST') {
      const body = await request.json() as any;
      const connector = new CalendarConnector(env, manager);
      const result = await connector.createEvent(body.integration_id, body.event);
      return json(result, 201);
    }

    if (subPath === 'calendar/availability' && method === 'POST') {
      const body = await request.json() as any;
      const connector = new CalendarConnector(env, manager);
      const result = await connector.checkAvailability(body.integration_id, body.attendees, body.date);
      return json(result);
    }

    // CRM
    if (subPath === 'crm/contact' && method === 'POST') {
      const body = await request.json() as any;
      const connector = new CRMConnector(env, manager);
      const result = await connector.createContact(body.integration_id, body.contact);
      return json(result, 201);
    }

    // Slack
    if (subPath === 'slack/message' && method === 'POST') {
      const body = await request.json() as any;
      const connector = new SlackConnector(env, manager);
      const result = await connector.sendMessage(body.integration_id, body.message);
      return json(result);
    }

    return json({ error: 'Not Found' }, 404);
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
}
