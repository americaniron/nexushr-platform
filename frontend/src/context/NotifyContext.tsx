import { createContext, useContext, useState, type ReactNode } from 'react';

interface Toast { id: number; type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; }
interface NotifyContextType { toasts: Toast[]; addToast: (type: Toast['type'], title: string, message?: string) => void; removeToast: (id: number) => void; }
const NotifyContext = createContext<NotifyContextType | null>(null);
export function useNotify() { const ctx = useContext(NotifyContext); if (!ctx) throw new Error('useNotify outside provider'); return ctx; }

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (type: Toast['type'], title: string, message?: string) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, title, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };
  const removeToast = (id: number) => setToasts(p => p.filter(t => t.id !== id));
  return <NotifyContext.Provider value={{ toasts, addToast, removeToast }}>{children}</NotifyContext.Provider>;
}

export function ToastContainer() {
  const { toasts, removeToast } = useNotify();
  const colors: Record<string, string> = { success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#3B82F6' };
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast" style={{ borderLeftColor: colors[t.type] || '#3B82F6' }}>
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">{t.title}</span>
            <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg ml-4">×</button>
          </div>
          {t.message && <p className="text-sm text-gray-600 mt-1">{t.message}</p>}
        </div>
      ))}
    </div>
  );
}
