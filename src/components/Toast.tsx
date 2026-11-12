import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'info';
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  return (
    <div className="fixed top-14 right-4 z-50 max-w-sm w-full bg-[#1e2238] text-white p-3.5 rounded-2xl shadow-2xl border border-[#353c63] flex items-start gap-3 animate-slideIn">
      <div className="mt-0.5 shrink-0">
        {toast.type === 'warning' ? (
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
        ) : toast.type === 'info' ? (
          <Info className="w-5 h-5 text-cyan-400" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-tertiary-fixed" />
        )}
      </div>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-semibold text-xs text-white leading-tight">
          {toast.title}
        </span>
        <span className="text-[11px] text-[#bdc2ff] mt-0.5 leading-snug">
          {toast.message}
        </span>
      </div>
      <button
        onClick={onDismiss}
        className="text-[#8e93b2] hover:text-white transition-colors shrink-0 p-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
