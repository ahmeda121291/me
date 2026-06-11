"use client";

import { useEffect, useState } from "react";
import { msUntilMidnightET } from "@/lib/time";

// Countdown to the next ballot at midnight ET.
export default function Countdown() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setMs(msUntilMidnightET());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  if (ms === null) return null;
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

  return (
    <p className="tabular text-center text-sm opacity-70">
      Next ballot in <span className="font-semibold">{label}</span>
    </p>
  );
}
