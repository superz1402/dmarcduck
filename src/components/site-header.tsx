import Link from "next/link";
import { DuckLogo } from "./duck-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <DuckLogo className="h-6 w-6" />
          <span>DmarcDuck</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm md:flex">
          <Link href="/analyze" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Analyze a report
          </Link>
          <Link href="/tools/dmarc-record" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            rua checker
          </Link>
          <Link href="/pricing" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Pricing
          </Link>
          <Link href="/docs/ingestion" className="rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            How ingestion works
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/app"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
