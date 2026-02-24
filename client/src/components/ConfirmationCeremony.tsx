// ============================================
// ConfirmationCeremony — Full-screen flash overlay
//
// Dark → white fade, confirmation text at peak
// brightness, fade back to dark. ~2.8s total.
//
// Inspired by Apple Pay checkmark, Cash App flash.
// Pure CSS animation, GPU-accelerated (opacity only).
// ============================================

import { useEffect, useState } from "react";
import BldgLogo from "@/components/BldgLogo";

interface ConfirmationCeremonyProps {
  service: string;
  date: string;
  window: string;
  onComplete: () => void;
}

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
  const [phase, setPhase] = useState<"enter" | "peak" | "exit" | "done">("enter");
  const { serviceName, date: dateStr, window: windowStr2 } = formatCeremonyText(service, date, windowStr);

  useEffect(() => {
    const peakTimer = setTimeout(() => setPhase("peak"), 800);
    const exitTimer = setTimeout(() => setPhase("exit"), 2000);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 2800);

    return () => {
      clearTimeout(peakTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div
      className={`ceremony-overlay ceremony-overlay--${phase}`}
      aria-live="assertive"
      role="status"
    >
      {/* Logo with dot-expand animation — the "nod" that something happened */}
      <div className={`ceremony-logo ceremony-logo--${phase}`}>
        <BldgLogo
          size="hero"
          mood={phase === "enter" ? "confirm" : "idle"}
        />
      </div>

      <div className={`ceremony-text ceremony-text--${phase}`}>
        <span className="ceremony-service">Locked in.</span>
        <span className="ceremony-detail">{serviceName} — {dateStr}, {windowStr2}.</span>
        <span className="ceremony-handled">You'll get a reminder the morning of.</span>
      </div>
    </div>
  );
}
