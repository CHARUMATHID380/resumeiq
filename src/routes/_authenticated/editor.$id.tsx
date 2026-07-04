import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { diffWords } from "diff";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { rewriteSection, saveResumeVersion } from "@/lib/rewrite.functions";
import { analyzeResume } from "@/lib/resume.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import {
  Loader2, Wand2, Sparkles, BarChart3, Save, ArrowLeft, Target, Hash, Scissors, FileSearch,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/editor/$id")({
  head: () => ({ meta: [{ title: "Editor — ResumeIQ" }] }),
  component: EditorPage,
});

// --- Section parsing -----------------------------------------------------

const HEADER_PATTERNS = [
  /^(professional\s+)?summary$/i,
  /^objective$/i,
  /^(work\s+)?experience$/i,
  /^employment(\s+history)?$/i,
  /^education$/i,
  /^skills$/i,
  /^technical\s+skills$/i,
  /^projects$/i,
  /^certifications?$/i,
  /^awards?$/i,
  /^publications?$/i,
  /^volunteer(\s+experience)?$/i,
  /^languages?$/i,
  /^interests?$/i,
  /^references?$/i,
  /^contact(\s+information)?$/i,
];

function isHeader(rawLine: string) {
  const line = rawLine.trim().replace(/[:\-]+$/, "");
  if (!line || line.length > 60) return false;
  if (HEADER_PATTERNS.some((p) => p.test(line))) return true;
  // ALL CAPS short line (likely heading)
  const letters = line.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 3 && letters === letters.toUpperCase() && line.split(/\s+/).length <= 5) return true;
  return false;
}

type Section = { id: string; name: string; body: string };

function parseSections(text: string): Section[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sections: Section[] = [];
  let current: Section = { id: "header", name: "Header / Contact", body: "" };
  for (const line of lines) {
    if (isHeader(line)) {
      if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
      const name = line.trim().replace(/[:\-]+$/, "");
      current = { id: name.toLowerCase().replace(/\s+/g, "-") + "-" + sections.length, name, body: "" };
    } else {
      current.body += line + "\n";
    }
  }
  if (current.body.trim()) sections.push({ ...current, body: current.body.trim() });
  if (sections.length === 0) sections.push({ id: "full", name: "Resume", body: text.trim() });
  return sections;
}

