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
    if (pw.length === 0) return { label: '', color: 'bg-gray-600', width: '0%' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-orange-500', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'bg-[#FBCC00]', width: '60%' };
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
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-4" role="main" aria-label="Sign up">
      <div className="w-full max-w-6xl">
        <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">
          {/* Left Panel - Dark Brand */}
          <div className="hidden md:flex flex-col justify-center items-start bg-gradient-to-br from-[#1A1A2E] to-[#0F0F0F] p-12 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-96 h-96 bg-[#FBCC00] rounded-full filter blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#FBCC00] rounded-full filter blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <div className="mb-12">
                <span className="hc text-5xl tracking-wider text-white">NEXUSHR</span>
                <span className="text-[10px] font-bold bg-[#FBCC00] text-[#0F0F0F] px-2 py-0.5 rounded-full ml-2">AI</span>
              </div>

              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">Build Your Dream Team</h2>
              <p className="text-gray-300 text-lg mb-8">Deploy AI employees that work 24/7. No hiring headaches. Just pure productivity.</p>

              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <span className="text-2xl text-[#FBCC00]">⚡</span>
                  <div>
                    <p className="text-white font-semibold">Instant Deployment</p>
                    <p className="text-gray-400 text-sm">Hire AI employees in seconds</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl text-[#FBCC00]">🎯</span>
                  <div>
                    <p className="text-white font-semibold">Task Experts</p>
                    <p className="text-gray-400 text-sm">Specialized for engineering, marketing, design</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl text-[#FBCC00]">💰</span>
                  <div>
                    <p className="text-white font-semibold">Cost Effective</p>
                    <p className="text-gray-400 text-sm">10x cheaper than hiring humans</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl text-[#FBCC00]">🔒</span>
                  <div>
                    <p className="text-white font-semibold">Enterprise Secure</p>
                    <p className="text-gray-400 text-sm">SOC2 compliant, encrypted, reliable</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="bg-white p-8 sm:p-12 flex flex-col justify-center">
            <div className="mb-8 md:hidden text-center">
              <span className="hc text-3xl tracking-wider text-[#0F0F0F]">NEXUSHR</span>
              <span className="text-[10px] font-bold bg-[#FBCC00] text-[#0F0F0F] px-2 py-0.5 rounded-full ml-2">AI</span>
              <p className="text-gray-500 mt-3">Start your 7-day free trial</p>
            </div>

            <form onSubmit={handleSubmit} aria-label="Registration form" noValidate>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-6" role="alert" aria-live="assertive">
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div className="mb-6">
                <label htmlFor="signup-name" className="block text-sm font-semibold text-gray-900 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-xl">👤</span>
                  <input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ahmed Hassan"
                    autoComplete="name"
                    aria-required="true"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#FBCC00] focus:ring-2 focus:ring-[#FBCC00]/20 bg-white transition-all text-gray-900"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mb-6">
                <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Work Email
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-xl">✉️</span>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    aria-required="true"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#FBCC00] focus:ring-2 focus:ring-[#FBCC00]/20 bg-white transition-all text-gray-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-2">
                <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-xl">🔒</span>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    aria-required="true"
                    aria-describedby="password-strength"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#FBCC00] focus:ring-2 focus:ring-[#FBCC00]/20 bg-white transition-all text-gray-900"
                  />
                </div>
              </div>

              {/* Password Strength Bar */}
              {password.length > 0 && (
                <div className="mb-6" id="password-strength">
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((segment) => (
                      <div
                        key={segment}
                        className={`flex-1 h-2 rounded-full transition-all ${
                          parseInt(strength.width) / 20 >= segment
                            ? strength.color
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-semibold ${strength.color.replace('bg-', 'text-')}`}>
                      {strength.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {password.length >= 10 ? '✓ Good length' : 'min 6 chars'}
                    </span>
                  </div>
                </div>
              )}
              {password.length === 0 && <div className="mb-6" />}

              {/* Confirm Password */}
              <div className="mb-6">
                <label htmlFor="signup-confirm" className="block text-sm font-semibold text-gray-900 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-xl">🔐</span>
                  <input
                    id="signup-confirm"
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    aria-required="true"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#FBCC00] focus:ring-2 focus:ring-[#FBCC00]/20 bg-white transition-all text-gray-900"
                  />
                </div>
                {confirm.length > 0 && password !== confirm && (
                  <p className="text-xs text-red-500 mt-2" role="alert">
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all border-none cursor-pointer bg-gradient-to-r from-[#FBCC00] to-[#FFD700] text-[#0F0F0F] hover:shadow-lg hover:shadow-[#FBCC00]/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating your account...' : 'Start Free Trial'}
              </button>

              {/* Social Login Buttons */}
              <div className="mt-6 space-y-3">
                <p className="text-xs text-gray-500 text-center">Or sign up with:</p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    className="py-2.5 px-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <span>👤</span>
                    <span className="hidden sm:inline">Google</span>
                  </button>
                  <button
                    type="button"
                    className="py-2.5 px-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <span>⚙️</span>
                    <span className="hidden sm:inline">GitHub</span>
                  </button>
                  <button
                    type="button"
                    className="py-2.5 px-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <span>🪟</span>
                    <span className="hidden sm:inline">Microsoft</span>
                  </button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <p className="text-gray-700 font-semibold">🔐</p>
                    <p className="text-gray-600 text-[11px] mt-1">SOC2 Compliant</p>
                  </div>
                  <div>
                    <p className="text-gray-700 font-semibold">🛡️</p>
                    <p className="text-gray-600 text-[11px] mt-1">Enterprise Encryption</p>
                  </div>
                  <div>
                    <p className="text-gray-700 font-semibold">💳</p>
                    <p className="text-gray-600 text-[11px] mt-1">No Card Required</p>
                  </div>
                </div>
              </div>

              {/* Sign In Link */}
              <p className="text-xs text-gray-500 text-center mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-[#FBCC00] font-bold hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
