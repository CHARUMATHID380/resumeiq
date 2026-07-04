import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileText } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import { extractResumeText } from "@/lib/parse-resume";
import { useServerFn } from "@tanstack/react-start";
import { analyzeResume } from "@/lib/resume.functions";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({ meta: [{ title: "Upload resume — ResumeIQ" }] }),
  component: UploadPage,
});

const STEPS = ["Reading file", "Extracting text", "AI analyzing", "Saving results"];

function UploadPage() {
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeResume);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [step, setStep] = useState(-1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Pick a resume file first");
    try {
      setStep(0);
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user!.id;

      setStep(1);
      const text = await extractResumeText(file);
      if (text.trim().length < 50) throw new Error("Could not extract meaningful text from the file.");

      // upload file to storage
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      // count existing versions
      const { count } = await (supabase as any).from("resumes").select("*", { count: "exact", head: true });
      const version = (count ?? 0) + 1;

      const { data: resume, error: rErr } = await (supabase as any)
        .from("resumes")
        .insert({
          user_id: userId,
          version_number: version,
          label: label || `Resume v${version}`,
          filename: file.name,
          file_path: path,
          extracted_text: text,
        })
        .select("id").single();
      if (rErr) throw rErr;

      setStep(2);
      const { analysisId } = await analyze({ data: { resumeId: resume.id, text, targetRole: targetRole || undefined } });

      setStep(3);
      toast.success("Analysis complete!");
      navigate({ to: "/analysis/$id", params: { id: analysisId } });
    } catch (err: any) {
      setStep(-1);
      toast.error(err.message || "Something went wrong");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4"><BackButton /></div>
      <h1 className="text-3xl font-bold">Upload your resume</h1>
      <p className="text-muted-foreground mt-2">PDF, DOCX, or TXT — up to ~5MB.</p>

      <form onSubmit={handleSubmit} className="mt-8 glass rounded-2xl p-8 space-y-6">
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
          className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary transition-colors"
        >
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div className="text-left">
                <div className="font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
              <div className="mt-3 font-medium">Drop your resume or click to browse</div>
              <div className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT</div>
            </>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="label">Version label (optional)</Label>
            <Input id="label" placeholder="e.g. Google application" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="role">Target role (optional)</Label>
            <Input id="role" placeholder="e.g. Senior Product Manager" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={step >= 0}>
          {step >= 0 ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {STEPS[step]}…</> : "Analyze resume"}
        </Button>

        {step >= 0 && (
          <div className="space-y-2">
            {STEPS.map((s, i) => (
              <div key={s} className={`text-sm flex items-center gap-2 ${i < step ? "text-success" : i === step ? "text-foreground" : "text-muted-foreground"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
                {s}
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
