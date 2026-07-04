import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/BackButton";
import { AnalysisResults } from "@/components/AnalysisResults";

export const Route = createFileRoute("/_authenticated/analysis/$id")({
  head: () => ({ meta: [{ title: "Analysis — ResumeIQ" }] }),
  component: AnalysisPage,
});

const SECTION_LABELS: Record<string, string> = {
  contact: "Contact Info",
  summary: "Professional Summary",
  experience: "Work Experience",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications & Awards",
  keywords: "Keywords & Industry Relevance",
  formatting: "Formatting & Readability",
  grammar: "Grammar & Language",
};

const PRIORITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-[oklch(0.65_0.22_22/0.15)] text-[oklch(0.78_0.20_22)] border-[oklch(0.65_0.22_22/0.3)]",
  IMPORTANT: "bg-[oklch(0.78_0.16_75/0.15)] text-[oklch(0.85_0.16_75)] border-[oklch(0.78_0.16_75/0.3)]",
  NICE_TO_HAVE: "bg-primary/10 text-primary border-primary/30",
};

function AnalysisPage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [resume, setResume] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: a } = await (supabase as any).from("analyses").select("*").eq("id", id).single();
      setData(a);
      if (a?.resume_id) {
        const { data: r } = await (supabase as any).from("resumes").select("label,filename,version_number").eq("id", a.resume_id).single();
        setResume(r);
      }
    })();
  }, [id]);

  if (!data) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading analysis…</div>;

  const domain = data.rewritten_sections?.detected_domain;
  const merged = { ...data, detected_domain: domain };

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <BackButton />
          <Link to="/history" className="text-sm text-muted-foreground hover:text-foreground">History</Link>
        </div>
        <h1 className="mt-2 text-3xl font-bold">{resume?.label || `Resume v${resume?.version_number ?? ""}`}</h1>
        <p className="text-muted-foreground text-sm">{resume?.filename}</p>
      </header>

      <AnalysisResults data={merged} />

      <div className="pt-4 flex flex-wrap gap-2">
        {data.resume_id && (
          <Link to="/editor/$id" params={{ id: data.resume_id }}>
            <Button className="gap-2"><Wand2 className="w-4 h-4" /> Edit with AI</Button>
          </Link>
        )}
        <Link to="/upload"><Button variant="outline">Upload another version</Button></Link>
      </div>
    </div>
  );
}
