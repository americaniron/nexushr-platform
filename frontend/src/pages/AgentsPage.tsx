import { useState, useEffect } from 'react';
import { isWorkerConnected, WorkerAgents } from '../lib/worker-api';
import { AI_EMPLOYEES } from '../data/employees';
import type { CollaborationTemplate, CollaborationResult } from '../data/types';
import { useAuth } from '../context/AuthContext';

const WORKFLOW_DEFS: Record<string, { name: string; description: string; icon: string; minAgents: number }> = {
  sequential: { name: 'Sequential Pipeline', description: 'Agents work in order, each building on the previous output', icon: '🔗', minAgents: 2 },
  parallel: { name: 'Parallel Execution', description: 'All agents work simultaneously, results are synthesized', icon: '⚡', minAgents: 2 },
  debate: { name: 'Structured Debate', description: 'Agents argue perspectives, a moderator synthesizes', icon: '🗣️', minAgents: 2 },
  review_chain: { name: 'Review Chain', description: 'First agent creates, others review and refine', icon: '🔍', minAgents: 2 },
  swarm: { name: 'Agent Swarm', description: 'Agents self-organize, each tackling their specialty', icon: '🐝', minAgents: 3 },
};

const TEMPLATES: CollaborationTemplate[] = [
  { id: 'content_pipeline', name: 'Content Creation Pipeline', description: 'Writer drafts → Designer reviews → Marketer optimizes → PM validates', employeeIds: ['lyra', 'pixel', 'aurora', 'sage'], workflow: 'sequential', category: 'content', agents: [] },
  { id: 'deal_war_room', name: 'Deal War Room', description: 'Sales context → Data metrics → Marketing collateral → Product alignment', employeeIds: ['vex', 'prism', 'aurora', 'sage'], workflow: 'parallel', category: 'sales', agents: [] },
  { id: 'code_review_pipeline', name: 'Code Review Pipeline', description: 'Engineer writes → Engineer reviews → Designer checks UI → Support validates', employeeIds: ['atlas', 'cipher', 'pixel', 'harmony'], workflow: 'review_chain', category: 'engineering', agents: [] },
  { id: 'strategy_debate', name: 'Strategy Debate', description: 'Sales, marketing, and product debate go-to-market strategy', employeeIds: ['vex', 'aurora', 'sage'], workflow: 'debate', category: 'strategy', agents: [] },
  { id: 'incident_swarm', name: 'Incident Response Swarm', description: 'Support triages → Engineers investigate → Analyst checks → PM communicates', employeeIds: ['harmony', 'atlas', 'cipher', 'prism', 'sage'], workflow: 'swarm', category: 'operations', agents: [] },
  { id: 'customer_360', name: 'Customer 360 Analysis', description: 'Every agent analyzes a customer from their domain perspective', employeeIds: ['harmony', 'prism', 'aurora', 'vex', 'sage'], workflow: 'parallel', category: 'customer_success', agents: [] },
];

