import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {  } from "@/integrations/";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — ResumeIQ" }] }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41 34.9 44 30 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    const result = await .auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error(result.error.message || "Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="aurora" aria-hidden="true" />
      <div className="absolute top-4 left-4 z-20"><BackButton /></div>
      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center justify-center gap-2 font-bold text-xl mb-10">
          <div className="w-11 h-11 rounded-2xl hero-gradient flex items-center justify-center shadow-glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-display">ResumeIQ</span>
        </Link>
        <div className="glass rounded-2xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold">Welcome to ResumeIQ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to save your resumes, track versions, and get AI-powered rewrites.
          </p>
          <Button
            onClick={handleGoogle}
            disabled={loading}
            size="lg"
            className="mt-8 w-full rounded-full bg-white text-slate-900 hover:bg-white/90 gap-3 shadow-glow"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>
          <p className="mt-6 text-[11px] text-muted-foreground">
            We only use your Google profile to create your ResumeIQ account.
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          No password. No spam. Sign out anytime.
        </p>
      </div>
    </div>
  );
}
