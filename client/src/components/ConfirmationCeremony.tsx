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

interface ConfirmationCeremonyProps {
  service: string;
  date: string;
  window: string;
  onComplete: () => void;
}

/**
 * Format the ceremony text: "Laundry. Tuesday 7 AM. Handled."
 */
function formatCeremonyText(service: string, date: string, window: string) {
  // Extract just the time start from the window (e.g., "7–10 AM" → "7 AM")
  const timeMatch = window.match(/^(\d{1,2})/);
  const amPm = window.includes("PM") ? "PM" : "AM";
  const shortTime = timeMatch ? `${timeMatch[1]} ${amPm}` : window;

  // Capitalize service name
  const serviceName = service.charAt(0).toUpperCase() + service.slice(1);

  return { serviceName, date, shortTime };
}

export default function ConfirmationCeremony({
  service,
  date,
  window: windowStr,
  onComplete,
}: ConfirmationCeremonyProps) {
  const [phase, setPhase] = useState<"enter" | "peak" | "exit" | "done">("enter");
  const { serviceName, date: dateStr, shortTime } = formatCeremonyText(service, date, windowStr);

  useEffect(() => {
    // Timeline:
    // 0ms      → enter (fade to white) — 800ms
    // 800ms    → peak (text visible, hold) — 1200ms
    // 2000ms   → exit (fade back to dark) — 800ms
    // 2800ms   → done (remove overlay)

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
        <span className="ceremony-service">{serviceName}.</span>
        <span className="ceremony-detail">{dateStr} {shortTime}.</span>
        <span className="ceremony-handled">Handled.</span>
      </div>
    </div>
  );
}
