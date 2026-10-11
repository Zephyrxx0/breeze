import { useEffect, useState } from "react";
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
      className="animate-rise fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-canvas shadow-[var(--shadow-pop)]"
    >
      <Check className="h-4 w-4 shrink-0 text-go" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
