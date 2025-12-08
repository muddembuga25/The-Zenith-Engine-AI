
import React, { useState, createContext, useCallback, useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, LightbulbIcon, XIcon } from './Icons';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

const Toast: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss after 60 seconds (1 minute)
    const timer = setTimeout(() => {
      setIsExiting(true);
      // Wait for exit animation to complete before removing from DOM
      const dismissTimer = setTimeout(() => onDismiss(toast.id), 500); 
      return () => clearTimeout(dismissTimer);
    }, 60000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 500);
  };

  const icons: Record<ToastType, React.FC<any>> = {
    success: CheckCircleIcon,
    error: ExclamationTriangleIcon,
    info: LightbulbIcon,
  };

  // Strict Brand Styling: Success = Brand Blue, Error = Secondary/Alert (using brand logic or white/gray contrast), Info = Brand Blue
  const styles: Record<ToastType, { iconColor: string; bgIcon: string; borderColor: string, shadow: string }> = {
    success: { 
      iconColor: 'text-brand-primary', 
      bgIcon: 'bg-brand-primary/10',
      borderColor: 'border-brand-primary/30',
      shadow: 'shadow-lg shadow-brand-primary/10'
    },
    error: { 
      iconColor: 'text-white', 
      bgIcon: 'bg-white/10',
      borderColor: 'border-white/30',
      shadow: 'shadow-lg shadow-white/10'
    },
    info: { 
      iconColor: 'text-brand-primary', 
      bgIcon: 'bg-brand-primary/10',
      borderColor: 'border-brand-primary/30',
      shadow: 'shadow-lg shadow-brand-primary/10'
    },
  };

  const Icon = icons[toast.type];
  const style = styles[toast.type];

  return (
    <div
      className={`
        relative w-full max-w-sm p-4 rounded-xl flex items-start gap-3 pointer-events-auto
        bg-[var(--bg-panel-solid)] 
        border ${style.borderColor} ${style.shadow}
        transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]
        ${isExiting ? 'opacity-0 translate-y-4 scale-95' : 'opacity-100 translate-y-0 scale-100 animate-fade-in-up'}
      `}
      role="alert"
      style={{
        // Ensure high z-index and proper background
        boxShadow: 'var(--panel-shadow)',
      }}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.bgIcon} mt-0.5`}>
        <Icon className={`h-5 w-5 ${style.iconColor}`} />
      </div>
      
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium text-[var(--text-primary)] leading-snug tracking-wide">
          {toast.message}
        </p>
      </div>

      <button 
        onClick={handleDismiss} 
        className="flex-shrink-0 -mr-1 -mt-1 p-1.5 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-highlight)] transition-colors"
        aria-label="Dismiss notification"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 md:px-0">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};