import React, { Component, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Info, AlertCircle } from 'lucide-react';

export const Button = React.memo(({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, type = 'button' }: any) => {
  const variants: any = {
    primary: 'bg-brand-blue text-white hover:bg-brand-blue/90',
    secondary: 'bg-white text-brand-blue border border-zinc-200 hover:bg-zinc-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
});

export const Card = React.memo(({ children, className = '' }: any) => (
  <div className={`bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
));

export const Badge = React.memo(({ children, variant = 'neutral' }: any) => {
  const variants: any = {
    neutral: 'bg-zinc-100 text-zinc-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
    danger: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${variants[variant]}`}>
      {children}
    </span>
  );
});

export const Modal = React.memo(({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-2xl' }: any) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className={`bg-white w-full ${maxWidth} rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]`}
        >
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            {children}
          </div>
          {footer && (
            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end gap-3">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

export const Toast = React.memo(({ message, type, isOpen }: any) => {
  if (!isOpen) return null;
  const colors: any = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    info: 'bg-brand-blue'
  };
  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[120] px-6 py-3 rounded-2xl text-white font-medium shadow-xl flex items-center gap-3 ${colors[type]}`}
    >
      {type === 'success' && <CheckCircle2 size={20} />}
      {type === 'error' && <X size={20} />}
      {type === 'info' && <Info size={20} />}
      {message}
    </motion.div>
  );
});

export const Input = React.memo(({ label, error, ...props }: any) => (
  <div className="space-y-2">
    {label && <label className="text-sm font-semibold text-zinc-700">{label}</label>}
    <input 
      {...props}
      className={`w-full px-4 py-2 rounded-xl border ${error ? 'border-red-500' : 'border-zinc-200'} outline-none focus:ring-1 focus:ring-brand-blue transition-all ${props.className || ''}`}
    />
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
));

export const Select = React.memo(({ label, options, ...props }: any) => (
  <div className="space-y-2">
    {label && <label className="text-sm font-semibold text-zinc-700">{label}</label>}
    <select 
      {...props}
      className={`w-full px-4 py-2 rounded-xl border border-zinc-200 outline-none focus:ring-1 focus:ring-brand-blue transition-all ${props.className || ''}`}
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
));

export class ErrorBoundary extends Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-zinc-100 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">Algo deu errado</h2>
            <p className="text-zinc-600 mb-8">Ocorreu um erro inesperado. Por favor, recarregue a página.</p>
            <Button className="w-full" onClick={() => window.location.reload()}>Recarregar Página</Button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
