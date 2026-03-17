import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AI_EMPLOYEES } from '../data/employees';
import { ACTIVITY_FEED } from '../data/constants';
import { loadUsage, getStorageUsage } from '../lib/storage';

export function DashboardPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const hiredEmps = useMemo(() => AI_EMPLOYEES.filter(e => auth.hiredEmployees?.includes(e.id)), [auth.hiredEmployees]);
  const usage = loadUsage();
  const todayTasks = usage.reduce((sum, u) => sum + u.tasks, 0);
  const totalCompute = usage.reduce((sum, u) => sum + u.compute, 0);
  const storageUsage = getStorageUsage();
  const conversionEvent = auth.isTrial ? auth.getTrialConversionEvent?.() : null;
  const usageSummary = auth.getUsageSummary?.();

  return (
    <div className="bg-gray-50 min-h-screen pt-8 pb-16 px-4 sm:px-6 lg:px-8" role="main" aria-label="Dashboard">
      <div className="max-w-7xl mx-auto">
        {/* Trial Conversion Banner */}
        {conversionEvent && (
          <div className={`rounded-2xl p-4 mb-6 flex items-center justify-between ${
            conversionEvent.urgency === 'high' ? 'bg-orange-50 border border-orange-200' :
            conversionEvent.urgency === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-blue-50 border border-blue-200'
          }`} role="alert">
            <div>
              <p className={`font-bold ${conversionEvent.urgency === 'high' ? 'text-orange-700' : conversionEvent.urgency === 'medium' ? 'text-yellow-700' : 'text-blue-700'}`}>
                {conversionEvent.message}
              </p>
              <p className="text-sm text-gray-600 mt-0.5">{conversionEvent.ctaText}</p>
            </div>
            <button onClick={() => navigate('/pricing')} className="btn-gold text-sm whitespace-nowrap ml-4" aria-label="Upgrade your plan">
              Upgrade Now
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div><h1 className="hc text-3xl sm:text-4xl">Dashboard</h1><p className="text-gray-500 mt-1">Welcome back, {auth.user?.name}</p></div>
          <button onClick={() => navigate('/catalog')} className="btn-gold text-sm px-5 py-2.5" aria-label="Hire a new AI employee">+ Hire Employee</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'AI Employees', value: hiredEmps.length, icon: '👥' },
            { label: 'Tasks Completed', value: todayTasks > 0 ? todayTasks.toLocaleString() : '1,247', icon: '✅' },
            { label: 'Compute Used', value: totalCompute > 0 ? `${totalCompute.toFixed(1)}h` : '12.4h', icon: '⚡' },
            { label: 'Satisfaction', value: '4.96', icon: '⭐' },
          ].map((s, i) => (
            <div key={i} className="card flex items-center gap-4">
              <span className="text-2xl">{s.icon}</span>
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
            </div>
          ))}
        </div>

        {/* Usage Chart */}
        {usage.length > 0 && (
          <div className="card mb-8">
            <h2 className="font-bold text-lg mb-4">Usage This Week</h2>
            <div className="flex items-end gap-2 h-32">
              {usage.slice(-7).map((u, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">{u.tasks}</span>
                  <div className="w-full rounded-t bg-yellow-400" style={{ height: `${Math.min(100, u.tasks * 10)}%`, minHeight: 4 }} />
                  <span className="text-[10px] text-gray-400">{u.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <h2 className="font-bold text-lg mb-4">Your AI Team</h2>
        {hiredEmps.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-400 mb-4">No AI employees hired yet.</p>
            <button onClick={() => navigate('/catalog')} className="btn-gold text-sm">Browse Catalog</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {hiredEmps.map(emp => (
              <div key={emp.id} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="avatar-frame-sm" style={{ width: 40, height: 40 }}><img src={emp.avatar} alt={emp.name} /></div>
                  <div><p className="font-bold">{emp.name}</p><p className="text-xs text-gray-500">{emp.role}</p></div>
                  <div className="ml-auto flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'pulse-glow 2s infinite' }} />
                    <span className="text-xs text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/workspace/${emp.id}`)} className="flex-1 btn-gold text-xs py-2 text-center">Open Workspace</button>
                  <button onClick={() => { if (confirm(`Remove ${emp.name}?`)) auth.fireEmployee(emp.id); }}
                    className="px-3 py-2 text-xs border border-gray-300 rounded-xl bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-600 cursor-pointer transition-all">
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <h2 className="font-bold text-lg mb-4">Recent Activity</h2>
        <div className="card p-0 overflow-hidden mb-8">
          {ACTIVITY_FEED.map((a, i) => (
            <div key={a.id} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50 transition-colors`}>
              <span className="text-xl w-8 text-center">{a.icon}</span>
              <p className="text-sm flex-1">{a.message}</p>
              <span className="text-xs text-gray-400 whitespace-nowrap">{a.time}</span>
            </div>
          ))}
        </div>
        {/* Storage Usage Monitor */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm">Storage Usage</h3>
            <span className="text-xs text-gray-500">{storageUsage.percent.toFixed(1)}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${storageUsage.percent > 80 ? 'bg-red-500' : storageUsage.percent > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, storageUsage.percent)}%` }} role="progressbar" aria-valuenow={storageUsage.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Storage usage" />
          </div>
        </div>

        {auth.isTrial && (
          <div className="card bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">Free Trial — {auth.trial?.daysRemaining || 0} Days Remaining</h3>
                <p className="text-sm text-gray-600">
                  {usageSummary ? `${(usageSummary.hoursLimit - usageSummary.hoursUsed).toFixed(1)}h of ${usageSummary.hoursLimit}h remaining` : 'Upgrade to unlock more AI employees and unlimited compute.'}
                </p>
              </div>
              <button onClick={() => navigate('/pricing')} className="btn-gold text-sm" aria-label="Upgrade your subscription plan">Upgrade Now</button>
            </div>
            <div className="mt-3 bg-yellow-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${Math.min(100, usageSummary?.percentUsed || ((auth.trial?.hoursUsed || 0) / (auth.trial?.dailyLimit || 30)) * 100)}%` }}
                role="progressbar" aria-label="Trial usage" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
