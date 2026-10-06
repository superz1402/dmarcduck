import * as React from "react";
import { cn } from "@/lib/utils";

/** Accessible skeleton loader — respects prefers-reduced-motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} aria-hidden />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}

/** Verdict dot with sr-only text — color never alone. */
export function VerdictDot({ tone, children }: { tone: "success" | "danger" | "warning"; children: string }) {
  const bg = tone === "success" ? "bg-success" : tone === "danger" ? "bg-danger" : "bg-accent";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", bg)} aria-hidden />
      <span className="sr-only">{children}</span>
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center">
      <h3 className="font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
