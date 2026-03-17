import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import { sanitizeInput } from '../lib/ai-brain';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email address.'); return; }
    setLoading(true);
    setTimeout(() => {
      const result = auth.loginWithCredentials(sanitizeInput(email), password);
      if (result.success) {
        notify.addToast('success', 'Welcome back!', 'You have been logged in.');
        navigate('/dashboard');
      } else {
        setError(result.error || 'Invalid credentials. Try demo@nexushr.ai / demo or admin@nexushr.ai / admin');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="hc text-3xl tracking-wider" style={{ letterSpacing: '2px' }}>NEXUSHR</span>
          <span className="text-[10px] font-bold bg-[#FBCC00] text-[#0F0F0F] px-2 py-0.5 rounded-full ml-2">AI</span>
          <p className="text-gray-500 mt-3">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="card" aria-label="Login form">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4" role="alert">{error}</div>}
          <div className="mb-4">
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
          </div>
          <div className="mb-6">
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
          </div>
          <button type="submit" className="btn-gold w-full" disabled={loading} aria-busy={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="mt-4 text-center text-sm text-gray-500">
            Don't have an account? <Link to="/signup" className="text-yellow-700 font-bold hover:underline">Sign up free</Link>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3">Quick demo access:</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { auth.login('trial'); navigate('/dashboard'); }} className="flex-1 btn-outline text-xs py-2">Trial</button>
              <button type="button" onClick={() => { auth.login('subscribed'); navigate('/dashboard'); }} className="flex-1 btn-outline text-xs py-2">Subscriber</button>
              <button type="button" onClick={() => { auth.login('admin'); navigate('/admin'); }} className="flex-1 btn-outline text-xs py-2">Admin</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
