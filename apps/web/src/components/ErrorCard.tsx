import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorCardProps {
  onRetry: () => void;
  title?: string;
  message?: string;
}

export function ErrorCard({
  onRetry,
  title = "Can't assess right now",
  message = "Live upstream data is temporarily unavailable. Missing data is shown honestly rather than fabricated.",
}: ErrorCardProps) {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-xs space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div className="space-y-1.5 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      </div>
      <div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
}

