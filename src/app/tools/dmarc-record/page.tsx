import type { Metadata } from "next";
import { RuaChecker } from "@/components/rua-checker";

export const metadata: Metadata = {
  title: "DMARC record & rua checker",
  description:
    "Paste your DMARC record and get the exact RFC 7489 §7.1 authorization records external report destinations must publish — the fix for 'rua is set but reports never arrive'.",
};

export default function DmarcRecordPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">DMARC record &amp; rua checker</h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Set <code className="rounded bg-muted px-1.5 py-0.5 text-sm">rua=</code> to an address at
          another domain and mail servers will withhold your reports until that domain publishes an
          authorization record — a silent failure with no error anywhere. Paste your record to get
          the exact TXT records that unlock delivery.
        </p>
      </header>
      <RuaChecker />
    </div>
  );
}
