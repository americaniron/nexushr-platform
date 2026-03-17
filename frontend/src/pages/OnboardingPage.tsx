import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import { AI_EMPLOYEES } from '../data/employees';
import { JOB_TYPES } from '../data/constants';

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();

  const steps = [
    { title: 'Tell us about your company', subtitle: 'This helps us personalize your experience' },
    { title: 'What role do you need most?', subtitle: 'Choose the job type for your first AI employee' },
    { title: 'Meet your first AI employee', subtitle: 'Select the perfect team member' },
    { title: "You're all set!", subtitle: 'Your AI workforce is ready to deploy' },
  ];

  const filteredEmployees = AI_EMPLOYEES.filter(e => e.jobType === selectedRole);

  const handleNext = () => {
    if (step === 0 && (!companyName || !companySize)) return;
    if (step === 1 && !selectedRole) return;
    if (step === 2 && !selectedEmployee) return;
    if (step === 3) {
      if (selectedEmployee) auth.hireEmployee(selectedEmployee);
      auth.completeOnboarding();
      notify.addToast('success', 'Welcome aboard!', `${AI_EMPLOYEES.find(e => e.id === selectedEmployee)?.name || 'Your AI employee'} is ready to work.`);
      navigate('/dashboard');
      return;
    }
    setStep(s => s + 1);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <span className="hc text-3xl tracking-wider" style={{ letterSpacing: '2px' }}>NEXUSHR</span>
          <span className="text-[10px] font-bold bg-[#FBCC00] text-[#0F0F0F] px-2 py-0.5 rounded-full ml-2">AI</span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= step ? '#FBCC00' : '#E5E7EB' }} />
          ))}
        </div>

        <div className="card">
          <h2 className="hc text-2xl mb-1">{steps[step].title}</h2>
          <p className="text-gray-500 text-sm mb-6">{steps[step].subtitle}</p>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                <div className="grid grid-cols-2 gap-3">
                  {['1-10', '11-50', '51-200', '200+'].map(size => (
                    <button key={size} onClick={() => setCompanySize(size)} type="button"
                      className={`p-3 rounded-xl border text-sm font-medium cursor-pointer transition-all ${companySize === size ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                      {size} employees
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {JOB_TYPES.map(jt => (
                <button key={jt.id} onClick={() => setSelectedRole(jt.id)} type="button"
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${selectedRole === jt.id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <span className="text-2xl mb-2 block">{jt.icon}</span>
                  <p className="font-bold text-sm">{jt.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{jt.count} available</p>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {filteredEmployees.length === 0 && <p className="text-gray-400 text-sm">No employees in this category. <button onClick={() => setStep(1)} className="text-yellow-700 underline bg-transparent border-none cursor-pointer">Go back</button></p>}
              {filteredEmployees.map(emp => (
                <button key={emp.id} onClick={() => setSelectedEmployee(emp.id)} type="button"
                  className={`w-full p-4 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-4 ${selectedEmployee === emp.id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="avatar-frame" style={{ width: 48, height: 48, flexShrink: 0 }}>
                    <img src={emp.avatar} alt={emp.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{emp.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${emp.badge === 'Elite' ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-700'}`}>{emp.badge}</span>
                    </div>
                    <p className="text-sm text-gray-500">{emp.role}</p>
                    <p className="text-xs text-gray-400 mt-1">⭐ {emp.rating} · {emp.tasksCompleted} tasks</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-6">
              {selectedEmployee && (() => {
                const emp = AI_EMPLOYEES.find(e => e.id === selectedEmployee);
                if (!emp) return null;
                return (
                  <div>
                    <div className="avatar-frame mx-auto mb-4" style={{ width: 80, height: 80 }}>
                      <img src={emp.avatar} alt={emp.name} />
                    </div>
                    <h3 className="font-bold text-xl">{emp.name}</h3>
                    <p className="text-gray-500">{emp.role}</p>
                    <p className="text-sm text-gray-400 mt-3 max-w-sm mx-auto">"{emp.personality.greeting}"</p>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn-outline flex-1">Back</button>}
            <button onClick={handleNext} className="btn-gold flex-1">
              {step === 3 ? 'Go to Dashboard' : 'Continue'}
            </button>
          </div>
          {step < 3 && (
            <button onClick={() => { auth.completeOnboarding(); navigate('/dashboard'); }}
              className="w-full text-center text-sm text-gray-400 mt-3 bg-transparent border-none cursor-pointer hover:text-gray-600">
              Skip onboarding →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
