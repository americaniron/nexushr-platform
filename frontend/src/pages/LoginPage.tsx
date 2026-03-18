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
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-4">
      <div className="w-full max-w-6xl">
        <div className="grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">
          {/* Left Panel - Dark Brand */}
          <div className="hidden md:flex flex-col justify-center items-start bg-gradient-to-br from-[#1A1A2E] to-[#0F0F0F] p-12 relative overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-20 -left-32 w-96 h-96 bg-[#FBCC00] rounded-full filter blur-3xl"></div>
              <div className="absolute -bottom-32 right-0 w-96 h-96 bg-[#FBCC00] rounded-full filter blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <div className="mb-12">
                <span className="hc text-5xl tracking-wider text-white">NEXUSHR</span>
                <span className="text-[10px] font-bold bg-[#FBCC00] text-[#0F0F0F] px-2 py-0.5 rounded-full ml-2">AI</span>
              </div>

              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">Welcome Back</h2>
              <p className="text-gray-300 text-lg mb-8">Sign in to your AI team and keep crushing your tasks.</p>

              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <span className="text-2xl text-[#FBCC00]">⏱️</span>
                  <div>
                    <p className="text-white font-semibold">Always Available</p>
                    <p className="text-gray-400 text-sm">Your AI team works 24/7/365</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl text-[#FBCC00]">📊</span>
                  <div>
                    <p className="text-white font-semibold">Real-time Analytics</p>
                    <p className="text-gray-400 text-sm">Track performance and productivity</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl text-[#FBCC00]">🔄</span>
                  <div>
                    <p className="text-white font-semibold">Seamless Integration</p>
                    <p className="text-gray-400 text-sm">Works with your existing tools</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl text-[#FBCC00]">🚀</span>
                  <div>
                    <p className="text-white font-semibold">Scale Instantly</p>
                    <p className="text-gray-400 text-sm">Add employees with one click</p>
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
              <p className="text-gray-500 mt-3">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} aria-label="Login form">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 mb-6" role="alert">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="mb-6">
                <label htmlFor="login-email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-xl">✉️</span>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#FBCC00] focus:ring-2 focus:ring-[#FBCC00]/20 bg-white transition-all text-gray-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-2">
                <label htmlFor="login-password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-xl">🔒</span>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#FBCC00] focus:ring-2 focus:ring-[#FBCC00]/20 bg-white transition-all text-gray-900"
                  />
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end mb-6">
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#FBCC00] hover:text-[#FFD700] font-semibold transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* CTA Button */}
              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all border-none cursor-pointer bg-gradient-to-r from-[#FBCC00] to-[#FFD700] text-[#0F0F0F] hover:shadow-lg hover:shadow-[#FBCC00]/30 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              {/* Social Login Buttons */}
              <div className="mt-6 space-y-3">
                <p className="text-xs text-gray-500 text-center">Or sign in with:</p>
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

              {/* Demo Access Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-600 font-semibold text-center mb-4">Try our demo accounts:</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      auth.login('trial');
                      navigate('/dashboard');
                    }}
                    className="w-full py-2.5 px-4 rounded-lg border-2 border-gray-300 hover:bg-gray-50 font-semibold text-sm transition-all"
                  >
                    👨‍💼 Trial Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      auth.login('subscribed');
                      navigate('/dashboard');
                    }}
                    className="w-full py-2.5 px-4 rounded-lg border-2 border-gray-300 hover:bg-gray-50 font-semibold text-sm transition-all"
                  >
                    ⭐ Subscriber Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      auth.login('admin');
                      navigate('/admin');
                    }}
                    className="w-full py-2.5 px-4 rounded-lg border-2 border-gray-300 hover:bg-gray-50 font-semibold text-sm transition-all"
                  >
                    👑 Admin Account
                  </button>
                </div>
              </div>

              {/* Sign Up Link */}
              <p className="text-xs text-gray-500 text-center mt-6">
                Don't have an account?{' '}
                <Link to="/signup" className="text-[#FBCC00] font-bold hover:underline">
                  Start free trial
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
