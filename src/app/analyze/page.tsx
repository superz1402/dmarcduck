import type { Metadata } from "next";
import { Analyzer } from "@/components/analyzer";

export const metadata: Metadata = {
  title: "Analyze a DMARC report",
  description:
    "Drop a DMARC aggregate report (XML or zip) and get a plain-language answer. Free, no signup.",
};

export default function AnalyzePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Analyze a report</h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          Drop in the XML your provider sends (zipped is fine — bundles from
          Google, Yahoo or Microsoft all parse). You get source-by-source
          verdicts and a recommendation, in plain language.
        </p>
      </header>
      <Analyzer />
    </div>
  );
}