function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => {
      const lines = p.split("\n").map((l) => l.trim());
      const isList = lines.every((l) => /^[-•*]\s+/.test(l));
      if (isList) {
        return "<ul>" + lines.map((l) => `<li>${escapeHtml(l.replace(/^[-•*]\s+/, ""))}</li>`).join("") + "</ul>";
      }
      return `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}

function editorToText(editor: Editor | null): string {
  if (!editor) return "";
  const json = editor.getJSON();
  return docNodeToText(json).trim();
}

function docNodeToText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "bulletList" || node.type === "orderedList") {
    return (node.content || []).map((li: any, i: number) => {
      const prefix = node.type === "orderedList" ? `${i + 1}. ` : "- ";
      return prefix + (li.content || []).map(docNodeToText).join("").trim();
    }).join("\n");
  }
  if (node.type === "listItem") {
    return (node.content || []).map(docNodeToText).join("").trim();
  }
  if (node.type === "paragraph") {
    return (node.content || []).map(docNodeToText).join("");
  }
  if (node.type === "heading") {
    return (node.content || []).map(docNodeToText).join("");
  }
  // doc and others
  return (node.content || []).map(docNodeToText).join("\n\n");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// --- Section Editor ------------------------------------------------------

type ActionKey = "improve" | "quantify" | "tailor" | "concise" | "ats";
const ACTIONS: { key: ActionKey; label: string; icon: any; hint: string }[] = [
  { key: "improve", label: "Improve", icon: Sparkles, hint: "Stronger verbs & STAR pattern" },
  { key: "quantify", label: "Quantify", icon: Hash, hint: "Add metrics & impact" },
  { key: "tailor", label: "Tailor to role", icon: Target, hint: "Match target role keywords" },
  { key: "concise", label: "Tighten", icon: Scissors, hint: "Cut 20–35% of words" },
  { key: "ats", label: "ATS-optimize", icon: FileSearch, hint: "Plain, keyword-rich, ATS-safe" },
];

function SectionEditor({
  section,
  targetRole,
  onTextChange,
}: {
  section: Section;
  targetRole: string;
  onTextChange: (text: string) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: textToHtml(section.body),
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[120px] focus:outline-none px-4 py-3 [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-1.5 [&_li]:my-0.5",
      },
    },
    onUpdate: ({ editor: ed }) => onTextChange(editorToText(ed)),
  });

  // Initialize parent text
  useEffect(() => {
    if (editor) onTextChange(editorToText(editor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const rewriteFn = useServerFn(rewriteSection);
  const [busy, setBusy] = useState<ActionKey | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [original, setOriginal] = useState("");
  const [proposed, setProposed] = useState("");
  const [actionLabel, setActionLabel] = useState("");

  const runAction = async (action: ActionKey) => {
    if (!editor) return;
    if (action === "tailor" && !targetRole.trim()) {
      return toast.error("Enter a target role at the top to tailor this section.");
    }
    const current = editorToText(editor);
    if (current.trim().length < 5) return toast.error("Section is too short to rewrite.");
    setBusy(action);
    try {
      const res = await rewriteFn({
        data: {
          sectionName: section.name,
          sectionText: current,
          action,
          targetRole: targetRole.trim() || undefined,
        },
      });
      setOriginal(current);
      setProposed(res.rewritten);
      setActionLabel(ACTIONS.find((a) => a.key === action)?.label || action);
      setDiffOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Rewrite failed");
    } finally {
      setBusy(null);
    }
  };

  const accept = () => {
    if (!editor) return;
    editor.commands.setContent(textToHtml(proposed));
    onTextChange(proposed);
    toast.success("Section updated");
    setDiffOpen(false);
  };

  return (
    <div id={section.id} className="glass rounded-xl overflow-hidden scroll-mt-6">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold text-sm">{section.name}</h3>
        <div className="flex flex-wrap gap-1.5">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            const loading = busy === a.key;
            return (
              <button
                key={a.key}
                onClick={() => runAction(a.key)}
                disabled={busy !== null}
                title={a.hint}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-surface-2 hover:bg-primary/15 hover:text-primary border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
      <EditorContent editor={editor} />

      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" /> {actionLabel}: {section.name}
            </DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 max-h-[55vh] overflow-y-auto">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Original</div>
              <pre className="text-xs whitespace-pre-wrap font-sans bg-surface-2 rounded-lg p-3">{original}</pre>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Proposed</div>
              <div className="text-xs whitespace-pre-wrap font-sans bg-surface-2 rounded-lg p-3 leading-relaxed">
                <InlineDiff original={original} proposed={proposed} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setDiffOpen(false)}>Reject</Button>
            <Button onClick={accept}>Accept changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InlineDiff({ original, proposed }: { original: string; proposed: string }) {
  const parts = useMemo(() => diffWords(original, proposed), [original, proposed]);
  return (
    <>
      {parts.map((p, i) => {
        if (p.added) return <span key={i} className="bg-success/25 text-[oklch(0.92_0.16_152)] rounded px-0.5">{p.value}</span>;
        if (p.removed) return <span key={i} className="bg-[oklch(0.65_0.22_22/0.25)] text-[oklch(0.85_0.20_22)] line-through rounded px-0.5">{p.value}</span>;
        return <span key={i}>{p.value}</span>;
      })}
    </>
  );
}

// --- Page ----------------------------------------------------------------

function EditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [targetRole, setTargetRole] = useState("");
  const [label, setLabel] = useState("");
  const sectionTextRef = useRef<Record<string, string>>({});
  const [savingAction, setSavingAction] = useState<"save" | "analyze" | null>(null);

  const saveFn = useServerFn(saveResumeVersion);
  const analyzeFn = useServerFn(analyzeResume);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("resumes")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        toast.error("Resume not found");
        navigate({ to: "/history" });
        return;
      }
      setResume(data);
      setSections(parseSections(data.extracted_text || ""));
      setLabel(`${data.label || data.filename || "Resume"} (edited)`);
    })();
  }, [id, navigate]);

  const assembleText = () =>
    sections
      .map((s) => {
        const body = sectionTextRef.current[s.id] ?? s.body;
        if (s.id === "header" || s.id === "full") return body;
        return `${s.name.toUpperCase()}\n${body}`;
      })
      .join("\n\n")
      .trim();

  const handleSave = async (alsoAnalyze: boolean) => {
    setSavingAction(alsoAnalyze ? "analyze" : "save");
    try {
      const fullText = assembleText();
      const { resumeId } = await saveFn({ data: { sourceResumeId: id, fullText, label } });
      toast.success("New version saved");
      if (alsoAnalyze) {
        const { analysisId } = await analyzeFn({
          data: { resumeId, text: fullText, targetRole: targetRole.trim() || undefined },
        });
        navigate({ to: "/analysis/$id", params: { id: analysisId } });
      } else {
        navigate({ to: "/history" });
      }
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingAction(null);
    }
  };

  if (!resume) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading editor…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <BackButton />
            <Link to="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              History
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-bold flex items-center gap-2">
            <Wand2 className="w-7 h-7 text-primary" /> AI Resume Editor
          </h1>
          <p className="text-sm text-muted-foreground">
            Rewrite section-by-section. Review the diff. Save as a new version.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={savingAction !== null}>
            {savingAction === "save" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save as new version
          </Button>
          <Button onClick={() => handleSave(true)} disabled={savingAction !== null}>
            {savingAction === "analyze" ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BarChart3 className="w-4 h-4 mr-2" />}
            Save & re-analyze
          </Button>
        </div>
      </div>

      <div className="glass rounded-xl p-4 grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="role">Target role (for "Tailor")</Label>
          <Input
            id="role"
            placeholder="e.g. Senior Product Manager, Fintech"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="label">New version label</Label>
          <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
      </div>

      <div className="grid lg:grid-cols-[200px_1fr] gap-6">
        <nav className="hidden lg:block sticky top-6 self-start space-y-1 text-sm">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Sections</div>
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block px-3 py-1.5 rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors"
            >
              {s.name}
            </a>
          ))}
        </nav>
        <div className="space-y-4 min-w-0">
          <div className="lg:hidden">
            <Label>Jump to section</Label>
            <Select onValueChange={(v) => document.getElementById(v)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {sections.map((s) => (
            <SectionEditor
              key={s.id}
              section={s}
              targetRole={targetRole}
              onTextChange={(t) => {
                sectionTextRef.current[s.id] = t;
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
