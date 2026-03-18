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
    <div className="bg-[#0F0F0F] min-h-screen pt-12 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="hc text-5xl sm:text-6xl lg:text-7xl text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">Enterprise-grade AI employees at startup-friendly prices. Pick your plan and start scaling.</p>
        </div>

        {/* Tab Navigation - Enhanced */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex bg-[#1A1A2E] rounded-2xl p-2 gap-2">
            {['monthly', 'per-project', 'per-minute'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer ${
                  tab === t
                    ? 'bg-gradient-to-r from-[#FBCC00] to-[#FFD700] text-[#0F0F0F] shadow-lg shadow-[#FBCC00]/30'
                    : 'text-gray-400 bg-transparent hover:text-gray-200'
                }`}
              >
                {t === 'monthly' ? 'Monthly' : t === 'per-project' ? 'Per Project' : 'Per Minute'}
              </button>
            ))}
          </div>
        </div>

        {/* Monthly Plans */}
        {tab === 'monthly' && (
          <div>
            {/* Plan Cards */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {PLANS.map(plan => (
                <div
                  key={plan.slug}
                  className={`relative rounded-2xl transition-all ${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-[#FBCC00] to-[#FFD700] text-[#0F0F0F] shadow-2xl shadow-[#FBCC00]/40 md:scale-105'
                      : 'bg-[#1A1A2E] text-white border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {/* Most Popular Badge */}
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-[#0F0F0F] text-[#FBCC00] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                        ✨ Most Popular
                      </div>
                    </div>
                  )}

                  <div className="p-8 sm:p-10">
                    {/* Plan Name */}
                    <h3 className="font-bold text-2xl mb-2">{plan.name}</h3>
                    {plan.description && <p className={`text-sm mb-6 ${plan.highlighted ? 'text-[#0F0F0F]/70' : 'text-gray-400'}`}>{plan.description}</p>}

                    {/* Price Display */}
                    <div className="mb-8">
                      <div className="flex items-baseline">
                        <span className="hc text-6xl font-bold">${plan.price}</span>
                        <span className={`text-sm ml-2 ${plan.highlighted ? 'text-[#0F0F0F]/70' : 'text-gray-400'}`}>/month</span>
                      </div>
                      <p className={`text-xs mt-2 ${plan.highlighted ? 'text-[#0F0F0F]/60' : 'text-gray-500'}`}>Billed monthly. Cancel anytime.</p>
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className={`flex-shrink-0 mt-1 text-lg ${plan.highlighted ? 'text-[#0F0F0F]' : 'text-[#FBCC00]'}`}>
                            ✓
                          </span>
                          <span className="text-sm">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <button
                      onClick={() => {
                        if (!auth.isLoggedIn) {
                          navigate('/signup');
                          return;
                        }
                        auth.upgradeToSubscription(plan.slug);
                        notify.addToast('success', 'Upgraded!', `You are now on the ${plan.name} plan.`);
                        navigate('/dashboard');
                      }}
                      className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all border-none cursor-pointer ${
                        auth.isSubscribed && auth.plan?.slug === plan.slug
                          ? plan.highlighted
                            ? 'bg-[#0F0F0F] text-[#FBCC00]'
                            : 'bg-gray-700 text-gray-300 cursor-default'
                          : plan.highlighted
                          ? 'bg-[#0F0F0F] text-[#FBCC00] hover:bg-[#1A1A1A]'
                          : 'bg-gradient-to-r from-[#FBCC00] to-[#FFD700] text-[#0F0F0F] hover:shadow-lg hover:shadow-[#FBCC00]/30'
                      }`}
                    >
                      {auth.isSubscribed && auth.plan?.slug === plan.slug ? '✓ Current Plan' : 'Get Started'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison Row */}
            <div className="bg-[#1A1A2E] rounded-2xl border border-gray-700 p-8">
              <h4 className="text-white font-semibold text-center mb-4">All plans include:</h4>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-[#FBCC00] text-2xl">🔒</span>
                  <div>
                    <p className="text-white font-medium">SSL & Security</p>
                    <p className="text-gray-400 text-xs">Enterprise-grade encryption</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-[#FBCC00] text-2xl">⚙️</span>
                  <div>
                    <p className="text-white font-medium">API Access</p>
                    <p className="text-gray-400 text-xs">Full REST & GraphQL APIs</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-[#FBCC00] text-2xl">📞</span>
                  <div>
                    <p className="text-white font-medium">24/7 Support</p>
                    <p className="text-gray-400 text-xs">Dedicated support team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Per-Project Pricing */}
        {tab === 'per-project' && (
          <div className="bg-[#1A1A2E] rounded-2xl border border-gray-700 p-8 sm:p-12 max-w-3xl mx-auto">
            <h3 className="hc text-3xl text-white mb-2">Per-Project Pricing</h3>
            <p className="text-gray-400 mb-8">Pay per project for one-off tasks. No subscription required. Transparent pricing, no hidden fees.</p>

            <div className="space-y-1">
              {[
                { type: 'Software Engineering', price: '$50 - $500' },
                { type: 'Marketing Campaign', price: '$30 - $200' },
                { type: 'Data Analysis', price: '$40 - $300' },
                { type: 'Content Writing', price: '$20 - $150' },
                { type: 'UI/UX Design', price: '$35 - $250' }
              ].map((p, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-4 px-6 rounded-lg ${
                    i % 2 === 0 ? 'bg-[#252541]' : 'bg-transparent'
                  } border-b border-gray-700 last:border-b-0`}
                >
                  <span className="text-white font-medium">{p.type}</span>
                  <span className="text-[#FBCC00] font-bold text-lg">{p.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Minute Compute Rates */}
        {tab === 'per-minute' && (
          <div className="bg-[#1A1A2E] rounded-2xl border border-gray-700 p-8 sm:p-12 max-w-3xl mx-auto">
            <h3 className="hc text-3xl text-white mb-2">Per-Minute Compute Rates</h3>
            <p className="text-gray-400 mb-8">Pay only for the compute time your AI employees actually use. No idle fees. Transparent billing.</p>

            <div className="space-y-1">
              {JOB_TYPES.slice(0, 6).map((jt, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center py-4 px-6 rounded-lg ${
                    i % 2 === 0 ? 'bg-[#252541]' : 'bg-transparent'
                  } border-b border-gray-700 last:border-b-0`}
                >
                  <span className="text-white font-medium">
                    <span className="mr-2">{jt.icon}</span>
                    {jt.title}
                  </span>
                  <span className="text-[#FBCC00] font-bold text-lg">${(0.02 + i * 0.005).toFixed(3)}/min</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
