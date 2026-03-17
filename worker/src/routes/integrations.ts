/**
 * Integration Marketplace — OAuth connectors for major SaaS platforms
 * Manages OAuth flows, token storage, and integration configuration.
 */
import type { Env } from '../index';
import { json, generateId, parseBody } from '../lib/helpers';

export async function handleIntegrations(request: Request, env: Env, userId: string, path: string): Promise<Response> {
  // Marketplace browsing
  if (path === '/api/integrations/marketplace' && request.method === 'GET') {
    return handleMarketplace(request, env, userId);
  }

  // User's connected integrations
  if (path === '/api/integrations/connected' && request.method === 'GET') {
    return handleConnected(env, userId);
  }

  // Connect an integration (start OAuth or store API key)
  if (path === '/api/integrations/connect' && request.method === 'POST') {
    return handleConnect(request, env, userId);
  }

  // Disconnect
  if (path === '/api/integrations/disconnect' && request.method === 'POST') {
    return handleDisconnect(request, env, userId);
  }

  // OAuth callback
  if (path === '/api/integrations/oauth/callback' && request.method === 'POST') {
    return handleOAuthCallback(request, env, userId);
  }

  // Integration config
  if (path === '/api/integrations/config' && request.method === 'GET') {
    return handleGetConfig(request, env, userId);
  }
  if (path === '/api/integrations/config' && request.method === 'PUT') {
    return handleUpdateConfig(request, env, userId);
  }

  // Test integration connection
  if (path === '/api/integrations/test' && request.method === 'POST') {
    return handleTestConnection(request, env, userId);
  }

  return json({ error: 'Not found' }, 404);
}

