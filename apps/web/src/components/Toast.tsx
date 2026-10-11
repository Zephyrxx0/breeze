import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ message, onDismiss, durationMs = 2500 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="toast-notification"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-full shadow-xl flex items-center gap-2 border border-slate-800 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
    >
      <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
