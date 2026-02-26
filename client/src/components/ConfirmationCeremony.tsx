// ============================================
// ConfirmationCeremony — Full-screen flash overlay
//
// Dark → white fade, confirmation text at peak brightness, fade back.
// ~2.8s total. For laundry bookings, the BldgLogo projector
// animation plays during the enter phase before text appears.
// ============================================

import { useEffect, useState } from "react";
import BldgLogo from "./BldgLogo";

interface ConfirmationCeremonyProps {
  service: string;
  date: string;
  window: string;
  onComplete: () => void;
}

function isLaundryService(service: string): boolean {
  const s = service.toLowerCase();
  return s.includes("laundry") || s.includes("wash & fold") || s.includes("dry clean");
}

export default function ConfirmationCeremony({
  service,
  date,
  window: windowStr,
  onComplete,
}: ConfirmationCeremonyProps) {
  const [phase, setPhase] = useState<"enter" | "peak" | "exit" | "done">("enter");
  const [logoMood, setLogoMood] = useState<"laundry" | "laundry-seal">("laundry");

  const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
  const showLogo = isLaundryService(service);

  useEffect(() => {
    // Logo seal transition at 600ms (after dot move + ring expand + clothes appear)
    const sealTimer = showLogo
      ? setTimeout(() => setLogoMood("laundry-seal"), 600)
      : undefined;

    const peakTimer = setTimeout(() => setPhase("peak"), 800);
    const exitTimer = setTimeout(() => setPhase("exit"), 2000);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 2800);

    return () => {
      if (sealTimer) clearTimeout(sealTimer);
      clearTimeout(peakTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete, showLogo]);

  if (phase === "done") return null;

  return (
    <div
      className={`ceremony-overlay ceremony-overlay--${phase}`}
      aria-live="assertive"
      role="status"
    >
      {/* Projector logo animation for laundry bookings */}
      {showLogo && (phase === "enter" || phase === "peak") && (
        <div className={`ceremony-logo ceremony-logo--${phase}`}>
          <BldgLogo size="medium" mood={logoMood} />
        </div>
      )}

      <div className={`ceremony-text ceremony-text--${phase}`}>
        <span className="ceremony-service">Lock it in.</span>
        <span className="ceremony-detail">{serviceName} — {date}, {windowStr}.</span>
        <span className="ceremony-handled">You'll get a reminder the morning of.</span>
      </div>
    </div>
  );
}
