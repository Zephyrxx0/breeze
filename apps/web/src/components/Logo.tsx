import { useId } from "react";

/** Breeze mark: three wind strokes on a sky-to-sea gradient tile. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  const gid = useId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2fb98f" />
          <stop offset="1" stopColor="#14639a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gid})`} />
      <g fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round">
        <path d="M14 24h26a7 7 0 1 0-7-7" />
        <path d="M14 34h34a7 7 0 1 1-7 7" />
        <path d="M14 44h16" />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.7rem] leading-none tracking-tight text-ink">Breeze</span>
    </span>
  );
}
