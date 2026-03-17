import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AI_EMPLOYEES } from '../data/employees';
import type { TaskPipeline, TaskExecutionResult, InterEmployeeMessage, EmployeeMetrics, PersonalityConfig, OnboardingContext } from '../data/types';
import {
  getTaskPipelines, executeTask, getLocalTaskHistory,
  sendInterEmployeeMessage, getInterEmployeeMessages, performHandoff,
  getEmployeeMetrics, getLeaderboard,
  getPersonalityConfig, updatePersonalityConfig,
  getOnboardingContext, saveOnboardingContext, getOnboardingStatus,
  EMPLOYEE_JOB_MAP, EMPLOYEE_NAMES,
} from '../lib/employee-engine';

type HubTab = 'tasks' | 'communication' | 'metrics' | 'personality' | 'onboarding';

export function EmployeeHubPage() {
  const auth = useAuth();
  const [tab, setTab] = useState<HubTab>('tasks');
  const hiredEmployees = AI_EMPLOYEES.filter(e => auth.hiredEmployees.includes(e.id));
  const [selectedEmpId, setSelectedEmpId] = useState(hiredEmployees[0]?.id || 'atlas');

  const tabs: { id: HubTab; label: string; icon: string }[] = [
    { id: 'tasks', label: 'Task Pipelines', icon: '⚡' },
    { id: 'communication', label: 'Communication', icon: '💬' },
    { id: 'metrics', label: 'Metrics', icon: '📊' },
    { id: 'personality', label: 'Personality', icon: '🎭' },
    { id: 'onboarding', label: 'Onboarding', icon: '🎓' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pt-24 pb-12 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Employee Hub</h1>
          <p className="text-sm text-gray-500 mt-1">Manage task execution, communication, metrics, personality, and onboarding</p>
        </div>

        {/* Employee Selector */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {(hiredEmployees.length > 0 ? hiredEmployees : AI_EMPLOYEES.slice(0, 5)).map(emp => (
            <button key={emp.id} onClick={() => setSelectedEmpId(emp.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all whitespace-nowrap cursor-pointer ${
                selectedEmpId === emp.id ? 'bg-yellow-50 border-yellow-400 text-black' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}>
              <img src={emp.avatar} alt="" className="w-6 h-6 rounded-full" style={{ background: '#fde68a' }} />
              {emp.name}
            </button>
          ))}
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 border border-gray-200 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border-none whitespace-nowrap ${
                tab === t.id ? 'bg-yellow-400 text-black' : 'bg-transparent text-gray-500 hover:text-black hover:bg-gray-50'
              }`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'tasks' && <TaskPipelinesTab employeeId={selectedEmpId} />}
        {tab === 'communication' && <CommunicationTab employeeId={selectedEmpId} hiredEmployees={hiredEmployees.length > 0 ? hiredEmployees : AI_EMPLOYEES.slice(0, 5)} />}
        {tab === 'metrics' && <MetricsTab employeeId={selectedEmpId} />}
        {tab === 'personality' && <PersonalityTab employeeId={selectedEmpId} />}
        {tab === 'onboarding' && <OnboardingTab employeeId={selectedEmpId} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// 1. TASK PIPELINES TAB
// ══════════════════════════════════════

function TaskPipelinesTab({ employeeId }: { employeeId: string }) {
  const [pipelines, setPipelines] = useState<Record<string, TaskPipeline>>({});
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [task, setTask] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TaskExecutionResult | null>(null);
  const [history, setHistory] = useState<TaskExecutionResult[]>([]);

  useEffect(() => {
    getTaskPipelines(employeeId).then(setPipelines);
    setHistory(getLocalTaskHistory(employeeId));
    setResult(null);
    setSelectedPipeline(null);
  }, [employeeId]);

  const runPipeline = async () => {
    if (!selectedPipeline || !task.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await executeTask(employeeId, selectedPipeline, task);
      setResult(res);
      setHistory(getLocalTaskHistory(employeeId));
    } catch (err: any) {
      setResult({ executionId: 'error', employeeId, employeeName: '', pipeline: selectedPipeline, status: 'failed', steps: [{ step: 'Error', status: 'failed', output: { error: err.message }, durationMs: 0 }], totalDurationMs: 0, estimatedTime: '' });
    }
    setRunning(false);
  };

  const pipelineEntries = Object.entries(pipelines);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card">
          <h3 className="font-bold mb-3">Available Pipelines for {EMPLOYEE_NAMES[employeeId]}</h3>
          {pipelineEntries.length === 0 ? (
            <p className="text-sm text-gray-400">No pipelines available for this role.</p>
          ) : (
            <div className="space-y-2">
              {pipelineEntries.map(([id, pipeline]) => (
                <button key={id} onClick={() => setSelectedPipeline(id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedPipeline === id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                      <p className="text-xs text-gray-500 mt-1">{pipeline.steps.length} steps · {pipeline.estimatedTime}</p>
                    </div>
                    <div className="flex gap-1">
                      {pipeline.steps.map((s, i) => (
                        <div key={i} className="w-2 h-2 rounded-full bg-yellow-400" title={s.name} />
                      ))}
                    </div>
                  </div>
                  {selectedPipeline === id && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {pipeline.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                          <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">{i + 1}</span>
                          <span className="font-medium">{step.name}</span>
                          <span className="text-gray-400">— {step.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedPipeline && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="text-sm font-medium block mb-2">Describe the task:</label>
              <textarea value={task} onChange={e => setTask(e.target.value)} rows={3} placeholder="e.g., Build a REST API for user authentication with JWT..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
              <button onClick={runPipeline} disabled={running || !task.trim()}
                className="btn-gold mt-3 px-6 py-2.5 text-sm disabled:opacity-50">
                {running ? 'Running Pipeline...' : 'Execute Pipeline'}
              </button>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className={`card border-l-4 ${result.status === 'completed' ? 'border-l-green-500' : result.status === 'partial' ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">Execution Result</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                result.status === 'completed' ? 'bg-green-100 text-green-700' : result.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>{result.status}</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Total time: {Math.round(result.totalDurationMs)}ms</p>
            <div className="space-y-2">
              {result.steps.map((step, i) => (
                <div key={i} className={`p-3 rounded-lg text-xs ${step.status === 'completed' ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{step.status === 'completed' ? '✅' : '❌'}</span>
                    <span className="font-semibold">{step.step}</span>
                    <span className="text-gray-400 ml-auto">{Math.round(step.durationMs)}ms</span>
                  </div>
                  {step.output?.content && <p className="text-gray-600 mt-1 whitespace-pre-wrap">{typeof step.output.content === 'string' ? step.output.content.slice(0, 300) : JSON.stringify(step.output).slice(0, 300)}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* History sidebar */}
      <div className="card h-fit">
        <h3 className="font-bold text-sm mb-3">Recent Tasks</h3>
        {history.length === 0 ? (
          <p className="text-xs text-gray-400">No task history yet. Run a pipeline to see results here.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.slice(0, 15).map((t, i) => (
              <div key={i} className="p-2 rounded-lg bg-gray-50 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.pipeline.replace(/_/g, ' ')}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    t.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{t.status}</span>
                </div>
                <p className="text-gray-400 mt-0.5">{Math.round(t.totalDurationMs)}ms · {t.steps.length} steps</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// 2. COMMUNICATION TAB
// ══════════════════════════════════════

function CommunicationTab({ employeeId, hiredEmployees }: { employeeId: string; hiredEmployees: typeof AI_EMPLOYEES }) {
  const [messages, setMessages] = useState<InterEmployeeMessage[]>([]);
  const [toEmpId, setToEmpId] = useState('');
  const [msgType, setMsgType] = useState('request');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [handoffMode, setHandoffMode] = useState(false);
  const [handoffTask, setHandoffTask] = useState('');
  const [handoffContext, setHandoffContext] = useState('');
  const [handoffPriority, setHandoffPriority] = useState('medium');

  useEffect(() => {
    getInterEmployeeMessages(employeeId).then(setMessages);
  }, [employeeId]);

  const otherEmployees = hiredEmployees.filter(e => e.id !== employeeId);

  const sendMsg = async () => {
    if (!toEmpId || !content.trim()) return;
    setSending(true);
    await sendInterEmployeeMessage(employeeId, toEmpId, msgType, subject, content);
    setContent(''); setSubject('');
    const updated = await getInterEmployeeMessages(employeeId);
    setMessages(updated);
    setSending(false);
  };

  const doHandoff = async () => {
    if (!toEmpId || !handoffTask.trim()) return;
    setSending(true);
    await performHandoff(employeeId, toEmpId, handoffTask, handoffContext, handoffPriority);
    setHandoffTask(''); setHandoffContext('');
    const updated = await getInterEmployeeMessages(employeeId);
    setMessages(updated);
    setSending(false);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setHandoffMode(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none transition-all ${!handoffMode ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-600'}`}>Send Message</button>
          <button onClick={() => setHandoffMode(true)} className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border-none transition-all ${handoffMode ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-600'}`}>Task Handoff</button>
        </div>

        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 block mb-1">From: {EMPLOYEE_NAMES[employeeId]}</label>
          <label className="text-xs font-medium text-gray-500 block mb-1 mt-2">To:</label>
          <select value={toEmpId} onChange={e => setToEmpId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400">
            <option value="">Select employee...</option>
            {otherEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
            ))}
          </select>
        </div>

        {!handoffMode ? (
          <>
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">Type:</label>
              <div className="flex gap-1">
                {['request', 'feedback', 'data_share', 'escalation'].map(t => (
                  <button key={t} onClick={() => setMsgType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer border-none transition-all ${
                      msgType === t ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-50 text-gray-500'
                    }`}>{t.replace('_', ' ')}</button>
                ))}
              </div>
            </div>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3} placeholder="Message content..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
            <button onClick={sendMsg} disabled={sending || !toEmpId || !content.trim()}
              className="btn-gold mt-3 px-5 py-2 text-sm disabled:opacity-50">{sending ? 'Sending...' : 'Send Message'}</button>
          </>
        ) : (
          <>
            <textarea value={handoffTask} onChange={e => setHandoffTask(e.target.value)} rows={2} placeholder="Task to hand off..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
            <textarea value={handoffContext} onChange={e => setHandoffContext(e.target.value)} rows={2} placeholder="Context and notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">Priority:</label>
              <div className="flex gap-1">
                {['low', 'medium', 'high'].map(p => (
                  <button key={p} onClick={() => setHandoffPriority(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer border-none transition-all ${
                      handoffPriority === p ? (p === 'high' ? 'bg-red-100 text-red-700' : p === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700') : 'bg-gray-50 text-gray-500'
                    } font-medium`}>{p}</button>
                ))}
              </div>
            </div>
            <button onClick={doHandoff} disabled={sending || !toEmpId || !handoffTask.trim()}
              className="btn-gold px-5 py-2 text-sm disabled:opacity-50">{sending ? 'Handing off...' : 'Hand Off Task'}</button>
          </>
        )}
      </div>

      {/* Message History */}
      <div className="card">
        <h3 className="font-bold text-sm mb-3">Message History</h3>
        {messages.length === 0 ? (
          <p className="text-xs text-gray-400">No messages yet between employees.</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {messages.slice(0, 30).map(msg => (
              <div key={msg.id} className={`p-3 rounded-xl text-xs border ${
                msg.type === 'handoff' ? 'border-purple-200 bg-purple-50' :
                msg.type === 'escalation' ? 'border-red-200 bg-red-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{msg.fromName} → {msg.toName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    msg.type === 'handoff' ? 'bg-purple-200 text-purple-700' :
                    msg.type === 'escalation' ? 'bg-red-200 text-red-700' :
                    msg.type === 'feedback' ? 'bg-blue-200 text-blue-700' :
                    'bg-gray-200 text-gray-600'
                  }`}>{msg.type}</span>
                </div>
                {msg.subject && <p className="font-medium text-gray-700">{msg.subject}</p>}
                <p className="text-gray-600 mt-1">{msg.content.slice(0, 150)}</p>
                <p className="text-gray-400 mt-1 text-[10px]">{new Date(msg.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// 3. METRICS TAB
// ══════════════════════════════════════

function MetricsTab({ employeeId }: { employeeId: string }) {
  const [metrics, setMetrics] = useState<EmployeeMetrics[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getEmployeeMetrics(),
      getLeaderboard(),
    ]).then(([m, l]) => {
      setMetrics(m);
      setLeaderboard(l);
      setLoading(false);
    });
  }, [employeeId]);

  const currentEmp = metrics.find(m => m.employeeId === employeeId);

  return (
    <div className="space-y-6">
      {/* Highlighted employee */}
      <div className="card bg-gradient-to-r from-yellow-50 to-white border-yellow-200">
        <h3 className="font-bold mb-4">{EMPLOYEE_NAMES[employeeId]} — Performance</h3>
        {currentEmp ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Tasks Completed" value={String(currentEmp.tasksCompleted)} color="text-green-600" />
            <MetricCard label="Success Rate" value={`${currentEmp.successRate}%`} color={currentEmp.successRate >= 90 ? 'text-green-600' : 'text-yellow-600'} />
            <MetricCard label="Avg Response" value={`${currentEmp.avgResponseTimeMs}ms`} color="text-blue-600" />
            <MetricCard label="Tools Used" value={String(currentEmp.toolsUsed)} color="text-purple-600" />
          </div>
        ) : (
          <p className="text-sm text-gray-400">No metrics recorded yet. Execute a task pipeline to start tracking performance.</p>
        )}
      </div>

      {/* Leaderboard */}
      <div className="card">
        <h3 className="font-bold mb-4">Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-gray-400">No data yet. Metrics are tracked as employees complete tasks.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="pb-2 pl-2">#</th>
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Tasks</th>
                  <th className="pb-2">Success</th>
                  <th className="pb-2">Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry: any, i: number) => (
                  <tr key={entry.employeeId || i} className={`border-b border-gray-100 ${entry.employeeId === employeeId ? 'bg-yellow-50' : ''}`}>
                    <td className="py-2 pl-2 font-bold text-gray-400">{entry.rank || i + 1}</td>
                    <td className="py-2 font-medium">{entry.employeeName}</td>
                    <td className="py-2">{entry.tasksCompleted}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.successRate >= 90 ? 'bg-green-100 text-green-700' : entry.successRate >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>{entry.successRate}%</span>
                    </td>
                    <td className="py-2 text-gray-500">{entry.avgResponseTimeMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Employee Overview */}
      {metrics.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4">All Employees</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.map(m => (
              <div key={m.employeeId} className={`p-4 rounded-xl border ${m.employeeId === employeeId ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">{m.employeeName}</span>
                  <span className="text-[10px] text-gray-400">{EMPLOYEE_JOB_MAP[m.employeeId]}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-400">Tasks:</span> <span className="font-medium">{m.tasksCompleted}</span></div>
                  <div><span className="text-gray-400">Success:</span> <span className="font-medium">{m.successRate}%</span></div>
                  <div><span className="text-gray-400">Avg time:</span> <span className="font-medium">{m.avgResponseTimeMs}ms</span></div>
                  <div><span className="text-gray-400">Tools:</span> <span className="font-medium">{m.toolsUsed}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// ══════════════════════════════════════
// 4. PERSONALITY TAB
// ══════════════════════════════════════

function PersonalityTab({ employeeId }: { employeeId: string }) {
  const [config, setConfig] = useState<PersonalityConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPersonalityConfig(employeeId).then(setConfig);
    setSaved(false);
  }, [employeeId]);

  const updateField = (key: keyof PersonalityConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
    setSaved(false);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    await updatePersonalityConfig(employeeId, config);
    setSaving(false);
    setSaved(true);
  };

  if (!config) return <div className="card"><p className="text-sm text-gray-400">Loading personality config...</p></div>;

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold mb-4">Personality Settings — {EMPLOYEE_NAMES[employeeId]}</h3>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 block mb-2">Tone</label>
          <div className="flex gap-2">
            {(['formal', 'direct', 'friendly', 'casual'] as const).map(tone => (
              <button key={tone} onClick={() => updateField('tone', tone)}
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer border-none transition-all ${
                  config.tone === tone ? 'bg-yellow-400 text-black font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{tone}</button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 block mb-2">Response Style</label>
          <div className="flex gap-2">
            {(['concise', 'balanced', 'detailed'] as const).map(style => (
              <button key={style} onClick={() => updateField('responseStyle', style)}
                className={`px-4 py-2 rounded-lg text-sm cursor-pointer border-none transition-all ${
                  config.responseStyle === style ? 'bg-yellow-400 text-black font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{style}</button>
            ))}
          </div>
        </div>

        {[
          { key: 'formality' as const, label: 'Formality', low: 'Casual', high: 'Formal' },
          { key: 'verbosity' as const, label: 'Verbosity', low: 'Brief', high: 'Detailed' },
          { key: 'humor' as const, label: 'Humor', low: 'Serious', high: 'Humorous' },
          { key: 'assertiveness' as const, label: 'Assertiveness', low: 'Gentle', high: 'Assertive' },
          { key: 'empathy' as const, label: 'Empathy', low: 'Analytical', high: 'Empathetic' },
        ].map(({ key, label, low, high }) => (
          <div key={key} className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-500">{label}</label>
              <span className="text-xs text-gray-400">{Math.round(config[key] * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 w-16">{low}</span>
              <input type="range" min="0" max="100" value={Math.round(config[key] * 100)}
                onChange={e => updateField(key, parseInt(e.target.value) / 100)}
                className="flex-1 accent-yellow-500" />
              <span className="text-[10px] text-gray-400 w-16 text-right">{high}</span>
            </div>
          </div>
        ))}

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 block mb-1">Custom Instructions</label>
          <textarea value={config.customInstructions} onChange={e => updateField('customInstructions', e.target.value)}
            rows={3} placeholder="e.g., Always reference our brand name. Use metric units. Avoid jargon..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
        </div>

        <button onClick={save} disabled={saving} className="btn-gold px-6 py-2.5 text-sm disabled:opacity-50">
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Personality'}
        </button>
      </div>

      {/* Preview */}
      <div className="card bg-gray-50">
        <h3 className="font-bold text-sm mb-3">Preview</h3>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-400 mb-2">How {EMPLOYEE_NAMES[employeeId]} will respond:</p>
          <div className="text-sm text-gray-700 leading-relaxed">
            {config.tone === 'formal' && <p>Good morning. I have completed the analysis of the requested data. The key findings are as follows: revenue increased by 12.7% month-over-month, driven primarily by enterprise segment growth.</p>}
            {config.tone === 'casual' && <p>Hey! Just finished crunching the numbers — revenue is up 12.7% MoM! Enterprise segment is killing it. Want me to dig deeper into the trends?</p>}
            {config.tone === 'friendly' && <p>Hi there! Great news on the revenue front — we're up 12.7% this month! The enterprise segment has been a major driver. I'd love to walk you through the details whenever you're ready.</p>}
            {config.tone === 'direct' && <p>Revenue: +12.7% MoM. Enterprise segment is the driver. Three action items: 1) Scale enterprise outreach. 2) Investigate SMB churn spike. 3) Increase content production for organic growth.</p>}
          </div>
        </div>
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-gray-500">Response style:</span><span className="font-medium">{config.responseStyle}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Tone:</span><span className="font-medium">{config.tone}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Formality:</span><span className="font-medium">{Math.round(config.formality * 100)}%</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Verbosity:</span><span className="font-medium">{Math.round(config.verbosity * 100)}%</span></div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// 5. ONBOARDING TAB
// ══════════════════════════════════════

function OnboardingTab({ employeeId }: { employeeId: string }) {
  const [context, setContext] = useState<OnboardingContext>({
    companyName: '', industry: '', companySize: '', products: '',
    targetAudience: '', brandVoice: '', competitors: '',
    keyMetrics: '', techStack: '', customContext: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<{ totalEmployees: number; onboarded: number; percentComplete: number } | null>(null);

  useEffect(() => {
    getOnboardingContext(employeeId).then(ctx => {
      if (ctx) setContext(ctx);
      else setContext({ companyName: '', industry: '', companySize: '', products: '', targetAudience: '', brandVoice: '', competitors: '', keyMetrics: '', techStack: '', customContext: '' });
    });
    getOnboardingStatus().then(setStatus);
    setSaved(false);
  }, [employeeId]);

  const updateField = (key: keyof OnboardingContext, value: string) => {
    setContext(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await saveOnboardingContext(employeeId, context);
    setStatus(await getOnboardingStatus());
    setSaving(false);
    setSaved(true);
  };

  const fields: { key: keyof OnboardingContext; label: string; placeholder: string; rows?: number }[] = [
    { key: 'companyName', label: 'Company Name', placeholder: 'e.g., Acme Corporation' },
    { key: 'industry', label: 'Industry', placeholder: 'e.g., B2B SaaS, E-commerce, Healthcare' },
    { key: 'companySize', label: 'Company Size', placeholder: 'e.g., 50-200 employees, Series B startup' },
    { key: 'products', label: 'Products / Services', placeholder: 'e.g., Cloud-based project management platform', rows: 2 },
    { key: 'targetAudience', label: 'Target Audience', placeholder: 'e.g., Mid-market engineering teams, CTOs at Series A-C companies', rows: 2 },
    { key: 'brandVoice', label: 'Brand Voice', placeholder: 'e.g., Professional but approachable, data-driven, no jargon' },
    { key: 'competitors', label: 'Competitors', placeholder: 'e.g., Asana, Monday.com, Linear' },
    { key: 'keyMetrics', label: 'Key Metrics', placeholder: 'e.g., ARR, NRR, DAU/MAU, NPS, CAC, LTV' },
    { key: 'techStack', label: 'Tech Stack', placeholder: 'e.g., React, Node.js, PostgreSQL, AWS, Stripe' },
    { key: 'customContext', label: 'Additional Context', placeholder: 'Any other context this employee should know about your company...', rows: 3 },
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card">
        <h3 className="font-bold mb-2">Onboard {EMPLOYEE_NAMES[employeeId]}</h3>
        <p className="text-xs text-gray-500 mb-4">Teach this AI employee about your company so it can tailor responses to your context.</p>

        <div className="space-y-3">
          {fields.map(({ key, label, placeholder, rows }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
              {rows && rows > 1 ? (
                <textarea value={context[key]} onChange={e => updateField(key, e.target.value)} rows={rows} placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
              ) : (
                <input value={context[key]} onChange={e => updateField(key, e.target.value)} placeholder={placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              )}
            </div>
          ))}
        </div>

        <button onClick={save} disabled={saving} className="btn-gold mt-4 px-6 py-2.5 text-sm disabled:opacity-50">
          {saving ? 'Saving...' : saved ? 'Saved! Employee Onboarded' : 'Save & Onboard'}
        </button>
      </div>

      {/* Status sidebar */}
      <div className="space-y-4">
        <div className="card">
          <h3 className="font-bold text-sm mb-3">Onboarding Progress</h3>
          {status ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none" stroke="#FBCC00" strokeWidth="3" strokeDasharray={`${status.percentComplete}, 100`} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{status.percentComplete}%</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">{status.onboarded} / {status.totalEmployees}</p>
                  <p className="text-xs text-gray-500">employees onboarded</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400">Loading status...</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-bold text-sm mb-2">Why Onboard?</h3>
          <div className="text-xs text-gray-600 space-y-2">
            <p>Onboarded employees tailor their responses to your company context, including your products, audience, brand voice, and metrics.</p>
            <p>This means more relevant code, more targeted marketing copy, better sales outreach, and support responses that match your brand.</p>
            <p>You can onboard each employee individually with role-specific context, or apply the same context across all employees.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
