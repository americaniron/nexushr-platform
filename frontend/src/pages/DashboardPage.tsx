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

  const statCards = [
    {
      label: 'AI Employees',
      value: hiredEmps.length,
      icon: '👥',
      iconBg: 'from-blue-600/20 to-blue-700/20',
      iconColor: 'text-blue-400'
    },
    {
      label: 'Tasks Completed',
      value: todayTasks > 0 ? todayTasks.toLocaleString() : '1,247',
      icon: '✅',
      iconBg: 'from-green-600/20 to-green-700/20',
      iconColor: 'text-green-400'
    },
    {
      label: 'Compute Used',
      value: totalCompute > 0 ? `${totalCompute.toFixed(1)}h` : '12.4h',
      icon: '⚡',
      iconBg: 'from-amber-600/20 to-amber-700/20',
      iconColor: 'text-amber-400'
    },
    {
      label: 'Satisfaction',
      value: '4.96',
      icon: '⭐',
      iconBg: 'from-purple-600/20 to-purple-700/20',
      iconColor: 'text-purple-400'
    },
  ];

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getCurrentDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-[#0F0F0F] min-h-screen pt-8 pb-20 px-4 sm:px-6 lg:px-8" role="main" aria-label="Dashboard">
      <style>{`
        @keyframes glow-hover {
          0%, 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.1); }
          50% { box-shadow: 0 0 20px 0 rgba(217, 119, 6, 0.15); }
        }
        @keyframes gold-glow {
          0%, 100% { box-shadow: inset 0 0 20px rgba(217, 119, 6, 0), 0 0 20px rgba(217, 119, 6, 0.2); }
          50% { box-shadow: inset 0 0 20px rgba(217, 119, 6, 0.1), 0 0 30px rgba(217, 119, 6, 0.3); }
        }
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
        .stat-card {
          background: linear-gradient(135deg, rgba(26, 26, 46, 0.8), rgba(26, 26, 46, 0.5));
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          border-color: rgba(217, 119, 6, 0.3);
          background: linear-gradient(135deg, rgba(26, 26, 46, 1), rgba(26, 26, 46, 0.7));
          animation: glow-hover 2s infinite;
        }
        .card-dark {
          background: linear-gradient(135deg, rgba(26, 26, 46, 0.8), rgba(26, 26, 46, 0.5));
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .card-dark:hover {
          border-color: rgba(217, 119, 6, 0.3);
          background: linear-gradient(135deg, rgba(26, 26, 46, 1), rgba(26, 26, 46, 0.7));
        }
        .gradient-bar {
          background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #d97706 100%);
          box-shadow: 0 0 20px rgba(217, 119, 6, 0.3);
        }
        .storage-progress {
          background: linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6);
          box-shadow: 0 0 15px currentColor;
        }
        .trial-banner {
          background: linear-gradient(135deg, rgba(217, 119, 6, 0.1), rgba(217, 119, 6, 0.05));
          border: 1px solid rgba(217, 119, 6, 0.2);
        }
        .activity-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          transition: all 0.2s ease;
        }
        .activity-row:hover {
          background: rgba(217, 119, 6, 0.05);
        }
        .activity-row:last-child {
          border-bottom: none;
        }
        .icon-pill {
          background: rgba(217, 119, 6, 0.1);
          border: 1px solid rgba(217, 119, 6, 0.2);
          border-radius: 0.5rem;
          padding: 0.25rem 0.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .status-glow {
          animation: pulse-ring 2s infinite;
        }
        .btn-dark-outline {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(26, 26, 46, 0.5);
          color: #e5e7eb;
          transition: all 0.3s ease;
        }
        .btn-dark-outline:hover {
          border-color: rgba(217, 119, 6, 0.3);
          background: rgba(217, 119, 6, 0.05);
          color: #fbbf24;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="hc text-4xl sm:text-5xl font-bold">Welcome back, {auth.user?.name || 'Guest'}</h1>
            <button
              onClick={() => navigate('/catalog')}
              className="btn-gold text-sm px-6 py-2.5 font-semibold hover:shadow-lg transition-all"
              aria-label="Hire a new AI employee"
            >
              + Hire Employee
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{getCurrentDate()}</span>
            <span className="text-gray-600">•</span>
            <span>{getCurrentTime()}</span>
          </div>
        </div>

        {/* Trial Conversion Banner */}
        {conversionEvent && (
          <div className="trial-banner rounded-xl p-5 mb-8 flex items-center justify-between backdrop-blur-sm" role="alert">
            <div>
              <p className="text-amber-300 font-bold mb-0.5">{conversionEvent.message}</p>
              <p className="text-sm text-gray-400">{conversionEvent.ctaText}</p>
            </div>
            <button
              onClick={() => navigate('/pricing')}
              className="btn-gold text-sm whitespace-nowrap ml-4 px-5 py-2 font-semibold hover:shadow-lg transition-all"
              aria-label="Upgrade your plan"
            >
              Upgrade Now
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card rounded-xl p-5 group cursor-default">
              <div className="flex items-start justify-between mb-3">
                <div className={`bg-gradient-to-br ${s.iconBg} rounded-lg p-3 group-hover:scale-110 transition-transform duration-300`}>
                  <span className={`text-2xl block ${s.iconColor}`}>{s.icon}</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Usage Chart */}
        {usage.length > 0 && (
          <div className="card-dark rounded-xl p-6 mb-8">
            <h2 className="font-bold text-lg text-white mb-6">Usage This Week</h2>
            <div className="relative">
              {/* Grid background */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute inset-0" style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent calc(100% / 7 - 1px), rgba(217, 119, 6, 0.1) calc(100% / 7 - 1px), rgba(217, 119, 6, 0.1) calc(100% / 7))',
                }} />
              </div>
              <div className="flex items-end justify-between gap-2 h-40 relative z-10">
                {usage.slice(-7).map((u, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-xs text-gray-400 h-5">{u.tasks}</span>
                    <div className="w-full rounded-t-lg gradient-bar group-hover:shadow-2xl transition-all duration-300"
                      style={{
                        height: `${Math.max(20, Math.min(100, u.tasks * 8))}%`,
                        minHeight: 8,
                        opacity: 0.9,
                      }}
                    />
                    <span className="text-xs text-gray-500 h-5">{u.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Your AI Team Section */}
        <div className="mb-8">
          <h2 className="font-bold text-lg text-white mb-4">Your AI Team</h2>
          {hiredEmps.length === 0 ? (
            <div className="card-dark rounded-xl p-12 text-center">
              <p className="text-gray-400 mb-6 text-sm">No AI employees hired yet. Build your dream team today.</p>
              <button
                onClick={() => navigate('/catalog')}
                className="btn-gold text-sm px-6 py-2.5 font-semibold hover:shadow-lg transition-all"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hiredEmps.map(emp => (
                <div key={emp.id} className="card-dark rounded-xl p-5 hover:border-amber-500/50 transition-all duration-300 group">
                  {/* Header with Avatar and Status */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="avatar-frame-sm w-12 h-12 rounded-lg ring-2 ring-amber-500/30 group-hover:ring-amber-500/60 transition-all duration-300">
                        <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover rounded-lg" />
                      </div>
                      <div className="status-glow absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full" style={{ boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{emp.name}</p>
                      <p className="text-xs text-gray-400 truncate">{emp.role}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
                      <span className="text-xs text-green-400 font-medium">Online</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/workspace/${emp.id}`)}
                      className="flex-1 btn-gold text-xs py-2.5 font-semibold rounded-lg hover:shadow-lg transition-all"
                    >
                      Open Workspace
                    </button>
                    <button
                      onClick={() => { if (confirm(`Remove ${emp.name}?`)) auth.fireEmployee(emp.id); }}
                      className="btn-dark-outline text-xs py-2.5 px-4 rounded-lg font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="font-bold text-lg text-white mb-4">Recent Activity</h2>
          <div className="card-dark rounded-xl overflow-hidden">
            {ACTIVITY_FEED.map((a) => (
              <div key={a.id} className="activity-row px-6 py-4 flex items-center gap-4">
                <div className="icon-pill flex-shrink-0">
                  <span className="text-base">{a.icon}</span>
                </div>
                <p className="text-sm text-gray-300 flex-1">{a.message}</p>
                <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Storage Usage Monitor */}
        <div className="card-dark rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wide">Storage Usage</h3>
            <span className="text-sm font-semibold text-amber-400">{storageUsage.percent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-[#0F0F0F] rounded-full h-3 border border-white/5 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                storageUsage.percent > 80
                  ? 'storage-progress'
                  : storageUsage.percent > 60
                  ? 'storage-progress'
                  : 'storage-progress'
              }`}
              style={{
                width: `${Math.min(100, storageUsage.percent)}%`,
                filter: storageUsage.percent > 80 ? 'hue-rotate(-30deg)' : 'none'
              }}
              role="progressbar"
              aria-valuenow={storageUsage.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Storage usage"
            />
          </div>
        </div>

        {/* Trial Banner */}
        {auth.isTrial && (
          <div className="trial-banner rounded-xl p-6 backdrop-blur-sm border-l-4 border-l-amber-500">
            <div className="flex items-start justify-between gap-6 mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-white mb-1">
                  Free Trial — <span className="text-amber-400">{auth.trial?.daysRemaining || 0} Days Remaining</span>
                </h3>
                <p className="text-sm text-gray-400">
                  {usageSummary
                    ? `${(usageSummary.hoursLimit - usageSummary.hoursUsed).toFixed(1)}h of ${usageSummary.hoursLimit}h remaining • Upgrade to unlock more AI employees and unlimited compute.`
                    : 'Upgrade to unlock more AI employees and unlimited compute.'
                  }
                </p>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="btn-gold text-sm px-6 py-2.5 font-semibold whitespace-nowrap hover:shadow-lg transition-all flex-shrink-0"
                aria-label="Upgrade your subscription plan"
              >
                Upgrade Now
              </button>
            </div>
            <div className="w-full bg-[#1A1A2E] rounded-full h-2 border border-white/5 overflow-hidden">
              <div
                className="gradient-bar h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, usageSummary?.percentUsed || ((auth.trial?.hoursUsed || 0) / (auth.trial?.dailyLimit || 30)) * 100)}%`
                }}
                role="progressbar"
                aria-label="Trial usage"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
