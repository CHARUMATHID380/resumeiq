import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Upload, History, LogOut, FileText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useEffect, useState, type ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "Upload Resume", icon: Upload },
  { to: "/history", label: "History", icon: History },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email: string; name: string; avatar: string | null }>({ email: "", name: "", avatar: null });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setUser({
        email: u.email ?? "",
        name: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.name as string) ?? "",
        avatar: (u.user_metadata?.avatar_url as string) ?? (u.user_metadata?.picture as string) ?? null,
      });
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden md:flex w-64 flex-col border-r border-border glass">
        <div className="px-6 py-6 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg leading-none">ResumeIQ</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">ATS Optimizer</div>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((n) => {
            const active = pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <n.icon className="w-4 h-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="px-3 py-2 flex items-center gap-2">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-border" />
            ) : (
              <div className="w-8 h-8 rounded-full hero-gradient" />
            )}
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{user.name || "Signed in"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border glass">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold">
            <FileText className="w-5 h-5 text-primary" /> ResumeIQ
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4" /></Button>
        </header>
        <div className="p-6 md:p-10 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
