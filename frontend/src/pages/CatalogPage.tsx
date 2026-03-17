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

  return (
    <div className="bg-white min-h-screen pt-8 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="hc text-4xl sm:text-5xl mb-2">AI Employee Catalog</h1>
        <p className="text-gray-500 mb-8">Browse and hire from our roster of specialized AI employees</p>
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input type="text" placeholder="Search by name, role, or skill..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white min-w-[200px]">
            <option value="all">All Job Types</option>
            {JOB_TYPES.map(jt => <option key={jt.id} value={jt.id}>{jt.icon} {jt.title}</option>)}
          </select>
        </div>
        <p className="text-sm text-gray-500 mb-4">{filtered.length} employee{filtered.length !== 1 ? 's' : ''} found</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(emp => (
            <div key={emp.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="avatar-frame" style={{ width: 48, height: 48 }}><img src={emp.avatar} alt={emp.name} /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{emp.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${emp.badge === 'Elite' ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-700'}`}>{emp.badge}</span>
                    </div>
                    <p className="text-sm text-gray-500">{emp.role}</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{emp.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {emp.skills.map(s => <span key={s} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>)}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center py-3 border-t border-gray-100 mb-3">
                <div><p className="text-xs text-gray-400">Rating</p><p className="font-bold text-sm">⭐ {emp.rating}</p></div>
                <div><p className="text-xs text-gray-400">Tasks</p><p className="font-bold text-sm">{emp.tasksCompleted}</p></div>
                <div><p className="text-xs text-gray-400">Speed</p><p className="font-bold text-sm">{emp.responseTime}</p></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-yellow-700">{emp.hourlyRate}</span>
                {isHired(emp.id) ? (
                  <button onClick={() => navigate(`/workspace/${emp.id}`)} className="btn-dark text-xs px-4 py-2">Open Workspace →</button>
                ) : (
                  <button onClick={() => {
                    if (!auth.isLoggedIn) { navigate('/signup'); return; }
                    const c = auth.canHire();
                    if (c.allowed) { auth.hireEmployee(emp.id); notify.addToast('success', 'Hired!', `${emp.name} is now on your team.`); }
                    else { notify.addToast('warning', 'Limit Reached', c.reason || ''); }
                  }} className="btn-gold text-xs px-4 py-2">Hire {emp.name}</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center py-16"><p className="text-gray-400 text-lg">No employees found matching your criteria.</p></div>}
      </div>
    </div>
  );
}
