"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/misc";
import { UploadCloud, RotateCcw } from "lucide-react";
import type { Analysis } from "@/lib/dmarc/analyze";
import { AnalysisView } from "./analysis-view";

export function Analyzer() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((prev) => Array.from(incoming).concat(prev).slice(0, 25));
    setError(null);
  }, []);

  const submit = async () => {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setAnalysis(null);
    try {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      const res = await fetch("/api/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong parsing this upload.");
        return;
      }
      setAnalysis(data.analysis);
      setShareId(data.shareId ?? null);
    } catch {
      setError("Network hiccup — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setAnalysis(null);
    setShareId(null);
    setError(null);
  };

  if (analysis) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Parsed {analysis.reportCount} report{analysis.reportCount === 1 ? "" : "s"} ·{" "}
            <span className="tnum">{analysis.volume.toLocaleString()}</span> emails
          </p>
          <div className="flex gap-2">
            {shareId ? (
              <Link href={`/r/${shareId}`}>
                <Button variant="outline" size="sm">Copy shareable link</Button>
              </Link>
            ) : null}
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Analyze another
            </Button>
          </div>
        </div>
        <AnalysisView analysis={analysis} />
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload report files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files); }}
        className={`flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-accent bg-accent-soft/40" : "border-border bg-card hover:border-accent/60"
        }`}
      >
        <UploadCloud className="h-8 w-8 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-medium">Drop report files here, or click to browse</p>
          <p className="mt-1 text-sm text-muted-foreground">
            .xml, .zip or .gz — up to 25 files, 20 MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept=".xml,.zip,.gz,application/xml,text/xml,application/zip,application/gzip"
          onChange={(e) => pick(e.target.files)}
        />
      </div>

      {files.length > 0 ? (
        <ul className="mt-4 space-y-1" aria-label="Selected files">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-border"
            >
              <span className="truncate">{f.name}</span>
              <span className="tnum ml-3 shrink-0 text-muted-foreground">
                {(f.size / 1024).toFixed(1)} KB
              </span>
              <button
                type="button"
                className="ml-3 shrink-0 text-muted-foreground hover:text-danger"
                aria-label={`Remove ${f.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setFiles((prev) => prev.filter((_, j) => j !== i));
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={submit} disabled={files.length === 0 || busy} variant="accent" size="lg">
          {busy ? <Spinner /> : <UploadCloud className="h-4 w-4" />}
          {busy ? "Parsing…" : "Analyze"}
        </Button>
        {files.length > 0 ? (
          <Button variant="ghost" onClick={reset} disabled={busy}>
            Clear
          </Button>
        ) : null}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Reports often arrive as attachments named something like
        {" "}
        <span className="font-mono text-xs">google.com!example.com!1759708800!1759795199.zip</span>.
        Haven&apos;t received any yet? See{" "}
        <Link href="/docs/ingestion" className="text-accent underline underline-offset-2">
          how report ingestion works
        </Link>.
      </p>
    </div>
  );
}
