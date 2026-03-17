import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import { sanitizeInput } from '../lib/ai-brain';

export function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();

  const passwordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: '', color: 'bg-gray-200', width: '0%' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'bg-yellow-500', width: '60%' };
    if (score <= 4) return { label: 'Strong', color: 'bg-green-500', width: '80%' };
    return { label: 'Very Strong', color: 'bg-green-600', width: '100%' };
  };

  const strength = passwordStrength(password);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirm) { setError('Please fill in all fields.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email address.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setTimeout(() => {
      auth.signup(sanitizeInput(name), sanitizeInput(email), password);
      notify.addToast('success', 'Welcome to NexusHR!', 'Your 7-day free trial has started.');
      navigate('/onboarding');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4" role="main" aria-label="Sign up">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="hc text-3xl tracking-wider" style={{ letterSpacing: '2px' }}>NEXUSHR</span>
          <span className="text-[10px] font-bold bg-[#FBCC00] text-[#0F0F0F] px-2 py-0.5 rounded-full ml-2">AI</span>
          <p className="text-gray-500 mt-3">Start your 7-day free trial</p>
        </div>
        <form onSubmit={handleSubmit} className="card" aria-label="Registration form" noValidate>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4" role="alert" aria-live="assertive">{error}</div>}
          <div className="mb-4">
            <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input id="signup-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ahmed"
              autoComplete="name" aria-required="true"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
          </div>
          <div className="mb-4">
            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
            <input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
              autoComplete="email" aria-required="true"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
          </div>
          <div className="mb-2">
            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
              autoComplete="new-password" aria-required="true" aria-describedby="password-strength"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
          </div>
          {password.length > 0 && (
            <div className="mb-4" id="password-strength">
              <div className="bg-gray-200 rounded-full h-1.5 mb-1">
                <div className={`h-1.5 rounded-full transition-all ${strength.color}`} style={{ width: strength.width }}
                  role="progressbar" aria-valuenow={parseInt(strength.width)} aria-valuemin={0} aria-valuemax={100} aria-label="Password strength" />
              </div>
              <span className={`text-xs ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
            </div>
          )}
          {password.length === 0 && <div className="mb-4" />}
          <div className="mb-6">
            <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input id="signup-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
              autoComplete="new-password" aria-required="true"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-red-500 mt-1" role="alert">Passwords do not match</p>
            )}
          </div>
          <button type="submit" className="btn-gold w-full" disabled={loading} aria-busy={loading}>
            {loading ? 'Creating your account...' : 'Start Free Trial'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">No credit card required. 7-day trial with 1 AI employee.</p>
          <div className="mt-4 text-center text-sm text-gray-500">
            Already have an account? <Link to="/login" className="text-yellow-700 font-bold hover:underline">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
