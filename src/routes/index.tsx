import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ATSGauge } from "@/components/ATSGauge";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, BookOpen, Briefcase, FileText, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResumeIQ — Beat the ATS. Land the interview." },
      { name: "description", content: "Upload your resume, get an instant ATS score, AI-powered suggestions, matched job roles, and tailored courses." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="px-6 md:px-12 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          ResumeIQ
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/auth"><Button>Get started</Button></Link>
        </div>
      </header>

      <section className="relative overflow-hidden max-w-7xl mx-auto px-6 md:px-12 pt-12 md:pt-20 pb-16 grid md:grid-cols-2 gap-12 items-center">
        <div className="aurora" aria-hidden="true" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" /> AI-powered resume optimization
          </div>
          <h1 className="mt-6 text-5xl md:text-6xl font-extrabold leading-[1.05]">
            Beat the ATS.<br />
            <span className="text-gradient">Land the interview.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Upload your resume and get an instant ATS score, specific fix-it suggestions, matched job roles, and personalized courses — across every domain.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/try"><Button size="lg" className="gap-2">Try free — no sign-up <ArrowRight className="w-4 h-4" /></Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">Sign in to save history</Button></Link>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            {[
              { v: "9", l: "Section scores" },
              { v: "8+", l: "Job matches" },
              { v: "~30s", l: "Per analysis" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl font-bold text-gradient">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex justify-center">
          <div className="glass rounded-3xl p-10">
            <ATSGauge score={87} size={280} />
            <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs">
              <div><div className="font-semibold text-[oklch(0.65_0.22_22)]">0-40</div><div className="text-muted-foreground">Critical</div></div>
              <div><div className="font-semibold text-[oklch(0.78_0.16_75)]">41-70</div><div className="text-muted-foreground">Needs work</div></div>
              <div><div className="font-semibold text-[oklch(0.72_0.18_152)]">71-100</div><div className="text-muted-foreground">Excellent</div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 grid md:grid-cols-4 gap-4">
        {[
          { icon: Target, title: "ATS Score Engine", desc: "9 section breakdown with specific verdicts." },
          { icon: FileText, title: "Keyword analysis", desc: "See what's present vs. missing for your domain." },
          { icon: Briefcase, title: "Job role matches", desc: "Top roles ranked by fit, with skill gaps." },
          { icon: BookOpen, title: "Course recommendations", desc: "Targeted upskilling from Coursera, Udemy, edX." },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4">
              <f.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border mt-10 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} ResumeIQ
      </footer>
    </div>
  );
}
