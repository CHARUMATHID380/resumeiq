import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function CollapsibleSection({
  id,
  title,
  meta,
  defaultOpen = true,
  className = "",
  children,
}: {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const storageKey = `resumeiq:collapse:${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "0") setOpen(false);
      else if (saved === "1") setOpen(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch {}
      return next;
    });
  };

  const label = open ? "Collapse" : "Expand";

  return (
    <section className={`glass rounded-2xl ${className}`}>
      <header className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0 flex-1 flex items-center gap-3 flex-wrap">{title}</div>
        <div className="flex items-center gap-3 shrink-0">
          {meta}
          <button
            type="button"
            onClick={toggle}
            title={label}
            aria-label={label}
            aria-expanded={open}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </header>
      {open && <div className="px-5 pb-5 -mt-1">{children}</div>}
    </section>
  );
}
