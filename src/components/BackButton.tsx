import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

export function BackButton({ className = "", label = "Go back" }: { className?: string; label?: string }) {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };
  return (
    <button
      type="button"
      onClick={goBack}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}
