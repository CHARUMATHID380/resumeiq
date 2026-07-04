import { ATSGauge } from "@/components/ATSGauge";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { Briefcase, BookOpen, AlertTriangle, CheckCircle2, ExternalLink, Target, XCircle } from "lucide-react";

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

export function AnalysisResults({ data }: { data: any }) {
  const sectionScores = (data.section_scores || {}) as Record<string, number>;
  const sectionNotes = (data.section_notes || data.rewritten_sections?.section_notes || {}) as Record<string, string>;
  const domain = data.detected_domain || data.rewritten_sections?.detected_domain;
  const weaknesses: string[] = data.weaknesses || data.rewritten_sections?.weaknesses || [];
  const jd = data.jd_match || data.rewritten_sections?.jd_match;

  return (
    <div className="space-y-6">
      {domain && <p className="text-sm text-muted-foreground">Detected domain: <span className="text-foreground font-medium">{domain}</span></p>}

      <CollapsibleSection
        id="overview"
        title={<h2 className="text-xl font-semibold">Overview & section breakdown</h2>}
        meta={<span className="text-2xl font-bold tabular-nums text-primary">{data.ats_score ?? 0}<span className="text-sm text-muted-foreground">/100</span></span>}
      >
        <div className="grid md:grid-cols-[auto_1fr] gap-10 items-center">
          <ATSGauge score={data.ats_score ?? 0} />
          <div className="space-y-3 w-full">
            {Object.entries(SECTION_LABELS).map(([k, label]) => {
              const score = sectionScores[k] ?? 0;
              const color = score >= 71 ? "oklch(0.72 0.18 152)" : score >= 41 ? "oklch(0.78 0.16 75)" : "oklch(0.65 0.22 22)";
              return (
                <div key={k}>
                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <span className="tabular-nums font-medium" style={{ color }}>{score}</span>
                  </div>
                  <div className="h-2 mt-1 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${score}%`, background: color }} />
                  </div>
                  {sectionNotes[k] && <div className="text-xs text-muted-foreground mt-1">{sectionNotes[k]}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleSection>

      {jd ? (
        <CollapsibleSection
          id="jd-match"
          title={<h2 className="text-xl font-semibold flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Match with Job Description</h2>}
          meta={typeof jd.match_score === "number" ? (
            <span className="text-2xl font-bold tabular-nums text-primary">{jd.match_score}<span className="text-sm text-muted-foreground">/100</span></span>
          ) : null}
        >
          <div className="space-y-4">
            {jd.verdict && <p className="text-sm text-muted-foreground">{jd.verdict}</p>}
            <div className="grid md:grid-cols-2 gap-4">
              {jd.matched_skills?.length ? (
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> Matched skills</div>
                  <div className="flex flex-wrap gap-2">
                    {jd.matched_skills.map((k: string) => <span key={k} className="text-xs px-2 py-1 rounded-md bg-success/15 text-[oklch(0.85_0.18_152)] border border-success/30">{k}</span>)}
                  </div>
                </div>
              ) : null}
              {jd.missing_skills?.length ? (
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1"><XCircle className="w-3 h-3 text-[oklch(0.78_0.20_22)]" /> Missing skills</div>
                  <div className="flex flex-wrap gap-2">
                    {jd.missing_skills.map((k: string) => <span key={k} className="text-xs px-2 py-1 rounded-md bg-[oklch(0.65_0.22_22/0.15)] text-[oklch(0.85_0.20_22)] border border-[oklch(0.65_0.22_22/0.3)]">{k}</span>)}
                  </div>
                </div>
              ) : null}
              {jd.matched_experience?.length ? (
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Experience you cover</div>
                  <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">{jd.matched_experience.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              ) : null}
              {jd.experience_gaps?.length ? (
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Experience gaps</div>
                  <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">{jd.experience_gaps.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
              ) : null}
            </div>
            {jd.improvements?.length ? (
              <div className="pt-2 border-t border-border">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Edits to align with this JD</div>
                <ul className="text-sm space-y-1 list-disc pl-5">{jd.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
              </div>
            ) : null}
          </div>
        </CollapsibleSection>
      ) : null}

      {weaknesses.length ? (
        <CollapsibleSection
          id="weaknesses"
          title={<h2 className="text-xl font-semibold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" /> Resume weaknesses</h2>}
          meta={<span className="text-xs text-muted-foreground">{weaknesses.length} items</span>}
        >
          <ul className="space-y-2 text-sm">
            {weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2"><span className="text-warning mt-0.5">•</span><span>{w}</span></li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}

      {(data.keywords_found?.length || data.keywords_missing?.length) ? (
        <CollapsibleSection
          id="keywords"
          title={<h2 className="text-xl font-semibold">Keywords</h2>}
          meta={<span className="text-xs text-muted-foreground">{(data.keywords_found?.length ?? 0)} found · {(data.keywords_missing?.length ?? 0)} missing</span>}
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-success" /> Keywords found</h3>
              <div className="flex flex-wrap gap-2">
                {(data.keywords_found ?? []).map((k: string) => (
                  <span key={k} className="text-xs px-2 py-1 rounded-md bg-success/15 text-[oklch(0.85_0.18_152)] border border-success/30">{k}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-warning" /> Keywords missing</h3>
              <div className="flex flex-wrap gap-2">
                {(data.keywords_missing ?? []).map((k: string) => (
                  <span key={k} className="text-xs px-2 py-1 rounded-md bg-warning/15 text-[oklch(0.85_0.16_75)] border border-warning/30">{k}</span>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>
      ) : null}

      {data.suggestions?.length ? (
        <CollapsibleSection
          id="suggestions"
          title={<h2 className="text-xl font-semibold">Improvement suggestions</h2>}
          meta={<span className="text-xs text-muted-foreground">{data.suggestions.length}</span>}
        >
          <div className="space-y-3">
            {data.suggestions.map((s: any, i: number) => (
              <div key={i} className="glass rounded-xl p-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${PRIORITY_STYLE[s.priority] || "border-border text-muted-foreground"}`}>{s.priority?.replace("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">{s.section}</span>
                </div>
                <div className="mt-3 font-medium">{s.issue}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.why}</div>
                <div className="mt-3 text-sm"><span className="text-primary font-medium">Fix:</span> {s.fix}</div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {data.job_roles?.length ? (
        <CollapsibleSection
          id="job-roles"
          title={<h2 className="text-xl font-semibold flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Matched job roles</h2>}
          meta={<span className="text-xs text-muted-foreground">{data.job_roles.length}</span>}
        >
          <div className="grid md:grid-cols-2 gap-3">
            {data.job_roles.map((j: any, i: number) => (
              <div key={i} className="glass rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{j.title}</div>
                  <div className="text-lg font-bold text-primary tabular-nums">{j.match_pct}%</div>
                </div>
                <div className="text-sm text-muted-foreground mt-1">{j.why}</div>
                {j.skill_gaps?.length ? (
                  <div className="mt-2 text-xs"><span className="text-muted-foreground">Skill gaps:</span> {j.skill_gaps.join(", ")}</div>
                ) : null}
                {j.salary_range && <div className="text-xs text-muted-foreground mt-1">Salary: {j.salary_range}</div>}
                <a className="inline-flex items-center gap-1 text-xs text-primary mt-3" href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(j.title)}`} target="_blank" rel="noopener noreferrer">
                  Find jobs <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      {data.courses?.length ? (
        <CollapsibleSection
          id="courses"
          title={<h2 className="text-xl font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Level up your resume</h2>}
          meta={<span className="text-xs text-muted-foreground">{data.courses.length}</span>}
        >
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.courses.map((c: any, i: number) => (
              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" className="glass rounded-xl p-5 hover:border-primary transition-colors block">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{c.platform} · {c.level}</div>
                <div className="mt-2 font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.skill} · {c.duration}</div>
                <div className="text-xs text-primary mt-3 inline-flex items-center gap-1">Open <ExternalLink className="w-3 h-3" /></div>
              </a>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}
    </div>
  );
}
