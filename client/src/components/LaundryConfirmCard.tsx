/**
 * LaundryConfirmCard — The Step 5 confirmation card.
 *
 * Choreography on first mount (isNew=true):
 *   0–600ms    Card slides up
 *   400–1100ms Green circle draws in
 *   1000ms     Confirmation sound plays
 *   1000–1400ms Checkmark draws in
 *   1200–1800ms Green glow pulse
 *   2200–2700ms Checkmark fades out
 *   2500–3300ms Washer fades in
 *   2800–3500ms Text elements stagger up
 *   3500ms+    Washer loops forever
 *
 * On subsequent renders (isNew=false):
 *   Card shows immediately with washer looping, text visible. No replay.
 */

import { useEffect, useRef } from "react";
import WasherIcon from "./WasherIcon";

interface LaundryConfirmCardProps {
  service: string;
  date: string;
  window: string;
  isNew?: boolean;
  onModify?: () => void;
}

export default function LaundryConfirmCard({
  service,
  date,
  window: windowStr,
  isNew = false,
  onModify,
}: LaundryConfirmCardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isNew) return;
    const timer = setTimeout(() => {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio("/confirm-bubble.mp3");
          audioRef.current.volume = 0.5;
        }
        audioRef.current.play().catch(() => {});
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [isNew]);

  if (!isNew) {
    return (
      <div className="lc-card">
        <div className="lc-anim-container">
          <div className="lc-washer-group" style={{ opacity: 1 }}>
            <WasherIcon animate size={130} />
          </div>
        </div>
        <div className="lc-status" style={{ opacity: 1, transform: "none" }}>CONFIRMED</div>
        <div className="lc-service" style={{ opacity: 1, transform: "none" }}>{service}</div>
        <div className="lc-datetime" style={{ opacity: 1, transform: "none" }}>
          {date}<br />{windowStr}
        </div>
        {onModify && (
          <button className="lc-btn" style={{ opacity: 1, transform: "none" }} onClick={onModify}>
            Modify time
          </button>
        )}
        <div className="lc-fulfilled" style={{ opacity: 1, transform: "none" }}>
          Fulfilled by Laundry Butler.
        </div>
      </div>
    );
  }

  return (
    <div className="lc-card lc-card-enter">
      <div className="lc-anim-container">
        <div className="lc-check-group">
          <svg viewBox="0 0 130 130" width="130" height="130">
            <circle className="lc-check-glow" cx="65" cy="65" r="32" />
            <circle className="lc-check-circle" cx="65" cy="65" r="38" />
            <polyline className="lc-check-mark" points="45,65 58,80 86,42" />
          </svg>
        </div>
        <div className="lc-washer-group">
          <WasherIcon animate size={130} />
        </div>
      </div>

      <div className="lc-status">CONFIRMED</div>
      <div className="lc-service">{service}</div>
      <div className="lc-datetime">
        {date}<br />{windowStr}
      </div>
      {onModify && (
        <button className="lc-btn" onClick={onModify}>Modify time</button>
      )}
      <div className="lc-fulfilled">Fulfilled by Laundry Butler.</div>
    </div>
  );
}
