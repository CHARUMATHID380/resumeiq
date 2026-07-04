import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, FileText, Sparkles, ArrowRight } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { toast } from "sonner";
import { extractResumeText, validateResumeFile, MAX_FILE_BYTES, MAX_PDF_PAGES } from "@/lib/parse-resume";
import { useServerFn } from "@tanstack/react-start";
import { analyzeResumePublic } from "@/lib/resume.functions";
import { AnalysisResults } from "@/components/AnalysisResults";

export const Route = createFileRoute("/try")({
  head: () => ({
    meta: [
      { title: "Free ATS resume check — ResumeIQ" },
      { name: "description", content: "Get your ATS score instantly — no sign-up required. Upload a PDF, DOCX, or TXT and see section scores, keywords, and fixes." },
      { property: "og:title", content: "Free ATS resume check — ResumeIQ" },
      { property: "og:description", content: "Get your ATS score instantly — no sign-up required." },
    ],
  }),
  component: TryPage,
});

const STEPS = ["Reading file", "Extracting text", "AI analyzing"];

function TryPage() {
  const analyze = useServerFn(analyzeResumePublic);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState<any>(null);

  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    try {
      validateResumeFile(f);
      setFile(f);
    } catch (err: any) {
      toast.error(err.message || "Invalid file");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Pick a resume file first");
    try {
      setResult(null);
      setStep(0);
      setStep(1);
      const text = await extractResumeText(file);
      if (text.trim().length < 50) throw new Error("Could not extract meaningful text from the file.");
      setStep(2);
      const { analysis } = await analyze({ data: { text, targetRole: targetRole || undefined, jobDescription: jobDescription || undefined } });
      setResult(analysis);
      setStep(-1);
      toast.success("Analysis complete!");
    } catch (err: any) {
      setStep(-1);
      toast.error(err.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="px-6 md:px-12 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <BackButton />
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            ResumeIQ
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/auth"><Button>Get started</Button></Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 md:px-12 py-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" /> No sign-up · One-time analysis
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-extrabold">Free ATS resume check</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Upload your resume and get an instant ATS score with section-by-section feedback. Sign up later to save history, compare versions, and edit with AI.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 glass rounded-2xl p-8 space-y-6">
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={(e) => pickFile(e.target.files?.[0])} />
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
                <div className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT · max {MAX_FILE_BYTES / 1024 / 1024} MB · up to {MAX_PDF_PAGES} pages</div>
              </>
            )}
          </div>

          <div>
            <Label htmlFor="role">Target role (optional)</Label>
            <Input id="role" placeholder="e.g. Senior Product Manager" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="jd">Job description (optional)</Label>
            <Textarea id="jd" rows={6} placeholder="Paste the full job description here to get a JD match score, missing skills, and tailored fixes." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
            <p className="text-[11px] text-muted-foreground mt-1">Adding a JD unlocks the "Match with Job Description" section in your results.</p>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={step >= 0}>
            {step >= 0 ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {STEPS[step]}…</> : "Analyze my resume"}
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Your file is processed in-memory and not saved. Create an account to keep history.
          </p>
        </form>

        {result && (
          <div className="mt-12 space-y-6">
            <AnalysisResults data={result} />
            <div className="glass rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-semibold">Want to save this and track improvements?</div>
                <div className="text-sm text-muted-foreground">Create a free account to keep history, compare versions, and edit with AI.</div>
              </div>
              <Link to="/auth"><Button className="gap-2">Create account <ArrowRight className="w-4 h-4" /></Button></Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
