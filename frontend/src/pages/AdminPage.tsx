import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import { SUBSCRIBERS, FLEET_CONFIG, MODELS, ERROR_LOGS, PLANS } from '../data/constants';
import type { Subscriber, FleetConfig } from '../data/types';
import { loadAuditLog, addAuditEntry, exportAllData, getStorageUsage } from '../lib/storage';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const revenueData = [
  { month: 'Oct', mrr: 18400, newSubs: 32, churn: 4 },
  { month: 'Nov', mrr: 21200, newSubs: 41, churn: 5 },
  { month: 'Dec', mrr: 24800, newSubs: 38, churn: 3 },
  { month: 'Jan', mrr: 28900, newSubs: 52, churn: 6 },
  { month: 'Feb', mrr: 33100, newSubs: 48, churn: 4 },
  { month: 'Mar', mrr: 38500, newSubs: 61, churn: 3 },
];
const planDist = [
  { name: 'Starter', value: 34, color: '#6366f1' },
  { name: 'Growth', value: 52, color: '#FBCC00' },
  { name: 'Enterprise', value: 14, color: '#0F0F0F' },
];
const computeData = [
  { hour: '00', gpu: 34, cpu: 62 }, { hour: '04', gpu: 28, cpu: 55 },
  { hour: '08', gpu: 78, cpu: 89 }, { hour: '12', gpu: 92, cpu: 95 },
  { hour: '16', gpu: 85, cpu: 91 }, { hour: '20', gpu: 56, cpu: 72 },
];

const PAGE_SIZE = 10;
type AdminTab = 'overview' | 'subscribers' | 'fleet' | 'logs' | 'security' | 'audit';
type SortField = 'name' | 'spend' | 'employees';
type SortDir = 'asc' | 'desc';

