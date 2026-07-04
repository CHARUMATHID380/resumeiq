import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ArrowRight, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — ResumeIQ" }] }),
  component: History,
});

interface Row {
  id: string; label: string | null; filename: string; created_at: string; version_number: number;
  analyses: { id: string; ats_score: number | null }[];
}

function History() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("resumes")
        .select("id,label,filename,created_at,version_number,analyses(id,ats_score,created_at)")
        .order("created_at", { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-muted-foreground">Loading…</div>;

  if (rows.length === 0) {
    return (
      <div>
        <div className="mb-4"><BackButton /></div>
        <div className="glass rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="mt-4 text-xl font-semibold">No resumes yet</h2>
          <p className="text-muted-foreground mt-1">Upload your first resume to get an AI analysis.</p>
          <Link to="/upload"><Button className="mt-6 gap-2"><Upload className="w-4 h-4" /> Upload resume</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-3xl font-bold">Resume history</h1>
        </div>
        <Link to="/upload"><Button className="gap-2"><Upload className="w-4 h-4" /> New upload</Button></Link>
      </div>
      <div className="space-y-3">
        {rows.map((r) => {
          const latest = r.analyses?.sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at))[0];
          const score = latest?.ats_score ?? null;
          const color = score == null ? "text-muted-foreground" : score >= 71 ? "text-[oklch(0.72_0.18_152)]" : score >= 41 ? "text-[oklch(0.78_0.16_75)]" : "text-[oklch(0.65_0.22_22)]";
          return (
            <div key={r.id} className="glass rounded-xl p-5 flex items-center gap-4">
              <FileText className="w-6 h-6 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.label || `Resume v${r.version_number}`}</div>
                <div className="text-xs text-muted-foreground truncate">{r.filename} · {new Date(r.created_at).toLocaleString()}</div>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${color}`}>{score ?? "—"}</div>
              <Link to="/editor/$id" params={{ id: r.id }}>
                <Button variant="ghost" size="sm" className="gap-1" title="Edit with AI"><Wand2 className="w-4 h-4" /></Button>
              </Link>
              {latest && (
                <Link to="/analysis/$id" params={{ id: latest.id }}>
                  <Button variant="ghost" size="sm" className="gap-1">View <ArrowRight className="w-4 h-4" /></Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