export function AgentsPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<'templates' | 'custom' | 'history'>('templates');
  const [selectedWorkflow, setSelectedWorkflow] = useState('sequential');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [task, setTask] = useState('');
  const [collabName, setCollabName] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CollaborationResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const workerConnected = isWorkerConnected();

  useEffect(() => {
    if (workerConnected) {
      WorkerAgents.getHistory().then(res => {
        if (res.success && res.data) setHistory(res.data);
      });
    }
  }, [workerConnected]);

  const hiredEmployees = AI_EMPLOYEES.filter(e => auth.hiredEmployees.includes(e.id));
  const allEmployees = AI_EMPLOYEES;

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const runCollaboration = async (template?: CollaborationTemplate) => {
    const agents = template ? template.employeeIds : selectedAgents;
    const workflow = template ? template.workflow : selectedWorkflow;
    const name = template ? template.name : collabName || 'Custom Collaboration';
    const taskText = task || `Execute the "${name}" workflow`;

    if (agents.length < 2) return;
    setRunning(true);
    setResult(null);

    if (workerConnected) {
      const res = await WorkerAgents.startCollaboration(name, agents, workflow, taskText);
      if (res.success && res.data) {
        setResult(res.data);
      }
    } else {
      // Simulate locally
      await new Promise(r => setTimeout(r, 2000));
      setResult({
        collaborationId: `collab_${Date.now()}`,
        name,
        workflow,
        agents: agents.map(id => {
          const emp = AI_EMPLOYEES.find(e => e.id === id);
          return { id, name: emp?.name || id, role: emp?.jobType || 'general' };
        }),
        status: 'completed',
        result: {
          type: workflow,
          status: 'simulated',
          message: `${workflow} collaboration completed with ${agents.length} agents. Connect the Worker backend and add an LLM API key for real multi-agent execution.`,
          steps: agents.map((id, i) => ({
            step: i + 1,
            agent: AI_EMPLOYEES.find(e => e.id === id)?.name || id,
            output: `Simulated output for step ${i + 1}. Connect an API key for real LLM-powered collaboration.`,
          })),
        },
        executionTimeMs: 2000,
        llmPowered: false,
      });
    }
    setRunning(false);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>🐝 Multi-Agent Collaboration</h1>
        <p style={{ color: '#9ca3af', fontSize: 15 }}>
          Orchestrate multiple AI employees to collaborate on complex tasks using structured workflows.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '1px solid #2a2a3e', paddingBottom: 12 }}>
        {[
          { key: 'templates' as const, label: '📋 Templates', count: TEMPLATES.length },
          { key: 'custom' as const, label: '🛠️ Custom', count: null },
          { key: 'history' as const, label: '📜 History', count: history.length },
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
            {t.label} {t.count !== null && <span style={{ opacity: 0.7 }}>({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
          {TEMPLATES.map(template => {
            const agents = template.employeeIds.map(id => AI_EMPLOYEES.find(e => e.id === id)).filter(Boolean);
            const wf = WORKFLOW_DEFS[template.workflow];
            return (
              <div key={template.id} style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, border: '1px solid #2a2a3e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>{template.name}</h3>
                    <span style={{ color: '#6b7280', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {wf?.icon} {wf?.name}
                    </span>
                  </div>
                  <span style={{ background: '#2a2a3e', color: '#9ca3af', padding: '2px 8px', borderRadius: 8, fontSize: 11, textTransform: 'uppercase' }}>
                    {template.category}
                  </span>
                </div>
                <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>{template.description}</p>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                  {agents.map(a => a && (
                    <span key={a.id} style={{ padding: '3px 10px', borderRadius: 12, background: '#2a2a3e', color: '#d1d5db', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {a.emoji} {a.name}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => { setTask(''); runCollaboration(template); }}
                  disabled={running}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: running ? '#555' : '#facc15', color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                >
                  {running ? '⏳ Running...' : '▶️ Run Collaboration'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Tab */}
      {tab === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: 12 }}>1. Choose Workflow</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(WORKFLOW_DEFS).map(([key, wf]) => (
                <button
                  key={key}
                  onClick={() => setSelectedWorkflow(key)}
                  style={{
                    padding: '12px 16px', borderRadius: 8, border: `1px solid ${selectedWorkflow === key ? '#facc15' : '#2a2a3e'}`,
                    background: selectedWorkflow === key ? 'rgba(250,204,21,0.1)' : '#1a1a2e',
                    color: '#fff', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{wf.icon} {wf.name}</div>
                  <div style={{ color: '#9ca3af', fontSize: 12 }}>{wf.description}</div>
                </button>
              ))}
            </div>

            <h3 style={{ color: '#fff', fontWeight: 600, margin: '24px 0 12px' }}>2. Select Agents ({selectedAgents.length} selected)</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => toggleAgent(emp.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: `1px solid ${selectedAgents.includes(emp.id) ? '#facc15' : '#2a2a3e'}`,
                    background: selectedAgents.includes(emp.id) ? 'rgba(250,204,21,0.15)' : '#1a1a2e',
                    color: selectedAgents.includes(emp.id) ? '#facc15' : '#9ca3af',
                    cursor: 'pointer', fontSize: 13,
                  }}
                >
                  {emp.emoji} {emp.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ color: '#fff', fontWeight: 600, marginBottom: 12 }}>3. Define Task</h3>
            <input
              type="text"
              placeholder="Collaboration name..."
              value={collabName}
              onChange={e => setCollabName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
            />
            <textarea
              placeholder="Describe the task for your agents to collaborate on..."
              value={task}
              onChange={e => setTask(e.target.value)}
              rows={6}
              style={{ width: '100%', padding: '10px 14px', background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, resize: 'vertical', boxSizing: 'border-box' }}
            />
            <button
              onClick={() => runCollaboration()}
              disabled={running || selectedAgents.length < 2 || !task.trim()}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, border: 'none', marginTop: 16,
                background: running || selectedAgents.length < 2 ? '#555' : '#facc15',
                color: '#000', fontWeight: 600, cursor: 'pointer', fontSize: 15,
              }}
            >
              {running ? '⏳ Agents Collaborating...' : `▶️ Start ${WORKFLOW_DEFS[selectedWorkflow]?.name}`}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📜</p>
              <p>No collaboration history yet. Run a template or create a custom collaboration to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((h: any, i: number) => (
                <div key={i} style={{ background: '#1a1a2e', borderRadius: 8, padding: 16, border: '1px solid #2a2a3e' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{h.name}</span>
                    <span style={{ color: '#6b7280', fontSize: 12 }}>{h.createdAt}</span>
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 4 }}>
                    {h.workflow} workflow • {h.agents?.length || 0} agents
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div style={{ marginTop: 32, background: '#1a1a2e', borderRadius: 16, padding: 24, border: '1px solid #22c55e33' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#fff', fontWeight: 600, margin: 0 }}>✅ {result.name} — Complete</h3>
            <div style={{ display: 'flex', gap: 12, color: '#6b7280', fontSize: 12 }}>
              <span>⏱️ {result.executionTimeMs}ms</span>
              <span>🤖 {result.agents.length} agents</span>
              <span style={{ color: result.llmPowered ? '#22c55e' : '#eab308' }}>
                {result.llmPowered ? '🧠 LLM-Powered' : '⚙️ Simulated'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {result.agents.map(a => (
              <span key={a.id} style={{ padding: '3px 10px', borderRadius: 12, background: '#2a2a3e', color: '#d1d5db', fontSize: 12 }}>
                {a.name} ({a.role.replace(/-/g, ' ')})
              </span>
            ))}
          </div>
          <pre style={{ background: '#0f0f1e', borderRadius: 8, padding: 16, color: '#d1d5db', fontSize: 13, overflow: 'auto', maxHeight: 400, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(result.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