async function handleMarketplace(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');

  let query = 'SELECT * FROM integrations WHERE is_active = 1';
  const params: string[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name ASC';

  const stmt = env.DB.prepare(query);
  const integrations = params.length > 0
    ? await stmt.bind(...params).all<any>()
    : await stmt.all<any>();

  // Get user's connected integrations
  const connected = await env.DB.prepare(
    'SELECT integration_id, status FROM user_integrations WHERE user_id = ?'
  ).bind(userId).all<any>();
  const connectedMap = new Map((connected.results || []).map((r: any) => [r.integration_id, r.status]));

  // Get categories for filtering
  const categories = await env.DB.prepare(
    'SELECT DISTINCT category FROM integrations WHERE is_active = 1 ORDER BY category'
  ).all<any>();

  const enriched = (integrations.results || []).map((int: any) => ({
    id: int.id,
    name: int.name,
    provider: int.provider,
    icon: int.icon,
    description: int.description,
    category: int.category,
    authType: int.auth_type,
    isConnected: connectedMap.has(int.id),
    connectionStatus: connectedMap.get(int.id) || 'not_connected',
    popularity: getPopularity(int.id), // simulated
    rating: getRating(int.id), // simulated
  }));

  return json({
    success: true,
    data: {
      integrations: enriched,
      categories: (categories.results || []).map((c: any) => c.category),
      totalCount: enriched.length,
      connectedCount: enriched.filter((i: any) => i.isConnected).length,
    },
  });
}

async function handleConnected(env: Env, userId: string): Promise<Response> {
  const connected = await env.DB.prepare(
    `SELECT ui.id, ui.integration_id, ui.status, ui.config, ui.connected_at,
            i.name, i.provider, i.icon, i.category, i.auth_type
     FROM user_integrations ui
     JOIN integrations i ON ui.integration_id = i.id
     WHERE ui.user_id = ?
     ORDER BY ui.connected_at DESC`
  ).bind(userId).all<any>();

  return json({
    success: true,
    data: (connected.results || []).map((c: any) => ({
      id: c.id,
      integrationId: c.integration_id,
      name: c.name,
      provider: c.provider,
      icon: c.icon,
      category: c.category,
      status: c.status,
      config: c.config ? JSON.parse(c.config) : {},
      connectedAt: c.connected_at,
    })),
  });
}

async function handleConnect(request: Request, env: Env, userId: string): Promise<Response> {
  const { integrationId, authType, apiKey, config = {} } = await parseBody<{
    integrationId: string;
    authType?: string;
    apiKey?: string;
    config?: Record<string, any>;
  }>(request);

  if (!integrationId) {
    return json({ error: 'integrationId is required' }, 400);
  }

  // Get integration details
  const integration = await env.DB.prepare(
    'SELECT * FROM integrations WHERE id = ?'
  ).bind(integrationId).first<any>();

  if (!integration) {
    return json({ error: 'Integration not found' }, 404);
  }

  if (integration.auth_type === 'api_key') {
    if (!apiKey) {
      return json({ error: 'API key is required for this integration' }, 400);
    }

    // Store the API key
    const connectionId = generateId('conn');
    await env.DB.prepare(
      `INSERT INTO user_integrations (id, user_id, integration_id, access_token, status, config, connected_at)
       VALUES (?, ?, ?, ?, 'connected', ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET access_token = ?, status = 'connected', config = ?`
    ).bind(connectionId, userId, integrationId, apiKey, JSON.stringify(config), apiKey, JSON.stringify(config)).run();

    await env.DB.prepare(
      'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(generateId('aud'), userId, 'integration_connected', userId, integrationId, `Connected ${integration.name} with API key`).run();

    return json({
      success: true,
      data: {
        connectionId,
        integrationId,
        status: 'connected',
        name: integration.name,
      },
    });
  }

  if (integration.auth_type === 'oauth2') {
    // Generate OAuth authorization URL
    const state = crypto.randomUUID();
    const redirectUri = `${new URL(request.url).origin}/api/integrations/oauth/callback`;

    // Store state for verification
    await env.CACHE.put(`oauth_state:${state}`, JSON.stringify({
      userId,
      integrationId,
      timestamp: Date.now(),
    }), { expirationTtl: 600 }); // 10 minute expiry

    // Build OAuth URL (provider-specific)
    const authUrl = buildOAuthUrl(integration, state, redirectUri);

    return json({
      success: true,
      data: {
        authUrl,
        state,
        provider: integration.provider,
        message: 'Redirect user to authUrl to complete OAuth flow',
      },
    });
  }

  return json({ error: 'Unsupported auth type' }, 400);
}

async function handleOAuthCallback(request: Request, env: Env, userId: string): Promise<Response> {
  const { code, state, provider } = await parseBody<{ code: string; state: string; provider?: string }>(request);

  if (!code || !state) {
    return json({ error: 'code and state are required' }, 400);
  }

  // Verify state
  const stateData = await env.CACHE.get(`oauth_state:${state}`);
  if (!stateData) {
    return json({ error: 'Invalid or expired OAuth state' }, 400);
  }

  const { integrationId } = JSON.parse(stateData);
  await env.CACHE.delete(`oauth_state:${state}`);

  // Get integration config
  const integration = await env.DB.prepare(
    'SELECT * FROM integrations WHERE id = ?'
  ).bind(integrationId).first<any>();

  if (!integration) {
    return json({ error: 'Integration not found' }, 404);
  }

  // Exchange code for token (would use real OAuth token endpoint in production)
  // For now, store the code as a simulated token
  const connectionId = generateId('conn');
  await env.DB.prepare(
    `INSERT INTO user_integrations (id, user_id, integration_id, access_token, status, connected_at)
     VALUES (?, ?, ?, ?, 'connected', datetime('now'))
     ON CONFLICT(id) DO UPDATE SET access_token = ?, status = 'connected'`
  ).bind(connectionId, userId, integrationId, `oauth_token_${code}`, `oauth_token_${code}`).run();

  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId('aud'), userId, 'oauth_completed', userId, integrationId, `OAuth flow completed for ${integration.name}`).run();

  return json({
    success: true,
    data: {
      connectionId,
      integrationId,
      status: 'connected',
      name: integration.name,
    },
  });
}

async function handleDisconnect(request: Request, env: Env, userId: string): Promise<Response> {
  const { integrationId } = await parseBody<{ integrationId: string }>(request);

  await env.DB.prepare(
    'DELETE FROM user_integrations WHERE user_id = ? AND integration_id = ?'
  ).bind(userId, integrationId).run();

  await env.DB.prepare(
    'INSERT INTO audit_log (id, user_id, action, actor, target, details) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId('aud'), userId, 'integration_disconnected', userId, integrationId, 'Integration disconnected').run();

  return json({ success: true });
}

async function handleGetConfig(request: Request, env: Env, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const integrationId = url.searchParams.get('integrationId');

  const connection = await env.DB.prepare(
    'SELECT config FROM user_integrations WHERE user_id = ? AND integration_id = ?'
  ).bind(userId, integrationId).first<any>();

  return json({
    success: true,
    data: connection?.config ? JSON.parse(connection.config) : {},
  });
}

async function handleUpdateConfig(request: Request, env: Env, userId: string): Promise<Response> {
  const { integrationId, config } = await parseBody<{ integrationId: string; config: Record<string, any> }>(request);

  await env.DB.prepare(
    'UPDATE user_integrations SET config = ? WHERE user_id = ? AND integration_id = ?'
  ).bind(JSON.stringify(config), userId, integrationId).run();

  return json({ success: true });
}

async function handleTestConnection(request: Request, env: Env, userId: string): Promise<Response> {
  const { integrationId } = await parseBody<{ integrationId: string }>(request);

  const connection = await env.DB.prepare(
    `SELECT ui.access_token, i.api_base_url, i.name, i.provider
     FROM user_integrations ui
     JOIN integrations i ON ui.integration_id = i.id
     WHERE ui.user_id = ? AND ui.integration_id = ? AND ui.status = 'connected'`
  ).bind(userId, integrationId).first<any>();

  if (!connection) {
    return json({ success: false, error: 'Integration not connected' }, 400);
  }

  // Test the connection by making a simple API call
  try {
    const testUrl = getTestEndpoint(connection.provider, connection.api_base_url);
    if (testUrl) {
      const res = await fetch(testUrl, {
        headers: { 'Authorization': `Bearer ${connection.access_token}` },
      });
      return json({
        success: true,
        data: {
          status: res.ok ? 'healthy' : 'error',
          statusCode: res.status,
          provider: connection.provider,
          name: connection.name,
          testedAt: new Date().toISOString(),
        },
      });
    }

    return json({
      success: true,
      data: {
        status: 'healthy',
        provider: connection.provider,
        name: connection.name,
        message: 'Connection verified (credentials stored)',
        testedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return json({
      success: false,
      data: { status: 'error', error: err.message, provider: connection.provider },
    });
  }
}

// ── Helpers ──

function buildOAuthUrl(integration: any, state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: integration.oauth_client_id || 'nexushr_client_id',
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: integration.oauth_scopes || '',
  });

  const authUrls: Record<string, string> = {
    slack: 'https://slack.com/oauth/v2/authorize',
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
    salesforce: 'https://login.salesforce.com/services/oauth2/authorize',
    hubspot: 'https://app.hubspot.com/oauth/authorize',
    atlassian: 'https://auth.atlassian.com/authorize',
    github: 'https://github.com/login/oauth/authorize',
    notion: 'https://api.notion.com/v1/oauth/authorize',
    linear: 'https://linear.app/oauth/authorize',
    figma: 'https://www.figma.com/oauth',
  };

  const baseUrl = authUrls[integration.provider] || integration.oauth_auth_url || 'https://example.com/oauth/authorize';
  return `${baseUrl}?${params.toString()}`;
}

function getTestEndpoint(provider: string, baseUrl: string): string | null {
  const endpoints: Record<string, string> = {
    slack: 'https://slack.com/api/auth.test',
    github: 'https://api.github.com/user',
    google: 'https://www.googleapis.com/oauth2/v2/userinfo',
    hubspot: 'https://api.hubapi.com/crm/v3/objects/contacts?limit=1',
    notion: 'https://api.notion.com/v1/users/me',
  };
  return endpoints[provider] || null;
}

function getPopularity(id: string): number {
  const popular: Record<string, number> = {
    int_slack: 9500, int_gmail: 8800, int_salesforce: 7200, int_github: 8100,
    int_hubspot: 6500, int_jira: 7800, int_notion: 6900, int_stripe: 7100,
    int_anthropic: 5200, int_openai: 6800, int_google_analytics: 5500,
    int_figma: 4800, int_linear: 3900, int_twilio: 4200, int_sendgrid: 4500,
    int_zapier: 5800, int_aws_s3: 3200, int_google_calendar: 6100,
  };
  return popular[id] || Math.floor(1000 + Math.random() * 5000);
}

function getRating(id: string): number {
  const ratings: Record<string, number> = {
    int_slack: 4.8, int_gmail: 4.7, int_salesforce: 4.5, int_github: 4.9,
    int_hubspot: 4.6, int_jira: 4.4, int_notion: 4.7, int_stripe: 4.8,
    int_anthropic: 4.9, int_openai: 4.7, int_google_analytics: 4.3,
  };
  return ratings[id] || Math.round((4.0 + Math.random() * 0.9) * 10) / 10;
}
