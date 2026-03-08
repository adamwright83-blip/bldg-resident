/**
 * DryCleaningConfirmCard — Confirmation card for dry-cleaning bookings.
 *
 * Choreography on first mount (isNew=true):
 *   0–600ms    Card slides up
 *   400–1100ms Green circle draws in
 *   1000ms     Confirmation sound plays
 *   1000–1400ms Checkmark draws in
 *   1200–1800ms Green glow pulse
 *   2200–2700ms Checkmark fades out
 *   2500–3300ms Garment fades in and starts swaying
 *   2800ms+    Text elements stagger up
 *
 * On subsequent renders (isNew=false):
 *   Card shows immediately with garment looping, text visible. No replay.
 *
 * Reuses all lc-* CSS classes from LaundryConfirmCard (index.css).
 */

import { useEffect, useRef } from "react";

interface DryCleaningConfirmCardProps {
  service: string;
  date: string;
  window: string;
  isNew?: boolean;
  onModify?: () => void;
}

function GarmentIcon({ animate }: { animate?: boolean }) {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      style={{ overflow: "visible" }}
    >
      <g
        style={
          animate
            ? {
                animation: "dcGarmentSway 4s ease-in-out infinite",
                transformOrigin: "60px 10px",
              }
            : undefined
        }
      >
        {/* Hanger hook */}
        <path
          d="M 60 4 Q 60 0, 63 0 Q 66 0, 66 4 L 66 8"
          fill="none"
          stroke="#C9A961"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Hanger bar */}
        <path
          d="M 30 28 L 60 12 L 90 28"
          fill="none"
          stroke="#C9A961"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Jacket body */}
        <path
          d="M 30 28 L 24 34 L 22 40 L 24 96 Q 24 104, 28 104 L 40 104 Q 40 98, 60 98 Q 80 98, 80 104 L 92 104 Q 96 104, 96 96 L 98 40 L 96 34 L 90 28"
          fill="none"
          stroke="#C9A961"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Collar / neckline curve */}
        <path
          d="M 48 28 Q 52 36, 60 36 Q 68 36, 72 28"
          fill="none"
          stroke="#C9A961"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left lapel */}
        <path
          d="M 52 36 L 46 56 L 54 50"
          fill="none"
          stroke="#C9A961"
          strokeWidth="1"
          opacity="0.7"
        />

        {/* Right lapel */}
        <path
          d="M 68 36 L 74 56 L 66 50"
          fill="none"
          stroke="#C9A961"
          strokeWidth="1"
          opacity="0.7"
        />

        {/* Center seam */}
        <line
          x1="60"
          y1="50"
          x2="60"
          y2="98"
          stroke="#C9A961"
          strokeWidth="0.6"
          opacity="0.4"
        />

        {/* Buttons */}
        <circle cx="60" cy="60" r="1.2" fill="#C9A961" opacity="0.6" />
        <circle cx="60" cy="70" r="1.2" fill="#C9A961" opacity="0.6" />
        <circle cx="60" cy="80" r="1.2" fill="#C9A961" opacity="0.6" />

        {/* Pocket lines */}
        <line
          x1="34" y1="60" x2="48" y2="60"
          stroke="#C9A961" strokeWidth="0.6" opacity="0.4"
        />
        <line
          x1="72" y1="60" x2="86" y2="60"
          stroke="#C9A961" strokeWidth="0.6" opacity="0.4"
        />

        {/* Shimmer lines */}
        <line
          x1="36" y1="42" x2="36" y2="88"
          stroke="rgba(201,169,97,0.15)" strokeWidth="0.5"
          style={animate ? { animation: "dcShimmerPulse 2.5s ease-in-out infinite" } : undefined}
        />
        <line
          x1="84" y1="42" x2="84" y2="88"
          stroke="rgba(201,169,97,0.15)" strokeWidth="0.5"
          style={
            animate
              ? { animation: "dcShimmerPulse 2.5s ease-in-out 1.2s infinite" }
              : undefined
          }
        />

        {/* Steam wisps */}
        {animate && (
          <>
            <path
              d="M 40 34 Q 38 26, 40 20 Q 42 14, 40 8"
              fill="none"
              stroke="rgba(201,169,97,0.3)"
              strokeWidth="1"
              strokeLinecap="round"
              style={{ animation: "dcSteamRise 3s ease-in-out infinite" }}
            />
            <path
              d="M 60 30 Q 58 22, 60 16 Q 62 10, 60 4"
              fill="none"
              stroke="rgba(201,169,97,0.3)"
              strokeWidth="1"
              strokeLinecap="round"
              style={{ animation: "dcSteamRise 3s ease-in-out 0.8s infinite" }}
            />
            <path
              d="M 80 34 Q 78 26, 80 20 Q 82 14, 80 8"
              fill="none"
              stroke="rgba(201,169,97,0.3)"
              strokeWidth="1"
              strokeLinecap="round"
              style={{ animation: "dcSteamRise 3s ease-in-out 1.6s infinite" }}
            />
          </>
        )}
      </g>
    </svg>
  );
}

export default function DryCleaningConfirmCard({
  service,
  date,
  window: windowStr,
  isNew = false,
  onModify,
}: DryCleaningConfirmCardProps) {
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
          <div className="dc-garment-group" style={{ opacity: 1 }}>
            <GarmentIcon animate />
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
        {/* Checkmark (fades out at 2200ms) */}
        <div className="lc-check-group">
          <svg viewBox="0 0 130 130" width="130" height="130">
            <circle className="lc-check-glow" cx="65" cy="65" r="32" />
            <circle className="lc-check-circle" cx="65" cy="65" r="38" />
            <polyline className="lc-check-mark" points="45,65 58,80 86,42" />
          </svg>
        </div>

        {/* Garment (fades in at 2200ms) */}
        <div className="dc-garment-group">
          <GarmentIcon animate />
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
