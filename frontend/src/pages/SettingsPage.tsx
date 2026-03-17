import { useState, useEffect } from 'react';
import { isWorkerConnected, getWorkerUrl, setWorkerUrl, WorkerLLM, checkWorkerHealth } from '../lib/worker-api';
import { useAuth } from '../context/AuthContext';
import type { LLMApiKey } from '../data/types';

export function SettingsPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<'backend' | 'llm' | 'account'>('backend');
  const [workerUrlInput, setWorkerUrlInput] = useState(getWorkerUrl());
  const [healthStatus, setHealthStatus] = useState<{ connected: boolean; version?: string } | null>(null);
  const [checking, setChecking] = useState(false);

  // LLM Keys
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [apiKeys, setApiKeys] = useState<LLMApiKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isWorkerConnected()) {
      WorkerLLM.listApiKeys().then(res => {
        if (res.success && res.data) setApiKeys(res.data);
      });
    }
  }, []);

  const checkHealth = async () => {
    setChecking(true);
    const result = await checkWorkerHealth();
    setHealthStatus(result);
    setChecking(false);
  };

  const saveWorkerUrl = () => {
    const url = workerUrlInput.replace(/\/$/, ''); // trim trailing slash
    setWorkerUrl(url);
    setMessage('Worker URL saved! Checking connection...');
    checkHealth();
  };

  const saveApiKey = async (provider: 'anthropic' | 'openai') => {
    const key = provider === 'anthropic' ? anthropicKey : openaiKey;
    if (!key.trim()) return;

    setSaving(true);
    if (isWorkerConnected()) {
      const res = await WorkerLLM.setApiKey(provider, key);
      if (res.success) {
        setMessage(`${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key saved securely.`);
        setApiKeys(prev => [...prev.filter(k => k.provider !== provider), { provider, preview: `...${key.slice(-4)}`, isActive: true, createdAt: new Date().toISOString() }]);
      } else {
        setMessage(`Error: ${res.error}`);
      }
    } else {
      // Store locally (less secure but functional)
      localStorage.setItem(`nexushr_${provider}_key`, key);
      setMessage(`${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key saved locally. Connect the Worker backend for secure cloud storage.`);
    }
    if (provider === 'anthropic') setAnthropicKey('');
    else setOpenaiKey('');
    setSaving(false);
  };

  const deleteApiKey = async (provider: string) => {
    if (isWorkerConnected()) {
      await WorkerLLM.deleteApiKey(provider);
    }
    localStorage.removeItem(`nexushr_${provider}_key`);
    setApiKeys(prev => prev.filter(k => k.provider !== provider));
    setMessage(`${provider} API key deleted.`);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 24 }}>⚙️ Settings</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #2a2a3e', paddingBottom: 12 }}>
        {[
          { key: 'backend' as const, label: '🌐 Backend Connection' },
          { key: 'llm' as const, label: '🧠 LLM API Keys' },
          { key: 'account' as const, label: '👤 Account' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
              background: tab === t.key ? '#facc15' : 'transparent',
              color: tab === t.key ? '#000' : '#9ca3af',
              fontWeight: tab === t.key ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div style={{ padding: '10px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, color: '#22c55e', fontSize: 13, marginBottom: 16 }}>
          {message}
        </div>
      )}

      {/* Backend Tab */}
      {tab === 'backend' && (
        <div>
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, border: '1px solid #2a2a3e', marginBottom: 24 }}>
            <h3 style={{ color: '#fff', fontWeight: 600, margin: '0 0 8px' }}>Cloudflare Worker URL</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 16px' }}>
              Enter your deployed NexusHR Worker URL. This connects the frontend to your serverless backend.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                placeholder="https://nexushr-api.your-subdomain.workers.dev"
                value={workerUrlInput}
                onChange={e => setWorkerUrlInput(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', background: '#0f0f1e', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14 }}
              />
              <button onClick={saveWorkerUrl} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#facc15', color: '#000', fontWeight: 600, cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={checkHealth} disabled={checking} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#9ca3af', cursor: 'pointer' }}>
                {checking ? '...' : 'Test'}
              </button>
            </div>

            {healthStatus && (
              <div style={{
                marginTop: 12, padding: '8px 14px', borderRadius: 8, fontSize: 13,
                background: healthStatus.connected ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: healthStatus.connected ? '#22c55e' : '#ef4444',
                border: `1px solid ${healthStatus.connected ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}>
                {healthStatus.connected
                  ? `✅ Connected — Worker v${healthStatus.version || '1.0.0'}`
                  : '❌ Connection failed. Check your URL and ensure the Worker is deployed.'}
              </div>
            )}
          </div>

          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, border: '1px solid #2a2a3e' }}>
            <h3 style={{ color: '#fff', fontWeight: 600, margin: '0 0 8px' }}>Deployment Guide</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 12px' }}>
              To deploy your Worker backend:
            </p>
            <ol style={{ color: '#d1d5db', fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
              <li>Navigate to the <code style={{ background: '#0f0f1e', padding: '2px 6px', borderRadius: 4 }}>nexushr-worker</code> directory</li>
              <li>Run <code style={{ background: '#0f0f1e', padding: '2px 6px', borderRadius: 4 }}>npx wrangler login</code> to authenticate</li>
              <li>Run <code style={{ background: '#0f0f1e', padding: '2px 6px', borderRadius: 4 }}>npx wrangler deploy</code> to deploy</li>
              <li>Copy the Worker URL (e.g., <code style={{ background: '#0f0f1e', padding: '2px 6px', borderRadius: 4 }}>https://nexushr-api.your-subdomain.workers.dev</code>)</li>
              <li>Paste it above and click Save</li>
            </ol>
          </div>
        </div>
      )}

      {/* LLM Keys Tab */}
      {tab === 'llm' && (
        <div>
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, border: '1px solid #2a2a3e', marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontWeight: 600, margin: '0 0 8px' }}>🧠 Anthropic (Claude)</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 12px' }}>
              Powers software engineers, sales reps, data analysts, and product managers.
              Get your API key at <a href="https://console.anthropic.com" target="_blank" rel="noopener" style={{ color: '#facc15' }}>console.anthropic.com</a>
            </p>
            {apiKeys.find(k => k.provider === 'anthropic') ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#0f0f1e', borderRadius: 8 }}>
                <span style={{ color: '#22c55e', fontSize: 13 }}>✅ Connected — Key: {apiKeys.find(k => k.provider === 'anthropic')?.preview}</span>
                <button onClick={() => deleteApiKey('anthropic')} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="password" placeholder="sk-ant-..." value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', background: '#0f0f1e', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14 }} />
                <button onClick={() => saveApiKey('anthropic')} disabled={saving || !anthropicKey.trim()}
                  style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: saving ? '#555' : '#facc15', color: '#000', fontWeight: 600, cursor: 'pointer' }}>
                  Save
                </button>
              </div>
            )}
          </div>

          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, border: '1px solid #2a2a3e', marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontWeight: 600, margin: '0 0 8px' }}>🤖 OpenAI (GPT-4o)</h3>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 12px' }}>
              Powers marketing managers, content writers, and enables TTS/STT for voice chat.
              Get your API key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" style={{ color: '#facc15' }}>platform.openai.com</a>
            </p>
            {apiKeys.find(k => k.provider === 'openai') ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#0f0f1e', borderRadius: 8 }}>
                <span style={{ color: '#22c55e', fontSize: 13 }}>✅ Connected — Key: {apiKeys.find(k => k.provider === 'openai')?.preview}</span>
                <button onClick={() => deleteApiKey('openai')} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="password" placeholder="sk-..." value={openaiKey} onChange={e => setOpenaiKey(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', background: '#0f0f1e', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14 }} />
                <button onClick={() => saveApiKey('openai')} disabled={saving || !openaiKey.trim()}
                  style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: saving ? '#555' : '#facc15', color: '#000', fontWeight: 600, cursor: 'pointer' }}>
                  Save
                </button>
              </div>
            )}
          </div>

          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a3e' }}>
            <h3 style={{ color: '#fff', fontWeight: 600, margin: '0 0 8px' }}>Model Assignment per Role</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2a2a3e' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af' }}>Primary Model</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#9ca3af' }}>Fallback</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', color: '#9ca3af' }}>Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: '💻 Software Engineer', primary: 'Claude Sonnet 4.6', fallback: 'GPT-4o', temp: 0.3 },
                    { role: '📣 Marketing Manager', primary: 'GPT-4o', fallback: 'Claude Sonnet 4.6', temp: 0.7 },
                    { role: '🤝 Sales Representative', primary: 'Claude Sonnet 4.6', fallback: 'GPT-4o Mini', temp: 0.5 },
                    { role: '🎧 Customer Support', primary: 'Claude Haiku 4.5', fallback: 'GPT-4o Mini', temp: 0.4 },
                    { role: '📊 Data Analyst', primary: 'Claude Sonnet 4.6', fallback: 'GPT-4o', temp: 0.2 },
                    { role: '✍️ Content Writer', primary: 'GPT-4o', fallback: 'Claude Sonnet 4.6', temp: 0.8 },
                    { role: '🚀 Product Manager', primary: 'Claude Sonnet 4.6', fallback: 'GPT-4o', temp: 0.4 },
                    { role: '🎨 UI/UX Designer', primary: 'Claude Sonnet 4.6', fallback: 'GPT-4o', temp: 0.5 },
                  ].map(row => (
                    <tr key={row.role} style={{ borderBottom: '1px solid #1e1e2e' }}>
                      <td style={{ padding: '8px 12px', color: '#d1d5db' }}>{row.role}</td>
                      <td style={{ padding: '8px 12px', color: '#facc15' }}>{row.primary}</td>
                      <td style={{ padding: '8px 12px', color: '#6b7280' }}>{row.fallback}</td>
                      <td style={{ padding: '8px 12px', color: '#9ca3af', textAlign: 'center' }}>{row.temp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {tab === 'account' && (
        <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, border: '1px solid #2a2a3e' }}>
          <h3 style={{ color: '#fff', fontWeight: 600, margin: '0 0 16px' }}>Account Information</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e2e' }}>
              <span style={{ color: '#9ca3af' }}>Name</span>
              <span style={{ color: '#fff' }}>{auth.user?.name || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e2e' }}>
              <span style={{ color: '#9ca3af' }}>Email</span>
              <span style={{ color: '#fff' }}>{auth.user?.email || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e2e' }}>
              <span style={{ color: '#9ca3af' }}>Status</span>
              <span style={{ color: auth.isSubscribed ? '#22c55e' : '#eab308' }}>{auth.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1e1e2e' }}>
              <span style={{ color: '#9ca3af' }}>Plan</span>
              <span style={{ color: '#fff' }}>{auth.plan?.name || 'Free Trial'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#9ca3af' }}>AI Employees</span>
              <span style={{ color: '#fff' }}>{auth.hiredEmployees.length} hired</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
