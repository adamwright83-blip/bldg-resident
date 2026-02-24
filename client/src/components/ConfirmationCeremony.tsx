// ============================================
// ConfirmationCeremony — Full-screen flash overlay
//
// Revised timeline (~3.6s total):
//   0ms    enter  — screen fades to white, logo fades in
//   500ms  logo   — logo plays hero animation (laundry or confirm pulse)
//   1700ms peak   — logo crossfades out, confirmation text fades in
//   2700ms exit   — screen fades back to dark
//   3500ms done   — cleanup
//
// For laundry bookings: the washing machine door animation plays at
// hero scale before settling into the "Locked in." text.
// ============================================

import { useEffect, useState } from "react";
import BldgLogo from "@/components/BldgLogo";

interface ConfirmationCeremonyProps {
  service: string;
  date: string;
  window: string;
  onComplete: () => void;
}

type Phase = "enter" | "logo" | "peak" | "exit" | "done";

function formatCeremonyText(service: string, date: string, window: string) {
  const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
  return { serviceName, date, window };
}

export default function ConfirmationCeremony({
  service,
  date,
  window: windowStr,
  onComplete,
}: ConfirmationCeremonyProps) {
  const [phase, setPhase] = useState<Phase>("enter");
  const { serviceName, date: dateStr, window: windowStr2 } = formatCeremonyText(service, date, windowStr);

  const isLaundry = service.toLowerCase().includes("laundry");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("logo"),  500);
    const t2 = setTimeout(() => setPhase("peak"),  1700);
    const t3 = setTimeout(() => setPhase("exit"),  2700);
    const t4 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  const showLogo = phase === "enter" || phase === "logo";
  const showText = phase === "peak" || phase === "exit";

  return (
    <div
      className={`ceremony-overlay ceremony-overlay--${phase}`}
      aria-live="assertive"
      role="status"
    >
      {/* Hero logo — plays service animation before text appears */}
      <div className={`ceremony-hero-logo ceremony-hero-logo--${phase}`}>
        <BldgLogo
          size="hero"
          mood={phase === "enter" ? "idle" : isLaundry ? "laundry" : "confirm"}
        />
      </div>

      {/* Confirmation text — crossfades in as logo fades out */}
      <div className={`ceremony-text ceremony-text--${showText ? "peak" : "enter"}`}>
        <span className="ceremony-service">Locked in.</span>
        <span className="ceremony-detail">{serviceName} — {dateStr}, {windowStr2}.</span>
        <span className="ceremony-handled">You'll get a reminder the morning of.</span>
      </div>
    </div>
  );
}
