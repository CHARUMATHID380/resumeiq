import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

interface Props { score: number; size?: number }

function bandColor(score: number) {
  if (score >= 71) return "oklch(0.72 0.18 152)";   // green
  if (score >= 41) return "oklch(0.78 0.16 75)";    // amber
  return "oklch(0.65 0.22 22)";                      // red
}
function bandLabel(score: number) {
  if (score >= 71) return "Excellent";
  if (score >= 41) return "Needs work";
  return "Critical";
}

export function ATSGauge({ score, size = 220 }: Props) {
  const radius = size / 2 - 16;
  const circumference = 2 * Math.PI * radius;
  const color = bandColor(score);

  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const dashOffset = useTransform(mv, (v) => circumference - (v / 100) * circumference);

  useEffect(() => {
    const controls = animate(mv, score, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return controls.stop;
  }, [score, mv]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="atsGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="4" /></filter>
        </defs>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="oklch(1 0 0 / 0.08)" strokeWidth={14} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke="url(#atsGrad)" strokeWidth={14} strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset, filter: "url(#glow)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-5xl font-bold tabular-nums" style={{ color }}>{display}</div>
        <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">ATS Score</div>
        <div className="mt-1 text-xs font-medium" style={{ color }}>{bandLabel(score)}</div>
      </div>
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 60px ${color}` }}
        animate={{ opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      />
    </div>
  );
}
