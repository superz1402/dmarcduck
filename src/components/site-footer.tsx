import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} DmarcDuck. DMARC monitoring that doesn&apos;t bite.</p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/docs/ingestion" className="hover:text-foreground">Docs</Link>
          <Link href="/analyze" className="hover:text-foreground">Free analyzer</Link>
        </nav>
      </div>
    </footer>
  );
}
