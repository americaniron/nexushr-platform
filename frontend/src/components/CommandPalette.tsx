import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AI_EMPLOYEES } from '../data/employees';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); setQuery(''); }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const items = useMemo(() => {
    const all = [
      { cat: 'Pages', label: 'Home', icon: '🏠', action: () => navigate('/') },
      { cat: 'Pages', label: 'AI Employees', icon: '👥', action: () => navigate('/catalog') },
      { cat: 'Pages', label: 'Pricing', icon: '💰', action: () => navigate('/pricing') },
      { cat: 'Pages', label: 'Dashboard', icon: '📊', action: () => navigate('/dashboard') },
      ...AI_EMPLOYEES.map(e => ({
        cat: 'Employees', label: `${e.name} — ${e.role}`, icon: e.emoji, avatarUrl: e.avatar,
        action: () => { if (auth.isLoggedIn) navigate(`/workspace/${e.id}`); else auth.login('trial'); },
      })),
      { cat: 'Actions', label: 'Start Free Trial', icon: '🚀', action: () => auth.login('trial') },
      { cat: 'Actions', label: 'Login as Subscriber', icon: '💳', action: () => auth.login('subscribed') },
      { cat: 'Actions', label: 'Login as Admin', icon: '🔑', action: () => auth.login('admin') },
      { cat: 'Actions', label: 'Log Out', icon: '🚪', action: () => { auth.logout(); navigate('/'); } },
    ];
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(i => i.label.toLowerCase().includes(q));
  }, [query, navigate, auth]);

  if (!open) return null;
  return (
    <div className="cmd-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="cmd-box">
        <input className="cmd-input" placeholder="Search pages, employees, actions..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.length === 0 && <div className="p-6 text-center text-gray-400">No results found</div>}
          {items.map((item, i) => (
            <div key={i} className="cmd-item" onClick={() => { item.action(); setOpen(false); }}>
              {'avatarUrl' in item && item.avatarUrl ? (
                <img src={item.avatarUrl as string} alt="" style={{ width: 28, height: 28, borderRadius: 8, border: '2px solid #FBCC00' }} />
              ) : (
                <span className="text-lg">{item.icon}</span>
              )}
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-gray-400">{item.cat}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
