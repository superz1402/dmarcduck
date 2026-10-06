import { db } from "@/lib/db";
import { AnalysisView } from "@/components/analysis-view";
import { EmptyState } from "@/components/ui/misc";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Shared analysis" };

export default async function SharedResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rec = await db.analyzeRecord.findUnique({ where: { id } }).catch(() => null);

  if (!rec || rec.expiresAt < new Date()) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="This shared analysis has expired"
          body="Shared analyzer results are kept for 7 days, then deleted — we'd rather be boring about storage than sloppy. Run your own upload; it takes ten seconds."
          action={
            <Link href="/analyze">
              <Button variant="accent">Open the analyzer</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const analysis = JSON.parse(rec.payload) as import("@/lib/dmarc/analyze").Analysis;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 max-w-2xl">
        <p className="text-sm text-muted-foreground">Shared analysis</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {analysis.publishedDomain ?? "A DMARC report, translated"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Shared via DmarcDuck&apos;s free analyzer. This link expires on{" "}
          {rec.expiresAt.toLocaleDateString()}.
        </p>
      </header>
      <AnalysisView analysis={analysis} />
    </div>
  );
}
