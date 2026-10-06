export function DuckLogo({ className }: { className?: string }) {
  // The duck: one calm circle, a bill, an eye. Deliberately minimal.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <circle cx="16" cy="17" r="10" fill="var(--accent)" />
      <circle cx="19" cy="14" r="1.6" fill="var(--accent-foreground)" />
      <path d="M4 19h7a2.5 2.5 0 0 1 0 5H6a2 2 0 0 1-2-2z" fill="var(--accent)" />
      <rect x="2" y="17.6" width="3" height="5.2" rx="1.5" fill="var(--accent)" />
    </svg>
  );
}
