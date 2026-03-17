import { useState, useEffect } from 'react';
import { isWorkerConnected, WorkerIntegrations, getWorkerUrl } from '../lib/worker-api';
import type { Integration } from '../data/types';

const CATEGORIES = ['all', 'ai', 'communication', 'crm', 'email', 'developer', 'project_management', 'productivity', 'analytics', 'finance', 'automation', 'design', 'storage'];

// Fallback marketplace data when worker is not connected
const FALLBACK_INTEGRATIONS: Integration[] = [
  { id: 'int_anthropic', name: 'Anthropic', provider: 'anthropic', icon: '🧠', description: 'Claude API access for advanced reasoning and analysis', category: 'ai', authType: 'api_key', isConnected: false, connectionStatus: 'not_connected', popularity: 5200, rating: 4.9 },
  { id: 'int_openai', name: 'OpenAI', provider: 'openai', icon: '🤖', description: 'GPT-4o and DALL-E API access for AI-powered tasks', category: 'ai', authType: 'api_key', isConnected: false, connectionStatus: 'not_connected', popularity: 6800, rating: 4.7 },
  { id: 'int_slack', name: 'Slack', provider: 'slack', icon: '💬', description: 'Send messages, manage channels, and automate workflows', category: 'communication', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 9500, rating: 4.8 },
  { id: 'int_gmail', name: 'Gmail', provider: 'google', icon: '📧', description: 'Read, send, and manage emails through Gmail API', category: 'email', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 8800, rating: 4.7 },
  { id: 'int_salesforce', name: 'Salesforce', provider: 'salesforce', icon: '☁️', description: 'Manage leads, opportunities, and customer data', category: 'crm', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 7200, rating: 4.5 },
  { id: 'int_hubspot', name: 'HubSpot', provider: 'hubspot', icon: '🟠', description: 'CRM, marketing automation, and sales pipeline', category: 'crm', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 6500, rating: 4.6 },
  { id: 'int_github', name: 'GitHub', provider: 'github', icon: '🐙', description: 'Repository management, code reviews, and CI/CD', category: 'developer', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 8100, rating: 4.9 },
  { id: 'int_jira', name: 'Jira', provider: 'atlassian', icon: '🔵', description: 'Project management, issue tracking, and agile boards', category: 'project_management', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 7800, rating: 4.4 },
  { id: 'int_notion', name: 'Notion', provider: 'notion', icon: '📝', description: 'Workspace management, documentation, and knowledge bases', category: 'productivity', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 6900, rating: 4.7 },
  { id: 'int_stripe', name: 'Stripe', provider: 'stripe', icon: '💳', description: 'Payment processing and subscription management', category: 'finance', authType: 'api_key', isConnected: false, connectionStatus: 'not_connected', popularity: 7100, rating: 4.8 },
  { id: 'int_sendgrid', name: 'SendGrid', provider: 'sendgrid', icon: '✉️', description: 'Transactional and marketing email delivery', category: 'email', authType: 'api_key', isConnected: false, connectionStatus: 'not_connected', popularity: 4500, rating: 4.3 },
  { id: 'int_google_analytics', name: 'Google Analytics', provider: 'google', icon: '📊', description: 'Website traffic analytics and conversion tracking', category: 'analytics', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 5500, rating: 4.3 },
  { id: 'int_zapier', name: 'Zapier', provider: 'zapier', icon: '⚡', description: 'Connect 5000+ apps with automated workflows', category: 'automation', authType: 'api_key', isConnected: false, connectionStatus: 'not_connected', popularity: 5800, rating: 4.6 },
  { id: 'int_figma', name: 'Figma', provider: 'figma', icon: '🎨', description: 'Design collaboration and prototyping', category: 'design', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 4800, rating: 4.7 },
  { id: 'int_linear', name: 'Linear', provider: 'linear', icon: '🔷', description: 'Modern project management and issue tracking', category: 'project_management', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 3900, rating: 4.8 },
  { id: 'int_twilio', name: 'Twilio', provider: 'twilio', icon: '📞', description: 'Voice calls, SMS messaging, and video', category: 'communication', authType: 'api_key', isConnected: false, connectionStatus: 'not_connected', popularity: 4200, rating: 4.5 },
  { id: 'int_google_calendar', name: 'Google Calendar', provider: 'google', icon: '📅', description: 'Event scheduling and calendar sync', category: 'productivity', authType: 'oauth2', isConnected: false, connectionStatus: 'not_connected', popularity: 6100, rating: 4.6 },
  { id: 'int_aws_s3', name: 'AWS S3', provider: 'aws', icon: '🪣', description: 'Cloud storage for files and backups', category: 'storage', authType: 'api_key', isConnected: false, connectionStatus: 'not_connected', popularity: 3200, rating: 4.4 },
];

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>(FALLBACK_INTEGRATIONS);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState<string | null>(null);
  const workerConnected = isWorkerConnected();

  useEffect(() => {
    if (workerConnected) {
      WorkerIntegrations.getMarketplace().then(res => {
        if (res.success && res.data) setIntegrations(res.data.integrations);
      });
    }
  }, [workerConnected]);

  const filtered = integrations.filter(i => {
    if (category !== 'all' && i.category !== category) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.popularity - a.popularity);

  const connectedCount = integrations.filter(i => i.isConnected).length;

  const handleConnect = async (integration: Integration) => {
    if (integration.authType === 'api_key') {
      setShowKeyModal(integration.id);
      return;
    }
    if (!workerConnected) return;
    setConnecting(integration.id);
    const res = await WorkerIntegrations.connect(integration.id);
    if (res.success && res.data?.authUrl) {
      window.open(res.data.authUrl, '_blank', 'width=600,height=700');
    }
    setConnecting(null);
  };

  const handleSubmitKey = async (integrationId: string) => {
    if (!apiKeyInput.trim()) return;
    setConnecting(integrationId);
    if (workerConnected) {
      await WorkerIntegrations.connect(integrationId, apiKeyInput);
    }
    setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, isConnected: true, connectionStatus: 'connected' } : i));
    setShowKeyModal(null);
    setApiKeyInput('');
    setConnecting(null);
  };

  const handleDisconnect = async (integrationId: string) => {
    if (workerConnected) {
      await WorkerIntegrations.disconnect(integrationId);
    }
    setIntegrations(prev => prev.map(i => i.id === integrationId ? { ...i, isConnected: false, connectionStatus: 'not_connected' } : i));
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>🔌 Integration Marketplace</h1>
        <p style={{ color: '#9ca3af', fontSize: 15 }}>
          Connect your favorite tools to supercharge your AI employees. {connectedCount} connected.
        </p>
        {!workerConnected && (
          <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8, color: '#eab308', fontSize: 13 }}>
            ⚠️ Backend not connected. Set your Worker API URL in Settings to enable live OAuth and API key storage.
          </div>
        )}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search integrations..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '10px 16px', background: '#1e1e2e', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14 }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                background: category === c ? '#facc15' : '#2a2a3e',
                color: category === c ? '#000' : '#9ca3af',
              }}
            >
              {c === 'all' ? 'All' : c.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Integration Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {filtered.map(integration => (
          <div
            key={integration.id}
            style={{
              background: '#1a1a2e', border: `1px solid ${integration.isConnected ? '#22c55e33' : '#2a2a3e'}`,
              borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ fontSize: 28 }}>{integration.icon}</span>
                <div>
                  <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: 0 }}>{integration.name}</h3>
                  <span style={{ color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>{integration.category.replace('_', ' ')}</span>
                </div>
              </div>
              {integration.isConnected && (
                <span style={{ padding: '2px 10px', borderRadius: 12, background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 11, fontWeight: 600 }}>
                  Connected
                </span>
              )}
            </div>

            <p style={{ color: '#9ca3af', fontSize: 13, margin: 0, lineHeight: 1.5 }}>{integration.description}</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              <div style={{ display: 'flex', gap: 12, color: '#6b7280', fontSize: 12 }}>
                <span>⭐ {integration.rating}</span>
                <span>👥 {(integration.popularity / 1000).toFixed(1)}K</span>
                <span style={{ textTransform: 'uppercase', fontSize: 10, padding: '2px 6px', background: '#2a2a3e', borderRadius: 4 }}>
                  {integration.authType === 'api_key' ? 'API Key' : 'OAuth 2.0'}
                </span>
              </div>

              {integration.isConnected ? (
                <button
                  onClick={() => handleDisconnect(integration.id)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(integration)}
                  disabled={connecting === integration.id}
                  style={{
                    padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                    background: connecting === integration.id ? '#555' : '#facc15',
                    color: '#000',
                  }}
                >
                  {connecting === integration.id ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 16, padding: 32, width: 420, border: '1px solid #333' }}>
            <h3 style={{ color: '#fff', margin: '0 0 8px' }}>Enter API Key</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
              For {integrations.find(i => i.id === showKeyModal)?.name}. Your key is stored securely in Cloudflare KV.
            </p>
            <input
              type="password"
              placeholder="sk-... or your API key"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: '#0f0f1e', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowKeyModal(null); setApiKeyInput(''); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleSubmitKey(showKeyModal)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#facc15', color: '#000', fontWeight: 600, cursor: 'pointer' }}>
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