export function AdminPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [subs, setSubs] = useState<Subscriber[]>([...SUBSCRIBERS]);
  const [fleet, setFleet] = useState<FleetConfig[]>([...FLEET_CONFIG]);
  const [subSearch, setSubSearch] = useState('');
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [subPage, setSubPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [auditLog] = useState(() => loadAuditLog());
  const storageUsage = getStorageUsage();

  if (!auth.isLoggedIn || auth.status !== 'admin') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="card text-center">
          <h2 className="hc text-2xl mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">Admin credentials required.</p>
          <button onClick={() => navigate('/login')} className="btn-gold">Sign In</button>
        </div>
      </div>
    );
  }

  const totalMRR = revenueData[revenueData.length - 1].mrr;
  const totalSubs = subs.filter(s => s.acctStatus === 'active').length;
  const totalEmployees = subs.reduce((a, s) => a + s.employees, 0);
  const totalSpend = subs.reduce((a, s) => a + s.spend, 0);

  // Filtered + sorted + paginated subscribers
  const filteredSubs = useMemo(() => {
    let result = subs.filter(s =>
      s.name.toLowerCase().includes(subSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(subSearch.toLowerCase())
    );
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return 0;
    });
    return result;
  }, [subs, subSearch, sortField, sortDir]);
  const totalPages = Math.ceil(filteredSubs.length / PAGE_SIZE);
  const pagedSubs = filteredSubs.slice(subPage * PAGE_SIZE, (subPage + 1) * PAGE_SIZE);

  const filteredLogs = logFilter === 'all' ? ERROR_LOGS : ERROR_LOGS.filter(l => l.severity === logFilter);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const updateSub = (id: string, field: keyof Subscriber, value: any) => {
    setSubs(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    addAuditEntry('subscriber_update', auth.user?.email || 'admin', id, `Updated ${field} for ${id}`);
  };
  const suspendSub = (id: string) => {
    const sub = subs.find(s => s.id === id);
    const newStatus = sub?.acctStatus === 'suspended' ? 'active' : 'suspended';
    setSubs(prev => prev.map(s => s.id === id ? { ...s, acctStatus: newStatus, employees: newStatus === 'suspended' ? 0 : s.employees, maxEmp: newStatus === 'suspended' ? 0 : s.maxEmp } : s));
    addAuditEntry('subscriber_suspend', auth.user?.email || 'admin', id, `${newStatus === 'suspended' ? 'Suspended' : 'Activated'} account ${sub?.name}`);
    notify.addToast('success', 'Updated', `Account ${newStatus}.`);
  };
  const updateFleet = (jobType: string, field: keyof FleetConfig, value: any) => {
    setFleet(prev => prev.map(f => f.jobType === jobType ? { ...f, [field]: value } : f));
    addAuditEntry('fleet_update', auth.user?.email || 'admin', jobType, `Updated ${field} for ${jobType}`);
  };
  const toggleFleet = (jobType: string) => {
    setFleet(prev => prev.map(f => f.jobType === jobType ? { ...f, enabled: !f.enabled } : f));
    addAuditEntry('fleet_toggle', auth.user?.email || 'admin', jobType, `Toggled fleet ${jobType}`);
    notify.addToast('success', 'Fleet Updated', 'Configuration saved.');
  };

  const handleExportData = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nexushr-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    addAuditEntry('data_export', auth.user?.email || 'admin', 'system', 'Full data export');
    notify.addToast('success', 'Exported', 'Platform data downloaded.');
  };

  const handleExportCSV = () => {
    const headers = 'Organization,Email,Plan,Status,Employees,Max,Spend\n';
    const rows = subs.map(s => `"${s.name}","${s.email}","${s.plan || 'Trial'}","${s.acctStatus}",${s.employees},${s.maxEmp},$${s.spend}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    addAuditEntry('csv_export', auth.user?.email || 'admin', 'subscribers', 'Subscriber CSV export');
    notify.addToast('success', 'Exported', 'CSV downloaded.');
  };

  const tabs: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'subscribers', label: 'Subscribers', icon: '👥' },
    { key: 'fleet', label: 'Fleet', icon: '🤖' },
    { key: 'logs', label: 'Logs', icon: '📋' },
    { key: 'audit', label: 'Audit Trail', icon: '🔍' },
    { key: 'security', label: 'Security', icon: '🔒' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#f8f8f8' }}>
      <div className="bg-[#0F0F0F] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="hc text-xl tracking-wider">NEXUSHR</span>
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">ADMIN</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleExportData} className="text-xs text-gray-400 hover:text-white bg-transparent border border-gray-600 px-3 py-1 rounded-lg cursor-pointer transition-all" aria-label="Export all data">📥 Export Data</button>
            <span className="text-sm text-gray-400">{auth.user?.email}</span>
            <button onClick={() => { auth.logout(); navigate('/'); }} className="text-sm text-gray-400 hover:text-white bg-transparent border-none cursor-pointer">Logout</button>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-1 overflow-x-auto" role="tablist">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} role="tab" aria-selected={tab === t.key}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all bg-transparent cursor-pointer whitespace-nowrap ${tab === t.key ? 'border-yellow-400 text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Monthly Revenue', value: `$${totalMRR.toLocaleString()}`, change: '+16.3%', up: true },
                { label: 'Active Orgs', value: totalSubs.toString(), change: '+12', up: true },
                { label: 'Deployed AI Employees', value: totalEmployees.toString(), change: '+8', up: true },
                { label: 'Lifetime Revenue', value: `$${totalSpend.toLocaleString()}`, change: '', up: true },
              ].map((kpi, i) => (
                <div key={i} className="card">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{kpi.label}</p>
                  <p className="hc text-3xl">{kpi.value}</p>
                  {kpi.change && <p className={`text-xs mt-1 ${kpi.up ? 'text-green-600' : 'text-red-600'}`}>{kpi.change} this month</p>}
                </div>
              ))}
            </div>

            {/* Storage usage */}
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm">Client Storage Usage</h3>
                <span className="text-xs text-gray-500">{(storageUsage.used / 1024).toFixed(1)} KB / {(storageUsage.total / 1024 / 1024).toFixed(0)} MB</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full ${storageUsage.percent > 80 ? 'bg-red-500' : storageUsage.percent > 50 ? 'bg-yellow-400' : 'bg-green-500'}`} style={{ width: `${Math.min(100, storageUsage.percent)}%` }} />
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="card lg:col-span-2">
                <h3 className="font-bold text-lg mb-4">MRR Growth</h3>
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Line type="monotone" dataKey="mrr" stroke="#FBCC00" strokeWidth={3} dot={{ r: 5, fill: '#FBCC00' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <h3 className="font-bold text-lg mb-4">Plan Distribution</h3>
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={planDist} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {planDist.map((p, i) => <Cell key={i} fill={p.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {planDist.map(p => (
                    <span key={p.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: p.color }} />
                      {p.name} ({p.value}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-bold text-lg mb-4">New Subscriptions vs Churn</h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="newSubs" name="New" fill="#FBCC00" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="churn" name="Churn" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <h3 className="font-bold text-lg mb-4">Compute Utilization (24h)</h3>
                <div style={{ width: '100%', height: 250 }}>
                  <ResponsiveContainer>
                    <LineChart data={computeData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Legend />
                      <Line type="monotone" dataKey="gpu" name="GPU" stroke="#8b5cf6" strokeWidth={2} />
                      <Line type="monotone" dataKey="cpu" name="CPU" stroke="#06b6d4" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-lg mb-4">Fleet Health</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {fleet.map(f => (
                  <div key={f.jobType} className={`p-4 rounded-xl border ${f.enabled ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{f.icon} {f.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.enabled ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {f.enabled ? 'LIVE' : 'OFF'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between"><span>24h Requests</span><span className="font-medium text-gray-700">{f.stats.req24h.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>Avg Latency</span><span className="font-medium text-gray-700">{f.stats.lat}ms</span></div>
                      <div className="flex justify-between"><span>Error Rate</span><span className={`font-medium ${f.stats.err > 0.1 ? 'text-red-600' : 'text-green-600'}`}>{f.stats.err}%</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUBSCRIBERS TAB with pagination + sorting + export */}
        {tab === 'subscribers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="hc text-2xl">Subscriber Management</h2>
              <div className="flex items-center gap-3">
                <button onClick={handleExportCSV} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 border-none cursor-pointer font-medium transition-all" aria-label="Export subscribers CSV">📥 Export CSV</button>
                <input value={subSearch} onChange={e => { setSubSearch(e.target.value); setSubPage(0); }} placeholder="Search orgs..." aria-label="Search subscribers"
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 w-64 bg-white" />
              </div>
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm" aria-label="Subscribers table">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 font-semibold text-gray-500 cursor-pointer hover:text-black" onClick={() => toggleSort('name')}>
                      Organization {sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="pb-3 font-semibold text-gray-500">Plan</th>
                    <th className="pb-3 font-semibold text-gray-500">Status</th>
                    <th className="pb-3 font-semibold text-gray-500 cursor-pointer hover:text-black" onClick={() => toggleSort('employees')}>
                      Employees {sortField === 'employees' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="pb-3 font-semibold text-gray-500 cursor-pointer hover:text-black" onClick={() => toggleSort('spend')}>
                      Spend {sortField === 'spend' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="pb-3 font-semibold text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSubs.map(s => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-gray-400">{s.email}</div>
                      </td>
                      <td className="py-3">
                        {editingSub === s.id ? (
                          <select value={s.plan || ''} onChange={e => updateSub(s.id, 'plan', e.target.value || null)}
                            className="text-xs border rounded px-2 py-1 bg-white" aria-label="Change plan">
                            <option value="">No Plan</option>
                            {PLANS.map(p => <option key={p.slug} value={p.name}>{p.name}</option>)}
                          </select>
                        ) : (
                          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${s.plan === 'Enterprise' ? 'bg-gray-900 text-white' : s.plan === 'Growth' ? 'bg-yellow-100 text-yellow-800' : s.plan ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                            {s.plan || 'Trial'}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${s.acctStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {s.acctStatus}
                        </span>
                        {s.subStatus === 'past_due' && <span className="ml-1 text-xs text-orange-600 font-bold">Past Due</span>}
                      </td>
                      <td className="py-3 font-medium">{s.employees} / {s.maxEmp}</td>
                      <td className="py-3 font-medium">${s.spend.toLocaleString()}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={() => setEditingSub(editingSub === s.id ? null : s.id)}
                            className="text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors border-none cursor-pointer font-medium">
                            {editingSub === s.id ? 'Done' : 'Edit'}
                          </button>
                          <button onClick={() => suspendSub(s.id)}
                            className={`text-xs px-3 py-1 rounded-lg transition-colors border-none cursor-pointer font-medium ${s.acctStatus === 'suspended' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                            {s.acctStatus === 'suspended' ? 'Activate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">{filteredSubs.length} subscribers · Page {subPage + 1} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setSubPage(p => Math.max(0, p - 1))} disabled={subPage === 0}
                      className="text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Previous page">← Prev</button>
                    <button onClick={() => setSubPage(p => Math.min(totalPages - 1, p + 1))} disabled={subPage >= totalPages - 1}
                      className="text-xs px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Next page">Next →</button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card text-center">
                <p className="text-xs text-gray-500 uppercase mb-1">Active</p>
                <p className="hc text-2xl text-green-600">{subs.filter(s => s.acctStatus === 'active' && s.plan).length}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500 uppercase mb-1">Trial</p>
                <p className="hc text-2xl text-blue-600">{subs.filter(s => s.trialStatus === 'active').length}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500 uppercase mb-1">Past Due</p>
                <p className="hc text-2xl text-orange-600">{subs.filter(s => s.subStatus === 'past_due').length}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500 uppercase mb-1">Suspended</p>
                <p className="hc text-2xl text-red-600">{subs.filter(s => s.acctStatus === 'suspended').length}</p>
              </div>
            </div>
          </div>
        )}

        {/* FLEET TAB */}
        {tab === 'fleet' && (
          <div className="space-y-6">
            <h2 className="hc text-2xl">AI Fleet Management</h2>
            <div className="space-y-4">
              {fleet.map(f => (
                <div key={f.jobType} className="card">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <span className="text-2xl">{f.icon}</span>
                      <div>
                        <h4 className="font-bold">{f.name}</h4>
                        <p className="text-xs text-gray-500">{f.jobType}</p>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Primary Model</label>
                        <select value={f.primary} onChange={e => updateFleet(f.jobType, 'primary', e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
                          {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Fallback Model</label>
                        <select value={f.fallback} onChange={e => updateFleet(f.jobType, 'fallback', e.target.value)}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
                          {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Temperature: {f.temp}</label>
                        <input type="range" min="0" max="1" step="0.1" value={f.temp}
                          onChange={e => updateFleet(f.jobType, 'temp', parseFloat(e.target.value))}
                          className="w-full accent-yellow-400" aria-label={`Temperature for ${f.name}`} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Max Tokens</label>
                        <select value={f.maxTok} onChange={e => updateFleet(f.jobType, 'maxTok', parseInt(e.target.value))}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400">
                          {[2048, 4096, 8192, 16384, 32768, 65536].map(v => <option key={v} value={v}>{v.toLocaleString()}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-xs text-gray-500 space-y-0.5 hidden lg:block">
                        <div>{f.stats.req24h.toLocaleString()} req/24h</div>
                        <div>{f.stats.lat}ms avg</div>
                        <div>${(f.stats.cost / 100).toFixed(0)}/day</div>
                      </div>
                      <button onClick={() => toggleFleet(f.jobType)} aria-label={`Toggle ${f.name}`}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors border-none cursor-pointer ${f.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform shadow-sm ${f.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="font-bold text-lg mb-4">Fleet Cost Summary (24h)</h3>
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={fleet.map(f => ({ name: f.name, cost: f.stats.cost / 100, requests: f.stats.req24h }))} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                    <Tooltip formatter={(v: number) => `$${v.toFixed(0)}`} />
                    <Bar dataKey="cost" name="Cost ($)" fill="#FBCC00" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* LOGS TAB */}
        {tab === 'logs' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="hc text-2xl">Error Logs</h2>
              <div className="flex gap-2" role="radiogroup" aria-label="Log severity filter">
                {(['all', 'error', 'warn', 'info'] as const).map(f => (
                  <button key={f} onClick={() => setLogFilter(f)} role="radio" aria-checked={logFilter === f}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border-none cursor-pointer ${logFilter === f ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="space-y-2">
                {filteredLogs.map((log, i) => (
                  <div key={i} className={`flex items-start gap-4 p-3 rounded-lg ${log.severity === 'error' ? 'bg-red-50' : log.severity === 'warn' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${log.severity === 'error' ? 'bg-red-200 text-red-800' : log.severity === 'warn' ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-200 text-blue-800'}`}>
                      {log.severity.toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{log.error}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{log.type} · {log.model} · {log.ts}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-xs text-gray-500 uppercase mb-1">Errors (24h)</p>
                <p className="hc text-3xl text-red-600">{ERROR_LOGS.filter(l => l.severity === 'error').length}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500 uppercase mb-1">Warnings (24h)</p>
                <p className="hc text-3xl text-yellow-600">{ERROR_LOGS.filter(l => l.severity === 'warn').length}</p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-gray-500 uppercase mb-1">Info (24h)</p>
                <p className="hc text-3xl text-blue-600">{ERROR_LOGS.filter(l => l.severity === 'info').length}</p>
              </div>
            </div>
          </div>
        )}

        {/* AUDIT TRAIL TAB */}
        {tab === 'audit' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="hc text-2xl">Audit Trail</h2>
              <span className="text-xs text-gray-500">{auditLog.length} events recorded</span>
            </div>
            {auditLog.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-400 mb-2">No audit events yet.</p>
                <p className="text-xs text-gray-400">Actions like logins, subscriber changes, and data exports are logged here automatically.</p>
              </div>
            ) : (
              <div className="card">
                <div className="space-y-2">
                  {auditLog.slice().reverse().slice(0, 50).map(entry => (
                    <div key={entry.id} className="flex items-start gap-4 p-3 rounded-lg bg-gray-50">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 mt-0.5 whitespace-nowrap">{entry.action.toUpperCase()}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.details}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{entry.actor} · {entry.target}</p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECURITY TAB */}
        {tab === 'security' && (
          <div className="space-y-6">
            <h2 className="hc text-2xl">Security & Compliance</h2>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="font-bold text-lg mb-4">Compliance Status</h3>
                <div className="space-y-3">
                  {[
                    { name: 'SOC 2 Type II', status: 'In Progress', date: 'Audit scheduled: Q2 2026', ok: false },
                    { name: 'GDPR', status: 'Partial', date: 'DPA template ready, DPO pending', ok: false },
                    { name: 'HIPAA', status: 'Not Started', date: 'BAA template in review', ok: false },
                    { name: 'ISO 27001', status: 'Planned', date: 'Targeting Q4 2026', ok: false },
                    { name: 'PCI DSS', status: 'N/A', date: 'Stripe handles PCI', ok: true },
                  ].map((c, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <span className="font-medium text-sm">{c.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{c.date}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.ok ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <h3 className="font-bold text-lg mb-4">Security Controls</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Input Sanitization', desc: 'XSS prevention on all user inputs', on: true },
                    { name: 'Rate Limiting', desc: 'Login attempts limited to 5 per 15 minutes', on: true },
                    { name: 'Session Tokens', desc: 'Cryptographic random tokens (32 bytes)', on: true },
                    { name: 'Audit Logging', desc: 'All admin actions logged with timestamp', on: true },
                    { name: 'Password Hashing', desc: 'Multi-round client-side hash (PBKDF2-style)', on: true },
                    { name: 'End-to-End Encryption', desc: 'Requires backend — not yet implemented', on: false },
                    { name: 'SSO/SAML', desc: 'Requires backend — planned for Q3', on: false },
                    { name: 'IP Allowlisting', desc: 'Requires backend — planned for enterprise', on: false },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div>
                        <span className="font-medium text-sm">{s.name}</span>
                        <p className="text-xs text-gray-400">{s.desc}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.on ? 'Active' : 'Planned'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card">
              <h3 className="font-bold text-lg mb-4">Recent Auth Events</h3>
              <div className="space-y-2">
                {[
                  { event: 'Admin login', user: 'admin@nexushr.ai', ip: '192.168.1.1', time: '2 min ago', status: 'success' },
                  { event: 'API key generated', user: 'billing@acme.com', ip: '10.0.0.45', time: '18 min ago', status: 'success' },
                  { event: 'Failed login (3 attempts)', user: 'unknown@suspicious.io', ip: '203.0.113.42', time: '34 min ago', status: 'blocked' },
                  { event: 'Password reset', user: 'founder@startupxyz.com', ip: '172.16.0.8', time: '1h ago', status: 'success' },
                  { event: 'SSO session expired', user: 'admin@techforge.io', ip: '10.0.2.18', time: '2h ago', status: 'info' },
                ].map((evt, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${evt.status === 'success' ? 'bg-green-100 text-green-700' : evt.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {evt.status.toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{evt.event}</p>
                      <p className="text-xs text-gray-400">{evt.user} · {evt.ip}</p>
                    </div>
                    <span className="text-xs text-gray-400">{evt.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
