// ============================================
// ConfirmationCeremony — Full-screen flash overlay
//
// Dark → white fade, confirmation text at peak brightness, fade back.
// ~2.8s total. Used for non-laundry bookings.
// Laundry bookings use the inline washer confirmation card instead.
// ============================================

import { useEffect, useState } from "react";

interface ConfirmationCeremonyProps {
  service: string;
  date: string;
  window: string;
  onComplete: () => void;
}

export default function ConfirmationCeremony({
  service,
  date,
  window: windowStr,
  onComplete,
}: ConfirmationCeremonyProps) {
  const [phase, setPhase] = useState<"enter" | "peak" | "exit" | "done">("enter");
  const serviceName = service.charAt(0).toUpperCase() + service.slice(1);

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
      <div className={`ceremony-text ceremony-text--${phase}`}>
        <span className="ceremony-service">Lock it in.</span>
        <span className="ceremony-detail">{serviceName} — {date}, {windowStr}.</span>
        <span className="ceremony-handled">You'll get a reminder the morning of.</span>
      </div>
    </div>
  );
}
