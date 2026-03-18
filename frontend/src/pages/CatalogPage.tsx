import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import { AI_EMPLOYEES } from '../data/employees';
import { JOB_TYPES } from '../data/constants';

export function CatalogPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => AI_EMPLOYEES.filter(e => {
    const ms = e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()) || e.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const mf = filter === 'all' || e.jobType === filter;
    return ms && mf;
  }), [search, filter]);

  const isHired = (id: string) => auth.hiredEmployees?.includes(id);

  const getSkillColor = (index: number) => {
    const colors = [
      'border-yellow-500/40 bg-yellow-500/5 text-yellow-300',
      'border-blue-500/40 bg-blue-500/5 text-blue-300',
      'border-purple-500/40 bg-purple-500/5 text-purple-300',
      'border-cyan-500/40 bg-cyan-500/5 text-cyan-300',
      'border-pink-500/40 bg-pink-500/5 text-pink-300',
    ];
    return colors[index % colors.length];
  };

  const getBadgeStyle = (badge: string) => {
    if (badge === 'Elite') {
      return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg shadow-yellow-500/30';
    }
    return 'bg-blue-500/20 border border-blue-500/40 text-blue-300';
  };

  return (
    <div className="bg-[#0F0F0F] min-h-screen pt-8 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="hc text-4xl sm:text-5xl mb-2 text-white">AI Employee Catalog</h1>
          <p className="text-gray-400">Browse and hire from our roster of specialized AI employees</p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by name, role, or skill..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-4 py-3 bg-[#1A1A2E] border border-white/[.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 text-white placeholder-gray-500 transition-all duration-200"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm pointer-events-none">
              🔍
            </div>
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-3 bg-[#1A1A2E] border border-white/[.08] rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/30 text-white min-w-[200px] transition-all duration-200 cursor-pointer"
          >
            <option value="all" className="bg-[#1A1A2E] text-white">All Job Types</option>
            {JOB_TYPES.map(jt => (
              <option key={jt.id} value={jt.id} className="bg-[#1A1A2E] text-white">
                {jt.icon} {jt.title}
              </option>
            ))}
          </select>
        </div>

        {/* Count Badge */}
        <div className="mb-6">
          <span className="inline-block px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-semibold rounded-full">
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {/* Employee Grid */}
        {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(emp => (
              <div
                key={emp.id}
                className="group relative bg-[#1A1A2E] border border-white/[.08] rounded-2xl p-6 transition-all duration-300 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 hover:scale-[1.02]"
              >
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full border-2 border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-0.5 overflow-hidden">
                      <img src={emp.avatar} alt={emp.name} className="w-full h-full rounded-full object-cover" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-white truncate">{emp.name}</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${getBadgeStyle(emp.badge)}`}>
                        {emp.badge}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{emp.role}</p>
                  </div>
                </div>

                {/* Description */}
                <p
                  className="text-sm text-gray-400 mb-4"
                  style={{
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as any,
                  }}
                >
                  {emp.description}
                </p>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {emp.skills.map((s, idx) => (
                    <span
                      key={s}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${getSkillColor(idx)}`}
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-0 py-4 mb-4 border-t border-white/[.08] divide-x divide-white/[.08]">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Rating</p>
                    <p className="font-bold text-sm text-white">⭐ {emp.rating}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Tasks</p>
                    <p className="font-bold text-sm text-white">✓ {emp.tasksCompleted}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Speed</p>
                    <p className="font-bold text-sm text-white">⚡ {emp.responseTime}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-sm text-yellow-400">{emp.hourlyRate}</span>
                  {isHired(emp.id) ? (
                    <button
                      onClick={() => navigate(`/workspace/${emp.id}`)}
                      className="flex-1 px-4 py-2 bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 text-xs font-semibold rounded-lg hover:bg-yellow-500/20 hover:border-yellow-500/60 transition-all duration-200 flex items-center justify-center gap-1.5"
                    >
                      Open Workspace →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (!auth.isLoggedIn) {
                          navigate('/signup');
                          return;
                        }
                        const c = auth.canHire();
                        if (c.allowed) {
                          auth.hireEmployee(emp.id);
                          notify.addToast('success', 'Hired!', `${emp.name} is now on your team.`);
                        } else {
                          notify.addToast('warning', 'Limit Reached', c.reason || '');
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-semibold rounded-lg hover:from-yellow-400 hover:to-yellow-500 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 transition-all duration-200 flex items-center justify-center gap-1.5"
                    >
                      Hire {emp.name}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4 opacity-50">🔍</div>
            <h3 className="text-xl font-bold text-white mb-2">No employees found</h3>
            <p className="text-gray-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
