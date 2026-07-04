import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Briefcase, BookOpen, ArrowRight } from "lucide-react";
import { ATSGauge } from "@/components/ATSGauge";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ResumeIQ" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [name, setName] = useState("there");
  const [stats, setStats] = useState({ score: 0, versions: 0, jobs: 0, courses: 0 });
  const [latestId, setLatestId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const fn = (u.user?.user_metadata as any)?.full_name as string | undefined;
      if (fn) setName(fn.split(" ")[0]);

      const { data: analyses } = await (supabase as any)
        .from("analyses").select("id, ats_score, job_roles, courses")
        .order("created_at", { ascending: false }).limit(50);
      const { count: resumeCount } = await (supabase as any)
        .from("resumes").select("*", { count: "exact", head: true });

      const latest = analyses?.[0];
      if (latest) setLatestId(latest.id);
      setStats({
        score: latest?.ats_score ?? 0,
        versions: resumeCount ?? 0,
        jobs: latest?.job_roles?.length ?? 0,
        courses: latest?.courses?.length ?? 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-4"><BackButton /></div>
        <h1 className="text-3xl md:text-4xl font-bold">Hello {name}, ready to optimize today?</h1>
        <p className="text-muted-foreground mt-2">Upload a new resume or revisit a past analysis.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: "Latest ATS", value: stats.score || "—", icon: FileText },
          { label: "Resume versions", value: stats.versions, icon: Upload },
          { label: "Job matches", value: stats.jobs, icon: Briefcase },
          { label: "Courses", value: stats.courses, icon: BookOpen },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <div className="mt-3 text-3xl font-bold tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 glass rounded-2xl p-8">
          <h2 className="text-xl font-semibold">Quick actions</h2>
          <p className="text-muted-foreground text-sm mt-1">Get started in seconds.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/upload"><Button className="gap-2"><Upload className="w-4 h-4" /> Upload new resume</Button></Link>
            <Link to="/history"><Button variant="outline">View history</Button></Link>
            {latestId && (
              <Link to="/analysis/$id" params={{ id: latestId }}>
                <Button variant="ghost" className="gap-2">Latest analysis <ArrowRight className="w-4 h-4" /></Button>
              </Link>
            )}
          </div>
        </div>
        <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center">
          <ATSGauge score={stats.score || 0} size={180} />
          <p className="text-xs text-muted-foreground mt-4 text-center">Your most recent ATS score</p>
        </div>
      </div>
    </div>
  );
}
