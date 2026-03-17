import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import { PLANS, JOB_TYPES } from '../data/constants';

export function PricingPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [tab, setTab] = useState('monthly');

  return (
    <div className="bg-white min-h-screen pt-8 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="hc text-4xl sm:text-5xl lg:text-6xl mb-4">Simple, Transparent Pricing</h1>
        <p className="text-gray-500 mb-8 text-lg">See what it costs (spoiler: less than coffee).</p>
        <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-12">
          {['monthly', 'per-project', 'per-minute'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all border-none cursor-pointer ${tab === t ? 'bg-white shadow-sm text-black' : 'text-gray-500 bg-transparent hover:text-gray-700'}`}>
              {t === 'monthly' ? 'Monthly' : t === 'per-project' ? 'Per Project' : 'Per Minute'}
            </button>
          ))}
        </div>
        {tab === 'monthly' && (
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div key={plan.slug} className={`rounded-2xl p-8 text-left transition-all ${plan.highlighted ? 'bg-yellow-400 border-2 border-yellow-500 shadow-xl scale-105' : 'card'}`}>
                {plan.badge && <span className="inline-block text-xs font-bold bg-black text-white px-3 py-1 rounded-full mb-4">{plan.badge}</span>}
                <h3 className="font-bold text-2xl mb-1">{plan.name}</h3>
                <div className="mb-4"><span className="hc text-5xl">${plan.price}</span><span className="text-gray-600">/mo</span></div>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f, i) => <li key={i} className="flex items-start gap-2 text-sm"><span className="text-green-600 mt-0.5">✓</span><span>{f}</span></li>)}
                </ul>
                <button onClick={() => {
                  if (!auth.isLoggedIn) { navigate('/signup'); return; }
                  auth.upgradeToSubscription(plan.slug);
                  notify.addToast('success', 'Upgraded!', `You are now on the ${plan.name} plan.`);
                  navigate('/dashboard');
                }} className={`w-full py-3 rounded-xl font-bold text-sm uppercase transition-all border-none cursor-pointer ${plan.highlighted ? 'bg-black text-white hover:bg-gray-800' : 'btn-gold'}`}>
                  {auth.isSubscribed && auth.plan?.slug === plan.slug ? 'Current Plan' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        )}
        {tab === 'per-project' && (
          <div className="card max-w-2xl mx-auto text-left">
            <h3 className="hc text-2xl mb-4">Per-Project Pricing</h3>
            <p className="text-gray-600 mb-6">Pay per project for one-off tasks. No subscription required.</p>
            <div className="space-y-3">
              {[{ type: 'Software Engineering', price: '$50 - $500' }, { type: 'Marketing Campaign', price: '$30 - $200' }, { type: 'Data Analysis', price: '$40 - $300' }, { type: 'Content Writing', price: '$20 - $150' }, { type: 'UI/UX Design', price: '$35 - $250' }].map((p, i) => (
                <div key={i} className="flex justify-between py-3 border-b border-gray-100"><span className="font-medium">{p.type}</span><span className="font-bold">{p.price}</span></div>
              ))}
            </div>
          </div>
        )}
        {tab === 'per-minute' && (
          <div className="card max-w-2xl mx-auto text-left">
            <h3 className="hc text-2xl mb-4">Per-Minute Compute Rates</h3>
            <p className="text-gray-600 mb-6">Pay only for the compute time your AI employees actually use.</p>
            <div className="space-y-3">
              {JOB_TYPES.slice(0, 6).map((jt, i) => (
                <div key={i} className="flex justify-between py-3 border-b border-gray-100">
                  <span className="font-medium">{jt.icon} {jt.title}</span>
                  <span className="font-bold">${(0.02 + i * 0.005).toFixed(3)}/min</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
